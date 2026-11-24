use crate::ffi::Api;
#[cfg(windows)]
mod windows;

use libloading::Library;
use std::ffi::c_ulong;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LoadError {
    LibraryLoadFailed,
    IncompatibleLibrary,
}

pub struct Runtime {
    pub(crate) api: Api,
    _library: Library,
    directory: PathBuf,
    pub version: (u16, u16),
}

static RUNTIME: OnceLock<Runtime> = OnceLock::new();
static LOADING: Mutex<()> = Mutex::new(());

#[cfg(windows)]
fn open(path: &Path) -> Result<Library, LoadError> {
    use libloading::os::windows::{
        LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR, LOAD_LIBRARY_SEARCH_SYSTEM32, Library as WindowsLibrary,
    };
    // The caller supplies an absolute path and limits dependency resolution to the package and System32.
    unsafe {
        WindowsLibrary::load_with_flags(
            path,
            LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_SYSTEM32,
        )
    }
    .map(Into::into)
    .map_err(|_| LoadError::LibraryLoadFailed)
}

#[cfg(unix)]
fn open(path: &Path) -> Result<Library, LoadError> {
    use libloading::os::unix::{Library as UnixLibrary, RTLD_LOCAL, RTLD_NOW};
    // The installed graph uses private media names and resolves the process allocator normally.
    unsafe { UnixLibrary::open(Some(path), RTLD_NOW | RTLD_LOCAL) }
        .map(Into::into)
        .map_err(|_| LoadError::LibraryLoadFailed)
}
const ENGINE: &str = if cfg!(windows) {
    "libmpv-2.dll"
} else if cfg!(target_os = "macos") {
    "libmpv.2.dylib"
} else {
    "libmpv.so.2"
};

impl Runtime {
    pub fn load(directory: &Path) -> Result<&'static Self, LoadError> {
        let directory = directory
            .canonicalize()
            .map_err(|_| LoadError::LibraryLoadFailed)?;
        let _guard = LOADING.lock().unwrap_or_else(|error| error.into_inner());
        if let Some(runtime) = RUNTIME.get() {
            return if runtime.directory == directory {
                Ok(runtime)
            } else {
                Err(LoadError::IncompatibleLibrary)
            };
        }

        #[cfg(windows)]
        windows::check_modules(&directory, false)?;
        let library = open(&directory.join(ENGINE))?;
        #[cfg(windows)]
        windows::check_modules(&directory, true)?;
        // The pinned client.h declares this symbol with no arguments and an unsigned long return.
        let get_version = unsafe {
            library.get::<unsafe extern "C" fn() -> c_ulong>(b"mpv_client_api_version\0")
        }
        .map_err(|_| LoadError::IncompatibleLibrary)?;
        // The function pointer is used while its owning library is still live.
        let version = unsafe { get_version() };
        if version != ((2 << 16) | 6) {
            return Err(LoadError::IncompatibleLibrary);
        }
        let api = Api::resolve(&library)?;
        Ok(RUNTIME.get_or_init(|| Self {
            api,
            _library: library,
            directory,
            version: ((version >> 16) as u16, version as u16),
        }))
    }
}
