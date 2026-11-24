import { parentPort } from 'node:worker_threads'
import { createMpv } from '@ximu3/libmpv-node'

const player = await createMpv({
  options: [
    ['vo', 'null'],
    ['ao', 'null'],
  ],
})
await player.registerProtocol('worker-stream', {
  open() {
    parentPort!.postMessage(player.clientId)
    return new Promise(() => {})
  },
  onError(failure) {
    throw failure.reason
  },
})
await player.command(['loadfile', 'worker-stream://pending'])
