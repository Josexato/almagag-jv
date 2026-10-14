/**
 * Harness del golden: lee la referencia del oráculo Python (golden/*.json),
 * verifica la procedencia y el sha256 de cada fixture, corre el motor TS y
 * aplica las compuertas de golden/gates.json. Puro respecto del motor: recibe
 * la función `render` para poder testearse.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { svgIsValid } from './svg-check.ts';

export { svgIsValid };

export interface RefRow {
  fixture: string;
  fixture_sha256: string;
  view: 'auto' | 'columns' | 'areas' | 'lanes' | 'matrix';
  motor?: 'auto' | 'hier';
  cruces?: number;
  arista_nodo?: number;
  labels?: number;
  own_line?: number;
  tinta?: number;
  aspecto?: number;
  warnings?: number;
  deterministic?: boolean;
  render_ms?: number;
  error?: string;
}

export interface Reference {
  provenance: { version: string; commit: string; repository: string };
  fixtures_dir: string;
  fixtures_measured: number;
  fixtures_total: number;
  rows: RefRow[];
}

export interface Gates {
  phase: number;
  gates: Record<string, boolean>;
  tolerancia_tinta_aspecto: number;
}

export interface TsRun {
  profile: 'auto' | 'hier';
  svg: string;
  ms: number;
  deterministic: boolean;
}

export interface RowResult {
  corpus: string;
  fixture: string;
  ref: RefRow;
  ts: TsRun | { error: string };
  failures: string[];
}

export type RenderFn = (
  input: string,
  opts: { view: RefRow['view'] },
) => { svg: string; profile: 'auto' | 'hier' };

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function runCorpus(
  root: string,
  corpus: string,
  ref: Reference,
  pinned: { version: string; commit: string },
  gates: Gates,
  render: RenderFn,
): RowResult[] {
  const g = gates.gates;
  const out: RowResult[] = [];
  const provOk =
    ref.provenance.version === pinned.version && ref.provenance.commit === pinned.commit;
  for (const row of ref.rows) {
    const failures: string[] = [];
    if (g['procedencia'] && !provOk) {
      failures.push(
        `procedencia: la referencia es v${ref.provenance.version}@${ref.provenance.commit.slice(0, 7)}, ` +
          `PROVENANCE fija v${pinned.version}@${pinned.commit.slice(0, 7)}`,
      );
    }
    const input = readFileSync(join(root, ref.fixtures_dir, row.fixture));
    if (g['sha256_fixture'] && sha256(input) !== row.fixture_sha256) {
      failures.push('sha256_fixture: el archivo cambió desde que se midió la referencia');
    }
    let ts: RowResult['ts'];
    try {
      const text = input.toString('utf8');
      const t0 = performance.now();
      const a = render(text, { view: row.view });
      const ms = performance.now() - t0;
      const b = render(text, { view: row.view });
      ts = { profile: a.profile, svg: a.svg, ms, deterministic: a.svg === b.svg };
      if (g['svg_valido'] && !svgIsValid(a.svg))
        failures.push('svg_valido: SVG sin raíz/viewBox válido');
      if (g['determinismo'] && !ts.deterministic)
        failures.push('determinismo: dos corridas, SVG distinto');
      // Si el oráculo revienta (row.error) no hay motor de referencia: el
      // motor TS sólo debe no reventar (igual o MEJOR).
      if (g['motor'] && row.motor && a.profile !== row.motor) {
        failures.push(`motor: referencia [${row.motor}], TS [${a.profile}]`);
      }
    } catch (e) {
      ts = { error: `${(e as Error).name}: ${(e as Error).message}` };
      if (g['sin_excepcion']) failures.push(`sin_excepcion: ${ts.error}`);
    }
    out.push({ corpus, fixture: row.fixture, ref: row, ts, failures });
  }
  return out;
}

const fmt = (v: number | undefined): string => (v === undefined ? '—' : String(v));

export function reportMarkdown(results: RowResult[], gates: Gates): string {
  const active = Object.entries(gates.gates)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const lines = [
    `# Reporte golden — fase ${gates.phase}`,
    '',
    `Compuertas activas: ${active.join(', ')}.`,
    '',
    '| corpus | fixture | vista | motor ref | motor TS | cruces ref | a×n ref | labels ref | ms py | ms TS | resultado |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---|',
  ];
  for (const r of results) {
    const ts = 'error' in r.ts ? null : r.ts;
    lines.push(
      `| ${r.corpus} | ${r.fixture} | ${r.ref.view} | ${r.ref.motor ?? `ERROR (${(r.ref.error ?? '').split(':')[0]})`} | ` +
        `${ts?.profile ?? 'ERROR'} | ${fmt(r.ref.cruces)} | ${fmt(r.ref.arista_nodo)} | ${fmt(r.ref.labels)} | ` +
        `${fmt(r.ref.render_ms)} | ${ts ? ts.ms.toFixed(1) : '—'} | ${r.failures.length ? `FALLA: ${r.failures.join('; ')}` : 'ok'} |`,
    );
  }
  const fails = results.filter((r) => r.failures.length).length;
  lines.push('', `**${results.length - fails}/${results.length} ok, ${fails} con fallas.**`, '');
  return lines.join('\n');
}
