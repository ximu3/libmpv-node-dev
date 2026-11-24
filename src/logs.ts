import { MpvBindingError, MpvNotificationConversionError } from './errors.js'
import type { MpvOperation } from './errors.js'

const levels = ['fatal', 'error', 'warn', 'info', 'v', 'debug', 'trace'] as const
export type MpvLogLevel = (typeof levels)[number]
export type LogLevel = MpvLogLevel | 'terminal-default'
export type LogMessage<T> = {
  readonly type: 'log-message'
  readonly prefix: T
  readonly text: T
  readonly level: MpvLogLevel
  readonly levelCode: number
}
export type MpvLogMessage = LogMessage<string>
export type MpvNativeLogMessage = LogMessage<Uint8Array<ArrayBuffer>>
export type MpvLogGap =
  | { readonly type: 'gap'; readonly sources: readonly ['binding']; readonly droppedCount: bigint }
  | {
      readonly type: 'gap'
      readonly sources: readonly ['mpv'] | readonly ['mpv', 'binding']
      readonly droppedCount: null
    }
export type MpvLogRecord = MpvLogMessage | MpvLogGap
export type MpvNativeLogRecord = MpvNativeLogMessage | MpvLogGap
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

export function logLevel(value: LogLevel | undefined, operation: MpvOperation) {
  if (value === undefined) {
    return 'info'
  }
  if (value === 'terminal-default' || levels.includes(value)) {
    return value
  }
  throw new MpvBindingError('invalidArgument', operation)
}

export function logRecord(
  record: MpvNativeLogRecord,
  output: 'javascript',
  operation: MpvOperation,
): MpvLogRecord
export function logRecord(
  record: MpvNativeLogRecord,
  output: 'native',
  operation: MpvOperation,
): MpvNativeLogRecord
export function logRecord(
  record: MpvNativeLogRecord,
  output: 'native' | 'javascript',
  operation: MpvOperation,
): MpvNativeLogRecord | MpvLogRecord
export function logRecord(
  record: MpvNativeLogRecord,
  output: 'native' | 'javascript',
  operation: MpvOperation,
): MpvNativeLogRecord | MpvLogRecord {
  if (output === 'native' || record.type === 'gap') {
    return record
  }
  try {
    return { ...record, prefix: decoder.decode(record.prefix), text: decoder.decode(record.text) }
  } catch {
    throw new MpvNotificationConversionError(operation, record)
  }
}
