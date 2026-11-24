use super::gpu::{FrameSurface, Graphics, Slot};
use super::{Device, DeviceSelection};
use crate::client::Failure;
use crate::ffi::{Api, Handle, RenderParam};
use glow::HasContext;
use std::ffi::{CStr, c_char};
use std::ptr;
use std::rc::Rc;
use std::sync::Arc;

pub(crate) trait Display: Sized {
    const TEXTURE: u32;
    fn open(choice: Option<&DeviceSelection>) -> Result<Self, Failure>;
    fn device(&self) -> &Device;
    fn function(&self, name: &CStr) -> Handle;
    fn render_fd(&self) -> i32 {
        -1
    }
    fn attach(&self, width: u32, height: u32) -> Result<Arc<dyn FrameSurface>, Failure>;
}

pub(crate) struct OpenGl<P> {
    gl: Rc<glow::Context>,
    display: P,
}

pub(crate) struct Framebuffer {
    gl: Rc<glow::Context>,
    name: glow::Framebuffer,
    texture: glow::Texture,
    width: i32,
    height: i32,
}
impl Drop for Framebuffer {
    fn drop(&mut self) {
        // The pool drops GL views on the render thread before releasing its current context.
        unsafe {
            self.gl.delete_framebuffer(self.name);
            self.gl.delete_texture(self.texture);
        }
    }
}

impl<P: Display> OpenGl<P> {
    pub(crate) fn new(choice: Option<&DeviceSelection>) -> Result<Self, Failure> {
        let display = P::open(choice)?;
        let gl = unsafe {
            glow::Context::from_loader_function_cstr(|name| display.function(name).cast_const())
        };
        Ok(Self {
            display,
            gl: Rc::new(gl),
        })
    }
    fn framebuffer<T>(
        &self,
        width: u32,
        height: u32,
        kind: u32,
        storage: impl FnOnce() -> Result<T, Failure>,
    ) -> Result<(Framebuffer, T), Failure> {
        let gl = &self.gl;
        unsafe {
            let name = gl.create_framebuffer().map_err(|_| Failure::Creation)?;
            let texture = match gl.create_texture() {
                Ok(texture) => texture,
                Err(_) => {
                    gl.delete_framebuffer(name);
                    return Err(Failure::Creation);
                }
            };
            let view = Framebuffer {
                gl: gl.clone(),
                name,
                texture,
                width: width as i32,
                height: height as i32,
            };
            gl.bind_texture(kind, Some(texture));
            gl.tex_parameter_i32(kind, glow::TEXTURE_MIN_FILTER, glow::NEAREST as i32);
            gl.tex_parameter_i32(kind, glow::TEXTURE_MAG_FILTER, glow::NEAREST as i32);
            let storage = storage()?;
            gl.bind_framebuffer(glow::FRAMEBUFFER, Some(name));
            gl.framebuffer_texture_2d(
                glow::FRAMEBUFFER,
                glow::COLOR_ATTACHMENT0,
                kind,
                Some(texture),
                0,
            );
            let complete =
                gl.check_framebuffer_status(glow::FRAMEBUFFER) == glow::FRAMEBUFFER_COMPLETE;
            gl.bind_framebuffer(glow::FRAMEBUFFER, None);
            gl.bind_texture(kind, None);
            if !complete {
                return Err(Failure::Creation);
            }
            Ok((view, storage))
        }
    }
}

#[repr(C)]
struct InitParams {
    resolve: unsafe extern "C" fn(Handle, *const c_char) -> Handle,
    context: Handle,
}
unsafe extern "C" fn resolve<P: Display>(context: Handle, name: *const c_char) -> Handle {
    unsafe { (&*context.cast::<P>()).function(CStr::from_ptr(name)) }
}
#[repr(C)]
struct DrmDisplay {
    fd: i32,
    crtc: i32,
    connector: i32,
    atomic: Handle,
    render_fd: i32,
}
#[repr(C)]
struct RenderFbo {
    name: i32,
    width: i32,
    height: i32,
    format: i32,
}

impl<P: Display> Graphics for OpenGl<P> {
    type Target = Framebuffer;
    type View = Framebuffer;
    fn device(&self) -> &Device {
        self.display.device()
    }
    fn context(&self, api: &Api, core: Handle) -> Result<Handle, Failure> {
        let mut init = InitParams {
            resolve: resolve::<P>,
            context: ptr::from_ref(&self.display).cast_mut().cast(),
        };
        let mut advanced = 1_i32;
        let mut drm = DrmDisplay {
            fd: -1,
            crtc: 0,
            connector: 0,
            atomic: ptr::null_mut(),
            render_fd: self.display.render_fd(),
        };
        let mut params = vec![
            RenderParam {
                kind: 1,
                data: c"opengl".as_ptr().cast_mut().cast(),
            },
            RenderParam {
                kind: 2,
                data: ptr::from_mut(&mut init).cast(),
            },
            RenderParam {
                kind: 10,
                data: ptr::from_mut(&mut advanced).cast(),
            },
        ];
        if drm.render_fd >= 0 {
            params.push(RenderParam {
                kind: 16,
                data: ptr::from_mut(&mut drm).cast(),
            });
        }
        params.push(RenderParam::end());
        let mut ctx = ptr::null_mut();
        let status = unsafe { (api.render_context_create)(&mut ctx, core, params.as_mut_ptr()) };
        if status < 0 {
            return Err(Failure::Native(status));
        }
        if ctx.is_null() {
            return Err(Failure::Creation);
        }
        Ok(ctx)
    }
    fn target(&self, width: u32, height: u32) -> Result<Framebuffer, Failure> {
        self.framebuffer(width, height, glow::TEXTURE_2D, || {
            unsafe {
                self.gl.tex_image_2d(
                    glow::TEXTURE_2D,
                    0,
                    glow::RGBA8 as i32,
                    width as i32,
                    height as i32,
                    0,
                    glow::RGBA,
                    glow::UNSIGNED_BYTE,
                    glow::PixelUnpackData::Slice(None),
                );
            }
            Ok(())
        })
        .map(|(view, ())| view)
    }
    fn slot(&self, width: u32, height: u32) -> Result<Slot<Framebuffer>, Failure> {
        let (view, surface) = self.framebuffer(width, height, P::TEXTURE, || {
            self.display.attach(width, height)
        })?;
        Ok(Slot {
            view,
            surface,
            size: (width, height),
        })
    }
    fn draw(
        &self,
        api: &Api,
        ctx: Handle,
        target: &Framebuffer,
        view: &Framebuffer,
    ) -> Result<(), Failure> {
        let mut fbo = RenderFbo {
            name: target.name.0.get() as i32,
            width: target.width,
            height: target.height,
            format: glow::RGBA8 as i32,
        };
        let mut depth = 8_i32;
        let mut params = [
            RenderParam {
                kind: 3,
                data: ptr::from_mut(&mut fbo).cast(),
            },
            RenderParam {
                kind: 5,
                data: ptr::from_mut(&mut depth).cast(),
            },
            RenderParam::end(),
        ];
        let status = unsafe { (api.render_context_render)(ctx, params.as_mut_ptr()) };
        if status < 0 {
            return Err(Failure::Native(status));
        }
        let gl = &self.gl;
        unsafe {
            gl.disable(glow::SCISSOR_TEST);
            gl.bind_framebuffer(glow::READ_FRAMEBUFFER, Some(target.name));
            gl.bind_framebuffer(glow::DRAW_FRAMEBUFFER, Some(view.name));
            gl.blit_framebuffer(
                0,
                0,
                target.width,
                target.height,
                0,
                0,
                view.width,
                view.height,
                glow::COLOR_BUFFER_BIT,
                glow::NEAREST,
            );
            gl.bind_framebuffer(glow::FRAMEBUFFER, None);
            // Consumers can import immediately and have no producer-side fence to wait on.
            gl.finish();
            if gl.get_error() != glow::NO_ERROR {
                return Err(Failure::RenderFailed);
            }
        }
        Ok(())
    }
}
