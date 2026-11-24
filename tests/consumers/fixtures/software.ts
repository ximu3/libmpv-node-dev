import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  createMpv,
  MpvBindingError,
  type SoftwareFrame,
  type SoftwarePixelFormat,
} from '@ximu3/libmpv-node'

export async function checkSoftwareVideo() {
  const path = fileURLToPath(new URL('./picture.ppm', import.meta.url))
  const source = Buffer.alloc(23 * 17 * 3)
  for (let pos = 0; pos < source.length; pos += 3) {
    source[pos] = 255
  }
  await writeFile(path, Buffer.concat([Buffer.from('P6\n23 17\n255\n'), source]))
  await using player = await createMpv({
    options: [
      ['pause', true],
      ['ao', 'null'],
    ],
    videoOutput: { renderer: 'software', width: 23, height: 17 },
  })
  const output = player.videoOutput
  assert.deepEqual(output.configuration, { width: 23, height: 17, pixelFormat: 'bgr0' })
  await using channel = await player.createClient()
  await assert.rejects(
    channel.setProperty('vo', 'null'),
    (reason) =>
      reason instanceof MpvBindingError && reason.code === 'renderConflict' && !reason.submitted,
  )
  const formats = ['bgr0', 'rgb0', '0rgb', '0bgr', 'rgb24'] as const
  let first: SoftwareFrame | undefined
  for (const [index, format] of formats.entries()) {
    const width = 23 + index * 2
    const waiting = Promise.withResolvers<SoftwareFrame>()
    const watch = await output.observeFrames({
      next(frame) {
        if (frame.width === width && frame.pixelFormat === format && red(frame)) {
          waiting.resolve(frame)
        }
      },
      error: waiting.reject,
    })
    if (index === 0) {
      await player.command(['loadfile', path])
    } else {
      await output.configure({ width, height: 17, pixelFormat: format })
    }
    const frame = await waiting.promise
    await watch.dispose()
    assert.equal(frame.width, width)
    assert.equal(frame.height, 17)
    assert.equal(frame.data.byteLength, frame.stride * frame.height)
    assert.equal(frame.data.byteLength, frame.data.buffer.byteLength)
    assert.ok(frame.sequence > 0n)
    const bytes = format === 'rgb24' ? 3 : 4
    assert.ok(frame.data.subarray(width * bytes, frame.stride).every((byte) => byte === 0))
    if (bytes === 4) {
      const unused = format.startsWith('0') ? 0 : 3
      assert.equal(frame.data[unused], 0)
    }
    first ??= frame
  }
  assert.ok(first)
  const snapshot = first.data.slice()
  await assert.rejects(
    output.configure({ width: 0, height: 1, pixelFormat: 'bgr0' }),
    (reason) => reason instanceof MpvBindingError && reason.code === 'invalidArgument',
  )
  assert.equal(output.configuration.pixelFormat, 'rgb24')
  const conflicted = Promise.withResolvers<unknown>()
  const activeWatch = await output.observeFrames({ next() {}, error: conflicted.resolve })
  const configPath = fileURLToPath(new URL('./conflict.conf', import.meta.url))
  await writeFile(configPath, 'vo=null\n')
  await channel.loadConfigFile(configPath)
  const conflict = await conflicted.promise
  assert.ok(conflict instanceof MpvBindingError && conflict.code === 'renderConflict')
  await activeWatch.dispose()
  assert.ok(output.closed)
  assert.equal(await player.getProperty('pause'), true)
  await player.close()
  assert.ok(output.closed)
  assert.deepEqual(first.data, snapshot)
  assert.equal(output.configuration.pixelFormat, 'rgb24')
}

function red(frame: SoftwareFrame) {
  const offset =
    Math.floor(frame.height / 2) * frame.stride +
    Math.floor(frame.width / 2) * (frame.pixelFormat === 'rgb24' ? 3 : 4)
  const red: Record<SoftwarePixelFormat, number> = {
    rgb0: 0,
    bgr0: 2,
    '0rgb': 1,
    '0bgr': 3,
    rgb24: 0,
  }
  const blue: Record<SoftwarePixelFormat, number> = {
    rgb0: 2,
    bgr0: 0,
    '0rgb': 3,
    '0bgr': 1,
    rgb24: 2,
  }
  return (
    frame.data[offset + red[frame.pixelFormat]]! > 180 &&
    frame.data[offset + blue[frame.pixelFormat]]! < 60
  )
}
