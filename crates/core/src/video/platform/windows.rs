use super::{Device, DeviceSelection};
use crate::client::Failure;
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, DXGI_ERROR_NOT_FOUND, IDXGIFactory1,
};

pub fn devices() -> Result<Vec<Device>, Failure> {
    // DXGI supplies COM references to the factory and every enumerated adapter.
    let factory: IDXGIFactory1 = unsafe { CreateDXGIFactory1() }.map_err(|_| Failure::Creation)?;
    let mut devices = Vec::new();
    for index in 0.. {
        let adapter = match unsafe { factory.EnumAdapters1(index) } {
            Ok(adapter) => adapter,
            Err(error) if error.code() == DXGI_ERROR_NOT_FOUND => break,
            Err(_) => return Err(Failure::Creation),
        };
        // The adapter reference outlives the descriptor query.
        let description = unsafe { adapter.GetDesc1() }.map_err(|_| Failure::Creation)?;
        if description.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0 {
            continue;
        }
        let end = description
            .Description
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(description.Description.len());
        let luid = (u64::from(description.AdapterLuid.HighPart as u32) << 32)
            | u64::from(description.AdapterLuid.LowPart);
        devices.push(Device {
            name: String::from_utf16_lossy(&description.Description[..end]),
            selection: DeviceSelection::Windows(luid),
        });
    }
    Ok(devices)
}
