use crate::client::Failure;
use crate::ffi::{ClientMessage, EndFile, Event};
use std::ffi::CStr;

#[derive(Clone)]
pub enum EngineEvent {
    Simple(&'static str),
    Start(i64),
    End {
        reason: i32,
        error: i32,
        entry: i64,
        insert: i64,
        count: i32,
    },
    Message(Vec<Vec<u8>>),
}

impl EngineEvent {
    pub(super) fn size(&self) -> usize {
        match self {
            Self::Message(args) => args
                .iter()
                .map(|arg| arg.len() + size_of::<Vec<u8>>())
                .sum(),
            _ => size_of::<Self>(),
        }
    }

    pub(super) unsafe fn copy(event: &Event, budget: usize) -> Result<Self, Failure> {
        Ok(match event.id {
            1 => Self::Simple("shutdown"),
            6 => {
                // mpv_event_start_file holds the actual int64 playlist entry id.
                Self::Start(unsafe { *event.data.cast::<i64>() })
            }
            7 => {
                // The event reader owns this mpv_event_end_file until its next wait.
                let end = unsafe { &*event.data.cast::<EndFile>() };
                Self::End {
                    reason: end.reason,
                    error: end.error,
                    entry: end.playlist_entry_id,
                    insert: end.playlist_insert_id,
                    count: end.playlist_insert_num_entries,
                }
            }
            8 => Self::Simple("file-loaded"),
            11 => Self::Simple("idle"),
            14 => Self::Simple("tick"),
            16 => {
                // libmpv provides a counted array of NUL-terminated arguments for this event only.
                let message = unsafe { &*event.data.cast::<ClientMessage>() };
                let count = usize::try_from(message.num_args).map_err(|_| Failure::Limit)?;
                let mut remaining = budget
                    .checked_sub(count.saturating_mul(size_of::<Vec<u8>>()))
                    .ok_or(Failure::Limit)?;
                let mut args = Vec::with_capacity(count);
                for index in 0..count {
                    let bytes = unsafe { CStr::from_ptr(*message.args.add(index)) }.to_bytes();
                    remaining = remaining.checked_sub(bytes.len()).ok_or(Failure::Limit)?;
                    args.push(bytes.to_vec());
                }
                Self::Message(args)
            }
            17 => Self::Simple("video-reconfig"),
            18 => Self::Simple("audio-reconfig"),
            20 => Self::Simple("seek"),
            21 => Self::Simple("playback-restart"),
            _ => return Err(Failure::UnsupportedFormat),
        })
    }
}
