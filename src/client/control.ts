import { callSignal } from './options.js'
import { commandShape, checkedValue, propertyValue, validateWrite } from '../catalog/validation.js'
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
  type ChargeInput,
} from '../values.js'
import type {
  Name,
  Format,
  Options,
  Command,
  NativeCommand,
  PropertyTextOptions,
} from './contracts.js'

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
    signal: AbortSignal | undefined,
    prepare: (charge: ChargeInput) => { name: Uint8Array; value: MpvNode; format: number },
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
    const denied = this.native.beginInput(id)
    if (denied) {
      return throwNativeFailure(denied, operation, signal)
    }
    let waiting: ReturnType<NativeClient['request']>
    try {
      const { name, value, format } = prepare((bytes) => {
        if (!this.native.chargeInput(id, bytes)) {
          throw new MpvBindingError(this.native.closing ? 'closed' : 'resourceLimit', operation)
        }
      })
      if (signal?.aborted) {
        throw new MpvAbortError(operation, false, signal.reason)
      }
      waiting = this.native.request(id, operation, name, format, value)
    } finally {
      this.native.releaseInput(id)
    }
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
    const signal = callSignal(options, 'getProperty')
    const format = options.format === undefined ? 'node' : options.format
    const output = valueMode(options.output, 'getProperty')
    if (typeof format !== 'string' || !Object.hasOwn(formats, format)) {
      throw new MpvBindingError('invalidArgument', 'getProperty')
    }
    const node = await this.#request('getProperty', signal, (charge) => ({
      name: nameBytes(name, 'getProperty', charge),
      value: none,
      format: formats[format],
    }))
    if (output === 'native') {
      return node
    }
    return format === 'node'
      ? propertyValue(name, node, 'getProperty')
      : toJavaScript(node, 'getProperty')
  }

  async getPropertyText(name: Name, options: PropertyTextOptions = {}) {
    const signal = callSignal(options, 'getPropertyText')
    const output = valueMode(options.output, 'getPropertyText')
    const format = options.format === undefined ? 'plain' : options.format
    if (format !== 'plain' && format !== 'osd') {
      throw new MpvBindingError('invalidArgument', 'getPropertyText')
    }
    const node = await this.#request('getPropertyText', signal, (charge) => ({
      name: nameBytes(name, 'getPropertyText', charge),
      value: none,
      format: format === 'osd' ? 2 : 1,
    }))
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
    const signal = callSignal(options, 'setProperty')
    const input = valueMode(options.input, 'setProperty')
    await this.#request('setProperty', signal, (charge) => {
      const key = nameBytes(name, 'setProperty', charge)
      const node = inputNode(value, input, 'setProperty', charge)
      if (input === 'javascript') {
        validateWrite(name, node, 'setProperty')
      }
      return { name: key, value: node, format: 6 }
    })
  }

  async command(
    args: Command | NativeCommand,
    options: Options & { input?: ValueRepresentation; output?: ValueRepresentation } = {},
  ) {
    const signal = callSignal(options, 'command')
    const input = valueMode(options.input, 'command')
    const output = valueMode(options.output, 'command')
    let shape: ReturnType<typeof commandShape>
    const result = await this.#request('command', signal, (charge) => {
      const node = inputNode(args, input, 'command', charge)
      if (node.format !== 'map' && node.format !== 'array') {
        throw new MpvBindingError('invalidArgument', 'command')
      }
      if (output === 'javascript') {
        shape = commandShape(node)
      }
      return { name: empty, value: node, format: 6 }
    })
    return output === 'native' ? result : checkedValue(result, shape, 'command')
  }

  async loadConfigFile(path: Name, options: Options = {}) {
    const signal = callSignal(options, 'loadConfigFile')
    await this.#request('loadConfigFile', signal, (charge) => {
      const bytes = nameBytes(path, 'loadConfigFile', charge)
      if (
        !isAbsolute(
          Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('latin1'),
        )
      ) {
        throw new MpvBindingError('invalidArgument', 'loadConfigFile')
      }
      return { name: bytes, value: none, format: 0 }
    })
  }

  async observeProperty(
    name: Name,
    observer: MpvObserver<PropertyState<MpvValue | MpvNode> | void>,
    options: Options & { format?: Format | 'none'; output?: ValueRepresentation } = {},
  ) {
    const signal = callSignal(options, 'observeProperty')
    const op = 'observeProperty'
    const format = options.format === undefined ? 'node' : options.format
    if (
      typeof format !== 'string' ||
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
      signal,
      (node) => {
        if (format === 'none') {
          return
        }
        if (!node) {
          return { status: 'unavailable' as const }
        }
        let value: MpvNode | MpvValue = node
        if (output === 'javascript') {
          value = format === 'node' ? propertyValue(name, node, op) : toJavaScript(node, op)
        }
        return { status: 'available' as const, value }
      },
      (failure) => throwNativeFailure(failure, op, signal),
    )
  }

  async observePropertyText(
    name: Name,
    observer: MpvObserver<PropertyState<string | Uint8Array<ArrayBuffer>>>,
    options: Options & { output?: ValueRepresentation } = {},
  ) {
    const signal = callSignal(options, 'observePropertyText')
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
      signal,
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
      (failure) => throwNativeFailure(failure, op, signal),
    )
  }

  async addHook(name: Name, handler: MpvHookHandler, options: MpvHookOptions = {}) {
    this.streams.check('addHook')
    return addHook(this.native, this.subscriptions, nameBytes(name, 'addHook'), handler, options)
  }

  async observeLogs(
    observer: MpvObserver<MpvLogRecord | MpvNativeLogRecord>,
    options: Options & { level?: LogLevel; output?: ValueRepresentation } = {},
  ) {
    const signal = callSignal(options, 'observeLogs')
    const op = 'observeLogs'
    const level = logLevel(options.level, op)
    const output = valueMode(options.output, op)
    return this.subscriptions.observe(
      this.native,
      op,
      (wake, gate) => this.native.observeLogs(level, wake, gate),
      observer,
      signal,
      (record) => logRecord(record!, output, op),
      (failure) => throwNativeFailure(failure, op, signal),
    )
  }

  async observeEvents(
    observer: MpvObserver<MpvEvent | MpvNativeEvent>,
    options: Options & { output?: ValueRepresentation; events?: readonly MpvEventName[] } = {},
  ) {
    const signal = callSignal(options, 'observeEvents')
    const op = 'observeEvents'
    const output = valueMode(options.output, op)
    const names =
      options.events === undefined
        ? (Object.keys(events) as MpvEventName[]).filter(
            (name) => name !== 'idle' && name !== 'tick',
          )
        : options.events
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
      signal,
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
      (failure) => throwNativeFailure(failure, op, signal),
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
