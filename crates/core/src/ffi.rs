use crate::LoadError;
use libloading::Library;
use std::ffi::{c_char, c_double, c_int, c_void};

pub type Handle = *mut c_void;

#[repr(C)]
#[derive(Clone, Copy)]
pub struct Node {
    pub data: NodeData,
    pub format: c_int,
}

#[repr(C)]
#[derive(Clone, Copy)]
pub union NodeData {
    pub string: *mut c_char,
    pub flag: c_int,
    pub integer: i64,
    pub double: c_double,
    pub list: *mut NodeList,
    pub bytes: *mut ByteArray,
}

#[repr(C)]
pub struct NodeList {
    pub num: c_int,
    pub values: *mut Node,
    pub keys: *mut *mut c_char,
}

#[repr(C)]
pub struct ByteArray {
    pub data: *mut u8,
    pub size: usize,
}

#[repr(C)]
pub struct Event {
    pub id: c_int,
    pub error: c_int,
    pub userdata: u64,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct Property {
    pub name: *const c_char,
    pub format: c_int,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct LogMessage {
    pub prefix: *const c_char,
    pub level: *const c_char,
    pub text: *const c_char,
    pub level_code: c_int,
}

#[repr(C)]
pub struct ClientMessage {
    pub num_args: c_int,
    pub args: *const *const c_char,
}

#[repr(C)]
pub struct EndFile {
    pub reason: c_int,
    pub error: c_int,
    pub playlist_entry_id: i64,
    pub playlist_insert_id: i64,
    pub playlist_insert_num_entries: c_int,
}

macro_rules! client_api {
    ($($name:ident($($arg:ty),*) -> $result:ty),+ $(,)?) => {
        pub struct Api {
            $(pub $name: unsafe extern "C" fn($($arg),*) -> $result),+
        }

        impl Api {
            pub fn resolve(library: &Library) -> Result<Self, LoadError> {
                Ok(Self {
                    $($name: {
                        let symbol = concat!("mpv_", stringify!($name), "\0");
                        // Signatures match the pinned client.h. Runtime owns the library for the process lifetime.
                        *unsafe { library.get(symbol.as_bytes()) }.map_err(|_| LoadError::IncompatibleLibrary)?
                    }),+
                })
            }
        }
    };
}

client_api! {
    create() -> Handle,
    initialize(Handle) -> c_int,
    set_option(Handle, *const c_char, c_int, *mut c_void) -> c_int,
    client_name(Handle) -> *const c_char,
    client_id(Handle) -> i64,
    get_time_ns(Handle) -> i64,
    terminate_destroy(Handle) -> (),
    destroy(Handle) -> (),
    create_weak_client(Handle, *const c_char) -> Handle,
    get_property_async(Handle, u64, *const c_char, c_int) -> c_int,
    set_property_async(Handle, u64, *const c_char, c_int, *mut c_void) -> c_int,
    command_node_async(Handle, u64, *mut Node) -> c_int,
    abort_async_command(Handle, u64) -> (),
    load_config_file(Handle, *const c_char) -> c_int,
    request_log_messages(Handle, *const c_char) -> c_int,
    request_event(Handle, c_int, c_int) -> c_int,
    observe_property(Handle, u64, *const c_char, c_int) -> c_int,
    unobserve_property(Handle, u64) -> c_int,
    wait_event(Handle, f64) -> *const Event,
    wakeup(Handle) -> (),
}
