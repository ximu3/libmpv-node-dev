import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createMpv, type MpvValue } from '@ximu3/libmpv-node'

const media = fileURLToPath(new URL('../media/subtitle-font.mkv', import.meta.url))

function isMap(value: MpvValue): value is Readonly<Record<string, MpvValue>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Uint8Array)
  )
}

async function pixels(provider: 'auto' | 'none', attachments: boolean) {
  await using player = await createMpv({
    options: [
      ['load-scripts', false],
      ['vo', 'null'],
      ['ao', 'null'],
      ['pause', true],
      ['screenshot-sw', true],
      ['sid', 1n],
      ['sub-font-provider', provider],
      ['embeddedfonts', attachments],
    ],
  })
  console.log('Checking subtitle fonts', provider, attachments)
  const trace: string[] = []
  await using diagnostics = await player.observeLogs(
    {
      next(record) {
        if (record.type === 'log-message') {
          trace.push(record.prefix + ': ' + record.text.trimEnd())
          if (trace.length > 35) {
            trace.shift()
          }
        }
      },
      error(cause) {
        console.error(cause)
      },
    },
    { level: 'v' },
  )
  async function playback(promise: Promise<void>, stage: string) {
    const timeout = Promise.withResolvers<never>()
    const timer = setTimeout(
      () => timeout.reject(new Error('Timed out waiting for ' + stage + '\n' + trace.join('\n'))),
      10000,
    )
    try {
      await Promise.race([promise, timeout.promise])
    } finally {
      clearTimeout(timer)
    }
  }
  const ready = Promise.withResolvers<void>()
  const observations = await player.observeEvents(
    {
      next(event) {
        trace.push('event ' + event.type)
        if (event.type === 'playback-restart') {
          ready.resolve()
        }
        if (event.type === 'end-file' && event.reason === 'error') {
          ready.reject(new Error('Test media could not be decoded: ' + trace.join('\n')))
        }
      },
      error: ready.reject,
    },
    { events: ['playback-restart', 'end-file'] },
  )
  await player.command(['loadfile', media, 'replace'])
  await playback(ready.promise, 'initial video frame')
  const afterSeek = Promise.withResolvers<void>()
  const seekEvents = await player.observeEvents(
    {
      next() {
        afterSeek.resolve()
      },
      error: afterSeek.reject,
    },
    { events: ['playback-restart'] },
  )
  await player.command(['seek', 1, 'absolute+exact'])
  await playback(afterSeek.promise, 'accurate seek')
  await seekEvents.dispose()
  await observations.dispose()
  const shot = await player.command(['screenshot-raw', 'subtitles', 'bgra'])
  assert.ok(isMap(shot))
  assert.equal(shot.source, 'software')
  assert.equal(shot.format, 'bgra')
  assert.equal(shot.w, 160n)
  assert.equal(shot.h, 96n)
  assert.equal(typeof shot.stride, 'bigint')
  assert.ok(shot.data instanceof Uint8Array)
  const stride = Number(shot.stride)
  const visible = new Uint8Array(160 * 96)
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 160; x++) {
      visible[y * 160 + x] = shot.data[y * stride + x * 4]! > 180 ? 1 : 0
    }
  }
  return visible
}

export async function checkSubtitleFonts() {
  const empty = await pixels('none', false)
  const system = await pixels('auto', false)
  const embedded = await pixels('none', true)
  const automatic = await pixels('auto', true)
  assert.ok(!empty.includes(1))
  assert.ok(system.includes(1))
  assert.ok(embedded.includes(1))
  assert.notDeepEqual(embedded, system)
  assert.deepEqual(automatic, embedded)
}
