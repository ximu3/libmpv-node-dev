import { addAbortListener } from 'node:events'
import { isAbsolute } from 'node:path'
import { library } from './library.js'
import { MpvAbortError, MpvBindingError, MpvConversionError, MpvNativeError } from './errors.js'
import type { Creation, MpvOperation } from './errors.js'
import type { NativeClient, NativeFailure } from './native.js'
import { inputNode, nameBytes, none, toJavaScript } from './values.js'
import type { MpvValue, MpvNode } from './values.js'

type Name = string | Uint8Array<ArrayBuffer>
type Mode = 'native' | 'javascript'
type Format = 'node' | 'flag' | 'int64' | 'double'
type FormatValue<F extends Format> = F extends 'flag'
  ? boolean
  : F extends 'int64'
    ? bigint
    : F extends 'double'
      ? number
      : MpvValue
type Output<T, M extends Mode> = M extends 'native' ? MpvNode : T
type Options = { readonly signal?: AbortSignal }
type PropertyValue<N> = N extends 'pause'
  ? boolean
  : N extends 'volume' | 'time-pos' | 'duration'
    ? number
    : N extends 'path' | 'mpv-version'
      ? string
      : MpvValue
type Command =
  | readonly [string, ...MpvValue[]]
  | { readonly name: string; readonly [key: string]: MpvValue }
type NativeCommand = Extract<MpvNode, { readonly format: 'array' | 'map' }>

export type CreateMpvOptions = Options &
  (
    | { readonly input?: 'javascript'; readonly options?: readonly (readonly [Name, MpvValue])[] }
    | { readonly input: 'native'; readonly options?: readonly (readonly [Name, MpvNode])[] }
  )

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

export interface Mpv {
  readonly clientName: string
  readonly clientId: bigint
  readonly videoOutput: null
  getTimeNs(): bigint
  getProperty<N extends Name>(
    name: N,
    options?: Options & { format?: 'node'; output?: 'javascript' },
  ): Promise<PropertyValue<N>>
  getProperty<F extends Format>(
    name: Name,
    options: Options & { format: F; output?: 'javascript' },
  ): Promise<FormatValue<F>>
  getProperty<M extends Mode>(
    name: Name,
    options: Options & { format?: Format; output: M },
  ): Promise<Output<MpvValue, M>>
  getPropertyText(
    name: Name,
    options?: Options & { format?: 'plain' | 'osd'; output?: 'javascript' },
  ): Promise<string>
  getPropertyText<M extends Mode>(
    name: Name,
    options: Options & { format?: 'plain' | 'osd'; output: M },
  ): Promise<M extends 'native' ? Uint8Array<ArrayBuffer> : string>
  setProperty<N extends Name>(
    name: N,
    value: PropertyValue<NoInfer<N>>,
    options?: Options & { input?: 'javascript' },
  ): Promise<void>
  setProperty(name: Name, value: MpvNode, options: Options & { input: 'native' }): Promise<void>
  command(
    args: Command,
    options?: Options & { input?: 'javascript'; output?: 'javascript' },
  ): Promise<MpvValue>
  command<M extends Mode>(
    args: Command,
    options: Options & { input?: 'javascript'; output: M },
  ): Promise<Output<MpvValue, M>>
  command(
    args: NativeCommand,
    options: Options & { input: 'native'; output?: 'javascript' },
  ): Promise<MpvValue>
  command<M extends Mode>(
    args: NativeCommand,
    options: Options & { input: 'native'; output: M },
  ): Promise<Output<MpvValue, M>>
  loadConfigFile(path: Name, options?: Options): Promise<void>
  ref(): this
  unref(): this
  hasRef(): boolean
  close(): Promise<void>
  [Symbol.asyncDispose](): Promise<void>
}

export async function createMpv(configuration: CreateMpvOptions = {}): Promise<Mpv> {
  const op = 'createMpv'
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
    throw new MpvBindingError('invalidArgument', op, false, { stage: 'input' })
  }
  for (const key of Object.keys(configuration)) {
    if (!['input', 'options', 'signal'].includes(key)) {
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
  let options: (readonly [Uint8Array, MpvNode])[]
  try {
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
    .createClientCore(directory, options, () => {}, creation)
    .finally(() => cancellation?.[Symbol.dispose]())
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

class Player {
  readonly videoOutput = null
  readonly clientName: string
  readonly clientId: bigint
  #nextId = 1
  #closed?: Promise<void>
  #native: NativeClient

  constructor(native: NativeClient) {
    this.#native = native
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
    if (this.#closed || this.#native.closing) {
      throw new MpvBindingError('closed', operation)
    }
    if (signal?.aborted) {
      throw new MpvAbortError(operation, false, signal.reason)
    }
    const id = this.#nextId
    this.#nextId = id === 0xffffffff ? 1 : id + 1
    const waiting = this.#native.request(id, operation, name, format, value)
    const cancellation = signal && addAbortListener(signal, () => this.#native.abort(id))
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
    const time = this.#native.time()
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

  ref() {
    this.#native.setReferenced(true)
    return this
  }
  unref() {
    this.#native.setReferenced(false)
    return this
  }
  hasRef() {
    return this.#native.hasRef && !this.#native.closing
  }
  close() {
    return (this.#closed ??= this.#native.close())
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
