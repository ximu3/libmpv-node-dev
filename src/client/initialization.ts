import { AsyncLocalStorage } from 'node:async_hooks'
import { setImmediate } from 'node:timers/promises'
import { MpvBindingError } from '../errors.js'
import type { LogLevel, MpvLogRecord, MpvNativeLogRecord } from '../logs.js'
import { logLevel, logRecord } from '../logs.js'
import type { MpvObserver } from '../subscriptions.js'

export interface JavaScriptLogs {
  readonly level?: LogLevel
  readonly output?: 'javascript'
  readonly observer: MpvObserver<MpvLogRecord>
}
export interface NativeLogs {
  readonly level?: LogLevel
  readonly output: 'native'
  readonly observer: MpvObserver<MpvNativeLogRecord>
}
export interface DynamicLogs {
  readonly level?: LogLevel
  readonly output: 'javascript' | 'native'
  readonly observer: MpvObserver<MpvLogRecord | MpvNativeLogRecord>
}
export type InitializationLogs = JavaScriptLogs | NativeLogs | DynamicLogs
function receiver<T>(observer: MpvObserver<T>, convert: (message: MpvNativeLogRecord) => T) {
  if (
    !observer ||
    typeof observer.next !== 'function' ||
    typeof observer.error !== 'function' ||
    (observer.complete !== undefined && typeof observer.complete !== 'function')
  ) {
    throw new MpvBindingError('invalidArgument', 'createMpv', false, { stage: 'input' })
  }
  const run = AsyncLocalStorage.snapshot()
  const { next, error, complete } = observer
  return async (messages: readonly MpvNativeLogRecord[], signal?: AbortSignal) => {
    await setImmediate()
    try {
      for (const [index, message] of messages.entries()) {
        if (index && index % 16 === 0) {
          await setImmediate()
        }
        if (signal?.aborted) {
          return
        }
        let value: T
        try {
          value = convert(message)
        } catch (reason) {
          run(() => error.call(observer, reason as Error))
          return
        }
        run(() => next.call(observer, value))
      }
      if (!signal?.aborted && complete) {
        run(() => complete.call(observer))
      }
    } catch (reason) {
      queueMicrotask(() => {
        throw reason
      })
    }
  }
}

export function initializationLogs(config: InitializationLogs | undefined) {
  if (config === undefined) {
    return
  }
  if (
    !config ||
    (config.output !== undefined && config.output !== 'native' && config.output !== 'javascript')
  ) {
    throw new MpvBindingError('invalidArgument', 'createMpv', false, { stage: 'input' })
  }
  const level = logLevel(config.level, 'createMpv')
  if (config.output === 'native') {
    return { level, deliver: receiver(config.observer, (message) => message) }
  }
  return {
    level,
    deliver: receiver(config.observer, (message) => logRecord(message, 'javascript', 'createMpv')),
  }
}
