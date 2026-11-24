use super::frames::{FrameWatch, SoftwareFrame};
use crate::client::{Creation, Error, Failure};
use crate::ffi::{Api, FrameInfo, Handle, RenderParam};
use futures_channel::oneshot;
use std::collections::VecDeque;
use std::ffi::{CStr, c_void};
use std::ptr;
use std::sync::{Arc, Mutex, OnceLock, Weak, mpsc};
use std::thread::{self, JoinHandle, Thread};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PixelFormat {
    Rgb0,
    Bgr0,
    ZeroRgb,
    ZeroBgr,
    Rgb24,
}

impl PixelFormat {
    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "rgb0" => Some(Self::Rgb0),
            "bgr0" => Some(Self::Bgr0),
            "0rgb" => Some(Self::ZeroRgb),
            "0bgr" => Some(Self::ZeroBgr),
            "rgb24" => Some(Self::Rgb24),
            _ => None,
        }
    }
    pub fn name(self) -> &'static CStr {
        match self {
            Self::Rgb0 => c"rgb0",
            Self::Bgr0 => c"bgr0",
            Self::ZeroRgb => c"0rgb",
            Self::ZeroBgr => c"0bgr",
            Self::Rgb24 => c"rgb24",
        }
    }
    fn bytes(self) -> usize {
        if self == Self::Rgb24 { 3 } else { 4 }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Configuration {
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
}

#[derive(Clone, Copy, Default)]
pub struct FrameTiming {
    pub target: Option<i64>,
    pub flags: u64,
}

struct Pixels {
    storage: Vec<u8>,
    offset: usize,
    stride: usize,
    config: Configuration,
}

impl Pixels {
    fn new(config: Configuration) -> Result<Self, Failure> {
        let row = (config.width as usize)
            .checked_mul(config.format.bytes())
            .ok_or(Failure::Limit)?;
        // libmpv requires a whole number of pixels per stride; rgb24 and SIMD alignment meet at 192 bytes.
        let alignment = if config.format == PixelFormat::Rgb24 {
            192
        } else {
            64
        };
        let stride = row.next_multiple_of(alignment);
        let length = stride
            .checked_mul(config.height as usize)
            .filter(|len| *len > 0 && *len <= 128 * 1024 * 1024)
            .ok_or(Failure::Limit)?;
        let mut storage = Vec::new();
        storage
            .try_reserve_exact(length + 63)
            .map_err(|_| Failure::Limit)?;
        storage.resize(length + 63, 0);
        let offset = storage.as_ptr().align_offset(64);
        Ok(Self {
            storage,
            offset,
            stride,
            config,
        })
    }

    fn snapshot(&self) -> Vec<u8> {
        let config = self.config;
        let mut bytes =
            self.storage[self.offset..self.offset + self.stride * config.height as usize].to_vec();
        let used = config.width as usize * config.format.bytes();
        for row in bytes.chunks_exact_mut(self.stride) {
            row[used..].fill(0);
            let padding = match config.format {
                PixelFormat::Rgb0 | PixelFormat::Bgr0 => Some(3),
                PixelFormat::ZeroRgb | PixelFormat::ZeroBgr => Some(0),
                PixelFormat::Rgb24 => None,
            };
            if let Some(index) = padding {
                for pixel in row[..used].chunks_exact_mut(4) {
                    pixel[index] = 0;
                }
            }
        }
        bytes
    }
}

struct Context {
    ptr: Handle,
    api: &'static Api,
}

unsafe extern "C" fn update(context: *mut c_void) {
    // The rendering thread retains this Thread until the callback is removed and the context is freed.
    unsafe { &*context.cast::<Thread>() }.unpark();
}

impl Context {
    fn new(handle: Handle, api: &'static Api, wake: &Thread) -> Result<Self, Failure> {
        let mut context = ptr::null_mut();
        let mut advanced = 1_i32;
        let mut params = [
            RenderParam {
                kind: 1,
                data: c"sw".as_ptr().cast_mut().cast(),
            },
            RenderParam {
                kind: 10,
                data: ptr::from_mut(&mut advanced).cast(),
            },
            RenderParam::end(),
        ];
        // The core owner waits for initialization and later joins this thread before releasing the client handle.
        let code =
            unsafe { (api.render_context_create)(&mut context, handle, params.as_mut_ptr()) };
        if code < 0 {
            return Err(Failure::Native(code));
        }
        if context.is_null() {
            return Err(Failure::Creation);
        }
        unsafe {
            (api.render_context_set_update_callback)(
                context,
                Some(update),
                ptr::from_ref(wake).cast_mut().cast(),
            )
        };
        Ok(Self { ptr: context, api })
    }

    fn frame(&self, pixels: &mut Pixels, skip: bool) -> Result<FrameTiming, Failure> {
        let mut info = FrameInfo {
            flags: 0,
            target_time: 0,
        };
        // Both info and render are called by the sole owner of the same context.
        let code = unsafe {
            (self.api.render_context_get_info)(
                self.ptr,
                RenderParam {
                    kind: 11,
                    data: ptr::from_mut(&mut info).cast(),
                },
            )
        };
        if code < 0 {
            return Err(Failure::Native(code));
        }
        let mut size = [pixels.config.width as i32, pixels.config.height as i32];
        let mut skipped = i32::from(skip);
        let pointer = pixels.storage[pixels.offset..].as_mut_ptr();
        let mut params = [
            RenderParam {
                kind: 17,
                data: size.as_mut_ptr().cast(),
            },
            RenderParam {
                kind: 18,
                data: pixels.config.format.name().as_ptr().cast_mut().cast(),
            },
            RenderParam {
                kind: 19,
                data: ptr::from_mut(&mut pixels.stride).cast(),
            },
            RenderParam {
                kind: 20,
                data: pointer.cast(),
            },
            RenderParam {
                kind: 13,
                data: ptr::from_mut(&mut skipped).cast(),
            },
            RenderParam::end(),
        ];
        // The aligned allocation covers stride * height, including the final row's padding.
        let code = unsafe { (self.api.render_context_render)(self.ptr, params.as_mut_ptr()) };
        if code < 0 {
            return Err(Failure::Native(code));
        }
        Ok(FrameTiming {
            target: (info.target_time != 0).then_some(info.target_time),
            flags: info.flags,
        })
    }
}

impl Drop for Context {
    fn drop(&mut self) {
        // The owning thread detaches the wake callback before releasing its context and callback storage.
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
}

pub struct Output {
    state: Mutex<State>,
    thread: OnceLock<Thread>,
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
    pub fn closed(&self) -> bool {
        self.state.lock().unwrap().closed
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

    fn run(&self, context: &Context, mut pixels: Pixels) {
        let mut sequence = 0;
        let mut has_frame = false;
        loop {
            let (changes, swaps, mut redraw, watches) = {
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
                (
                    std::mem::take(&mut state.changes),
                    std::mem::take(&mut state.swaps),
                    std::mem::take(&mut state.redraw),
                    watches,
                )
            };
            for change in changes {
                if self.closed() {
                    let _ = change.reply.send(Err(Error {
                        reason: Failure::Closed,
                        submitted: false,
                    }));
                    continue;
                }
                let result = change
                    .creation
                    .enter("video", None)
                    .map_err(|error| Error {
                        reason: error.reason,
                        submitted: error.submitted,
                    })
                    .and_then(|()| {
                        Pixels::new(change.config).map_err(|reason| Error {
                            reason,
                            submitted: true,
                        })
                    });
                match result {
                    Ok(next) => {
                        let mut state = self.state.lock().unwrap();
                        if state.closed {
                            let _ = change.reply.send(Err(Error {
                                reason: Failure::Closed,
                                submitted: true,
                            }));
                            continue;
                        }
                        state.config = change.config;
                        drop(state);
                        pixels = next;
                        for watch in &watches {
                            watch.discard();
                        }
                        redraw = true;
                        let _ = change.reply.send(Ok(()));
                    }
                    Err(error) => {
                        let _ = change.reply.send(Err(error));
                    }
                }
            }
            // Render API calls, including host swap reports, stay on the context owner.
            for _ in 0..swaps {
                unsafe { (context.api.render_context_report_swap)(context.ptr) };
            }
            let flags = unsafe { (context.api.render_context_update)(context.ptr) };
            if flags & 1 != 0 || (redraw && has_frame && !watches.is_empty()) {
                match context.frame(&mut pixels, watches.is_empty()) {
                    Ok(timing) => {
                        has_frame = has_frame || timing.flags & 1 != 0;
                        if has_frame && !watches.is_empty() && !self.closed() {
                            sequence += 1;
                            let frame = Arc::new(SoftwareFrame {
                                sequence,
                                configuration: pixels.config,
                                stride: pixels.stride as u32,
                                data: pixels.snapshot(),
                                timing,
                            });
                            for watch in watches {
                                watch.send(frame.clone());
                            }
                        }
                    }
                    Err(reason) => {
                        self.stop(Some(reason));
                    }
                }
                continue;
            }
            thread::park();
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
// Only the render owner uses this borrowed handle; OwnedClient joins it before mpv_terminate_destroy.
unsafe impl Send for BorrowedCore {}
impl BorrowedCore {
    fn create(&self, api: &'static Api, wake: &Thread) -> Result<Context, Failure> {
        Context::new(self.0, api, wake)
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
        config: Configuration,
    ) -> Result<Self, Failure> {
        let output = Arc::new(Output {
            thread: OnceLock::new(),
            state: Mutex::new(State {
                config,
                changes: VecDeque::new(),
                watches: Vec::new(),
                swaps: 0,
                closed: false,
                failure: None,
                redraw: false,
            }),
        });
        let (ready, wait) = mpsc::sync_channel(1);
        let state = output.clone();
        let core = BorrowedCore(handle);
        let thread = thread::Builder::new()
            .name("libmpv-render".into())
            .spawn(move || {
                let wake = thread::current();
                state.thread.set(wake.clone()).ok();
                match Pixels::new(config)
                    .and_then(|pixels| core.create(api, &wake).map(|ctx| (pixels, ctx)))
                {
                    Ok((pixels, context)) => {
                        if ready.send(Ok(())).is_ok() {
                            state.run(&context, pixels);
                        }
                    }
                    Err(reason) => {
                        let _ = ready.send(Err(reason));
                    }
                }
            })
            .map_err(|_| Failure::Creation)?;
        let owner = Self {
            output,
            join: Some(thread),
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
