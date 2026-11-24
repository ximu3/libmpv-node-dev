import { addAbortListener } from 'node:events'
import { isAbsolute } from 'node:path'
import {
  MpvAbortError,
  MpvBindingError,
  MpvConversionError,
  MpvNotificationConversionError,
  throwNativeFailure,
  type MpvOperation,
} from '../errors.js'
import { addHook, type MpvHookOptions, type MpvHookHandler } from '../hooks.js'
import {
  logLevel,
  logRecord,
  type LogLevel,
  type MpvLogRecord,
  type MpvNativeLogRecord,
} from '../logs.js'
import type { NativeClient } from '../native.js'
import { CoreStreams } from '../streams/registry.js'
import {
  events,
  Subscriptions,
  type MpvObserver,
  type MpvEvent,
  type MpvEventName,
  type MpvNativeEvent,
  type PropertyState,
} from '../subscriptions.js'
import {
  inputNode,
  nameBytes,
  none,
  toJavaScript,
  valueMode,
  type MpvValue,
  type MpvNode,
  type ValueRepresentation,
} from '../values.js'
import type { Name, Format, Options, Command, NativeCommand } from './contracts.js'

const formats = { node: 6, flag: 3, int64: 4, double: 5 } as const
const empty = new Uint8Array(0)

export class Control {
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
        return throwNativeFailure(reply, operation, signal)
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

  async getProperty(
    name: Name,
    options: Options & { format?: Format; output?: ValueRepresentation } = {},
  ) {
    const format = options.format ?? 'node'
    const output = valueMode(options.output, 'getProperty')
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
    options: Options & { format?: 'plain' | 'osd'; output?: ValueRepresentation } = {},
  ) {
    const output = valueMode(options.output, 'getPropertyText')
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
    options: Options & { input?: ValueRepresentation } = {},
  ) {
    const input = valueMode(options.input, 'setProperty')
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
    options: Options & { input?: ValueRepresentation; output?: ValueRepresentation } = {},
  ) {
    const input = valueMode(options.input, 'command')
    const output = valueMode(options.output, 'command')
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
    options: Options & { format?: Format | 'none'; output?: ValueRepresentation } = {},
  ) {
    const op = 'observeProperty'
    const format = options.format ?? 'node'
    if (
      (!Object.hasOwn(formats, format) && format !== 'none') ||
      (format === 'none' && options.output !== undefined)
    ) {
      throw new MpvBindingError('invalidArgument', op)
    }
    const output = valueMode(options.output, op)
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
      (failure) => throwNativeFailure(failure, op, options.signal),
    )
  }

  async observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<string | Uint8Array<ArrayBuffer>>>,
    options: Options & { output?: ValueRepresentation } = {},
  ) {
    const op = 'observePropertyText'
    const output = valueMode(options.output, op)
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
      (failure) => throwNativeFailure(failure, op, options.signal),
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
      (failure) => throwNativeFailure(failure, 'addHook', options.signal),
    )
  }

  async observeLogs(
    observer: MpvObserver<MpvLogRecord | MpvNativeLogRecord>,
    options: Options & { level?: LogLevel; output?: ValueRepresentation } = {},
  ) {
    const op = 'observeLogs'
    const level = logLevel(options.level, op)
    const output = valueMode(options.output, op)
    return this.subscriptions.observe(
      this.native,
      op,
      (wake, gate) => this.native.observeLogs(level, wake, gate),
      observer,
      options.signal,
      (record) => logRecord(record!, output, op),
      (failure) => throwNativeFailure(failure, op, options.signal),
    )
  }

  async observeEvents(
    observer: MpvObserver<MpvEvent | MpvNativeEvent>,
    options: Options & { output?: ValueRepresentation; events?: readonly MpvEventName[] } = {},
  ) {
    const op = 'observeEvents'
    const output = valueMode(options.output, op)
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
      (failure) => throwNativeFailure(failure, op, options.signal),
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
