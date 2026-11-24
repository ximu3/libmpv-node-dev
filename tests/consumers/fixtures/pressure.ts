import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { createMpv, MpvBindingError } from '@ximu3/libmpv-node'

export async function checkControlLoad() {
  await using player = await createMpv({
    options: [
      ['vo', 'null'],
      ['ao', 'null'],
    ],
  })
  await using peer = await player.createClient()
  const pattern = new Uint8Array(65536).fill(37)
  await player.setProperty('user-data/pressure', pattern)
  const start = performance.now()
  const reads = await Promise.allSettled(
    Array.from({ length: 384 }, () => player.getProperty('user-data/pressure')),
  )
  let accepted = 0
  let limited = 0
  for (const read of reads) {
    if (read.status === 'fulfilled') {
      assert.ok(read.value instanceof Uint8Array)
      assert.equal(read.value.length, pattern.length)
      assert.equal(read.value[0], 37)
      read.value[0] = 72
      accepted++
    } else {
      assert.ok(read.reason instanceof MpvBindingError && read.reason.code === 'resourceLimit')
      assert.equal(read.reason.submitted, false)
      limited++
    }
  }
  assert.ok(accepted > 0)
  assert.deepEqual(await peer.getProperty('user-data/pressure'), pattern)
  const outstanding = Array.from({ length: 64 }, () => peer.getProperty('pause'))
  const results = Promise.allSettled(outstanding)
  await peer.dispose()
  for (const outcome of await results) {
    if (outcome.status === 'rejected') {
      assert.ok(outcome.reason instanceof MpvBindingError)
      assert.ok(outcome.reason.code === 'closed' || outcome.reason.code === 'resourceLimit')
    }
  }
  for (let i = 0; i < 48; i++) {
    const channel = await player.createClient()
    const pending = Promise.allSettled([channel.getProperty('pause'), channel.dispose()])
    const [read, stop] = await pending
    assert.equal(stop?.status, 'fulfilled')
    if (read?.status === 'rejected') {
      assert.ok(read.reason instanceof MpvBindingError && read.reason.code === 'closed')
    }
  }
  await player.setProperty('pause', true)
  assert.equal(await player.getProperty('pause'), true)
  console.log(
    JSON.stringify({
      host: process.versions.electron ?? process.version,
      readBytes: pattern.byteLength,
      accepted,
      limited,
      elapsedMs: Math.round(performance.now() - start),
    }),
  )
}
