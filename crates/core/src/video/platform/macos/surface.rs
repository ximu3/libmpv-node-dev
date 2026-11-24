use crate::client::Failure;
use crate::ffi::Handle;
use crate::video::gl::Display;
use crate::video::gpu::{FrameSurface, SurfaceDescriptor};
use crate::video::{Device, DeviceSelection, devices};
use std::ffi::{CStr, c_char};
use std::ptr::NonNull;
use std::sync::Arc;

unsafe extern "C" {
    fn libmpv_cgl_open(requested: *const u32, actual: *mut u32) -> Handle;
    fn libmpv_cgl_matches(left: u32, right: u32) -> bool;
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
        let available = devices()?;
        if available.is_empty() {
            return Err(Failure::UnsupportedCapability);
        }
        let requested = match choice {
            None => std::ptr::null(),
            Some(selection @ DeviceSelection::Macos(id))
                if available
                    .iter()
                    .any(|device| &device.selection == selection) =>
            {
                std::ptr::from_ref(id)
            }
            Some(_) => return Err(Failure::UnsupportedCapability),
        };
        let mut actual = 0;
        let context = NonNull::new(unsafe { libmpv_cgl_open(requested, &mut actual) })
            .ok_or(Failure::Creation)?;
        let device=available.into_iter().find(|device|matches!(device.selection,DeviceSelection::Macos(id) if unsafe{libmpv_cgl_matches(id,actual)}));
        if let Some(device) = device {
            return Ok(Self { context, device });
        }
        unsafe { libmpv_cgl_close(context.as_ptr()) };
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
