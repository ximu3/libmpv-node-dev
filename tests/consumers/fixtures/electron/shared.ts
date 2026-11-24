import assert from 'node:assert/strict'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, ipcMain, sharedTexture, type SharedTextureHandle } from 'electron'
import type { NativeFrame, NativeFrameSurface } from '@ximu3/libmpv-node'

function handle(surface: NativeFrameSurface): SharedTextureHandle {
  switch (surface.kind) {
    case 'd3d11':
      return { ntHandle: Buffer.from(surface.handle) }
    case 'ioSurface':
      return { ioSurface: Buffer.from(surface.handle) }
    case 'dmaBuf':
      return {
        nativePixmap: {
          modifier: surface.modifier.toString(),
          supportsZeroCopyWebGpuImport: false,
          planes: surface.planes.map((p) => ({
            ...p,
            offset: Number(p.offset),
            size: Number(p.size),
          })),
        },
      }
  }
}

export async function sampleElectronFrame(
  frame: NativeFrame,
  points: readonly (readonly [number, number])[],
  colorSpace = frame.target.colorSpace,
): Promise<number[][]> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: fileURLToPath(new URL('./receive.cjs', import.meta.url)),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  try {
    const ready = once(ipcMain, 'texture-ready')
    await window.loadURL('data:text/html,<canvas></canvas>')
    await ready
    const released = Promise.withResolvers<void>()
    const lease = frame.clone()
    let releases = 0
    const texture = sharedTexture.importSharedTexture({
      textureInfo: {
        pixelFormat: frame.pixelFormat === 'bgra8unorm' ? 'bgra' : 'rgba',
        codedSize: { width: frame.width, height: frame.height },
        visibleRect: frame.visibleRect,
        colorSpace: {
          primaries: colorSpace === 'srgb' ? 'bt709' : 'p3',
          transfer: 'srgb',
          matrix: 'rgb',
          range: 'full',
        },
        handle: handle(lease.getSurface()),
      },
      allReferencesReleased() {
        releases++
        lease.release()
        released.resolve()
      },
    })
    const read = once(ipcMain, 'texture-read')
    try {
      await sharedTexture.sendSharedTexture(
        {
          frame: window.webContents.mainFrame,
          importedSharedTexture: texture,
        },
        points,
      )
    } finally {
      texture.release()
    }
    const pixels: unknown = (await read)[1]
    if (pixels && typeof pixels === 'object' && 'error' in pixels) {
      throw new Error(String(pixels.error))
    }
    assert.equal(releases, 0)
    window.webContents.send('close-texture')
    await released.promise
    assert.equal(releases, 1)
    assert.ok(
      Array.isArray(pixels) &&
        pixels.every(
          (p: unknown) =>
            Array.isArray(p) && p.length === 4 && p.every((v: unknown) => typeof v === 'number'),
        ),
    )
    return pixels as number[][]
  } finally {
    window.destroy()
  }
}

export async function checkElectronFrame(frame: NativeFrame) {
  const [pixel] = await sampleElectronFrame(frame, [[0.5, 0.5]])
  assert.ok(
    pixel && pixel[0]! > 200 && pixel[1]! < 45 && pixel[2]! < 45 && pixel[3] === 255,
    JSON.stringify(pixel),
  )
}
