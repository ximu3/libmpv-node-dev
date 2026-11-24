import { join } from 'node:path'
import metadata from '../../package.json' with { type: 'json' }
import { projectRoot, requiredPath } from '../files.ts'
import { runPnpm } from '../pnpm.ts'

export function checkMainArchive(packages: string) {
  const archive = join(
    packages,
    metadata.name.slice(1).replace('/', '-') + '-' + metadata.version + '.tgz',
  )
  runPnpm(['exec', 'publint', '--strict', '--level', 'warning', archive], projectRoot)
  runPnpm(['exec', 'attw', archive], projectRoot)
}
if (import.meta.main) {
  checkMainArchive(requiredPath(process.argv[2], 'packages'))
}
