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

pub(crate) const GPU_OPTIONS: &[(&CStr, &CStr)] = &[
    (c"target-trc", c"srgb"),
    (c"target-peak", c"auto"),
    (c"treat-srgb-as-power22", c"no"),
    (c"icc-profile", c""),
    (c"icc-profile-auto", c"no"),
    (c"background", c"color"),
];
const COMMON: &[&CStr] = &[c"vo", c"wid"];
const GPU: &[&CStr] = &[
    c"target-prim",
    c"target-trc",
    c"target-peak",
    c"treat-srgb-as-power22",
    c"icc-profile",
    c"icc-profile-auto",
    c"background",
    c"background-color",
    c"gpu-api",
    c"gpu-context",
    #[cfg(unix)]
    c"opengl-es",
];
pub(crate) fn observed(gpu: bool) -> impl Iterator<Item = &'static CStr> {
    COMMON.iter().chain(if gpu { GPU } else { &[] }).copied()
}
pub(crate) fn observer_id(index: usize) -> u64 {
    u64::MAX - 1 - index as u64
}
pub(crate) fn observer_name(id: u64) -> Option<&'static CStr> {
    observed(true).nth(usize::try_from(u64::MAX.checked_sub(1)?.checked_sub(id)?).ok()?)
}

fn property(name: &[u8]) -> &[u8] {
    name.strip_prefix(b"options/")
        .or_else(|| name.strip_prefix(b"file-local-options/"))
        .unwrap_or(name)
}
fn selector(value: &Value, api: bool) -> bool {
    let accepted = |name: &[u8]| {
        name.is_empty()
            || name == b"auto"
            || (cfg!(windows) && name == b"d3d11")
            || (api && cfg!(unix) && name == b"opengl")
    };
    let entry = |v: &Value| {
        if matches!(member(v, b"enabled"), Some(Value::Flag(false))) {
            return true;
        }
        text(v)
            .or_else(|| member(v, b"name").and_then(text))
            .is_some_and(accepted)
    };
    match value {
        Value::Array(list) => list.iter().all(entry),
        Value::String(s) => s.as_bytes().split(|b| *b == b',').all(accepted),
        _ => false,
    }
}

fn gpu_selector(name: &[u8]) -> Option<(bool, &[u8])> {
    for (base, api) in [
        (b"gpu-api".as_slice(), true),
        (b"gpu-context".as_slice(), false),
    ] {
        if let Some(action) = name.strip_prefix(base)
            && matches!(
                action,
                b"" | b"-set"
                    | b"-add"
                    | b"-append"
                    | b"-pre"
                    | b"-del"
                    | b"-remove"
                    | b"-clr"
                    | b"-clear"
                    | b"-toggle"
            )
        {
            return Some((api, action));
        }
    }
    None
}
fn vo_property(name: &[u8]) -> bool {
    matches!(
        name,
        b"vo"
            | b"vo-add"
            | b"vo-append"
            | b"vo-clear"
            | b"vo-clr"
            | b"vo-del"
            | b"vo-remove"
            | b"vo-set"
            | b"vo-pre"
            | b"vo-toggle"
    )
}
fn opaque(value: &Value) -> bool {
    let Some(name) = text(value).and_then(|bytes| std::str::from_utf8(bytes).ok()) else {
        return false;
    };
    if let Some(hex) = name.strip_prefix('#') {
        return hex.len() == 6
            || (hex.len() == 8 && hex.get(..2).is_some_and(|a| a.eq_ignore_ascii_case("ff")));
    }
    let parts: Vec<_> = name.split('/').collect();
    match parts.as_slice() {
        [_] | [_, _, _] => true,
        [_, alpha] | [_, _, _, alpha] => alpha
            .parse::<f64>()
            .is_ok_and(|a| (a * 255.0).round() == 255.0),
        _ => false,
    }
}

pub(crate) fn compatible(
    name: &[u8],
    value: &Value,
    color: Option<super::gpu::ColorSpace>,
) -> bool {
    let name = property(name);
    if vo_property(name) {
        return matches!(name, b"vo" | b"vo-set") && compatible_vo(value);
    }
    if name == b"wid" {
        return matches!(value, Value::Integer(-1)) || text(value) == Some(b"-1");
    }
    let Some(color) = color else { return true };
    if let Some((api, action)) = gpu_selector(name) {
        return match action {
            b"-clr" | b"-clear" | b"-del" | b"-remove" => true,
            _ => selector(value, api),
        };
    }
    match name {
        #[cfg(unix)]
        b"opengl-es" => {
            text(value) == Some(b"auto")
                || if cfg!(target_os = "linux") {
                    matches!(value, Value::Flag(true)) || text(value) == Some(b"yes")
                } else {
                    matches!(value, Value::Flag(false)) || text(value) == Some(b"no")
                }
        }
        b"target-prim" => text(value) == Some(color.primaries().to_bytes()),
        b"target-trc" => text(value) == Some(b"srgb"),
        b"target-peak" => {
            text(value) == Some(b"auto") || matches!(value,Value::Double(v) if *v==0.0)
        }
        b"icc-profile" => text(value) == Some(b""),
        b"icc-profile-auto" | b"treat-srgb-as-power22" => {
            matches!(value, Value::Flag(false)) || text(value) == Some(b"no")
        }
        b"background" => text(value) == Some(b"color"),
        b"background-color" => opaque(value),
        _ => true,
    }
}
fn reserved(name: &[u8], gpu: bool) -> bool {
    let name = property(name);
    vo_property(name)
        || (gpu && gpu_selector(name).is_some())
        || observed(gpu).any(|key| key.to_bytes() == name)
}

pub(crate) fn conflict(operation: &Operation, color: Option<super::gpu::ColorSpace>) -> bool {
    match operation {
        Operation::Set(name, value) => !compatible(name.to_bytes(), value, color),
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
            let Some(name) = args
                .next()
                .and_then(text)
                .filter(|name| reserved(name, color.is_some()))
            else {
                return false;
            };
            match command {
                Some(b"set") => !args
                    .next()
                    .is_some_and(|value| compatible(name, value, color)),
                Some(b"change-list") => {
                    !(args.next().and_then(text) == Some(b"set")
                        && args
                            .next()
                            .is_some_and(|value| compatible(name, value, color)))
                }
                Some(b"add" | b"multiply" | b"cycle" | b"cycle-values" | b"del") => true,
                _ => false,
            }
        }
        Operation::Command(command @ Value::Map(_)) => {
            let Some(kind) = member(command, b"_name").and_then(text) else {
                return false;
            };
            let Some(name) = member(command, b"name")
                .and_then(text)
                .filter(|name| reserved(name, color.is_some()))
            else {
                return false;
            };
            match kind {
                b"set" => {
                    !member(command, b"value").is_some_and(|value| compatible(name, value, color))
                }
                b"change-list" => {
                    !(member(command, b"operation").and_then(text) == Some(b"set")
                        && member(command, b"value")
                            .is_some_and(|value| compatible(name, value, color)))
                }
                b"add" | b"multiply" | b"cycle" | b"del" => true,
                _ => false,
            }
        }
        _ => false,
    }
}
