import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import upstream from '../../../engine/mpv/source.json' with { type: 'json' }
import { projectRoot, requiredPath, verifyDigest } from '../../files.ts'

const runtime = requiredPath(process.argv[2], 'runtime')
const receipt = JSON.parse(await readFile(join(runtime, 'engine.json'), 'utf8')) as {
  mpvCommit: string
  target: string
  patches: string[]
  files: Record<string, { sha256: string }>
}
const expected = upstream.patches.map((item) => item.sha256)
if (
  receipt.target !== 'win32-' + process.arch ||
  receipt.mpvCommit !== upstream.commit ||
  JSON.stringify(receipt.patches) !== JSON.stringify(expected)
) {
  throw new Error('Unexpected engine identity')
}
for (const file of await readdir(runtime)) {
  if (!file.endsWith('.dll')) {
    continue
  }
  const entry = receipt.files[file]
  if (!entry) {
    throw new Error('Unrecorded engine DLL: ' + file)
  }
}
for (const [name, entry] of Object.entries(receipt.files)) {
  await verifyDigest(join(runtime, name), entry.sha256)
}
execFileSync(
  'cargo',
  ['test', '--locked', '-p', 'libmpv-core', '--test', 'windows_media', '--', '--ignored'],
  {
    cwd: projectRoot,
    env: { ...process.env, LIBMPV_TEST_RUNTIME: runtime },
    stdio: 'inherit',
  },
)
