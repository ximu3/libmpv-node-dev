use super::{Client, Creation, Error, Failure, Shared};
use crate::ffi::{Api, Handle};
use std::collections::{HashMap, VecDeque};
use std::ffi::CStr;
use std::sync::{Arc, Mutex};

pub enum HookNotice {
    Run(u64),
    End,
    Interrupted(&'static str),
}

struct State {
    next: u64,
    active: HashMap<u64, u64>,
    pending: VecDeque<u64>,
    end: Option<HookNotice>,
    failure: Vec<i32>,
    stopped: bool,
}

pub(super) struct HookQueue {
    state: Mutex<State>,
    wake: Box<dyn Fn() + Send + Sync>,
}

pub struct Hook {
    client: Client,
    queue: Arc<HookQueue>,
}

impl Client {
    pub fn add_hook(
        &self,
        name: &CStr,
        priority: i32,
        creation: &Creation,
        wake: impl Fn() + Send + Sync + 'static,
    ) -> Result<Hook, Error> {
        let client = self.child(None, creation)?;
        let queue = Arc::new(HookQueue {
            state: Mutex::new(State {
                next: 1,
                active: HashMap::new(),
                pending: VecDeque::new(),
                end: None,
                failure: Vec::new(),
                stopped: false,
            }),
            wake: Box::new(wake),
        });
        {
            let mut state = client.shared.lock();
            let handle = state
                .handle
                .as_ref()
                .filter(|_| !state.closing)
                .ok_or(Error {
                    reason: Failure::Closed,
                    submitted: true,
                })?;
            creation.enter("core", None).map_err(|error| Error {
                reason: error.reason,
                submitted: error.submitted,
            })?;
            // This weak client owns one hook; the state lock makes registration visible before consuming its first event.
            let status = unsafe {
                (client.shared.api.hook_add)(handle.0.as_ptr(), 1, name.as_ptr(), priority)
            };
            if status < 0 {
                return Err(Error {
                    reason: Failure::Native(status),
                    submitted: true,
                });
            }
            state.hook = Some(queue.clone());
        }
        Ok(Hook { client, queue })
    }
}

impl Hook {
    pub fn next(&self) -> Option<HookNotice> {
        let mut state = self.queue.state.lock().unwrap();
        if state.stopped {
            return state.end.take();
        }
        state.pending.pop_front().map(HookNotice::Run)
    }

    pub fn resume(&self, token: u64) -> Result<(), i32> {
        let owner = self.client.shared.lock();
        if let Some(handle) = &owner.handle
            && let Some(id) = self.queue.state.lock().unwrap().active.remove(&token)
        {
            // Only the owner of this distinct local execution token may continue this native id.
            let code = unsafe { (self.client.shared.api.hook_continue)(handle.0.as_ptr(), id) };
            if code < 0 {
                return Err(code);
            }
        }
        Ok(())
    }

    pub async fn dispose(&self) -> Vec<i32> {
        let _ = self.client.close().await;
        self.queue.state.lock().unwrap().failure.clone()
    }
}

impl HookQueue {
    pub(super) fn finish(&self, api: &Api, handle: Handle) {
        let mut state = self.state.lock().unwrap();
        state.stopped = true;
        state.pending.clear();
        let active = std::mem::take(&mut state.active);
        for id in active.into_values() {
            // The event reader still owns the live weak handle and no later completion can take these ids.
            let code = unsafe { (api.hook_continue)(handle, id) };
            if code < 0 {
                state.failure.push(code);
            }
        }
        if state.end.is_none() {
            state.end = Some(HookNotice::End);
        }
        drop(state);
        (self.wake)();
    }
}

impl Shared {
    pub(super) fn hook_event(&self, id: Option<u64>) {
        let owner = self.lock();
        let Some(queue) = &owner.hook else { return };
        let mut state = queue.state.lock().unwrap();
        let overflow = if let Some(id) = id {
            if state.active.len() < 128 && !state.stopped {
                let token = state.next;
                state.next += 1;
                state.active.insert(token, id);
                state.pending.push_back(token);
                None
            } else {
                if let Some(handle) = &owner.handle {
                    // The new hook was never handed to a handler and still requires exactly one release.
                    let code = unsafe { (self.api.hook_continue)(handle.0.as_ptr(), id) };
                    if code < 0 {
                        state.failure.push(code);
                    }
                }
                Some("deliveryQueueOverflow")
            }
        } else {
            Some("nativeQueueOverflow")
        };
        if let Some(reason) = overflow {
            state.stopped = true;
            state.end = Some(HookNotice::Interrupted(reason));
        }
        drop(state);
        (queue.wake)();
        drop(owner);
        if overflow.is_some() {
            drop(self.stop());
        }
    }
}
