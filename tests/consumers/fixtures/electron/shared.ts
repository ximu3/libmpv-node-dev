import assert from 'node:assert/strict'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, sharedTexture, type SharedTextureHandle } from 'electron'
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

type Points = readonly (readonly [number, number])[]
export async function frameReceiver(visible = false) {
  const window = new BrowserWindow({
    show: false,
    width: 384,
    height: 288,
    useContentSize: true,
    webPreferences: {
      preload: fileURLToPath(new URL('./receive.cjs', import.meta.url)),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  try {
    const ready = once(window.webContents.ipc, 'texture-ready')
    await window.loadURL(
      'data:text/html,' +
        encodeURIComponent(
          '<style>html,body{margin:0;background:black}canvas{display:block;width:100vw;height:100vh;image-rendering:pixelated}</style><canvas></canvas>',
        ),
    )
    await ready
    if (visible) {
      window.showInactive()
    }
  } catch (error) {
    window.destroy()
    throw error
  }
  return {
    [Symbol.dispose]() {
      window.destroy()
    },
    async sample(
      frame: NativeFrame,
      points: Points,
      colorSpace = frame.target.colorSpace,
    ): Promise<number[][]> {
      const released = Promise.withResolvers<void>()
      const lease = frame.clone()
      let releases = 0
      let texture: ReturnType<typeof sharedTexture.importSharedTexture>
      try {
        texture = sharedTexture.importSharedTexture({
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
      } catch (error) {
        lease.release()
        throw error
      }
      const read = once(window.webContents.ipc, 'texture-read')
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
    },
    async capture(points: Points) {
      const image = await window.webContents.capturePage()
      assert.ok(!image.isEmpty())
      const { width, height } = image.getSize()
      const bytes = image.toBitmap({ scaleFactor: 1 })
      assert.equal(bytes.length, width * height * 4)
      return points.map(([x, y]) => {
        const offset = (Math.floor(y * height) * width + Math.floor(x * width)) * 4
        return [bytes[offset + 2]!, bytes[offset + 1]!, bytes[offset]!, bytes[offset + 3]!]
      })
    },
  }
}
export async function sampleElectronFrame(
  frame: NativeFrame,
  points: Points,
  colorSpace = frame.target.colorSpace,
) {
  using receiver = await frameReceiver()
  const result = await receiver.sample(frame, points, colorSpace)
  return result
}
export async function checkElectronFrame(frame: NativeFrame) {
  const [pixel] = await sampleElectronFrame(frame, [[0.5, 0.5]])
  assert.ok(
    pixel && pixel[0]! > 200 && pixel[1]! < 45 && pixel[2]! < 45 && pixel[3] === 255,
    JSON.stringify(pixel),
  )
}
