import { createWriteStream } from 'node:fs'
import { mkdir, mkdtempDisposable, rename, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { verifyDigest } from '../../files.ts'
import { inputs } from './settings.ts'

export function packageUrl(name: string) {
  if (name.startsWith('mingw-w64-ucrt-x86_64-')) {
    return 'https://repo.msys2.org/mingw/ucrt64/' + name
  }
  if (name.startsWith('mingw-w64-clang-aarch64-')) {
    return 'https://repo.msys2.org/mingw/clangarm64/' + name
  }
  return 'https://repo.msys2.org/msys/x86_64/' + name
}
export async function prepareArchives(cache: string) {
  await mkdir(cache, { recursive: true })
  const archives = [
    inputs.bootstrap,
    ...inputs.sources,
    ...inputs.packages.map((item) => ({ url: packageUrl(item.file), sha256: item.sha256 })),
  ]
  async function fetchNext() {
    for (let item = archives.pop(); item; item = archives.pop()) {
      await fetchArchive(cache, item)
    }
  }
  const results = await Promise.allSettled(Array.from({ length: 6 }, fetchNext))
  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason
    }
  }
}

export async function fetchArchive(cache: string, item: { url: string; sha256: string }) {
  const file = join(cache, basename(new URL(item.url).pathname))
  const existing = await stat(file, { throwIfNoEntry: false })
  if (existing) {
    await verifyDigest(file, item.sha256)
    return file
  }
  await using work = await mkdtempDisposable(join(cache, 'download-'))
  const download = join(work.path, 'archive')
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(item.url, { signal: AbortSignal.timeout(360000) })
      if (!response.ok || !response.body) {
        throw new Error(`Download failed (${response.status}): ${item.url}`)
      }
      await pipeline(response.body, createWriteStream(download))
      break
    } catch (error) {
      if (attempt === 3) {
        throw error
      }
    }
  }
  await verifyDigest(download, item.sha256)
  await rename(download, file)
  return file
}
