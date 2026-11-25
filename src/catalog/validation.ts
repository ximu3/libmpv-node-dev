import { commandFlags } from './types.js'
import { MpvBindingError, MpvConversionError, type MpvOperation } from '../errors.js'
import { toJavaScript, type MpvNode } from '../values.js'
import { properties, track, optionInfo } from './properties.js'
import { commandResults, screenshotFile } from './results.js'
import { matches, type Shape } from './shape.js'
import rules from './rules.json' with { type: 'json' }

const options = new Map<string, { read: Shape; write: Shape }>()
for (const group of rules.options) {
  const rule = { read: group.read as Shape, write: group.write as Shape }
  for (const name of group.names) {
    options.set(name, rule)
  }
}
const commands = new Set(rules.commands)
const flags: ReadonlySet<string> = new Set(commandFlags)
const decoder = new TextDecoder('utf-8', { ignoreBOM: true })
function field(shape: Shape, key: string): Shape | undefined {
  if (typeof shape === 'string') {
    return
  }
  if ('list' in shape) {
    if (key === 'count') {
      return 'bigint'
    }
    return /^\d+$/.test(key) ? shape.list : undefined
  }
  if ('dictionary' in shape) {
    return shape.dictionary
  }
  if ('fields' in shape) {
    if (Object.hasOwn(shape.fields, key)) {
      return shape.fields[key]
    }
    if (Object.hasOwn(shape.optional, key)) {
      return shape.optional[key]
    }
  }
}
function property(name: string, write: boolean): Shape | undefined {
  const option = name.replace(/^(?:file-local-options|options)\//, '')
  if (write || option !== name) {
    const rule = options.get(option)
    if (rule) {
      return write ? rule.write : rule.read
    }
  }
  const parts = name.split('/')
  const root = parts.shift()!
  let shape: Shape | undefined
  if (root === 'option-info' && parts.length) {
    parts.shift()
    shape = optionInfo
  } else if (
    root === 'current-tracks' &&
    ['audio', 'video', 'sub', 'sub2'].includes(parts[0] ?? '')
  ) {
    parts.shift()
    shape = track
  } else if (
    ['metadata', 'chapter-metadata', 'filtered-metadata'].includes(root) &&
    parts[0] === 'by-key' &&
    parts.length > 1
  ) {
    return 'string'
  } else if (Object.hasOwn(properties.fields, root)) {
    shape = properties.fields[root as keyof typeof properties.fields]
  } else {
    shape = options.get(root)?.read
  }
  for (const key of parts) {
    if (!shape) {
      return
    }
    shape = field(shape, key)
  }
  return shape
}
export function validateWrite(
  name: string | Uint8Array<ArrayBuffer>,
  node: MpvNode,
  operation: 'setProperty' | 'createMpv',
) {
  const key = typeof name === 'string' ? name : decoder.decode(name)
  const shape = operation === 'createMpv' ? options.get(key)?.write : property(key, true)
  if (shape && !matches(shape, node)) {
    throw new MpvBindingError('invalidArgument', operation)
  }
}
export function propertyValue(
  name: unknown,
  node: MpvNode,
  operation: 'getProperty' | 'observeProperty',
) {
  return checkedValue(node, typeof name === 'string' ? property(name, false) : undefined, operation)
}
function text(node: MpvNode | undefined) {
  return node?.format === 'string' ? decoder.decode(node.value) : undefined
}
export function commandShape(args: MpvNode): Shape | undefined {
  let name: string | undefined
  let shotFlags: MpvNode | undefined, legacy: MpvNode | undefined
  if (args.format === 'array') {
    let i = 0
    while (flags.has(text(args.value[i]) ?? '')) {
      i++
    }
    name = text(args.value[i])
    shotFlags = args.value[i + 1]
    legacy = args.value[i + 2]
  } else if (args.format === 'map') {
    let fallback: string | undefined
    for (const [key, v] of args.value) {
      switch (decoder.decode(key)) {
        case '_name':
          name = text(v)
          break
        case 'name':
          fallback = text(v)
          break
        case 'flags':
          shotFlags = v
          break
        case 'legacy':
          legacy = v
          break
      }
    }
    name ??= fallback
  }
  if (!name || !commands.has(name)) {
    return
  }
  if (name === 'screenshot') {
    const words =
      shotFlags?.format === 'array' ? shotFlags.value.map(text) : text(shotFlags)?.split('+')
    if (!words?.includes('each-frame') && text(legacy) !== 'each-frame') {
      return screenshotFile
    }
  }
  return Object.hasOwn(commandResults, name)
    ? commandResults[name as keyof typeof commandResults]
    : 'none'
}
export function checkedValue(node: MpvNode, shape: Shape | undefined, operation: MpvOperation) {
  const value = toJavaScript(node, operation)
  if (shape && !matches(shape, node)) {
    throw new MpvConversionError('unexpectedShape', operation, node)
  }
  return value
}
