use crate::{
    client::{NativeClient, NativeCreation, error},
    values,
};
use libmpv_core::client::{EngineEvent, Notice, Selection, Watch};
use napi::bindgen_prelude::{BigInt, JsObjectValue, Object, PromiseRaw, Uint8Array};
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi::{Env, Error, Result, Status};
use napi_derive::napi;
use std::sync::Arc;

type Wake = ThreadsafeFunction<(), (), (), Status, false, true, 1>;

#[napi]
pub struct NativeWatch(Arc<Watch>);

#[napi]
impl NativeWatch {
    #[napi]
    pub fn next<'a>(&self, env: &'a Env) -> Result<Option<Object<'a>>> {
        let Some(notice) = self.0.next() else {
            return Ok(None);
        };
        let mut item = Object::new(env)?;
        let kind = match notice {
            Notice::Value(value) => {
                item.set_named_property("value", values::write(env, Arc::unwrap_or_clone(value))?)?;
                "value"
            }
            Notice::Event(event) => {
                item.set_named_property("value", event_record(env, Arc::unwrap_or_clone(event))?)?;
                "value"
            }
            Notice::Log(record) => {
                item.set_named_property("value", crate::logs::write_log(env, record)?)?;
                "value"
            }
            Notice::Unavailable => "unavailable",
            Notice::End => "end",
            Notice::Interrupted(reason) => {
                item.set_named_property("reason", reason)?;
                "interrupted"
            }
            Notice::Error(reason) => {
                item.set_named_property(
                    "failure",
                    error(
                        env,
                        libmpv_core::client::Error {
                            reason,
                            submitted: true,
                        },
                    )?,
                )?;
                "error"
            }
        };
        item.set_named_property("kind", kind)?;
        Ok(Some(item))
    }

    #[napi]
    pub fn dispose<'a>(&self, env: &'a Env) -> Result<PromiseRaw<'a, ()>> {
        let watch = self.0.clone();
        env.spawn_future(async move {
            tokio::task::spawn_blocking(move || watch.dispose())
                .await
                .map_err(|_| Error::from_reason("Subscription cleanup failed"))
        })
    }
}

#[napi]
impl NativeClient {
    #[napi]
    pub fn observe_logs<'a>(
        &self,
        env: &'a Env,
        level: String,
        wake: Wake,
        gate: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let level = std::ffi::CString::new(level)?;
        let client = self.client.clone();
        let creation = gate.0.clone();
        env.spawn_future_with_callback(
            async move {
                tokio::task::spawn_blocking(move || {
                    client.observe_logs(level, &creation, move || {
                        wake.call((), ThreadsafeFunctionCallMode::NonBlocking);
                    })
                })
                .await
                .map_err(|_| Error::from_reason("Log registration worker failed"))
            },
            |env, result| match result {
                Ok(watch) => {
                    let mut item = Object::new(env)?;
                    item.set_named_property("watch", NativeWatch(Arc::new(watch)))?;
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
        name: Option<Uint8Array>,
        format: i32,
        events: Vec<i32>,
        wake: Wake,
        gate: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let selection = match name {
            Some(name) => Selection::Property(values::string(name)?, format),
            None => Selection::Events(events),
        };
        let client = self.client.clone();
        let creation = gate.0.clone();
        env.spawn_future_with_callback(
            async move {
                tokio::task::spawn_blocking(move || {
                    client.observe(selection, &creation, move || {
                        wake.call((), ThreadsafeFunctionCallMode::NonBlocking);
                    })
                })
                .await
                .map_err(|_| Error::from_reason("Subscription worker failed"))
            },
            |env, result| match result {
                Ok(watch) => {
                    let mut value = Object::new(env)?;
                    value.set_named_property("watch", NativeWatch(Arc::new(watch)))?;
                    Ok(value)
                }
                Err(failure) => error(env, failure),
            },
        )
    }
}

fn event_record(env: &Env, event: EngineEvent) -> Result<Object<'_>> {
    let mut record = Object::new(env)?;
    let name = match event {
        EngineEvent::Simple(name) => name,
        EngineEvent::Start(entry) => {
            record.set_named_property("playlistEntryId", BigInt::from(entry))?;
            "start-file"
        }
        EngineEvent::End {
            reason,
            error,
            entry,
            insert,
            count,
        } => {
            let name = match reason {
                0 => "eof",
                2 => "stop",
                3 => "quit",
                4 => "error",
                5 => "redirect",
                _ => "unknown",
            };
            record.set_named_property("reason", name)?;
            record.set_named_property("reasonCode", reason)?;
            record.set_named_property("errorCode", error)?;
            record.set_named_property("playlistEntryId", BigInt::from(entry))?;
            record.set_named_property("playlistInsertId", BigInt::from(insert))?;
            record.set_named_property("playlistInsertCount", count)?;
            "end-file"
        }
        EngineEvent::Message(args) => {
            record.set_named_property(
                "args",
                args.into_iter().map(Uint8Array::new).collect::<Vec<_>>(),
            )?;
            "client-message"
        }
    };
    record.set_named_property("type", name)?;
    Ok(record)
}
