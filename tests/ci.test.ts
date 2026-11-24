import { expect, test } from 'vite-plus/test'
import { selectChecks } from '../tools/ci/plan.ts'

test('routes Markdown changes to the artifact that ships them', () => {
  expect(selectChecks(['AGENTS.md'])).toBe('docs')
  expect(selectChecks(['docs/control.md'])).toBe('code')
  expect(selectChecks(['docs/control.md', 'engine/RELINK.md'])).toBe('sources')
})
