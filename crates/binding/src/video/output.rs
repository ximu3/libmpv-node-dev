use crate::client::{NativeClient, NativeCreation, error};
use crate::events::Wake;
use libmpv_core::client::Error as CallError;
use libmpv_core::video::frames::{FrameNotice, FrameWatch};
use libmpv_core::video::gpu::{ColorSpace, GpuConfiguration, GpuOptions};
use libmpv_core::video::render::{Configuration, Options, Output};
use libmpv_core::video::{DeviceSelection, software};
use napi::bindgen_prelude::{BigInt, JsObjectValue, Object, PromiseRaw};
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use napi::{Env, Error, Result};
use napi_derive::napi;
use std::sync::Arc;

#[napi(object)]
pub struct VideoRequest {
    pub width: u32,
    pub height: u32,
    pub pixel_format: Option<String>,
    pub color_space: Option<String>,
    pub capacity: Option<u32>,
    pub adapter_luid: Option<BigInt>,
    pub renderer_id: Option<u32>,
    pub render_node: Option<String>,
}
impl VideoRequest {
    fn configuration(&self) -> Result<Configuration> {
        if let Some(format) = &self.pixel_format {
            return Ok(Configuration::Software(software::Configuration {
                width: self.width,
                height: self.height,
                format: software::PixelFormat::parse(format)
                    .ok_or_else(|| Error::from_reason("Invalid pixel format"))?,
            }));
        }
        let color = match self.color_space.as_deref() {
            Some("srgb") => ColorSpace::Srgb,
            Some("display-p3") => ColorSpace::DisplayP3,
            _ => return Err(Error::from_reason("Invalid SDR target")),
        };
        Ok(Configuration::Gpu(GpuConfiguration {
            width: self.width,
            height: self.height,
            color,
        }))
    }
    pub(crate) fn options(self) -> Result<Options> {
        match self.configuration()? {
            Configuration::Software(config) => Ok(Options::Software(config)),
            Configuration::Gpu(config) => {
                let device = if let Some(value) = self.adapter_luid {
                    let (negative, luid, exact) = value.get_u64();
                    if negative || !exact {
                        return Err(Error::from_reason("Invalid adapter LUID"));
                    }
                    Some(DeviceSelection::Windows(luid))
                } else if let Some(id) = self.renderer_id {
                    Some(DeviceSelection::Macos(id))
                } else {
                    self.render_node.map(DeviceSelection::Linux)
                };
                Ok(Options::Gpu(GpuOptions {
                    config,
                    device,
                    capacity: self.capacity.unwrap_or(3),
                }))
            }
        }
    }
}
#[napi]
pub struct NativeVideoOutput(Arc<Output>);

#[napi]
impl NativeClient {
    #[napi(getter)]
    pub fn video_output(&self) -> Option<NativeVideoOutput> {
        self.client
            .output
            .as_ref()
            .map(|output| NativeVideoOutput(output.clone()))
    }
}

#[napi]
impl NativeVideoOutput {
    #[napi(getter)]
    pub fn configuration<'a>(&self, env: &'a Env) -> Result<Object<'a>> {
        let mut item = Object::new(env)?;
        match self.0.configuration() {
            Configuration::Software(config) => {
                item.set_named_property("width", config.width)?;
                item.set_named_property("height", config.height)?;
                item.set_named_property("pixelFormat", config.format.name().to_str().unwrap())?;
            }
            Configuration::Gpu(config) => {
                item.set_named_property("width", config.width)?;
                item.set_named_property("height", config.height)?;
                let mut target = Object::new(env)?;
                target.set_named_property("colorSpace", config.color.name())?;
                item.set_named_property("target", target)?;
            }
        }
        Ok(item)
    }
    #[napi(getter)]
    pub fn renderer(&self) -> &'static str {
        match self.0.configuration() {
            Configuration::Software(_) => "software",
            Configuration::Gpu(_) => "gpu",
        }
    }
    #[napi(getter)]
    pub fn device<'a>(&self, env: &'a Env) -> Result<Option<Object<'a>>> {
        self.0
            .device()
            .cloned()
            .map(|device| super::device_info(env, device))
            .transpose()
    }
    #[napi(getter)]
    pub fn frame_capacity(&self) -> u32 {
        self.0.capacity
    }
    #[napi(getter)]
    pub fn closed(&self) -> bool {
        self.0.closed()
    }

    #[napi]
    pub fn configure<'a>(
        &self,
        env: &'a Env,
        config: VideoRequest,
        creation: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let reply = self
            .0
            .configure(config.configuration()?, creation.0.clone());
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
                item.set_named_property("value", super::frame::image(env, frame)?)?;
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
