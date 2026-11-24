import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      build: { command: "tsc && node tools/build.ts", cache: false },
      check: { command: "tsc --noEmit && node tools/check.ts", cache: false },
    },
  },
});
