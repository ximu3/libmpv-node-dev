pub mod frame;
pub mod output;
use crate::client::{NativeCreation, error};
use libmpv_core::client::Error as CallError;
use libmpv_core::video::{DeviceSelection, devices};
use napi::bindgen_prelude::{BigInt, JsObjectValue, Object, PromiseRaw};
use napi::{Env, Error, Result};
use napi_derive::napi;

#[napi]
pub fn video_devices<'a>(
    env: &'a Env,
    creation: &NativeCreation,
) -> Result<PromiseRaw<'a, Object<'a>>> {
    let creation = creation.0.clone();
    env.spawn_future_with_callback(
        async move {
            tokio::task::spawn_blocking(move || {
                creation
                    .enter("devices", None)
                    .map_err(|failure| CallError {
                        reason: failure.reason,
                        submitted: failure.submitted,
                    })?;
                devices().map_err(|reason| CallError {
                    reason,
                    submitted: true,
                })
            })
            .await
            .map_err(|_| Error::from_reason("Video device enumeration worker failed"))
        },
        |env, result| match result {
            Err(failure) => error(env, failure),
            Ok(devices) => {
                let mut list = Vec::with_capacity(devices.len());
                for device in devices {
                    list.push(device_info(env, device)?);
                }
                let mut result = Object::new(env)?;
                result.set_named_property("devices", list)?;
                Ok(result)
            }
        },
    )
}

pub(super) fn device_info(env: &Env, device: libmpv_core::video::Device) -> Result<Object<'_>> {
    let mut item = Object::new(env)?;
    let mut selection = Object::new(env)?;
    let platform = match device.selection {
        DeviceSelection::Windows(luid) => {
            selection.set_named_property("adapterLuid", BigInt::from(luid))?;
            "win32"
        }
        DeviceSelection::Macos(renderer) => {
            selection.set_named_property("rendererId", renderer)?;
            "darwin"
        }
        DeviceSelection::Linux(node) => {
            selection.set_named_property("renderNode", node)?;
            "linux"
        }
    };
    selection.set_named_property("platform", platform)?;
    item.set_named_property("selection", selection)?;
    item.set_named_property("name", device.name)?;

    Ok(item)
}
