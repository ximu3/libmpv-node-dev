import { addAbortListener } from 'node:events'
import { library } from '../library.js'
import { MpvAbortError, MpvBindingError, MpvNativeError } from '../errors.js'
import type { MpvOperation } from '../errors.js'
import type { NativeClient, NativeFailure } from '../native.js'
import type { MpvObserver, MpvSubscription, NativeWatch, Subscriptions } from '../subscriptions.js'

const formats = ['rgb0', 'bgr0', '0rgb', '0bgr', 'rgb24'] as const
export type SoftwarePixelFormat = (typeof formats)[number]
export interface SoftwareVideoConfiguration {
  readonly width: number
  readonly height: number
  readonly pixelFormat: SoftwarePixelFormat
}
export interface SoftwareVideoOptions {
  readonly renderer: 'software'
  readonly width: number
  readonly height: number
  readonly pixelFormat?: SoftwarePixelFormat
}
export interface SoftwareFrame extends SoftwareVideoConfiguration {
  readonly sequence: bigint
  readonly stride: number
  readonly data: Uint8Array<ArrayBuffer>
  readonly targetTimeNs: bigint | null
  readonly redraw: boolean
  readonly repeat: boolean
  readonly blockVsync: boolean
}
export interface NativeSoftware {
  readonly closed: boolean
  readonly configuration: SoftwareVideoConfiguration
  configure(
    config: SoftwareVideoConfiguration,
    gate: { abort(): void },
  ): Promise<{ ok: true } | NativeFailure>
  observe(
    wake: () => void,
    gate: { abort(): void },
  ): Promise<{ watch: NativeWatch<SoftwareFrame> } | NativeFailure>
  reportSwap(): boolean
}

export function softwareConfiguration(
  input: SoftwareVideoOptions | SoftwareVideoConfiguration,
  operation: 'createMpv' | 'configureVideoOutput',
): SoftwareVideoConfiguration {
  const create = operation === 'createMpv'
  if (!input || typeof input !== 'object') {
    throw new MpvBindingError('invalidArgument', operation)
  }
  const keys = create
    ? ['renderer', 'width', 'height', 'pixelFormat']
    : ['width', 'height', 'pixelFormat']
  const format = input.pixelFormat === undefined && create ? 'bgr0' : input.pixelFormat
  if (
    Object.keys(input).some((key) => !keys.includes(key)) ||
    !Number.isInteger(input.width) ||
    !Number.isInteger(input.height) ||
    input.width <= 0 ||
    input.height <= 0 ||
    input.width > 0x7fffffff ||
    input.height > 0x7fffffff ||
    !format ||
    !formats.includes(format)
  ) {
    throw new MpvBindingError('invalidArgument', operation)
  }
  return { width: input.width, height: input.height, pixelFormat: format }
}

function failed(failure: NativeFailure, operation: MpvOperation, signal?: AbortSignal): never {
  if (typeof failure.error === 'number') {
    throw new MpvNativeError(failure.error, operation)
  }
  if (failure.error === 'ABORT_ERR') {
    throw new MpvAbortError(operation, failure.submitted, signal?.reason)
  }
  throw new MpvBindingError(failure.error, operation, failure.submitted)
}

export let wrapSoftwareOutput: (
  output: NativeSoftware,
  client: NativeClient,
  subscriptions: Subscriptions,
) => SoftwareVideoOutput
export class SoftwareVideoOutput {
  readonly renderer = 'software' as const
  private constructor(
    private readonly native: NativeSoftware,
    private readonly client: NativeClient,
    private readonly subscriptions: Subscriptions,
  ) {}
  static {
    wrapSoftwareOutput = (output, client, subscriptions) =>
      new SoftwareVideoOutput(output, client, subscriptions)
  }
  get configuration() {
    return this.native.configuration
  }
  get closed() {
    return this.native.closed || this.client.closing
  }

  async configure(
    config: SoftwareVideoConfiguration,
    options: { readonly signal?: AbortSignal } = {},
  ) {
    const op = 'configureVideoOutput'
    this.subscriptions.streams.check(op)
    if (this.closed) {
      throw new MpvBindingError('closed', op)
    }
    const change = softwareConfiguration(config, op)
    const signal = options.signal
    if (signal?.aborted) {
      throw new MpvAbortError(op, false, signal.reason)
    }
    const { binding } = await library(op)
    if (signal?.aborted) {
      throw new MpvAbortError(op, false, signal.reason)
    }
    const gate = binding.NativeCreation.start()
    const aborted = Promise.withResolvers<never>()
    const cancellation =
      signal &&
      addAbortListener(signal, () =>
        aborted.reject(new MpvAbortError(op, gate.abort(), signal.reason)),
      )
    try {
      const result = await Promise.race([this.native.configure(change, gate), aborted.promise])
      if ('error' in result) {
        failed(result, op, signal)
      }
    } finally {
      cancellation?.[Symbol.dispose]()
    }
  }

  async observeFrames(
    observer: MpvObserver<SoftwareFrame>,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<MpvSubscription> {
    if (this.closed) {
      throw new MpvBindingError('closed', 'observeFrames')
    }
    return this.subscriptions.observe(
      this.client,
      'observeFrames',
      (wake, gate) => this.native.observe(wake, gate),
      observer,
      options.signal,
      (frame) => frame!,
      (failure, phase) =>
        failed(
          failure,
          phase === 'registration' ? 'observeFrames' : 'renderVideoFrame',
          options.signal,
        ),
    )
  }

  reportSwap() {
    this.subscriptions.streams.check('reportSwap')
    if (!this.native.reportSwap()) {
      throw new MpvBindingError('closed', 'reportSwap')
    }
  }
}
