import { defineConfig } from 'tsup';

// Build dual: el núcleo es ESM neutro (browser + Node, sin `node:*`);
// el CLI es ESM para Node con shebang.
export default defineConfig([
  {
    entry: { index: 'src/core/index.ts' },
    format: ['esm'],
    platform: 'neutral',
    target: 'es2022',
    dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
    sourcemap: true,
    clean: true,
  },
  {
    entry: { cli: 'src/cli/main.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    banner: { js: '#!/usr/bin/env node' },
    sourcemap: true,
  },
]);
