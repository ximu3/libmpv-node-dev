import { defineConfig } from 'vite-plus'

const outputs = ['build/**', 'target/**', 'dist/**', 'out/**', '.cache/**', 'node_modules/**']
export default defineConfig({
  run: {
    tasks: {
      build: {
        command: ['node tools/build.ts'],
        cache: false,
      },
      typecheck: {
        command: [
          'tsc --noEmit -p config/typescript/tsconfig.lib.json',
          'tsc -p config/typescript/tsconfig.tools.json',
        ],
        cache: false,
      },
      lint: {
        command: [
          'vp lint',
          'cargo clippy --workspace --all-targets --locked -- -D warnings',
          'node tools/check-sources.ts',
        ],
        cache: false,
      },
      test: {
        command: ['cargo test --workspace --locked', 'vp test run'],
        dependsOn: ['build'],
        cache: false,
      },
      check: {
        command: [
          'vp run typecheck',
          'vp run lint',
          'vp fmt --check',
          'cargo fmt --all --check',
          'vp run test',
        ],
        cache: false,
      },
      verify: { command: ['vp run test', 'node tools/engine/verify.ts'], cache: false },
      clean: { command: 'node tools/clean.ts', cache: false },
      'check:windows-media': { command: 'node tools/engine/check-windows.ts', cache: false },
      'verify:windows-media': {
        command: 'node tools/engine/verify-windows.ts',
        dependsOn: ['build'],
        cache: false,
      },
      'engine:source': { command: 'node tools/engine/source.ts', cache: false },
      'engine:windows': { command: 'node tools/engine/windows.ts', cache: false },
      'catalog:generate': { command: 'node tools/catalog/generate.ts', cache: false },
      'pack:platform': { command: 'node tools/package/platform.ts', cache: false },
      'pack:all': { command: 'node tools/package/assemble.ts', cache: false },
      'test:consumers': { command: 'node tests/consumers/run.ts', cache: false },
    },
  },
  fmt: {
    singleQuote: true,
    semi: false,
    sortPackageJson: false,
    ignorePatterns: [...outputs, 'pnpm-lock.yaml', 'engine/mpv/patches/**'],
  },
  lint: {
    plugins: ['typescript'],
    options: { typeAware: true },
    ignorePatterns: [...outputs, 'tests/consumers/fixtures/**', 'examples/**'],
    rules: {
      curly: 'error',
      'no-nested-ternary': 'error',
      'typescript/consistent-type-imports': 'error',
      'typescript/no-deprecated': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-floating-promises': 'error',
      'typescript/no-misused-promises': 'error',
      'typescript/no-unsafe-argument': 'error',
      'typescript/no-unsafe-assignment': 'error',
      'typescript/no-unsafe-call': 'error',
      'typescript/no-unsafe-member-access': 'error',
      'typescript/no-unsafe-return': 'error',
      'typescript/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'typescript/switch-exhaustiveness-check': 'error',
    },
  },
  staged: {
    '*.{ts,tsx}': [
      'vp fmt --check --no-error-on-unmatched-pattern',
      'vp lint --no-error-on-unmatched-pattern',
    ],
    '*.{json,yaml,yml,md}': 'vp fmt --check --no-error-on-unmatched-pattern',
  },
  test: { include: ['tests/*.test.ts'], testTimeout: 30000 },
})
