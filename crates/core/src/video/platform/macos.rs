use super::{Device, DeviceSelection};
use crate::client::Failure;
use std::ffi::{CStr, c_char, c_void};

unsafe extern "C" {
    fn libmpv_list_renderers(
        context: *mut c_void,
        visit: unsafe extern "C" fn(*mut c_void, u32, *const c_char),
    ) -> i32;
}

unsafe extern "C" fn visit(context: *mut c_void, id: u32, name: *const c_char) {
    // The synchronous enumerator borrows the vector and the UTF-8 NSString view for this callback only.
    let output = unsafe { &mut *context.cast::<Vec<Device>>() };
    let name = unsafe { CStr::from_ptr(name) }
        .to_string_lossy()
        .into_owned();
    let selection = DeviceSelection::Macos(id);
    if !output.iter().any(|device| device.selection == selection) {
        output.push(Device { name, selection });
    }
}

pub fn devices() -> Result<Vec<Device>, Failure> {
    let mut devices = Vec::new();
    // The native call neither stores the pointer nor dispatches callbacks to another thread.
    let status = unsafe { libmpv_list_renderers(std::ptr::from_mut(&mut devices).cast(), visit) };
    if status != 0 {
        return Err(Failure::Creation);
    }
    Ok(devices)
}
