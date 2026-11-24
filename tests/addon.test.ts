import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'

test('a missing engine fails at its package location', async () => {
  const native = createRequire(import.meta.url)('../build/addon/libmpv.node')
  const directory = await mkdtemp(join(tmpdir(), 'libmpv-missing-'))
  try {
    const result = await native.loadLibrary(directory)
    assert.equal(result.error, 'libraryLoadFailed')
    assert.equal(result.version, undefined)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
