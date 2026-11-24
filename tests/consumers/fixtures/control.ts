import { checkSubtitleFonts } from './subtitle-fonts.js'
import { checkGpuVideo } from './gpu.js'
import { checkSoftwareVideo } from './software.js'
import { checkControlLoad } from './pressure.js'
import { checkStreams } from './streams.js'
import { Worker } from 'node:worker_threads'
import { once } from 'node:events'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { setTimeout } from 'node:timers/promises'
import assert from 'node:assert/strict'
import { getClientApiVersion, getVideoDevices } from '@ximu3/libmpv-node'

const devices = await getVideoDevices()
for (const device of devices) {
  assert.equal(device.selection.platform, process.platform)
  assert.ok(device.name.length)
}
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
let failedStartupComplete = false
await assert.rejects(
  createMpv({
    options: [['unknown-w08-option', 0]],
    initializationLogs: {
      observer: {
        next() {},
        error(error) {
          throw error
        },
        complete() {
          failedStartupComplete = true
        },
      },
    },
  }),
  (error) => error instanceof MpvNativeError && error.creation?.stage === 'options',
)
assert.ok(failedStartupComplete)

let initializationComplete = false
let startupLines = 0
const player = await createMpv({
  initializationLogs: {
    level: 'trace',
    output: 'native',
    observer: {
      next(record) {
        if (record.type === 'log-message') {
          assert.ok(record.text instanceof Uint8Array)
          startupLines++
        }
      },
      error(error) {
        throw error
      },
      complete() {
        initializationComplete = true
      },
    },
  },
  options: [
    ['load-scripts', false],
    ['vo', 'null'],
    ['ao', 'null'],
    ['pause', true],
  ],
})
try {
  assert.equal(initializationComplete, true)
  assert.ok(startupLines > 0)
  const logLine = Promise.withResolvers<string>()
  const logs = await player.observeLogs({
    next(record) {
      if (record.type === 'log-message' && record.text.includes('w08-diagnostic-sample')) {
        assert.equal(record.level, 'info')
        logLine.resolve(record.text)
      }
    },
    error: logLine.reject,
  })
  await player.command(['print-text', 'w08-diagnostic-sample'])
  assert.equal(await logLine.promise, 'w08-diagnostic-sample\n')
  await logs.dispose()
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
  const channel = await player.createClient({ name: 'control-test' })
  const firstValue = Promise.withResolvers<boolean>()
  let watchPublished = false
  let notices = 0
  const propertyWatch = await channel.observeProperty('pause', {
    next(state) {
      assert.ok(watchPublished)
      if (state.status === 'available') {
        firstValue.resolve(state.value)
      }
      notices++
    },
    error: firstValue.reject,
  })
  watchPublished = true
  assert.equal(await firstValue.promise, false)
  await propertyWatch.dispose()
  await player.setProperty('pause', true)
  assert.equal(await channel.getProperty('pause'), true)
  assert.equal(notices, 1)

  const message = Promise.withResolvers<readonly string[]>()
  let completed = 0
  const subscription = await channel.observeEvents(
    {
      next(event) {
        if (event.type === 'client-message') {
          message.resolve(event.args)
        }
      },
      error: message.reject,
      complete() {
        completed++
      },
    },
    { events: ['client-message'] },
  )
  await player.command(['script-message-to', channel.clientName, 'hello', ''])
  assert.deepEqual(await message.promise, ['hello', ''])
  await channel.dispose()
  assert.equal(subscription.closed, true)
  assert.equal(completed, 0)
  await assert.rejects(
    channel.getProperty('pause'),
    (error) => error instanceof MpvBindingError && error.code === 'closed',
  )
  await player.setProperty('pause', false)
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
  await checkStreams(pcm)
  await player.setProperty('pause', true)
  const started = Promise.withResolvers<AbortSignal>()
  const pendingHook = Promise.withResolvers<void>()
  const hook = await player.addHook('on_load', {
    async run({ signal }) {
      assert.equal(await player.getProperty('pause'), true)
      started.resolve(signal)
      return pendingHook.promise
    },
    error(reason) {
      throw reason
    },
  })
  const load = player.command(['loadfile', media, 'replace'])
  const execution = await started.promise
  assert.equal(execution.aborted, false)
  await hook.dispose()
  assert.equal(execution.aborted, true)
  assert.equal(hook.closed, true)
  pendingHook.reject(new Error('Late hook result'))
  await load
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
  const rejected = Promise.withResolvers<unknown>()
  const marker = Symbol('hook failure')
  const brokenHook = await player.addHook('on_load', {
    run() {
      throw marker
    },
    error: rejected.resolve,
  })
  await player.command(['loadfile', media, 'replace'])
  assert.equal(await rejected.promise, marker)
  assert.equal(brokenHook.closed, true)
  const activeChild = await player.createClient()
  let childCompleted = false
  await activeChild.observeEvents(
    {
      next() {
        assert.fail('Empty event selection received an event')
      },
      error(error) {
        throw error
      },
      complete() {
        childCompleted = true
      },
    },
    { events: [] },
  )
  await player.close()
  assert.equal(childCompleted, true)
  await activeChild.dispose()
} finally {
  await Promise.all([player.close(), player.close()])
}
assert.equal(player.hasRef(), false)
await assert.rejects(
  player.getProperty('pause'),
  (error) => error instanceof MpvBindingError && error.code === 'closed' && !error.submitted,
)

await checkSubtitleFonts()
await checkSoftwareVideo()
await checkControlLoad()
if (process.env.LIBMPV_TEST_GRAPHICS === '1') {
  await checkGpuVideo()
}
