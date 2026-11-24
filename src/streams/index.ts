import { AsyncLocalStorage } from 'node:async_hooks'
import { types } from 'node:util'
import { MpvBindingError } from '../errors.js'
import type { MpvOperation } from '../errors.js'
import type { NativeClient, NativeFailure } from '../native.js'
import type {
  Action,
  MpvStreamFailure,
  MpvStreamProvider,
  MpvStreamRequest,
  MpvStreamSource,
  NativeProtocol,
  Reply,
} from './contracts.js'

const running = new AsyncLocalStorage<CoreStreams>()
type Source = {
  object: MpvStreamSource
  read: MpvStreamSource['read']
  seek: MpvStreamSource['seek']
  getSize: MpvStreamSource['getSize']
  close: MpvStreamSource['close']
}
type Stream<T> = {
  controller: AbortController
  request: MpvStreamRequest<T>
  source?: Source
  work?: Promise<void>
  cleanup?: Promise<void>
}

export class CoreStreams {
  #registrations = new Set<{ cancel(): void; finished: Promise<void> }>()
  #closing = false
  #errors: unknown[] = []

  check(operation: MpvOperation) {
    if (running.getStore() === this) {
      throw new MpvBindingError('reentrantStreamCall', operation)
    }
  }

  cancel() {
    this.#closing = true
    for (const protocol of this.#registrations) {
      protocol.cancel()
    }
  }

  async finish() {
    await Promise.all(Array.from(this.#registrations, (registration) => registration.finished))
    if (this.#errors.length) {
      throw new AggregateError(this.#errors.splice(0), 'Stream cleanup failed.')
    }
  }

  async register<T>(
    client: NativeClient,
    name: Uint8Array<ArrayBuffer>,
    provider: MpvStreamProvider<T>,
    uri: (bytes: Uint8Array<ArrayBuffer>) => T,
    fail: (failure: NativeFailure) => never,
  ) {
    this.check('registerProtocol')
    if (
      !provider ||
      typeof provider.open !== 'function' ||
      typeof provider.onError !== 'function'
    ) {
      throw new MpvBindingError('invalidArgument', 'registerProtocol')
    }
    if (this.#closing || client.closing) {
      throw new MpvBindingError('closed', 'registerProtocol')
    }
    const protocol = new Provider(this, client, provider, uri, (reason) =>
      this.#errors.push(reason),
    )
    this.#registrations.add(protocol)
    void protocol.finished.then(() => this.#registrations.delete(protocol))
    return protocol.register(name, fail)
  }
}

class Provider<T> {
  #native?: NativeProtocol
  #closing = false
  #ended = false
  #streams = new Map<bigint, Stream<T>>()
  #end = Promise.withResolvers<void>()
  readonly finished = this.#end.promise
  #run = AsyncLocalStorage.snapshot()
  #open: MpvStreamProvider<T>['open']
  #error: MpvStreamProvider<T>['onError']

  constructor(
    private readonly scope: CoreStreams,
    private readonly client: NativeClient,
    private readonly provider: MpvStreamProvider<T>,
    private readonly uri: (bytes: Uint8Array<ArrayBuffer>) => T,
    private readonly cleanupFailure: (reason: unknown) => void,
  ) {
    this.#open = provider.open
    this.#error = provider.onError
  }

  async register(name: Uint8Array<ArrayBuffer>, fail: (failure: NativeFailure) => never) {
    try {
      const target = new WeakRef(this)
      const result = await this.client.registerProtocol(name, () => {
        const provider = target.deref()
        if (provider) {
          provider.#drain()
        }
      })
      if ('error' in result) {
        return fail(result)
      }
      this.#native = result.protocol
      setImmediate(() => this.#drain())
    } catch (reason) {
      this.#end.resolve()
      throw reason
    }
  }

  cancel() {
    this.#closing = true
    for (const [id, stream] of this.#streams) {
      stream.controller.abort()
      this.#close(id, stream)
    }
  }

  #report(failure: MpvStreamFailure<T>) {
    try {
      this.#run(() => this.#error.call(this.provider, failure))
    } catch (reason) {
      queueMicrotask(() => {
        throw reason
      })
    }
  }

  #close(id: bigint, stream: Stream<T> | undefined) {
    if (!stream) {
      this.#native?.finished(id)
      return
    }
    if (stream.cleanup) {
      return
    }
    stream.cleanup = Promise.resolve().then(async () => {
      await stream.work
      try {
        const source = stream.source
        if (source) {
          await this.#run(() => running.run(this.scope, () => source.close.call(source.object)))
        }
      } catch (reason) {
        this.#report({ operation: 'close', request: stream.request, reason })
        if (this.#closing || this.client.closing) {
          this.cleanupFailure(reason)
        }
      } finally {
        this.#streams.delete(id)
        this.#native?.finished(id)
        if (this.#ended && !this.#streams.size) {
          this.#end.resolve()
        }
      }
    })
  }

  #opened(action: Extract<Action, { kind: 'open' }>) {
    const { stream: id, job } = action
    if (this.#closing) {
      this.#native!.reply(id, job, { kind: 'failed' })
      return
    }
    let address: T
    try {
      address = this.uri(action.uri)
    } catch (reason) {
      this.#report({ operation: 'open', request: null, reason })
      this.#native!.reply(id, job, { kind: 'failed' })
      return
    }
    const controller = new AbortController()
    const stream: Stream<T> = { controller, request: { uri: address, signal: controller.signal } }
    this.#streams.set(id, stream)
    stream.work = Promise.resolve().then(async () => {
      try {
        if (controller.signal.aborted) {
          this.#native!.reply(id, job, { kind: 'failed' })
          return
        }
        const object = await this.#run(() =>
          running.run(this.scope, () => this.#open.call(this.provider, stream.request)),
        )
        if (!object || typeof object !== 'object') {
          throw new MpvBindingError('invalidStreamResult', 'openStream', true)
        }
        const { read, seek, getSize, close } = object
        if (
          typeof read !== 'function' ||
          typeof close !== 'function' ||
          (seek !== undefined && typeof seek !== 'function') ||
          (getSize !== undefined && typeof getSize !== 'function')
        ) {
          throw new MpvBindingError('invalidStreamResult', 'openStream', true)
        }
        stream.source = { object, read, seek, getSize, close }
        this.#native!.reply(id, job, { kind: 'open', seek: !!seek, size: !!getSize })
      } catch (reason) {
        if (!controller.signal.aborted) {
          this.#report({ operation: 'open', request: stream.request, reason })
        }
        this.#native!.reply(id, job, { kind: 'failed' })
      }
    })
  }

  #work(action: Extract<Action, { kind: 'read' | 'seek' | 'getSize' }>) {
    const stream = this.#streams.get(action.stream)
    if (!stream?.source || stream.controller.signal.aborted) {
      this.#native!.reply(action.stream, action.job, { kind: 'failed' })
      return
    }
    const source = stream.source
    stream.work = Promise.resolve().then(async () => {
      try {
        let result: Reply
        switch (action.kind) {
          case 'read': {
            const data = await this.#run(() =>
              running.run(this.scope, () => source.read.call(source.object, action.max)),
            )
            if (data === null) {
              result = { kind: 'eof' }
            } else {
              if (
                !types.isUint8Array(data) ||
                !types.isArrayBuffer(data.buffer) ||
                !data.length ||
                data.length > action.max
              ) {
                throw new MpvBindingError('invalidStreamResult', 'readStream', true)
              }
              result = { kind: 'bytes', bytes: data }
            }
            break
          }
          case 'seek':
            await this.#run(() =>
              running.run(this.scope, () => source.seek!.call(source.object, action.offset)),
            )
            result = { kind: 'ok' }
            break
          case 'getSize': {
            const size = await this.#run(() =>
              running.run(this.scope, () => source.getSize!.call(source.object)),
            )
            if (size === null) {
              result = { kind: 'unknown' }
            } else {
              if (typeof size !== 'bigint' || size < 0n || size > 0x7fffffffffffffffn) {
                throw new MpvBindingError('invalidStreamResult', 'getStreamSize', true)
              }
              result = { kind: 'size', number: size }
            }
          }
        }
        if (!stream.controller.signal.aborted) {
          this.#native!.reply(action.stream, action.job, result)
        }
      } catch (reason) {
        if (!stream.controller.signal.aborted) {
          this.#report({ operation: action.kind, request: stream.request, reason })
        }
        this.#native!.reply(action.stream, action.job, { kind: 'failed' })
      }
    })
  }

  #drain() {
    if (!this.#native) {
      return
    }
    for (let i = 0; i < 32; i++) {
      const action = this.#native.next()
      if (!action) {
        return
      }
      switch (action.kind) {
        case 'open':
          this.#opened(action)
          break
        case 'limit':
          if (!this.#closing) {
            this.#report({
              operation: 'open',
              request: null,
              reason: new MpvBindingError('resourceLimit', 'openStream', true),
            })
          }
          this.#native.reply(action.stream, action.job, { kind: 'failed' })
          break
        case 'read':
        case 'seek':
        case 'getSize':
          this.#work(action)
          break
        case 'cancel':
          this.#streams.get(action.stream)?.controller.abort()
          break
        case 'close':
          this.#close(action.stream, this.#streams.get(action.stream))
          break
        case 'shutdown':
          this.cancel()
          break
        case 'end':
          this.cancel()
          this.#ended = true
          if (!this.#streams.size) {
            this.#end.resolve()
          }
          return
      }
    }
    setImmediate(() => this.#drain())
  }
}
