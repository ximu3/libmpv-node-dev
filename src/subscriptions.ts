import type { CoreStreams } from './streams/index.js'
import { AsyncResource } from 'node:async_hooks'
import { addAbortListener } from 'node:events'
import { MpvAbortError, MpvBindingError, MpvObservationError } from './errors.js'
import type { MpvOperation } from './errors.js'
import type { NativeClient, NativeFailure } from './native.js'

import { library } from './library.js'

export interface MpvObserver<T> {
  readonly next: (value: T) => void
  readonly error: (error: Error) => void
  readonly complete?: () => void
}

export interface MpvSubscription {
  readonly closed: boolean
  dispose(): Promise<void>
  [Symbol.asyncDispose](): Promise<void>
}

export type PropertyState<T> =
  | { readonly status: 'available'; readonly value: T }
  | { readonly status: 'unavailable' }
export const events = {
  shutdown: 1,
  'start-file': 6,
  'end-file': 7,
  'file-loaded': 8,
  idle: 11,
  tick: 14,
  'client-message': 16,
  'video-reconfig': 17,
  'audio-reconfig': 18,
  seek: 20,
  'playback-restart': 21,
} as const
export type MpvEventName = keyof typeof events
type EndReason = 'eof' | 'stop' | 'quit' | 'error' | 'redirect' | 'unknown'
export type EventRecord<T> =
  | { readonly type: 'start-file'; readonly playlistEntryId: bigint }
  | {
      readonly type: 'end-file'
      readonly reason: EndReason
      readonly reasonCode: number
      readonly errorCode: number
      readonly playlistEntryId: bigint
      readonly playlistInsertId: bigint
      readonly playlistInsertCount: number
    }
  | { readonly type: 'client-message'; readonly args: readonly T[] }
  | { readonly type: Exclude<MpvEventName, 'start-file' | 'end-file' | 'client-message'> }

export type MpvEvent = EventRecord<string>
export type MpvNativeEvent = EventRecord<Uint8Array<ArrayBuffer>>
export type Notice<T> =
  | { kind: 'value'; value: T }
  | { kind: 'unavailable' | 'end' }
  | { kind: 'interrupted'; reason: 'nativeQueueOverflow' | 'deliveryQueueOverflow' }
  | { kind: 'error'; failure: NativeFailure }
export interface NativeWatch<T> {
  next(): Notice<T> | null
  dispose(): Promise<void>
}

export class Subscriptions {
  readonly active = new Set<{ dispose(): Promise<void>; finished: Promise<void> }>()

  constructor(
    readonly streams: CoreStreams,
    private readonly parent?: Subscriptions,
  ) {}

  track(subscription: { dispose(): Promise<void>; finished: Promise<void> }) {
    this.active.add(subscription)
    this.parent?.active.add(subscription)
    return () => {
      this.active.delete(subscription)
      this.parent?.active.delete(subscription)
    }
  }

  async observe<P, T>(
    client: NativeClient,
    operation: MpvOperation,
    register: (
      wake: () => void,
      gate: { abort(): void },
    ) => Promise<{ watch: NativeWatch<P> } | NativeFailure>,
    observer: MpvObserver<T>,
    signal: AbortSignal | undefined,
    convert: (payload: P | null) => T,
    fail: (failure: NativeFailure) => never,
  ): Promise<MpvSubscription> {
    this.streams.check(operation)
    if (
      !observer ||
      typeof observer.next !== 'function' ||
      typeof observer.error !== 'function' ||
      (observer.complete !== undefined && typeof observer.complete !== 'function')
    ) {
      throw new MpvBindingError('invalidArgument', operation)
    }
    const next = observer.next
    const onError = observer.error
    const complete = observer.complete
    const context = new AsyncResource('libmpv subscription')
    let stopped = false
    let published = false
    let handle: NativeWatch<P> | undefined
    let cleanup: Promise<void> | undefined
    let cancellation: Disposable | undefined
    const end = Promise.withResolvers<void>()
    const core = this.streams
    const subscription = {
      get closed() {
        return stopped
      },
      finished: end.promise,
      dispose() {
        try {
          core.check('disposeSubscription')
        } catch (error) {
          return Promise.reject(error)
        }
        stopped = true
        return release()
      },
      [Symbol.asyncDispose]() {
        return this.dispose()
      },
    }
    let untrack: (() => void) | undefined
    function release() {
      if (cleanup) {
        return cleanup
      }
      cancellation?.[Symbol.dispose]()
      cleanup = (handle?.dispose() ?? Promise.resolve()).finally(() => {
        untrack?.()
        context.emitDestroy()
        end.resolve()
      })
      return cleanup
    }
    function notifyFailure(reason: unknown) {
      stopped = true
      try {
        context.runInAsyncScope(onError, observer, reason as Error)
      } finally {
        void release()
      }
    }

    function drain() {
      if (!published || !handle || stopped) {
        return
      }
      try {
        for (let i = 0; i < 16 && !stopped; i++) {
          const notice = handle.next()
          if (!notice) {
            return
          }
          if (notice.kind === 'end') {
            stopped = true
            try {
              if (complete) {
                context.runInAsyncScope(complete, observer)
              }
            } finally {
              void release()
            }
            return
          }
          let value: T
          try {
            if (notice.kind === 'interrupted') {
              throw new MpvObservationError(notice.reason, operation)
            }
            if (notice.kind === 'error') {
              fail(notice.failure)
            }
            value = convert(notice.kind === 'value' ? notice.value : null)
          } catch (error) {
            notifyFailure(error)
            return
          }
          context.runInAsyncScope(next, observer, value)
        }
        if (!stopped) {
          setImmediate(drain)
        }
      } catch (error) {
        void subscription.dispose()
        queueMicrotask(() => {
          throw error
        })
      }
    }

    const { binding } = await library(operation)
    if (signal?.aborted) {
      context.emitDestroy()
      throw new MpvAbortError(operation, false, signal.reason)
    }
    const gate = binding.NativeCreation.start()
    cancellation =
      signal &&
      addAbortListener(signal, () => {
        if (handle) {
          stopped = true
          void release()
        } else {
          gate.abort()
        }
      })
    try {
      const result = await register(drain, gate)
      if ('error' in result) {
        return fail(result)
      }
      handle = result.watch
      if (signal?.aborted || client.closing) {
        await subscription.dispose()
        if (signal?.aborted) {
          throw new MpvAbortError(operation, true, signal.reason)
        }
        throw new MpvBindingError('closed', operation, true)
      }
      untrack = this.track(subscription)
      setImmediate(() => {
        published = true
        drain()
      })
      return subscription
    } catch (error) {
      await release()
      throw error
    }
  }
}
