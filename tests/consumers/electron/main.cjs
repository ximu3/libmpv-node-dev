const { app } = require('electron')

app
  .whenReady()
  .then(async () => {
    await import('./control.mjs')
    require('node:fs').writeFileSync(process.env.LIBMPV_TEST_RECEIPT, process.versions.electron)
    app.quit()
  })
  .catch((error) => {
    console.error(error)
    app.exit(1)
  })
