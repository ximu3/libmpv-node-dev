import { execFileSync } from 'node:child_process'
import settings from '../../engine/windows-x64.json' with { type: 'json' }
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { requiredPath } from '../files.ts'
import { prepareSource } from './source.ts'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    msys: { type: 'string' },
    prefix: { type: 'string' },
    repository: { type: 'string' },
  },
})
const destination = requiredPath(positionals[0], 'destination')
const msys = requiredPath(values.msys, '--msys')
const prefix = requiredPath(values.prefix, '--prefix')
await prepareSource(join(destination, 'source'), values.repository)

const bash = join(msys, 'usr/bin/bash.exe')
const script = [
  'set -eu',
  'prefix=$(cygpath -u "$1")',
  'shift',
  'export PATH="$prefix/bin:/ucrt64/bin:/usr/bin"',
  'export PKG_CONFIG_LIBDIR="$prefix/lib/pkgconfig:/ucrt64/lib/pkgconfig:/ucrt64/share/pkgconfig"',
  'unset PKG_CONFIG_PATH',
  'meson setup obj source "$@"',
  'meson compile -C obj',
].join('\n')
execFileSync(bash, ['--login', '-c', script, 'build-engine', prefix, ...settings.mpvOptions], {
  cwd: destination,
  env: { ...process.env, MSYSTEM: 'UCRT64', CHERE_INVOKING: '1' },
  stdio: 'inherit',
})
