use libmpv_core::{LoadError, Runtime};
use napi::{Env, Result, Task, bindgen_prelude::AsyncTask};
use napi_derive::napi;
use std::path::PathBuf;

pub struct LoadLibrary(PathBuf);

#[napi(object)]
pub struct LibraryVersion {
    pub major: u32,
    pub minor: u32,
}

#[napi(object)]
pub struct LoadResult {
    pub version: Option<LibraryVersion>,
    pub error: Option<String>,
}

impl Task for LoadLibrary {
    type Output = std::result::Result<(u16, u16), LoadError>;
    type JsValue = LoadResult;

    fn compute(&mut self) -> Result<Self::Output> {
        Ok(Runtime::load(&self.0).map(|runtime| runtime.version))
    }

    fn resolve(&mut self, _: Env, result: Self::Output) -> Result<Self::JsValue> {
        Ok(match result {
            Ok((major, minor)) => LoadResult {
                version: Some(LibraryVersion {
                    major: major.into(),
                    minor: minor.into(),
                }),
                error: None,
            },
            Err(error) => LoadResult {
                version: None,
                error: Some(
                    match error {
                        LoadError::LibraryLoadFailed => "libraryLoadFailed",
                        LoadError::IncompatibleLibrary => "incompatibleLibrary",
                    }
                    .into(),
                ),
            },
        })
    }
}

#[napi]
pub fn load_library(directory: String) -> AsyncTask<LoadLibrary> {
    AsyncTask::new(LoadLibrary(PathBuf::from(directory)))
}
