import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, mkdtempDisposable, readFile, rename } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  digest,
  projectRoot,
  requiredPath,
  requireNewDirectory,
  verifyDigest,
  writeJson,
} from '../files.ts'
import { downloadSources } from '../engine/posix/sources.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    runtime: { type: 'string' },
    cache: { type: 'string' },
    'inputs-only': { type: 'boolean' },
  },
})
const output = requiredPath(positionals[0], 'destination')
const runtime = requiredPath(values.runtime, '--runtime')
await requireNewDirectory(output)
await mkdir(dirname(output), { recursive: true })
await using work = await mkdtempDisposable(join(dirname(output), 'libmpv-sources-'))
const kit = join(work.path, 'source-materials')
await cp(join(runtime, 'source-materials'), kit, { recursive: true })
const original = JSON.parse(await readFile(join(kit, 'checksums.json'), 'utf8')) as Record<
  string,
  string
>
for (const [relative, sha] of Object.entries(original)) {
  await verifyDigest(join(kit, relative), sha)
}
const complete = process.platform === 'win32' || !values['inputs-only']
if (complete && process.platform !== 'win32') {
  await downloadSources(kit, requiredPath(values.cache, '--cache'))
}
await cp(join(runtime, 'third-party'), join(kit, 'third-party'), { recursive: true })
await copyFile(join(projectRoot, 'engine/RELINK.md'), join(kit, 'RELINK.md'))
await copyFile(join(runtime, 'engine.json'), join(kit, 'engine.json'))
const commit = execFileSync('git', ['-C', projectRoot, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim()
const binding = join(kit, 'libmpv-node-' + commit + '.tar.gz')
execFileSync('git', [
  '-C',
  projectRoot,
  'archive',
  '--format=tar.gz',
  '--prefix=libmpv-node/',
  '-o',
  binding,
  commit,
])
const target = process.platform + '-' + process.arch
await writeJson(join(kit, 'binding.json'), {
  target,
  commit,
  archive: basename(binding),
  sha256: await digest(binding),
})
const staging = join(work.path, 'output')
await mkdir(staging)
const name = 'libmpv-node-' + target + '-sources.tar'
const path = join(staging, name)
execFileSync('tar', ['-cf', join('output', name), 'source-materials'], {
  cwd: work.path,
  stdio: 'inherit',
})
await writeJson(join(staging, 'checksums.json'), {
  target,
  commit,
  complete,
  files: { [name]: await digest(path) },
})
await rename(staging, output)
