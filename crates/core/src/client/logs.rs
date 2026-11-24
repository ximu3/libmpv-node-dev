use crate::ffi::LogMessage;
use std::collections::VecDeque;
use std::ffi::CStr;

const RECORDS: usize = 256;
const BYTES: usize = 2 * 1024 * 1024;

pub struct Log {
    pub prefix: Vec<u8>,
    pub text: Vec<u8>,
    pub level: i32,
}

pub enum LogRecord {
    Message(Log),
    Gap { native: bool, dropped: u64 },
}

#[derive(Default)]
pub struct LogBuffer {
    entries: VecDeque<Log>,
    bytes: usize,
    dropped: u64,
    native_gap: bool,
}

impl LogBuffer {
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty() && self.dropped == 0 && !self.native_gap
    }

    pub(crate) unsafe fn copy(&mut self, message: &LogMessage) {
        // A log event's C strings stay live until the event owner waits again.
        let prefix = unsafe { CStr::from_ptr(message.prefix) }.to_bytes();
        if prefix == b"overflow" {
            self.native_gap = true;
            return;
        }
        let text = unsafe { CStr::from_ptr(message.text) }.to_bytes();
        let size = prefix.len().saturating_add(text.len());
        if size > BYTES {
            self.dropped += 1;
            return;
        }
        while self.entries.len() >= RECORDS || self.bytes + size > BYTES {
            let entry = self.entries.pop_front().unwrap();
            self.bytes -= entry.prefix.len() + entry.text.len();
            self.dropped += 1;
        }
        self.entries.push_back(Log {
            prefix: prefix.to_vec(),
            text: text.to_vec(),
            level: message.level_code,
        });
        self.bytes += size;
    }
}

impl Iterator for LogBuffer {
    type Item = LogRecord;

    fn next(&mut self) -> Option<Self::Item> {
        if self.native_gap || self.dropped != 0 {
            return Some(LogRecord::Gap {
                native: std::mem::take(&mut self.native_gap),
                dropped: std::mem::take(&mut self.dropped),
            });
        }
        let entry = self.entries.pop_front()?;
        self.bytes -= entry.prefix.len() + entry.text.len();
        Some(LogRecord::Message(entry))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reports_both_sources_of_loss_before_retained_lines() {
        let mut buffer = LogBuffer::default();
        let mut message = LogMessage {
            prefix: c"test".as_ptr(),
            level: c"info".as_ptr(),
            text: c"line".as_ptr(),
            level_code: 40,
        };
        for _ in 0..=RECORDS {
            // The fixture owns all three static C strings.
            unsafe { buffer.copy(&message) };
        }
        message.prefix = c"overflow".as_ptr();
        unsafe { buffer.copy(&message) };
        assert!(matches!(
            buffer.next(),
            Some(LogRecord::Gap {
                native: true,
                dropped: 1
            })
        ));
        assert_eq!(buffer.count(), RECORDS);
    }
}
