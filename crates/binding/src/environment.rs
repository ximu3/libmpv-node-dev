use futures_executor::block_on;
use libmpv_core::client::{Client, Shutdown};
use napi::{Env, Error, Result, sys};
use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::c_void;
use std::ptr;
use std::sync::{Arc, Condvar, Mutex, Weak};

#[derive(Default)]
struct State {
    opening: usize,
    clients: Vec<Shutdown>,
}

#[derive(Default)]
struct Environment {
    state: Mutex<State>,
    ready: Condvar,
}

thread_local! {
    static ENVIRONMENTS: RefCell<HashMap<usize, Weak<Environment>>> = RefCell::new(HashMap::new());
}

pub struct Opening(Arc<Environment>);

impl Opening {
    pub fn begin(env: &Env) -> Result<Self> {
        let id = env.raw() as usize;
        ENVIRONMENTS.with_borrow_mut(|entries| {
            let environment = match entries.get(&id).and_then(Weak::upgrade) {
                Some(environment) => environment,
                None => {
                    let environment = Arc::new(Environment::default());
                    Cleanup::install(env, environment.clone())?;
                    entries.retain(|_, existing| existing.strong_count() != 0);
                    entries.insert(id, Arc::downgrade(&environment));
                    environment
                }
            };
            environment.state.lock().unwrap().opening += 1;
            Ok(Self(environment))
        })
    }

    pub fn register(&self, client: &Client) {
        let mut state = self.0.state.lock().unwrap();
        state.clients.retain(Shutdown::pending);
        state.clients.push(client.shutdown());
    }
}

impl Drop for Opening {
    fn drop(&mut self) {
        let mut state = self.0.state.lock().unwrap();
        state.opening -= 1;
        self.0.ready.notify_all();
    }
}

struct Cleanup {
    environment: Arc<Environment>,
    env: sys::napi_env,
    work: sys::napi_async_work,
    hook: sys::napi_async_cleanup_hook_handle,
}

impl Cleanup {
    fn install(env: &Env, environment: Arc<Environment>) -> Result<()> {
        let mut entry = Box::new(Self {
            environment,
            env: env.raw(),
            work: ptr::null_mut(),
            hook: ptr::null_mut(),
        });
        let data = ptr::from_mut(&mut *entry).cast();
        let mut name = ptr::null_mut();
        // Node borrows the boxed registration until complete; it invokes both lifecycle callbacks on its environment thread.
        unsafe {
            napi::check_status!(sys::napi_create_string_utf8(
                entry.env,
                c"libmpv shutdown".as_ptr(),
                15,
                &mut name
            ))?;
            napi::check_status!(sys::napi_create_async_work(
                entry.env,
                ptr::null_mut(),
                name,
                Some(Self::wait),
                Some(Self::complete),
                data,
                &mut entry.work
            ))?;
            let status = sys::napi_add_async_cleanup_hook(
                entry.env,
                Some(Self::start),
                data,
                &mut entry.hook,
            );
            if status != sys::Status::napi_ok {
                sys::napi_delete_async_work(entry.env, entry.work);
                return Err(Error::from_reason("Unable to register environment cleanup"));
            }
        }
        Box::leak(entry);
        Ok(())
    }

    unsafe extern "C" fn start(_: sys::napi_async_cleanup_hook_handle, data: *mut c_void) {
        // This work was allocated on this environment before the first native creation.
        let entry = unsafe { &*data.cast::<Self>() };
        let status = unsafe { sys::napi_queue_async_work(entry.env, entry.work) };
        if status != sys::Status::napi_ok {
            // Teardown must still join native work if the host can no longer enqueue a worker.
            unsafe {
                Self::wait(entry.env, data);
                Self::complete(entry.env, status, data);
            }
        }
    }

    unsafe extern "C" fn wait(_: sys::napi_env, data: *mut c_void) {
        // Only Rust-owned state is used on the worker; the environment thread retains the boxed registration.
        let environment = unsafe { &(*data.cast::<Self>()).environment };
        let state = environment.state.lock().unwrap();
        let mut state = environment
            .ready
            .wait_while(state, |state| state.opening != 0)
            .unwrap();
        let closing: Vec<_> = state
            .clients
            .drain(..)
            .filter_map(|client| client.start())
            .collect();
        drop(state);
        for done in closing {
            let _ = block_on(done);
        }
    }

    unsafe extern "C" fn complete(env: sys::napi_env, _: sys::napi_status, data: *mut c_void) {
        // Node invokes complete once after wait, and removing the hook permits environment destruction.
        let entry = unsafe { Box::from_raw(data.cast::<Self>()) };
        unsafe {
            sys::napi_delete_async_work(env, entry.work);
            sys::napi_remove_async_cleanup_hook(entry.hook);
        }
    }
}
