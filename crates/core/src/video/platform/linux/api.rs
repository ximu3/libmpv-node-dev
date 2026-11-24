use crate::client::Failure;
use crate::ffi::Handle;
use libloading::Library;
use std::ffi::c_char;

macro_rules! driver_api {
    ($name:ident, $library:literal, { $(fn $symbol:ident($($param:ident : $arg:ty),* $(,)?) $( -> $out:ty)?;)* }) => {
        #[allow(non_snake_case)]
        pub(super) struct $name {
            _library: Library,
            $(pub $symbol: unsafe extern "C" fn($($arg),*) $( -> $out)?,)*
        }
        impl $name {
            pub(super) fn load() -> Result<Self, Failure> {
                let library = unsafe { Library::new($library) }.map_err(|_| Failure::UnsupportedCapability)?;
                Ok(Self {
                    $($symbol: *unsafe {library.get(concat!(stringify!($symbol), "\0").as_bytes())}.map_err(|_|Failure::UnsupportedCapability)?,)*
                    _library: library,
                })
            }
        }
    }
}
driver_api!(Gbm, "libgbm.so.1", {
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
});

driver_api!(EglApi, "libEGL.so.1", {
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
});
