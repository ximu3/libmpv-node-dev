import type { MpvNode, MpvValue } from '../values.js'

type Scalar = {
  value: MpvValue
  none: null
  boolean: boolean
  number: number
  bigint: bigint
  string: string
  bytes: Uint8Array<ArrayBuffer>
  integerInput: bigint | `${bigint}`
}

type Fields = Readonly<Record<string, Shape>>
export type Shape =
  | keyof Scalar
  | { readonly literals: readonly (string | boolean)[] }
  | { readonly integer: string }
  | { readonly anyOf: readonly Shape[] }
  | { readonly list: Shape }
  | { readonly dictionary: Shape }
  | { readonly fields: Fields; readonly optional: Fields }

export type ShapeValue<S> = Shape extends S
  ? MpvValue
  : S extends keyof Scalar
    ? Scalar[S]
    : S extends { readonly literals: readonly (infer V)[] }
      ? V
      : S extends { readonly integer: `${infer V extends bigint}` }
        ? V
        : S extends { readonly anyOf: readonly (infer V)[] }
          ? ShapeValue<V>
          : S extends { readonly list: infer V }
            ? readonly ShapeValue<V>[]
            : S extends { readonly dictionary: infer V }
              ? Readonly<Record<string, ShapeValue<V>>>
              : S extends { readonly fields: infer R; readonly optional: infer O }
                ? { readonly [K in keyof R]: ShapeValue<R[K]> } & {
                    readonly [K in keyof O]?: ShapeValue<O[K]>
                  }
                : never

export function object<const R extends Fields, const O extends Fields = Record<never, never>>(
  fields: R,
  optional?: O,
) {
  return { fields, optional: optional ?? ({} as O) } as const
}
export function list<const S extends Shape>(item: S) {
  return { list: item } as const
}
export function dictionary<const S extends Shape>(item: S) {
  return { dictionary: item } as const
}
export function literal<const V extends string | boolean>(value: V) {
  return { literals: [value] } as const
}
export function union<const V extends readonly Shape[]>(...anyOf: V) {
  return { anyOf } as const
}

const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
export function matches(shape: Shape, node: MpvNode): boolean {
  switch (shape) {
    case 'value':
      return true
    case 'none':
      return node.format === 'none'
    case 'boolean':
      return node.format === 'flag'
    case 'number':
      return node.format === 'double'
    case 'bigint':
      return node.format === 'int64'
    case 'string':
      return node.format === 'string'
    case 'bytes':
      return node.format === 'byteArray'
    case 'integerInput':
      return (
        node.format === 'int64' ||
        (node.format === 'string' &&
          /^-?(?:\d+|0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+)$/.test(decoder.decode(node.value)))
      )
  }
  if ('literals' in shape) {
    if (node.format === 'flag') {
      return shape.literals.includes(node.value)
    }
    return node.format === 'string' && shape.literals.includes(decoder.decode(node.value))
  }
  if ('integer' in shape) {
    return node.format === 'int64' && node.value.toString() === shape.integer
  }
  if ('anyOf' in shape) {
    return shape.anyOf.some((member) => matches(member, node))
  }
  if ('list' in shape) {
    return node.format === 'array' && node.value.every((item) => matches(shape.list, item))
  }
  if (node.format !== 'map') {
    return false
  }
  if ('dictionary' in shape) {
    return node.value.every(([, item]) => matches(shape.dictionary, item))
  }
  let required = 0
  for (const [key, item] of node.value) {
    const field = decoder.decode(key)
    if (Object.hasOwn(shape.fields, field)) {
      if (!matches(shape.fields[field]!, item)) {
        return false
      }
      required++
    } else if (Object.hasOwn(shape.optional, field) && !matches(shape.optional[field]!, item)) {
      return false
    }
  }
  return required === Object.keys(shape.fields).length
}
