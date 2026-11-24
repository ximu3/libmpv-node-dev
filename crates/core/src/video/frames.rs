use super::render::{Configuration, FrameTiming};
use crate::client::Failure;
use std::sync::{Arc, Mutex};

pub struct SoftwareFrame {
    pub sequence: u64,
    pub configuration: Configuration,
    pub stride: u32,
    pub data: Vec<u8>,
    pub timing: FrameTiming,
}

pub enum FrameNotice {
    Frame(Arc<SoftwareFrame>),
    End,
    Failed(Failure),
}

struct Slot {
    latest: Option<Arc<SoftwareFrame>>,
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

    pub(super) fn send(&self, frame: Arc<SoftwareFrame>) {
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
