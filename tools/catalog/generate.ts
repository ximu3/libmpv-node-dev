import { optionGroups } from './options.ts'
import { runPnpm } from '../pnpm.ts'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Argument, Catalog, CommandInfo } from './collect.ts'
import { projectRoot, requiredPath, writeJson } from '../files.ts'

const quote = JSON.stringify
function union(values: readonly string[]) {
  return [...new Set(values)].map((value) => quote(value)).join(' | ') || 'never'
}
function choices(info: Argument, numeric: boolean) {
  const names = info.choices ?? []
  const bools = [names.includes('yes') ? 'true' : '', names.includes('no') ? 'false' : ''].filter(
    Boolean,
  )
  const integers = names.filter((n) => /^-?\d+$/.test(n)).map((n) => BigInt(n).toString() + 'n')
  const input = [
    ...(names.length ? [union(names)] : []),
    ...bools,
    ...(numeric ? ['IntegerArgument'] : integers),
  ].join(' | ')
  return input || 'never'
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
      )
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
  const groups = optionGroups(catalogs)
  const commands = new Map<string, Set<string>>()
  const properties = new Set<string>()
  for (const catalog of catalogs) {
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
    "import type { ShapeValue } from './shape.js'",
    'export interface CommandDefinitions<A> {',
    ...definitions,
    '}',
    'export type OptionDefinitions = ' +
      groups
        .map(
          (group) =>
            '{[N in ' +
            union(group.names) +
            ']: {read:ShapeValue<' +
            JSON.stringify(group.read) +
            '>;write:ShapeValue<' +
            JSON.stringify(group.write) +
            '>}}',
        )
        .join(' & '),
    'export type PropertyName = ' + union([...properties].sort()),
    '',
  ].join('\n')
  return { types: text, rules: { options: groups, commands: [...commands.keys()].sort() } }
}

if (import.meta.main) {
  const catalogs: Catalog[] = []
  for (const path of process.argv.slice(2)) {
    catalogs.push(JSON.parse(await readFile(requiredPath(path, 'catalog'), 'utf8')) as Catalog)
  }
  const { types, rules } = declarations(catalogs)
  await writeFile(join(projectRoot, 'src/catalog/generated.ts'), types)
  await writeJson(join(projectRoot, 'src/catalog/rules.json'), rules)
  runPnpm(
    ['exec', 'vp', 'fmt', '--write', 'src/catalog/generated.ts', 'src/catalog/rules.json'],
    projectRoot,
  )
}
