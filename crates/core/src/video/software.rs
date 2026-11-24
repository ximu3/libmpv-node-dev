use super::frames::SoftwareFrame;
use super::render::FrameTiming;
use crate::client::Failure;
use crate::ffi::{Api, Handle, RenderParam};
use std::{ffi::CStr, ptr};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PixelFormat {
    Rgb0,
    Bgr0,
    ZeroRgb,
    ZeroBgr,
    Rgb24,
}

impl PixelFormat {
    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "rgb0" => Some(Self::Rgb0),
            "bgr0" => Some(Self::Bgr0),
            "0rgb" => Some(Self::ZeroRgb),
            "0bgr" => Some(Self::ZeroBgr),
            "rgb24" => Some(Self::Rgb24),
            _ => None,
        }
    }
    pub fn name(self) -> &'static CStr {
        match self {
            Self::Rgb0 => c"rgb0",
            Self::Bgr0 => c"bgr0",
            Self::ZeroRgb => c"0rgb",
            Self::ZeroBgr => c"0bgr",
            Self::Rgb24 => c"rgb24",
        }
    }
    fn bytes(self) -> usize {
        if self == Self::Rgb24 { 3 } else { 4 }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Configuration {
    pub width: u32,
    pub height: u32,
    pub format: PixelFormat,
}

pub(super) struct Pixels {
    storage: Vec<u8>,
    offset: usize,
    stride: usize,
    config: Configuration,
}

impl Pixels {
    pub(super) fn new(config: Configuration) -> Result<Self, Failure> {
        let row = (config.width as usize)
            .checked_mul(config.format.bytes())
            .ok_or(Failure::Limit)?;
        // libmpv requires a whole number of pixels per stride; rgb24 and SIMD alignment meet at 192 bytes.
        let alignment = if config.format == PixelFormat::Rgb24 {
            192
        } else {
            64
        };
        let stride = row.next_multiple_of(alignment);
        let length = stride
            .checked_mul(config.height as usize)
            .filter(|len| *len > 0 && *len <= 128 * 1024 * 1024)
            .ok_or(Failure::Limit)?;
        let mut storage = Vec::new();
        storage
            .try_reserve_exact(length + 63)
            .map_err(|_| Failure::Limit)?;
        storage.resize(length + 63, 0);
        let offset = storage.as_ptr().align_offset(64);
        Ok(Self {
            storage,
            offset,
            stride,
            config,
        })
    }

    fn snapshot(&self) -> Vec<u8> {
        let config = self.config;
        let mut bytes =
            self.storage[self.offset..self.offset + self.stride * config.height as usize].to_vec();
        let used = config.width as usize * config.format.bytes();
        for row in bytes.chunks_exact_mut(self.stride) {
            row[used..].fill(0);
            let padding = match config.format {
                PixelFormat::Rgb0 | PixelFormat::Bgr0 => Some(3),
                PixelFormat::ZeroRgb | PixelFormat::ZeroBgr => Some(0),
                PixelFormat::Rgb24 => None,
            };
            if let Some(index) = padding {
                for pixel in row[..used].chunks_exact_mut(4) {
                    pixel[index] = 0;
                }
            }
        }
        bytes
    }
}

pub(super) fn context(api: &Api, handle: Handle) -> Result<Handle, Failure> {
    let mut context = ptr::null_mut();
    let mut advanced = 1_i32;
    let mut params = [
        RenderParam {
            kind: 1,
            data: c"sw".as_ptr().cast_mut().cast(),
        },
        RenderParam {
            kind: 10,
            data: ptr::from_mut(&mut advanced).cast(),
        },
        RenderParam::end(),
    ];
    // The core owner waits for initialization and later joins this thread before releasing the client handle.
    let code = unsafe { (api.render_context_create)(&mut context, handle, params.as_mut_ptr()) };
    if code < 0 {
        return Err(Failure::Native(code));
    }
    if context.is_null() {
        return Err(Failure::Creation);
    }
    Ok(context)
}

impl Pixels {
    pub(super) fn draw(
        &mut self,
        api: &Api,
        context: Handle,
        skip: bool,
        sequence: u64,
        timing: FrameTiming,
    ) -> Result<Option<SoftwareFrame>, Failure> {
        let mut size = [self.config.width as i32, self.config.height as i32];
        let mut skipped = i32::from(skip);
        let pointer = self.storage[self.offset..].as_mut_ptr();
        let mut params = [
            RenderParam {
                kind: 17,
                data: size.as_mut_ptr().cast(),
            },
            RenderParam {
                kind: 18,
                data: self.config.format.name().as_ptr().cast_mut().cast(),
            },
            RenderParam {
                kind: 19,
                data: ptr::from_mut(&mut self.stride).cast(),
            },
            RenderParam {
                kind: 20,
                data: pointer.cast(),
            },
            RenderParam {
                kind: 13,
                data: ptr::from_mut(&mut skipped).cast(),
            },
            RenderParam::end(),
        ];
        // The aligned allocation covers stride * height, including the final row's padding.
        let code = unsafe { (api.render_context_render)(context, params.as_mut_ptr()) };
        if code < 0 {
            return Err(Failure::Native(code));
        }
        Ok((!skip).then(|| SoftwareFrame {
            sequence,
            configuration: self.config,
            stride: self.stride as u32,
            data: self.snapshot(),
            timing,
        }))
    }
}
