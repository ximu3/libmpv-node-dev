import { execFileSync } from 'node:child_process'

const paths = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
).split('\0')
const forbidden = paths.filter((path) => /\.(?:[cm]?jsx?|py)$/i.test(path))
if (forbidden.length) {
  throw new Error(`Self-maintained scripts must use TypeScript:\n${forbidden.join('\n')}`)
}
