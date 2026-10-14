/**
 * SVG → PNG con Playwright/Chromium, para la regla de la casa: renderizar y
 * MIRAR. Herramienta de desarrollo: jamás forma parte del núcleo.
 *
 * Uso: npm run png -- <svg|dir> [más…] --out <dir> [--sheet hoja.png]
 * `--sheet` arma además una hoja de contactos (una miniatura por SVG con su
 * nombre) para mirar un corpus entero de un vistazo.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';

// Tipado mínimo propio: playwright no es dependencia del repo (se usa el
// instalado en el entorno o el global), así el núcleo y la CI no lo cargan.
interface PwElement {
  screenshot(o: { path: string }): Promise<unknown>;
}
interface PwPage {
  setContent(html: string): Promise<void>;
  $(sel: string): Promise<PwElement | null>;
  setViewportSize(s: { width: number; height: number }): Promise<void>;
  screenshot(o: { path: string; fullPage: boolean }): Promise<unknown>;
}
interface Playwright {
  chromium: {
    launch(): Promise<{
      newPage(o: { deviceScaleFactor: number }): Promise<PwPage>;
      close(): Promise<void>;
    }>;
  };
}

function loadPlaywright(): Playwright {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return createRequire(join(root, 'noop.js'))('playwright');
  }
}

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const sheetIdx = args.indexOf('--sheet');
const outDir = outIdx >= 0 ? (args[outIdx + 1] as string) : 'out/png';
const sheet = sheetIdx >= 0 ? args[sheetIdx + 1] : undefined;
const inputs = args.filter(
  (a, i) => !a.startsWith('--') && i !== outIdx + 1 && (sheetIdx < 0 || i !== sheetIdx + 1),
);
const files = inputs.flatMap((p) =>
  statSync(p).isDirectory()
    ? readdirSync(p)
        .filter((f) => f.endsWith('.svg'))
        .sort()
        .map((f) => join(p, f))
    : [p],
);
if (files.length === 0) {
  console.error('render-png: no hay SVG para renderizar');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const thumbs: string[] = [];
for (const f of files) {
  const svg = readFileSync(f, 'utf8');
  await page.setContent(
    `<html><body style="margin:0;background:#fff">${svg.replace(/^<\?xml[^>]*>/, '')}</body></html>`,
  );
  const el = await page.$('svg');
  if (!el) throw new Error(`${f}: sin <svg>`);
  const png = join(outDir, basename(f).replace(/\.svg$/, '.png'));
  await el.screenshot({ path: png });
  thumbs.push(`<figure style="margin:6px;display:inline-block;vertical-align:top;border:1px solid #ccc">
    <img src="data:image/png;base64,${readFileSync(png).toString('base64')}" style="max-width:420px;max-height:320px;display:block">
    <figcaption style="font:12px monospace;padding:2px">${basename(f)}</figcaption></figure>`);
  console.log(png);
}
if (sheet) {
  await page.setViewportSize({ width: 1800, height: 800 });
  await page.setContent(
    `<html><body style="margin:0;background:#fff">${thumbs.join('')}</body></html>`,
  );
  await page.screenshot({ path: sheet, fullPage: true });
  console.log(`hoja: ${sheet}`);
}
await browser.close();
