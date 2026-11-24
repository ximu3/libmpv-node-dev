import type { MpvNativeLogMessage } from './logs.js'
import type { MpvNativeEvent } from './subscriptions.js'
import type { MpvNode } from './values.js'

export type MpvOperation =
  | 'getClientApiVersion'
  | 'getVideoDevices'
  | 'createMpv'
  | 'createClient'
  | 'command'
  | 'addHook'
  | 'continueHook'
  | 'getProperty'
  | 'getPropertyText'
  | 'observeProperty'
  | 'observePropertyText'
  | 'observeEvents'
  | 'observeLogs'
  | 'setProperty'
  | 'loadConfigFile'
  | 'getTimeNs'
  | 'close'
export type MpvBindingErrorCode =
  | 'libraryLoadFailed'
  | 'incompatibleLibrary'
  | 'invalidArgument'
  | 'closed'
  | 'resourceLimit'
  | 'unsupportedFormat'
  | 'unsupportedCapability'
  | 'resourceCreationFailed'
  | 'internalFailure'
  | 'ABORT_ERR'
  | 'valueConversion'
  | 'observationInterrupted'
  | 'notificationConversion'
export type Creation =
  | {
      readonly stage: 'input' | 'library' | 'core' | 'initializationLogs' | 'initialize' | 'publish'
    }
  | { readonly stage: 'options'; readonly optionIndex: number }
const names: Readonly<Record<number, string>> = {
  '-1': 'MPV_ERROR_EVENT_QUEUE_FULL',
  '-2': 'MPV_ERROR_NOMEM',
  '-3': 'MPV_ERROR_UNINITIALIZED',
  '-4': 'MPV_ERROR_INVALID_PARAMETER',
  '-5': 'MPV_ERROR_OPTION_NOT_FOUND',
  '-6': 'MPV_ERROR_OPTION_FORMAT',
  '-7': 'MPV_ERROR_OPTION_ERROR',
  '-8': 'MPV_ERROR_PROPERTY_NOT_FOUND',
  '-9': 'MPV_ERROR_PROPERTY_FORMAT',
  '-10': 'MPV_ERROR_PROPERTY_UNAVAILABLE',
  '-11': 'MPV_ERROR_PROPERTY_ERROR',
  '-12': 'MPV_ERROR_COMMAND',
  '-13': 'MPV_ERROR_LOADING_FAILED',
  '-14': 'MPV_ERROR_AO_INIT_FAILED',
  '-15': 'MPV_ERROR_VO_INIT_FAILED',
  '-16': 'MPV_ERROR_NOTHING_TO_PLAY',
  '-17': 'MPV_ERROR_UNKNOWN_FORMAT',
  '-18': 'MPV_ERROR_UNSUPPORTED',
  '-19': 'MPV_ERROR_NOT_IMPLEMENTED',
  '-20': 'MPV_ERROR_GENERIC',
}

export abstract class MpvError extends Error {
  abstract readonly source: 'mpv' | 'binding'
  abstract readonly code: number | MpvBindingErrorCode
  declare readonly creation?: Creation
  protected constructor(
    message: string,
    readonly operation: MpvOperation,
    readonly submitted: boolean,
    creation?: Creation,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
    if (creation) {
      this.creation = creation
    }
  }
}

export class MpvNativeError extends MpvError {
  readonly source = 'mpv' as const
  readonly nativeName: string | null
  constructor(
    readonly code: number,
    operation: MpvOperation,
    creation?: Creation,
  ) {
    super('libmpv could not complete the operation.', operation, true, creation)
    this.nativeName = names[code] ?? null
  }
}

export class MpvBindingError extends MpvError {
  readonly source = 'binding' as const
  constructor(
    readonly code: MpvBindingErrorCode,
    operation: MpvOperation,
    submitted = false,
    creation?: Creation,
    options?: ErrorOptions,
  ) {
    super(
      `The binding could not complete ${operation} (${code}).`,
      operation,
      submitted,
      creation,
      options,
    )
  }
}

export class MpvAbortError extends MpvBindingError {
  declare readonly code: 'ABORT_ERR'
  constructor(operation: MpvOperation, submitted: boolean, reason: unknown, creation?: Creation) {
    super('ABORT_ERR', operation, submitted, creation, { cause: reason })
    this.name = 'AbortError'
  }
}

export class MpvConversionError extends MpvBindingError {
  declare readonly code: 'valueConversion'
  #node: MpvNode
  constructor(
    readonly reason: 'invalidUtf8' | 'duplicateMapKey' | 'unexpectedShape',
    operation: MpvOperation,
    node: MpvNode,
  ) {
    super('valueConversion', operation, true)
    this.#node = node
  }
  getNativeValue(): MpvNode {
    return structuredClone(this.#node)
  }
}

export class MpvObservationError extends MpvBindingError {
  declare readonly code: 'observationInterrupted'
  constructor(
    readonly reason: 'nativeQueueOverflow' | 'deliveryQueueOverflow',
    operation: MpvOperation,
  ) {
    super('observationInterrupted', operation, true)
  }
}

export class MpvNotificationConversionError extends MpvBindingError {
  declare readonly code: 'notificationConversion'
  readonly reason = 'invalidUtf8' as const
  #notification: MpvNativeEvent | MpvNativeLogMessage
  constructor(operation: MpvOperation, notification: MpvNativeEvent | MpvNativeLogMessage) {
    super('notificationConversion', operation, true)
    this.#notification = notification
  }
  getNativeNotification() {
    return structuredClone(this.#notification)
  }
}
