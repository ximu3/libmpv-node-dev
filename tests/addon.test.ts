import type { NativeLibrary } from '../src/library.ts'
import assert from 'node:assert/strict'
import { appendFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { test } from 'vitest'

test('a missing engine fails at its package location', async () => {
  const native = createRequire(import.meta.url)('../build/addon/libmpv.node') as NativeLibrary
  const directory = await mkdtemp(join(tmpdir(), 'libmpv-missing-'))
  try {
    const result = await native.loadLibrary(directory)
    assert.equal(result.error, 'libraryLoadFailed')
    assert.equal(result.version, undefined)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('enumerates native device identities on the host', async () => {
  const native = createRequire(import.meta.url)('../build/addon/libmpv.node') as NativeLibrary
  const result = await native.videoDevices(native.NativeCreation.start())
  assert.ok('devices' in result)
  const identities = new Set<string>()
  for (const { name, selection } of result.devices) {
    assert.ok(name)
    assert.equal(selection.platform, process.platform)
    let id: string
    switch (selection.platform) {
      case 'win32':
        id = String(selection.adapterLuid)
        break
      case 'darwin':
        id = String(selection.rendererId)
        break
      case 'linux':
        id = selection.renderNode
        break
    }
    assert.ok(!identities.has(id))
    identities.add(id)
  }
  const summary = `${process.platform}-${process.arch}: ${identities.size} graphics devices`
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n')
  }
  process.stdout.write(summary + '\n')
})
