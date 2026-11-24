use super::LoadError;
use std::ffi::OsString;
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::path::{Path, PathBuf};
use windows_sys::Win32::System::LibraryLoader::{GetModuleFileNameW, GetModuleHandleExW};

pub fn check_modules(directory: &Path, loaded: bool) -> Result<(), LoadError> {
    for entry in directory
        .read_dir()
        .map_err(|_| LoadError::LibraryLoadFailed)?
    {
        let path = entry.map_err(|_| LoadError::LibraryLoadFailed)?.path();
        if path
            .extension()
            .is_none_or(|ext| !ext.eq_ignore_ascii_case("dll"))
        {
            continue;
        }
        let name: Vec<u16> = path.file_name().unwrap().encode_wide().chain([0]).collect();
        let mut module = std::ptr::null_mut();
        // Hold a reference until the module path has been compared.
        if unsafe { GetModuleHandleExW(0, name.as_ptr(), &mut module) } == 0 {
            if loaded {
                return Err(LoadError::LibraryLoadFailed);
            }
            continue;
        }
        // GetModuleHandleExW acquired the reference that this guard releases.
        let _reference = unsafe { libloading::os::windows::Library::from_raw(module as _) };
        let mut buffer = vec![0; 260];
        let actual = loop {
            // GetModuleFileNameW returns the buffer length when the path is truncated.
            let length =
                unsafe { GetModuleFileNameW(module, buffer.as_mut_ptr(), buffer.len() as u32) }
                    as usize;
            if length == 0 {
                return Err(LoadError::LibraryLoadFailed);
            }
            if length < buffer.len() {
                break PathBuf::from(OsString::from_wide(&buffer[..length]));
            }
            buffer.resize(buffer.len() * 2, 0);
        };
        if !same_file::is_same_file(path, actual).map_err(|_| LoadError::LibraryLoadFailed)? {
            return Err(LoadError::IncompatibleLibrary);
        }
    }
    Ok(())
}
