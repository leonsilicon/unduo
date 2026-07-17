import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: ["src/cli.ts"],
    format: ["esm"],
    // Bundle every dependency into a single self-contained dist/cli.mjs.
    deps: {
      alwaysBundle: [/.*/],
    },
    // Inline dynamic imports so everything lands in one file (no chunks).
    outputOptions: {
      inlineDynamicImports: true,
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
