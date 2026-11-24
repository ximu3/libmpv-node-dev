import {
  wrapSoftwareOutput,
  softwareConfiguration,
  type SoftwareVideoOptions,
  type SoftwareVideoOutput,
} from '../video/software.js'
import {
  gpuConfiguration,
  wrapGpuOutput,
  type GpuVideoOptions,
  type GpuVideoOutput,
} from '../video/gpu.js'
import type { WireConfiguration } from '../video/output.js'
import type { VideoOutput, VideoOutputOptions } from './contracts.js'
import { CoreStreams } from '../streams/index.js'
import type { MpvStreamProvider } from '../streams/contracts.js'
import { addHook } from '../hooks.js'
import type { MpvHookOptions, MpvHookHandler } from '../hooks.js'
import type { CreateOptions } from './contracts.js'
import type { JavaScriptLogs, NativeLogs, DynamicLogs } from './initialization.js'
import { initializationLogs } from './initialization.js'
import type { LogLevel, MpvLogRecord, MpvNativeLogRecord } from '../logs.js'
import { logLevel, logRecord } from '../logs.js'
import type {
  Name,
  Mode,
  Format,
  Options,
  Command,
  NativeCommand,
  MpvClient,
  Mpv,
  CreateMpvOptions,
} from './contracts.js'
import { events, Subscriptions } from '../subscriptions.js'
import type {
  MpvObserver,
  MpvEvent,
  MpvEventName,
  MpvNativeEvent,
  PropertyState,
} from '../subscriptions.js'
import { MpvNotificationConversionError } from '../errors.js'
import { addAbortListener } from 'node:events'
import { isAbsolute } from 'node:path'
import { library } from '../library.js'
import { MpvAbortError, MpvBindingError, MpvConversionError, MpvNativeError } from '../errors.js'
import type { Creation, MpvOperation } from '../errors.js'
import type { NativeClient, NativeFailure } from '../native.js'
import { inputNode, nameBytes, none, toJavaScript } from '../values.js'
import type { MpvValue, MpvNode } from '../values.js'

const formats = { node: 6, flag: 3, int64: 4, double: 5 } as const
const empty = new Uint8Array(0)

function mode(value: Mode | undefined, op: MpvOperation) {
  if (value === undefined || value === 'javascript') {
    return 'javascript'
  }
  if (value === 'native') {
    return value
  }
  throw new MpvBindingError('invalidArgument', op)
}

function failed(error: NativeFailure, operation: MpvOperation, signal?: AbortSignal): never {
  let creation: Creation | undefined
  if (error.stage === 'options') {
    creation = { stage: 'options', optionIndex: error.optionIndex! }
  } else if (error.stage) {
    creation = { stage: error.stage }
  }
  if (typeof error.error === 'number') {
    throw new MpvNativeError(error.error, operation, creation)
  }
  if (error.error === 'ABORT_ERR') {
    throw new MpvAbortError(operation, error.submitted, signal?.reason, creation)
  }
  throw new MpvBindingError(error.error, operation, error.submitted, creation)
}

type OutputSelection<V extends VideoOutputOptions | undefined> = {
  readonly videoOutput?: V &
    (V extends SoftwareVideoOptions
      ? Record<Exclude<keyof V, keyof SoftwareVideoOptions>, never>
      : V extends GpuVideoOptions
        ? Record<Exclude<keyof V, keyof GpuVideoOptions>, never>
        : unknown)
} & (undefined extends V ? {} : { readonly videoOutput: V })
type CreatedMpv<V> = Mpv<
  V extends SoftwareVideoOptions
    ? SoftwareVideoOutput
    : V extends GpuVideoOptions
      ? GpuVideoOutput
      : null
>
export function createMpv(): Promise<Mpv<null>>
export function createMpv<const V extends VideoOutputOptions | undefined = undefined>(
  configuration: CreateOptions &
    OutputSelection<V> & { readonly initializationLogs?: JavaScriptLogs },
): Promise<CreatedMpv<V>>
export function createMpv<const V extends VideoOutputOptions | undefined = undefined>(
  configuration: CreateOptions & OutputSelection<V> & { readonly initializationLogs: NativeLogs },
): Promise<CreatedMpv<V>>
export function createMpv<const V extends VideoOutputOptions | undefined = undefined>(
  configuration: CreateOptions & OutputSelection<V> & { readonly initializationLogs: DynamicLogs },
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
    const input = mode(configuration.input, op)
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
    return failed(result, op, signal)
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

class Control {
  readonly clientName: string
  readonly clientId: bigint
  #nextId = 1
  #closed?: Promise<void>
  protected readonly streams: CoreStreams
  protected readonly subscriptions: Subscriptions
  protected readonly native: NativeClient

  constructor(
    native: NativeClient,
    parentSubscriptions?: Subscriptions,
    streams = new CoreStreams(),
  ) {
    this.streams = streams
    this.subscriptions = new Subscriptions(streams, parentSubscriptions)
    this.native = native
    this.clientName = native.clientName
    this.clientId = native.clientId
  }

  async #request(
    operation: MpvOperation,
    name: Uint8Array,
    value: MpvNode,
    format: number,
    signal?: AbortSignal,
  ) {
    this.streams.check(operation)
    if (this.#closed || this.native.closing) {
      throw new MpvBindingError('closed', operation)
    }
    if (signal?.aborted) {
      throw new MpvAbortError(operation, false, signal.reason)
    }
    const id = this.#nextId
    this.#nextId = id === 0xffffffff ? 1 : id + 1
    const waiting = this.native.request(id, operation, name, format, value)
    const cancellation = signal && addAbortListener(signal, () => this.native.abort(id))
    try {
      const reply = await waiting
      if (signal?.aborted) {
        throw new MpvAbortError(operation, 'node' in reply || reply.submitted, signal.reason)
      }
      if ('error' in reply) {
        return failed(reply, operation, signal)
      }
      return reply.node
    } finally {
      cancellation?.[Symbol.dispose]()
    }
  }

  getTimeNs() {
    this.streams.check('getTimeNs')
    const time = this.native.time()
    if (time == null) {
      throw new MpvBindingError('closed', 'getTimeNs')
    }
    return time
  }

  async getProperty(name: Name, options: Options & { format?: Format; output?: Mode } = {}) {
    const format = options.format ?? 'node'
    const output = mode(options.output, 'getProperty')
    if (!Object.hasOwn(formats, format)) {
      throw new MpvBindingError('invalidArgument', 'getProperty')
    }
    const node = await this.#request(
      'getProperty',
      nameBytes(name, 'getProperty'),
      none,
      formats[format],
      options.signal,
    )
    if (output === 'native') {
      return node
    }
    const value = toJavaScript(node, 'getProperty')
    if (format === 'node' && typeof name === 'string') {
      const expected = propertyType(name)
      if (expected && typeof value !== expected) {
        throw new MpvConversionError('unexpectedShape', 'getProperty', node)
      }
    }
    return value
  }

  async getPropertyText(
    name: Name,
    options: Options & { format?: 'plain' | 'osd'; output?: Mode } = {},
  ) {
    const output = mode(options.output, 'getPropertyText')
    const format = options.format ?? 'plain'
    if (format !== 'plain' && format !== 'osd') {
      throw new MpvBindingError('invalidArgument', 'getPropertyText')
    }
    const node = await this.#request(
      'getPropertyText',
      nameBytes(name, 'getPropertyText'),
      none,
      format === 'osd' ? 2 : 1,
      options.signal,
    )
    if (node.format !== 'string') {
      throw new MpvConversionError('unexpectedShape', 'getPropertyText', node)
    }
    return output === 'native' ? node.value : toJavaScript(node, 'getPropertyText')
  }

  async setProperty(
    name: Name,
    value: MpvValue | MpvNode,
    options: Options & { input?: Mode } = {},
  ) {
    const input = mode(options.input, 'setProperty')
    if (input === 'javascript' && typeof name === 'string') {
      const expected = propertyType(name)
      if (expected && typeof value !== expected) {
        throw new MpvBindingError('invalidArgument', 'setProperty')
      }
    }
    await this.#request(
      'setProperty',
      nameBytes(name, 'setProperty'),
      inputNode(value, input, 'setProperty'),
      6,
      options.signal,
    )
  }

  async command(
    args: Command | NativeCommand,
    options: Options & { input?: Mode; output?: Mode } = {},
  ) {
    const input = mode(options.input, 'command')
    const output = mode(options.output, 'command')
    const node = inputNode(args, input, 'command')
    if (node.format !== 'map' && node.format !== 'array') {
      throw new MpvBindingError('invalidArgument', 'command')
    }
    const result = await this.#request('command', empty, node, 6, options.signal)
    return output === 'native' ? result : toJavaScript(result, 'command')
  }

  async loadConfigFile(path: Name, options: Options = {}) {
    const bytes = nameBytes(path, 'loadConfigFile')
    if (!isAbsolute(Buffer.from(bytes).toString('latin1'))) {
      throw new MpvBindingError('invalidArgument', 'loadConfigFile')
    }
    await this.#request('loadConfigFile', bytes, none, 0, options.signal)
  }

  async observeProperty(
    name: Name,
    observer: MpvObserver<PropertyState<MpvValue | MpvNode> | void>,
    options: Options & { format?: Format | 'none'; output?: Mode } = {},
  ) {
    const op = 'observeProperty'
    const format = options.format ?? 'node'
    if (
      (!Object.hasOwn(formats, format) && format !== 'none') ||
      (format === 'none' && options.output !== undefined)
    ) {
      throw new MpvBindingError('invalidArgument', op)
    }
    const output = mode(options.output, op)
    const propertyName = nameBytes(name, op)
    return this.subscriptions.observe(
      this.native,
      op,
      (wake, gate) =>
        this.native.observe(propertyName, format === 'none' ? 0 : formats[format], [], wake, gate),
      observer,
      options.signal,
      (node) => {
        if (format === 'none') {
          return
        }
        if (!node) {
          return { status: 'unavailable' as const }
        }
        const value = output === 'native' ? node : toJavaScript(node, op)
        if (format === 'node' && output === 'javascript' && typeof name === 'string') {
          const expected = propertyType(name)
          if (expected && typeof value !== expected) {
            throw new MpvConversionError('unexpectedShape', op, node)
          }
        }
        return { status: 'available' as const, value }
      },
      (failure) => failed(failure, op, options.signal),
    )
  }

  async observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<string | Uint8Array<ArrayBuffer>>>,
    options: Options & { output?: Mode } = {},
  ) {
    const op = 'observePropertyText'
    const output = mode(options.output, op)
    if ('format' in options) {
      throw new MpvBindingError('invalidArgument', op)
    }
    const propertyName = nameBytes(name, op)
    return this.subscriptions.observe(
      this.native,
      op,
      (wake, gate) => this.native.observe(propertyName, 1, [], wake, gate),
      observer,
      options.signal,
      (node) => {
        if (!node) {
          return { status: 'unavailable' as const }
        }
        if (node.format !== 'string') {
          throw new MpvConversionError('unexpectedShape', op, node)
        }
        return {
          status: 'available' as const,
          value: output === 'native' ? node.value : (toJavaScript(node, op) as string),
        }
      },
      (failure) => failed(failure, op, options.signal),
    )
  }

  async addHook(name: Name, handler: MpvHookHandler, options: MpvHookOptions = {}) {
    this.streams.check('addHook')
    return addHook(
      this.native,
      this.subscriptions,
      nameBytes(name, 'addHook'),
      handler,
      options,
      (failure) => failed(failure, 'addHook', options.signal),
    )
  }

  async observeLogs(
    observer: MpvObserver<MpvLogRecord | MpvNativeLogRecord>,
    options: Options & { level?: LogLevel; output?: Mode } = {},
  ) {
    const op = 'observeLogs'
    const level = logLevel(options.level, op)
    const output = mode(options.output, op)
    return this.subscriptions.observe(
      this.native,
      op,
      (wake, gate) => this.native.observeLogs(level, wake, gate),
      observer,
      options.signal,
      (record) => logRecord(record!, output, op),
      (failure) => failed(failure, op, options.signal),
    )
  }

  async observeEvents(
    observer: MpvObserver<MpvEvent | MpvNativeEvent>,
    options: Options & { output?: Mode; events?: readonly MpvEventName[] } = {},
  ) {
    const op = 'observeEvents'
    const output = mode(options.output, op)
    const names =
      options.events ??
      (Object.keys(events) as MpvEventName[]).filter((name) => name !== 'idle' && name !== 'tick')
    if (
      !Array.isArray(names) ||
      names.some((name: unknown) => typeof name !== 'string' || !Object.hasOwn(events, name))
    ) {
      throw new MpvBindingError('invalidArgument', op)
    }
    const selected = [...new Set(names)].map((name) => events[name as MpvEventName])
    return this.subscriptions.observe(
      this.native,
      op,
      (wake, gate) => this.native.observe(null, 0, selected, wake, gate),
      observer,
      options.signal,
      (payload) => {
        const event = payload!
        if (event.type !== 'client-message' || output === 'native') {
          return event
        }
        const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
        try {
          return { type: event.type, args: event.args.map((arg) => decoder.decode(arg)) }
        } catch {
          throw new MpvNotificationConversionError(op, event)
        }
      },
      (failure) => failed(failure, op, options.signal),
    )
  }

  protected finish(dispose = false) {
    if (this.#closed) {
      return this.#closed
    }
    const pending = Array.from(this.subscriptions.active, (watch) =>
      dispose ? watch.dispose() : watch.finished,
    )
    this.#closed = Promise.all([this.native.close(), ...pending]).then(() => {})
    return this.#closed
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

class Player extends Control {
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
    options: { readonly output?: Mode } = {},
  ) {
    const op = 'registerProtocol'
    this.streams.check(op)
    const output = mode(options.output, op)
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
      (failure) => failed(failure, op),
    )
  }

  async createClient(options: Options & { name?: string } = {}): Promise<MpvClient> {
    this.streams.check('createClient')
    if (this.native.closing) {
      throw new MpvBindingError('closed', 'createClient')
    }
    if (options.name !== undefined && typeof options.name !== 'string') {
      throw new MpvBindingError('invalidArgument', 'createClient')
    }
    const name = options.name === undefined ? null : nameBytes(options.name, 'createClient')
    const signal = options.signal
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
      return failed(result, 'createClient', signal)
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

function propertyType(name: string) {
  switch (name) {
    case 'pause':
      return 'boolean'
    case 'volume':
    case 'duration':
    case 'time-pos':
      return 'number'
    case 'path':
    case 'mpv-version':
      return 'string'
  }
}
