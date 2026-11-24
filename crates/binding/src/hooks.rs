use crate::client::{NativeClient, NativeCreation, error};
use crate::events::Wake;
use crate::values;
use libmpv_core::client::{Hook, HookNotice};
use napi::bindgen_prelude::{BigInt, JsObjectValue, Object, PromiseRaw, Uint8Array};
use napi::threadsafe_function::ThreadsafeFunctionCallMode;
use napi::{Env, Error, Result};
use napi_derive::napi;
use std::sync::Arc;

#[napi]
pub struct NativeHook(Arc<Hook>);

#[napi]
impl NativeHook {
    #[napi]
    pub fn next<'a>(&self, env: &'a Env) -> Result<Option<Object<'a>>> {
        let Some(notice) = self.0.next() else {
            return Ok(None);
        };
        let mut item = Object::new(env)?;
        match notice {
            HookNotice::Run(token) => {
                item.set_named_property("kind", "run")?;
                item.set_named_property("token", BigInt::from(token))?;
            }
            HookNotice::End => item.set_named_property("kind", "end")?,
            HookNotice::Interrupted(reason) => {
                item.set_named_property("kind", "interrupted")?;
                item.set_named_property("reason", reason)?;
            }
        }
        Ok(Some(item))
    }

    #[napi]
    pub fn resume<'a>(&self, env: &'a Env, token: BigInt) -> Result<PromiseRaw<'a, Option<i32>>> {
        let hook = self.0.clone();
        let (_, token, exact) = token.get_u64();
        if !exact {
            return Err(Error::from_reason("Invalid hook token"));
        }
        env.spawn_future(async move {
            tokio::task::spawn_blocking(move || hook.resume(token).err())
                .await
                .map_err(|_| Error::from_reason("Hook continuation worker failed"))
        })
    }

    #[napi]
    pub fn dispose<'a>(&self, env: &'a Env) -> Result<PromiseRaw<'a, Vec<i32>>> {
        let hook = self.0.clone();
        env.spawn_future(async move { Ok(hook.dispose().await) })
    }
}

#[napi]
impl NativeClient {
    #[napi]
    pub fn add_hook<'a>(
        &self,
        env: &'a Env,
        name: Uint8Array,
        priority: i32,
        wake: Wake,
        creation: &NativeCreation,
    ) -> Result<PromiseRaw<'a, Object<'a>>> {
        let name = values::string(name)?;
        let client = self.client.clone();
        let creation = creation.0.clone();
        env.spawn_future_with_callback(
            async move {
                tokio::task::spawn_blocking(move || {
                    client.add_hook(&name, priority, &creation, move || {
                        wake.call((), ThreadsafeFunctionCallMode::NonBlocking);
                    })
                })
                .await
                .map_err(|_| Error::from_reason("Hook registration worker failed"))
            },
            |env, result| match result {
                Ok(hook) => {
                    let mut item = Object::new(env)?;
                    item.set_named_property("hook", NativeHook(Arc::new(hook)))?;
                    Ok(item)
                }
                Err(failure) => error(env, failure),
            },
        )
    }
}
