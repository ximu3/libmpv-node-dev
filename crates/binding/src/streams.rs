use crate::client::{NativeClient, error};
use crate::events::Wake;
use crate::values;
use libmpv_core::client::streams::{Protocol, StreamAction, StreamReply, StreamWork};
use napi::bindgen_prelude::{BigInt, JsObjectValue, Object, PromiseRaw, Uint8Array};
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use napi::{Env, Error, Result};
use napi_derive::napi;
use std::sync::Arc;

#[napi]
pub struct NativeProtocol(Arc<Protocol>);

#[napi(object)]
pub struct ProviderReply {
    pub kind: String,
    pub bytes: Option<Uint8Array>,
    pub number: Option<BigInt>,
    pub seek: Option<bool>,
    pub size: Option<bool>,
}

fn id(value: BigInt) -> Result<u64> {
    let (negative, id, exact) = value.get_u64();
    if negative || !exact {
        return Err(Error::from_reason("Invalid native stream id"));
    }
    Ok(id)
}

#[napi]
impl NativeProtocol {
    #[napi]
    pub fn next<'a>(&self, env: &'a Env) -> Result<Option<Object<'a>>> {
        let Some(action) = self.0.next() else {
            return Ok(None);
        };
        let mut item = Object::new(env)?;
        let kind = match action {
            StreamAction::Work { stream, job, work } => {
                item.set_named_property("stream", BigInt::from(stream))?;
                item.set_named_property("job", BigInt::from(job))?;
                match work {
                    StreamWork::Open(uri) => {
                        item.set_named_property("uri", Uint8Array::new(uri))?;
                        "open"
                    }
                    StreamWork::Limit => "limit",
                    StreamWork::Read(max) => {
                        item.set_named_property("max", max as u32)?;
                        "read"
                    }
                    StreamWork::Seek(offset) => {
                        item.set_named_property("offset", BigInt::from(offset))?;
                        "seek"
                    }
                    StreamWork::Size => "getSize",
                }
            }
            StreamAction::Cancel(stream) => {
                item.set_named_property("stream", BigInt::from(stream))?;
                "cancel"
            }
            StreamAction::Close(stream) => {
                item.set_named_property("stream", BigInt::from(stream))?;
                "close"
            }
            StreamAction::Shutdown => "shutdown",
            StreamAction::End => "end",
        };
        item.set_named_property("kind", kind)?;
        Ok(Some(item))
    }

    #[napi]
    pub fn reply(&self, stream: BigInt, job: BigInt, reply: ProviderReply) -> Result<()> {
        let reply = match reply.kind.as_str() {
            "open" => StreamReply::Open {
                seek: reply.seek.unwrap_or(false),
                size: reply.size.unwrap_or(false),
            },
            "bytes" => StreamReply::Bytes(
                reply
                    .bytes
                    .ok_or_else(|| Error::from_reason("Missing stream bytes"))?
                    .to_vec(),
            ),
            "size" => {
                let (size, exact) = reply
                    .number
                    .ok_or_else(|| Error::from_reason("Missing stream size"))?
                    .get_i64();
                if size < 0 || !exact {
                    return Err(Error::from_reason("Invalid stream size"));
                }
                StreamReply::Size(size)
            }
            "ok" => StreamReply::Ok,
            "eof" => StreamReply::Eof,
            "unknown" => StreamReply::Unknown,
            "failed" => StreamReply::Failed,
            _ => return Err(Error::from_reason("Invalid stream reply")),
        };
        self.0.reply(id(stream)?, id(job)?, reply);
        Ok(())
    }

    #[napi]
    pub fn finished(&self, stream: BigInt) -> Result<()> {
        self.0.finished(id(stream)?);
        Ok(())
    }
}

#[napi]
impl NativeClient {
    #[napi]
    pub fn register_protocol<'a>(
        &self,
        env: &'a Env,
        name: Uint8Array,
        wake: Wake,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let name = values::string(name)?;
        let client = self.client.clone();
        env.spawn_future_with_callback(
            async move {
                tokio::task::spawn_blocking(move || {
                    client.register_protocol(&name, move || {
                        wake.call((), ThreadsafeFunctionCallMode::NonBlocking);
                    })
                })
                .await
                .map_err(|_| Error::from_reason("Stream registration worker failed"))
            },
            |env, result| match result {
                Ok(protocol) => {
                    let mut item = Object::new(env)?;
                    item.set_named_property("protocol", NativeProtocol(protocol))?;
                    Ok(item)
                }
                Err(failure) => error(env, failure),
            },
        )
    }
}
