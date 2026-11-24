import { collectMaterials } from './materials.ts'
import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import settings from '../../../engine/windows/configuration.json' with { type: 'json' }
import { inputs, target, tuple } from './settings.ts'
import upstream from '../../../engine/mpv/source.json' with { type: 'json' }
import { digest, verifyDigest, writeJson } from '../../files.ts'
import { imports } from './pe.ts'

function componentName(name: string) {
  if (name === 'mujs.dll') {
    return 'mujs'
  }
  if (/^libass-\d+\.dll$/.test(name)) {
    return 'libass'
  }
  if (/^(av(codec|format|filter|util|device)|sw(resample|scale))-\d+\.dll$/.test(name)) {
    return 'ffmpeg'
  }
  throw new Error('Unknown locally built dependency: ' + name)
}
export async function collectRuntime(
  work: string,
  toolchain: string,
  prefix: string,
  output: string,
  cache: string,
) {
  const mpv = join(work, 'obj/libmpv-2.dll')
  const directories = [join(toolchain, target.environment, 'bin'), join(prefix, 'bin')]
  const candidates = new Map<string, string>()
  for (const directory of directories) {
    for (const file of await readdir(directory)) {
      if (file.toLowerCase().endsWith('.dll')) {
        candidates.set(file.toLowerCase(), join(directory, file))
      }
    }
  }
  candidates.set('libmpv-2.dll', mpv)
  const config = await readFile(join(work, 'obj/config.h'), 'utf8')
  for (const name of [
    'D3D11',
    'D3D_HWACCEL',
    'WASAPI',
    'JAVASCRIPT',
    'LUA',
    'LIBASS',
    'LIBPLACEBO',
    'ZLIB',
    'ICONV',
    'LCMS2',
  ]) {
    if (!config.includes(`#define HAVE_${name} 1`)) {
      throw new Error(`Missing engine feature: ${name}`)
    }
  }
  if (!config.includes('#define HAVE_GPL 0')) {
    throw new Error('Unexpected mpv GPL configuration')
  }

  const files: Record<string, { sha256: string; imports: string[]; source: string }> = {}
  const known: Record<string, { sha256: string; archive: string }> = target.dependencies
  const pending = [mpv]
  await mkdir(output, { recursive: true })
  for (let path = pending.pop(); path; path = pending.pop()) {
    const name = basename(path).toLowerCase()
    if (files[name]) {
      continue
    }
    let source = upstream.repository
    if (path !== mpv && path.startsWith(directories[1]! + '\\')) {
      source = inputs.sources.find((item) => item.name === componentName(name))!.url
    } else if (path !== mpv) {
      const expected = known[name]
      if (!expected) {
        throw new Error(`Unclassified dependency: ${name}`)
      }
      await verifyDigest(path, expected.sha256)
      source = expected.archive
    }
    const dependencies = imports(await readFile(path), target.machine)
    for (const dependency of dependencies) {
      const installed = candidates.get(dependency)
      if (installed) {
        pending.push(installed)
      } else if (!settings.systemImports.includes(dependency)) {
        throw new Error(`Unclassified import of ${name}: ${dependency}`)
      }
    }
    await copyFile(path, join(output, name))
    files[name] = { sha256: await digest(join(output, name)), imports: dependencies, source }
  }
  const archives = new Set(
    Object.values(files)
      .map((file) => file.source)
      .filter((source) => source.endsWith('.pkg.tar.zst')),
  )
  await collectMaterials(work, cache, output, archives)
  await writeJson(join(output, 'engine.json'), {
    target: tuple,
    mpvCommit: upstream.commit,
    patches: upstream.patches.map((patch) => patch.sha256),
    files,
  })
}
