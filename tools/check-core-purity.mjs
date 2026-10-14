// El núcleo (src/core) corre en browser: prohibido importar `node:*`,
// módulos builtin de Node, o tocar DOM/filesystem. Falla ruidosamente.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  /from\s+['"]node:/,
  /from\s+['"](fs|path|os|url|child_process|process)['"]/,
  /\bDOMParser\b/,
  /\bdocument\./,
  /\bwindow\./,
  /\bprocess\./,
  /\bMath\.random\b/,
];
const bad = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts')) {
      readFileSync(p, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const re of BANNED) if (re.test(line)) bad.push(`${p}:${i + 1}: ${line.trim()}`);
        });
    }
  }
}
walk('src/core');
if (bad.length) {
  console.error(`núcleo impuro: ${bad.length} línea(s) prohibida(s)\n${bad.join('\n')}`);
  process.exit(1);
}
console.log('núcleo puro: 0 imports de Node/DOM, 0 Math.random');
