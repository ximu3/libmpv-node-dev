use libmpv_core::video::frames::Frame;
use libmpv_core::video::gpu::{FrameSurface, SurfaceDescriptor};
use libmpv_core::video::render::FrameTiming;
use napi::bindgen_prelude::{BigInt, JsObjectValue, Null, Object, Uint8Array};
use napi::{Env, Result};
use napi_derive::napi;
use std::sync::Arc;

#[napi]
pub struct NativeLease(Option<Arc<dyn FrameSurface>>);
#[napi]
impl NativeLease {
    #[napi]
    pub fn duplicate(&self) -> Option<NativeLease> {
        self.0.as_ref().map(|surface| Self(Some(surface.clone())))
    }
    #[napi]
    pub fn release(&mut self) {
        self.0.take();
    }
    #[napi]
    pub fn surface<'a>(&self, env: &'a Env) -> Result<Option<Object<'a>>> {
        let Some(surface) = &self.0 else {
            return Ok(None);
        };
        let mut descriptor = Object::new(env)?;
        match surface.descriptor() {
            SurfaceDescriptor::D3d11 { handle, adapter } => {
                descriptor.set_named_property("kind", "d3d11")?;
                descriptor.set_named_property("adapterLuid", BigInt::from(adapter))?;
                descriptor.set_named_property("handle", Uint8Array::new(handle))?;
            }
            SurfaceDescriptor::IoSurface { handle } => {
                descriptor.set_named_property("kind", "ioSurface")?;
                descriptor.set_named_property("handle", Uint8Array::new(handle))?;
            }
            SurfaceDescriptor::DmaBuf {
                format,
                modifier,
                fd,
                stride,
                offset,
                size,
            } => {
                descriptor.set_named_property("kind", "dmaBuf")?;
                descriptor.set_named_property("format", format)?;
                descriptor.set_named_property("modifier", BigInt::from(modifier))?;
                let mut plane = Object::new(env)?;
                plane.set_named_property("fd", fd)?;
                plane.set_named_property("stride", stride)?;
                plane.set_named_property("offset", BigInt::from(offset))?;
                plane.set_named_property("size", BigInt::from(size))?;
                descriptor.set_named_property("planes", vec![plane])?;
            }
        }
        Ok(Some(descriptor))
    }
}

fn metadata(
    image: &mut Object<'_>,
    sequence: u64,
    width: u32,
    height: u32,
    timing: FrameTiming,
) -> Result<()> {
    image.set_named_property("sequence", BigInt::from(sequence))?;
    image.set_named_property("width", width)?;
    image.set_named_property("height", height)?;
    if let Some(value) = timing.target {
        image.set_named_property("targetTimeNs", BigInt::from(value))?;
    } else {
        image.set_named_property("targetTimeNs", Null)?;
    }
    image.set_named_property("redraw", timing.flags & 2 != 0)?;
    image.set_named_property("repeat", timing.flags & 4 != 0)?;
    image.set_named_property("blockVsync", timing.flags & 8 != 0)?;
    Ok(())
}

pub(super) fn image(env: &Env, frame: Frame) -> Result<Object<'_>> {
    let mut image = Object::new(env)?;
    match frame {
        Frame::Software(frame) => {
            metadata(
                &mut image,
                frame.sequence,
                frame.configuration.width,
                frame.configuration.height,
                frame.timing,
            )?;
            image.set_named_property("stride", frame.stride)?;
            image.set_named_property(
                "pixelFormat",
                frame.configuration.format.name().to_str().unwrap(),
            )?;
            let bytes = Arc::try_unwrap(frame)
                .map(|value| value.data)
                .unwrap_or_else(|shared| shared.data.clone());
            image.set_named_property("data", Uint8Array::new(bytes))?;
        }
        Frame::Gpu(frame) => {
            metadata(
                &mut image,
                frame.sequence,
                frame.config.width,
                frame.config.height,
                frame.timing,
            )?;
            image.set_named_property("pixelFormat", "bgra8unorm")?;
            image.set_named_property("colorSpace", frame.config.color.name())?;
            image.set_named_property("lease", NativeLease(Some(frame.surface.clone())))?;
        }
    }
    Ok(image)
}
