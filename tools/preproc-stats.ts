/** Estadística del juez de preprocesado: cuánto compara de verdad (anti-vacuidad). */
import { readFileSync } from 'node:fs';
import { FormatError, Log } from '../src/core/log.ts';
import { normalize } from '../src/core/normalize/index.ts';
import { isGated, type PreprocRow } from './preproc-lib.ts';

const rows = (
  JSON.parse(readFileSync('golden/preproc-v3.20.0.json', 'utf8')) as { rows: PreprocRow[] }
).rows;
let gatedPy = 0;
let jv = 0;
let jvDocs = 0;
let normalized = 0;
let fmtErr = 0;
let recovered = 0;
const byTag = new Map<string, number>();
for (const r of rows) {
  const log = new Log();
  try {
    normalize(r.input ?? readFileSync(`${r.origin}/${r.name}`, 'utf8'), 'auto', log);
    if (r.full_outcome === 'excepcion') recovered++;
  } catch (e) {
    if (!(e instanceof FormatError)) throw e;
    fmtErr++;
  }
  const g = r.log.filter(isGated);
  gatedPy += g.length;
  for (const l of g) {
    const tag = (l.split('|')[1] ?? '').split(' ')[0] as string;
    byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
  }
  const j = log.entries.filter((e) => e.msg.startsWith('[jv]')).length;
  jv += j;
  if (j) jvDocs++;
  if (r.normalized !== undefined) normalized++;
}
console.log(
  `${rows.length} documentos · ${gatedPy} mensajes con compuerta comparados · ${normalized} repr normalizados · ` +
    `oráculo revienta en ${rows.filter((r) => r.full_outcome === 'excepcion').length}: TS FormatError ${fmtErr}, TS completa ${recovered} · ` +
    `[jv] ${jv} en ${jvDocs} documentos`,
);
console.log(
  [...byTag]
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${t} ${n}`)
    .join(' · '),
);
