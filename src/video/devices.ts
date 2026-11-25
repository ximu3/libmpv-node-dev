import { callSignal } from '../client/options.js'
import { addAbortListener } from 'node:events'
import { library } from '../library.js'
import { MpvAbortError, MpvBindingError } from '../errors.js'

export type VideoDeviceSelection =
  | { readonly platform: 'win32'; readonly adapterLuid: bigint }
  | { readonly platform: 'darwin'; readonly rendererId: number }
  | { readonly platform: 'linux'; readonly renderNode: string }

export interface VideoDeviceInfo {
  readonly name: string
  readonly selection: VideoDeviceSelection
}

export async function getVideoDevices(
  options: { readonly signal?: AbortSignal } = {},
): Promise<readonly VideoDeviceInfo[]> {
  const operation = 'getVideoDevices'
  const signal = callSignal(options, operation)
  if (signal?.aborted) {
    throw new MpvAbortError(operation, false, signal.reason)
  }
  const { binding } = await library(operation)
  if (signal?.aborted) {
    throw new MpvAbortError(operation, false, signal.reason)
  }
  const operationState = binding.NativeCreation.start()
  const listener = signal && addAbortListener(signal, () => operationState.abort())
  try {
    const result = await binding.videoDevices(operationState)
    if (signal?.aborted) {
      throw new MpvAbortError(operation, 'devices' in result || result.submitted, signal.reason)
    }
    if ('error' in result) {
      throw new MpvBindingError(result.error, operation, result.submitted)
    }
    return result.devices
  } finally {
    listener?.[Symbol.dispose]()
  }
}
