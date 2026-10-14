/**
 * Prueba de humo del build browser: carga dist/index.js como módulo ES en
 * Chromium (Playwright), renderiza un fixture y mide el tiempo DENTRO del
 * browser. Es el embrión de la medición del presupuesto de la fase 2.
 *
 * npm run build && npm run smoke:browser [-- fixture.sdjf]
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const fixture = process.argv[2] ?? 'fixtures/constructos/c26-perf-60-nodos.sdjf';
const bundle = readFileSync('dist/index.js', 'utf8');
const input = readFileSync(fixture, 'utf8');
const server = createServer((req, res) => {
  if (req.url === '/index.js') {
    res.writeHead(200, { 'content-type': 'text/javascript' });
    res.end(bundle);
  } else {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><body></body></html>');
  }
});
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const addr = server.address();
const port = typeof addr === 'object' && addr ? addr.port : 0;

const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { chromium } = createRequire(join(root, 'noop.js'))('playwright') as {
  chromium: { launch(): Promise<{ newPage(): Promise<PwPage>; close(): Promise<void> }> };
};
interface PwPage {
  goto(u: string): Promise<unknown>;
  evaluate<T, A>(fn: (a: A) => Promise<T>, arg: A): Promise<T>;
}
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${port}/`);
const r = await page.evaluate(
  async ({ src, url }) => {
    const m = await import(url);
    m.render(src); // calentamiento
    const t0 = performance.now();
    const out = m.render(src);
    const ms = performance.now() - t0;
    return {
      ms,
      len: out.svg.length,
      profile: out.profile,
      nodes: (out.svg.match(/<g id="/g) ?? []).length,
    };
  },
  { src: input, url: `http://127.0.0.1:${port}/index.js` },
);
await browser.close();
server.close();
console.log(
  `browser (Chromium): ${fixture} → perfil ${r.profile}, ${r.nodes} nodos, SVG ${r.len} B, ` +
    `render ${r.ms.toFixed(2)} ms (presupuesto fase 2: < 1000 ms)`,
);
