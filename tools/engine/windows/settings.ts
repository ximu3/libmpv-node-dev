import bootstrap from '../../../engine/windows/bootstrap.json' with { type: 'json' }
import sources from '../../../engine/media-sources.json' with { type: 'json' }
import x64Packages from '../../../engine/windows/x64/packages.json' with { type: 'json' }
import arm64Packages from '../../../engine/windows/arm64/packages.json' with { type: 'json' }
import x64Dependencies from '../../../engine/windows/x64/dependencies.json' with { type: 'json' }
import arm64Dependencies from '../../../engine/windows/arm64/dependencies.json' with { type: 'json' }

const targets = {
  x64: {
    environment: 'ucrt64',
    arch: 'x86_64',
    compiler: 'gcc',
    machine: 0x8664,
    packages: x64Packages,
    dependencies: x64Dependencies,
  },
  arm64: {
    environment: 'clangarm64',
    arch: 'aarch64',
    compiler: 'clang',
    machine: 0xaa64,
    packages: arm64Packages,
    dependencies: arm64Dependencies,
  },
} as const
if (process.platform !== 'win32' || (process.arch !== 'x64' && process.arch !== 'arm64')) {
  throw new Error('The Windows engine must be built on its target architecture')
}
export const target = targets[process.arch]
export const tuple = 'win32-' + process.arch
export const inputs = {
  bootstrap,
  sources: sources.filter((item) => ['ffmpeg', 'mujs', 'libass'].includes(item.name)),
  packages: target.packages,
}
