import { cp, copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import metadata from '../../package.json' with { type: 'json' }
import { projectRoot, writeJson } from '../files.ts'

export async function stageMain(main: string, targets: Readonly<Record<string, string>>) {
  const { name, version, description, license, type, exports, files } = metadata
  await mkdir(main, { recursive: true })
  await cp(join(projectRoot, 'dist'), join(main, 'dist'), { recursive: true })
  await copyFile(join(projectRoot, 'LICENSE'), join(main, 'LICENSE'))
  await cp(join(projectRoot, 'docs'), join(main, 'docs'), { recursive: true })
  await writeJson(join(main, 'dist/build.json'), { version, targets })
  await writeJson(join(main, 'package.json'), {
    name,
    version,
    description,
    license,
    type,
    exports,
    files,
    private: true,
    optionalDependencies: Object.fromEntries(
      Object.keys(targets)
        .sort()
        .map((target) => [name + '-' + target, version]),
    ),
  })
}
