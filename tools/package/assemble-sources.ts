import { execFileSync } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtempDisposable,
  open,
  readFile,
  readdir,
  rename,
} from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { downloadSources } from '../engine/posix/sources.ts'
import {
  digest,
  projectRoot,
  requiredPath,
  requireNewDirectory,
  verifyDigest,
  writeJson,
} from '../files.ts'
import { packageTargets } from './main.ts'

interface SourceInput {
  target: string
  commit: string
  complete: boolean
  files: Record<string, string>
}
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { inputs: { type: 'string' }, cache: { type: 'string' } },
})
const inputs = requiredPath(values.inputs, '--inputs')
const cache = requiredPath(values.cache, '--cache')
const output = requiredPath(positionals[0], 'destination')
await requireNewDirectory(output)
await mkdir(dirname(output), { recursive: true })
await using work = await mkdtempDisposable(join(dirname(output), 'candidate-sources-'))
const staging = join(work.path, 'sources')
await mkdir(staging)

const commit = execFileSync('git', ['-C', projectRoot, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim()
const packages = new Map<string, { path: string; input: SourceInput }>()
for (const entry of await readdir(inputs, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue
  }
  const dir = join(inputs, entry.name)
  const input = JSON.parse(await readFile(join(dir, 'checksums.json'), 'utf8')) as SourceInput
  if (input.commit !== commit || packages.has(input.target)) {
    throw new Error('Unpaired source kit ' + entry.name)
  }
  const filename = 'libmpv-node-' + input.target + '-sources.tar'
  if (Object.keys(input.files).length !== 1 || !input.files[filename]) {
    throw new Error('Unexpected source archive for ' + input.target)
  }
  const path = join(dir, filename)
  await verifyDigest(path, input.files[filename]!)
  packages.set(input.target, { path, input })
}
if (packages.size !== packageTargets.length) {
  throw new Error('Expected six source kits')
}
const files: Record<string, string> = {}
for (const target of packageTargets) {
  const kit = packages.get(target)
  if (!kit) {
    throw new Error('Missing source kit ' + target)
  }
  const name = basename(kit.path)
  const archive = join(staging, name)
  if (kit.input.complete) {
    await copyFile(kit.path, archive)
  } else {
    await using extract = await mkdtempDisposable(join(work.path, 'expand-'))
    await using input = await open(kit.path, 'r')
    execFileSync('tar', ['-xf', '-'], {
      cwd: extract.path,
      stdio: [input.fd, 'inherit', 'inherit'],
    })
    await downloadSources(join(extract.path, 'source-materials'), cache)
    execFileSync('tar', ['-cf', name, 'source-materials'], { cwd: extract.path, stdio: 'inherit' })
    await rename(join(extract.path, name), archive)
  }
  files[name] = await digest(archive)
}
await writeJson(join(staging, 'checksums.json'), { commit, files })
await rename(staging, output)
