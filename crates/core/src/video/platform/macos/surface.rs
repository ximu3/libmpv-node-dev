use crate::client::Failure;
use crate::ffi::Handle;
use crate::video::gl::Display;
use crate::video::gpu::{FrameSurface, SurfaceDescriptor};
use crate::video::{Device, DeviceSelection, devices};
use std::ffi::{CStr, c_char};
use std::ptr::NonNull;
use std::sync::Arc;

unsafe extern "C" {
    fn libmpv_cgl_open(renderer: u32) -> Handle;
    fn libmpv_cgl_close(context: Handle);
    fn libmpv_cgl_surface(context: Handle, width: u32, height: u32) -> Handle;
    fn libmpv_surface_release(surface: Handle);
    fn libmpv_gl_function(name: *const c_char) -> Handle;
}
struct Surface(NonNull<std::ffi::c_void>);
// An independently retained IOSurface can be imported and released on another thread.
unsafe impl Send for Surface {}
unsafe impl Sync for Surface {}
impl FrameSurface for Surface {
    fn descriptor(&self) -> SurfaceDescriptor {
        SurfaceDescriptor::IoSurface {
            handle: (self.0.as_ptr() as usize).to_ne_bytes().to_vec(),
        }
    }
}
impl Drop for Surface {
    fn drop(&mut self) {
        unsafe { libmpv_surface_release(self.0.as_ptr()) }
    }
}

pub(crate) struct Cgl {
    context: NonNull<std::ffi::c_void>,
    device: Device,
}
impl Drop for Cgl {
    fn drop(&mut self) {
        unsafe { libmpv_cgl_close(self.context.as_ptr()) }
    }
}
impl Display for Cgl {
    const TEXTURE: u32 = glow::TEXTURE_RECTANGLE;
    fn open(choice: Option<&DeviceSelection>) -> Result<Self, Failure> {
        for device in devices()? {
            if choice.is_some_and(|selection| selection != &device.selection) {
                continue;
            }
            let DeviceSelection::Macos(id) = device.selection else {
                unreachable!()
            };
            if let Some(context) = NonNull::new(unsafe { libmpv_cgl_open(id) }) {
                return Ok(Self { context, device });
            }
            if choice.is_some() {
                return Err(Failure::Creation);
            }
        }
        Err(Failure::UnsupportedCapability)
    }
    fn device(&self) -> &Device {
        &self.device
    }
    fn function(&self, name: &CStr) -> Handle {
        unsafe { libmpv_gl_function(name.as_ptr()) }
    }
    fn attach(&self, width: u32, height: u32) -> Result<Arc<dyn FrameSurface>, Failure> {
        let surface =
            NonNull::new(unsafe { libmpv_cgl_surface(self.context.as_ptr(), width, height) })
                .ok_or(Failure::Creation)?;
        Ok(Arc::new(Surface(surface)))
    }
}
