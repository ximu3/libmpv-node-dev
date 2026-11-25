import { callSignal, checkOptions } from './options.js'
import { addAbortListener } from 'node:events'
import { MpvAbortError, MpvBindingError, throwNativeFailure } from '../errors.js'
import { library } from '../library.js'
import type { NativeClient } from '../native.js'
import type { MpvStreamProvider } from '../streams/contracts.js'
import type { CoreStreams } from '../streams/registry.js'
import type { Subscriptions } from '../subscriptions.js'
import { nameBytes, toJavaScript, valueMode, type ValueRepresentation } from '../values.js'
import { wrapGpuOutput } from '../video/gpu.js'
import { wrapSoftwareOutput } from '../video/software.js'
import type { MpvClient, Name, Options, VideoOutput } from './contracts.js'
import { Control } from './control.js'

export class Player extends Control {
  readonly videoOutput: VideoOutput | null
  constructor(native: NativeClient) {
    super(native)
    const output = native.videoOutput
    if (!output) {
      this.videoOutput = null
    } else if (output.renderer === 'gpu') {
      this.videoOutput = wrapGpuOutput(output, native, this.subscriptions)
    } else {
      this.videoOutput = wrapSoftwareOutput(output, native, this.subscriptions)
    }
  }
  #shutdown?: Promise<void>

  async registerProtocol(
    name: Name,
    provider: MpvStreamProvider<string | Uint8Array<ArrayBuffer>>,
    options: { readonly output?: ValueRepresentation } = {},
  ) {
    const op = 'registerProtocol'
    this.streams.check(op)
    checkOptions(options, op)
    const output = valueMode(options.output, op)
    const bytes = nameBytes(name, op)
    return this.streams.register(
      this.native,
      bytes,
      provider,
      (uri) => {
        if (output === 'native') {
          return uri
        }
        return toJavaScript({ format: 'string', value: uri }, 'openStream') as string
      },
      (failure) => throwNativeFailure(failure, op),
    )
  }

  async createClient(options: Options & { name?: string } = {}): Promise<MpvClient> {
    const signal = callSignal(options, 'createClient')
    this.streams.check('createClient')
    if (this.native.closing) {
      throw new MpvBindingError('closed', 'createClient')
    }
    if (options.name !== undefined && typeof options.name !== 'string') {
      throw new MpvBindingError('invalidArgument', 'createClient')
    }
    const name = options.name === undefined ? null : nameBytes(options.name, 'createClient')
    const { binding } = await library('createClient')
    if (signal?.aborted) {
      throw new MpvAbortError('createClient', false, signal.reason)
    }
    const gate = binding.NativeCreation.start()
    const cancellation = signal && addAbortListener(signal, () => gate.abort())
    const result = await this.native
      .createChild(name, gate)
      .finally(() => cancellation?.[Symbol.dispose]())
    if ('error' in result) {
      return throwNativeFailure(result, 'createClient', signal)
    }
    if (signal?.aborted || this.native.closing || result.client.closing) {
      await result.client.close()
      if (signal?.aborted) {
        throw new MpvAbortError('createClient', true, signal.reason)
      }
      throw new MpvBindingError('closed', 'createClient', true)
    }
    return new Channel(result.client, this, this.subscriptions, this.streams) as MpvClient
  }

  ref() {
    this.native.setReferenced(true)
    return this
  }
  unref() {
    this.native.setReferenced(false)
    return this
  }
  hasRef() {
    return this.native.hasRef && !this.native.closing
  }
  close() {
    try {
      this.streams.check('close')
    } catch (error) {
      return Promise.reject(error)
    }
    if (!this.#shutdown) {
      const done = Promise.withResolvers<void>()
      this.#shutdown = done.promise
      this.streams.cancel()
      void Promise.allSettled([this.finish(), this.streams.finish()]).then((results) => {
        const failures = results.flatMap((result) =>
          result.status === 'rejected' ? [result.reason as unknown] : [],
        )
        if (failures.length > 1) {
          done.reject(new AggregateError(failures, 'Player cleanup failed.'))
        } else if (failures.length) {
          done.reject(failures[0])
        } else {
          done.resolve()
        }
      })
    }
    return this.#shutdown
  }
  [Symbol.asyncDispose]() {
    return this.close()
  }
}

class Channel extends Control {
  #owner: Player | undefined

  constructor(
    native: NativeClient,
    owner: Player,
    parentSubscriptions: Subscriptions,
    streams: CoreStreams,
  ) {
    super(native, parentSubscriptions, streams)
    this.#owner = owner
  }

  async dispose() {
    this.streams.check('disposeClient')
    if (!this.#owner) {
      return
    }
    await this.finish(true)
    this.#owner = undefined
  }
  [Symbol.asyncDispose]() {
    return this.dispose()
  }
}
