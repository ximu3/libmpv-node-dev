use crate::client::{Operation, Value};
use std::ffi::CStr;

fn text(value: &Value) -> Option<&[u8]> {
    match value {
        Value::String(string) => Some(string.as_bytes()),
        _ => None,
    }
}
fn member<'a>(value: &'a Value, name: &[u8]) -> Option<&'a Value> {
    match value {
        Value::Map(entries) => entries
            .iter()
            .find(|(key, _)| key.as_bytes() == name)
            .map(|(_, value)| value),
        _ => None,
    }
}
pub(crate) fn compatible_vo(value: &Value) -> bool {
    if text(value) == Some(b"libmpv") {
        return true;
    }
    let Value::Array(entries) = value else {
        return false;
    };
    if let [driver] = entries.as_slice() {
        return text(driver) == Some(b"libmpv")
            || (member(driver, b"name").and_then(text) == Some(b"libmpv")
                && !matches!(member(driver, b"enabled"), Some(Value::Flag(false))));
    }
    false
}

fn vo_property(name: &[u8]) -> bool {
    let name = name
        .strip_prefix(b"options/")
        .or_else(|| name.strip_prefix(b"file-local-options/"))
        .unwrap_or(name);
    matches!(
        name,
        b"vo"
            | b"vo-add"
            | b"vo-append"
            | b"vo-clear"
            | b"vo-remove"
            | b"vo-set"
            | b"vo-pre"
            | b"vo-toggle"
    )
}

pub(crate) fn conflicting_option(name: &CStr, value: &Value) -> bool {
    let name = name.to_bytes();
    let name = name
        .strip_prefix(b"options/")
        .or_else(|| name.strip_prefix(b"file-local-options/"))
        .unwrap_or(name);
    vo_property(name) && !(matches!(name, b"vo" | b"vo-set") && compatible_vo(value))
}

pub(crate) fn conflict(operation: &Operation) -> bool {
    match operation {
        Operation::Set(name, value) => conflicting_option(name, value),
        Operation::Command(Value::Array(items)) => {
            let mut args = items.iter();
            let mut command = args.next().and_then(text);
            while matches!(
                command,
                Some(
                    b"no-osd"
                        | b"osd-auto"
                        | b"osd-msg"
                        | b"osd-bar"
                        | b"osd-msg-bar"
                        | b"raw"
                        | b"expand-properties"
                        | b"async"
                        | b"sync"
                        | b"repeatable"
                        | b"nonrepeatable"
                        | b"nonscalable"
                )
            ) {
                command = args.next().and_then(text);
            }
            if !args.next().and_then(text).is_some_and(vo_property) {
                return false;
            }
            match command {
                Some(b"set") => !args.next().is_some_and(compatible_vo),
                Some(b"change-list") => {
                    !(args.next().and_then(text) == Some(b"set")
                        && args.next().is_some_and(compatible_vo))
                }
                Some(b"add" | b"multiply" | b"cycle" | b"cycle-values" | b"del") => true,
                _ => false,
            }
        }
        Operation::Command(command @ Value::Map(_)) => {
            let property = member(command, b"property").or_else(|| member(command, b"option"));
            if !property.and_then(text).is_some_and(vo_property) {
                return false;
            }
            match member(command, b"name").and_then(text) {
                Some(b"set") => !member(command, b"value").is_some_and(compatible_vo),
                Some(
                    b"change-list" | b"add" | b"multiply" | b"cycle" | b"cycle-values" | b"del",
                ) => true,
                _ => false,
            }
        }
        _ => false,
    }
}
