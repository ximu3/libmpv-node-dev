import lock from '../../engine/windows-x64.json' with { type: 'json' }
import metadata from '../../package.json' with { type: 'json' }
import { copyFile, cp, mkdir, mkdtempDisposable, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  digest,
  projectRoot,
  requireNewDirectory,
  requiredPath,
  verifyDigest,
  writeJson,
} from '../files.ts'
import { runPnpm } from '../pnpm.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { engine: { type: 'string' }, dependencies: { type: 'string' } },
})
const destination = requiredPath(positionals[0], 'destination')
const engine = requiredPath(values.engine, '--engine')
const dependencies = requiredPath(values.dependencies, '--dependencies')
const { name, version, description, license, type, exports, files: included } = metadata
const mainPackage = { name, version, description, license, type, exports, files: included }
const target = 'win32-x64'
const platformName = `${mainPackage.name}-${target}`

await requireNewDirectory(destination)
await mkdir(dirname(destination), { recursive: true })
await using work = await mkdtempDisposable(join(dirname(destination), 'libmpv-pack-'))
const platform = join(work.path, 'platform')
await mkdir(platform)
const files: Record<string, string> = { ...lock.dependencies }
for (const [name, expected] of Object.entries(lock.dependencies)) {
  await copyFile(join(dependencies, name), join(platform, name))
  await verifyDigest(join(platform, name), expected)
}
for (const [source, name] of [
  [engine, 'libmpv-2.dll'],
  [join(projectRoot, 'build/addon/libmpv.node'), 'libmpv.node'],
] as const) {
  await copyFile(source, join(platform, name))
  files[name] = await digest(join(platform, name))
}
await writeJson(join(platform, 'runtime.json'), { files })
await writeJson(join(platform, 'package.json'), {
  name: platformName,
  version: mainPackage.version,
  private: true,
  os: ['win32'],
  cpu: ['x64'],
})

const main = join(work.path, 'main')
await cp(join(projectRoot, 'dist'), join(main, 'dist'), { recursive: true })
await copyFile(join(projectRoot, 'LICENSE'), join(main, 'LICENSE'))
await cp(join(projectRoot, 'docs'), join(main, 'docs'), { recursive: true })
await writeJson(join(main, 'dist/build.json'), {
  version: mainPackage.version,
  targets: { [target]: await digest(join(platform, 'runtime.json')) },
})
await writeJson(join(main, 'package.json'), {
  ...mainPackage,
  private: true,
  optionalDependencies: { [platformName]: mainPackage.version },
})

const output = join(work.path, 'packages')
await mkdir(output)
for (const directory of [platform, main]) {
  runPnpm(['pack', '--pack-destination', output], directory)
}
await rename(output, destination)
