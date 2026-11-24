import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { projectRoot } from './files.ts'

for (const output of ['dist', 'target', 'build/addon', '.cache/typescript']) {
  await rm(join(projectRoot, output), { recursive: true, force: true })
}
