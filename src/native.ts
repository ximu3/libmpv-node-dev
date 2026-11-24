import type { MpvNode } from './values.js'
import type { MpvBindingErrorCode } from './errors.js'
export interface NativeFailure {
  error: number | MpvBindingErrorCode
  submitted: boolean
  stage?: 'core' | 'options' | 'initialize' | 'publish'
  optionIndex?: number
}
export interface NativeClient {
  readonly clientName: string
  readonly clientId: bigint
  readonly closing: boolean
  readonly hasRef: boolean
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
