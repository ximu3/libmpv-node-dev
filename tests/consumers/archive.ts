import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createPackageWithOptions } from '@electron/asar'
import metadata from '../../package.json' with { type: 'json' }
import { writeJson } from '../../tools/files.ts'

export async function verifyArchive(
  consumer: string,
  electron: string,
  env: NodeJS.ProcessEnv,
  platform: string,
) {
  const app = join(consumer, 'packaged')
  const asar = join(consumer, 'app.asar')
  await mkdir(app)
  await writeJson(join(app, 'package.json'), {
    name: 'libmpv-consumer',
    version: '1.0.0',
    type: 'module',
    main: 'archive.js',
  })
  await copyFile(join(consumer, 'out/electron/archive.js'), join(app, 'archive.js'))
  for (const name of [metadata.name, platform]) {
    await cp(
      await realpath(join(consumer, 'node_modules', name)),
      join(app, 'node_modules', name),
      { recursive: true, dereference: true },
    )
  }
  const relative = 'node_modules/' + platform
  await createPackageWithOptions(app, asar, { unpackDir: relative })
  const external = join(asar + '.unpacked', relative)
  await realpath(join(external, 'libmpv.node'))
  for (const mismatch of [false, true]) {
    if (mismatch) {
      await writeFile(join(external, 'engine.json'), '{}\n')
    }
    const receipt = join(consumer, mismatch ? 'mismatch.receipt' : 'archive.receipt')
    execFileSync(electron, ['--user-data-dir=' + join(consumer, 'archive-profile'), asar], {
      cwd: consumer,
      stdio: 'inherit',
      timeout: 60000,
      env: { ...env, LIBMPV_TEST_MISMATCH: mismatch ? '1' : '0', LIBMPV_TEST_RECEIPT: receipt },
    })
    assert.equal(await readFile(receipt, 'utf8'), metadata.devDependencies.electron)
  }
}
