use super::{Client, Error, Failure};
use crate::ffi::{Handle, StreamInfo};
use std::collections::{HashMap, VecDeque};
use std::ffi::{CStr, c_char};
use std::ptr;
use std::sync::{Arc, Condvar, Mutex};

const STREAMS: usize = 128;
const MAX_READ: u64 = 1024 * 1024;

pub enum StreamWork {
    Open(Vec<u8>),
    Limit,
    Read(usize),
    Seek(i64),
    Size,
}

pub enum StreamAction {
    Work {
        stream: u64,
        job: u64,
        work: StreamWork,
    },
    Cancel(u64),
    Close(u64),
    Shutdown,
    End,
}

pub enum StreamReply {
    Open { seek: bool, size: bool },
    Bytes(Vec<u8>),
    Eof,
    Size(i64),
    Unknown,
    Ok,
    Failed,
}

struct Job {
    reply: Mutex<Option<StreamReply>>,
    ready: Condvar,
}

impl Job {
    fn complete(&self, value: StreamReply) {
        *self.reply.lock().unwrap() = Some(value);
        self.ready.notify_one();
    }

    fn wait(&self) -> StreamReply {
        let reply = self.reply.lock().unwrap();
        self.ready
            .wait_while(reply, |value| value.is_none())
            .unwrap()
            .take()
            .unwrap()
    }
}

struct Slot {
    canceled: bool,
    job: Option<u64>,
    closed: bool,
}

struct State {
    next: u64,
    closing: bool,
    slots: HashMap<u64, Slot>,
    jobs: HashMap<u64, Arc<Job>>,
    actions: VecDeque<StreamAction>,
}

pub struct Protocol {
    state: Mutex<State>,
    capacity: Condvar,
    wake: Mutex<Option<Box<dyn Fn() + Send + Sync>>>,
}

impl Protocol {
    fn notify(&self) {
        if let Some(wake) = &*self.wake.lock().unwrap() {
            wake();
        }
    }

    fn begin(&self) -> Option<u64> {
        let state = self.state.lock().unwrap();
        let mut state = self
            .capacity
            .wait_while(state, |state| {
                !state.closing && state.slots.len() >= STREAMS
            })
            .unwrap();
        if state.closing {
            return None;
        }
        let id = state.next;
        state.next += 1;
        state.slots.insert(
            id,
            Slot {
                canceled: false,
                job: None,
                closed: false,
            },
        );
        Some(id)
    }

    fn request(&self, stream: u64, work: StreamWork) -> StreamReply {
        let job = Arc::new(Job {
            reply: Mutex::new(None),
            ready: Condvar::new(),
        });
        let mut state = self.state.lock().unwrap();
        if state.closing
            || state
                .slots
                .get(&stream)
                .is_none_or(|slot| slot.canceled || slot.closed)
        {
            return StreamReply::Failed;
        }
        let id = state.next;
        state.next += 1;
        state.slots.get_mut(&stream).unwrap().job = Some(id);
        state.jobs.insert(id, job.clone());
        state.actions.push_back(StreamAction::Work {
            stream,
            job: id,
            work,
        });
        drop(state);
        self.notify();
        job.wait()
    }

    pub fn reply(&self, stream: u64, id: u64, reply: StreamReply) {
        let mut state = self.state.lock().unwrap();
        if let Some(slot) = state.slots.get_mut(&stream)
            && slot.job == Some(id)
        {
            slot.job = None;
            if let Some(job) = state.jobs.remove(&id) {
                job.complete(reply);
            }
        }
    }

    fn cancel(&self, stream: u64) {
        let mut state = self.state.lock().unwrap();
        let Some(slot) = state.slots.get_mut(&stream) else {
            return;
        };
        if slot.canceled || slot.closed {
            return;
        }
        slot.canceled = true;
        if let Some(id) = slot.job.take()
            && let Some(job) = state.jobs.remove(&id)
        {
            job.complete(StreamReply::Failed);
        }
        state.actions.push_back(StreamAction::Cancel(stream));
        drop(state);
        self.notify();
    }

    fn close_stream(&self, stream: u64) {
        let mut state = self.state.lock().unwrap();
        if let Some(slot) = state.slots.get_mut(&stream)
            && !slot.closed
        {
            slot.closed = true;
            state.actions.push_back(StreamAction::Close(stream));
            drop(state);
            self.notify();
        }
    }

    pub fn next(&self) -> Option<StreamAction> {
        self.state.lock().unwrap().actions.pop_front()
    }

    pub fn finished(&self, stream: u64) {
        let mut state = self.state.lock().unwrap();
        if state.slots.get(&stream).is_some_and(|slot| slot.closed) {
            state.slots.remove(&stream);
            self.capacity.notify_one();
        }
    }

    pub(super) fn stop(&self) {
        let mut state = self.state.lock().unwrap();
        if state.closing {
            return;
        }
        state.closing = true;
        for job in state.jobs.drain().map(|(_, job)| job) {
            job.complete(StreamReply::Failed);
        }
        for slot in state.slots.values_mut() {
            slot.canceled = true;
            slot.job = None;
        }
        state.actions.push_back(StreamAction::Shutdown);
        self.capacity.notify_all();
        drop(state);
        self.notify();
    }

    pub(super) fn end(&self) {
        self.state
            .lock()
            .unwrap()
            .actions
            .push_back(StreamAction::End);
        if let Some(wake) = self.wake.lock().unwrap().take() {
            wake();
        }
    }
}

impl Client {
    pub fn register_protocol(
        &self,
        name: &CStr,
        wake: impl Fn() + Send + Sync + 'static,
    ) -> Result<Arc<Protocol>, Error> {
        let protocol = Arc::new(Protocol {
            state: Mutex::new(State {
                next: 1,
                closing: false,
                slots: HashMap::new(),
                jobs: HashMap::new(),
                actions: VecDeque::new(),
            }),
            capacity: Condvar::new(),
            wake: Mutex::new(Some(Box::new(wake))),
        });
        let mut state = self.shared.lock();
        let handle = state
            .handle
            .as_ref()
            .filter(|_| !state.closing)
            .ok_or(Error {
                reason: Failure::Closed,
                submitted: false,
            })?;
        // The owning core retains this Arc until mpv_terminate_destroy returns, including during concurrent stream opens.
        let status = unsafe {
            (self.shared.api.stream_cb_add_ro)(
                handle.0.as_ptr(),
                name.as_ptr(),
                Arc::as_ptr(&protocol).cast_mut().cast(),
                open_stream,
            )
        };
        if status < 0 {
            return Err(Error {
                reason: Failure::Native(status),
                submitted: true,
            });
        }
        state.protocols.push(protocol.clone());
        Ok(protocol)
    }
}

struct Cookie {
    protocol: Arc<Protocol>,
    stream: u64,
}

unsafe extern "C" fn open_stream(data: Handle, uri: *mut c_char, info: *mut StreamInfo) -> i32 {
    let pointer = data.cast::<Protocol>();
    // The registered owner remains live for the whole C callback. The cookie acquires its own Arc.
    unsafe { Arc::increment_strong_count(pointer) };
    let protocol = unsafe { Arc::from_raw(pointer) };
    let Some(stream) = protocol.begin() else {
        return -13;
    };
    // mpv owns this terminated URI only until open returns.
    let bytes = unsafe { CStr::from_ptr(uri) }.to_bytes();
    let work = if bytes.len() > MAX_READ as usize {
        StreamWork::Limit
    } else {
        StreamWork::Open(bytes.to_vec())
    };
    let StreamReply::Open { seek, size } = protocol.request(stream, work) else {
        protocol.close_stream(stream);
        return -13;
    };
    let cookie = Box::new(Cookie { protocol, stream });
    // mpv copies this descriptor and transfers the cookie once to close.
    unsafe {
        info.write(StreamInfo {
            cookie: Box::into_raw(cookie).cast(),
            read: read_stream,
            seek: seek.then_some(seek_stream),
            size: size.then_some(size_stream),
            close: close_stream,
            cancel: Some(cancel_stream),
        })
    };
    0
}

unsafe extern "C" fn read_stream(cookie: Handle, destination: *mut c_char, wanted: u64) -> i64 {
    // Only cancel runs concurrently with stream work. mpv keeps the cookie and destination live during this read.
    let cookie = unsafe { &*cookie.cast::<Cookie>() };
    let size = wanted.min(MAX_READ) as usize;
    if size == 0 {
        return 0;
    }
    match cookie
        .protocol
        .request(cookie.stream, StreamWork::Read(size))
    {
        StreamReply::Bytes(bytes) if !bytes.is_empty() && bytes.len() <= size => {
            unsafe {
                ptr::copy_nonoverlapping(bytes.as_ptr(), destination.cast::<u8>(), bytes.len())
            };
            bytes.len() as i64
        }
        StreamReply::Eof => 0,
        _ => -1,
    }
}

unsafe extern "C" fn seek_stream(cookie: Handle, offset: i64) -> i64 {
    // The cookie remains owned by mpv throughout this seek.
    let cookie = unsafe { &*cookie.cast::<Cookie>() };
    if offset < 0 {
        return -1;
    }
    match cookie
        .protocol
        .request(cookie.stream, StreamWork::Seek(offset))
    {
        StreamReply::Ok => offset,
        _ => -1,
    }
}

unsafe extern "C" fn size_stream(cookie: Handle) -> i64 {
    // The cookie remains owned by mpv throughout this query.
    let cookie = unsafe { &*cookie.cast::<Cookie>() };
    match cookie.protocol.request(cookie.stream, StreamWork::Size) {
        StreamReply::Size(size) if size >= 0 => size,
        StreamReply::Unknown => -18,
        _ => -1,
    }
}

unsafe extern "C" fn cancel_stream(cookie: Handle) {
    // Cancel wakes the native waiter without waiting for provider code or touching its read buffer.
    let cookie = unsafe { &*cookie.cast::<Cookie>() };
    cookie.protocol.cancel(cookie.stream);
}

unsafe extern "C" fn close_stream(cookie: Handle) {
    // The C close callback returns ownership exactly once. JS cleanup has its own completion boundary.
    let cookie = unsafe { Box::from_raw(cookie.cast::<Cookie>()) };
    cookie.protocol.close_stream(cookie.stream);
}
