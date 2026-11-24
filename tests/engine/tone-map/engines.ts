import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtempDisposable, readFile, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { prepareArchives } from '../../../tools/engine/windows/archives.ts'
import {
  buildDependencies,
  engineCommand,
  prepareToolchain,
} from '../../../tools/engine/windows/toolchain.ts'
import { prepareSource } from '../../../tools/engine/source.ts'
import {
  digest,
  projectRoot,
  requiredPath,
  requireNewDirectory,
  verifyDigest,
  writeJson,
} from '../../../tools/files.ts'
import manifest from '../../../engine/mpv/source.json' with { type: 'json' }
import flags from '../../../engine/windows/configuration.json' with { type: 'json' }

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    runtime: { type: 'string' },
    cache: { type: 'string' },
    repository: { type: 'string' },
  },
})
const output = requiredPath(positionals[0], 'destination')
const runtime = requiredPath(values.runtime, '--runtime')
const cache = requiredPath(values.cache, '--cache')
const receipt = JSON.parse(await readFile(join(runtime, 'engine.json'), 'utf8')) as {
  target: string
  mpvCommit: string
  patches: string[]
  files: Record<string, { sha256: string }>
}
if (
  process.arch !== 'x64' ||
  process.platform !== 'win32' ||
  receipt.target !== 'win32-x64' ||
  receipt.mpvCommit !== manifest.commit ||
  JSON.stringify(receipt.patches) !== JSON.stringify(manifest.patches.map((p) => p.sha256))
) {
  throw new Error('Expected the matched Windows x64 engine')
}
await requireNewDirectory(output)
await mkdir(dirname(output), { recursive: true })
await using work = await mkdtempDisposable(join(dirname(output), 'tone-build-'))
const mpv = join(work.path, 'mpv')
await prepareSource(mpv, values.repository)
await prepareArchives(cache)
const root = await prepareToolchain(work.path, cache)
const prefix = await buildDependencies(work.path, root)
engineCommand(root, prefix, work.path, ['meson', 'setup', 'obj', 'mpv', ...flags.mpvOptions])
const result = join(work.path, 'engines')
await mkdir(result)
const engines: Record<string, string> = {}
for (const variant of ['candidate', 'baseline']) {
  if (variant === 'baseline') {
    const patch = manifest.patches.find((p) => p.file === 'black-tone-map.patch')!
    for (const change of patch.changedFiles) {
      await verifyDigest(join(mpv, change.path), change.afterSha256)
    }
    execFileSync('git', [
      '-c',
      'core.autocrlf=false',
      '-C',
      mpv,
      'apply',
      '--reverse',
      join(projectRoot, 'engine/mpv/patches', patch.file),
    ])
    for (const change of patch.changedFiles) {
      await verifyDigest(join(mpv, change.path), change.beforeSha256)
    }
  }
  engineCommand(root, prefix, work.path, ['meson', 'compile', '-C', 'obj', '-j', '8'])
  const destination = join(result, variant)
  await mkdir(destination)
  for (const [name, file] of Object.entries(receipt.files)) {
    if (name === 'libmpv-2.dll') {
      continue
    }
    await copyFile(join(runtime, name), join(destination, name))
    await verifyDigest(join(destination, name), file.sha256)
  }
  const dll = join(destination, 'libmpv-2.dll')
  await copyFile(join(work.path, 'obj/libmpv-2.dll'), dll)
  engines[variant] = await digest(dll)
}
await writeJson(join(result, 'inputs.json'), {
  commit: manifest.commit,
  patches: manifest.patches,
  engines,
  runtime: await digest(join(runtime, 'engine.json')),
})
await rename(result, output)
