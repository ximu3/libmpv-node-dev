import { addAbortListener } from 'node:events'
import { library } from '../library.js'
import { MpvAbortError, MpvBindingError, MpvNativeError } from '../errors.js'
import type { MpvOperation } from '../errors.js'
import type { NativeClient, NativeFailure } from '../native.js'
import type { MpvObserver, MpvSubscription, NativeWatch, Subscriptions } from '../subscriptions.js'

function failed(failure: NativeFailure, operation: MpvOperation, signal?: AbortSignal): never {
  if (typeof failure.error === 'number') {
    throw new MpvNativeError(failure.error, operation)
  }
  if (failure.error === 'ABORT_ERR') {
    throw new MpvAbortError(operation, failure.submitted, signal?.reason)
  }
  throw new MpvBindingError(failure.error, operation, failure.submitted)
}

export interface Dimensions {
  readonly width: number
  readonly height: number
}

export type VideoOperation = 'createMpv' | 'configureVideoOutput'

export interface WireConfiguration extends Dimensions {
  readonly pixelFormat?: string
  readonly colorSpace?: string
  readonly capacity?: number
  readonly adapterLuid?: bigint
  readonly rendererId?: number
  readonly renderNode?: string
}

export function validateInput(
  input: Dimensions,
  keys: readonly string[],
  operation: VideoOperation,
) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !keys.includes(key)) ||
    ![input.width, input.height].every(
      (value) => Number.isInteger(value) && value > 0 && value <= 0x7fffffff,
    )
  ) {
    throw new MpvBindingError('invalidArgument', operation)
  }
}

export interface NativeOutput<C, F> {
  readonly closed: boolean
  readonly configuration: C
  configure(
    config: WireConfiguration,
    gate: { abort(): void },
  ): Promise<{ ok: true } | NativeFailure>
  observe(
    wake: () => void,
    gate: { abort(): void },
  ): Promise<{ watch: NativeWatch<F> } | NativeFailure>
  reportSwap(): boolean
}

export abstract class ManagedOutput<C, R, F> {
  protected constructor(
    private readonly native: NativeOutput<C, R>,
    private readonly client: NativeClient,
    private readonly subscriptions: Subscriptions,
    private readonly encode: (config: C, operation: VideoOperation) => WireConfiguration,
    private readonly frame: (raw: R) => F,
  ) {}
  get configuration() {
    return this.native.configuration
  }
  get closed() {
    return this.native.closed || this.client.closing
  }

  async configure(config: C, options: { readonly signal?: AbortSignal } = {}) {
    const op = 'configureVideoOutput'
    this.subscriptions.streams.check(op)
    if (this.closed) {
      throw new MpvBindingError('closed', op)
    }
    const change = this.encode(config, op)
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
    observer: MpvObserver<F>,
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
      (raw) => this.frame(raw!),
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
