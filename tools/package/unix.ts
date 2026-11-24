import { cp, copyFile, mkdir, mkdtempDisposable, readFile, rename } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import metadata from '../../package.json' with { type: 'json' }
import upstream from '../../engine/mpv/source.json' with { type: 'json' }
import {
  digest,
  projectRoot,
  requireNewDirectory,
  requiredPath,
  verifyDigest,
  writeJson,
} from '../files.ts'
import { runPnpm } from '../pnpm.ts'

export async function packUnix(destination: string, runtime: string) {
  const receipt = JSON.parse(await readFile(join(runtime, 'engine.json'), 'utf8')) as {
    target: string
    mpvCommit: string
    patches: string[]
    files: Record<string, { sha256: string }>
  }
  const target = process.platform + '-' + process.arch
  const engine = process.platform === 'darwin' ? 'libmpv.2.dylib' : 'libmpv.so.2'
  if (
    receipt.target !== target ||
    !receipt.files[engine] ||
    receipt.mpvCommit !== upstream.commit ||
    JSON.stringify(receipt.patches) !== JSON.stringify(upstream.patches.map((x) => x.sha256))
  ) {
    throw new Error('Unpaired Unix engine')
  }
  await requireNewDirectory(destination)
  await mkdir(dirname(destination), { recursive: true })
  await using work = await mkdtempDisposable(join(dirname(destination), 'libmpv-pack-'))
  const platform = join(work.path, 'platform')
  await mkdir(platform)
  const files: Record<string, string> = {}
  for (const [file, artifact] of Object.entries(receipt.files)) {
    if (basename(file) !== file) {
      throw new Error('Invalid runtime library path')
    }
    await copyFile(join(runtime, file), join(platform, file))
    await verifyDigest(join(platform, file), artifact.sha256)
    files[file] = artifact.sha256
  }
  await copyFile(join(runtime, 'engine.json'), join(platform, 'engine.json'))
  await cp(join(runtime, 'third-party'), join(platform, 'third-party'), { recursive: true })
  await copyFile(join(projectRoot, 'build/addon/libmpv.node'), join(platform, 'libmpv.node'))
  files['libmpv.node'] = await digest(join(platform, 'libmpv.node'))
  await writeJson(join(platform, 'runtime.json'), {
    files,
    engine: await digest(join(runtime, 'engine.json')),
  })
  const { name, version, description, license, type, exports, files: included } = metadata
  const platformName = name + '-' + target
  await writeJson(join(platform, 'package.json'), {
    name: platformName,
    version,
    private: true,
    os: [process.platform],
    cpu: [process.arch],
    ...(process.platform === 'linux' ? { libc: ['glibc'] } : {}),
  })
  const main = join(work.path, 'main')
  await cp(join(projectRoot, 'dist'), join(main, 'dist'), { recursive: true })
  await cp(join(projectRoot, 'docs'), join(main, 'docs'), { recursive: true })
  await copyFile(join(projectRoot, 'LICENSE'), join(main, 'LICENSE'))
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
  const packed = join(work.path, 'packages')
  await mkdir(packed)
  for (const path of [platform, main]) {
    runPnpm(['pack', '--pack-destination', packed], path)
  }
  await rename(packed, destination)
}
if (import.meta.main) {
  const { values, positionals } = parseArgs({
    options: { runtime: { type: 'string' } },
    allowPositionals: true,
  })
  await packUnix(
    requiredPath(positionals[0], 'destination'),
    requiredPath(values.runtime, '--runtime'),
  )
}
