import { fileURLToPath } from 'node:url'
import root from '../../package.json' with { type: 'json' }
import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdtempDisposable, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { projectRoot, requiredPath, writeJson } from '../../tools/files.ts'
import { runPnpm } from '../../tools/pnpm.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { electron: { type: 'string' } },
})
const packages = requiredPath(positionals[0], 'packages')
const dependencies: Record<string, string> = {}
for (const name of await readdir(packages)) {
  if (!name.endsWith('.tgz')) {
    continue
  }
  const archive = join(packages, name)
  const manifest: unknown = JSON.parse(
    execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8' }),
  )
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('name' in manifest) ||
    typeof manifest.name !== 'string'
  ) {
    throw new Error('Missing tarball package name')
  }
  dependencies[manifest.name] = pathToFileURL(archive).href
}

await using temporary = await mkdtempDisposable(join(tmpdir(), 'libmpv consumer '))
const consumer = temporary.path
const platform = Object.keys(dependencies).find((name) => name.startsWith(root.name + '-'))
if (!platform || !dependencies[root.name]) {
  throw new Error('Expected paired library and platform packages')
}
await writeJson(join(consumer, 'package.json'), {
  private: true,
  type: 'module',
  main: './out/electron/main.js',
  packageManager: root.packageManager,
  dependencies,
  devDependencies: Object.fromEntries(
    (['typescript', '@types/node', 'electron'] as const).map((key) => [
      key,
      root.devDependencies[key],
    ]),
  ),
})
await writeFile(
  join(consumer, 'pnpm-workspace.yaml'),
  `allowBuilds:\n  electron: false\noverrides:\n  "${platform}": ${JSON.stringify(dependencies[platform])}\n`,
)
await cp(join(projectRoot, 'tests/consumers/fixtures'), consumer, { recursive: true })
await copyFile(join(projectRoot, 'examples/version.ts'), join(consumer, 'example.ts'))
runPnpm(['install', '--offline'], consumer)
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
    'control.ts',
    'worker.ts',
    'example.ts',
    'electron/main.ts',
  ],
  { cwd: consumer, stdio: 'inherit' },
)

const env = { ...process.env }
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
if (values.electron) {
  const receipt = join(consumer, 'electron-version')
  execFileSync(
    resolve(values.electron),
    ['--user-data-dir=' + join(consumer, 'profile'), consumer],
    {
      cwd: consumer,
      env: { ...env, LIBMPV_TEST_RECEIPT: receipt },
      stdio: 'inherit',
      timeout: 60000,
    },
  )
  console.log(`Electron ${await readFile(receipt, 'utf8')} completed the installed-package checks.`)
}
