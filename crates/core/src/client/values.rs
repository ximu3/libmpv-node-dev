use super::Failure;
use crate::ffi::{ByteArray, Node, NodeData, NodeList};
use std::ffi::{CStr, CString, c_char, c_void};
use std::mem::size_of;
use std::ptr;
use std::slice;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    None,
    Flag(bool),
    Integer(i64),
    Double(f64),
    String(CString),
    Bytes(Vec<u8>),
    Array(Vec<Value>),
    Map(Vec<(CString, Value)>),
}

impl Value {
    pub fn size(&self) -> usize {
        let content = match self {
            Self::String(text) => text.as_bytes_with_nul().len(),
            Self::Bytes(bytes) => bytes.len(),
            Self::Array(items) => items
                .iter()
                .fold(0usize, |sum, item| sum.saturating_add(item.size())),
            Self::Map(entries) => entries.iter().fold(0usize, |sum, (key, item)| {
                sum.saturating_add(key.as_bytes_with_nul().len())
                    .saturating_add(item.size())
            }),
            _ => 0,
        };
        size_of::<Self>().saturating_add(content)
    }
}

#[allow(
    clippy::vec_box,
    reason = "C nodes point into individually allocated lists and byte descriptors while the vectors grow."
)]
pub struct NodeInput {
    pub node: Node,
    lists: Vec<Box<NodeList>>,
    bytes: Vec<Box<ByteArray>>,
    arrays: Vec<Vec<Node>>,
    keys: Vec<Vec<*mut c_char>>,
}

impl NodeInput {
    pub fn with<T>(value: &Value, submit: impl FnOnce(&mut Node) -> T) -> T {
        let mut input = Self {
            node: Node {
                format: 0,
                data: NodeData { integer: 0 },
            },
            lists: Vec::new(),
            bytes: Vec::new(),
            arrays: Vec::new(),
            keys: Vec::new(),
        };
        input.node = input.encode(value);
        submit(&mut input.node)
    }

    fn encode(&mut self, value: &Value) -> Node {
        let (format, data) = match value {
            Value::None => (0, NodeData { integer: 0 }),
            Value::String(value) => (
                1,
                NodeData {
                    string: value.as_ptr().cast_mut(),
                },
            ),
            Value::Flag(value) => (
                3,
                NodeData {
                    flag: i32::from(*value),
                },
            ),
            Value::Integer(value) => (4, NodeData { integer: *value }),
            Value::Double(value) => (5, NodeData { double: *value }),
            Value::Array(items) => {
                let values = items.iter().map(|item| self.encode(item)).collect();
                (7, self.list(values, ptr::null_mut()))
            }
            Value::Map(entries) => {
                self.keys.push(
                    entries
                        .iter()
                        .map(|(key, _)| key.as_ptr().cast_mut())
                        .collect(),
                );
                let keys = self.keys.last_mut().unwrap().as_mut_ptr();
                let values = entries.iter().map(|(_, item)| self.encode(item)).collect();
                (8, self.list(values, keys))
            }
            Value::Bytes(value) => {
                let mut bytes = Box::new(ByteArray {
                    data: value.as_ptr().cast_mut(),
                    size: value.len(),
                });
                let data = NodeData {
                    bytes: &raw mut *bytes,
                };
                self.bytes.push(bytes);
                (9, data)
            }
        };
        Node { format, data }
    }

    fn list(&mut self, mut values: Vec<Node>, keys: *mut *mut c_char) -> NodeData {
        let mut list = Box::new(NodeList {
            num: values.len() as i32,
            values: values.as_mut_ptr(),
            keys,
        });
        let data = NodeData {
            list: &raw mut *list,
        };
        self.arrays.push(values);
        self.lists.push(list);
        data
    }
}

pub struct CopyBudget(usize);

impl CopyBudget {
    pub fn new(bytes: usize) -> Self {
        Self(bytes)
    }

    fn claim(&mut self, bytes: usize) -> Result<(), Failure> {
        self.0 = self.0.checked_sub(bytes).ok_or(Failure::Limit)?;
        Ok(())
    }

    unsafe fn string(&mut self, pointer: *const c_char) -> Result<CString, Failure> {
        // String members and map keys are NUL-terminated until the next wait_event on this handle.
        let string = unsafe { CStr::from_ptr(pointer) };
        self.claim(string.to_bytes_with_nul().len())?;
        Ok(string.to_owned())
    }

    pub unsafe fn property(&mut self, format: i32, data: *mut c_void) -> Result<Value, Failure> {
        // mpv_event_property uses the same indirection as mpv_get_property for the reported format.
        unsafe {
            match format {
                0 => Ok(Value::None),
                1 | 2 => self
                    .string(*data.cast::<*const c_char>())
                    .map(Value::String),
                3 => Ok(Value::Flag(*data.cast::<i32>() != 0)),
                4 => Ok(Value::Integer(*data.cast())),
                5 => Ok(Value::Double(*data.cast())),
                6 => self.node(&*data.cast(), 0),
                _ => Err(Failure::UnsupportedFormat),
            }
        }
    }

    pub unsafe fn node(&mut self, node: &Node, depth: usize) -> Result<Value, Failure> {
        if depth > 128 {
            return Err(Failure::Limit);
        }
        // Only read the union arm named by the native discriminant. The event owner keeps it alive throughout the copy.
        unsafe {
            match node.format {
                0 => Ok(Value::None),
                1 => self.string(node.data.string).map(Value::String),
                3 => Ok(Value::Flag(node.data.flag != 0)),
                4 => Ok(Value::Integer(node.data.integer)),
                5 => Ok(Value::Double(node.data.double)),
                7 | 8 => {
                    let list = &*node.data.list;
                    let count = usize::try_from(list.num).map_err(|_| Failure::Limit)?;
                    self.claim(count.saturating_mul(size_of::<(CString, Value)>()))?;
                    if node.format == 7 {
                        let mut values = Vec::with_capacity(count);
                        for index in 0..count {
                            values.push(self.node(&*list.values.add(index), depth + 1)?);
                        }
                        Ok(Value::Array(values))
                    } else {
                        let mut entries = Vec::with_capacity(count);
                        for index in 0..count {
                            let key = self.string(*list.keys.add(index))?;
                            entries.push((key, self.node(&*list.values.add(index), depth + 1)?));
                        }
                        Ok(Value::Map(entries))
                    }
                }
                9 => {
                    let bytes = &*node.data.bytes;
                    self.claim(bytes.size)?;
                    let data = if bytes.size == 0 {
                        Vec::new()
                    } else {
                        slice::from_raw_parts(bytes.data, bytes.size).to_vec()
                    };
                    Ok(Value::Bytes(data))
                }
                _ => Err(Failure::UnsupportedFormat),
            }
        }
    }
}
