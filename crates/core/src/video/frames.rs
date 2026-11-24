use super::gpu::GpuFrame;
use super::render::FrameTiming;
use super::software::Configuration;
use crate::client::Failure;
use std::sync::{Arc, Mutex};

pub struct SoftwareFrame {
    pub sequence: u64,
    pub configuration: Configuration,
    pub stride: u32,
    pub data: Vec<u8>,
    pub timing: FrameTiming,
}

#[derive(Clone)]
pub enum Frame {
    Software(Arc<SoftwareFrame>),
    Gpu(Arc<GpuFrame>),
}

pub enum FrameNotice {
    Frame(Frame),
    End,
    Failed(Failure),
}

struct Slot {
    latest: Option<Frame>,
    end: Option<FrameNotice>,
    stopped: bool,
}

pub struct FrameWatch {
    state: Mutex<Slot>,
    wake: Box<dyn Fn() + Send + Sync>,
}

impl FrameWatch {
    pub(super) fn new(wake: impl Fn() + Send + Sync + 'static) -> Self {
        Self {
            state: Mutex::new(Slot {
                latest: None,
                end: None,
                stopped: false,
            }),
            wake: Box::new(wake),
        }
    }

    pub(super) fn active(&self) -> bool {
        !self.state.lock().unwrap().stopped
    }

    pub(super) fn send(&self, frame: Frame) {
        let mut slot = self.state.lock().unwrap();
        if slot.stopped {
            return;
        }
        let wake = slot.latest.replace(frame).is_none();
        drop(slot);
        if wake {
            (self.wake)();
        }
    }

    pub(super) fn discard(&self) {
        self.state.lock().unwrap().latest = None;
    }

    pub(super) fn finish(&self, failure: Option<Failure>) {
        let mut slot = self.state.lock().unwrap();
        if slot.stopped {
            return;
        }
        slot.stopped = true;
        slot.latest = None;
        slot.end = Some(match failure {
            Some(reason) => FrameNotice::Failed(reason),
            None => FrameNotice::End,
        });
        drop(slot);
        (self.wake)();
    }

    pub fn next(&self) -> Option<FrameNotice> {
        let mut slot = self.state.lock().unwrap();
        slot.latest
            .take()
            .map(FrameNotice::Frame)
            .or_else(|| slot.end.take())
    }

    pub fn dispose(&self) {
        let mut slot = self.state.lock().unwrap();
        slot.stopped = true;
        slot.latest = None;
        slot.end = None;
    }
}
