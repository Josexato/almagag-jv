/**
 * npm run golden [-- --report out/golden-report.md]
 * Corre el motor TS sobre ambos corpus contra la referencia del oráculo y
 * aplica las compuertas de la fase. Sale ≠0 si alguna compuerta activa falla.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { render } from '../src/core/index.ts';
import { type Gates, loadJson, type Reference, reportMarkdown, runCorpus } from './golden-lib.ts';

const CORPUS: ReadonlyArray<[string, string]> = [
  ['py-v3.20.0', 'golden/reference-v3.20.0.json'],
  ['constructos', 'golden/constructos-v3.20.0.json'],
];

const pinned = loadJson<{ version: string; commit: string }>('golden/PROVENANCE.json');
const gates = loadJson<Gates>('golden/gates.json');
const results = CORPUS.flatMap(([name, path]) =>
  runCorpus('.', name, loadJson<Reference>(path), pinned, gates, (input, opts) =>
    render(input, opts),
  ),
);
const md = reportMarkdown(results, gates);
const ri = process.argv.indexOf('--report');
const reportPath = ri >= 0 ? (process.argv[ri + 1] as string) : 'out/golden-report.md';
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, md);
const fails = results.filter((r) => r.failures.length);
const motorOk = results.filter(
  (r) => r.ref.motor && !('error' in r.ts) && r.ts.profile === r.ref.motor,
).length;
const withMotor = results.filter((r) => r.ref.motor).length;
console.log(
  `golden fase ${gates.phase} (referencia AlmaGag Python v${pinned.version}@${pinned.commit.slice(0, 7)}): ` +
    `${results.length} fixtures, motor ${motorOk}/${withMotor} igual a la referencia, ` +
    `${fails.length} con fallas → ${reportPath}`,
);
for (const f of fails) console.error(`FALLA ${f.corpus}/${f.fixture}: ${f.failures.join('; ')}`);
process.exitCode = fails.length ? 1 : 0;
