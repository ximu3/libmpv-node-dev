import { mediaSymbols } from './elf.ts'
import { materials, type Package } from './materials.ts'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chmod, copyFile, mkdir, readFile, readdir, realpath, stat } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import { digest, projectRoot, writeJson } from '../../files.ts'
import upstream from '../../../engine/mpv/source.json' with { type: 'json' }
import type { Target } from './build.ts'

interface Entry {
  name: string
  path: string
  imports: string[]
  owner: string
  input: string
}
const systemLinux =
  /^(?:ld-linux[^/]*|lib(?:c|m|dl|pthread|util|rt|resolv|EGL|GL|GLX|OpenGL|GLESv2|drm(?:_[a-z0-9]+)?|gbm|va(?:-drm|-x11|-wayland)?|vulkan|asound|pulse(?:-simple)?|udev))\.so(?:\..*)?$/

async function exists(file: string) {
  return (await stat(file, { throwIfNoEntry: false }))?.isFile() ?? false
}

export async function assembleUnix(
  build: { prefix: string; deps: string; sources: string; platform: Target; cache: string },
  runtime: string,
) {
  const mac = process.platform === 'darwin'
  const engine = mac ? 'libmpv.2.dylib' : 'libmpv.so.2'
  const packages = new Map<string, Package>()
  for (const file of await readdir(join(build.deps, 'conda-meta'))) {
    if (!file.endsWith('.json')) {
      continue
    }
    const pkg = JSON.parse(await readFile(join(build.deps, 'conda-meta', file), 'utf8')) as Package
    for (const entry of pkg.files) {
      if (entry.startsWith('lib/')) {
        packages.set(entry, pkg)
      }
    }
  }
  const patch = join(build.deps, 'bin/patchelf')
  const env = { ...process.env, LD_LIBRARY_PATH: join(build.deps, 'lib') }
  function run(cmd: string, args: string[]) {
    return execFileSync(cmd, args, { encoding: 'utf8', env, maxBuffer: 8 * 1024 * 1024 }).trim()
  }
  function dependencies(path: string) {
    if (!mac) {
      return run(patch, ['--print-needed', path]).split('\n').filter(Boolean)
    }
    const lines = run('otool', ['-L', path])
      .split('\n')
      .slice(1)
      .map((line) => line.trim().replace(/ \(compatibility version .*$/, ''))
    // The first load command is the library's own install name.
    return lines.slice(1)
  }
  const used = new Map<string, Package>()
  const entries = new Map<string, Entry>()
  const external = new Set<string>()
  const pending = [engine]
  while (pending.length) {
    const name = pending.pop()!
    if (entries.has(name)) {
      continue
    }
    const sourcePath = join(build.prefix, 'lib', name)
    const built = await exists(sourcePath)
    const path = built ? sourcePath : join(build.deps, 'lib', name)
    if (!(await exists(path))) {
      throw new Error('Unclassified media dependency: ' + name)
    }
    const pkg = built ? undefined : packages.get(relative(build.deps, await realpath(path)))
    if (pkg) {
      used.set(pkg.name, pkg)
    }
    const owner = built ? 'source' : pkg?.name
    if (!owner) {
      throw new Error('Missing package owner: ' + name)
    }
    const imports = dependencies(path)
    entries.set(name, { name, path, owner, imports, input: await digest(path) })
    for (const dep of imports) {
      if (
        (mac && (dep.startsWith('/System/Library/') || dep.startsWith('/usr/lib/'))) ||
        (!mac && systemLinux.test(dep))
      ) {
        external.add(dep)
      } else {
        pending.push(basename(dep))
      }
    }
  }
  const id = createHash('sha256')
    .update(
      JSON.stringify([...entries.keys()].sort().map((name) => [name, entries.get(name)!.input])),
    )
    .digest('hex')
    .slice(0, 12)
  function outputName(name: string) {
    return name === engine ? engine : 'mpv-node-' + id + '-' + name
  }
  await mkdir(runtime, { recursive: true })
  const symbols = join(dirname(runtime), 'media-symbols.txt')
  if (!mac) {
    await mediaSymbols(entries.values(), id, symbols)
  }
  const files: Record<string, { sha256: string; source: string; input: string }> = {}
  for (const entry of entries.values()) {
    const name = outputName(entry.name)
    const file = join(runtime, name)
    await copyFile(entry.path, file)
    await chmod(file, 0o755)
    if (mac) {
      const args = ['-id', '@rpath/' + name]
      for (const dep of entry.imports) {
        if (!external.has(dep)) {
          args.push('-change', dep, '@loader_path/' + outputName(basename(dep)))
        }
      }
      const commands = run('otool', ['-l', file])
      for (const match of commands.matchAll(/cmd LC_RPATH\s+cmdsize \d+\s+path (.+?) \(offset/g)) {
        args.push('-delete_rpath', match[1]!)
      }
      run('install_name_tool', [...args, file])
      run('codesign', ['--force', '--sign', '-', file])
    } else {
      const args = ['--set-soname', name, '--set-rpath', '$ORIGIN']
      for (const dep of entry.imports) {
        if (!external.has(dep)) {
          args.push('--replace-needed', dep, outputName(dep))
        }
      }
      run(patch, [...args, file])
      run(patch, ['--rename-dynamic-symbols', symbols, file])
    }
    files[name] = { sha256: await digest(file), source: entry.owner, input: entry.input }
  }
  if (!mac) {
    const config = join(runtime, 'fonts.conf')
    await copyFile(join(projectRoot, 'engine/posix/fontconfig/fonts.conf'), config)
    const hash = await digest(config)
    files['fonts.conf'] = { sha256: hash, input: hash, source: 'libmpv-node' }
  }
  await materials(build, runtime, used.values(), mac ? undefined : symbols)
  await writeJson(join(runtime, 'engine.json'), {
    target: build.platform,
    mpvCommit: upstream.commit,
    patches: upstream.patches.map((p) => p.sha256),
    files,
    system: [...external].sort(),
  })
  const installed = await realpath(join(runtime, engine))
  console.info(`Assembled ${entries.size} media libraries in ${dirname(installed)}`)
}
