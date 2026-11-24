use crate::client::{NativeClient, NativeCreation, error};
use crate::events::Wake;
use libmpv_core::client::Error as CallError;
use libmpv_core::video::frames::{FrameNotice, FrameWatch};
use libmpv_core::video::render::{Configuration, Output, PixelFormat};
use napi::bindgen_prelude::{BigInt, JsObjectValue, Null, Object, PromiseRaw, Uint8Array};
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use napi::{Env, Error, Result};
use napi_derive::napi;
use std::sync::Arc;

#[napi(object)]
pub struct SoftwareConfiguration {
    pub width: u32,
    pub height: u32,
    pub pixel_format: String,
}

impl SoftwareConfiguration {
    pub(crate) fn config(self) -> Result<Configuration> {
        Ok(Configuration {
            width: self.width,
            height: self.height,
            format: PixelFormat::parse(&self.pixel_format)
                .ok_or_else(|| Error::from_reason("Invalid software pixel format"))?,
        })
    }
}
impl From<Configuration> for SoftwareConfiguration {
    fn from(value: Configuration) -> Self {
        Self {
            width: value.width,
            height: value.height,
            pixel_format: value.format.name().to_str().unwrap().to_owned(),
        }
    }
}

#[napi]
pub struct NativeSoftwareOutput(Arc<Output>);

#[napi]
impl NativeClient {
    #[napi(getter)]
    pub fn video_output(&self) -> Option<NativeSoftwareOutput> {
        self.client
            .output
            .as_ref()
            .map(|output| NativeSoftwareOutput(output.clone()))
    }
}

#[napi]
impl NativeSoftwareOutput {
    #[napi(getter)]
    pub fn configuration(&self) -> SoftwareConfiguration {
        self.0.configuration().into()
    }
    #[napi(getter)]
    pub fn closed(&self) -> bool {
        self.0.closed()
    }

    #[napi]
    pub fn configure<'a>(
        &self,
        env: &'a Env,
        config: SoftwareConfiguration,
        creation: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let reply = self.0.configure(config.config()?, creation.0.clone());
        env.spawn_future_with_callback(
            async move {
                Ok(match reply {
                    Ok(wait) => wait
                        .await
                        .map_err(|_| Error::from_reason("Lost render configuration reply"))?,
                    Err(reason) => Err(CallError {
                        reason,
                        submitted: false,
                    }),
                })
            },
            |env, reply| match reply {
                Ok(()) => {
                    let mut item = Object::new(env)?;
                    item.set_named_property("ok", true)?;
                    Ok(item)
                }
                Err(failure) => error(env, failure),
            },
        )
    }

    #[napi]
    pub fn observe<'a>(
        &self,
        env: &'a Env,
        wake: Wake,
        creation: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let output = self.0.clone();
        let creation = creation.0.clone();
        env.spawn_future_with_callback(
            async move {
                let result = creation
                    .enter("video", None)
                    .map_err(|failure| CallError {
                        reason: failure.reason,
                        submitted: failure.submitted,
                    })
                    .and_then(|()| {
                        output
                            .observe(move || {
                                wake.call((), ThreadsafeFunctionCallMode::NonBlocking);
                            })
                            .map_err(|reason| CallError {
                                reason,
                                submitted: false,
                            })
                    });
                Ok(result)
            },
            |env, result| match result {
                Ok(watch) => {
                    let mut item = Object::new(env)?;
                    item.set_named_property("watch", NativeFrameWatch(watch))?;
                    Ok(item)
                }
                Err(failure) => error(env, failure),
            },
        )
    }

    #[napi]
    pub fn report_swap(&self) -> bool {
        self.0.report_swap().is_ok()
    }
}

#[napi]
pub struct NativeFrameWatch(Arc<FrameWatch>);

#[napi]
impl NativeFrameWatch {
    #[napi]
    pub fn next<'a>(&self, env: &'a Env) -> Result<Option<Object<'a>>> {
        let Some(notice) = self.0.next() else {
            return Ok(None);
        };
        let mut item = Object::new(env)?;
        match notice {
            FrameNotice::End => item.set_named_property("kind", "end")?,
            FrameNotice::Failed(reason) => {
                item.set_named_property("kind", "error")?;
                item.set_named_property(
                    "failure",
                    error(
                        env,
                        CallError {
                            reason,
                            submitted: true,
                        },
                    )?,
                )?;
            }
            FrameNotice::Frame(frame) => {
                let mut image = Object::new(env)?;
                image.set_named_property("sequence", BigInt::from(frame.sequence))?;
                image.set_named_property("width", frame.configuration.width)?;
                image.set_named_property("height", frame.configuration.height)?;
                image.set_named_property("stride", frame.stride)?;
                image.set_named_property(
                    "pixelFormat",
                    frame.configuration.format.name().to_str().unwrap(),
                )?;
                if let Some(time) = frame.timing.target {
                    image.set_named_property("targetTimeNs", BigInt::from(time))?;
                } else {
                    image.set_named_property("targetTimeNs", Null)?;
                }
                image.set_named_property("redraw", frame.timing.flags & 2 != 0)?;
                image.set_named_property("repeat", frame.timing.flags & 4 != 0)?;
                image.set_named_property("blockVsync", frame.timing.flags & 8 != 0)?;
                let bytes = Arc::try_unwrap(frame)
                    .map(|value| value.data)
                    .unwrap_or_else(|shared| shared.data.clone());
                image.set_named_property("data", Uint8Array::new(bytes))?;
                item.set_named_property("value", image)?;
                item.set_named_property("kind", "value")?;
            }
        }
        Ok(Some(item))
    }
    #[napi]
    pub fn dispose(&self) {
        self.0.dispose();
    }
}
