use crate::client::Failure;
use crate::ffi::Handle;
use crate::video::gl::Display;
use crate::video::gpu::{FrameSurface, SurfaceDescriptor};
use crate::video::{Device, DeviceSelection, devices};
use std::ffi::CStr;
use std::fs::{File, OpenOptions};
use std::io::{Seek, SeekFrom};
use std::os::fd::{AsRawFd, FromRawFd};
use std::ptr;
use std::sync::Arc;

const ARGB8888: u32 = u32::from_le_bytes(*b"AR24");
const EGL_PLATFORM_GBM: u32 = 0x31d7;
const EGL_EXTENSIONS: i32 = 0x3055;
const EGL_OPENGL_API: u32 = 0x30a2;
const EGL_SURFACE_TYPE: i32 = 0x3033;
const EGL_RENDERABLE_TYPE: i32 = 0x3040;
const EGL_RED_SIZE: i32 = 0x3024;
const EGL_GREEN_SIZE: i32 = 0x3023;
const EGL_BLUE_SIZE: i32 = 0x3022;
const EGL_CONTEXT_MAJOR_VERSION: i32 = 0x3098;
const EGL_CONTEXT_MINOR_VERSION: i32 = 0x30fb;
const EGL_CONTEXT_OPENGL_PROFILE_MASK: i32 = 0x30fd;
const EGL_WIDTH: isize = 0x3057;
const EGL_HEIGHT: isize = 0x3056;
const EGL_LINUX_DRM_FOURCC_EXT: isize = 0x3271;
const EGL_DMA_BUF_PLANE0_FD_EXT: isize = 0x3272;
const EGL_DMA_BUF_PLANE0_OFFSET_EXT: isize = 0x3273;
const EGL_DMA_BUF_PLANE0_PITCH_EXT: isize = 0x3274;
const EGL_DMA_BUF_PLANE0_MODIFIER_LO_EXT: isize = 0x3443;
const EGL_DMA_BUF_PLANE0_MODIFIER_HI_EXT: isize = 0x3444;
const EGL_LINUX_DMA_BUF_EXT: u32 = 0x3270;
const EGL_NONE: i32 = 0x3038;

#[path = "api.rs"]
mod api;
use api::{EglApi, Gbm};
struct Buffer<'a>(Handle, &'a Gbm);
impl Drop for Buffer<'_> {
    fn drop(&mut self) {
        unsafe { (self.1.gbm_bo_destroy)(self.0) }
    }
}

struct Surface {
    fd: File,
    stride: u32,
    offset: u64,
    size: u64,
    format: u32,
    modifier: u64,
}
impl FrameSurface for Surface {
    fn descriptor(&self) -> SurfaceDescriptor {
        SurfaceDescriptor::DmaBuf {
            fd: self.fd.as_raw_fd(),
            stride: self.stride,
            offset: self.offset,
            size: self.size,
            format: self.format,
            modifier: self.modifier,
        }
    }
}

pub(crate) struct Egl {
    gbm_api: Gbm,
    egl: EglApi,
    device: Device,
    node: File,
    gbm: Handle,
    display: Handle,
    context: Handle,
    bind_image: unsafe extern "C" fn(u32, Handle),
}
impl Drop for Egl {
    fn drop(&mut self) {
        unsafe {
            if !self.context.is_null() {
                (self.egl.eglMakeCurrent)(
                    self.display,
                    ptr::null_mut(),
                    ptr::null_mut(),
                    ptr::null_mut(),
                );
                (self.egl.eglDestroyContext)(self.display, self.context);
            }
            if !self.display.is_null() {
                (self.egl.eglTerminate)(self.display);
            }
            (self.gbm_api.gbm_device_destroy)(self.gbm);
        }
    }
}

impl Egl {
    fn on(device: Device) -> Result<Self, Failure> {
        let DeviceSelection::Linux(path) = &device.selection else {
            unreachable!()
        };
        let node = OpenOptions::new()
            .read(true)
            .write(true)
            .open(path)
            .map_err(|_| Failure::Creation)?;
        unsafe {
            let gbm_api = Gbm::load()?;
            let egl = EglApi::load()?;
            let bind = (egl.eglGetProcAddress)(c"glEGLImageTargetTexture2DOES".as_ptr());
            if bind.is_null() {
                return Err(Failure::UnsupportedCapability);
            }
            let gbm = (gbm_api.gbm_create_device)(node.as_raw_fd());
            if gbm.is_null() {
                return Err(Failure::Creation);
            }
            let mut result = Self {
                gbm_api,
                egl,
                device,
                node,
                gbm,
                display: ptr::null_mut(),
                context: ptr::null_mut(),
                bind_image: std::mem::transmute::<Handle, unsafe extern "C" fn(u32, Handle)>(bind),
            };
            let display = (result.egl.eglGetPlatformDisplay)(EGL_PLATFORM_GBM, gbm, ptr::null());
            if display.is_null()
                || (result.egl.eglInitialize)(display, ptr::null_mut(), ptr::null_mut()) == 0
            {
                return Err(Failure::Creation);
            }
            result.display = display;
            let names = (result.egl.eglQueryString)(display, EGL_EXTENSIONS);
            if names.is_null()
                || !CStr::from_ptr(names)
                    .to_bytes()
                    .split(|b| *b == b' ')
                    .any(|ext| ext == b"EGL_EXT_image_dma_buf_import_modifiers")
            {
                return Err(Failure::UnsupportedCapability);
            }
            if (result.egl.eglBindAPI)(EGL_OPENGL_API) == 0 {
                return Err(Failure::UnsupportedCapability);
            }
            let attrs = [
                EGL_SURFACE_TYPE,
                0,
                EGL_RENDERABLE_TYPE,
                8,
                EGL_RED_SIZE,
                8,
                EGL_GREEN_SIZE,
                8,
                EGL_BLUE_SIZE,
                8,
                EGL_NONE,
            ];
            let mut config = ptr::null_mut();
            let mut found = 0;
            if (result.egl.eglChooseConfig)(display, attrs.as_ptr(), &mut config, 1, &mut found)
                == 0
                || found == 0
            {
                return Err(Failure::UnsupportedCapability);
            }
            let attrs = [
                EGL_CONTEXT_MAJOR_VERSION,
                3,
                EGL_CONTEXT_MINOR_VERSION,
                2,
                EGL_CONTEXT_OPENGL_PROFILE_MASK,
                1,
                EGL_NONE,
            ];
            result.context =
                (result.egl.eglCreateContext)(display, config, ptr::null_mut(), attrs.as_ptr());
            if result.context.is_null()
                || (result.egl.eglMakeCurrent)(
                    display,
                    ptr::null_mut(),
                    ptr::null_mut(),
                    result.context,
                ) == 0
            {
                return Err(Failure::Creation);
            }
            Ok(result)
        }
    }
}
impl Display for Egl {
    const TEXTURE: u32 = glow::TEXTURE_2D;
    fn open(choice: Option<&DeviceSelection>) -> Result<Self, Failure> {
        let mut failure = Failure::UnsupportedCapability;
        for device in devices()? {
            if choice.is_some_and(|selection| selection != &device.selection) {
                continue;
            }
            match Self::on(device) {
                Ok(display) => return Ok(display),
                Err(error) => failure = error,
            }
        }
        Err(failure)
    }
    fn function(&self, name: &CStr) -> Handle {
        unsafe { (self.egl.eglGetProcAddress)(name.as_ptr()) }
    }
    fn device(&self) -> &Device {
        &self.device
    }
    fn render_fd(&self) -> i32 {
        self.node.as_raw_fd()
    }
    fn attach(&self, width: u32, height: u32) -> Result<Arc<dyn FrameSurface>, Failure> {
        let linear = 0_u64;
        unsafe {
            let bo = (self.gbm_api.gbm_bo_create_with_modifiers2)(
                self.gbm,
                width,
                height,
                ARGB8888,
                &linear,
                1,
                1 << 2,
            );
            if bo.is_null() {
                return Err(Failure::UnsupportedCapability);
            }
            let bo = Buffer(bo, &self.gbm_api);
            let modifier = (self.gbm_api.gbm_bo_get_modifier)(bo.0);
            let format = (self.gbm_api.gbm_bo_get_format)(bo.0);
            if (self.gbm_api.gbm_bo_get_plane_count)(bo.0) != 1
                || format != ARGB8888
                || modifier != linear
            {
                return Err(Failure::UnsupportedCapability);
            }
            // gbm returns an independently owned descriptor. Its memory survives the GBM device and EGL context.
            let raw = (self.gbm_api.gbm_bo_get_fd_for_plane)(bo.0, 0);
            if raw < 0 {
                return Err(Failure::Creation);
            }
            let mut fd = File::from_raw_fd(raw);
            let stride = (self.gbm_api.gbm_bo_get_stride_for_plane)(bo.0, 0);
            let offset = (self.gbm_api.gbm_bo_get_offset)(bo.0, 0);
            let size = fd.seek(SeekFrom::End(0)).map_err(|_| Failure::Creation)?;
            fd.rewind().map_err(|_| Failure::Creation)?;
            if stride < width.saturating_mul(4)
                || size
                    < u64::from(offset)
                        + u64::from(stride) * (u64::from(height) - 1)
                        + u64::from(width) * 4
            {
                return Err(Failure::Creation);
            }
            let attrs = [
                EGL_WIDTH,
                width as isize,
                EGL_HEIGHT,
                height as isize,
                EGL_LINUX_DRM_FOURCC_EXT,
                format as isize,
                EGL_DMA_BUF_PLANE0_FD_EXT,
                raw as isize,
                EGL_DMA_BUF_PLANE0_OFFSET_EXT,
                offset as isize,
                EGL_DMA_BUF_PLANE0_PITCH_EXT,
                stride as isize,
                EGL_DMA_BUF_PLANE0_MODIFIER_LO_EXT,
                0,
                EGL_DMA_BUF_PLANE0_MODIFIER_HI_EXT,
                0,
                EGL_NONE as isize,
            ];
            let image = (self.egl.eglCreateImage)(
                self.display,
                ptr::null_mut(),
                EGL_LINUX_DMA_BUF_EXT,
                ptr::null_mut(),
                attrs.as_ptr(),
            );
            if image.is_null() {
                return Err(Failure::Creation);
            }
            (self.bind_image)(Self::TEXTURE, image);
            (self.egl.eglDestroyImage)(self.display, image);
            Ok(Arc::new(Surface {
                fd,
                stride,
                offset: u64::from(offset),
                size,
                format,
                modifier,
            }))
        }
    }
}
