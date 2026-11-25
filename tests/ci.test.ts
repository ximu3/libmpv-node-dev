import { expect, test } from 'vite-plus/test'
import { planChecks } from '../tools/ci/plan.ts'

test('routes Markdown changes to the artifact that ships them', () => {
  expect(planChecks(['AGENTS.md'])).toMatchObject({ code: false, sources: false, packages: false })
  expect(planChecks(['docs/control.md'])).toMatchObject({
    code: true,
    sources: false,
    packages: true,
  })
  expect(planChecks(['docs/control.md', 'engine/RELINK.md'])).toMatchObject({
    code: true,
    sources: true,
    packages: true,
  })
})

test('requires final pairs on automatic package changes and full requests', () => {
  const automatic = planChecks(['src/index.ts'])
  expect(automatic.packages).toBe(true)
  expect(automatic.matrix.target).toHaveLength(6)
  expect(planChecks([], 'all')).toMatchObject({
    packages: true,
    sources: true,
    matrix: automatic.matrix,
  })
  expect(planChecks([], 'macos-arm64')).toMatchObject({
    code: true,
    sources: false,
    packages: false,
    matrix: { target: ['macos-arm64'] },
  })
})
