import { AsyncLocalStorage } from 'node:async_hooks'
import { addAbortListener } from 'node:events'
import { MpvAbortError, MpvBindingError, MpvNativeError, MpvObservationError } from './errors.js'
import { library } from './library.js'
import type { NativeClient, NativeFailure } from './native.js'
import type { MpvSubscription, Subscriptions } from './subscriptions.js'

export interface MpvHookContext {
  readonly signal: AbortSignal
}
export interface MpvHookHandler {
  readonly run: (context: MpvHookContext) => void | PromiseLike<void>
  readonly error: (reason: unknown) => void
  readonly complete?: () => void
}
export interface MpvHookOptions {
  readonly priority?: number
  readonly signal?: AbortSignal
}
export interface NativeHook {
  next():
    | { kind: 'run'; token: bigint }
    | { kind: 'end' }
    | { kind: 'interrupted'; reason: 'nativeQueueOverflow' | 'deliveryQueueOverflow' }
    | null
  resume(token: bigint): Promise<number | null>
  dispose(): Promise<number[]>
}

export async function addHook(
  client: NativeClient,
  subscriptions: Subscriptions,
  name: Uint8Array,
  handler: MpvHookHandler,
  options: MpvHookOptions,
  fail: (failure: NativeFailure) => never,
): Promise<MpvSubscription> {
  const priority = options.priority ?? 0
  const signal = options.signal
  if (
    !Number.isInteger(priority) ||
    priority < -0x80000000 ||
    priority > 0x7fffffff ||
    !handler ||
    typeof handler.run !== 'function' ||
    typeof handler.error !== 'function' ||
    (handler.complete !== undefined && typeof handler.complete !== 'function')
  ) {
    throw new MpvBindingError('invalidArgument', 'addHook')
  }
  const inContext = AsyncLocalStorage.snapshot()
  const { run, error: onError, complete } = handler
  const { binding } = await library('addHook')
  if (signal?.aborted) {
    throw new MpvAbortError('addHook', false, signal.reason)
  }
  const gate = binding.NativeCreation.start()
  let hook: NativeHook | undefined
  let published = false
  let stopped = false
  let suppress = false
  let cleanup: Promise<void> | undefined
  let remove: (() => void) | undefined
  const active = new Map<bigint, AbortController>()
  const done = Promise.withResolvers<void>()
  const subscription = {
    get closed() {
      return stopped
    },
    finished: done.promise,
    dispose() {
      suppress = true
      return finish({ kind: 'stop' })
    },
    [Symbol.asyncDispose]() {
      return this.dispose()
    },
  }
  type End = { kind: 'stop' | 'end' } | { kind: 'error'; reason: unknown }
  function finish(end: End) {
    if (cleanup) {
      return cleanup
    }
    stopped = true
    // Establish cleanup before abort listeners can dispose this registration again.
    const result = Promise.withResolvers<void>()
    cleanup = result.promise
    for (const controller of active.values()) {
      controller.abort()
    }
    active.clear()
    cancellation?.[Symbol.dispose]()
    void (async () => {
      try {
        const codes = (await hook?.dispose()) ?? []
        const failures: unknown[] = codes.map((code) => new MpvNativeError(code, 'continueHook'))
        if (end.kind === 'error') {
          failures.unshift(end.reason)
        }
        const reason =
          failures.length > 1
            ? new AggregateError(failures, 'Hook execution and cleanup failed.')
            : failures[0]
        if (!suppress) {
          try {
            if (failures.length) {
              inContext(() => onError.call(handler, reason))
            } else if (complete && end.kind === 'end') {
              inContext(() => complete.call(handler))
            }
          } catch (exception) {
            queueMicrotask(() => {
              throw exception
            })
          }
        }
        if (end.kind === 'stop' && failures.length) {
          result.reject(reason)
        } else {
          result.resolve()
        }
      } catch (exception) {
        result.reject(exception)
      } finally {
        remove?.()
        done.resolve()
      }
    })()
    return cleanup
  }
  function start(token: bigint) {
    const controller = new AbortController()
    active.set(token, controller)
    let result: void | PromiseLike<void>
    try {
      result = inContext(() => run.call(handler, { signal: controller.signal }))
    } catch (reason) {
      void finish({ kind: 'error', reason })
      return
    }
    void Promise.resolve(result)
      .then(
        async () => {
          if (!active.delete(token) || stopped) {
            return
          }
          const code = await hook!.resume(token)
          if (code != null && !stopped) {
            await finish({ kind: 'error', reason: new MpvNativeError(code, 'continueHook') })
          }
        },
        (reason: unknown) => {
          if (active.has(token) && !stopped) {
            return finish({ kind: 'error', reason })
          }
        },
      )
      .catch((reason: unknown) => {
        if (!stopped) {
          void finish({ kind: 'error', reason })
        }
      })
  }
  function drain() {
    if (!published || !hook || stopped) {
      return
    }
    for (let i = 0; i < 16 && !stopped; i++) {
      const item = hook.next()
      if (!item) {
        return
      }
      if (item.kind === 'end') {
        void finish({ kind: 'end' })
        return
      }
      if (item.kind === 'interrupted') {
        void finish({ kind: 'error', reason: new MpvObservationError(item.reason, 'addHook') })
        return
      }
      start(item.token)
    }
    if (!stopped) {
      setImmediate(drain)
    }
  }
  const cancellation =
    signal &&
    addAbortListener(signal, () => {
      if (hook) {
        void subscription.dispose()
      } else {
        gate.abort()
      }
    })
  try {
    const result = await client.addHook(name, priority, drain, gate)
    if ('error' in result) {
      return fail(result)
    }
    hook = result.hook
    if (signal?.aborted || client.closing) {
      await subscription.dispose()
      if (signal?.aborted) {
        throw new MpvAbortError('addHook', true, signal.reason)
      }
      throw new MpvBindingError('closed', 'addHook', true)
    }
    remove = subscriptions.track(subscription)
    setImmediate(() => {
      published = true
      drain()
    })
    return subscription
  } catch (reason) {
    cancellation?.[Symbol.dispose]()
    throw reason
  }
}
