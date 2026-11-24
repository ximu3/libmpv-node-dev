use super::logs::LogBuffer;
use super::{CreateError, Creation, Failure};
use crate::ffi::{Api, Handle, LogMessage};
use std::ffi::CString;

pub struct Diagnostics {
    level: Option<CString>,
    pub registered: bool,
    pub records: LogBuffer,
    shutdown: bool,
}

impl Diagnostics {
    pub fn new(level: Option<CString>) -> Self {
        Self {
            level,
            registered: false,
            records: LogBuffer::default(),
            shutdown: false,
        }
    }

    pub(super) fn register<'a>(
        &'a mut self,
        api: &'static Api,
        handle: Handle,
        creation: &Creation,
    ) -> Result<Registration<'a>, CreateError> {
        if let Some(level) = &self.level {
            creation.enter("initializationLogs", None)?;
            // The primary handle is uninitialized and has a single owner during this registration.
            let status = unsafe { (api.request_log_messages)(handle, level.as_ptr()) };
            if status < 0 {
                return Err(creation.stop(Failure::Native(status)));
            }
            self.registered = true;
        }
        Ok(Registration {
            diagnostics: self,
            api,
            handle,
        })
    }

    pub(super) fn shutdown(&self) -> bool {
        self.shutdown
    }
}

pub(super) struct Registration<'a> {
    diagnostics: &'a mut Diagnostics,
    api: &'static Api,
    handle: Handle,
}

impl Drop for Registration<'_> {
    fn drop(&mut self) {
        // The pinned client holds 1,000 events and at most 10,000 log lines. A continuously writing script cannot extend factory cleanup.
        for _ in 0..=11_000 {
            let event = unsafe { &*(self.api.wait_event)(self.handle, 0.0) };
            if event.id == 0 {
                break;
            }
            if event.id == 1 {
                self.diagnostics.shutdown = true;
                break;
            }
            if event.id == 2 && self.diagnostics.registered {
                // The same owner copies the event before advancing the native queue.
                unsafe {
                    self.diagnostics
                        .records
                        .copy(&*event.data.cast::<LogMessage>())
                };
            }
        }
        // terminal-default takes ownership of mpv's early buffer. Detach it before any runtime observer can register.
        unsafe {
            (self.api.request_log_messages)(self.handle, c"terminal-default".as_ptr());
            (self.api.request_log_messages)(self.handle, c"no".as_ptr());
        }
    }
}
