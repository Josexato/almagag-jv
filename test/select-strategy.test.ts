/**
 * Contrato observable: el motor elegido coincide con el oráculo Python
 * v3.20.0 en los dos corpus, y los mensajes §O53 son los mismos.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Log } from '../src/core/log.ts';
import { normalize } from '../src/core/normalize/index.ts';
import { selectStrategy, type View } from '../src/core/strategy/select.ts';

const docOf = (text: string) => normalize(text, 'auto', new Log()).doc;

interface Ref {
  fixtures_dir: string;
  rows: Array<{ fixture: string; view: View; motor?: 'auto' | 'hier'; warning_msgs?: string[] }>;
}

for (const path of ['golden/reference-v3.20.0.json', 'golden/constructos-v3.20.0.json']) {
  const ref = JSON.parse(readFileSync(path, 'utf8')) as Ref;
  describe(`select_strategy vs oráculo · ${path}`, () => {
    for (const row of ref.rows.filter((r) => r.motor)) {
      it(`${row.fixture} → ${row.motor}`, () => {
        const text = readFileSync(join(ref.fixtures_dir, row.fixture), 'utf8');
        expect(normalize(text, row.view, new Log()).profile).toBe(row.motor);
      });
    }
  });
}

describe('§O53 — la señal anulada se NOMBRA', () => {
  const d = (o: object) => docOf(JSON.stringify({ elements: [{ id: 'a' }], ...o }));
  it('--view con considerations → WARNING textual del Python', () => {
    const log = new Log();
    expect(selectStrategy(d({ considerations: [{ align: ['a', 'a'] }] }), 'lanes', log)).toBe(
      'hier',
    );
    expect(log.entries).toEqual([
      {
        level: 'WARNING',
        msg: "§O53: la vista '--view lanes' fuerza hier — señal anulada: 'considerations' (align/near/avoid, §④) sólo la aplica AUTO",
      },
    ]);
  });
  it('considerations + areas → AUTO con INFO', () => {
    const log = new Log();
    expect(selectStrategy(d({ considerations: [1], areas: [1] }), 'auto', log)).toBe('auto');
    expect(log.entries[0]?.msg).toMatch(/^§O53: 'considerations' fuerza AUTO/);
  });
  it('constraints es alias de considerations', () => {
    expect(selectStrategy(d({ constraints: [1], areas: [1] }), 'auto', new Log())).toBe('auto');
  });
  it('listas vacías no cuentan como señal (truthiness de Python)', () => {
    expect(selectStrategy(d({ considerations: [], areas: [] }), 'auto', new Log())).toBe('auto');
  });
  it('self-loop sin coordenadas → hier; con x/y → auto', () => {
    const loop = { connections: [{ from: 'a', to: 'a' }] };
    expect(selectStrategy(d(loop), 'auto', new Log())).toBe('hier');
    const pinned = docOf(JSON.stringify({ elements: [{ id: 'a', x: 1, y: 1 }], ...loop }));
    expect(selectStrategy(pinned, 'auto', new Log())).toBe('auto');
  });
});
