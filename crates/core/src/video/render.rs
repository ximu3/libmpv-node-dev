use super::Device;
use super::frames::{Frame, FrameWatch};
use super::gpu::{self, ColorSpace, GpuConfiguration, GpuOptions};
use super::software::{self, Pixels};
use crate::client::{Creation, Error, Failure};
use crate::ffi::{Api, FrameInfo, Handle, RenderParam};
use futures_channel::oneshot;
use std::collections::VecDeque;
use std::ffi::c_void;
use std::ptr;
use std::sync::{Arc, Mutex, OnceLock, Weak, mpsc};
use std::thread::{self, JoinHandle, Thread};

pub(crate) const COLOR_REPLY: u64 = u64::MAX;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Configuration {
    Software(software::Configuration),
    Gpu(GpuConfiguration),
}
pub enum Options {
    Software(software::Configuration),
    Gpu(GpuOptions),
}
impl Configuration {
    pub(crate) fn color(self) -> Option<ColorSpace> {
        match self {
            Self::Software(_) => None,
            Self::Gpu(config) => Some(config.color),
        }
    }
}
impl Options {
    pub(crate) fn configuration(&self) -> Configuration {
        match self {
            Self::Software(config) => Configuration::Software(*config),
            Self::Gpu(options) => Configuration::Gpu(options.config),
        }
    }
}
#[derive(Clone, Copy, Default)]
pub struct FrameTiming {
    pub target: Option<i64>,
    pub flags: u64,
}

enum Renderer {
    Software(Pixels),
    Gpu(Box<dyn gpu::Backend>),
}
enum Prepared {
    Software(Pixels),
    Gpu,
}
impl Renderer {
    fn new(options: &Options) -> Result<Self, Failure> {
        match options {
            Options::Software(config) => Pixels::new(*config).map(Self::Software),
            Options::Gpu(options) => gpu::create(options).map(Self::Gpu),
        }
    }
    fn prepare(&mut self, config: Configuration) -> Result<Prepared, Failure> {
        match (self, config) {
            (Self::Software(_), Configuration::Software(config)) => {
                Pixels::new(config).map(Prepared::Software)
            }
            (Self::Gpu(gpu), Configuration::Gpu(config)) => {
                gpu.prepare(config)?;
                Ok(Prepared::Gpu)
            }
            _ => Err(Failure::UnsupportedCapability),
        }
    }
    fn adopt(&mut self, config: Configuration, prepared: Prepared) {
        match (self, config, prepared) {
            (Self::Software(pixels), Configuration::Software(_), Prepared::Software(next)) => {
                *pixels = next
            }
            (Self::Gpu(gpu), Configuration::Gpu(config), Prepared::Gpu) => gpu.adopt(config),
            _ => unreachable!(),
        }
    }
    fn render(
        &mut self,
        ctx: &Context,
        sequence: u64,
        timing: FrameTiming,
        publish: bool,
    ) -> Result<Option<Frame>, Failure> {
        match self {
            Self::Software(pixels) => Ok(pixels
                .draw(ctx.api, ctx.ptr, !publish, sequence, timing)?
                .map(|frame| Frame::Software(Arc::new(frame)))),
            Self::Gpu(gpu) => Ok(gpu
                .frame(ctx.api, ctx.ptr, sequence, timing, publish)?
                .map(|frame| Frame::Gpu(Arc::new(frame)))),
        }
    }
}

struct Context {
    ptr: Handle,
    core: Handle,
    api: &'static Api,
}

unsafe extern "C" fn update(pointer: *mut c_void) {
    // The render thread retains its Thread until the callback is detached and the context has been freed.
    unsafe { &*pointer.cast::<Thread>() }.unpark()
}
impl Context {
    fn create(
        core: Handle,
        api: &'static Api,
        renderer: &Renderer,
        wake: &Thread,
    ) -> Result<Self, Failure> {
        let ptr = match renderer {
            Renderer::Software(_) => software::context(api, core)?,
            Renderer::Gpu(gpu) => gpu.context(api, core)?,
        };
        // The wake callback only unparks its owner. It never enters libmpv or JavaScript.
        unsafe {
            (api.render_context_set_update_callback)(
                ptr,
                Some(update),
                ptr::from_ref(wake).cast_mut().cast(),
            )
        };
        Ok(Self { ptr, core, api })
    }
    fn timing(&self) -> Result<FrameTiming, Failure> {
        let mut info = FrameInfo {
            flags: 0,
            target_time: 0,
        };
        // The selected mpv commit writes nanoseconds to target_time, on the mpv_get_time_ns clock.
        let status = unsafe {
            (self.api.render_context_get_info)(
                self.ptr,
                RenderParam {
                    kind: 11,
                    data: ptr::from_mut(&mut info).cast(),
                },
            )
        };
        if status < 0 {
            return Err(Failure::Native(status));
        }
        Ok(FrameTiming {
            target: (info.target_time != 0).then_some(info.target_time),
            flags: info.flags,
        })
    }
    fn set_primaries(&self, color: ColorSpace) -> Result<(), Failure> {
        let mut value = color.primaries().as_ptr();
        // client.h allows asynchronous property submission from the render thread. The primary event reader delivers its reply.
        let status = unsafe {
            (self.api.set_property_async)(
                self.core,
                COLOR_REPLY,
                c"target-prim".as_ptr(),
                1,
                ptr::from_mut(&mut value).cast(),
            )
        };
        if status < 0 {
            Err(Failure::Native(status))
        } else {
            Ok(())
        }
    }
}
impl Drop for Context {
    fn drop(&mut self) {
        // The context is current on its owner thread and still has its graphics device here.
        unsafe {
            (self.api.render_context_set_update_callback)(self.ptr, None, ptr::null_mut());
            (self.api.render_context_free)(self.ptr);
        }
    }
}

struct Change {
    config: Configuration,
    creation: Arc<Creation>,
    reply: oneshot::Sender<Result<(), Error>>,
}
struct State {
    config: Configuration,
    changes: VecDeque<Change>,
    watches: Vec<Weak<FrameWatch>>,
    swaps: u64,
    closed: bool,
    failure: Option<Failure>,
    redraw: bool,
    changing_color: Option<ColorSpace>,
    color_reply: Option<i32>,
}
pub struct Output {
    state: Mutex<State>,
    thread: OnceLock<Thread>,
    device: OnceLock<Device>,
    pub capacity: u32,
}
impl Output {
    fn wake(&self) {
        if let Some(thread) = self.thread.get() {
            thread.unpark();
        }
    }
    pub fn configuration(&self) -> Configuration {
        self.state.lock().unwrap().config
    }
    pub fn device(&self) -> Option<&Device> {
        self.device.get()
    }
    pub fn closed(&self) -> bool {
        self.state.lock().unwrap().closed
    }
    pub(crate) fn color_matches(&self, value: &[u8]) -> bool {
        let state = self.state.lock().unwrap();
        matches!(state.config,Configuration::Gpu(config) if config.color.primaries().to_bytes()==value)
            || state
                .changing_color
                .is_some_and(|color| color.primaries().to_bytes() == value)
    }
    pub(crate) fn color_reply(&self, code: i32) {
        self.state.lock().unwrap().color_reply = Some(code);
        self.wake();
    }
    pub fn configure(
        &self,
        config: Configuration,
        creation: Arc<Creation>,
    ) -> Result<oneshot::Receiver<Result<(), Error>>, Failure> {
        let mut state = self.state.lock().unwrap();
        if state.closed {
            return Err(Failure::Closed);
        }
        if state.changes.len() >= 128 {
            return Err(Failure::Limit);
        }
        let (reply, wait) = oneshot::channel();
        state.changes.push_back(Change {
            config,
            creation,
            reply,
        });
        drop(state);
        self.wake();
        Ok(wait)
    }
    pub fn observe(
        &self,
        wake: impl Fn() + Send + Sync + 'static,
    ) -> Result<Arc<FrameWatch>, Failure> {
        let mut state = self.state.lock().unwrap();
        if state.closed {
            return Err(Failure::Closed);
        }
        state.watches.retain(|entry| entry.strong_count() != 0);
        let watch = Arc::new(FrameWatch::new(wake));
        state.watches.push(Arc::downgrade(&watch));
        state.redraw = true;
        drop(state);
        self.wake();
        Ok(watch)
    }
    pub fn report_swap(&self) -> Result<(), Failure> {
        let mut state = self.state.lock().unwrap();
        if state.closed {
            return Err(Failure::Closed);
        }
        state.swaps += 1;
        drop(state);
        self.wake();
        Ok(())
    }
    pub(crate) fn stop(&self, failure: Option<Failure>) {
        let mut state = self.state.lock().unwrap();
        if !state.closed {
            state.closed = true;
            state.failure = failure;
        }
        drop(state);
        self.wake();
    }
    fn commit(&self, renderer: &mut Renderer, change: Change, prepared: Prepared) {
        let mut state = self.state.lock().unwrap();
        state.changing_color = None;
        if state.closed {
            let _ = change.reply.send(Err(Error {
                reason: Failure::Closed,
                submitted: true,
            }));
            return;
        }
        renderer.adopt(change.config, prepared);
        for watch in state.watches.iter().filter_map(Weak::upgrade) {
            watch.discard();
        }
        state.config = change.config;
        state.redraw = true;
        let _ = change.reply.send(Ok(()));
    }
    fn prepare(
        &self,
        context: &Context,
        renderer: &mut Renderer,
        change: Change,
    ) -> Option<(Change, Prepared)> {
        let result = change
            .creation
            .enter("video", None)
            .map_err(|error| Error {
                reason: error.reason,
                submitted: error.submitted,
            })
            .and_then(|()| {
                renderer.prepare(change.config).map_err(|reason| Error {
                    reason,
                    submitted: true,
                })
            });
        let prepared = match result {
            Ok(prepared) => prepared,
            Err(error) => {
                let _ = change.reply.send(Err(error));
                return None;
            }
        };
        if let (Configuration::Gpu(old), Configuration::Gpu(new)) =
            (self.configuration(), change.config)
            && old.color != new.color
        {
            self.state.lock().unwrap().changing_color = Some(new.color);
            if let Err(reason) = context.set_primaries(new.color) {
                self.stop(Some(reason));
                let _ = change.reply.send(Err(Error {
                    reason,
                    submitted: true,
                }));
                return None;
            }
            return Some((change, prepared));
        }
        self.commit(renderer, change, prepared);
        None
    }
    fn run(&self, context: &Context, renderer: &mut Renderer) {
        let mut sequence = 0;
        let mut has_frame = false;
        let mut transition: Option<(Change, Prepared)> = None;
        loop {
            let (change, reply, swaps, redraw, watches) = {
                let mut state = self.state.lock().unwrap();
                if state.closed {
                    break;
                }
                state.watches.retain(|entry| entry.strong_count() != 0);
                let watches: Vec<_> = state
                    .watches
                    .iter()
                    .filter_map(Weak::upgrade)
                    .filter(|watch| watch.active())
                    .collect();
                let change = if transition.is_none() {
                    state.changes.pop_front()
                } else {
                    None
                };
                (
                    change,
                    state.color_reply.take(),
                    std::mem::take(&mut state.swaps),
                    std::mem::take(&mut state.redraw),
                    watches,
                )
            };
            if let Some(code) = reply
                && let Some((pending, prepared)) = transition.take()
            {
                if code < 0 {
                    let reason = Failure::Native(code);
                    let _ = pending.reply.send(Err(Error {
                        reason,
                        submitted: true,
                    }));
                    self.stop(Some(reason));
                    continue;
                }
                self.commit(renderer, pending, prepared);
            }
            let changed = change.is_some() || reply.is_some();
            if let Some(change) = change {
                transition = self.prepare(context, renderer, change);
            }
            // Only this owner enters the Render API, including actual swap reports from the host.
            for _ in 0..swaps {
                unsafe { (context.api.render_context_report_swap)(context.ptr) };
            }
            let flags = unsafe { (context.api.render_context_update)(context.ptr) };
            if flags & 1 != 0 || (redraw && has_frame && !watches.is_empty()) {
                let result = context.timing().and_then(|timing| {
                    has_frame |= timing.flags & 1 != 0;
                    let publish =
                        has_frame && transition.is_none() && !watches.is_empty() && !self.closed();
                    renderer.render(context, sequence + 1, timing, publish)
                });
                match result {
                    Ok(Some(frame)) if !self.closed() => {
                        sequence += 1;
                        for watch in watches {
                            watch.send(frame.clone());
                        }
                    }
                    Ok(_) => {}
                    Err(reason) => self.stop(Some(reason)),
                }
                continue;
            }
            if !changed {
                thread::park();
            }
        }
        if let Some((change, _)) = transition {
            let _ = change.reply.send(Err(Error {
                reason: Failure::Closed,
                submitted: true,
            }));
        }
        let mut state = self.state.lock().unwrap();
        for change in state.changes.drain(..) {
            let _ = change.reply.send(Err(Error {
                reason: Failure::Closed,
                submitted: false,
            }));
        }
        for watch in state.watches.iter().filter_map(Weak::upgrade) {
            watch.finish(state.failure);
        }
    }
}

struct BorrowedCore(Handle);
// OwnedClient joins this render thread before invalidating the borrowed core pointer.
unsafe impl Send for BorrowedCore {}
impl BorrowedCore {
    fn context(
        &self,
        api: &'static Api,
        renderer: &Renderer,
        thread: &Thread,
    ) -> Result<Context, Failure> {
        Context::create(self.0, api, renderer, thread)
    }
}

pub(crate) struct RenderOwner {
    pub output: Arc<Output>,
    join: Option<JoinHandle<()>>,
}
impl RenderOwner {
    pub(crate) fn create(
        handle: Handle,
        api: &'static Api,
        options: Options,
    ) -> Result<Self, Failure> {
        let capacity = match &options {
            Options::Gpu(options) => options.capacity,
            Options::Software(_) => 0,
        };
        let output = Arc::new(Output {
            thread: OnceLock::new(),
            device: OnceLock::new(),
            capacity,
            state: Mutex::new(State {
                config: options.configuration(),
                changes: VecDeque::new(),
                watches: Vec::new(),
                swaps: 0,
                closed: false,
                failure: None,
                redraw: false,
                changing_color: None,
                color_reply: None,
            }),
        });
        let (ready, wait) = mpsc::sync_channel(1);
        let state = output.clone();
        let core = BorrowedCore(handle);
        let join = thread::Builder::new()
            .name("libmpv-render".into())
            .spawn(move || {
                let thread = thread::current();
                state.thread.set(thread.clone()).ok();
                let mut renderer = match Renderer::new(&options) {
                    Ok(result) => result,
                    Err(error) => {
                        let _ = ready.send(Err(error));
                        return;
                    }
                };
                if let Renderer::Gpu(gpu) = &renderer {
                    state.device.set(gpu.device()).ok();
                }
                match core.context(api, &renderer, &thread) {
                    Ok(context) => {
                        if ready.send(Ok(())).is_ok() {
                            state.run(&context, &mut renderer);
                        }
                    }
                    Err(error) => {
                        let _ = ready.send(Err(error));
                    }
                }
            })
            .map_err(|_| Failure::Creation)?;
        let owner = Self {
            output,
            join: Some(join),
        };
        wait.recv().map_err(|_| Failure::Creation)??;
        Ok(owner)
    }
}
impl Drop for RenderOwner {
    fn drop(&mut self) {
        self.output.stop(None);
        if let Some(thread) = self.join.take() {
            let _ = thread.join();
        }
    }
}
