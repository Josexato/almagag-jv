/** El juez también se testea: una guarda que no detecta nada es inválida. */
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '../src/core/index.ts';
import { type Gates, loadJson, type Reference, runCorpus, sha256 } from '../tools/golden-lib.ts';

const pinned = loadJson<{ version: string; commit: string }>('golden/PROVENANCE.json');
const gates = loadJson<Gates>('golden/gates.json');
const ref = loadJson<Reference>('golden/reference-v3.20.0.json');

describe('harness golden', () => {
  it('la referencia declara procedencia v3.20.0 fijada y 40/40 medidos', () => {
    expect(ref.provenance.version).toBe('3.20.0');
    expect(ref.provenance.commit).toBe(pinned.commit);
    expect(ref.fixtures_measured).toBe(40);
  });
  it('el corpus del repo pasa las compuertas de la fase', () => {
    const res = runCorpus('.', 'py', ref, pinned, gates, (i, o) => render(i, o));
    expect(res.filter((r) => r.failures.length)).toEqual([]);
  });
  it('detecta un fixture modificado (sha256) y un motor distinto', () => {
    const root = mkdtempSync(join(tmpdir(), 'golden-'));
    mkdirSync(join(root, 'fx'));
    const row = ref.rows[0];
    if (!row) throw new Error('referencia vacía');
    copyFileSync(join(ref.fixtures_dir, row.fixture), join(root, 'fx', row.fixture));
    writeFileSync(join(root, 'fx', row.fixture), '{"elements":[{"id":"a"}]}');
    const fake: Reference = { ...ref, fixtures_dir: 'fx', rows: [{ ...row, motor: 'hier' }] };
    const [r] = runCorpus(root, 'x', fake, pinned, gates, (i, o) => render(i, o));
    expect(r?.failures.some((f) => f.startsWith('sha256_fixture'))).toBe(true);
    expect(r?.failures.some((f) => f.startsWith('motor'))).toBe(true);
    expect(sha256('a')).toHaveLength(64);
  });
  it('detecta procedencia distinta', () => {
    const fake: Reference = {
      ...ref,
      provenance: { ...ref.provenance, commit: 'f'.repeat(40) },
      rows: ref.rows.slice(0, 1),
    };
    const [r] = runCorpus('.', 'x', fake, pinned, gates, (i, o) => render(i, o));
    expect(r?.failures.some((f) => f.startsWith('procedencia'))).toBe(true);
  });
});

describe('corpus de constructos', () => {
  const man = loadJson<{ fixtures: Record<string, { vista: string; evidencia: string }> }>(
    'fixtures/constructos/MANIFEST.json',
  ).fixtures;
  const cref = loadJson<Reference>('golden/constructos-v3.20.0.json');
  it('todo fixture medido tiene ficha en el MANIFEST y viceversa (sin huecos silenciosos)', () => {
    expect(Object.keys(man).sort()).toEqual(cref.rows.map((r) => r.fixture).sort());
  });
  it('la vista del MANIFEST es la que usó el oráculo', () => {
    for (const r of cref.rows) expect(man[r.fixture]?.vista).toBe(r.view);
  });
  it('≥25 constructos, cada uno con evidencia declarada', () => {
    expect(cref.rows.length).toBeGreaterThanOrEqual(25);
    for (const v of Object.values(man))
      expect(v.evidencia).toMatch(/^(log|motor|error):.+|^visual$/);
  });
});
