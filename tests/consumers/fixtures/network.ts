import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { createMpv } from '@ximu3/libmpv-node'

async function open(url: string, codec: string) {
  await using player = await createMpv({
    options: [
      ['load-scripts', false],
      ['vo', 'null'],
      ['ao', 'null'],
      ['pause', true],
      ['tls-verify', true],
      ['network-timeout', 10],
    ],
  })
  const opened = Promise.withResolvers<void>()
  await using watch = await player.observeEvents(
    {
      next(event) {
        if (event.type === 'file-loaded') {
          opened.resolve()
        } else if (event.type === 'end-file' && event.reason === 'error') {
          opened.reject(new Error('Could not load ' + new URL(url).protocol + ' media'))
        }
      },
      error: opened.reject,
    },
    { events: ['file-loaded', 'end-file'] },
  )
  await player.command(['loadfile', url])
  await opened.promise
  await watch.dispose()
  assert.equal(await player.getProperty('track-list/0/codec'), codec)
}
async function checkAudio(url: string, backend: string) {
  await using player = await createMpv({
    options: [
      ['load-scripts', false],
      ['video', 'no'],
      ['ao', backend],
      ['mute', true],
      ...(backend === 'alsa' ? [['audio-device', 'alsa/null'] as const] : []),
    ],
  })
  const playing = Promise.withResolvers<void>()
  const ended = Promise.withResolvers<void>()
  await using watch = await player.observeEvents(
    {
      next(event) {
        if (event.type === 'playback-restart') {
          playing.resolve()
        } else if (event.type === 'end-file') {
          if (event.reason === 'eof') {
            ended.resolve()
          } else {
            const reason = new Error('Audio output ended: ' + event.reason)
            playing.reject(reason)
            ended.resolve()
          }
        }
      },
      error: playing.reject,
    },
    { events: ['playback-restart', 'end-file'] },
  )
  await player.command(['loadfile', url])
  await playing.promise
  assert.equal(await player.getProperty('current-ao'), backend)
  const rate = await player.getProperty('audio-out-params/samplerate')
  assert.ok(typeof rate === 'bigint' && rate > 0n)
  await ended.promise
  await watch.dispose()
  console.log(JSON.stringify({ backend, sampleRate: rate.toString(), silentPlayback: 'eof' }))
}
export async function checkNetwork(pcm: Uint8Array) {
  await using server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': pcm.byteLength })
    response.end(pcm)
  })
  const listening = once(server, 'listening')
  server.listen(0, '127.0.0.1')
  await listening
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const url = 'http://127.0.0.1:' + address.port + '/audio.wav'
  await open(url, 'pcm_s16le')
  for (const backend of (process.env.LIBMPV_TEST_AUDIO ?? '').split(',').filter(Boolean)) {
    await checkAudio(url, backend)
  }
  if (process.env.LIBMPV_TEST_HTTPS === '1') {
    await open(
      'https://raw.githubusercontent.com/ximu3/libmpv-node-dev/3cf430b8ee6ca5e029eb86f3fdd868e7841516d2/tests/consumers/fixtures/media/subtitle-font.mkv',
      'ffv1',
    )
    console.log('Verified HTTPS media with certificate verification enabled')
  }
}
