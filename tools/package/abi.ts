import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { digest, projectRoot, writeJson } from '../files.ts'
import metadata from '../../package.json' with { type: 'json' }

function version(value: string) {
  return value.split('.').map(Number)
}
function greater(a: string, b: string) {
  const left = version(a),
    right = version(b)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const n = (left[i] ?? 0) - (right[i] ?? 0)
    if (n !== 0) {
      return n > 0
    }
  }
  return false
}
function run(tool: string, args: string[]) {
  return execFileSync(tool, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}
export async function auditPlatform(directory: string, files: readonly string[]) {
  const host = process.platform
  if (host !== 'win32' && host !== 'linux' && host !== 'darwin') {
    throw new Error('Unsupported ABI audit host')
  }
  const objects: Record<string, unknown> = {}
  for (const name of files) {
    if (
      !(
        name.endsWith('.node') ||
        name.endsWith('.dll') ||
        name.endsWith('.dylib') ||
        /\.so(?:\.|$)/.test(name)
      )
    ) {
      continue
    }
    const path = join(directory, name)
    switch (host) {
      case 'win32': {
        const data = await readFile(path)
        const header = data.readUInt32LE(0x3c)
        const machine = data.readUInt16LE(header + 4)
        if (
          machine !== (process.arch === 'x64' ? 0x8664 : 0xaa64) ||
          data.readUInt16LE(header + 24) !== 0x20b
        ) {
          throw new Error('Unexpected PE architecture: ' + name)
        }
        objects[name] = {
          machine: machine.toString(16),
          subsystemVersion: data.readUInt16LE(header + 72) + '.' + data.readUInt16LE(header + 74),
        }
        break
      }
      case 'linux': {
        const header = run('readelf', ['--file-header', '--wide', path])
        const machine = header.match(/^\s*Machine:\s*(.+)$/m)?.[1]?.trim()
        if (
          machine !== (process.arch === 'x64' ? 'Advanced Micro Devices X86-64' : 'AArch64') ||
          !/^\s*Class:\s+ELF64\s*$/m.test(header)
        ) {
          throw new Error('Unexpected ELF architecture: ' + name)
        }
        const names = Array.from(
          run('readelf', ['--version-info', '--wide', path]).matchAll(
            /Name: GLIBC_(\d+\.\d+(?:\.\d+)?)/g,
          ),
          (m) => m[1]!,
        )
        const glibc = names.reduce((max, v) => (greater(v, max) ? v : max), '0')
        if (greater(glibc, '2.35')) {
          throw new Error(name + ' requires glibc ' + glibc)
        }
        objects[name] = { machine, glibc }
        break
      }
      case 'darwin': {
        const arch = process.arch === 'x64' ? 'x86_64' : 'arm64'
        const commands = run('otool', ['-arch', arch, '-l', path])
        const minimum =
          commands.match(
            /cmd LC_BUILD_VERSION\s+cmdsize \d+\s+platform (?:MACOS|macos|1)\s+minos ([\d.]+)/,
          )?.[1] ??
          commands.match(/cmd LC_VERSION_MIN_MACOSX\s+cmdsize \d+\s+version ([\d.]+)/)?.[1]
        if (!minimum || greater(minimum, metadata.config.macosDeploymentTarget)) {
          throw new Error('Unsupported macOS deployment target for ' + name + ': ' + minimum)
        }
        objects[name] = { arch, minimum }
        break
      }
    }
  }
  await writeJson(join(directory, 'abi.json'), {
    target: process.platform + '-' + process.arch,
    nodeApi: 8,
    sourceCommit: run('git', ['-C', projectRoot, 'rev-parse', 'HEAD']).trim(),
    clean: run('git', ['-C', projectRoot, 'status', '--porcelain']).trim() === '',
    cargoLock: await digest(join(projectRoot, 'Cargo.lock')),
    pnpmLock: await digest(join(projectRoot, 'pnpm-lock.yaml')),
    buildNode: process.versions.node,
    rust: run('rustc', ['--version']).trim(),
    objects,
  })
}
