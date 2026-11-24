import { execFileSync } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { basename, delimiter, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { projectRoot, verifyDigest } from '../../files.ts'
import inputs from '../../../engine/media-sources.json' with { type: 'json' }
import bootstraps from '../../../engine/posix/micromamba.json' with { type: 'json' }
import { prepareSource } from '../source.ts'

export type Target = keyof typeof bootstraps
export function target(): Target {
  const name = process.platform + '-' + process.arch
  if (!Object.hasOwn(bootstraps, name)) {
    throw new Error('Unsupported Unix media target: ' + name)
  }
  return name as Target
}
async function archive(
  url: string,
  checksum: string,
  cache: string,
  name = basename(new URL(url).pathname),
) {
  const path = join(cache, name)
  if (!(await stat(path, { throwIfNoEntry: false }))) {
    const response = await fetch(url, { signal: AbortSignal.timeout(180000) })
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: ${response.status} ${url}`)
    }
    await pipeline(response.body, createWriteStream(path))
  }
  await verifyDigest(path, checksum)
  return path
}

export async function buildUnix(work: string, cache: string) {
  const platform = target()
  const mac = process.platform === 'darwin'
  const deps = join(work, 'deps')
  const prefix = join(work, 'prefix')
  await mkdir(cache, { recursive: true })
  await mkdir(work, { recursive: true })
  const bootstrap = bootstraps[platform]
  const manager = await archive(bootstrap.url, bootstrap.sha256, cache)
  await chmod(manager, 0o755)
  const lock = join(projectRoot, 'engine/posix/locks', platform + '.lock')
  execFileSync(
    manager,
    [
      'create',
      '--no-rc',
      '--yes',
      '--root-prefix',
      join(cache, 'mamba'),
      '--prefix',
      deps,
      '--file',
      lock,
    ],
    { stdio: 'inherit' },
  )
  const receipts = await readdir(join(deps, 'conda-meta'))
  const expected = new Set(
    (await readFile(lock, 'utf8')).split('\n').filter((line) => line.startsWith('https:')),
  )
  for (const name of receipts.filter((name) => name.endsWith('.json'))) {
    const entry = JSON.parse(await readFile(join(deps, 'conda-meta', name), 'utf8')) as {
      url: string
      sha256: string
    }
    if (!expected.delete(entry.url + '#' + entry.sha256)) {
      throw new Error('Unpaired dependency: ' + name)
    }
  }
  if (expected.size) {
    throw new Error('Incomplete dependency prefix')
  }

  const sources = join(work, 'sources')
  await mkdir(sources)
  for (const item of inputs) {
    const file = await archive(item.url, item.sha256, cache)
    const directory = join(sources, item.name)
    await mkdir(directory)
    execFileSync('tar', ['-xf', file, '--strip-components=1', '-C', directory], {
      stdio: 'inherit',
    })
  }
  await prepareSource(join(sources, 'mpv'))

  for (const dir of ['lib/pkgconfig', 'bin', 'include']) {
    await mkdir(join(prefix, dir), { recursive: true })
  }
  const systemPkg = mac
    ? ''
    : execFileSync('pkg-config', ['--variable', 'pc_path', 'pkg-config'], {
        encoding: 'utf8',
      }).trim()
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: [join(prefix, 'bin'), join(deps, 'bin'), process.env.PATH].join(delimiter),
    PKG_CONFIG_PATH: [
      join(prefix, 'lib/pkgconfig'),
      join(deps, 'lib/pkgconfig'),
      join(deps, 'share/pkgconfig'),
      systemPkg,
    ].join(':'),
    CPPFLAGS: `-I${prefix}/include -I${deps}/include`,
    LDFLAGS: `-L${prefix}/lib -L${deps}/lib -Wl,-rpath,${prefix}/lib -Wl,-rpath,${deps}/lib`,
  }
  if (mac) {
    env.MACOSX_DEPLOYMENT_TARGET = '13.0'
  } else {
    env.LD_LIBRARY_PATH = join(prefix, 'lib') + ':' + join(deps, 'lib')
  }
  if (!mac) {
    const tuple = execFileSync('gcc', ['-print-multiarch'], { encoding: 'utf8' }).trim()
    await symlink('/usr/include/va', join(prefix, 'include/va'), 'dir')
    const nativeLib = '/usr/lib/' + tuple
    for (const name of ['libva', 'libva-drm']) {
      await symlink(join(nativeLib, name + '.so'), join(prefix, 'lib', name + '.so'))
      await symlink(
        join(nativeLib, 'pkgconfig', name + '.pc'),
        join(prefix, 'lib/pkgconfig', name + '.pc'),
      )
    }
    env.PKG_CONFIG_PATH += ':/usr/lib/' + tuple + '/pkgconfig:/usr/share/pkgconfig'
  } else {
    env.LDFLAGS += ' -Wl,-headerpad_max_install_names'
  }
  const cc = mac ? 'clang' : 'gcc'
  const jobs = String(Math.min(12, availableParallelism()))
  function run(cwd: string, command: string, args: string[]) {
    execFileSync(command, args, { cwd, env, stdio: 'inherit' })
  }
  function make(cwd: string) {
    run(cwd, 'make', ['-j', jobs])
    run(cwd, 'make', ['install'])
  }
  const unibreak = join(sources, 'libunibreak')
  run(unibreak, './configure', ['--prefix=' + prefix, '--enable-shared', '--disable-static'])
  make(unibreak)

  const mujs = join(sources, 'mujs')
  run(mujs, 'make', ['one.c', 'astnames.h', 'opnames.h'])
  const mujsLib = mac ? 'libmujs.dylib' : 'libmujs.so'
  run(mujs, cc, [
    '-O2',
    '-std=c99',
    '-fPIC',
    ...(mac
      ? ['-dynamiclib', '-Wl,-install_name,@rpath/' + mujsLib]
      : ['-shared', '-Wl,-soname,' + mujsLib]),
    'one.c',
    '-lm',
    '-o',
    join(prefix, 'lib', mujsLib),
  ])
  await copyFile(join(mujs, 'mujs.h'), join(prefix, 'include/mujs.h'))
  const mujsVersion = inputs.find((item) => item.name === 'mujs')!.version
  await writeFile(
    join(prefix, 'lib/pkgconfig/mujs.pc'),
    `prefix=${prefix}\nlibdir=\${prefix}/lib\nincludedir=\${prefix}/include\nName: mujs\nDescription: MuJS shared library\nVersion: ${mujsVersion}\nLibs: -L\${libdir} -lmujs\nCflags: -I\${includedir}\n`,
  )

  const common = [
    '--wrap-mode=nodownload',
    '--auto-features=disabled',
    '--buildtype=release',
    '--default-library=shared',
    '--prefix=' + prefix,
    '--libdir=lib',
  ]
  run(work, 'meson', [
    'setup',
    'ass',
    join(sources, 'libass'),
    ...common,
    '-Ddirectwrite=disabled',
    '-Dfontconfig=' + (mac ? 'disabled' : 'enabled'),
    '-Dcoretext=' + (mac ? 'enabled' : 'disabled'),
    '-Dlibunibreak=enabled',
    '-Dasm=enabled',
  ])
  run(work, 'meson', ['compile', '-C', 'ass', '-j', jobs])
  run(work, 'meson', ['install', '-C', 'ass'])
  const ffmpeg = join(work, 'ffmpeg')
  await mkdir(ffmpeg)
  const codecFlags = [
    '--enable-shared',
    '--disable-static',
    '--disable-gpl',
    '--disable-nonfree',
    '--disable-version3',
    '--disable-autodetect',
    '--disable-programs',
    '--disable-doc',
    '--disable-debug',
    '--enable-network',
    '--enable-pthreads',
    '--enable-libdav1d',
    '--enable-libopus',
    '--enable-libvorbis',
    '--enable-libvpx',
    '--enable-libass',
    '--enable-libsoxr',
    '--enable-libzimg',
    '--enable-libxml2',
    '--enable-zlib',
    '--enable-bzlib',
    '--enable-lzma',
    '--enable-iconv',
    '--enable-libplacebo',
    '--enable-vulkan',
  ]
  try {
    run(ffmpeg, join(sources, 'ffmpeg/configure'), [
      '--prefix=' + prefix,
      '--cc=' + cc,
      '--extra-cflags=' + env.CPPFLAGS,
      '--extra-libs=-liconv',
      ...codecFlags,
      ...(mac
        ? ['--enable-securetransport', '--enable-videotoolbox', '--enable-audiotoolbox']
        : ['--enable-gnutls', '--enable-vaapi', '--enable-libdrm', '--enable-alsa']),
    ])
  } catch (error) {
    console.error(
      (await readFile(join(ffmpeg, 'ffbuild/config.log'), 'utf8'))
        .split('\n')
        .slice(-65)
        .join('\n'),
    )
    throw error
  }
  make(ffmpeg)
  const engineFlags = [
    '-Dlibmpv=true',
    '-Dcplayer=false',
    '-Dbuild-date=false',
    '-Dgpl=false',
    '-Dlua=luajit',
    '-Djavascript=enabled',
    '-Dlibavdevice=enabled',
    '-Dgl=enabled',
    '-Diconv=enabled',
    '-Dzlib=enabled',
    '-Dlcms2=enabled',
  ]
  run(work, 'meson', [
    'setup',
    'mpv',
    join(sources, 'mpv'),
    ...common,
    ...engineFlags,
    ...(mac
      ? [
          '-Dcocoa=enabled',
          '-Dgl-cocoa=enabled',
          '-Dvideotoolbox-gl=enabled',
          '-Dcoreaudio=enabled',
          '-Dswift-build=enabled',
        ]
      : [
          '-Dplain-gl=enabled',
          '-Degl=enabled',
          '-Ddrm=enabled',
          '-Dgbm=enabled',
          '-Dvaapi=enabled',
          '-Dvaapi-drm=enabled',
          '-Dalsa=enabled',
          '-Dpulse=enabled',
        ]),
  ])
  run(work, 'meson', ['compile', '-C', 'mpv', '-j', jobs])
  run(work, 'meson', ['install', '-C', 'mpv'])
  return { deps, prefix, sources, platform, cache }
}
