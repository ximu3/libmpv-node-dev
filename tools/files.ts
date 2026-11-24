import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export async function digest(path: string) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(path), hash)
  return hash.digest('hex')
}

export async function verifyDigest(path: string, expected: string) {
  if ((await digest(path)) !== expected) {
    throw new Error(`Unexpected SHA-256 for ${path}`)
  }
}

export async function requireNewDirectory(path: string) {
  try {
    await access(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }
  throw new Error(`Destination already exists: ${path}`)
}

export function writeJson(path: string, value: unknown) {
  return writeFile(path, JSON.stringify(value, null, 2) + '\n')
}

export function requiredPath(path: string | undefined, name: string) {
  if (!path) {
    throw new Error(`Missing ${name}`)
  }
  return resolve(path)
}
