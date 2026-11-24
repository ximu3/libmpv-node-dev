import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createMpv, type NativeFrame, type VideoTarget, type MpvValue } from '@ximu3/libmpv-node'

const chart = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [128, 64, 32],
  [255, 255, 255],
  [0, 0, 0],
] as const
const p3 = [
  [234, 51, 35],
  [117, 251, 76],
  [0, 0, 245],
  [120, 67, 39],
  [255, 255, 255],
  [0, 0, 0],
] as const
const positions = chart.map((_, i) => [((i % 3) + 0.5) / 3, i < 3 ? 0.25 : 0.75] as const)
const steps = Array.from({ length: 7 }, (_, i) => [(i + 0.5) / 7, 0.3] as const)
const file = (name: string) => fileURLToPath(new URL('../media/' + name, import.meta.url))
type Points = readonly (readonly [number, number])[]
function readShot(value: MpvValue, points: Points) {
  assert.ok(
    value &&
      typeof value === 'object' &&
      'w' in value &&
      typeof value.w === 'bigint' &&
      typeof value.h === 'bigint' &&
      typeof value.stride === 'bigint',
  )
  assert.ok(value.data instanceof Uint8Array)
  const { w, h, stride, data } = value
  const samples = points.map(([x, y]) => {
    const offset = Math.floor(y * Number(h)) * Number(stride) + Math.floor(x * Number(w)) * 4
    return Array.from(data.subarray(offset, offset + 4))
  })
  return { source: value.source, samples }
}
function compare(
  actual: readonly (readonly number[])[],
  expected: readonly (readonly number[])[],
  error: number,
) {
  assert.equal(actual.length, expected.length)
  for (let i = 0; i < actual.length; i++) {
    assert.ok(
      expected[i]!.every((v, k) => Math.abs(actual[i]![k]! - v) <= error),
      JSON.stringify({ i, actual: actual[i], expected: expected[i] }),
    )
    assert.equal(actual[i]![3], 255)
  }
}

async function render(colorSpace: VideoTarget['colorSpace'], hdr: boolean, decoder = 'no') {
  const points = hdr ? [...steps, [0.1, 0.82] as const] : positions
  await using player = await createMpv({
    videoOutput: { width: hdr ? 224 : 63, height: hdr ? 64 : 47, target: { colorSpace } },
    options: [
      ['load-scripts', false],
      ['ao', 'null'],
      ['pause', true],
      ['keep-open', 'yes'],
      ['keepaspect', false],
      ['osd-level', '0'],
      ['dither-depth', 'no'],
      ['hwdec', decoder],
      ['image-display-duration', 'inf'],
    ],
  })
  const messages: string[] = []
  if (decoder !== 'no') {
    await player.observeLogs(
      {
        next(record) {
          if (
            record.type === 'log-message' &&
            /d3d|hardware|hwdec|hevc|decoder/i.test(record.text)
          ) {
            messages.push(record.prefix + ' ' + record.text.trim())
          }
        },
        error: console.error,
      },
      { level: 'v' },
    )
  }
  const ready = Promise.withResolvers<void>()
  await using events = await player.observeEvents(
    {
      next(event) {
        if (event.type === 'playback-restart') {
          ready.resolve()
        } else if (event.type === 'end-file' && event.reason === 'error') {
          ready.reject(new Error('Color fixture failed to load'))
        }
      },
      error: ready.reject,
    },
    { events: ['playback-restart', 'end-file'] },
  )
  const options: Record<string, string> = { 'sub-auto': 'no' }
  if (hdr) {
    options['sub-file'] = file('chart-overlay.ass')
  }
  let media = hdr ? 'pq-steps.mkv' : 'color-chart.png'
  if (decoder !== 'no') {
    media = 'pq-main10.mkv'
  }
  await player.command(['loadfile', file(media), 'replace', -1n, options])
  await ready.promise
  await events.dispose()
  if (decoder !== 'no') {
    assert.equal(await player.getProperty('hwdec-current'), decoder, messages.join('\n'))
  }
  const normal = readShot(await player.command(['screenshot-raw', 'subtitles', 'rgba']), points)
  assert.equal(normal.source, 'vo')
  if (hdr) {
    assert.equal(await player.getProperty('video-params/gamma'), 'pq')
    assert.equal(await player.getProperty('video-params/primaries'), 'bt.2020')
    assert.equal(await player.getProperty('sid'), 1n)
    assert.ok(
      steps.slice(1).every((_, i) => normal.samples[i + 1]![0]! > normal.samples[i]![0]!),
      JSON.stringify(normal.samples),
    )
    compare([normal.samples.at(-1)!], [[255, 0, 0]], 3)
  } else {
    compare(normal.samples, colorSpace === 'srgb' ? chart : p3, 2)
  }
  const promise = Promise.withResolvers<NativeFrame>()
  let taken = false
  const watch = await player.videoOutput.observeFrames({
    next(frame) {
      if (taken) {
        frame.release()
      } else {
        taken = true
        promise.resolve(frame)
      }
    },
    error: promise.reject,
  })
  using frame = await promise.promise
  await watch.dispose()
  if (process.versions.electron) {
    const { sampleElectronFrame } = await import('./electron/shared.js')
    const display = await sampleElectronFrame(frame, points)
    if (hdr) {
      assert.ok(
        steps.slice(1).every((_, i) => display[i + 1]![0]! > display[i]![0]!),
        JSON.stringify(display),
      )
      assert.ok(display[0]![0]! < 10 && display[6]![0]! > 240)
      compare([display.at(-1)!], [[255, 0, 0]], 3)
    } else {
      compare(display, chart, 3)
    }
    if (colorSpace === 'display-p3') {
      const mislabeled = await sampleElectronFrame(frame, points, 'srgb')
      assert.ok(
        mislabeled.some((pixel, i) =>
          pixel.some((v, k) => k < 3 && Math.abs(v - chart[i]![k]!) > 40),
        ),
      )
    }
  }
  await player.setProperty('screenshot-sw', true)
  const software = readShot(await player.command(['screenshot-raw', 'subtitles', 'rgba']), points)
  assert.equal(software.source, 'software')
  console.log(
    JSON.stringify({ colorSpace, hdr, decoder, vo: normal.samples, software: software.source }),
  )
}

export async function checkColorOutput() {
  await render('srgb', false)
  await render('display-p3', false)
  await render('srgb', true)
  const decoder = { win32: 'd3d11va', darwin: 'videotoolbox', linux: 'vaapi' } as const
  await render('srgb', true, decoder[process.platform as keyof typeof decoder])
}
