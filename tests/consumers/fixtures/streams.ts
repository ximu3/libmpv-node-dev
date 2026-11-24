import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import {
  createMpv,
  MpvBindingError,
  type MpvStreamRequest,
  type MpvStreamSource,
} from '@ximu3/libmpv-node'

export async function checkStreams(pcm: Uint8Array<ArrayBuffer>) {
  const options = {
    options: [
      ['vo', 'null'],
      ['ao', 'null'],
      ['pause', true],
    ],
  } as const
  await using other = await createMpv(options)
  await using player = await createMpv(options)
  await using channel = await player.createClient()
  const failures: unknown[] = []
  let closed = 0
  let reads = 0
  const uri = 'test-audio://library/one%20second.wav'
  await player.registerProtocol('test-audio', {
    async open(request) {
      assert.equal(request.uri, uri)
      assert.equal(await other.getProperty('pause'), true)
      await assert.rejects(
        channel.getProperty('pause'),
        (e) => e instanceof MpvBindingError && e.code === 'reentrantStreamCall' && !e.submitted,
      )
      let position = 0
      return {
        read(max) {
          reads++
          if (position >= pcm.length) {
            return null
          }
          const part = pcm.subarray(position, position + Math.min(max, 377))
          position += part.length
          return part
        },
        seek(offset) {
          position = Number(offset)
        },
        getSize() {
          return BigInt(pcm.length)
        },
        close() {
          closed++
        },
      }
    },
    onError(failure) {
      failures.push(failure.reason)
    },
  })
  const ready = Promise.withResolvers<void>()
  const watch = await player.observeEvents(
    {
      next(event) {
        if (event.type === 'playback-restart') {
          ready.resolve()
        }
        if (event.type === 'end-file' && event.reason === 'error') {
          ready.reject(new Error('Stream load failed'))
        }
      },
      error: ready.reject,
    },
    { events: ['end-file', 'playback-restart'] },
  )
  await player.command(['loadfile', uri])
  await ready.promise
  await watch.dispose()
  assert.equal(await player.getProperty('duration'), 1)
  await player.close()
  assert.equal(closed, 1)
  assert.ok(reads > 1)
  assert.deepEqual(failures, [])

  const late = await createMpv(options)
  const opened = Promise.withResolvers<MpvStreamRequest>()
  const supply = Promise.withResolvers<MpvStreamSource>()
  const marker = Symbol('close failure')
  const reported: unknown[] = []
  await late.registerProtocol('test-late', {
    open(request) {
      opened.resolve(request)
      return supply.promise
    },
    onError(failure) {
      assert.equal(failure.operation, 'close')
      reported.push(failure.reason)
    },
  })
  const load = late.command(['loadfile', 'test-late://sample']).catch((reason: unknown) => reason)
  const request = await opened.promise
  let ended = false
  const closing = late.close().finally(() => {
    ended = true
  })
  assert.ok(request.signal.aborted)
  await setImmediate()
  assert.equal(ended, false)
  supply.resolve({
    read() {
      return null
    },
    close() {
      throw marker
    },
  })
  await assert.rejects(
    closing,
    (reason) => reason instanceof AggregateError && reason.errors[0] === marker,
  )
  assert.deepEqual(reported, [marker])
  await load
}
