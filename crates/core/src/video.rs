pub mod frames;
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

#[derive(Debug, PartialEq, Eq)]
pub enum DeviceSelection {
    Windows(u64),
    Macos(u32),
    Linux(String),
}

pub struct Device {
    pub name: String,
    pub selection: DeviceSelection,
}

pub use platform::devices;
