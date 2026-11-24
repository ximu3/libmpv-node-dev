use libmpv_core::client::logs::LogRecord;
use napi::bindgen_prelude::{BigInt, JsObjectValue, Null, Object, Uint8Array};
use napi::{Env, Error, Result};

pub fn write_log(env: &Env, record: LogRecord) -> Result<Object<'_>> {
    let mut item = Object::new(env)?;
    match record {
        LogRecord::Message(log) => {
            let level = match log.level {
                10 => "fatal",
                20 => "error",
                30 => "warn",
                40 => "info",
                50 => "v",
                60 => "debug",
                70 => "trace",
                _ => return Err(Error::from_reason("Unsupported native log level")),
            };
            item.set_named_property("type", "log-message")?;
            item.set_named_property("level", level)?;
            item.set_named_property("levelCode", log.level)?;
            item.set_named_property("prefix", Uint8Array::new(log.prefix))?;
            item.set_named_property("text", Uint8Array::new(log.text))?;
        }
        LogRecord::Gap { native, dropped } => {
            item.set_named_property("type", "gap")?;
            if native {
                let sources = if dropped == 0 {
                    vec!["mpv"]
                } else {
                    vec!["mpv", "binding"]
                };
                item.set_named_property("sources", sources)?;
                item.set_named_property("droppedCount", Null)?;
            } else {
                item.set_named_property("sources", vec!["binding"])?;
                item.set_named_property("droppedCount", BigInt::from(dropped))?;
            }
        }
    }
    Ok(item)
}
