use super::logs::{LogBuffer, LogRecord};
mod record;
pub use record::EngineEvent;

use super::{Client, Error, Failure, Shared, Value};
use crate::ffi::{self, Event};
use std::collections::VecDeque;
use std::ffi::CString;
use std::sync::{Arc, Mutex, Weak};

const MAX_EVENTS: usize = 256;
const MAX_BYTES: usize = 8 * 1024 * 1024;

pub enum Selection {
    Property(CString, i32),
    Events(Vec<i32>),
    Logs(CString),
}

pub enum Notice {
    Value(Arc<Value>),
    Event(Arc<EngineEvent>),
    Log(LogRecord),
    Unavailable,
    End,
    Interrupted(&'static str),
    Error(Failure),
}

impl Notice {
    fn size(&self) -> usize {
        match self {
            Self::Value(value) => value.size(),
            Self::Event(event) => event.size(),
            _ => 0,
        }
    }
}

struct Buffer {
    data: VecDeque<Notice>,
    terminal: Option<Notice>,
    logs: LogBuffer,
    bytes: usize,
    ended: bool,
}

pub(super) struct Queue {
    selection: Selection,
    buffer: Mutex<Buffer>,
    notify: Box<dyn Fn() + Send + Sync>,
}

impl Queue {
    fn push(&self, notice: Notice) {
        let mut buffer = self.buffer.lock().unwrap();
        if buffer.ended {
            return;
        }
        let ready = buffer.data.is_empty();
        let size = notice.size();
        if matches!(self.selection, Selection::Property(..)) && buffer.data.len() == 2 {
            buffer.bytes -= buffer.data.pop_back().unwrap().size();
        }
        if buffer.data.len() >= MAX_EVENTS || size > MAX_BYTES - buffer.bytes {
            buffer.ended = true;
            buffer.terminal = Some(Notice::Interrupted("deliveryQueueOverflow"));
        } else {
            buffer.bytes += size;
            buffer.data.push_back(notice);
        }
        drop(buffer);
        if ready {
            (self.notify)();
        }
    }

    fn end(&self, terminal: Notice) {
        let mut buffer = self.buffer.lock().unwrap();
        if buffer.ended {
            return;
        }
        buffer.ended = true;
        buffer.terminal = Some(terminal);
        drop(buffer);
        (self.notify)();
    }
}

pub struct Watch {
    id: u64,
    internal: Mutex<Option<Client>>,
    shared: Weak<Shared>,
    queue: Arc<Queue>,
}

impl Watch {
    pub fn next(&self) -> Option<Notice> {
        let mut buffer = self.queue.buffer.lock().unwrap();
        if let Some(record) = buffer.logs.next() {
            return Some(Notice::Log(record));
        }
        if let Some(notice) = buffer.data.pop_front() {
            buffer.bytes -= notice.size();
            return Some(notice);
        }
        buffer.terminal.take()
    }

    pub fn dispose(&self) {
        if let Some(shared) = self.shared.upgrade() {
            let mut state = shared.lock();
            if state.watches.remove(&self.id).is_some()
                && let Some(handle) = &state.handle
            {
                match &self.queue.selection {
                    Selection::Property(_, _) => {
                        // This handle owns the id and cannot be destroyed while state is locked.
                        unsafe { (shared.api.unobserve_property)(handle.0.as_ptr(), self.id) };
                    }
                    Selection::Logs(_) => {}
                    Selection::Events(events) => {
                        for id in events {
                            if *id != 1 && !state.watches.values().any(|queue| queue.accepts(*id)) {
                                // Shutdown remains enabled independently of the public event selection.
                                unsafe { (shared.api.request_event)(handle.0.as_ptr(), *id, 0) };
                            }
                        }
                    }
                }
            }
        }
        let mut buffer = self.queue.buffer.lock().unwrap();
        buffer.ended = true;
        buffer.data.clear();
        buffer.bytes = 0;
        buffer.terminal = None;
        buffer.logs = LogBuffer::default();
        drop(buffer);
        if let Some(internal) = self.internal.lock().unwrap().take() {
            let _ = futures_executor::block_on(internal.close());
        }
    }
}

impl Drop for Watch {
    fn drop(&mut self) {
        self.dispose();
    }
}

impl Queue {
    fn accepts(&self, event: i32) -> bool {
        matches!(&self.selection, Selection::Events(events) if events.contains(&event))
    }
}

impl Client {
    pub fn observe_logs(
        &self,
        level: CString,
        creation: &super::Creation,
        notify: impl Fn() + Send + Sync + 'static,
    ) -> Result<Watch, Error> {
        let internal = self.child(None, creation)?;
        let watch = internal.observe(Selection::Logs(level), creation, notify)?;
        *watch.internal.lock().unwrap() = Some(internal);
        Ok(watch)
    }
    pub fn observe(
        &self,
        selection: Selection,
        creation: &super::Creation,
        notify: impl Fn() + Send + Sync + 'static,
    ) -> Result<Watch, Error> {
        let mut state = self.shared.lock();
        let handle = state
            .handle
            .as_ref()
            .filter(|_| !state.closing)
            .ok_or(Error {
                reason: Failure::Closed,
                submitted: false,
            })?
            .0
            .as_ptr();
        let id = state.next_watch;
        state.next_watch = state.next_watch.checked_add(1).ok_or(Error {
            reason: Failure::Limit,
            submitted: false,
        })?;
        creation.enter("core", None).map_err(|failure| Error {
            reason: failure.reason,
            submitted: failure.submitted,
        })?;
        match &selection {
            Selection::Logs(level) => {
                // This weak client belongs exclusively to the log registration.
                let status =
                    unsafe { (self.shared.api.request_log_messages)(handle, level.as_ptr()) };
                if status < 0 {
                    return Err(Error {
                        reason: Failure::Native(status),
                        submitted: true,
                    });
                }
            }
            Selection::Property(name, format) => {
                // libmpv copies the name during registration; state protects the handle and the first event's id.
                let status = unsafe {
                    (self.shared.api.observe_property)(handle, id, name.as_ptr(), *format)
                };
                if status < 0 {
                    return Err(Error {
                        reason: Failure::Native(status),
                        submitted: true,
                    });
                }
            }
            Selection::Events(events) => {
                for id in events {
                    // The selection contains public mpv_event_id values validated at the JS boundary.
                    let status = unsafe { (self.shared.api.request_event)(handle, *id, 1) };
                    if status < 0 {
                        return Err(Error {
                            reason: Failure::Native(status),
                            submitted: true,
                        });
                    }
                }
            }
        }
        let queue = Arc::new(Queue {
            selection,
            notify: Box::new(notify),
            buffer: Mutex::new(Buffer {
                data: VecDeque::new(),
                terminal: None,
                logs: LogBuffer::default(),
                bytes: 0,
                ended: false,
            }),
        });
        state.watches.insert(id, queue.clone());
        Ok(Watch {
            internal: Mutex::new(None),
            id,
            shared: Arc::downgrade(&self.shared),
            queue,
        })
    }
}

impl Shared {
    pub(super) fn end_watches(&self) {
        let watches = std::mem::take(&mut self.lock().watches);
        for queue in watches.into_values() {
            queue.end(Notice::End);
        }
    }

    pub(super) fn publish(&self, event: &Event) {
        if event.id == 25 {
            // Only the native event pump can read the hook payload before the next wait.
            self.hook_event(Some(unsafe { (*event.data.cast::<ffi::HookEvent>()).id }));
            return;
        }
        if event.id == 24 {
            self.hook_event(None);
        }
        if event.id == 2 {
            let queue = self
                .lock()
                .watches
                .values()
                .find(|queue| matches!(queue.selection, Selection::Logs(_)))
                .cloned();
            if let Some(queue) = queue {
                let mut buffer = queue.buffer.lock().unwrap();
                if !buffer.ended {
                    let wake = buffer.logs.is_empty();
                    // MPV_EVENT_LOG_MESSAGE owns these bytes until the reader advances its queue.
                    unsafe { buffer.logs.copy(&*event.data.cast::<ffi::LogMessage>()) };
                    drop(buffer);
                    if wake {
                        (queue.notify)();
                    }
                }
            }
            return;
        }
        if event.id == 22 {
            let watch = self.lock().watches.get(&event.userdata).cloned();
            if let Some(queue) = watch {
                // The event owner calls publish before advancing the queue. NONE carries no property data.
                let property = unsafe { &*event.data.cast::<ffi::Property>() };
                if property.format == 0 {
                    queue.push(Notice::Unavailable);
                } else {
                    let mut budget = super::CopyBudget::new(MAX_BYTES);
                    match unsafe { budget.property(property.format, property.data) } {
                        Ok(value) => queue.push(Notice::Value(Arc::new(value))),
                        Err(reason) => queue.end(Notice::Error(reason)),
                    }
                }
            }
            return;
        }
        let watches: Vec<_> = self
            .lock()
            .watches
            .values()
            .filter(|q| {
                q.accepts(event.id)
                    || (event.id == 24 && matches!(q.selection, Selection::Events(_)))
            })
            .cloned()
            .collect();
        if watches.is_empty() {
            return;
        }
        if event.id == 24 {
            for queue in watches {
                queue.end(Notice::Interrupted("nativeQueueOverflow"));
            }
            return;
        }
        // The event id determines the exact client.h payload and the calling event reader owns its lifetime.
        let value = unsafe { EngineEvent::copy(event, MAX_BYTES) }.map(Arc::new);
        for queue in watches {
            match &value {
                Ok(value) => queue.push(Notice::Event(value.clone())),
                Err(_) => queue.end(Notice::Interrupted("deliveryQueueOverflow")),
            }
        }
    }
}
