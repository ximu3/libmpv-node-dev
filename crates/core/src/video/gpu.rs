use super::render::FrameTiming;
use super::{Device, DeviceSelection};
use crate::client::Failure;
use crate::ffi::{Api, Handle, RenderParam};
use std::ffi::CStr;
use std::ptr;
use std::sync::Arc;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ColorSpace {
    Srgb,
    DisplayP3,
}
impl ColorSpace {
    pub fn name(self) -> &'static str {
        match self {
            Self::Srgb => "srgb",
            Self::DisplayP3 => "display-p3",
        }
    }
    pub fn primaries(self) -> &'static CStr {
        match self {
            Self::Srgb => c"bt.709",
            Self::DisplayP3 => c"display-p3",
        }
    }
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct GpuConfiguration {
    pub width: u32,
    pub height: u32,
    pub color: ColorSpace,
}
pub struct GpuOptions {
    pub config: GpuConfiguration,
    pub device: Option<DeviceSelection>,
    pub capacity: u32,
}

pub enum SurfaceDescriptor {
    D3d11 {
        handle: Vec<u8>,
        adapter: u64,
    },
    IoSurface {
        handle: Vec<u8>,
    },
    DmaBuf {
        format: u32,
        modifier: u64,
        fd: i32,
        stride: u32,
        offset: u64,
        size: u64,
    },
}
pub trait FrameSurface: Send + Sync {
    fn descriptor(&self) -> SurfaceDescriptor;
}
pub struct GpuFrame {
    pub sequence: u64,
    pub config: GpuConfiguration,
    pub timing: FrameTiming,
    pub surface: Arc<dyn FrameSurface>,
}

pub(crate) struct Slot<V> {
    pub view: V,
    pub surface: Arc<dyn FrameSurface>,
    pub size: (u32, u32),
}

pub(crate) trait Graphics {
    type Target;
    type View;
    fn device(&self) -> &Device;
    fn context(&self, api: &Api, core: Handle) -> Result<Handle, Failure>;
    fn target(&self, width: u32, height: u32) -> Result<Self::Target, Failure>;
    fn slot(&self, width: u32, height: u32) -> Result<Slot<Self::View>, Failure>;
    fn draw(
        &self,
        api: &Api,
        context: Handle,
        target: &Self::Target,
        view: &Self::View,
    ) -> Result<(), Failure>;
}

pub(crate) trait Backend {
    fn device(&self) -> Device;
    fn context(&self, api: &Api, core: Handle) -> Result<Handle, Failure>;
    fn prepare(&mut self, config: GpuConfiguration) -> Result<(), Failure>;
    fn adopt(&mut self, config: GpuConfiguration);
    fn frame(
        &mut self,
        api: &Api,
        context: Handle,
        sequence: u64,
        timing: FrameTiming,
        publish: bool,
    ) -> Result<Option<GpuFrame>, Failure>;
}

struct Pool<G: Graphics> {
    // GL bindings must be destroyed before their owning platform context.
    slots: Vec<Slot<G::View>>,
    target: G::Target,
    prepared: Option<(G::Target, Slot<G::View>)>,
    graphics: G,
    config: GpuConfiguration,
    capacity: usize,
}

impl<G: Graphics> Pool<G> {
    fn new(graphics: G, options: &GpuOptions) -> Result<Self, Failure> {
        let target = graphics.target(options.config.width, options.config.height)?;
        let slot = graphics.slot(options.config.width, options.config.height)?;
        Ok(Self {
            slots: vec![slot],
            target,
            prepared: None,
            graphics,
            config: options.config,
            capacity: options.capacity as usize,
        })
    }
}

pub(crate) fn skip(api: &Api, context: Handle) -> Result<(), Failure> {
    let mut skip = 1_i32;
    let mut params = [
        RenderParam {
            kind: 13,
            data: ptr::from_mut(&mut skip).cast(),
        },
        RenderParam::end(),
    ];
    // The render owner advances the native clock without touching a surface held by another consumer.
    let status = unsafe { (api.render_context_render)(context, params.as_mut_ptr()) };
    if status < 0 {
        Err(Failure::Native(status))
    } else {
        Ok(())
    }
}

impl<G: Graphics> Backend for Pool<G> {
    fn device(&self) -> Device {
        self.graphics.device().clone()
    }
    fn context(&self, api: &Api, core: Handle) -> Result<Handle, Failure> {
        self.graphics.context(api, core)
    }
    fn prepare(&mut self, config: GpuConfiguration) -> Result<(), Failure> {
        self.prepared = if (config.width, config.height) != (self.config.width, self.config.height)
        {
            Some((
                self.graphics.target(config.width, config.height)?,
                self.graphics.slot(config.width, config.height)?,
            ))
        } else {
            None
        };
        Ok(())
    }
    fn adopt(&mut self, config: GpuConfiguration) {
        if let Some((target, slot)) = self.prepared.take() {
            self.target = target;
            if let Some(idle) = self
                .slots
                .iter_mut()
                .find(|entry| Arc::strong_count(&entry.surface) == 1)
            {
                *idle = slot;
            } else if self.slots.len() < self.capacity {
                self.slots.push(slot);
            }
        }
        self.config = config;
    }
    fn frame(
        &mut self,
        api: &Api,
        context: Handle,
        sequence: u64,
        timing: FrameTiming,
        publish: bool,
    ) -> Result<Option<GpuFrame>, Failure> {
        if !publish {
            skip(api, context)?;
            return Ok(None);
        }
        let size = (self.config.width, self.config.height);
        let index = match self
            .slots
            .iter()
            .position(|slot| Arc::strong_count(&slot.surface) == 1)
        {
            Some(index) => {
                if self.slots[index].size != size {
                    self.slots[index] = self.graphics.slot(size.0, size.1)?;
                }
                index
            }
            None if self.slots.len() < self.capacity => {
                self.slots.push(self.graphics.slot(size.0, size.1)?);
                self.slots.len() - 1
            }
            None => {
                skip(api, context)?;
                return Ok(None);
            }
        };
        let slot = &self.slots[index];
        self.graphics.draw(api, context, &self.target, &slot.view)?;
        Ok(Some(GpuFrame {
            sequence,
            config: self.config,
            timing,
            surface: slot.surface.clone(),
        }))
    }
}

pub(crate) fn create(options: &GpuOptions) -> Result<Box<dyn Backend>, Failure> {
    #[cfg(windows)]
    let graphics = super::platform::surface::D3d11::new(options.device.as_ref())?;
    #[cfg(target_os = "macos")]
    let graphics =
        super::gl::OpenGl::<super::platform::surface::Cgl>::new(options.device.as_ref())?;
    #[cfg(target_os = "linux")]
    let graphics =
        super::gl::OpenGl::<super::platform::surface::Egl>::new(options.device.as_ref())?;
    Ok(Box::new(Pool::new(graphics, options)?))
}
