import { auditPlatform } from './abi.ts'
import { execFileSync } from 'node:child_process'
import { cp, copyFile, mkdir, mkdtempDisposable, readFile, rename, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import metadata from '../../package.json' with { type: 'json' }
import source from '../../engine/mpv/source.json' with { type: 'json' }
import {
  digest,
  projectRoot,
  requireNewDirectory,
  requiredPath,
  verifyDigest,
  writeJson,
} from '../files.ts'
import { runPnpm } from '../pnpm.ts'
import { stageMain } from './main.ts'

interface Receipt {
  target: string
  mpvCommit: string
  patches: string[]
  files: Record<string, { size: number; sha256: string; imports: string[] }>
}
const engines = { win32: 'libmpv-2.dll', linux: 'libmpv.so.2', darwin: 'libmpv.2.dylib' } as const

export async function packPlatform(destination: string, runtime: string) {
  const { platform: os, arch } = process
  if (!(os in engines) || (arch !== 'x64' && arch !== 'arm64')) {
    throw new Error('Unsupported media target ' + os + '-' + arch)
  }
  const target = os + '-' + arch
  const receiptPath = join(runtime, 'engine.json')
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8')) as Receipt
  if (
    receipt.target !== target ||
    receipt.mpvCommit !== source.commit ||
    !receipt.files[engines[os as keyof typeof engines]] ||
    JSON.stringify(receipt.patches) !== JSON.stringify(source.patches.map((p) => p.sha256))
  ) {
    throw new Error('Engine identity does not match the source and target')
  }
  await requireNewDirectory(destination)
  await mkdir(dirname(destination), { recursive: true })
  await using work = await mkdtempDisposable(join(dirname(destination), 'libmpv-pack-'))
  const platform = join(work.path, 'platform')
  await mkdir(platform)
  const files: Record<string, string> = {}
  for (const [file, artifact] of Object.entries(receipt.files)) {
    if (basename(file) !== file || file === '.' || file === '..') {
      throw new Error('Invalid runtime file name')
    }
    const installed = join(platform, file)
    await copyFile(join(runtime, file), installed)
    if (
      (await stat(installed)).size !== artifact.size ||
      !Array.isArray(artifact.imports) ||
      !artifact.imports.every((name) => typeof name === 'string')
    ) {
      throw new Error('Invalid engine inventory for ' + file)
    }
    await verifyDigest(installed, artifact.sha256)
    files[file] = artifact.sha256
  }
  await copyFile(receiptPath, join(platform, 'engine.json'))
  await cp(join(runtime, 'third-party'), join(platform, 'third-party'), { recursive: true })
  await copyFile(join(projectRoot, 'build/addon/libmpv.node'), join(platform, 'libmpv.node'))
  await copyFile(join(projectRoot, 'LICENSE'), join(platform, 'LICENSE'))
  files['libmpv.node'] = await digest(join(platform, 'libmpv.node'))
  await auditPlatform(platform, Object.keys(files))
  files['abi.json'] = await digest(join(platform, 'abi.json'))
  const name = metadata.name + '-' + target
  await writeJson(join(platform, 'package.json'), {
    name,
    version: metadata.version,
    private: true,
    license: metadata.license,
    os: [os],
    cpu: [arch],
    ...(os === 'linux' ? { libc: ['glibc'] } : {}),
  })

  const manifestPath = join(platform, 'runtime.json')
  const manifest = { files, engine: await digest(receiptPath) }
  await writeJson(manifestPath, manifest)
  const main = join(work.path, 'main')
  const identity = { [target]: await digest(manifestPath) }
  await stageMain(main, identity)
  // The engine stays loaded until process exit, so probe in a child before removing the staging directory.
  execFileSync(
    process.execPath,
    [
      join(projectRoot, 'tools/catalog/collect.ts'),
      main,
      platform,
      name,
      target,
      receipt.mpvCommit,
    ],
    { stdio: 'inherit' },
  )
  files['catalog.json'] = await digest(join(platform, 'catalog.json'))
  await writeJson(manifestPath, manifest)
  identity[target] = await digest(manifestPath)
  await writeJson(join(main, 'dist/build.json'), { version: metadata.version, targets: identity })
  const output = join(work.path, 'packages')
  await mkdir(output)
  for (const dir of [platform, main]) {
    runPnpm(['pack', '--pack-destination', output], dir)
  }
  await rename(output, destination)
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { runtime: { type: 'string' } },
  })
  await packPlatform(
    requiredPath(positionals[0], 'destination'),
    requiredPath(values.runtime, '--runtime'),
  )
}
