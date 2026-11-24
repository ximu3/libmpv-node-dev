import type * as Library from '../../src/index.ts'
import { mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { MpvValue } from '../../src/values.ts'
import { writeJson } from '../files.ts'

export interface Argument {
  name: string
  type: string
  optional: boolean
  choices?: string[]
  'default-value'?: unknown
}
export interface CommandInfo {
  name: string
  args: Argument[]
  vararg: boolean
}
export interface OptionInfo {
  name: string
  type?: string
  error?: number
  choices?: string[]
  min?: unknown
  max?: unknown
  'expects-file'?: boolean
}
export interface Catalog {
  target: string
  mpvCommit: string
  commands: CommandInfo[]
  properties: string[]
  options: OptionInfo[]
}

function record(data: MpvValue): Readonly<Record<string, MpvValue>> {
  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data instanceof Uint8Array
  ) {
    throw new Error('Expected an engine catalog map')
  }
  return data as Readonly<Record<string, MpvValue>>
}
function list(data: MpvValue | undefined): readonly MpvValue[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected an engine catalog array')
  }
  return data as readonly MpvValue[]
}
function string(data: MpvValue | undefined): string {
  if (typeof data !== 'string') {
    throw new Error('Expected an engine catalog string')
  }
  return data
}
function flag(data: MpvValue | undefined): boolean {
  if (typeof data !== 'boolean') {
    throw new Error('Expected an engine catalog flag')
  }
  return data
}
function choices(data: MpvValue | undefined) {
  return data === undefined ? {} : { choices: list(data).map(string) }
}
function json(value: MpvValue | undefined): unknown {
  if (typeof value === 'bigint') {
    return { int64: value.toString() }
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return { double: String(value) }
  }
  if (Array.isArray(value)) {
    return value.map((v: MpvValue) => json(v))
  }
  if (value instanceof Uint8Array) {
    return { bytes: Buffer.from(value).toString('base64') }
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]: [string, MpvValue]) => [k, json(v)]),
    )
  }
  return value
}
function commands(values: MpvValue): CommandInfo[] {
  return list(values).map((data) => {
    const cmd = record(data)
    return {
      name: string(cmd.name),
      vararg: flag(cmd.vararg),
      args: list(cmd.args).map((data) => {
        const arg = record(data)
        return {
          name: string(arg.name),
          type: string(arg.type),
          optional: flag(arg.optional),
          ...choices(arg.choices),
          ...(Object.hasOwn(arg, 'default-value')
            ? { 'default-value': json(arg['default-value']) }
            : {}),
        }
      }),
    }
  })
}

export async function collectCatalog(
  main: string,
  platform: string,
  packageName: string,
  target: string,
  mpvCommit: string,
): Promise<Catalog> {
  const scope = join(main, 'node_modules', '@ximu3')
  await mkdir(scope, { recursive: true })
  await symlink(
    platform,
    join(scope, packageName.slice('@ximu3/'.length)),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  const binding = (await import(pathToFileURL(join(main, 'dist/index.js')).href)) as typeof Library
  await using player = await binding.createMpv({
    options: [
      ['config', false],
      ['load-scripts', false],
      ['vo', 'null'],
      ['ao', 'null'],
    ],
  })
  const catalog: Catalog = {
    target,
    mpvCommit,
    commands: commands(await player.getProperty('command-list')),
    properties: list(await player.getProperty('property-list')).map(string),
    options: [],
  }
  for (const name of list(await player.getProperty('options')).map(string)) {
    try {
      const info = record(await player.getProperty('option-info/' + name))
      catalog.options.push({
        name,
        type: string(info.type),
        ...choices(info.choices),
        ...(info['expects-file'] === undefined
          ? {}
          : { 'expects-file': flag(info['expects-file']) }),
        ...(info.min === undefined ? {} : { min: json(info.min) }),
        ...(info.max === undefined ? {} : { max: json(info.max) }),
      })
    } catch (error) {
      if (
        !(error instanceof binding.MpvNativeError) ||
        error.nativeName !== 'MPV_ERROR_PROPERTY_NOT_FOUND'
      ) {
        throw error
      }
      catalog.options.push({ name, error: error.code })
    }
  }
  await writeJson(join(platform, 'catalog.json'), catalog)
  return catalog
}

if (import.meta.main) {
  const [main, platform, packageName, target, commit] = process.argv.slice(2)
  if (!main || !platform || !packageName || !target || !commit) {
    throw new Error('Expected staged packages and engine identity')
  }
  await collectCatalog(main, platform, packageName, target, commit)
}
