import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { inputs, target } from './settings.ts'
import sourcePackages from '../../../engine/windows/sources.json' with { type: 'json' }
import upstream from '../../../engine/mpv/source.json' with { type: 'json' }
import { digest, projectRoot, writeJson } from '../../files.ts'
import { fetchArchive, packageUrl } from './archives.ts'

const nested: Record<string, { archive: string; files: string[] }> = {
  'mingw-w64-libvorbis': {
    archive: 'libvorbis-1.3.7.tar.gz',
    files: ['libvorbis-1.3.7/COPYING', 'libvorbis-1.3.7/AUTHORS'],
  },
  'mingw-w64-libvpx': {
    archive: 'libvpx-1.17.0.tar.gz',
    files: ['libvpx-1.17.0/LICENSE', 'libvpx-1.17.0/PATENTS', 'libvpx-1.17.0/AUTHORS'],
  },
  'mingw-w64-zimg': { archive: 'zimg-3.0.6.tar.gz', files: ['zimg-release-3.0.6/COPYING'] },
}

export async function collectMaterials(
  work: string,
  cache: string,
  output: string,
  archives: Set<string>,
) {
  const licenseDirectory = target.environment + '/share/licenses/'
  const notices = join(output, 'third-party')
  const sources = join(output, 'source-materials')
  await mkdir(notices, { recursive: true })
  await mkdir(sources, { recursive: true })
  const tar = join(work, 'extractor/msys64/usr/bin/bsdtar.exe')
  function member(archive: string, file: string) {
    return execFileSync(tar, ['-xOf', archive, file], { maxBuffer: 16 * 1024 * 1024 })
  }
  async function copyNotices(name: string, from: string, files: string[]) {
    await mkdir(join(notices, name), { recursive: true })
    for (const file of files) {
      await copyFile(join(from, file), join(notices, name, file))
    }
  }
  await copyNotices('mpv', join(work, 'mpv'), ['Copyright', 'LICENSE.GPL', 'LICENSE.LGPL'])
  await cp(join(projectRoot, 'engine/mpv'), join(sources, 'mpv-patches'), { recursive: true })
  const source = join(sources, 'mpv-' + upstream.commit + '.tar.gz')
  execFileSync('git', [
    '-C',
    join(work, 'mpv'),
    'archive',
    '--format=tar.gz',
    '--prefix=mpv/',
    '--output=' + source,
    upstream.commit,
  ])
  for (const item of inputs.sources) {
    const file = basename(item.url)
    await copyFile(join(cache, file), join(sources, file))
    const directory = join(work, 'sources', item.name + '-' + item.version)
    let texts = ['COPYING']
    if (item.name === 'mujs') {
      texts = ['COPYING', 'AUTHORS']
    } else if (item.name === 'ffmpeg') {
      texts = [
        'LICENSE.md',
        'CREDITS',
        'COPYING.LGPLv2.1',
        'COPYING.LGPLv3',
        'COPYING.GPLv2',
        'COPYING.GPLv3',
      ]
    }
    await copyNotices(item.name, directory, texts)
  }

  const components: Array<{
    binary: string
    source: string
    metadata: string
    recipe: string
    project: string[]
    licenses: string[]
  }> = []
  for (const archive of [...archives].sort()) {
    const binary = join(cache, archive)
    const info = member(binary, '.PKGINFO').toString('utf8')
    const build = member(binary, '.BUILDINFO').toString('utf8')
    const pkgbase = /^pkgbase = (.+)$/m.exec(build)?.[1]?.trim()
    if (!pkgbase || !Object.hasOwn(sourcePackages, pkgbase)) {
      throw new Error('Missing corresponding source for ' + archive)
    }
    const recipe = sourcePackages[pkgbase as keyof typeof sourcePackages]
    const src = await fetchArchive(cache, {
      url: 'https://repo.msys2.org/mingw/sources/' + recipe.archive,
      sha256: recipe.sha256,
    })
    if (
      digestBytes(member(src, pkgbase + '/PKGBUILD')) !== recipe.recipeSha256 ||
      !build.includes('pkgbuild_sha256sum = ' + recipe.recipeSha256)
    ) {
      throw new Error('Mismatched source recipe for ' + archive)
    }
    await copyFile(src, join(sources, recipe.archive))
    const directory = join(notices, pkgbase)
    await mkdir(directory, { recursive: true })
    const files = execFileSync(tar, ['-tf', binary], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    })
      .split(/\r?\n/)
      .filter(
        (file) => file.startsWith(licenseDirectory) && !file.endsWith('/') && !file.includes('..'),
      )
    for (const file of files) {
      const target = join(directory, file.slice(licenseDirectory.length))
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, member(binary, file))
    }
    if (files.length === 0) {
      if (pkgbase === 'mingw-w64-luajit') {
        const repository = pkgbase + '/luajit'
        execFileSync(tar, ['-xf', src, '-C', work, repository])
        const license = execFileSync('git', [
          '--git-dir',
          join(work, repository),
          'show',
          '2a8e017ef1ece6a95b983ffca073d30609dce7c4:COPYRIGHT',
        ])
        await writeFile(join(directory, 'COPYRIGHT'), license)
      } else {
        const input = nested[pkgbase]
        if (!input) {
          throw new Error('Missing license material for ' + archive)
        }
        const path = pkgbase + '/' + input.archive
        execFileSync(tar, ['-xf', src, '-C', work, path])
        for (const file of input.files) {
          await writeFile(join(directory, basename(file)), member(join(work, path), file))
        }
      }
    }
    const name = /^pkgname = (.+)$/m.exec(info)![1]!.trim()
    await writeFile(join(directory, name + '.pkginfo'), info)
    components.push({
      binary: packageUrl(archive),
      source: 'https://repo.msys2.org/mingw/sources/' + recipe.archive,
      metadata: name + '.pkginfo',
      recipe: `https://github.com/msys2/MINGW-packages/tree/${recipe.recipeCommit}/${pkgbase}`,
      project: [...info.matchAll(/^url = (.+)$/gm)].map((row) => row[1]!.trim()),
      licenses: [...info.matchAll(/^license = (.+)$/gm)].map((row) => row[1]!.trim()),
    })
  }
  await writeJson(join(notices, 'components.json'), {
    mpv: upstream,
    sources: inputs.sources,
    components,
  })
  const checksums: Record<string, string> = {}
  for (const file of await readdir(sources, { withFileTypes: true })) {
    if (file.isFile() && file.name !== 'checksums.json') {
      checksums[file.name] = await digest(join(sources, file.name))
    }
  }
  await writeJson(join(sources, 'checksums.json'), checksums)
}

function digestBytes(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex')
}
