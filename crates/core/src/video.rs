pub mod frames;
#[cfg(unix)]
mod gl;
pub mod gpu;
pub(crate) mod options;
#[cfg(target_os = "linux")]
#[path = "video/platform/linux.rs"]
mod platform;
#[cfg(target_os = "macos")]
#[path = "video/platform/macos.rs"]
mod platform;
#[cfg(windows)]
#[path = "video/platform/windows.rs"]
mod platform;
pub mod render;
pub mod software;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DeviceSelection {
    Windows(u64),
    Macos(u32),
    Linux(String),
}

#[derive(Clone)]
pub struct Device {
    pub name: String,
    pub selection: DeviceSelection,
}

pub use platform::devices;
