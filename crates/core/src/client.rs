mod creation;
pub use creation::Creation;
mod values;
pub use values::Value;

use crate::Runtime;
use crate::ffi::{self, Api, Event};
use futures_channel::oneshot;
use std::collections::HashMap;
use std::ffi::{CStr, CString, c_void};
use std::ptr::NonNull;
use std::sync::{Arc, Mutex, MutexGuard, mpsc};
use std::thread;
use values::{CopyBudget, NodeInput};

const MAX_REQUESTS: usize = 128;
const MAX_BYTES: usize = 128 * 1024 * 1024;

#[derive(Clone, Copy, Debug)]
pub enum Failure {
    Native(i32),
    Limit,
    Closed,
    Aborted,
    UnsupportedFormat,
    Creation,
}

#[derive(Clone, Copy, Debug)]
pub struct Error {
    pub reason: Failure,
    pub submitted: bool,
}

pub type Response = Result<Delivery, Error>;

pub struct Delivery {
    value: Option<Value>,
    shared: Arc<Shared>,
    bytes: usize,
}

impl Delivery {
    pub fn into_js<T>(mut self, convert: impl FnOnce(Value) -> T) -> T {
        convert(self.value.take().unwrap())
    }
}

impl Drop for Delivery {
    fn drop(&mut self) {
        let mut state = self.shared.lock();
        state.bytes -= self.bytes;
        state.deliveries -= 1;
    }
}

pub struct Shutdown(std::sync::Weak<Shared>);

impl Shutdown {
    pub fn pending(&self) -> bool {
        self.0
            .upgrade()
            .is_some_and(|shared| !shared.lock().destroyed)
    }
    pub fn start(&self) -> Option<oneshot::Receiver<()>> {
        self.0.upgrade().map(|shared| shared.stop())
    }
}

pub enum Operation {
    Get(CString, i32),
    Set(CString, Value),
    Command(Value),
    Config(CString),
}

impl Operation {
    fn size(&self) -> usize {
        match self {
            Self::Get(name, _) | Self::Config(name) => name.as_bytes_with_nul().len(),
            Self::Set(name, value) => name.as_bytes_with_nul().len().saturating_add(value.size()),
            Self::Command(value) => value.size(),
        }
    }
}

struct NativeHandle(NonNull<c_void>);
// mpv permits concurrent clock and wakeup calls. State removes the handle before the owner destroys it.
unsafe impl Send for NativeHandle {}

struct State {
    handle: Option<NativeHandle>,
    closing: bool,
    destroyed: bool,
    deliveries: usize,
    requests: HashMap<u32, Request>,
    bytes: usize,
    finished: Vec<oneshot::Sender<()>>,
}

struct Request {
    submitted: bool,
    cancel: bool,
    command: bool,
    bytes: usize,
    sender: Option<oneshot::Sender<Response>>,
}

struct Shared {
    state: Mutex<State>,
    api: &'static Api,
}

impl Shared {
    fn lock(&self) -> MutexGuard<'_, State> {
        self.state.lock().unwrap_or_else(|error| error.into_inner())
    }

    fn finish(self: &Arc<Self>, id: u32, outcome: Result<Value, Failure>) {
        let mut state = self.lock();
        let Some(request) = state.requests.remove(&id) else {
            return;
        };
        state.bytes -= request.bytes;
        let Some(sender) = request.sender else {
            return;
        };
        let reply = outcome
            .and_then(|value| {
                let bytes = value.size();
                if bytes > MAX_BYTES - state.bytes {
                    return Err(Failure::Limit);
                }
                state.bytes += bytes;
                state.deliveries += 1;
                Ok(Delivery {
                    value: Some(value),
                    bytes,
                    shared: self.clone(),
                })
            })
            .map_err(|reason| Error {
                reason,
                submitted: request.submitted,
            });
        drop(state);
        let _ = sender.send(reply);
    }

    fn wake(&self, state: &State) {
        if let Some(handle) = &state.handle {
            // The state lock excludes removal and destruction until the wakeup completes.
            unsafe { (self.api.wakeup)(handle.0.as_ptr()) };
        }
    }

    fn stop(&self) -> oneshot::Receiver<()> {
        let mut state = self.lock();
        let (sender, receiver) = oneshot::channel();
        if !state.destroyed {
            state.closing = true;
            state.finished.push(sender);
            self.wake(&state);
        } else {
            let _ = sender.send(());
        }
        receiver
    }
}

pub struct Client {
    shared: Arc<Shared>,
    work: mpsc::Sender<(u32, Operation)>,
    pub id: i64,
    pub name: String,
}

#[derive(Clone, Copy)]
pub struct CreateError {
    pub submitted: bool,
    pub reason: Failure,
    pub stage: &'static str,
    pub index: Option<usize>,
}

impl Client {
    pub fn create(
        runtime: &'static Runtime,
        options: Vec<(CString, Value)>,
        creation: &Creation,
        on_close: impl FnOnce() + Send + 'static,
    ) -> Result<Self, CreateError> {
        let api = &runtime.api;
        creation.enter("core", None)?;
        // mpv_create returns one owning client reference or null.
        let raw = NonNull::new(unsafe { (api.create)() })
            .ok_or_else(|| creation.stop(Failure::Creation))?;
        let native = OwnedCore {
            handle: NativeHandle(raw),
            api,
        };
        let handle = raw.as_ptr();
        for (index, (name, value)) in options.iter().enumerate() {
            creation.enter("options", Some(index))?;
            let status = NodeInput::with(value, |node| {
                // Both the option name and its full node tree outlive the synchronous call.
                unsafe {
                    (api.set_option)(handle, name.as_ptr(), 6, std::ptr::from_mut(node).cast())
                }
            });
            if status < 0 {
                return Err(creation.stop(Failure::Native(status)));
            }
        }
        creation.enter("initialize", None)?;
        // All options have been applied. OwnedCore handles cleanup even when initialization fails.
        let status = unsafe { (api.initialize)(handle) };
        if status < 0 {
            return Err(creation.stop(Failure::Native(status)));
        }
        creation.enter("publish", None)?;
        // These snapshots are taken on a live, initialized handle before moving ownership to the event thread.
        let (id, name) = unsafe {
            (
                (api.client_id)(handle),
                CStr::from_ptr((api.client_name)(handle))
                    .to_string_lossy()
                    .into_owned(),
            )
        };
        let shared = Arc::new(Shared {
            api,
            state: Mutex::new(State {
                handle: Some(NativeHandle(raw)),
                closing: false,
                destroyed: false,
                deliveries: 0,
                requests: HashMap::new(),
                bytes: 0,
                finished: Vec::new(),
            }),
        });
        let (work, receiver) = mpsc::channel();
        let state = shared.clone();
        thread::Builder::new()
            .name("libmpv-client".into())
            .spawn(move || {
                native.run(state, receiver, on_close);
            })
            .map_err(|_| creation.stop(Failure::Creation))?;
        Ok(Self {
            shared,
            work,
            id,
            name,
        })
    }

    pub fn time(&self) -> Result<i64, Failure> {
        let state = self.shared.lock();
        let handle = state
            .handle
            .as_ref()
            .filter(|_| !state.closing)
            .ok_or(Failure::Closed)?;
        // The state lock keeps the handle live; client.h permits this clock read from any thread.
        Ok(unsafe { (self.shared.api.get_time_ns)(handle.0.as_ptr()) })
    }

    pub fn request(
        &self,
        id: u32,
        operation: Operation,
    ) -> Result<oneshot::Receiver<Response>, Failure> {
        let mut state = self.shared.lock();
        if state.closing {
            return Err(Failure::Closed);
        }
        let bytes = operation.size();
        if state.requests.len() + state.deliveries >= MAX_REQUESTS
            || state.requests.contains_key(&id)
            || state.bytes.saturating_add(bytes) > MAX_BYTES
        {
            return Err(Failure::Limit);
        }
        let (sender, receiver) = oneshot::channel();
        state.requests.insert(
            id,
            Request {
                submitted: false,
                cancel: false,
                command: matches!(operation, Operation::Command(_)),
                bytes,
                sender: Some(sender),
            },
        );
        state.bytes += bytes;
        self.work
            .send((id, operation))
            .expect("live event thread owns the receiver");
        self.shared.wake(&state);
        Ok(receiver)
    }

    pub fn abort(&self, id: u32) {
        let mut state = self.shared.lock();
        if let Some(request) = state.requests.get_mut(&id) {
            request.cancel = true;
            if let Some(sender) = request.sender.take() {
                let _ = sender.send(Err(Error {
                    reason: Failure::Aborted,
                    submitted: request.submitted,
                }));
            }
            if request.submitted
                && request.command
                && let Some(handle) = &state.handle
            {
                // The id is still reserved for this command and the state lock keeps the handle alive.
                unsafe { (self.shared.api.abort_async_command)(handle.0.as_ptr(), u64::from(id)) };
            }
        }
    }

    pub fn shutdown(&self) -> Shutdown {
        Shutdown(Arc::downgrade(&self.shared))
    }

    pub fn is_closing(&self) -> bool {
        self.shared.lock().closing
    }

    pub fn close(&self) -> oneshot::Receiver<()> {
        self.shared.stop()
    }
}

impl Drop for Client {
    fn drop(&mut self) {
        drop(self.shared.stop());
    }
}

struct OwnedCore {
    handle: NativeHandle,
    api: &'static Api,
}

impl Drop for OwnedCore {
    fn drop(&mut self) {
        // Only this owner destroys the initial handle, after it has stopped accepting concurrent users.
        unsafe { (self.api.terminate_destroy)(self.handle.0.as_ptr()) };
    }
}

impl OwnedCore {
    fn submit(&self, id: u32, operation: Operation) -> (i32, bool) {
        let handle = self.handle.0.as_ptr();
        let id = u64::from(id);
        // libmpv copies names and node inputs before these asynchronous submission functions return.
        unsafe {
            match operation {
                Operation::Get(name, format) => (
                    (self.api.get_property_async)(handle, id, name.as_ptr(), format),
                    true,
                ),
                Operation::Set(name, value) => (
                    NodeInput::with(&value, |node| {
                        (self.api.set_property_async)(
                            handle,
                            id,
                            name.as_ptr(),
                            6,
                            std::ptr::from_mut(node).cast(),
                        )
                    }),
                    true,
                ),
                Operation::Command(value) => (
                    NodeInput::with(&value, |node| {
                        (self.api.command_node_async)(handle, id, node)
                    }),
                    true,
                ),
                Operation::Config(path) => {
                    ((self.api.load_config_file)(handle, path.as_ptr()), false)
                }
            }
        }
    }

    fn run(
        self,
        shared: Arc<Shared>,
        work: mpsc::Receiver<(u32, Operation)>,
        on_close: impl FnOnce(),
    ) {
        loop {
            if shared.lock().closing {
                break;
            }
            for (id, operation) in work.try_iter().take(32) {
                {
                    let mut state = shared.lock();
                    if state.closing {
                        break;
                    }
                    let Some(request) = state.requests.get_mut(&id) else {
                        continue;
                    };
                    if request.cancel {
                        drop(state);
                        shared.finish(id, Err(Failure::Aborted));
                        continue;
                    }
                    request.submitted = true;
                }
                let command = matches!(operation, Operation::Command(_));
                let (status, asynchronous) = self.submit(id, operation);
                if status >= 0
                    && command
                    && shared
                        .lock()
                        .requests
                        .get(&id)
                        .is_some_and(|request| request.cancel)
                {
                    // A cancellation racing entry into libmpv may have preceded the creation of its native request.
                    unsafe {
                        (self.api.abort_async_command)(self.handle.0.as_ptr(), u64::from(id))
                    };
                }
                if status < 0 {
                    shared.finish(id, Err(Failure::Native(status)));
                } else if !asynchronous {
                    shared.finish(id, Ok(Value::None));
                }
            }
            if shared.lock().closing {
                break;
            }
            // Only this thread advances the event queue; event data is copied before the next wait.
            let event = unsafe { &*(self.api.wait_event)(self.handle.0.as_ptr(), 0.0) };
            if event.id == 1 {
                break;
            }
            if event.id == 0 {
                // Work submissions wake the blocking wait even if they occur immediately before it.
                let queued = shared
                    .lock()
                    .requests
                    .values()
                    .any(|request| !request.submitted);
                if queued {
                    continue;
                }
                let event = unsafe { &*(self.api.wait_event)(self.handle.0.as_ptr(), -1.0) };
                if event.id == 1 {
                    break;
                }
                self.deliver(&shared, event);
            } else {
                self.deliver(&shared, event);
            }
        }
        {
            let mut state = shared.lock();
            state.closing = true;
            state.handle = None;
            for (_, request) in state.requests.drain() {
                if let Some(sender) = request.sender {
                    let _ = sender.send(Err(Error {
                        reason: Failure::Closed,
                        submitted: request.submitted,
                    }));
                }
            }
        }
        drop(self);
        on_close();
        let mut state = shared.lock();
        state.destroyed = true;
        for sender in state.finished.drain(..) {
            let _ = sender.send(());
        }
    }

    fn deliver(&self, shared: &Arc<Shared>, event: &Event) {
        if !(3..=5).contains(&event.id) {
            return;
        }
        let id = event.userdata as u32;
        let budget = {
            let state = shared.lock();
            let Some(request) = state.requests.get(&id) else {
                return;
            };
            if request.sender.is_none() {
                drop(state);
                shared.finish(id, Err(Failure::Aborted));
                return;
            }
            MAX_BYTES - state.bytes + request.bytes
        };
        let outcome = if event.error < 0 {
            Err(Failure::Native(event.error))
        } else {
            let mut budget = CopyBudget::new(budget);
            // The event id selects its payload; a successful set reply has no payload.
            unsafe {
                match event.id {
                    3 => {
                        let property = &*event.data.cast::<ffi::Property>();
                        budget.property(property.format, property.data)
                    }
                    5 => budget.node(&*event.data.cast::<ffi::Node>(), 0),
                    _ => Ok(Value::None),
                }
            }
        };
        shared.finish(id, outcome);
    }
}
