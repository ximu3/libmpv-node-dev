use super::{CreateError, Failure};
use std::sync::Mutex;

pub struct Creation {
    state: Mutex<State>,
}

struct State {
    stage: &'static str,
    index: Option<usize>,
    submitted: bool,
    stopped: Option<CreateError>,
}

impl Default for Creation {
    fn default() -> Self {
        Self {
            state: Mutex::new(State {
                stage: "library",
                index: None,
                submitted: false,
                stopped: None,
            }),
        }
    }
}

impl Creation {
    pub fn abort(&self) -> bool {
        self.stop(Failure::Aborted).submitted
    }

    pub fn enter(&self, stage: &'static str, index: Option<usize>) -> Result<(), CreateError> {
        let mut state = self.state.lock().unwrap();
        if let Some(error) = state.stopped {
            return Err(error);
        }
        state.stage = stage;
        state.index = index;
        state.submitted = true;
        Ok(())
    }

    pub(super) fn stop(&self, reason: Failure) -> CreateError {
        let mut state = self.state.lock().unwrap();
        let error = CreateError {
            reason,
            stage: state.stage,
            index: state.index,
            submitted: state.submitted,
        };
        *state.stopped.get_or_insert(error)
    }
}
