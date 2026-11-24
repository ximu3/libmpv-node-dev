import { resolve } from 'node:path'
import { createMpv, MpvNativeError } from '@ximu3/libmpv-node'

const input = process.argv[2]
if (!input) {
  throw new Error('Pass a local media file')
}
await using player = await createMpv({
  options: [
    ['load-scripts', false],
    ['ao', 'null'],
    ['vo', 'null'],
    ['pause', true],
  ],
})
const loaded = Promise.withResolvers<void>()
await using events = await player.observeEvents(
  {
    next(event) {
      if (event.type === 'file-loaded') {
        loaded.resolve()
      } else if (event.type === 'end-file') {
        loaded.reject(new Error('Could not load the media file'))
      }
    },
    error: loaded.reject,
  },
  { events: ['file-loaded', 'end-file'] },
)
await player.command(['loadfile', resolve(input)])
await loaded.promise
await events.dispose()
const tracks = await player.getProperty('track-list')
const duration = await player.getProperty('duration').catch((error: unknown) => {
  if (error instanceof MpvNativeError && error.nativeName === 'MPV_ERROR_PROPERTY_UNAVAILABLE') {
    return null
  }
  throw error
})
console.log(
  JSON.stringify({
    duration,
    tracks: tracks.map((track) => ({
      id: track.id.toString(),
      type: track.type,
      codec: track.codec,
    })),
  }),
)
