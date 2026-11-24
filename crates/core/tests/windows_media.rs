#![cfg(windows)]

use libloading::os::windows::{
    LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR, LOAD_LIBRARY_SEARCH_SYSTEM32, Library,
};
use std::ffi::{CStr, c_char, c_int, c_void};
use std::path::{Path, PathBuf};

fn load(directory: &Path, name: &str) -> Library {
    // The test runs in its own process with an explicitly assembled media directory.
    unsafe {
        Library::load_with_flags(
            directory.join(name),
            LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_SYSTEM32,
        )
    }
    .unwrap()
}

#[test]
#[ignore = "requires an assembled Windows media runtime"]
fn built_media_libraries_and_native_font_provider() {
    let directory =
        PathBuf::from(std::env::var_os("LIBMPV_TEST_RUNTIME").expect("Missing media runtime"));
    for (dll, prefix) in [
        ("avcodec-63.dll", "avcodec"),
        ("avformat-63.dll", "avformat"),
        ("avfilter-12.dll", "avfilter"),
    ] {
        let library = load(&directory, dll);
        for suffix in ["license", "configuration"] {
            let name = format!("{prefix}_{suffix}\0");
            // These FFmpeg APIs return static strings owned by the loaded library.
            let get =
                unsafe { library.get::<unsafe extern "C" fn() -> *const c_char>(name.as_bytes()) }
                    .unwrap();
            let result = unsafe { CStr::from_ptr(get()) }.to_str().unwrap();
            if suffix == "license" {
                assert_eq!(result, "LGPL version 2.1 or later");
            } else {
                assert!(result.contains("--enable-schannel"));
                assert!(result.contains("--disable-gpl"));
                assert!(result.contains("--disable-nonfree"));
            }
        }
    }

    assert!(!directory.join("libfontconfig-1.dll").exists());
    let library = load(&directory, "libass-9.dll");
    // The MinGW build returns a malloc-owned provider list, allocated by the system UCRT.
    unsafe {
        let crt = Library::load_with_flags("ucrtbase.dll", LOAD_LIBRARY_SEARCH_SYSTEM32).unwrap();
        let free = crt
            .get::<unsafe extern "C" fn(*mut c_void)>(b"free\0")
            .unwrap();
        let create = library
            .get::<unsafe extern "C" fn() -> *mut c_void>(b"ass_library_init\0")
            .unwrap();
        let available = library
            .get::<unsafe extern "C" fn(*mut c_void, *mut *mut c_int, *mut usize)>(
                b"ass_get_available_font_providers\0",
            )
            .unwrap();
        let destroy = library
            .get::<unsafe extern "C" fn(*mut c_void)>(b"ass_library_done\0")
            .unwrap();
        let lib = create();
        assert!(!lib.is_null());
        let mut providers = std::ptr::null_mut();
        let mut count = 0;
        available(lib, &mut providers, &mut count);
        let actual = if count == 0 {
            Vec::new()
        } else {
            std::slice::from_raw_parts(providers, count).to_vec()
        };
        free(providers.cast());
        destroy(lib);
        assert_eq!(
            actual,
            [0, 1, 4],
            "Expected none, autodetect and DirectWrite"
        );
    }
}
