use crate::video::render::{Options as VideoOptions, Output, RenderOwner};
mod hooks;
pub mod streams;
pub use hooks::{Hook, HookNotice};
mod initialization;
pub use initialization::Diagnostics;
mod events;
pub mod logs;
pub use events::{EngineEvent, Notice, Selection, Watch};
mod creation;
pub use creation::Creation;
mod values;
pub use values::Value;

use crate::Runtime;
use crate::ffi::{self, Api};
use futures_channel::oneshot;
use std::collections::HashMap;
use std::ffi::{CStr, CString, c_void};
use std::ptr::NonNull;
use std::sync::{Arc, Mutex, MutexGuard, mpsc};
use std::thread;
use values::{CopyBudget, NodeInput};

mod requests;
pub use requests::{Delivery, Operation, Response};

#[derive(Clone, Copy, Debug)]
pub enum Failure {
    RenderConflict,
    UnsupportedCapability,
    RenderFailed,
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

struct NativeHandle(NonNull<c_void>);
// mpv permits concurrent clock and wakeup calls. State removes the handle before the owner destroys it.
unsafe impl Send for NativeHandle {}

struct State {
    handle: Option<NativeHandle>,
    closing: bool,
    destroyed: bool,
    children: Vec<Shutdown>,
    protocols: Vec<Arc<streams::Protocol>>,
    watches: HashMap<u64, Arc<events::Queue>>,
    next_watch: u64,
    hook: Option<Arc<hooks::HookQueue>>,
    requests: requests::Requests,
    finished: Vec<oneshot::Sender<()>>,
}

struct Shared {
    output: Option<Arc<Output>>,
    state: Mutex<State>,
    api: &'static Api,
}

impl Shared {
    fn lock(&self) -> MutexGuard<'_, State> {
        self.state.lock().unwrap_or_else(|error| error.into_inner())
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
            for protocol in &state.protocols {
                protocol.stop();
            }
            state.finished.push(sender);
            self.wake(&state);
        } else {
            let _ = sender.send(());
        }
        receiver
    }
}

pub struct Client {
    pub output: Option<Arc<Output>>,
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
        diagnostics: &mut Diagnostics,
        video: Option<VideoOptions>,
        on_close: impl FnOnce() + Send + 'static,
    ) -> Result<Self, CreateError> {
        if let Some(output) = &video
            && options.iter().any(|(name, value)| {
                !crate::video::options::compatible(
                    name.to_bytes(),
                    value,
                    output.configuration().color(),
                )
            })
        {
            return Err(CreateError {
                reason: Failure::RenderConflict,
                submitted: false,
                stage: "input",
                index: None,
            });
        }
        let api = &runtime.api;
        creation.enter("core", None)?;
        // mpv_create returns one owning client reference or null.
        let raw = NonNull::new(unsafe { (api.create)() })
            .ok_or_else(|| creation.stop(Failure::Creation))?;
        let mut native = OwnedClient {
            render: None,
            handle: NativeHandle(raw),
            destroy: api.terminate_destroy,
            api,
        };
        let handle = raw.as_ptr();
        let registration = diagnostics.register(api, handle, creation)?;
        #[cfg(target_os = "linux")]
        {
            // Set the GnuTLS trust source before the caller's ordered options and without changing the process environment.
            let status = unsafe {
                (api.set_option_string)(
                    handle,
                    c"tls-ca-file".as_ptr(),
                    runtime.tls_ca_file.as_ptr(),
                )
            };
            if status < 0 {
                return Err(creation.stop(Failure::Native(status)));
            }
        }
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
        if let Some(configuration) = video {
            creation.enter("video", None)?;
            // libmpv owns the selected VO. The renderer must be ready before an initialization script can load media.
            let status =
                unsafe { (api.set_option_string)(handle, c"vo".as_ptr(), c"libmpv".as_ptr()) };
            if status < 0 {
                return Err(creation.stop(Failure::Native(status)));
            }
            if let VideoOptions::Gpu(options) = &configuration {
                for (key, value) in crate::video::options::GPU_OPTIONS
                    .iter()
                    .copied()
                    .chain([(c"target-prim", options.config.color.primaries())])
                {
                    // These options define the color interpretation of the shared render target before libmpv initializes.
                    let status =
                        unsafe { (api.set_option_string)(handle, key.as_ptr(), value.as_ptr()) };
                    if status < 0 {
                        return Err(creation.stop(Failure::Native(status)));
                    }
                }
            }
            native.render = Some(
                RenderOwner::create(handle, api, configuration)
                    .map_err(|failure| creation.stop(failure))?,
            );
        }
        creation.enter("initialize", None)?;
        // All options have been applied. OwnedClient handles cleanup even when initialization fails.
        let status = unsafe { (api.initialize)(handle) };
        if status < 0 {
            return Err(creation.stop(Failure::Native(status)));
        }
        drop(registration);
        creation.enter("publish", None)?;
        if diagnostics.shutdown() {
            return Err(creation.stop(Failure::Closed));
        }
        if let Some(render) = &native.render {
            let gpu = render.output.configuration().color().is_some();
            for (index, name) in crate::video::options::observed(gpu).enumerate() {
                // Private observations on the primary queue detect changes by scripts, profiles and other clients.
                let status = unsafe {
                    (api.observe_property)(
                        handle,
                        crate::video::options::observer_id(index),
                        name.as_ptr(),
                        6,
                    )
                };
                if status < 0 {
                    return Err(creation.stop(Failure::Native(status)));
                }
            }
        }
        Self::start(native, None, on_close).map_err(|reason| creation.stop(reason))
    }

    pub fn child(&self, name: Option<&CStr>, creation: &Creation) -> Result<Self, Error> {
        let mut state = self.shared.lock();
        let parent = state
            .handle
            .as_ref()
            .filter(|_| !state.closing)
            .ok_or(Error {
                reason: Failure::Closed,
                submitted: false,
            })?;
        creation.enter("core", None).map_err(|error| Error {
            reason: error.reason,
            submitted: error.submitted,
        })?;
        let api = self.shared.api;
        // The parent state lock prevents destruction until the new weak handle has its own owner.
        let handle = unsafe {
            (api.create_weak_client)(
                parent.0.as_ptr(),
                name.map_or(std::ptr::null(), CStr::as_ptr),
            )
        };
        let raw = NonNull::new(handle).ok_or(Error {
            reason: Failure::Creation,
            submitted: true,
        })?;
        let native = OwnedClient {
            render: None,
            handle: NativeHandle(raw),
            destroy: api.destroy,
            api,
        };
        let child =
            Self::start(native, self.shared.output.clone(), || ()).map_err(|reason| Error {
                reason,
                submitted: true,
            })?;
        state.children.retain(Shutdown::pending);
        state.children.push(child.shutdown());
        Ok(child)
    }

    fn start(
        native: OwnedClient,
        parent_output: Option<Arc<Output>>,
        on_close: impl FnOnce() + Send + 'static,
    ) -> Result<Self, Failure> {
        let handle = native.handle.0.as_ptr();
        let api = native.api;
        // These snapshots are taken on a live, initialized handle before moving ownership to the event thread.
        let (id, name) = unsafe {
            (
                (api.client_id)(handle),
                CStr::from_ptr((api.client_name)(handle))
                    .to_string_lossy()
                    .into_owned(),
            )
        };
        let output = native.render.as_ref().map(|owner| owner.output.clone());
        let shared = Arc::new(Shared {
            output: output.clone().or(parent_output),
            api,
            state: Mutex::new(State {
                handle: Some(NativeHandle(native.handle.0)),
                closing: false,
                destroyed: false,
                children: Vec::new(),
                protocols: Vec::new(),
                watches: HashMap::new(),
                next_watch: 1,
                hook: None,
                requests: requests::Requests::default(),
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
            .map_err(|_| Failure::Creation)?;
        Ok(Self {
            output,
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

    pub fn shutdown(&self) -> Shutdown {
        Shutdown(Arc::downgrade(&self.shared))
    }

    pub fn is_closing(&self) -> bool {
        self.shared.lock().closing
    }

    pub fn close(&self) -> oneshot::Receiver<()> {
        if let Some(output) = &self.output {
            output.stop(None);
        }
        self.shared.stop()
    }
}

impl Drop for Client {
    fn drop(&mut self) {
        drop(self.shared.stop());
    }
}

struct OwnedClient {
    render: Option<RenderOwner>,
    destroy: unsafe extern "C" fn(ffi::Handle),
    handle: NativeHandle,
    api: &'static Api,
}

impl Drop for OwnedClient {
    fn drop(&mut self) {
        drop(self.render.take());
        // Only this owner destroys the initial handle, after it has stopped accepting concurrent users.
        unsafe { (self.destroy)(self.handle.0.as_ptr()) };
    }
}

impl OwnedClient {
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
                    let Some(submitted) = state.requests.mark_submitted(id) else {
                        continue;
                    };
                    if !submitted {
                        drop(state);
                        shared.finish(id, Err(Failure::Aborted));
                        continue;
                    }
                }
                let command = matches!(operation, Operation::Command(_));
                let (status, asynchronous) = self.submit(id, operation);
                if status >= 0 && command && shared.lock().requests.cancelled(id) {
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
            let timeout = {
                let state = shared.lock();
                if state.closing {
                    break;
                }
                if state.requests.needs_submission() {
                    0.0
                } else {
                    -1.0
                }
            };
            // A submission or shutdown after this check wakes this very wait.
            let event = unsafe { &*(self.api.wait_event)(self.handle.0.as_ptr(), timeout) };
            if event.id == 1 {
                shared.publish(event);
                break;
            }
            self.deliver(&shared, event);
        }
        let (children, hook, protocols) = {
            let mut state = shared.lock();
            state.closing = true;
            for protocol in &state.protocols {
                protocol.stop();
            }
            state.handle = None;
            state.requests.close();
            (
                std::mem::take(&mut state.children),
                state.hook.take(),
                std::mem::take(&mut state.protocols),
            )
        };
        if let Some(hook) = hook {
            hook.finish(self.api, self.handle.0.as_ptr());
        }
        shared.end_watches();
        let closing: Vec<_> = children
            .into_iter()
            .filter_map(|child| child.start())
            .collect();
        for child in closing {
            let _ = futures_executor::block_on(child);
        }
        drop(self);
        for protocol in protocols {
            protocol.end();
        }
        on_close();
        let mut state = shared.lock();
        state.destroyed = true;
        for sender in state.finished.drain(..) {
            let _ = sender.send(());
        }
    }
}
