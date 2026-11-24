import { execFileSync } from 'node:child_process'
import { mkdir, mkdtempDisposable, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { projectRoot, requireNewDirectory, requiredPath, verifyDigest } from '../files.ts'

import source from '../../engine/mpv/source.json' with { type: 'json' }

export async function prepareSource(destination: string, repository?: string) {
  const inputs = join(projectRoot, 'engine', 'mpv')
  await requireNewDirectory(destination)
  await mkdir(dirname(destination), { recursive: true })
  await using temporary = await mkdtempDisposable(join(dirname(destination), 'mpv-'))
  const checkout = join(temporary.path, 'source')
  await mkdir(checkout)
  function git(...args: string[]) {
    return execFileSync('git', ['-c', 'core.autocrlf=false', '-C', checkout, ...args], {
      encoding: 'utf8',
    }).trim()
  }

  git('init', '--quiet')
  git('fetch', '--quiet', '--no-tags', '--depth=1', repository ?? source.repository, source.commit)
  git('checkout', '--quiet', '--detach', 'FETCH_HEAD')
  if (git('rev-parse', 'HEAD') !== source.commit) {
    throw new Error('Unexpected upstream commit')
  }

  for (const patch of source.patches) {
    const file = join(inputs, 'patches', patch.file)
    await verifyDigest(file, patch.sha256)
    for (const change of patch.changedFiles) {
      await verifyDigest(join(checkout, change.path), change.beforeSha256)
    }
    git('apply', '--index', file)
    for (const change of patch.changedFiles) {
      await verifyDigest(join(checkout, change.path), change.afterSha256)
    }
  }
  await rename(checkout, destination)
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { repository: { type: 'string' } },
  })
  await prepareSource(requiredPath(positionals[0], 'destination'), values.repository)
}
