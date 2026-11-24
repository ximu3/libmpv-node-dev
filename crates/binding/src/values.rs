use libmpv_core::client::Value;
use napi::bindgen_prelude::JsObjectValue;
use napi::bindgen_prelude::{BigInt, Object, Uint8Array};
use napi::{Env, Error, Result};
use std::ffi::CString;

pub fn string(bytes: Uint8Array) -> Result<CString> {
    CString::new(bytes.to_vec()).map_err(|_| Error::from_reason("Invalid C string"))
}

pub fn read(node: Object<'_>, depth: usize) -> Result<Value> {
    if depth > 128 {
        return Err(Error::from_reason("Input exceeds the node depth limit"));
    }
    let format: String = node.get_named_property("format")?;
    Ok(match format.as_str() {
        "none" => Value::None,
        "flag" => Value::Flag(node.get_named_property("value")?),
        "double" => Value::Double(node.get_named_property("value")?),
        "int64" => {
            let (value, lossless) = node.get_named_property::<BigInt>("value")?.get_i64();
            if !lossless {
                return Err(Error::from_reason("Invalid int64"));
            }
            Value::Integer(value)
        }
        "string" => Value::String(string(node.get_named_property("value")?)?),
        "byteArray" => Value::Bytes(node.get_named_property::<Uint8Array>("value")?.to_vec()),
        "array" => Value::Array(
            node.get_named_property::<Vec<Object>>("value")?
                .into_iter()
                .map(|item| read(item, depth + 1))
                .collect::<Result<_>>()?,
        ),
        "map" => Value::Map(
            node.get_named_property::<Vec<(Uint8Array, Object)>>("value")?
                .into_iter()
                .map(|(key, item)| Ok((string(key)?, read(item, depth + 1)?)))
                .collect::<Result<_>>()?,
        ),
        _ => return Err(Error::from_reason("Unknown input format")),
    })
}

pub fn write(env: &Env, value: Value) -> Result<Object<'_>> {
    let mut node = Object::new(env)?;
    let format = match value {
        Value::None => "none",
        Value::Flag(flag) => {
            node.set_named_property("value", flag)?;
            "flag"
        }
        Value::Integer(integer) => {
            node.set_named_property("value", BigInt::from(integer))?;
            "int64"
        }
        Value::Double(number) => {
            node.set_named_property("value", number)?;
            "double"
        }
        Value::String(text) => {
            node.set_named_property("value", Uint8Array::new(text.into_bytes()))?;
            "string"
        }
        Value::Bytes(bytes) => {
            node.set_named_property("value", Uint8Array::new(bytes))?;
            "byteArray"
        }
        Value::Array(values) => {
            let items = values
                .into_iter()
                .map(|item| write(env, item))
                .collect::<Result<Vec<_>>>()?;
            node.set_named_property("value", items)?;
            "array"
        }
        Value::Map(values) => {
            let entries = values
                .into_iter()
                .map(|(key, item)| Ok((Uint8Array::new(key.into_bytes()), write(env, item)?)))
                .collect::<Result<Vec<_>>>()?;
            node.set_named_property("value", entries)?;
            "map"
        }
    };
    node.set_named_property("format", format)?;
    Ok(node)
}
