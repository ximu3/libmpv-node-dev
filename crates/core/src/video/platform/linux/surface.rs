use crate::client::Failure;
use crate::ffi::Handle;
use crate::video::gl::Display;
use crate::video::gpu::{FrameSurface, SurfaceDescriptor};
use crate::video::{Device, DeviceSelection, devices};
use std::ffi::{CStr, c_char};
use std::fs::{File, OpenOptions};
use std::io::{Seek, SeekFrom};
use std::os::fd::{AsRawFd, FromRawFd};
use std::ptr;
use std::sync::Arc;

const ARGB8888: u32 = u32::from_le_bytes(*b"AR24");
const EGL_NONE: i32 = 0x3038;

#[link(name = "libgbm.so.1", kind = "dylib", modifiers = "+verbatim")]
unsafe extern "C" {
    fn gbm_create_device(fd: i32) -> Handle;
    fn gbm_device_destroy(device: Handle);
    fn gbm_bo_create_with_modifiers2(
        device: Handle,
        width: u32,
        height: u32,
        format: u32,
        modifiers: *const u64,
        count: u32,
        flags: u32,
    ) -> Handle;
    fn gbm_bo_destroy(buffer: Handle);
    fn gbm_bo_get_fd_for_plane(buffer: Handle, plane: i32) -> i32;
    fn gbm_bo_get_format(buffer: Handle) -> u32;
    fn gbm_bo_get_modifier(buffer: Handle) -> u64;
    fn gbm_bo_get_plane_count(buffer: Handle) -> i32;
    fn gbm_bo_get_stride_for_plane(buffer: Handle, plane: i32) -> u32;
    fn gbm_bo_get_offset(buffer: Handle, plane: i32) -> u32;
}
#[link(name = "libEGL.so.1", kind = "dylib", modifiers = "+verbatim")]
unsafe extern "C" {
    fn eglGetPlatformDisplay(platform: u32, native: Handle, attributes: *const isize) -> Handle;
    fn eglInitialize(display: Handle, major: *mut i32, minor: *mut i32) -> u32;
    fn eglTerminate(display: Handle) -> u32;
    fn eglBindAPI(api: u32) -> u32;
    fn eglChooseConfig(
        display: Handle,
        attributes: *const i32,
        config: *mut Handle,
        count: i32,
        found: *mut i32,
    ) -> u32;
    fn eglCreateContext(
        display: Handle,
        config: Handle,
        shared: Handle,
        attributes: *const i32,
    ) -> Handle;
    fn eglDestroyContext(display: Handle, context: Handle) -> u32;
    fn eglMakeCurrent(display: Handle, draw: Handle, read: Handle, context: Handle) -> u32;
    fn eglGetProcAddress(name: *const c_char) -> Handle;
    fn eglQueryString(display: Handle, name: i32) -> *const c_char;
    fn eglCreateImage(
        display: Handle,
        ctx: Handle,
        target: u32,
        buffer: Handle,
        attribs: *const isize,
    ) -> Handle;
    fn eglDestroyImage(display: Handle, image: Handle) -> u32;
}

struct Buffer(Handle);
impl Drop for Buffer {
    fn drop(&mut self) {
        unsafe { gbm_bo_destroy(self.0) }
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
                eglMakeCurrent(
                    self.display,
                    ptr::null_mut(),
                    ptr::null_mut(),
                    ptr::null_mut(),
                );
                eglDestroyContext(self.display, self.context);
            }
            if !self.display.is_null() {
                eglTerminate(self.display);
            }
            gbm_device_destroy(self.gbm);
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
            let bind = eglGetProcAddress(c"glEGLImageTargetTexture2DOES".as_ptr());
            if bind.is_null() {
                return Err(Failure::UnsupportedCapability);
            }
            let gbm = gbm_create_device(node.as_raw_fd());
            if gbm.is_null() {
                return Err(Failure::Creation);
            }
            let mut result = Self {
                device,
                node,
                gbm,
                display: ptr::null_mut(),
                context: ptr::null_mut(),
                bind_image: std::mem::transmute::<Handle, unsafe extern "C" fn(u32, Handle)>(bind),
            };
            let display = eglGetPlatformDisplay(0x31d7, gbm, ptr::null());
            if display.is_null() || eglInitialize(display, ptr::null_mut(), ptr::null_mut()) == 0 {
                return Err(Failure::Creation);
            }
            result.display = display;
            let names = eglQueryString(display, 0x3055);
            if names.is_null()
                || !CStr::from_ptr(names)
                    .to_bytes()
                    .split(|b| *b == b' ')
                    .any(|ext| ext == b"EGL_EXT_image_dma_buf_import_modifiers")
            {
                return Err(Failure::UnsupportedCapability);
            }
            if eglBindAPI(0x30a2) == 0 {
                return Err(Failure::UnsupportedCapability);
            }
            let attrs = [
                0x3033, 0, 0x3040, 8, 0x3024, 8, 0x3023, 8, 0x3022, 8, EGL_NONE,
            ];
            let mut config = ptr::null_mut();
            let mut found = 0;
            if eglChooseConfig(display, attrs.as_ptr(), &mut config, 1, &mut found) == 0
                || found == 0
            {
                return Err(Failure::UnsupportedCapability);
            }
            let attrs = [0x3098, 3, 0x30fb, 2, 0x30fd, 1, EGL_NONE];
            result.context = eglCreateContext(display, config, ptr::null_mut(), attrs.as_ptr());
            if result.context.is_null()
                || eglMakeCurrent(display, ptr::null_mut(), ptr::null_mut(), result.context) == 0
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
    fn function(name: &CStr) -> Handle {
        unsafe { eglGetProcAddress(name.as_ptr()) }
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
            let bo = gbm_bo_create_with_modifiers2(
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
            let bo = Buffer(bo);
            let modifier = gbm_bo_get_modifier(bo.0);
            let format = gbm_bo_get_format(bo.0);
            if gbm_bo_get_plane_count(bo.0) != 1 || format != ARGB8888 || modifier != linear {
                return Err(Failure::UnsupportedCapability);
            }
            // gbm returns an independently owned descriptor. Its memory survives the GBM device and EGL context.
            let raw = gbm_bo_get_fd_for_plane(bo.0, 0);
            if raw < 0 {
                return Err(Failure::Creation);
            }
            let mut fd = File::from_raw_fd(raw);
            let stride = gbm_bo_get_stride_for_plane(bo.0, 0);
            let offset = gbm_bo_get_offset(bo.0, 0);
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
                0x3057,
                width as isize,
                0x3056,
                height as isize,
                0x3271,
                format as isize,
                0x3272,
                raw as isize,
                0x3273,
                offset as isize,
                0x3274,
                stride as isize,
                0x3443,
                0,
                0x3444,
                0,
                EGL_NONE as isize,
            ];
            let image = eglCreateImage(
                self.display,
                ptr::null_mut(),
                0x3270,
                ptr::null_mut(),
                attrs.as_ptr(),
            );
            if image.is_null() {
                return Err(Failure::Creation);
            }
            (self.bind_image)(Self::TEXTURE, image);
            eglDestroyImage(self.display, image);
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
