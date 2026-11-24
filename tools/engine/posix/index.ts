import { mkdir, mkdtempDisposable, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { requireNewDirectory, requiredPath } from '../../files.ts'
import { buildUnix } from './build.ts'
import { assembleUnix } from './runtime.ts'

export async function buildUnixEngine(destination: string, cache: string) {
  await requireNewDirectory(destination)
  await mkdir(dirname(destination), { recursive: true })
  await using work = await mkdtempDisposable(join(dirname(destination), 'engine-'))
  const build = await buildUnix(work.path, cache)
  const output = join(work.path, 'runtime')
  await assembleUnix(build, output)
  await rename(output, destination)
}
if (import.meta.main) {
  const { values, positionals } = parseArgs({
    options: { cache: { type: 'string' } },
    allowPositionals: true,
  })
  await buildUnixEngine(
    requiredPath(positionals[0], 'destination'),
    requiredPath(values.cache, '--cache'),
  )
}
