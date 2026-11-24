use crate::client::Failure;
use crate::ffi::{Api, Handle, RenderParam};
use crate::video::gpu::{FrameSurface, Graphics, Slot};
use crate::video::{Device, DeviceSelection};
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
use std::ptr;
use std::sync::Arc;
use windows::Win32::Foundation::HMODULE;
use windows::Win32::Graphics::Direct3D::{
    D3D_DRIVER_TYPE_HARDWARE, D3D_DRIVER_TYPE_UNKNOWN, D3D_FEATURE_LEVEL_11_0,
    D3D_FEATURE_LEVEL_11_1,
};
use windows::Win32::Graphics::Direct3D11::*;
use windows::Win32::Graphics::Dxgi::Common::{DXGI_FORMAT_B8G8R8A8_UNORM, DXGI_SAMPLE_DESC};
use windows::Win32::Graphics::Dxgi::{
    CreateDXGIFactory1, DXGI_ERROR_NOT_FOUND, DXGI_SHARED_RESOURCE_READ, IDXGIAdapter,
    IDXGIAdapter1, IDXGIDevice, IDXGIFactory1, IDXGIResource1,
};
use windows::core::{Interface, PCWSTR};

pub struct Surface {
    _texture: ID3D11Texture2D,
    handle: OwnedHandle,
    luid: u64,
}

impl FrameSurface for Surface {
    fn descriptor(&self) -> crate::video::gpu::SurfaceDescriptor {
        crate::video::gpu::SurfaceDescriptor::D3d11 {
            handle: (self.handle.as_raw_handle() as usize)
                .to_ne_bytes()
                .to_vec(),
            adapter: self.luid,
        }
    }
}

pub struct Target {
    texture: ID3D11Texture2D,
}

pub struct D3d11 {
    device: ID3D11Device,
    commands: ID3D11DeviceContext,
    complete: ID3D11Query,
    pub info: Device,
    luid: u64,
}

fn luid(adapter: &IDXGIAdapter1) -> Result<u64, Failure> {
    // The descriptor is a value snapshot while the DXGI adapter is live.
    let d = unsafe { adapter.GetDesc1() }
        .map_err(|_| Failure::Creation)?
        .AdapterLuid;
    Ok((u64::from(d.HighPart as u32) << 32) | u64::from(d.LowPart))
}

impl D3d11 {
    pub fn new(choice: Option<&DeviceSelection>) -> Result<Self, Failure> {
        let selected = match choice {
            None => None,
            Some(DeviceSelection::Windows(expected)) => {
                // The factory owns adapter enumeration; stop when DXGI reports its end.
                let factory: IDXGIFactory1 =
                    unsafe { CreateDXGIFactory1() }.map_err(|_| Failure::Creation)?;
                let mut found = None;
                for index in 0.. {
                    let adapter = match unsafe { factory.EnumAdapters1(index) } {
                        Ok(adapter) => adapter,
                        Err(error) if error.code() == DXGI_ERROR_NOT_FOUND => break,
                        Err(_) => return Err(Failure::Creation),
                    };
                    if luid(&adapter)? == *expected {
                        found = Some(
                            adapter
                                .cast::<IDXGIAdapter>()
                                .map_err(|_| Failure::Creation)?,
                        );
                        break;
                    }
                }
                Some(found.ok_or(Failure::UnsupportedCapability)?)
            }
            _ => return Err(Failure::UnsupportedCapability),
        };
        let mut device = None;
        let mut commands = None;
        let driver = if selected.is_some() {
            D3D_DRIVER_TYPE_UNKNOWN
        } else {
            D3D_DRIVER_TYPE_HARDWARE
        };
        // The render thread exclusively owns external immediate-context calls. The device also supports mpv's decoder threads.
        unsafe {
            D3D11CreateDevice(
                selected.as_ref(),
                driver,
                HMODULE::default(),
                D3D11_CREATE_DEVICE_BGRA_SUPPORT,
                Some(&[D3D_FEATURE_LEVEL_11_1, D3D_FEATURE_LEVEL_11_0]),
                D3D11_SDK_VERSION,
                Some(&mut device),
                None,
                Some(&mut commands),
            )
        }
        .map_err(|_| Failure::Creation)?;
        let device = device.ok_or(Failure::Creation)?;
        let commands = commands.ok_or(Failure::Creation)?;
        let dxgi: IDXGIDevice = device.cast().map_err(|_| Failure::Creation)?;
        let adapter: IDXGIAdapter1 = unsafe { dxgi.GetAdapter() }
            .and_then(|adapter| adapter.cast())
            .map_err(|_| Failure::Creation)?;
        let id = luid(&adapter)?;
        let description = unsafe { adapter.GetDesc1() }.map_err(|_| Failure::Creation)?;
        let n = description
            .Description
            .iter()
            .position(|unit| *unit == 0)
            .unwrap_or(description.Description.len());
        let info = Device {
            name: String::from_utf16_lossy(&description.Description[..n]),
            selection: DeviceSelection::Windows(id),
        };
        let mut query = None;
        let desc = D3D11_QUERY_DESC {
            Query: D3D11_QUERY_EVENT,
            MiscFlags: 0,
        };
        unsafe { device.CreateQuery(&desc, Some(&mut query)) }.map_err(|_| Failure::Creation)?;
        Ok(Self {
            device,
            commands,
            complete: query.ok_or(Failure::Creation)?,
            info,
            luid: id,
        })
    }

    fn texture(&self, width: u32, height: u32, shared: bool) -> Result<ID3D11Texture2D, Failure> {
        let desc = D3D11_TEXTURE2D_DESC {
            Width: width,
            Height: height,
            MipLevels: 1,
            ArraySize: 1,
            Format: DXGI_FORMAT_B8G8R8A8_UNORM,
            SampleDesc: DXGI_SAMPLE_DESC {
                Count: 1,
                Quality: 0,
            },
            Usage: D3D11_USAGE_DEFAULT,
            BindFlags: (D3D11_BIND_SHADER_RESOURCE | D3D11_BIND_RENDER_TARGET).0 as u32,
            CPUAccessFlags: 0,
            MiscFlags: if shared {
                (D3D11_RESOURCE_MISC_SHARED_NTHANDLE | D3D11_RESOURCE_MISC_SHARED).0 as u32
            } else {
                0
            },
        };
        let mut texture = None;
        // Neither initial subresources nor an external buffer is passed to the driver.
        unsafe { self.device.CreateTexture2D(&desc, None, Some(&mut texture)) }
            .map_err(|_| Failure::Creation)?;
        texture.ok_or(Failure::Creation)
    }
}
impl Graphics for D3d11 {
    type Target = Target;
    type View = ID3D11Texture2D;
    fn device(&self) -> &Device {
        &self.info
    }
    fn context(&self, api: &Api, core: Handle) -> Result<Handle, Failure> {
        let mut advanced = 1_i32;
        let mut device = self.device.as_raw();
        let mut params = [
            RenderParam {
                kind: 1,
                data: c"d3d11".as_ptr().cast_mut().cast(),
            },
            RenderParam {
                kind: 21,
                data: ptr::from_mut(&mut device).cast(),
            },
            RenderParam {
                kind: 10,
                data: ptr::from_mut(&mut advanced).cast(),
            },
            RenderParam::end(),
        ];
        let mut context = ptr::null_mut();
        // mpv_d3d11_init_params consists of the borrowed ID3D11Device pointer. libmpv retains its own reference.
        let code = unsafe { (api.render_context_create)(&mut context, core, params.as_mut_ptr()) };
        if code < 0 {
            return Err(Failure::Native(code));
        }
        if context.is_null() {
            return Err(Failure::Creation);
        }
        Ok(context)
    }

    fn target(&self, width: u32, height: u32) -> Result<Target, Failure> {
        Ok(Target {
            texture: self.texture(width, height, false)?,
        })
    }

    fn slot(&self, width: u32, height: u32) -> Result<Slot<Self::View>, Failure> {
        let texture = self.texture(width, height, true)?;
        let resource: IDXGIResource1 = texture.cast().map_err(|_| Failure::Creation)?;
        // CreateSharedHandle transfers an NT handle, distinct from the legacy shared handle.
        let raw = unsafe {
            resource.CreateSharedHandle(None, DXGI_SHARED_RESOURCE_READ.0, PCWSTR::null())
        }
        .map_err(|_| Failure::Creation)?;
        let handle = unsafe { OwnedHandle::from_raw_handle(raw.0) };
        Ok(Slot {
            view: texture.clone(),
            surface: Arc::new(Surface {
                _texture: texture,
                handle,
                luid: self.luid,
            }),
            size: (width, height),
        })
    }

    fn draw(
        &self,
        api: &Api,
        context: Handle,
        target: &Target,
        view: &Self::View,
    ) -> Result<(), Failure> {
        let mut texture = target.texture.as_raw();
        let mut depth = 8_i32;
        let mut params = [
            RenderParam {
                kind: 22,
                data: ptr::from_mut(&mut texture).cast(),
            },
            RenderParam {
                kind: 5,
                data: ptr::from_mut(&mut depth).cast(),
            },
            RenderParam::end(),
        ];
        // The target, device and immediate context all belong to this renderer.
        unsafe { self.commands.ClearState() };
        let status = unsafe { (api.render_context_render)(context, params.as_mut_ptr()) };
        if status < 0 {
            return Err(Failure::Native(status));
        }
        unsafe {
            self.commands.ClearState();
            self.commands.CopyResource(view, &target.texture);
            self.commands.End(&self.complete);
            self.commands.Flush();
        }
        loop {
            let mut complete = 0_i32;
            // D3D11_QUERY_EVENT writes a BOOL after all preceding writes and the copy have completed.
            unsafe {
                self.commands.GetData(
                    &self.complete,
                    Some(ptr::from_mut(&mut complete).cast()),
                    size_of::<i32>() as u32,
                    0,
                )
            }
            .map_err(|_| Failure::RenderFailed)?;
            if complete != 0 {
                return Ok(());
            }
            std::thread::yield_now();
        }
    }
}
