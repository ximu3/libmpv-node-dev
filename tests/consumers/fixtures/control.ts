import { Worker } from 'node:worker_threads'
import { once } from 'node:events'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { setTimeout } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { getClientApiVersion } from '@ximu3/libmpv-node'

const versions = await Promise.all([getClientApiVersion(), getClientApiVersion()])
assert.deepEqual(versions, [
  { major: 2, minor: 6 },
  { major: 2, minor: 6 },
])
console.log(JSON.stringify({ host: process.versions.electron ?? process.version, versions }))

const { createMpv, MpvBindingError, MpvAbortError, MpvConversionError, MpvNativeError } =
  await import('@ximu3/libmpv-node')
await assert.rejects(
  createMpv({ options: [['kisaki-unknown-option', 1]] }),
  (error) =>
    error instanceof MpvNativeError &&
    error.creation?.stage === 'options' &&
    error.creation.optionIndex === 0,
)
const player = await createMpv({
  options: [
    ['load-scripts', false],
    ['vo', 'null'],
    ['ao', 'null'],
    ['pause', true],
  ],
})
try {
  assert.equal(player.hasRef(), true)
  assert.equal(player.unref().hasRef(), false)
  assert.equal(player.ref().hasRef(), true)
  assert.equal(typeof player.clientId, 'bigint')
  assert.ok(player.clientName.length)
  assert.equal(typeof player.getTimeNs(), 'bigint')
  assert.equal(await player.getProperty('pause'), true)
  await player.setProperty('pause', false)
  assert.equal(await player.getProperty('pause'), false)
  assert.equal(await player.getPropertyText('pause'), 'no')
  const value = {
    integer: 9223372036854775807n,
    bytes: Uint8Array.of(0, 255),
    values: [null, true, 1.25],
  }
  await player.setProperty('user-data/sample', value)
  const restored = await player.getProperty('user-data/sample')
  assert.deepEqual(restored, Object.assign(Object.create(null), value))
  await player.setProperty(
    'user-data/text',
    { format: 'string', value: Uint8Array.of(255) },
    { input: 'native' },
  )
  await assert.rejects(player.getProperty('user-data/text'), (error) => {
    if (!(error instanceof MpvConversionError) || error.reason !== 'invalidUtf8') {
      return false
    }
    const node = error.getNativeValue()
    return node.format === 'string' && node.value[0] === 255
  })
  await assert.rejects(
    player.getProperty('no-such-property'),
    (error) =>
      error instanceof MpvNativeError && error.nativeName === 'MPV_ERROR_PROPERTY_NOT_FOUND',
  )
  await assert.rejects(
    player.command(['ignore'], { signal: AbortSignal.abort('test') }),
    (error) => error instanceof MpvAbortError && error.cause === 'test' && !error.submitted,
  )
  assert.equal(await player.command(['ignore']), null)
  const worker = new Worker(new URL('./worker.js', import.meta.url))
  await once(worker, 'message')
  await worker.terminate()
  assert.equal(await player.getProperty('pause'), false)
  const media = fileURLToPath(new URL('./sample.wav', import.meta.url))
  const pcm = Buffer.alloc(44 + 16000)
  pcm.write('RIFF')
  pcm.writeUInt32LE(pcm.length - 8, 4)
  pcm.write('WAVEfmt ', 8)
  pcm.writeUInt32LE(16, 16)
  pcm.writeUInt16LE(1, 20)
  pcm.writeUInt16LE(1, 22)
  pcm.writeUInt32LE(8000, 24)
  pcm.writeUInt32LE(16000, 28)
  pcm.writeUInt16LE(2, 32)
  pcm.writeUInt16LE(16, 34)
  pcm.write('data', 36)
  pcm.writeUInt32LE(16000, 40)
  await writeFile(media, pcm)
  await player.setProperty('pause', true)
  await player.command(['loadfile', media, 'replace'])
  let duration
  for (let i = 0; i < 200; i++) {
    try {
      duration = await player.getProperty('duration')
      break
    } catch (error) {
      if (!(error instanceof MpvNativeError) || error.code !== -10) {
        throw error
      }
    }
    await setTimeout(10)
  }
  assert.equal(duration, 1)
  const tracks = await player.getProperty('track-list')
  assert.ok(Array.isArray(tracks))
  const track: unknown = tracks[0]
  assert.ok(track && typeof track === 'object' && 'type' in track && 'demux-samplerate' in track)
  assert.equal(track.type, 'audio')
  assert.equal(track['demux-samplerate'], 8000n)
  const abort = new AbortController()
  const slow = player.command(['loadfile', media, 'replace'], { signal: abort.signal })
  abort.abort('cancel')
  await assert.rejects(slow, (error) => error instanceof MpvAbortError)
} finally {
  await Promise.all([player.close(), player.close()])
}
assert.equal(player.hasRef(), false)
await assert.rejects(
  player.getProperty('pause'),
  (error) => error instanceof MpvBindingError && error.code === 'closed' && !error.submitted,
)
