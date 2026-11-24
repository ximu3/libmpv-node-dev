import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { app } from 'electron'
import { createMpv, MpvBindingError } from '@ximu3/libmpv-node'

async function verify() {
  await app.whenReady()
  if (process.env.LIBMPV_TEST_MISMATCH === '1') {
    await assert.rejects(
      createMpv(),
      (error) => error instanceof MpvBindingError && error.code === 'incompatibleLibrary',
    )
  } else {
    await using player = await createMpv({
      options: [
        ['ao', 'null'],
        ['vo', 'null'],
      ],
    })
    assert.ok((await player.getProperty('mpv-version')).length > 0)
    assert.equal(await player.command(['expand-text', 'paired archive']), 'paired archive')
  }
  await writeFile(process.env.LIBMPV_TEST_RECEIPT!, process.versions.electron)
  app.quit()
}
void verify().catch((error: unknown) => {
  console.error(error)
  app.exit(1)
})
