import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtempDisposable, readdir, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import metadata from '../../package.json' with { type: 'json' }
import source from '../../engine/mpv/source.json' with { type: 'json' }
import type { Catalog } from '../catalog/collect.ts'
import { declarations } from '../catalog/generate.ts'
import { digest, requiredPath, requireNewDirectory, writeJson } from '../files.ts'
import { runPnpm } from '../pnpm.ts'
import { stageMain, packageTargets } from './main.ts'

function content(archive: string, file: string): Buffer {
  return execFileSync('tar', ['-xOf', basename(archive), 'package/' + file], {
    cwd: dirname(archive),
    maxBuffer: 512 * 1024 * 1024,
  })
}
function hash(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function assemble(destination: string, inputs: string) {
  await requireNewDirectory(destination)
  await mkdir(dirname(destination), { recursive: true })
  await using work = await mkdtempDisposable(join(dirname(destination), 'libmpv-release-'))
  const output = join(work.path, 'packages')
  await mkdir(output)
  const identity: Record<string, string> = {}
  const catalogs: Catalog[] = []
  const files: Record<string, string> = {}
  const archives = (await readdir(inputs, { recursive: true })).filter((name) =>
    name.endsWith('.tgz'),
  )
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  for (const target of packageTargets) {
    const name = metadata.name + '-' + target
    const archiveName = name.slice(1).replace('/', '-') + '-' + metadata.version + '.tgz'
    const matches = archives.filter((file) => basename(file) === archiveName)
    if (matches.length !== 1) {
      throw new Error('Expected one platform package for ' + target)
    }
    const archive = join(inputs, matches[0]!)
    const pkg = JSON.parse(content(archive, 'package.json').toString('utf8')) as {
      name: string
      version: string
      os: string[]
      cpu: string[]
      libc?: string[]
    }
    const [os, arch] = target.split('-')
    if (
      pkg.name !== name ||
      pkg.version !== metadata.version ||
      pkg.os.join() !== os ||
      pkg.cpu.join() !== arch ||
      (os === 'linux' && pkg.libc?.join() !== 'glibc')
    ) {
      throw new Error('Invalid platform package ' + archiveName)
    }
    const bytes = content(archive, 'runtime.json')
    const runtime = JSON.parse(bytes.toString('utf8')) as {
      files: Record<string, string>
      engine: string
    }
    const engineFile = content(archive, 'engine.json')
    const engine = JSON.parse(engineFile.toString('utf8')) as {
      target: string
      mpvCommit: string
      patches: string[]
    }
    if (
      hash(engineFile) !== runtime.engine ||
      engine.target !== target ||
      engine.mpvCommit !== source.commit ||
      JSON.stringify(engine.patches) !== JSON.stringify(source.patches.map((p) => p.sha256))
    ) {
      throw new Error('Incompatible media archive for ' + target)
    }
    const abiBytes = content(archive, 'abi.json')
    const abi = JSON.parse(abiBytes.toString('utf8')) as {
      target: string
      sourceCommit: string
      clean: boolean
      nodeApi: number
    }
    if (
      hash(abiBytes) !== runtime.files['abi.json'] ||
      abi.target !== target ||
      abi.sourceCommit !== commit ||
      !abi.clean ||
      abi.nodeApi !== 8
    ) {
      throw new Error('Incompatible binding source or ABI for ' + target)
    }
    const data = content(archive, 'catalog.json')
    const catalog = JSON.parse(data.toString('utf8')) as Catalog
    if (
      hash(data) !== runtime.files['catalog.json'] ||
      catalog.target !== target ||
      catalog.mpvCommit !== source.commit ||
      !runtime.files['libmpv.node']
    ) {
      throw new Error('Missing paired addon or catalog for ' + target)
    }
    catalogs.push(catalog)
    identity[target] = hash(bytes)
    await copyFile(archive, join(output, archiveName))
    files[archiveName] = await digest(archive)
  }
  const main = join(work.path, 'main')
  await stageMain(main, identity)
  const { types, rules } = declarations(catalogs)
  await writeFile(join(main, 'dist/catalog/generated.d.ts'), types)
  await writeJson(join(main, 'dist/catalog/rules.json'), rules)
  runPnpm(['pack', '--pack-destination', output], main)
  const mainName = metadata.name.slice(1).replace('/', '-') + '-' + metadata.version + '.tgz'
  files[mainName] = await digest(join(output, mainName))
  await writeJson(join(output, 'checksums.json'), {
    version: metadata.version,
    bindingCommit: commit,
    mpvCommit: source.commit,
    files,
  })
  await rename(output, destination)
}
if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { platforms: { type: 'string' } },
  })
  await assemble(
    requiredPath(positionals[0], 'destination'),
    requiredPath(values.platforms, '--platforms'),
  )
}
