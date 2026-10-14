/**
 * Presupuesto de performance (fijado por el autor desde la fase 2):
 * c26-perf-60-nodos (60 nodos, 5 áreas, 10 contenedores) → render completo
 * < 1000 ms en browser. Aquí se mide en Node (mediana de N corridas); la
 * medición en browser (Playwright) se agrega en la fase 2.
 *
 * npm run bench [-- --runs 20]
 */
import { readFileSync } from 'node:fs';
import { render } from '../src/core/index.ts';

const BUDGET_MS = 1000;
const FIXTURE = 'fixtures/constructos/c26-perf-60-nodos.sdjf';
const ri = process.argv.indexOf('--runs');
const runs = ri >= 0 ? Number(process.argv[ri + 1]) : 20;
const input = readFileSync(FIXTURE, 'utf8');
render(input); // calentamiento del JIT
const ms: number[] = [];
for (let i = 0; i < runs; i++) {
  const t0 = performance.now();
  render(input);
  ms.push(performance.now() - t0);
}
ms.sort((a, b) => a - b);
const med = ms[Math.floor(ms.length / 2)] as number;
const p95 = ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.95))] as number;
console.log(
  `bench ${FIXTURE}: mediana ${med.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms (${runs} corridas, Node) — ` +
    `presupuesto ${BUDGET_MS} ms: ${p95 < BUDGET_MS ? 'cumple' : 'EXCEDE'}`,
);
process.exitCode = p95 < BUDGET_MS ? 0 : 1;
