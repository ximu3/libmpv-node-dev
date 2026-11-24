import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtempDisposable, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { prepareSource } from '../../../tools/engine/source.ts'
import {
  digest,
  requiredPath,
  requireNewDirectory,
  verifyDigest,
  writeJson,
} from '../../../tools/files.ts'
import inputs from './probe.json' with { type: 'json' }

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { repository: { type: 'string' } },
})
const destination = requiredPath(positionals[0], 'destination')
if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error('The floating-point diagnostic probe requires Windows x64')
}
await requireNewDirectory(destination)
await mkdir(dirname(destination), { recursive: true })
await using work = await mkdtempDisposable(join(dirname(destination), 'tone-probe-'))
for (const input of inputs) {
  const file = join(work.path, input.file)
  await mkdir(dirname(file), { recursive: true })
  const response = await fetch(input.url, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) {
    throw new Error('Download failed: ' + input.url + ' (' + response.status + ')')
  }
  await writeFile(file, new Uint8Array(await response.arrayBuffer()))
  await verifyDigest(file, input.sha256)
}
await copyFile(join(import.meta.dirname, 'build.rs'), join(work.path, 'build.rs'))
await prepareSource(join(work.path, 'mpv'), values.repository)
execFileSync('cargo', ['build', '--release', '--locked'], { cwd: work.path, stdio: 'inherit' })
const output = join(work.path, 'probe')
await mkdir(output)
const addon = join(output, 'probe.node')
await copyFile(join(work.path, 'target/release/libmpv_gpu_probe.dll'), addon)
await writeJson(join(output, 'inputs.json'), { sha256: await digest(addon), sources: inputs })
await rename(output, destination)
