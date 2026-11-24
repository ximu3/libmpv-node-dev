import { parentPort } from 'node:worker_threads'
import { createMpv } from '@ximu3/libmpv-node'

const player = await createMpv({
  options: [
    ['vo', 'null'],
    ['ao', 'null'],
  ],
})
parentPort.postMessage(player.clientId)
