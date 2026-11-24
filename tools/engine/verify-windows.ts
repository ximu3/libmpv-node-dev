import { mkdtempDisposable } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectRoot } from '../files.ts'
import { runPnpm } from '../pnpm.ts'
import { packWindows } from '../package/windows.ts'
import { buildEngine } from './windows.ts'

await using work = await mkdtempDisposable(join(tmpdir(), 'libmpv-media-'))
const runtime = join(work.path, 'runtime')
const packages = join(work.path, 'packages')
await buildEngine(runtime, join(work.path, 'archives'))
await packWindows(packages, runtime)
runPnpm(['exec', 'install-electron'], projectRoot)
runPnpm(
  [
    'exec',
    'vp',
    'run',
    'test:consumers',
    packages,
    '--electron',
    join(projectRoot, 'node_modules/electron/dist/electron.exe'),
  ],
  projectRoot,
)
