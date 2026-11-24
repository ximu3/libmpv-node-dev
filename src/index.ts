export { getClientApiVersion, type MpvClientApiVersion } from './library.js'
export { createMpv } from './client/index.js'
export type { Mpv, MpvClient, MpvControl, CreateMpvOptions } from './client/contracts.js'
export {
  MpvError,
  MpvBindingError,
  MpvNativeError,
  MpvAbortError,
  MpvConversionError,
} from './errors.js'
export type { MpvValue, MpvNode } from './values.js'

export type {
  MpvEvent,
  MpvEventName,
  MpvNativeEvent,
  MpvObserver,
  MpvSubscription,
  PropertyState,
} from './subscriptions.js'
export { MpvObservationError, MpvNotificationConversionError } from './errors.js'

export type {
  MpvLogLevel,
  MpvLogRecord,
  MpvLogMessage,
  MpvLogGap,
  MpvNativeLogRecord,
  MpvNativeLogMessage,
} from './logs.js'

export type { MpvHookHandler, MpvHookOptions, MpvHookContext } from './hooks.js'

export {
  getVideoDevices,
  type VideoDeviceInfo,
  type VideoDeviceSelection,
} from './video/devices.js'
