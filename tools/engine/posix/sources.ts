import { execFile, execFileSync } from 'node:child_process'
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
import { promisify } from 'node:util'
import { requiredPath, verifyDigest, writeJson } from '../../files.ts'

const download = promisify(execFile)

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
  const mirrors = new Set(source.urls.map((url) => url.replace(/^http:/, 'https:')))
  for (const url of source.urls) {
    const remote = new URL(url)
    if (remote.hostname === 'ftpmirror.gnu.org') {
      mirrors.add('https://mirrors.kernel.org/gnu' + remote.pathname)
    }
    if (remote.hostname === 'ftp.gnu.org' && remote.pathname.startsWith('/gnu/')) {
      mirrors.add('https://mirrors.kernel.org' + remote.pathname)
    }
    if (remote.hostname === 'zlib.net') {
      mirrors.add('https://zlib.net/fossils/' + basename(remote.pathname))
    }
  }
  for (const url of mirrors) {
    try {
      await download(
        'curl',
        [
          '--fail',
          '--location',
          '--silent',
          '--show-error',
          '--connect-timeout',
          '20',
          '--max-time',
          '300',
          '--retry',
          '1',
          '--output',
          file,
          url,
        ],
        { windowsHide: true },
      )
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
  const failures: unknown[] = []
  async function next() {
    for (let item = entries.pop(); item; item = entries.pop()) {
      try {
        const path = await obtain(item, cache)
        await copyFile(path, join(directory, basename(path)))
        names[basename(path)] = item.sha256
      } catch (error) {
        failures.push(error)
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, next))
  if (failures.length) {
    throw new AggregateError(failures, 'Could not assemble all corresponding sources')
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
