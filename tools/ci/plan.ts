import { execFileSync } from 'node:child_process'
import { appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import metadata from '../../package.json' with { type: 'json' }

const runners = {
  'linux-x64': 'ubuntu-22.04',
  'linux-arm64': 'ubuntu-22.04-arm',
  'windows-x64': 'windows-2025',
  'windows-arm64': 'windows-11-arm',
  'macos-x64': 'macos-15-intel',
  'macos-arm64': 'macos-15',
}

export function selectChecks(files: readonly string[] | undefined) {
  if (
    !files ||
    files.some(
      (file) =>
        file.startsWith('engine/') ||
        file.startsWith('tools/engine/') ||
        file.startsWith('tools/package/') ||
        [
          'tools/files.ts',
          'tools/pnpm.ts',
          '.github/workflows/ci.yml',
          '.node-version',
          'rust-toolchain.toml',
          'LICENSE',
          'package.json',
          'pnpm-lock.yaml',
        ].includes(file),
    )
  ) {
    return 'sources'
  }
  if (
    files.some(
      (file) =>
        !file.endsWith('.md') || file.startsWith('release-notes/') || file.startsWith('docs/'),
    )
  ) {
    return 'code'
  }
  return 'docs'
}

function gh(path: string, filter: string) {
  return execFileSync(
    'gh',
    ['api', `repos/${process.env.GITHUB_REPOSITORY}/${path}`, '--jq', filter],
    { encoding: 'utf8' },
  ).trim()
}

async function plan() {
  const event = process.env.GITHUB_EVENT_NAME
  const base = process.env.BASE_SHA
  const head = process.env.GITHUB_SHA!
  const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim()
  let number = process.env.PR_NUMBER
  let prHead = process.env.PR_HEAD
  if (event === 'push') {
    const merged = gh(
      `commits/${head}/pulls`,
      '.[] | select(.merged_at and .base.ref == "main" and .merge_commit_sha == "' +
        head +
        '") | [.number,.head.sha] | @tsv',
    )
    const fields = merged.split('\t')
    number = fields[0]
    prHead = fields[1]
  }

  const receipt = `pr-${number}-${base}-${tree}`
  const outputs: Record<string, string> = { receipt, reused: 'false' }
  if (event === 'pull_request') {
    await writeFile(
      join(process.env.RUNNER_TEMP!, 'candidate.txt'),
      `${base}\n${tree}\n${prHead}\n`,
    )
  }

  if (prHead && number && (event === 'push' || process.env.REUSE_EDIT === 'true')) {
    const earlier = gh(
      `actions/workflows/ci.yml/runs?event=pull_request&head_sha=${prHead}&per_page=100`,
      `[.workflow_runs[] | select(.id < ${process.env.GITHUB_RUN_ID} and .head_sha == "${prHead}")] | max_by(.id).id // empty`,
    )
    if (earlier) {
      let status = gh(`actions/runs/${earlier}`, '.status')
      while (event === 'pull_request' && status !== 'completed') {
        await setTimeout(8000)
        status = gh(`actions/runs/${earlier}`, '.status')
      }
      const matches = gh(
        `actions/runs/${earlier}/artifacts?name=${receipt}`,
        `.artifacts | any(.name == "${receipt}" and (.expired | not))`,
      )
      if (status === 'completed' && matches === 'true') {
        const result = gh(`actions/runs/${earlier}`, '.conclusion')
        if (result === 'success') {
          outputs.reused = 'true'
        } else if (event === 'pull_request') {
          throw new Error(`Previous candidate run ${earlier} ended with ${result}`)
        }
      }
    }
  }

  let files: string[] | undefined
  if (base && !/^0+$/.test(base)) {
    files = execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', base, head], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean)
  }
  const target = process.env.REQUEST_TARGET
  let scope = selectChecks(files)
  if (target) {
    scope = target === 'all' ? 'sources' : 'code'
  }
  const selected = Object.entries(runners).filter(
    ([name]) => !target || target === 'all' || name === target,
  )
  if (!selected.length) {
    throw new Error('Unknown verification target')
  }
  outputs.code = String(scope !== 'docs')
  outputs.sources = String(scope === 'sources')
  outputs.matrix = JSON.stringify({
    include: selected.map(([target, runner]) => ({
      target,
      runner,
      macosDeploymentTarget: target.startsWith('macos-')
        ? metadata.config.macosDeploymentTarget
        : undefined,
    })),
  })
  await appendFile(
    process.env.GITHUB_OUTPUT!,
    Object.entries(outputs)
      .map(([name, value]) => `${name}=${value}\n`)
      .join(''),
  )
}

if (import.meta.main) {
  await plan()
}
