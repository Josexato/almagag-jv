/**
 * Paridad de iconos con el draw_icon_shape REAL del oráculo (golden/
 * icons-v3.20.0.json: 230 casos = 20 types × 10 colores + embebidos ×
 * 3 colores). Se comparan árboles XML normalizados: mismo orden de
 * elementos, mismos atributos, números con tolerancia 0.006 (el emisor TS
 * redondea coordenadas a 2 decimales), prefijos de namespace ignorados.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { drawIconShape } from '../src/core/icons/index.ts';
import { Log } from '../src/core/log.ts';
import { parseXml, type XmlNode } from '../src/core/xml/xml.ts';

interface Row {
  type: string;
  color: string | null;
  embedded: boolean;
  svg?: string;
  exception?: string;
  log: string[];
}
const golden = JSON.parse(readFileSync('golden/icons-v3.20.0.json', 'utf8')) as {
  embedded: Record<string, string>;
  rows: Row[];
};
const EMB = new Map(Object.entries(golden.embedded));
const NUM = /-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?/g;

interface Norm {
  tag: string;
  attrs: Array<[string, string, number[]]>;
  kids: Norm[];
  text: string;
}
function norm(n: XmlNode): Norm | null {
  if (typeof n === 'string') return null;
  const tag = n.tag.replace(/^.*:/, '');
  if (tag === 'defs' && n.children.length === 0) return null;
  const attrs = n.attrs
    .filter(([k]) => !k.startsWith('xmlns'))
    .map(
      ([k, v]) =>
        [k, v.replace(NUM, '#'), (v.match(NUM) ?? []).map(Number)] as [string, string, number[]],
    )
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const kids = n.children.map(norm).filter((x): x is Norm => x !== null);
  const text = n.children
    .filter((c) => typeof c === 'string')
    .join('')
    .trim();
  return { tag, attrs, kids, text };
}
function diff(a: Norm, b: Norm, path: string): string | null {
  if (a.tag !== b.tag) return `${path}: <${a.tag}> vs <${b.tag}>`;
  if (a.text !== b.text) return `${path}: texto '${a.text}' vs '${b.text}'`;
  const ka = a.attrs.map((x) => x[0]).join(',');
  const kb = b.attrs.map((x) => x[0]).join(',');
  if (ka !== kb) return `${path}: atributos [${ka}] vs [${kb}]`;
  for (let i = 0; i < a.attrs.length; i++) {
    const [k, sa, na] = a.attrs[i] as [string, string, number[]];
    const [, sb, nb] = b.attrs[i] as [string, string, number[]];
    if (sa !== sb) return `${path}@${k}: '${sa}' vs '${sb}'`;
    for (let j = 0; j < na.length; j++) {
      if (Math.abs((na[j] as number) - (nb[j] as number)) > 0.006)
        return `${path}@${k}: ${na[j]} vs ${nb[j]}`;
    }
  }
  if (a.kids.length !== b.kids.length) return `${path}: ${a.kids.length} hijos vs ${b.kids.length}`;
  for (let i = 0; i < a.kids.length; i++) {
    const d = diff(a.kids[i] as Norm, b.kids[i] as Norm, `${path}/${a.kids[i]?.tag}[${i}]`);
    if (d) return d;
  }
  return null;
}

describe(`iconos ≡ draw_icon_shape del oráculo (${golden.rows.length} casos)`, () => {
  for (const r of golden.rows) {
    it(`${r.type} · ${r.color ?? '(sin color)'}${r.embedded ? ' · embebidos' : ''}`, () => {
      const log = new Log();
      const out = drawIconShape(
        { id: 'el-1', x: 123.5, y: 67.25, type: r.type, color: r.color ?? 'gray' },
        r.embedded ? EMB : null,
        log,
      );
      const msgs = log.entries.map((e) => `${e.level}|${e.msg}`);
      if (r.exception) {
        // El oráculo revienta (PY-011): el TS dibuja y lo NOMBRA.
        expect(msgs.some((m) => m.includes('[jv]'))).toBe(true);
        return;
      }
      expect(msgs.filter((m) => !m.includes('[jv]'))).toEqual(r.log);
      const ts = norm(parseXml(`<svg><defs>${out.defs.join('')}</defs>${out.body}</svg>`)) as Norm;
      const py = norm(parseXml(r.svg as string)) as Norm;
      ts.attrs = [];
      py.attrs = [];
      expect(diff(py, ts, 'svg')).toBeNull();
    });
  }
});
