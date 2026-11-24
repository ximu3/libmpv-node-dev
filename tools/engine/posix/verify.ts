import { mkdtempDisposable } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectRoot, requiredPath } from '../../files.ts'
import { runPnpm } from '../../pnpm.ts'
import { packUnix } from '../../package/unix.ts'

const runtime = requiredPath(process.argv[2], 'runtime')
await using work = await mkdtempDisposable(join(tmpdir(), 'libmpv-consumer-'))
const packages = join(work.path, 'packages')
await packUnix(packages, runtime)
runPnpm(['exec', 'install-electron'], projectRoot)
const electron = process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron'
runPnpm(
  [
    'exec',
    'vp',
    'run',
    'test:consumers',
    packages,
    '--electron',
    join(projectRoot, 'node_modules/electron/dist', electron),
  ],
  projectRoot,
)
