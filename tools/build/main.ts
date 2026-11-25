import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { projectRoot } from '../files.ts'
import { runPnpm } from '../pnpm.ts'

await rm(join(projectRoot, 'dist'), { recursive: true, force: true })
runPnpm(['exec', 'tsc', '-p', 'config/typescript/tsconfig.lib.json'], projectRoot)
