use super::{Device, DeviceSelection};
use crate::client::Failure;
use std::fs;
use std::io::ErrorKind;
use std::os::unix::fs::FileTypeExt;
use std::path::Path;

pub fn devices() -> Result<Vec<Device>, Failure> {
    let directory = match fs::read_dir("/dev/dri") {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(_) => return Err(Failure::Creation),
    };
    let mut devices = Vec::new();
    for entry in directory {
        let entry = entry.map_err(|_| Failure::Creation)?;
        let Some(name) = entry.file_name().into_string().ok() else {
            continue;
        };
        if !name
            .strip_prefix("renderD")
            .is_some_and(|number| number.parse::<u32>().is_ok())
        {
            continue;
        }
        if !entry
            .file_type()
            .map_err(|_| Failure::Creation)?
            .is_char_device()
        {
            continue;
        }
        let sysfs = Path::new("/sys/class/drm").join(&name).join("device");
        let driver = fs::read_link(sysfs.join("driver"))
            .ok()
            .and_then(|link| link.file_name()?.to_str().map(str::to_owned));
        let label = fs::read_to_string(sysfs.join("product_name"))
            .ok()
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
            .or(driver)
            .unwrap_or_else(|| name.clone());
        devices.push(Device {
            name: label,
            selection: DeviceSelection::Linux(format!("/dev/dri/{name}")),
        });
    }
    devices.sort_by(|left, right| match (&left.selection, &right.selection) {
        (DeviceSelection::Linux(a), DeviceSelection::Linux(b)) => a.cmp(b),
        _ => unreachable!(),
    });
    Ok(devices)
}
