import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createMpv, MpvBindingError, type NativeFrame } from '@ximu3/libmpv-node'

export async function checkGpuVideo() {
  const path = fileURLToPath(new URL('./gpu.ppm', import.meta.url))
  await writeFile(
    path,
    Buffer.concat([
      Buffer.from('P6\n8 8\n255\n'),
      Buffer.from(Array.from({ length: 192 }, (_, i) => (i % 3 === 0 ? 255 : 0))),
    ]),
  )
  const player = await createMpv({
    videoOutput: { width: 32, height: 24, frameCapacity: 2 },
    options: [
      ['ao', 'null'],
      ['pause', true],
      ['image-display-duration', 'inf'],
    ],
  })
  const output = player.videoOutput
  const waiting = Promise.withResolvers<NativeFrame>()
  const resized = Promise.withResolvers<NativeFrame>()
  let first = true
  try {
    await assert.rejects(
      player.command({ _name: 'set', name: 'gpu-api', value: 'vulkan' }),
      (reason) =>
        reason instanceof MpvBindingError && reason.code === 'renderConflict' && !reason.submitted,
    )
    assert.equal(output.renderer, 'gpu')
    assert.equal(output.frameCapacity, 2)
    assert.equal(output.device.selection.platform, process.platform)
    assert.deepEqual(output.configuration, {
      width: 32,
      height: 24,
      target: { colorSpace: 'srgb' },
    })
    const watch = await output.observeFrames({
      next(frame) {
        if (frame.width === 32 && first) {
          first = false
          waiting.resolve(frame)
        } else if (frame.width === 40) {
          resized.resolve(frame)
        } else {
          frame.release()
        }
      },
      error(error) {
        if (first) {
          waiting.reject(error)
        } else {
          resized.reject(error)
        }
      },
    })
    await player.command(['loadfile', path])
    using original = await waiting.promise
    using held = original.clone()
    assert.deepEqual(original.getSurface(), held.getSurface())
    original.release()
    original.release()
    assert.ok(original.released)
    assert.throws(
      () => original.getSurface(),
      (e) => e instanceof MpvBindingError && e.code === 'frameReleased',
    )
    assert.throws(
      () => original.clone(),
      (e) => e instanceof MpvBindingError && e.operation === 'cloneFrame',
    )
    await output.configure({ width: 40, height: 30, target: { colorSpace: 'display-p3' } })
    using changed = await resized.promise
    assert.deepEqual(changed.visibleRect, { x: 0, y: 0, width: 40, height: 30 })
    assert.equal(changed.target.colorSpace, 'display-p3')
    assert.equal(changed.alphaMode, 'opaque')
    assert.ok(changed.sequence > original.sequence)
    assert.equal(held.target.colorSpace, 'srgb')
    if (process.versions.electron) {
      const { checkElectronFrame } = await import('./electron/shared.js')
      await checkElectronFrame(changed)
    }
    const descriptor = held.getSurface()
    if (descriptor.kind === 'd3d11') {
      assert.equal(descriptor.handle.byteLength, 8)
      assert.deepEqual(output.device.selection, {
        platform: 'win32',
        adapterLuid: descriptor.adapterLuid,
      })
    }
    await watch.dispose()
    await player.close()
    assert.deepEqual(held.getSurface(), descriptor)
    if (process.versions.electron) {
      const { checkElectronFrame } = await import('./electron/shared.js')
      await checkElectronFrame(changed)
    }
    assert.equal(output.closed, true)
    console.log(
      JSON.stringify({
        renderer: output.renderer,
        device: output.device.name,
        surface: descriptor.kind,
        host: process.versions.electron ?? process.version,
      }),
    )
  } finally {
    await player.close()
  }
}
