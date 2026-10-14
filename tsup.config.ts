import { defineConfig } from 'tsup';

// Build dual: el núcleo es ESM neutro (browser + Node, sin `node:*`);
// el CLI es ESM para Node con shebang. Más un IIFE para la página de prueba.
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
    // Script clásico (IIFE, global `AlmaGag`): se incrusta en una página HTML
    // que se abre con doble clic (file://), donde `import` de módulos no anda.
    entry: { 'almagag-jv': 'src/core/index.ts' },
    format: ['iife'],
    globalName: 'AlmaGag',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    outExtension: () => ({ js: '.iife.js' }),
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
