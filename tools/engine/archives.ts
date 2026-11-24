import sourcePackages from '../../engine/windows-x64/sources.json' with { type: 'json' }
import { createWriteStream } from 'node:fs'
import { mkdir, mkdtempDisposable, rename, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { verifyDigest } from '../files.ts'
import inputs from '../../engine/windows-x64/inputs.json' with { type: 'json' }

export function packageUrl(name: string) {
  const directory = name.startsWith('mingw-w64-ucrt-x86_64-') ? 'mingw/ucrt64' : 'msys/x86_64'
  return `https://repo.msys2.org/${directory}/${name}`
}

export async function prepareArchives(cache: string) {
  await mkdir(cache, { recursive: true })
  const archives = [
    inputs.bootstrap,
    ...inputs.sources,
    ...Object.values(sourcePackages).map((source) => ({
      url: 'https://repo.msys2.org/mingw/sources/' + source.archive,
      sha256: source.sha256,
    })),
    ...inputs.packages.map((item) => ({ url: packageUrl(item.file), sha256: item.sha256 })),
  ]
  async function fetchNext() {
    for (let item = archives.pop(); item; item = archives.pop()) {
      const file = join(cache, basename(new URL(item.url).pathname))
      const existing = await stat(file, { throwIfNoEntry: false })
      if (existing) {
        await verifyDigest(file, item.sha256)
        continue
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
    }
  }
  const results = await Promise.allSettled(Array.from({ length: 6 }, fetchNext))
  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason
    }
  }
}
