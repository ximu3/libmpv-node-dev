import { AsyncLocalStorage } from 'node:async_hooks'
import { MpvBindingError, type MpvOperation } from '../errors.js'
import type { NativeClient, NativeFailure } from '../native.js'
import type { MpvStreamProvider } from './contracts.js'
import { StreamProvider } from './provider.js'

const running = new AsyncLocalStorage<CoreStreams>()

export class CoreStreams {
  #registrations = new Set<{ cancel(): void; finished: Promise<void> }>()
  #closing = false
  #errors: unknown[] = []

  run<T>(callback: () => T): T {
    return running.run(this, callback)
  }

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
    const protocol = new StreamProvider(this, client, provider, uri, (reason) =>
      this.#errors.push(reason),
    )
    this.#registrations.add(protocol)
    void protocol.finished.then(() => this.#registrations.delete(protocol))
    return protocol.register(name, fail)
  }
}
