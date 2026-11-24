import type { NativeHook } from './hooks.js'
import type { LogLevel, MpvNativeLogRecord } from './logs.js'
import type { MpvNativeEvent, NativeWatch } from './subscriptions.js'
import type { MpvNode } from './values.js'
import type { MpvBindingErrorCode } from './errors.js'
export interface NativeFailure {
  error: number | MpvBindingErrorCode
  submitted: boolean
  stage?: 'core' | 'options' | 'initializationLogs' | 'initialize' | 'publish'
  optionIndex?: number
}
export interface NativeClient {
  readonly clientName: string
  readonly clientId: bigint
  readonly closing: boolean
  readonly hasRef: boolean
  createChild(
    name: Uint8Array | null,
    gate: { abort(): void },
  ): Promise<{ client: NativeClient } | NativeFailure>
  observe(
    name: Uint8Array,
    format: number,
    events: number[],
    wake: () => void,
    gate: { abort(): void },
  ): Promise<{ watch: NativeWatch<MpvNode> } | NativeFailure>
  observe(
    name: null,
    format: number,
    events: number[],
    wake: () => void,
    gate: { abort(): void },
  ): Promise<{ watch: NativeWatch<MpvNativeEvent> } | NativeFailure>
  observeLogs(
    level: LogLevel,
    wake: () => void,
    gate: { abort(): void },
  ): Promise<{ watch: NativeWatch<MpvNativeLogRecord> } | NativeFailure>
  addHook(
    name: Uint8Array,
    priority: number,
    wake: () => void,
    gate: { abort(): void },
  ): Promise<{ hook: NativeHook } | NativeFailure>
  setReferenced(value: boolean): void
  time(): bigint | null
  request(
    id: number,
    kind: string,
    name: Uint8Array,
    format: number,
    value: MpvNode,
  ): Promise<{ node: MpvNode } | NativeFailure>
  abort(id: number): void
  close(): Promise<void>
}
