import { ipcRenderer, sharedTexture } from 'electron'

sharedTexture.setSharedTextureReceiver(
  async ({ importedSharedTexture }, points: readonly (readonly [number, number])[]) => {
    const frame = importedSharedTexture.getVideoFrame()
    const held = frame.clone()
    let imported = true
    try {
      const canvas = document.querySelector('canvas')!
      canvas.width = frame.displayWidth
      canvas.height = frame.displayHeight
      const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true })!
      context.drawImage(frame, 0, 0)
      const pixels = points.map(([x, y]) =>
        Array.from(
          context.getImageData(Math.floor(canvas.width * x), Math.floor(canvas.height * y), 1, 1)
            .data,
        ),
      )
      const options: VideoFrameCopyToOptions = { format: 'RGBA', colorSpace: 'srgb' }
      const raw = new Uint8Array(frame.allocationSize(options))
      const [layout] = await frame.copyTo(raw, options)
      if (!layout) {
        throw new Error('VideoFrame readback returned no plane')
      }
      for (const [i, [x, y]] of points.entries()) {
        const offset =
          layout.offset +
          Math.floor(canvas.height * y) * layout.stride +
          Math.floor(canvas.width * x) * 4
        if (pixels[i]!.some((v, k) => Math.abs(v - raw[offset + k]!) > 3)) {
          throw new Error('Canvas and VideoFrame color samples disagree')
        }
      }
      frame.close()
      importedSharedTexture.release()
      imported = false
      const finish = Promise.withResolvers<void>()
      ipcRenderer.once('close-texture', () => finish.resolve())
      ipcRenderer.send('texture-read', pixels)
      await finish.promise
    } catch (error) {
      ipcRenderer.send('texture-read', { error: String(error) })
    } finally {
      frame.close()
      if (imported) {
        importedSharedTexture.release()
      }
      held.close()
    }
  },
)
ipcRenderer.send('texture-ready')
