import { createWriteStream } from 'node:fs'
import { mkdtempDisposable, rename, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { digest, verifyDigest } from '../files.ts'

export async function fetchArchive(cache: string, item: { url: string; sha256: string }) {
  const file = join(cache, basename(new URL(item.url).pathname))
  const existing = await stat(file, { throwIfNoEntry: false })
  if (existing && (await digest(file)) === item.sha256) {
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
