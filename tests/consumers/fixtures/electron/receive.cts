import { ipcRenderer, sharedTexture } from 'electron'

sharedTexture.setSharedTextureReceiver(async ({ importedSharedTexture }) => {
  const frame = importedSharedTexture.getVideoFrame()
  const held = frame.clone()
  try {
    const canvas = document.querySelector('canvas')!
    canvas.width = frame.displayWidth
    canvas.height = frame.displayHeight
    const context = canvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: true })!
    context.drawImage(frame, 0, 0)
    const pixel = context.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      1,
      1,
    ).data
    frame.close()
    importedSharedTexture.release()
    const finish = Promise.withResolvers<void>()
    ipcRenderer.once('close-texture', () => finish.resolve())
    ipcRenderer.send('texture-read', Array.from(pixel))
    await finish.promise
  } finally {
    held.close()
  }
})
ipcRenderer.send('texture-ready')
