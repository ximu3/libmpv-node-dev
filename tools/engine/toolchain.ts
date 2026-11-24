import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { basename, join } from 'node:path'
import inputs from '../../engine/windows-x64/inputs.json' with { type: 'json' }
import settings from '../../engine/windows-x64/configuration.json' with { type: 'json' }

export function msysPath(path: string) {
  return '/' + path[0]!.toLowerCase() + path.slice(2).replaceAll('\\', '/')
}

export async function prepareToolchain(work: string, cache: string) {
  const bootstrap = join(cache, basename(inputs.bootstrap.url))
  const extractor = join(work, 'extractor')
  const toolchain = join(work, 'toolchain')
  for (const destination of [extractor, toolchain]) {
    await mkdir(destination, { recursive: true })
    execFileSync(bootstrap, ['-y', '-o' + destination], { stdio: 'ignore', windowsHide: true })
  }
  const root = join(toolchain, 'msys64')
  const tar = join(extractor, 'msys64/usr/bin/bsdtar.exe')
  for (const { file } of inputs.packages) {
    execFileSync(
      tar,
      [
        '--exclude=.PKGINFO',
        '--exclude=.BUILDINFO',
        '--exclude=.MTREE',
        '--exclude=.INSTALL',
        '-xf',
        join(cache, file),
        '-C',
        root,
      ],
      { stdio: 'inherit', windowsHide: true },
    )
  }
  const sources = join(work, 'sources')
  await mkdir(sources)
  for (const source of inputs.sources) {
    execFileSync(tar, ['-xf', join(cache, basename(source.url)), '-C', sources], {
      stdio: 'inherit',
      windowsHide: true,
    })
  }
  return root
}

export function engineCommand(root: string, prefix: string, cwd: string, args: string[]) {
  const script = [
    'set -eu',
    'prefix="$1"',
    'shift',
    'export PATH="$prefix/bin:/ucrt64/bin:/usr/bin:/c/Windows/System32"',
    'export PKG_CONFIG_LIBDIR="$prefix/lib/pkgconfig:/ucrt64/lib/pkgconfig:/ucrt64/share/pkgconfig"',
    'unset PKG_CONFIG_PATH',
    'exec "$@"',
  ].join('\n')
  execFileSync(
    join(root, 'usr/bin/bash.exe'),
    ['--noprofile', '--norc', '-c', script, 'build', msysPath(prefix), ...args],
    {
      cwd,
      env: { ...process.env, MSYSTEM: 'UCRT64', CHERE_INVOKING: '1' },
      stdio: 'inherit',
      windowsHide: true,
    },
  )
}

export async function buildDependencies(work: string, root: string) {
  const prefix = join(work, 'prefix')
  const packages = join(prefix, 'lib/pkgconfig')
  for (const name of ['bin', 'lib/pkgconfig', 'include']) {
    await mkdir(join(prefix, name), { recursive: true })
  }
  const parallelism = String(Math.min(12, availableParallelism()))
  const mujs = inputs.sources.find((source) => source.name === 'mujs')!
  const source = join(work, 'sources', 'mujs-' + mujs.version)
  const packagePath = msysPath(prefix)
  engineCommand(root, prefix, source, ['make', 'one.c', 'astnames.h', 'opnames.h'])
  engineCommand(root, prefix, source, [
    'gcc',
    '-O2',
    '-std=c99',
    '-shared',
    'one.c',
    '-lm',
    '-Wl,--out-implib,' + packagePath + '/lib/libmujs.dll.a',
    '-o',
    packagePath + '/bin/mujs.dll',
  ])
  await copyFile(join(source, 'mujs.h'), join(prefix, 'include/mujs.h'))
  const nativePrefix = prefix.replaceAll('\\', '/')
  await writeFile(
    join(packages, 'mujs.pc'),
    `prefix=${nativePrefix}\nlibdir=\${prefix}/lib\nincludedir=\${prefix}/include\nName: mujs\nDescription: MuJS library\nVersion: ${mujs.version}\nLibs: -L\${libdir} -lmujs\nCflags: -I\${includedir}\n`,
  )

  const ffmpeg = inputs.sources.find((source) => source.name === 'ffmpeg')!
  const directory = join(work, 'ffmpeg')
  await mkdir(directory)
  engineCommand(root, prefix, directory, [
    msysPath(join(work, 'sources', 'ffmpeg-' + ffmpeg.version, 'configure')),
    '--prefix=' + packagePath,
    '--target-os=mingw32',
    '--arch=x86_64',
    '--cc=gcc',
    ...settings.ffmpegOptions,
  ])
  engineCommand(root, prefix, directory, ['make', '-j', parallelism])
  engineCommand(root, prefix, directory, ['make', 'install'])
  for (const file of await readdir(packages)) {
    if (!file.endsWith('.pc') || file === 'mujs.pc') {
      continue
    }
    const path = join(packages, file)
    const pc = await readFile(path, 'utf8')
    await writeFile(path, pc.replace(/^prefix=.*$/m, 'prefix=' + nativePrefix))
  }
  return prefix
}
