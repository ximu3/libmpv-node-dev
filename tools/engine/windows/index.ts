import { mkdir, mkdtempDisposable, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import settings from '../../../engine/windows/configuration.json' with { type: 'json' }
import { requiredPath, requireNewDirectory } from '../../files.ts'
import { prepareArchives } from './archives.ts'
import { collectRuntime } from './runtime.ts'
import { prepareSource } from '../source.ts'
import { buildDependencies, engineCommand, prepareToolchain } from './toolchain.ts'

export async function buildEngine(destination: string, cache: string, repository?: string) {
  await requireNewDirectory(destination)
  await prepareArchives(cache)
  await mkdir(dirname(destination), { recursive: true })
  await using temporary = await mkdtempDisposable(join(dirname(destination), 'engine-'))
  const work = temporary.path
  await prepareSource(join(work, 'mpv'), repository)
  const toolchain = await prepareToolchain(work, cache)
  const prefix = await buildDependencies(work, toolchain)
  engineCommand(toolchain, prefix, work, ['meson', 'setup', 'obj', 'mpv', ...settings.mpvOptions])
  engineCommand(toolchain, prefix, work, ['meson', 'compile', '-C', 'obj', '-j', '8'])
  await collectRuntime(work, toolchain, prefix, join(work, 'runtime'), cache)
  await rename(join(work, 'runtime'), destination)
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { cache: { type: 'string' }, repository: { type: 'string' } },
  })
  await buildEngine(
    requiredPath(positionals[0], 'destination'),
    requiredPath(values.cache, '--cache'),
    values.repository,
  )
}
