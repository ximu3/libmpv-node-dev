import assert from 'node:assert/strict'
import { readFile, realpath, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'

export async function checkUnixModules() {
  if (process.platform === 'win32') {
    return
  }
  const name = '@ximu3/libmpv-node-' + process.platform + '-' + process.arch
  const folder = dirname(createRequire(import.meta.url).resolve(name + '/package.json'))
  const engine = JSON.parse(await readFile(join(folder, 'engine.json'), 'utf8')) as {
    files: Record<string, unknown>
  }
  const report = process.report.getReport() as { sharedObjects: string[] }
  const loaded = new Map<string, string[]>()
  for (const path of report.sharedObjects) {
    const key = basename(path)
    const refs = loaded.get(key) ?? []
    refs.push(path)
    loaded.set(key, refs)
  }
  const libs = Object.keys(engine.files).filter(
    (file) => file.endsWith('.dylib') || file.endsWith('.so') || file.includes('.so.'),
  )
  for (const lib of libs) {
    const expected = await stat(await realpath(join(folder, lib)), { bigint: true })
    const paths = loaded.get(lib) ?? []
    let found = false
    for (const path of paths) {
      const actual = await stat(path, { bigint: true })
      if (actual.dev === expected.dev && actual.ino === expected.ino) {
        found = true
        break
      }
    }
    assert.ok(found, 'Expected the installed media image ' + lib + ' among ' + paths.join(', '))
  }
  console.log(libs.length + ' installed media modules matched the loaded files')
}
