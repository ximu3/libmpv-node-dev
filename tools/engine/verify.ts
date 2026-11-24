import { mkdtempDisposable } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareSource } from './source.ts'

await using work = await mkdtempDisposable(join(tmpdir(), 'libmpv-source-'))
await prepareSource(join(work.path, 'mpv'))
