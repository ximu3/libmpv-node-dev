import { checkMainArchive } from './check.ts'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtempDisposable, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { projectRoot, requiredPath } from '../files.ts'
import { runPnpm } from '../pnpm.ts'
import { packPlatform } from './platform.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'keep-platform': { type: 'string' }, installed: { type: 'boolean' } },
})
const location = requiredPath(positionals[0], values.installed ? 'packages' : 'runtime')
await using work = await mkdtempDisposable(join(tmpdir(), 'libmpv-media-'))
let packages = location
if (!values.installed) {
  if (process.platform === 'linux') {
    const output = execFileSync('ldd', ['-r', join(location, 'libmpv.so.2')], { encoding: 'utf8' })
    const errors = output
      .split('\n')
      .filter((line) => line.includes('not found') || line.includes('undefined symbol'))
    if (errors.length) {
      throw new Error(errors.join('\n'))
    }
  }
  packages = join(work.path, 'packages')
  await packPlatform(packages, location)
}
checkMainArchive(packages)
runPnpm(['exec', 'install-electron'], projectRoot)
const binaries = {
  win32: 'electron.exe',
  darwin: 'Electron.app/Contents/MacOS/Electron',
  linux: 'electron',
}
runPnpm(
  [
    'exec',
    'vp',
    'run',
    'test:consumers',
    packages,
    '--electron',
    join(
      projectRoot,
      'node_modules/electron/dist',
      binaries[process.platform as keyof typeof binaries],
    ),
  ],
  projectRoot,
)
if (values['keep-platform']) {
  const destination = requiredPath(values['keep-platform'], '--keep-platform')
  await mkdir(destination, { recursive: true })
  const platform = '-' + process.platform + '-' + process.arch + '-'
  const archives = (await readdir(packages)).filter(
    (name) => name.includes(platform) && name.endsWith('.tgz'),
  )
  if (archives.length !== 1) {
    throw new Error('Expected one verified platform archive')
  }
  await copyFile(join(packages, archives[0]!), join(destination, archives[0]!))
}
