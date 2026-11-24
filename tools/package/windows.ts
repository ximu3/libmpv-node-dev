import { execFileSync } from 'node:child_process'
import { cp, copyFile, mkdir, mkdtempDisposable, readFile, rename } from 'node:fs/promises'
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

interface EngineReceipt {
  target: string
  mpvCommit: string
  patches: string[]
  files: Record<string, { sha256: string }>
}

export async function packWindows(destination: string, runtime: string) {
  const receiptPath = join(runtime, 'engine.json')
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8')) as EngineReceipt
  const target = 'win32-' + process.arch
  const patches = source.patches.map((patch) => patch.sha256)
  if (
    receipt.target !== target ||
    receipt.mpvCommit !== source.commit ||
    !receipt.files['libmpv-2.dll'] ||
    receipt.patches.length !== patches.length ||
    !patches.every((hash, i) => hash === receipt.patches[i])
  ) {
    throw new Error('Engine does not match this build')
  }

  const { name, version, description, license, type, exports, files: included } = metadata
  const platformName = name + '-' + target
  await requireNewDirectory(destination)
  await mkdir(dirname(destination), { recursive: true })
  await using work = await mkdtempDisposable(join(dirname(destination), 'libmpv-pack-'))
  const platform = join(work.path, 'platform')
  await mkdir(platform)
  const files: Record<string, string> = {}
  for (const [file, artifact] of Object.entries(receipt.files)) {
    if (basename(file) !== file || !file.endsWith('.dll')) {
      throw new Error('Invalid engine file name')
    }
    await copyFile(join(runtime, file), join(platform, file))
    await verifyDigest(join(platform, file), artifact.sha256)
    files[file] = artifact.sha256
  }
  await copyFile(receiptPath, join(platform, 'engine.json'))
  await cp(join(runtime, 'third-party'), join(platform, 'third-party'), { recursive: true })
  await copyFile(join(projectRoot, 'build/addon/libmpv.node'), join(platform, 'libmpv.node'))
  files['libmpv.node'] = await digest(join(platform, 'libmpv.node'))
  await writeJson(join(platform, 'runtime.json'), { files, engine: await digest(receiptPath) })
  await writeJson(join(platform, 'package.json'), {
    name: platformName,
    version,
    private: true,
    os: ['win32'],
    cpu: [process.arch],
  })

  const main = join(work.path, 'main')
  await cp(join(projectRoot, 'dist'), join(main, 'dist'), { recursive: true })
  await copyFile(join(projectRoot, 'LICENSE'), join(main, 'LICENSE'))
  await cp(join(projectRoot, 'docs'), join(main, 'docs'), { recursive: true })
  await writeJson(join(main, 'dist/build.json'), {
    version,
    targets: { [target]: await digest(join(platform, 'runtime.json')) },
  })
  await writeJson(join(main, 'package.json'), {
    name,
    version,
    description,
    license,
    type,
    exports,
    files: included,
    private: true,
    optionalDependencies: { [platformName]: version },
  })

  execFileSync(
    process.execPath,
    [
      join(projectRoot, 'tools/catalog/collect.ts'),
      main,
      platform,
      platformName,
      target,
      receipt.mpvCommit,
    ],
    { stdio: 'inherit' },
  )
  files['catalog.json'] = await digest(join(platform, 'catalog.json'))
  await writeJson(join(platform, 'runtime.json'), { files, engine: await digest(receiptPath) })
  await writeJson(join(main, 'dist/build.json'), {
    version,
    targets: { [target]: await digest(join(platform, 'runtime.json')) },
  })
  const output = join(work.path, 'packages')
  await mkdir(output)
  for (const directory of [platform, main]) {
    runPnpm(['pack', '--pack-destination', output], directory)
  }
  await rename(output, destination)
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { runtime: { type: 'string' } },
  })
  await packWindows(
    requiredPath(positionals[0], 'destination'),
    requiredPath(values.runtime, '--runtime'),
  )
}
