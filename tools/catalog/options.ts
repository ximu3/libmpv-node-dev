import { dictionary, list, literal, object, type Shape } from '../../src/catalog/shape.ts'
import type { Catalog, OptionInfo } from './collect.ts'

export interface OptionGroup {
  read: Shape
  write: Shape
  names: string[]
}
function alternatives(shapes: readonly Shape[]): Shape {
  const literals = new Set<string | boolean>()
  const others = new Map<string, Shape>()
  for (const shape of shapes.flatMap((shape) =>
    typeof shape === 'object' && 'anyOf' in shape ? shape.anyOf : [shape],
  )) {
    if (typeof shape === 'object' && 'literals' in shape) {
      for (const value of shape.literals) {
        literals.add(value)
      }
    } else {
      others.set(JSON.stringify(shape), shape)
    }
  }
  const distinct = [...others.values()]
  if (literals.size) {
    distinct.push({ literals: [...literals] })
  }
  return distinct.length === 1 ? distinct[0]! : { anyOf: distinct }
}
function option(info: OptionInfo): Pick<OptionGroup, 'read' | 'write'> {
  const same = (shape: Shape) => ({ read: shape, write: shape })
  switch (info.type) {
    case undefined:
    case 'Print':
      return { read: 'value', write: info.type ? 'string' : 'value' }
    case 'Choice': {
      const read: Shape[] = [],
        write: Shape[] = []
      for (const name of info.choices ?? []) {
        write.push(literal(name))
        if (name === 'yes' || name === 'no') {
          read.push(literal(name === 'yes'))
          write.push(literal(name === 'yes'))
        } else if (name === '' || /^-?\d+$/.test(name)) {
          // choice_get treats an empty spelling as the integer zero.
          read.push({ integer: BigInt(name).toString() })
          if (name !== '') {
            write.push({ integer: BigInt(name).toString() })
          }
        } else {
          read.push(literal(name))
        }
      }
      if (info.min !== undefined && info.max !== undefined) {
        read.push('bigint')
        write.push('integerInput')
      }
      return { read: alternatives(read), write: alternatives(write) }
    }
    case 'Flag':
      return same('boolean')
    case 'Integer':
    case 'Integer64':
      return { read: 'bigint', write: 'integerInput' }
    case 'ByteSize':
      return { read: 'bigint', write: alternatives(['bigint', 'string']) }
    case 'Float':
    case 'Double': {
      const nanDefault =
        info.name === 'tone-mapping-param' ||
        /^(?:[cdt]?scale)-(?:param[12]|wparam)$/.test(info.name)
      const read: Shape = nanDefault ? alternatives(['number', literal('default')]) : 'number'
      const unlimited =
        info.max &&
        typeof info.max === 'object' &&
        'double' in info.max &&
        info.max.double === 'Infinity'
      return { read, write: unlimited ? alternatives([read, literal('inf')]) : read }
    }
    case 'Aspect':
    case 'Time':
      return {
        read:
          info.name === 'ab-loop-a' || info.name === 'ab-loop-b'
            ? alternatives(['number', literal('no')])
            : 'number',
        write: alternatives(['number', 'bigint', 'string']),
      }
    case 'Key/value list':
    case 'Output verbosity levels':
      return { read: dictionary('string'), write: alternatives(['string', dictionary('string')]) }
    case 'String list':
      return { read: list('string'), write: alternatives(['string', list('string')]) }
    case 'Object settings list': {
      const items = list(
        object(
          { name: 'string' },
          { label: 'string', enabled: 'boolean', params: dictionary('string') },
        ),
      )
      return { read: items, write: alternatives(['string', items]) }
    }
    case 'Audio channels or channel map':
    case 'Audio format':
    case 'Color':
    case 'FourCC':
    case 'Image format':
    case 'Relative time or percent position':
    case 'String':
    case 'Video rect':
    case 'Window geometry':
    case 'Window size':
      return same('string')
    default:
      throw new Error('Unknown option type ' + info.type)
  }
}
export function optionGroups(catalogs: readonly Catalog[]): OptionGroup[] {
  const options = new Map<string, { read: Shape[]; write: Shape[] }>()
  for (const catalog of catalogs) {
    for (const info of catalog.options) {
      const accumulated = options.get(info.name) ?? { read: [], write: [] }
      const { read, write } = option(info)
      accumulated.read.push(read)
      accumulated.write.push(write)
      options.set(info.name, accumulated)
    }
  }
  const groups = new Map<string, OptionGroup>()
  for (const name of [...options.keys()].sort()) {
    const parts = options.get(name)!
    const rule = { read: alternatives(parts.read), write: alternatives(parts.write) }
    const key = JSON.stringify(rule)
    const group = groups.get(key) ?? { ...rule, names: [] }
    group.names.push(name)
    groups.set(key, group)
  }
  return [...groups.values()]
}
