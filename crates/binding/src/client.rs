use crate::values;
use libmpv_core::Runtime;
use libmpv_core::client::{Client, Creation, Error as CallError, Failure, Operation};
use napi::Status;
use napi::bindgen_prelude::JsObjectValue;
use napi::bindgen_prelude::{BigInt, Object, PromiseRaw, Uint8Array};
use napi::threadsafe_function::ThreadsafeFunction;
use napi::{Env, Error, Result};
use napi_derive::napi;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

type KeepAlive = ThreadsafeFunction<(), (), (), Status, false>;

#[napi]
pub struct NativeCreation(pub(super) Arc<Creation>);

#[napi]
impl NativeCreation {
    #[napi(factory)]
    pub fn start() -> Self {
        Self(Arc::new(Creation::default()))
    }
    #[napi]
    pub fn abort(&self) -> bool {
        self.0.abort()
    }
}

#[napi]
pub struct NativeClient {
    pub(super) client: Arc<Client>,
    keep_alive: Arc<Mutex<Option<KeepAlive>>>,
    referenced: bool,
}

pub(super) fn error(env: &Env, failure: CallError) -> Result<Object<'_>> {
    let mut result = Object::new(env)?;
    match failure.reason {
        Failure::Native(code) => result.set_named_property("error", code)?,
        reason => result.set_named_property(
            "error",
            match reason {
                Failure::Native(_) => unreachable!(),
                Failure::UnsupportedCapability => "unsupportedCapability",
                Failure::RenderFailed => "renderFailed",
                Failure::RenderConflict => "renderConflict",
                Failure::Limit => "resourceLimit",
                Failure::Closed => "closed",
                Failure::Aborted => "ABORT_ERR",
                Failure::Creation => "resourceCreationFailed",
                Failure::UnsupportedFormat => "unsupportedFormat",
            },
        )?,
    }
    result.set_named_property("submitted", failure.submitted)?;
    Ok(result)
}

#[napi]
pub fn create_client_core<'a>(
    env: &'a Env,
    directory: String,
    options: Vec<(Uint8Array, Object<'_>)>,
    keep_alive: KeepAlive,
    creation: &NativeCreation,
    log_level: Option<String>,
    video: Option<crate::video::output::VideoRequest>,
) -> Result<PromiseRaw<'a, Object<'a>>> {
    let options = options
        .into_iter()
        .map(|(name, value)| Ok((values::string(name)?, values::read(value, 0)?)))
        .collect::<Result<_>>()?;
    let video = video
        .map(crate::video::output::VideoRequest::options)
        .transpose()?;
    let mut diagnostics =
        libmpv_core::client::Diagnostics::new(log_level.map(std::ffi::CString::new).transpose()?);
    let creation = creation.0.clone();
    let opening = crate::environment::Opening::begin(env)?;
    let keep_alive = Arc::new(Mutex::new(Some(keep_alive)));
    let stop = keep_alive.clone();
    env.spawn_future_with_callback(
        async move {
            tokio::task::spawn_blocking(move || {
                let runtime = Runtime::load(&PathBuf::from(directory))
                    .map_err(|_| Error::from_reason("Runtime pairing failed"))?;
                let result = Client::create(
                    runtime,
                    options,
                    &creation,
                    &mut diagnostics,
                    video,
                    move || {
                        stop.lock().unwrap().take();
                    },
                );
                if let Ok(client) = &result {
                    opening.register(client);
                }
                Ok((result, diagnostics))
            })
            .await
            .map_err(|_| Error::from_reason("Initialization worker failed"))?
        },
        move |env, (result, diagnostics)| {
            let mut response = match result {
                Ok(client) => {
                    let mut result = Object::new(env)?;
                    result.set_named_property(
                        "client",
                        NativeClient {
                            client: Arc::new(client),
                            keep_alive,
                            referenced: true,
                        },
                    )?;
                    result
                }
                Err(failure) => {
                    let mut result = error(
                        env,
                        CallError {
                            reason: failure.reason,
                            submitted: failure.submitted,
                        },
                    )?;
                    result.set_named_property("stage", failure.stage)?;
                    if let Some(index) = failure.index {
                        result.set_named_property("optionIndex", index as u32)?;
                    }
                    result
                }
            };
            if diagnostics.registered {
                let records = diagnostics
                    .records
                    .map(|record| crate::logs::write_log(env, record))
                    .collect::<Result<Vec<_>>>()?;
                response.set_named_property("logs", records)?;
            }
            Ok(response)
        },
    )
}

#[napi]
impl NativeClient {
    #[napi]
    pub fn create_child<'a>(
        &self,
        env: &'a Env,
        name: Option<Uint8Array>,
        creation: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let parent = self.client.clone();
        let name = name.map(values::string).transpose()?;
        let creation = creation.0.clone();
        env.spawn_future_with_callback(
            async move {
                tokio::task::spawn_blocking(move || parent.child(name.as_deref(), &creation))
                    .await
                    .map_err(|_| Error::from_reason("Client creation worker failed"))
            },
            |env, result| match result {
                Ok(client) => {
                    let mut result = Object::new(env)?;
                    result.set_named_property(
                        "client",
                        NativeClient {
                            client: Arc::new(client),
                            keep_alive: Arc::new(Mutex::new(None)),
                            referenced: false,
                        },
                    )?;
                    Ok(result)
                }
                Err(failure) => error(env, failure),
            },
        )
    }

    #[napi(getter)]
    pub fn has_ref(&self) -> bool {
        self.referenced && !self.client.is_closing()
    }

    #[napi]
    #[allow(
        deprecated,
        reason = "These methods change libuv keepalive, which is independent of Rust reference counts."
    )]
    pub fn set_referenced(&mut self, env: &Env, value: bool) -> Result<()> {
        if let Some(reference) = self.keep_alive.lock().unwrap().as_mut() {
            if value {
                reference.refer(env)?;
            } else {
                reference.unref(env)?;
            }
            self.referenced = value;
        }
        Ok(())
    }

    #[napi(getter)]
    pub fn client_name(&self) -> String {
        self.client.name.clone()
    }
    #[napi(getter)]
    pub fn client_id(&self) -> BigInt {
        self.client.id.into()
    }
    #[napi(getter)]
    pub fn closing(&self) -> bool {
        self.client.is_closing()
    }
    #[napi]
    pub fn time(&self) -> Option<BigInt> {
        self.client.time().ok().map(Into::into)
    }

    #[napi]
    pub fn begin_input<'a>(&self, env: &'a Env, id: u32) -> Result<Option<Object<'a>>> {
        match self.client.begin_input(id) {
            Ok(()) => Ok(None),
            Err(reason) => error(
                env,
                CallError {
                    reason,
                    submitted: false,
                },
            )
            .map(Some),
        }
    }
    #[napi]
    pub fn charge_input(&self, id: u32, bytes: i64) -> bool {
        usize::try_from(bytes).is_ok_and(|bytes| self.client.charge_input(id, bytes))
    }
    #[napi]
    pub fn release_input(&self, id: u32) {
        self.client.release_input(id)
    }
    #[napi]
    pub fn request<'a>(
        &self,
        env: &'a Env,
        id: u32,
        kind: String,
        name: Uint8Array,
        format: i32,
        value: Object<'_>,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let operation = match kind.as_str() {
            "command" => Operation::Command(values::read(value, 0)?),
            "getProperty" | "getPropertyText" => Operation::Get(values::string(name)?, format),
            "setProperty" => Operation::Set(values::string(name)?, values::read(value, 0)?),
            "loadConfigFile" => Operation::Config(values::string(name)?),
            _ => return Err(Error::from_reason("Invalid native operation")),
        };
        let reply = self.client.request(id, operation);
        env.spawn_future_with_callback(
            async move {
                Ok(match reply {
                    Ok(receiver) => receiver
                        .await
                        .map_err(|_| Error::from_reason("Lost native reply"))?,
                    Err(reason) => Err(CallError {
                        reason,
                        submitted: false,
                    }),
                })
            },
            |env, result| match result {
                Ok(value) => {
                    let mut result = Object::new(env)?;
                    result.set_named_property(
                        "node",
                        value.into_js(|node| values::write(env, node))?,
                    )?;
                    Ok(result)
                }
                Err(failure) => error(env, failure),
            },
        )
    }

    #[napi]
    pub fn abort(&self, id: u32) {
        self.client.abort(id);
    }

    #[napi]
    pub fn close<'a>(&self, env: &'a Env) -> Result<PromiseRaw<'a, ()>> {
        let done = self.client.close();
        env.spawn_future(async move {
            done.await
                .map_err(|_| Error::from_reason("Lost native shutdown"))
        })
    }
}
