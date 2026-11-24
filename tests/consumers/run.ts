import { verifyArchive } from './archive.ts'
import { globSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import root from '../../package.json' with { type: 'json' }
import { execFileSync } from 'node:child_process'
import {
  copyFile,
  cp,
  mkdir,
  mkdtempDisposable,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { parseArgs } from 'node:util'
import { projectRoot, requiredPath, writeJson } from '../../tools/files.ts'
import { runPnpm } from '../../tools/pnpm.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { electron: { type: 'string' } },
})
const packages = requiredPath(positionals[0], 'packages')
await using temporary = await mkdtempDisposable(join(tmpdir(), 'libmpv 媒体 📚 '))
const consumer = temporary.path
await mkdir(join(consumer, 'archives'))
let archiveIndex = 0
const platform = root.name + '-' + process.platform + '-' + process.arch
const dependencies: Record<string, string> = {}
for (const name of await readdir(packages)) {
  if (!name.endsWith('.tgz')) {
    continue
  }
  const archive = join(packages, name)
  const fixtureArchive = 'archives/package-' + archiveIndex++ + '.tgz'
  await copyFile(archive, join(consumer, fixtureArchive))
  const manifest: unknown = JSON.parse(
    execFileSync('tar', ['-xOf', fixtureArchive, 'package/package.json'], {
      cwd: consumer,
      encoding: 'utf8',
    }),
  )
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('name' in manifest) ||
    typeof manifest.name !== 'string'
  ) {
    throw new Error('Missing tarball package name')
  }
  if (manifest.name !== root.name && manifest.name !== platform) {
    continue
  }
  if (Object.hasOwn(dependencies, manifest.name)) {
    throw new Error('Duplicate package ' + manifest.name)
  }
  dependencies[manifest.name] = 'file:./' + fixtureArchive
}

if (!dependencies[platform] || !dependencies[root.name]) {
  throw new Error('Expected paired library and platform packages')
}
const fixture = {
  private: true,
  type: 'module',
  main: './out/electron/main.js',
  devDependencies: Object.fromEntries(
    (['typescript', '@types/node', 'electron'] as const).map((key) => [
      key,
      root.devDependencies[key],
    ]),
  ),
}
await writeJson(join(consumer, 'package.json'), fixture)
await writeFile(
  join(consumer, 'pnpm-workspace.yaml'),
  `allowBuilds:\n  electron: false\noverrides:\n  "${platform}": ${JSON.stringify(dependencies[platform])}\n`,
)
await cp(join(projectRoot, 'tests/consumers/fixtures'), consumer, { recursive: true })
await cp(join(projectRoot, 'examples'), join(consumer, 'examples'), { recursive: true })
runPnpm(['install', '--no-frozen-lockfile'], consumer)
await writeJson(join(consumer, 'package.json'), { ...fixture, dependencies })
runPnpm(['install', '--no-frozen-lockfile', '--offline'], consumer)
runPnpm(['exec', 'tsc', '-p', 'tsconfig.json'], consumer)
execFileSync(
  process.execPath,
  [
    fileURLToPath(import.meta.resolve('vite-plus/bin')),
    'lint',
    '--config',
    join(projectRoot, 'vite.config.ts'),
    '--ignore-path',
    join(projectRoot, '.gitignore'),
    ...globSync('**/*.{ts,cts}', { cwd: join(projectRoot, 'tests/consumers/fixtures') }),
    ...globSync('examples/*.ts', { cwd: consumer }),
  ],
  { cwd: consumer, stdio: 'inherit' },
)

const env = { ...process.env }
for (const key of [
  'XDG_CONFIG_HOME',
  'XDG_CACHE_HOME',
  'XDG_DATA_HOME',
  'XDG_STATE_HOME',
  'MPV_HOME',
]) {
  const directory = join(consumer, 'profile-data', key)
  await mkdir(directory, { recursive: true })
  env[key] = directory
}
for (const key of ['NODE_PATH', 'NODE_OPTIONS', 'ELECTRON_RUN_AS_NODE']) {
  delete env[key]
}
if (process.platform === 'win32') {
  env.PATH = join(process.env.SystemRoot!, 'System32')
}
execFileSync(process.execPath, [join(consumer, 'out/control.js')], {
  cwd: consumer,
  env,
  stdio: 'inherit',
  timeout: 60000,
})
const metadata = JSON.parse(
  execFileSync(
    process.execPath,
    [join(consumer, 'out/examples/metadata.js'), join(consumer, 'media/subtitle-font.mkv')],
    { cwd: consumer, env, encoding: 'utf8', timeout: 30000 },
  ),
) as { tracks: { type: string; codec: string }[] }
if (!metadata.tracks.some((track) => track.type === 'video' && track.codec === 'ffv1')) {
  throw new Error('The installed metadata example did not identify the FFV1 stream')
}
if (values.electron) {
  const display = env.LIBMPV_TEST_DISPLAY
  const args: string[] = []
  if (display !== undefined) {
    if (process.platform !== 'linux' || (display !== 'x11' && display !== 'wayland')) {
      throw new Error('Expected a Linux X11 or Wayland session')
    }
    if (display === 'wayland') {
      if (!env.WAYLAND_DISPLAY) {
        throw new Error('Missing Wayland display')
      }
      delete env.DISPLAY
    } else {
      if (!env.DISPLAY) {
        throw new Error('Missing X11 display')
      }
      delete env.WAYLAND_DISPLAY
    }
    args.push('--ozone-platform=' + display)
  }
  const receipt = join(consumer, 'electron-version')
  execFileSync(
    resolve(values.electron),
    [...args, '--user-data-dir=' + join(consumer, 'profile'), consumer],
    {
      cwd: consumer,
      env: { ...env, LIBMPV_TEST_RECEIPT: receipt },
      stdio: 'inherit',
      timeout: 60000,
    },
  )
  const version = await readFile(receipt, 'utf8')
  if (version !== fixture.devDependencies.electron) {
    throw new Error('Missing receipt from Electron ' + fixture.devDependencies.electron)
  }
  await verifyArchive(consumer, resolve(values.electron), env, platform)
  console.log(`Electron ${version} completed the installed-package and ASAR checks.`)
}
