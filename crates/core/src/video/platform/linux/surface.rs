use crate::client::Failure;
use crate::ffi::Handle;
use crate::video::gl::Display;
use crate::video::gpu::{FrameSurface, SurfaceDescriptor};
use crate::video::{Device, DeviceSelection, devices};
use glow::HasContext;
use std::ffi::CStr;
use std::fs::{File, OpenOptions};
use std::io::{Seek, SeekFrom};
use std::os::fd::{AsRawFd, FromRawFd};
use std::ptr;
use std::sync::Arc;

const ARGB8888: u32 = u32::from_le_bytes(*b"AR24");
const EGL_PLATFORM_GBM: u32 = 0x31d7;
const EGL_EXTENSIONS: i32 = 0x3055;
const EGL_OPENGL_ES_API: u32 = 0x30a0;
const EGL_OPENGL_ES3_BIT: i32 = 0x40;
const DRM_FORMAT_MOD_LINEAR: u64 = 0;
const GBM_BO_USE_RENDERING: u32 = 1 << 2;
const GBM_BO_USE_LINEAR: u32 = 1 << 4;
const EGL_SURFACE_TYPE: i32 = 0x3033;
const EGL_RENDERABLE_TYPE: i32 = 0x3040;
const EGL_RED_SIZE: i32 = 0x3024;
const EGL_GREEN_SIZE: i32 = 0x3023;
const EGL_BLUE_SIZE: i32 = 0x3022;
const EGL_CONTEXT_CLIENT_VERSION: i32 = 0x3098;
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
use api::{EglApi, Gbm, drivers};
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
    gbm_api: &'static Gbm,
    egl: &'static EglApi,
    gles: &'static libloading::Library,
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
            (self.egl.eglReleaseThread)();
            (self.gbm_api.gbm_device_destroy)(self.gbm);
        }
    }
}

fn create_es_context(egl: &EglApi, display: Handle) -> Result<Handle, Failure> {
    unsafe {
        if (egl.eglBindAPI)(EGL_OPENGL_ES_API) == 0 {
            return Err(Failure::UnsupportedCapability);
        }
        let attrs = [
            EGL_SURFACE_TYPE,
            0,
            EGL_RENDERABLE_TYPE,
            EGL_OPENGL_ES3_BIT,
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
        if (egl.eglChooseConfig)(display, attrs.as_ptr(), &mut config, 1, &mut found) == 0
            || found == 0
        {
            return Err(Failure::UnsupportedCapability);
        }
        let attrs = [EGL_CONTEXT_CLIENT_VERSION, 3, EGL_NONE];
        let context = (egl.eglCreateContext)(display, config, ptr::null_mut(), attrs.as_ptr());
        if context.is_null() {
            return Err(Failure::Creation);
        }
        Ok(context)
    }
}

impl Egl {
    fn require_linear_argb(&self) -> Result<(), Failure> {
        type Query = unsafe extern "C" fn(Handle, i32, i32, *mut u64, *mut u32, *mut i32) -> u32;
        unsafe {
            if (self.gbm_api.gbm_device_is_format_supported)(
                self.gbm,
                ARGB8888,
                GBM_BO_USE_RENDERING | GBM_BO_USE_LINEAR,
            ) == 0
            {
                return Err(Failure::UnsupportedCapability);
            }
            let proc = (self.egl.eglGetProcAddress)(c"eglQueryDmaBufModifiersEXT".as_ptr());
            if proc.is_null() {
                return Err(Failure::UnsupportedCapability);
            }
            let query = std::mem::transmute::<Handle, Query>(proc);
            let mut count = 0;
            if query(
                self.display,
                ARGB8888 as i32,
                0,
                ptr::null_mut(),
                ptr::null_mut(),
                &mut count,
            ) == 0
                || count <= 0
            {
                return Err(Failure::UnsupportedCapability);
            }
            let mut modifiers = vec![0_u64; count as usize];
            let mut external_only = vec![0_u32; count as usize];
            let mut written = 0;
            if query(
                self.display,
                ARGB8888 as i32,
                count,
                modifiers.as_mut_ptr(),
                external_only.as_mut_ptr(),
                &mut written,
            ) == 0
                || !(0..=count).contains(&written)
                || !modifiers
                    .iter()
                    .zip(&external_only)
                    .take(written as usize)
                    .any(|(&modifier, &external)| {
                        modifier == DRM_FORMAT_MOD_LINEAR && external == 0
                    })
            {
                return Err(Failure::UnsupportedCapability);
            }
        }
        Ok(())
    }
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
            let driver = drivers()?;
            let gbm_api = &driver.gbm;
            let egl = &driver.egl;
            let gles = &driver.gles;
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
                gles,
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
            result.require_linear_argb()?;
            result.context = create_es_context(result.egl, display)?;
            if (result.egl.eglMakeCurrent)(
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
        let mut available = devices()?;
        if let Some(selection) = choice {
            let DeviceSelection::Linux(path) = selection else {
                return Err(Failure::UnsupportedCapability);
            };
            let requested =
                std::fs::canonicalize(path).map_err(|_| Failure::UnsupportedCapability)?;
            let device = available
                .into_iter()
                .find(|device| match &device.selection {
                    DeviceSelection::Linux(node) => std::path::Path::new(node) == requested,
                    _ => false,
                })
                .ok_or(Failure::UnsupportedCapability)?;
            return Self::on(device);
        }
        // The kernel identifies the boot adapter where the platform exposes one.
        available.sort_by_cached_key(|device| {
            let DeviceSelection::Linux(path) = &device.selection else {
                unreachable!()
            };
            let node = std::path::Path::new(path).file_name().unwrap();
            !std::fs::read_to_string(
                std::path::Path::new("/sys/class/drm")
                    .join(node)
                    .join("device/boot_vga"),
            )
            .is_ok_and(|v| v.trim() == "1")
        });
        let mut failure = Failure::UnsupportedCapability;
        for device in available {
            match Self::on(device) {
                Ok(output) => return Ok(output),
                Err(error) => failure = error,
            }
        }
        Err(failure)
    }
    fn function(&self, name: &CStr) -> Handle {
        unsafe {
            let pointer = (self.egl.eglGetProcAddress)(name.as_ptr());
            if !pointer.is_null() {
                return pointer;
            }
            self.gles
                .get::<Handle>(name.to_bytes_with_nul())
                .map(|symbol| *symbol)
                .unwrap_or(ptr::null_mut())
        }
    }
    fn validate_gl(&self, gl: &glow::Context) -> Result<(), Failure> {
        if gl.version().is_embedded
            && gl.version().major >= 3
            && gl.supported_extensions().contains("GL_OES_EGL_image")
        {
            Ok(())
        } else {
            Err(Failure::UnsupportedCapability)
        }
    }
    fn device(&self) -> &Device {
        &self.device
    }
    fn render_fd(&self) -> i32 {
        self.node.as_raw_fd()
    }
    fn attach(&self, width: u32, height: u32) -> Result<Arc<dyn FrameSurface>, Failure> {
        let linear = DRM_FORMAT_MOD_LINEAR;
        unsafe {
            let bo = (self.gbm_api.gbm_bo_create_with_modifiers2)(
                self.gbm,
                width,
                height,
                ARGB8888,
                &linear,
                1,
                GBM_BO_USE_RENDERING,
            );
            if bo.is_null() {
                return Err(Failure::UnsupportedCapability);
            }
            let bo = Buffer(bo, self.gbm_api);
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
            // Rust duplicates the driver's descriptor with close-on-exec before publishing it.
            let mut fd = File::from_raw_fd(raw)
                .try_clone()
                .map_err(|_| Failure::Creation)?;
            let stride = (self.gbm_api.gbm_bo_get_stride_for_plane)(bo.0, 0);
            let offset = (self.gbm_api.gbm_bo_get_offset)(bo.0, 0);
            let object_size = fd.seek(SeekFrom::End(0)).map_err(|_| Failure::Creation)?;
            fd.rewind().map_err(|_| Failure::Creation)?;
            let size = object_size
                .checked_sub(u64::from(offset))
                .ok_or(Failure::Creation)?;
            let row = u64::from(width) * 4;
            if u64::from(stride) < row || size < u64::from(stride) * (u64::from(height) - 1) + row {
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
                fd.as_raw_fd() as isize,
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "requires Mesa surfaceless EGL on Linux"]
    fn offscreen_context_uses_opengl_es3() {
        const EGL_PLATFORM_SURFACELESS_MESA: u32 = 0x31dd;
        let driver = drivers().unwrap();
        let egl = &driver.egl;
        unsafe {
            let display = (egl.eglGetPlatformDisplay)(
                EGL_PLATFORM_SURFACELESS_MESA,
                ptr::null_mut(),
                ptr::null(),
            );
            assert!(!display.is_null());
            assert_ne!(
                (egl.eglInitialize)(display, ptr::null_mut(), ptr::null_mut()),
                0
            );
            let context = create_es_context(egl, display).unwrap();
            let current = (egl.eglMakeCurrent)(display, ptr::null_mut(), ptr::null_mut(), context);
            let library = &driver.gles;
            let version = if current == 0 {
                None
            } else {
                let get = library
                    .get::<unsafe extern "C" fn(u32) -> *const std::ffi::c_char>(b"glGetString\0")
                    .unwrap();
                let value = get(glow::VERSION);
                (!value.is_null()).then(|| CStr::from_ptr(value).to_string_lossy().into_owned())
            };
            (egl.eglMakeCurrent)(display, ptr::null_mut(), ptr::null_mut(), ptr::null_mut());
            (egl.eglDestroyContext)(display, context);
            (egl.eglTerminate)(display);
            (egl.eglReleaseThread)();
            let version = version.expect("Expected an active EGL context");
            assert!(version.starts_with("OpenGL ES 3."), "{version}");
            println!("{version}");
        }
    }
}
