import { execFileSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import {
  copyFile,
  mkdir,
  mkdtempDisposable,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { requiredPath, verifyDigest, writeJson } from '../../files.ts'

export interface SourceArchive {
  urls: string[]
  sha256: string
}
export async function obtain(source: SourceArchive, cache: string) {
  await mkdir(cache, { recursive: true })
  const name = source.sha256 + '-' + basename(new URL(source.urls[0]!).pathname)
  const path = join(cache, name)
  if ((await stat(path, { throwIfNoEntry: false }))?.isFile()) {
    await verifyDigest(path, source.sha256)
    return path
  }
  await using work = await mkdtempDisposable(join(cache, 'source-'))
  const file = join(work.path, 'archive')
  const failures: unknown[] = []
  for (const url of source.urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(300000) })
      if (!response.ok || !response.body) {
        throw new Error('HTTP ' + response.status + ' for ' + url)
      }
      await pipeline(response.body, createWriteStream(file))
      await verifyDigest(file, source.sha256)
      await rename(file, path)
      return path
    } catch (error) {
      failures.push(error)
    }
  }
  throw new AggregateError(failures, 'Could not verify source ' + name)
}
export async function copySourceLicense(archive: string, notice: string) {
  const list = execFileSync('tar', ['-tf', archive], {
    encoding: 'utf8',
    maxBuffer: 48 * 1024 * 1024,
  })
  const documents = list
    .split(/\r?\n/)
    .filter((file) =>
      /^[^/]+\/(?:COPYING(?:\.[a-z0-9-]+|\d+)?|LICENSE(?:\.[a-z0-9-]+)?|LICENCE(?:\.txt)?|docs\/(?:FTL|GPLv2)\.TXT)$/i.test(
        file,
      ),
    )
  if (!documents.length) {
    throw new Error('Missing source license in ' + archive)
  }
  for (const file of documents) {
    const content = execFileSync('tar', ['-xOf', archive, file], { maxBuffer: 4 * 1024 * 1024 })
    await writeFile(join(notice, basename(file)), content)
  }
}
export async function downloadSources(kit: string, cache: string) {
  const components = JSON.parse(await readFile(join(kit, 'components.json'), 'utf8')) as {
    packages: { sources: SourceArchive[] }[]
  }
  const directory = join(kit, 'archives')
  await mkdir(directory, { recursive: true })
  const entries = [
    ...new Map(
      components.packages.flatMap((pkg) => pkg.sources).map((entry) => [entry.sha256, entry]),
    ).values(),
  ]
  const names: Record<string, string> = {}
  async function next() {
    for (let item = entries.pop(); item; item = entries.pop()) {
      const path = await obtain(item, cache)
      await copyFile(path, join(directory, basename(path)))
      names[basename(path)] = item.sha256
    }
  }
  const results = await Promise.allSettled(Array.from({ length: 4 }, next))
  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason
    }
  }
  await writeJson(
    join(directory, 'checksums.json'),
    Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b, 'en'))),
  )
}
if (import.meta.main) {
  await downloadSources(
    requiredPath(process.argv[2], 'source-materials'),
    requiredPath(process.argv[3], 'cache'),
  )
}
