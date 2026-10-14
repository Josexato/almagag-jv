/**
 * §O55 (type sin icono → BWT + WARNING) idéntico al de la corrida COMPLETA del
 * oráculo (warning_msgs de golden/reference y golden/constructos): mismo
 * conjunto de avisos por fixture. Atrapó un §O55 falso sobre contenedores (c18).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from '../src/core/index.ts';

for (const path of ['golden/reference-v3.20.0.json', 'golden/constructos-v3.20.0.json']) {
  const ref = JSON.parse(readFileSync(path, 'utf8')) as {
    fixtures_dir: string;
    rows: Array<{ fixture: string; view: 'auto'; warning_msgs?: string[]; error?: string }>;
  };
  describe(`§O55 ≡ oráculo · ${path}`, () => {
    for (const r of ref.rows.filter((x) => !x.error)) {
      it(r.fixture, () => {
        const py = (r.warning_msgs ?? []).filter((m) => m.startsWith('§O55:')).sort();
        const out = render(readFileSync(`${ref.fixtures_dir}/${r.fixture}`, 'utf8'), {
          view: r.view,
        });
        expect(
          out.log
            .filter((l) => l.msg.startsWith('§O55:'))
            .map((l) => l.msg)
            .sort(),
        ).toEqual(py);
      });
    }
  });
}
