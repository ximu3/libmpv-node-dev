import { mkdir } from 'node:fs/promises'
import { fetchArchive } from '../archives.ts'
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
