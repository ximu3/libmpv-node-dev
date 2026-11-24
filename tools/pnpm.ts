import { execFileSync } from 'node:child_process'

export function runPnpm(args: string[], cwd: string) {
  const command = process.env.npm_execpath
  if (!command) {
    throw new Error('Run this task with pnpm exec vp run')
  }
  if (/\.[cm]?js$/i.test(command)) {
    execFileSync(process.execPath, [command, ...args], { cwd, stdio: 'inherit' })
  } else {
    execFileSync(command, args, { cwd, stdio: 'inherit' })
  }
}
