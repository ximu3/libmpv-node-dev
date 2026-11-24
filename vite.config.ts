import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: false,
    sortPackageJson: false,
    ignorePatterns: ['build/**', 'target/**', 'dist/**', 'pnpm-lock.yaml', 'engine/**'],
  },
  run: {
    tasks: {
      build: { command: 'tsc && node tools/build.ts', cache: false },
      check: { command: 'tsc --noEmit && node tools/check.ts', cache: false },
    },
  },
})
