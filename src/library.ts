import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, realpath } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { MpvBindingError } from './errors.js'
import type { NativeClient, NativeFailure } from './native.js'
import type { MpvNode } from './values.js'
import type { MpvOperation, MpvBindingErrorCode } from './errors.js'

export interface MpvClientApiVersion {
  readonly major: number
  readonly minor: number
}

export interface NativeLibrary {
  NativeCreation: { start(): { abort(): void } }
  createClientCore(
    directory: string,
    options: readonly (readonly [Uint8Array, MpvNode])[],
    keepAlive: () => void,
    creation: { abort(): void },
  ): Promise<{ client: NativeClient } | NativeFailure>
  loadLibrary(
    directory: string,
  ): Promise<{ version?: MpvClientApiVersion; error?: MpvBindingErrorCode }>
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
const require = createRequire(import.meta.url)
let pending: ReturnType<typeof openLibrary> | undefined

async function openLibrary(operation: MpvOperation) {
  const target = `${process.platform}-${process.arch}`
  const build: unknown = JSON.parse(
    await readFile(new URL('./build.json', import.meta.url), 'utf8'),
  )
  if (!record(build) || typeof build.version !== 'string' || !record(build.targets)) {
    throw new MpvBindingError('incompatibleLibrary', operation)
  }
  const expected = build.targets[target]
  if (!expected) {
    throw new MpvBindingError('libraryLoadFailed', operation)
  }

  const packageName = `@ximu3/libmpv-node-${target}`
  let location = dirname(require.resolve(packageName + '/package.json'))
  if (process.versions.electron) {
    location = location.replace(/([/\\][^/\\]+\.asar)([/\\])/, '$1.unpacked$2')
  }
  const directory = await realpath(location)
  const pkg: unknown = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  const manifest = await readFile(join(directory, 'runtime.json'))
  if (
    !record(pkg) ||
    pkg.name !== packageName ||
    pkg.version !== build.version ||
    createHash('sha256').update(manifest).digest('hex') !== expected
  ) {
    throw new MpvBindingError('incompatibleLibrary', operation)
  }

  const runtime: unknown = JSON.parse(manifest.toString('utf8'))
  if (!record(runtime) || !record(runtime.files)) {
    throw new MpvBindingError('incompatibleLibrary', operation)
  }
  const files = runtime.files
  for (const [name, expectedHash] of Object.entries(files)) {
    if (basename(name) !== name) {
      throw new MpvBindingError('incompatibleLibrary', operation)
    }
    const hash = createHash('sha256')
    await pipeline(createReadStream(join(directory, name)), hash)
    if (hash.digest('hex') !== expectedHash) {
      throw new MpvBindingError('incompatibleLibrary', operation)
    }
  }
  const binding = require(join(directory, 'libmpv.node')) as NativeLibrary
  const result = await binding.loadLibrary(directory)
  if (!result.version) {
    throw new MpvBindingError(result.error ?? 'libraryLoadFailed', operation)
  }
  return { binding, directory, version: result.version }
}

export async function library(operation: MpvOperation) {
  pending ??= openLibrary(operation).catch((error: unknown) => {
    pending = undefined
    throw error
  })
  try {
    return await pending
  } catch (error) {
    throw new MpvBindingError(
      error instanceof MpvBindingError ? error.code : 'libraryLoadFailed',
      operation,
    )
  }
}

export async function getClientApiVersion(): Promise<MpvClientApiVersion> {
  const { version } = await library('getClientApiVersion')
  return { ...version }
}
