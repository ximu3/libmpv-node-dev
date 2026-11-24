import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createMpv } from '@ximu3/libmpv-node'
import { frameReceiver } from './shared.js'

export async function checkPresentation() {
  const visible = process.env.LIBMPV_TEST_VISIBLE === '1'
  using receiver = await frameReceiver(visible)
  await using player = await createMpv({
    options: [
      ['ao', 'null'],
      ['loop-file', 'inf'],
      ['osd-level', '0'],
    ],
    videoOutput: { width: 160, height: 96, frameCapacity: 2 },
  })
  const points = [
    [0.21, 0.37],
    [0.61, 0.23],
    [0.74, 0.68],
  ] as const
  const samples = new Set<string>()
  const completed = Promise.withResolvers<void>()
  let last = 0n,
    shown = 0,
    busy = false,
    stopped = false
  let processing = Promise.resolve()
  const watch = await player.videoOutput.observeFrames({
    next(frame) {
      if (busy || stopped || frame.repeat) {
        frame.release()
        return
      }
      busy = true
      processing = (async () => {
        using lease = frame
        assert.ok(lease.sequence > last)
        last = lease.sequence
        const pixels = await receiver.sample(lease, points)
        const key = JSON.stringify(pixels)
        samples.add(key)
        shown++
        if (shown === 16) {
          stopped = true
          assert.ok(samples.size > 1, 'Expected moving media to change the samples')
          if (visible) {
            const composited = await receiver.capture(points)
            assert.ok(
              composited.every((p, i) => p.every((v, k) => Math.abs(v - pixels[i]![k]!) <= 5)),
              JSON.stringify({ pixels, composited }),
            )
          }
          completed.resolve()
        }
      })()
        .catch((error: unknown) => {
          stopped = true
          completed.reject(error)
        })
        .finally(() => {
          busy = false
        })
    },
    error: completed.reject,
  })
  try {
    await player.command([
      'loadfile',
      fileURLToPath(new URL('../../media/motion.mkv', import.meta.url)),
    ])
    await completed.promise
    console.log(
      JSON.stringify({
        presentation: process.env.LIBMPV_TEST_DISPLAY ?? process.platform,
        visible,
        frames: shown,
        different: samples.size,
      }),
    )
  } finally {
    stopped = true
    await watch.dispose()
    await processing
  }
}
