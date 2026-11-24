import { runPnpm } from '../pnpm.ts'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Argument, Catalog, CommandInfo, OptionInfo } from './collect.ts'
import { projectRoot, requiredPath } from '../files.ts'

const quote = JSON.stringify
function union(values: readonly string[]) {
  return [...new Set(values)].map((value) => quote(value)).join(' | ') || 'never'
}
function choices(info: Argument | OptionInfo, numeric: boolean) {
  const names = info.choices ?? []
  const bools = [names.includes('yes') ? 'true' : '', names.includes('no') ? 'false' : ''].filter(
    Boolean,
  )
  const integers = names.filter((n) => /^-?\d+$/.test(n)).map((n) => BigInt(n).toString() + 'n')
  const literals = names.filter((name) => name !== 'yes' && name !== 'no' && !/^-?\d+$/.test(name))
  const input = [
    ...(names.length ? [union(names)] : []),
    ...bools,
    ...(numeric ? ['IntegerArgument'] : integers),
  ].join(' | ')
  const read = [
    ...(literals.length ? [union(literals)] : []),
    ...bools,
    ...(numeric ? ['bigint'] : integers),
  ].join(' | ')
  return { read: read || 'never', write: input || 'never' }
}
function argument(command: string, field: Argument, key: string) {
  switch (field.type) {
    case 'Flags':
      return 'FlagInput<' + union(field.choices ?? []) + ',At<A,' + key + '>>'
    case 'Choice':
      return choices(
        field,
        (command === 'playlist-play-index' || command === 'playlist-remove') &&
          field.name === 'index',
      ).write
    case 'Flag':
      return 'boolean | "yes" | "no"'
    case 'Integer':
    case 'Integer64':
      return 'IntegerArgument'
    case 'ByteSize':
      return 'bigint | string'
    case 'Time':
      return 'number | bigint | string'
    case 'Double':
    case 'Float':
      return 'RealArgument'
    case 'up|down':
      return '"up" | "down" | RealArgument'
    case 'String':
      return 'string'
    case 'String list':
      return 'string | readonly string[]'
    case 'Key/value list':
      return 'string | Readonly<Record<string,string>>'
    default:
      throw Error('Unknown command argument type ' + field.type)
  }
}
function option(info: OptionInfo) {
  const kind = info.type
  switch (kind) {
    case undefined:
      return { read: 'MpvValue', write: 'MpvValue' }
    case 'Choice':
      return choices(info, info.min !== undefined && info.max !== undefined)
    case 'Flag':
      return { read: 'boolean', write: 'boolean' }
    case 'Integer':
    case 'Integer64':
      return { read: 'bigint', write: 'IntegerArgument' }
    case 'ByteSize':
      return { read: 'bigint', write: 'bigint | string' }
    case 'Float':
    case 'Double':
      return {
        read: 'number',
        write:
          info.max &&
          typeof info.max === 'object' &&
          'double' in info.max &&
          info.max.double === 'Infinity'
            ? 'number | "inf"'
            : 'number',
      }
    case 'Aspect':
    case 'Time':
      return { read: 'number', write: 'number | bigint | string' }
    case 'Key/value list':
    case 'Output verbosity levels':
      return {
        read: 'Readonly<Record<string,string>>',
        write: 'string | Readonly<Record<string,string>>',
      }
    case 'String list':
      return { read: 'readonly string[]', write: 'string | readonly string[]' }
    case 'Object settings list':
      return { read: 'readonly ObjectSetting[]', write: 'string | readonly ObjectSetting[]' }
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
      return { read: 'string', write: 'string' }
    case 'Print':
      return { read: 'MpvValue', write: 'string' }
    default:
      throw Error('Unknown option type ' + kind)
  }
}
function definition(cmd: CommandInfo) {
  const positional = cmd.args.map((field, i) => {
    const t = argument(cmd.name, field, String(i + 1))
    if (cmd.vararg && i === cmd.args.length - 1) {
      return '...(' + t + ')[]'
    }
    return field.optional || Object.hasOwn(field, 'default-value') ? '(' + t + ')?' : t
  })
  const fields = cmd.args.map(
    (field) =>
      'readonly ' +
      quote(field.name) +
      (field.optional || Object.hasOwn(field, 'default-value') ? '?' : '') +
      ':' +
      argument(cmd.name, field, quote(field.name)),
  )
  const id = quote(cmd.name)
  const identifiers = fields.some((_, i) => cmd.args[i]!.name === 'name')
    ? '{readonly _name:' + id + '}'
    : '({readonly name:' + id + '} | {readonly _name:' + id + '})'
  let named = identifiers
  if (cmd.vararg) {
    named = 'never'
  } else if (fields.length) {
    named += ' & {' + fields.join(';') + '}'
  }
  return id + ':{ args:readonly [' + positional.join(',') + ']; named:' + named + '}'
}

export function declarations(catalogs: readonly Catalog[]) {
  const optionTypes = new Map<string, Set<string>>()
  const commands = new Map<string, Set<string>>()
  const properties = new Set<string>()
  for (const catalog of catalogs) {
    for (const info of catalog.options) {
      const { read, write } = option(info)
      const types = optionTypes.get(info.name) ?? new Set<string>()
      types.add('{read:' + read + ';write:' + write + '}')
      optionTypes.set(info.name, types)
    }
    for (const cmd of catalog.commands) {
      const forms = commands.get(cmd.name) ?? new Set<string>()
      forms.add(definition(cmd))
      commands.set(cmd.name, forms)
    }
    for (const name of catalog.properties) {
      properties.add(name)
    }
  }
  if (!commands.size) {
    throw new Error('Expected at least one actual engine catalog')
  }
  const definitions = [...commands]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([name, forms]) => {
      if (forms.size !== 1) {
        throw Error('Conflicting platform signatures for ' + name)
      }
      return [...forms][0]
    })
  const text = [
    "import type { At, FlagInput, IntegerArgument, RealArgument } from './types.js'",
    "import type { MpvValue } from '../values.js'",
    'type ObjectSetting = { readonly name:string; readonly label?:string; readonly enabled?:boolean; readonly params?:Readonly<Record<string,string>> }',
    'export interface CommandDefinitions<A> {',
    ...definitions,
    '}',
    'export interface OptionDefinitions {',
    ...[...optionTypes.keys()]
      .sort()
      .map((name) => quote(name) + ':' + [...optionTypes.get(name)!].join(' | ')),
    '}',
    'export type PropertyName = ' + union([...properties].sort()),
    '',
  ].join('\n')
  return text
}

if (import.meta.main) {
  const catalogs: Catalog[] = []
  for (const path of process.argv.slice(2)) {
    catalogs.push(JSON.parse(await readFile(requiredPath(path, 'catalog'), 'utf8')) as Catalog)
  }
  await writeFile(join(projectRoot, 'src/catalog/generated.ts'), declarations(catalogs))
  runPnpm(['exec', 'vp', 'fmt', '--write', 'src/catalog/generated.ts'], projectRoot)
}
