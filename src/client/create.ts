import { addAbortListener } from 'node:events'
import { MpvAbortError, MpvBindingError, throwNativeFailure } from '../errors.js'
import { library } from '../library.js'
import { inputNode, nameBytes, valueMode, type MpvNode } from '../values.js'
import {
  gpuConfiguration,
  type GpuVideoOptions,
  type GpuVideoOutput,
  type VideoTarget,
} from '../video/gpu.js'
import type { WireConfiguration } from '../video/output.js'
import {
  softwareConfiguration,
  type SoftwareVideoOptions,
  type SoftwareVideoOutput,
} from '../video/software.js'
import type {
  CreateMpvOptions,
  CreateOptions,
  Mpv,
  OptionEntries,
  VideoOutputOptions,
} from './contracts.js'
import {
  initializationLogs,
  type JavaScriptLogs,
  type NativeLogs,
  type DynamicLogs,
} from './initialization.js'
import { Player } from './player.js'

type CheckedTarget<T> = T extends VideoTarget
  ? T & Record<Exclude<keyof T, keyof VideoTarget>, never>
  : T
type CheckedVideo<V> = V extends SoftwareVideoOptions
  ? V & Record<Exclude<keyof V, keyof SoftwareVideoOptions>, never>
  : V extends GpuVideoOptions
    ? V &
        Record<Exclude<keyof V, keyof GpuVideoOptions>, never> &
        (V extends { readonly target?: infer Target }
          ? { readonly target?: CheckedTarget<Target> | undefined }
          : {})
    : V
type OutputSelection<V extends VideoOutputOptions | undefined> = {
  readonly videoOutput?: V & CheckedVideo<NoInfer<V>>
} & (undefined extends V ? {} : { readonly videoOutput: V })
type CreatedMpv<V> = Mpv<
  V extends SoftwareVideoOptions
    ? SoftwareVideoOutput
    : V extends GpuVideoOptions
      ? GpuVideoOutput
      : null
>
export function createMpv(configuration?: undefined): Promise<Mpv<null>>
export function createMpv<
  const V extends VideoOutputOptions | undefined = undefined,
  const P extends OptionEntries = OptionEntries,
>(
  configuration: CreateOptions<P> &
    OutputSelection<V> & { readonly initializationLogs?: JavaScriptLogs },
): Promise<CreatedMpv<V>>
export function createMpv<
  const V extends VideoOutputOptions | undefined = undefined,
  const P extends OptionEntries = OptionEntries,
>(
  configuration: CreateOptions<P> &
    OutputSelection<V> & { readonly initializationLogs: NativeLogs },
): Promise<CreatedMpv<V>>
export function createMpv<
  const V extends VideoOutputOptions | undefined = undefined,
  const P extends OptionEntries = OptionEntries,
>(
  configuration: CreateOptions<P> &
    OutputSelection<V> & { readonly initializationLogs: DynamicLogs },
): Promise<CreatedMpv<V>>
export async function createMpv(configuration: CreateMpvOptions = {}): Promise<Mpv> {
  const op = 'createMpv'
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
    throw new MpvBindingError('invalidArgument', op, false, { stage: 'input' })
  }
  for (const key of Object.keys(configuration)) {
    if (!['input', 'options', 'signal', 'initializationLogs', 'videoOutput'].includes(key)) {
      throw new MpvBindingError('invalidArgument', op, false, { stage: 'input' })
    }
  }
  const signal = configuration.signal
  function checkAbort(stage: 'input' | 'library') {
    if (signal?.aborted) {
      throw new MpvAbortError(op, false, signal.reason, { stage })
    }
  }
  checkAbort('input')
  let diagnostics: ReturnType<typeof initializationLogs>
  let video: WireConfiguration | undefined
  let options: (readonly [Uint8Array, MpvNode])[]
  try {
    if (configuration.videoOutput !== undefined) {
      video =
        configuration.videoOutput?.renderer === 'software'
          ? softwareConfiguration(configuration.videoOutput, op)
          : gpuConfiguration(configuration.videoOutput, op)
    }
    diagnostics = initializationLogs(configuration.initializationLogs)
    const input = valueMode(configuration.input, op)
    const entries = configuration.options === undefined ? [] : configuration.options
    if (!Array.isArray(entries)) {
      throw new MpvBindingError('invalidArgument', op)
    }
    options = Array.from(entries, (pair) => {
      if (!Array.isArray(pair) || pair.length !== 2) {
        throw new MpvBindingError('invalidArgument', op)
      }
      return [nameBytes(pair[0], op), inputNode(pair[1], input, op)] as const
    })
  } catch (error) {
    throw new MpvBindingError(
      error instanceof MpvBindingError ? error.code : 'invalidArgument',
      op,
      false,
      { stage: 'input' },
    )
  }
  const { binding, directory } = await library(op).catch((error: MpvBindingError) => {
    throw new MpvBindingError(error.code, op, false, { stage: 'library' })
  })
  checkAbort('library')
  const creation = binding.NativeCreation.start()
  const cancellation = signal && addAbortListener(signal, () => creation.abort())
  const result = await binding
    .createClientCore(directory, options, () => {}, creation, diagnostics?.level, video)
    .finally(() => cancellation?.[Symbol.dispose]())
  if (diagnostics && result.logs) {
    await diagnostics.deliver(result.logs, signal)
  }
  if ('error' in result) {
    return throwNativeFailure(result, op, signal)
  }
  if (signal?.aborted || result.client.closing) {
    await result.client.close()
    if (signal?.aborted) {
      throw new MpvAbortError(op, true, signal.reason, { stage: 'publish' })
    }
    throw new MpvBindingError('closed', op, true, { stage: 'publish' })
  }
  return new Player(result.client) as Mpv
}
