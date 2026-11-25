import maxInputBytes from './client/input-budget.json' with { type: 'json' }
import { types } from 'node:util'
import { MpvBindingError, MpvConversionError, type MpvOperation } from './errors.js'
export type ValueRepresentation = 'native' | 'javascript'

export interface MpvObject {
  readonly [key: string]: MpvValue
}
export type MpvValue =
  | null
  | boolean
  | bigint
  | number
  | string
  | Uint8Array<ArrayBuffer>
  | readonly MpvValue[]
  | MpvObject
export type MpvNode =
  | { readonly format: 'none' }
  | { readonly format: 'int64'; readonly value: bigint }
  | { readonly format: 'flag'; readonly value: boolean }
  | { readonly format: 'double'; readonly value: number }
  | { readonly format: 'string'; readonly value: Uint8Array<ArrayBuffer> }
  | { readonly format: 'byteArray'; readonly value: Uint8Array<ArrayBuffer> }
  | { readonly format: 'array'; readonly value: readonly MpvNode[] }
  | {
      readonly format: 'map'
      readonly value: readonly (readonly [Uint8Array<ArrayBuffer>, MpvNode])[]
    }

const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
const encoder = new TextEncoder()
export const none = { format: 'none' } as const

export function valueMode(value: ValueRepresentation | undefined, op: MpvOperation) {
  if (value === undefined || value === 'javascript') {
    return 'javascript'
  }
  if (value === 'native') {
    return value
  }
  throw new MpvBindingError('invalidArgument', op)
}

function invalid(operation: MpvOperation): never {
  throw new MpvBindingError('invalidArgument', operation)
}

export type ChargeInput = (bytes: number) => void

export function localInputBudget(operation: MpvOperation): ChargeInput {
  let remaining = maxInputBytes
  return (bytes) => {
    if (bytes > remaining) {
      throw new MpvBindingError('resourceLimit', operation)
    }
    remaining -= bytes
  }
}

function bytes(value: unknown, operation: MpvOperation, charge: ChargeInput) {
  if (!types.isUint8Array(value) || !types.isArrayBuffer(value.buffer)) {
    invalid(operation)
  }
  charge(2 * value.byteLength)
  try {
    return new Uint8Array(value)
  } catch {
    return invalid(operation)
  }
}

export function nameBytes(
  value: unknown,
  operation: MpvOperation,
  charge = localInputBudget(operation),
) {
  charge(2)
  if (typeof value === 'string') {
    if (!value.isWellFormed() || value.includes('\0')) {
      invalid(operation)
    }
    charge(2 * Buffer.byteLength(value))
    return encoder.encode(value)
  }
  const copy = bytes(value, operation, charge)
  if (copy.includes(0)) {
    invalid(operation)
  }
  return copy
}

export function inputNode(
  value: unknown,
  mode: 'javascript' | 'native',
  operation: MpvOperation,
  charge: ChargeInput,
): MpvNode {
  const active = new Set<object>()
  // Both staging trees own nodes and map keys on the supported 64-bit targets.
  const nodeBytes = 2 * 32
  const mapKeyBytes = 2 * 16
  charge(nodeBytes)
  function array(items: readonly unknown[]) {
    const length = items.length
    charge(nodeBytes * length)
    const nodes: MpvNode[] = []
    for (let i = 0; i < length; i++) {
      nodes.push(copy(items[i]))
    }
    return nodes
  }
  function copy(input: unknown): MpvNode {
    if (mode === 'javascript') {
      if (input === null) {
        return none
      }
      if (typeof input === 'boolean') {
        return { format: 'flag', value: input }
      }
      if (typeof input === 'number') {
        return { format: 'double', value: input }
      }
      if (typeof input === 'bigint' && BigInt.asIntN(64, input) === input) {
        return { format: 'int64', value: input }
      }
      if (typeof input === 'string') {
        return { format: 'string', value: nameBytes(input, operation, charge) }
      }
      if (types.isUint8Array(input)) {
        return { format: 'byteArray', value: bytes(input, operation, charge) }
      }
    }
    if (input === null || typeof input !== 'object' || active.has(input)) {
      invalid(operation)
    }
    if (active.size >= 128) {
      throw new MpvBindingError('resourceLimit', operation)
    }
    active.add(input)
    try {
      if (mode === 'javascript' && Array.isArray(input)) {
        return { format: 'array', value: array(input) }
      }
      const proto: unknown = Object.getPrototypeOf(input)
      if (proto !== Object.prototype && proto !== null) {
        invalid(operation)
      }
      if (mode === 'javascript') {
        const entries: (readonly [Uint8Array<ArrayBuffer>, MpvNode])[] = []
        for (const key in input) {
          if (!Object.hasOwn(input, key)) {
            continue
          }
          charge(nodeBytes + mapKeyBytes)
          entries.push([
            nameBytes(key, operation, charge),
            copy((input as Record<string, unknown>)[key]),
          ])
        }
        return { format: 'map', value: entries }
      }
      const node = input as Record<string, unknown>
      const value = node.value
      switch (node.format) {
        case 'none':
          if (!('value' in node)) {
            return none
          }
          break
        case 'flag':
          if (typeof value === 'boolean') {
            return { format: 'flag', value }
          }
          break
        case 'double':
          if (typeof value === 'number') {
            return { format: 'double', value }
          }
          break
        case 'int64':
          if (typeof value === 'bigint' && BigInt.asIntN(64, value) === value) {
            return { format: 'int64', value }
          }
          break
        case 'string':
          if (types.isUint8Array(value)) {
            return { format: 'string', value: nameBytes(value, operation, charge) }
          }
          break
        case 'byteArray':
          return { format: 'byteArray', value: bytes(value, operation, charge) }
        case 'array':
          if (Array.isArray(value)) {
            return { format: 'array', value: array(value) }
          }
          break
        case 'map':
          if (Array.isArray(value)) {
            const length = value.length
            charge((nodeBytes + mapKeyBytes) * length)
            const entries: (readonly [Uint8Array<ArrayBuffer>, MpvNode])[] = []
            for (let i = 0; i < length; i++) {
              const entry: unknown = value[i]
              if (!Array.isArray(entry) || entry.length !== 2 || !types.isUint8Array(entry[0])) {
                invalid(operation)
              }
              entries.push([nameBytes(entry[0], operation, charge), copy(entry[1])])
            }
            return { format: 'map', value: entries }
          }
      }
      return invalid(operation)
    } finally {
      active.delete(input)
    }
  }
  return copy(value)
}

export function toJavaScript(node: MpvNode, operation: MpvOperation): MpvValue {
  function decode(text: Uint8Array) {
    try {
      return decoder.decode(text)
    } catch {
      throw new MpvConversionError('invalidUtf8', operation, node)
    }
  }
  function convert(item: MpvNode): MpvValue {
    switch (item.format) {
      case 'none':
        return null
      case 'string':
        return decode(item.value)
      case 'flag':
      case 'double':
      case 'int64':
      case 'byteArray':
        return item.value
      case 'array':
        return item.value.map(convert)
      case 'map': {
        const result = Object.create(null) as Record<string, MpvValue>
        for (const [key, value] of item.value) {
          const name = decode(key)
          if (Object.hasOwn(result, name)) {
            throw new MpvConversionError('duplicateMapKey', operation, node)
          }
          result[name] = convert(value)
        }
        return result
      }
    }
  }
  return convert(node)
}
