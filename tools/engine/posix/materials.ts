import { obtain, copySourceLicense } from './sources.ts'
import { execFileSync } from 'node:child_process'
import { copyFile, cp, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { parse } from 'yaml'
import { digest, projectRoot, writeJson } from '../../files.ts'
import upstream from '../../../engine/mpv/source.json' with { type: 'json' }
import sources from '../../../engine/media-sources.json' with { type: 'json' }

export interface Package {
  name: string
  version: string
  build: string
  url: string
  sha256: string
  license: string
  files: string[]
  extracted_package_dir: string
}

interface RecipeSource {
  url: string | string[]
  sha256: string
}
interface Recipe {
  source?: RecipeSource | RecipeSource[]
  staging_caches?: Recipe[]
}
function entries(recipe: Recipe): RecipeSource[] {
  return [...[recipe.source ?? []].flat(), ...(recipe.staging_caches ?? []).flatMap(entries)]
}
async function inputs(recipeDir: string) {
  const rendered = join(recipeDir, 'rendered_recipe.yaml')
  const modern = await stat(rendered, { throwIfNoEntry: false })
  const path = modern ? rendered : join(recipeDir, 'meta.yaml')
  const data = parse(await readFile(path, 'utf8'), { uniqueKeys: false }) as Recipe & {
    recipe: Recipe
  }
  const items = entries(modern ? data.recipe : data)
  if (!items.length || items.some((item) => !item.url || !/^[0-9a-f]{64}$/.test(item.sha256))) {
    throw new Error('Missing source URL or SHA-256 in ' + path)
  }
  return items.map((item) => ({
    urls: Array.isArray(item.url) ? item.url : [item.url],
    sha256: item.sha256,
  }))
}

export async function materials(
  build: { sources: string; cache: string },
  runtime: string,
  packages: Iterable<Package>,
  symbolMap?: string,
) {
  const notices = join(runtime, 'third-party')
  const kit = join(runtime, 'source-materials')
  const recipes = join(kit, 'recipes')
  await mkdir(notices)
  await mkdir(recipes, { recursive: true })
  const list = []
  for (const pkg of packages) {
    const info = join(pkg.extracted_package_dir, 'info')
    const recipeDir = join(info, 'recipe')
    const name = pkg.name + '-' + pkg.version + '-' + pkg.build
    const recipe = join(recipes, name)
    await cp(recipeDir, recipe, { recursive: true })
    const licenses = join(info, 'licenses')
    const notice = join(notices, pkg.name)
    await mkdir(notice)
    if ((await stat(licenses, { throwIfNoEntry: false }))?.isDirectory()) {
      await cp(licenses, notice, { recursive: true })
    } else {
      const documents = pkg.files.filter(
        (file) => file.startsWith('share/licenses/') && !file.endsWith('/'),
      )
      for (const file of documents) {
        await copyFile(join(pkg.extracted_package_dir, file), join(notice, basename(file)))
      }
    }
    const artifacts = await inputs(recipeDir)
    if (!(await readdir(notice)).length) {
      const archive = await obtain(artifacts[0]!, join(build.cache, 'upstream'))
      await copySourceLicense(archive, notice)
    }
    list.push({
      name: pkg.name,
      version: pkg.version,
      build: pkg.build,
      binary: pkg.url,
      sha256: pkg.sha256,
      license: pkg.license,
      recipe: 'recipes/' + name,
      sources: artifacts,
    })
  }
  const mpvDir = join(build.sources, 'mpv')
  const archive = join(kit, 'mpv-' + upstream.commit + '.tar.gz')
  execFileSync('git', [
    '-C',
    mpvDir,
    'archive',
    '--format=tar.gz',
    '--prefix=mpv/',
    '-o',
    archive,
    upstream.commit,
  ])
  await cp(join(projectRoot, 'engine/mpv'), join(kit, 'mpv-patches'), { recursive: true })
  for (const item of sources) {
    await copyFile(
      join(build.cache, basename(new URL(item.url).pathname)),
      join(kit, basename(new URL(item.url).pathname)),
    )
  }
  for (const [name, docs] of Object.entries({
    mpv: ['Copyright', 'LICENSE.LGPL', 'LICENSE.GPL'],
    ffmpeg: ['LICENSE.md', 'COPYING.LGPLv2.1', 'COPYING.LGPLv3', 'CREDITS'],
    mujs: ['COPYING', 'AUTHORS'],
    libass: ['COPYING'],
    libunibreak: ['LICENCE'],
  })) {
    const notice = join(notices, name)
    await mkdir(notice, { recursive: true })
    for (const doc of docs) {
      await copyFile(join(build.sources, name, doc), join(notice, doc))
    }
  }
  if (process.platform === 'linux') {
    await cp(join(projectRoot, 'engine/posix/fontconfig'), join(kit, 'libass-fontconfig'), {
      recursive: true,
    })
  }
  const manifest = {
    upstream,
    sources,
    packages: list.sort((a, b) => a.name.localeCompare(b.name, 'en')),
  }
  await writeJson(join(notices, 'components.json'), manifest)
  await writeJson(join(kit, 'components.json'), manifest)
  if (symbolMap) {
    await copyFile(symbolMap, join(kit, 'media-symbols.txt'))
  }
  const hashes: Record<string, string> = {}
  for (const file of await readdir(kit, { recursive: true, withFileTypes: true })) {
    if (!file.isFile()) {
      continue
    }
    const path = join(file.parentPath, file.name)
    hashes[path.slice(kit.length + 1).replaceAll('\\', '/')] = await digest(path)
  }
  await writeJson(join(kit, 'checksums.json'), hashes)
}
