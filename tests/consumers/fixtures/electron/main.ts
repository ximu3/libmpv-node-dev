import { writeFile } from 'node:fs/promises'
import { app } from 'electron'

async function verify() {
  app.on('window-all-closed', () => {})
  await app.whenReady()
  await import('../control.js')
  await writeFile(process.env.LIBMPV_TEST_RECEIPT!, process.versions.electron)
  app.quit()
}

void verify().catch((error: unknown) => {
  console.error(error)
  app.exit(1)
})
