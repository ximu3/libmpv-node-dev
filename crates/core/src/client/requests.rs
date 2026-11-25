use super::values::{CopyBudget, NodeInput};
use super::{Client, Error, Failure, OwnedClient, Shared, Value};
use crate::ffi::{self, Event};
use futures_channel::oneshot;
use std::collections::HashMap;
use std::ffi::CString;
use std::sync::Arc;

const MAX_REQUESTS: usize = 128;
const MAX_BYTES: usize = include!("../../../../src/client/input-budget.json");

#[derive(Default)]
pub(super) struct Requests {
    entries: HashMap<u32, Request>,
    inputs: HashMap<u32, usize>,
    bytes: usize,
    deliveries: usize,
}

impl Requests {
    pub(super) fn mark_submitted(&mut self, id: u32) -> Option<bool> {
        let request = self.entries.get_mut(&id)?;
        request.submitted = !request.cancel;
        Some(request.submitted)
    }
    pub(super) fn cancelled(&self, id: u32) -> bool {
        self.entries.get(&id).is_some_and(|request| request.cancel)
    }
    pub(super) fn needs_submission(&self) -> bool {
        self.entries.values().any(|request| !request.submitted)
    }
    pub(super) fn close(&mut self) {
        self.bytes -= self.inputs.drain().map(|(_, bytes)| bytes).sum::<usize>();
        for (_, request) in self.entries.drain() {
            self.bytes -= request.bytes;
            if let Some(sender) = request.sender {
                let _ = sender.send(Err(Error {
                    reason: Failure::Closed,
                    submitted: request.submitted,
                }));
            }
        }
    }
}

struct Request {
    submitted: bool,
    cancel: bool,
    command: bool,
    bytes: usize,
    sender: Option<oneshot::Sender<Response>>,
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
        state.requests.bytes -= self.bytes;
        state.requests.deliveries -= 1;
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

impl Shared {
    pub(super) fn finish(self: &Arc<Self>, id: u32, outcome: Result<Value, Failure>) {
        let mut state = self.lock();
        let Some(request) = state.requests.entries.remove(&id) else {
            return;
        };
        state.requests.bytes -= request.bytes;
        let Some(sender) = request.sender else {
            return;
        };
        let reply = outcome
            .and_then(|value| {
                let bytes = value.size();
                if bytes > MAX_BYTES - state.requests.bytes {
                    return Err(Failure::Limit);
                }
                state.requests.bytes += bytes;
                state.requests.deliveries += 1;
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
}

impl Client {
    pub fn begin_input(&self, id: u32) -> Result<(), Failure> {
        let mut state = self.shared.lock();
        if state.closing {
            return Err(Failure::Closed);
        }
        let queue = &mut state.requests;
        if queue.entries.len() + queue.inputs.len() + queue.deliveries >= MAX_REQUESTS
            || queue.entries.contains_key(&id)
            || queue.inputs.contains_key(&id)
        {
            return Err(Failure::Limit);
        }
        queue.inputs.insert(id, 0);
        Ok(())
    }
    pub fn charge_input(&self, id: u32, bytes: usize) -> bool {
        let mut state = self.shared.lock();
        if state.closing {
            return false;
        }
        let queue = &mut state.requests;
        if bytes > MAX_BYTES - queue.bytes {
            return false;
        }
        let Some(input) = queue.inputs.get_mut(&id) else {
            return false;
        };
        *input += bytes;
        queue.bytes += bytes;
        true
    }
    pub fn release_input(&self, id: u32) {
        let mut state = self.shared.lock();
        let queue = &mut state.requests;
        if let Some(bytes) = queue.inputs.remove(&id) {
            queue.bytes -= bytes
        }
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
        if let Some(output) = &self.shared.output
            && crate::video::options::conflict(&operation, output.configuration().color())
        {
            return Err(Failure::RenderConflict);
        }
        let bytes = operation.size();
        let Some(input) = state.requests.inputs.get_mut(&id) else {
            return Err(Failure::Limit);
        };
        if bytes > *input {
            return Err(Failure::Limit);
        }
        // Transfer the owned operation to the request. The JS call releases its staging allowance separately.
        *input -= bytes;
        let (sender, receiver) = oneshot::channel();
        state.requests.entries.insert(
            id,
            Request {
                submitted: false,
                cancel: false,
                command: matches!(operation, Operation::Command(_)),
                bytes,
                sender: Some(sender),
            },
        );

        self.work
            .send((id, operation))
            .expect("live event thread owns the receiver");
        self.shared.wake(&state);
        Ok(receiver)
    }

    pub fn abort(&self, id: u32) {
        let mut state = self.shared.lock();
        if let Some(request) = state.requests.entries.get_mut(&id) {
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
}

impl OwnedClient {
    pub(super) fn submit(&self, id: u32, operation: Operation) -> (i32, bool) {
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

    pub(super) fn deliver(&self, shared: &Arc<Shared>, event: &Event) {
        if event.id == 4
            && event.userdata == crate::video::render::COLOR_REPLY
            && let Some(output) = &shared.output
        {
            output.color_reply(event.error);
            return;
        }
        if !(3..=5).contains(&event.id) {
            shared.publish(event);
            return;
        }
        let id = event.userdata as u32;
        let budget = {
            let state = shared.lock();
            let Some(request) = state.requests.entries.get(&id) else {
                return;
            };
            if request.sender.is_none() {
                drop(state);
                shared.finish(id, Err(Failure::Aborted));
                return;
            }
            MAX_BYTES - state.requests.bytes + request.bytes
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
