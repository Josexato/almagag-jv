/**
 * Contratos de emisión (grupo O) verificados sobre el SVG EMITIDO de los 67
 * fixtures de ambos corpus. Son propiedades, no píxeles: valen para cualquier
 * layout, así que siguen vigentes cuando llegue el layout real (fase 2).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { finalizeSvg } from '../src/core/emit/finalize.ts';
import { render } from '../src/core/index.ts';
import { parseXml, type XmlElement, type XmlNode } from '../src/core/xml/xml.ts';

const views = JSON.parse(readFileSync('fixtures/constructos/views.json', 'utf8')) as Record<
  string,
  string
>;
const files = ['fixtures/py-v3.20.0', 'fixtures/constructos'].flatMap((d) =>
  readdirSync(d)
    .filter((f) => /\.(sdjf|gag)$/.test(f))
    .sort()
    .map((f) => join(d, f)),
);
const attr = (e: XmlElement, k: string) => e.attrs.find(([n]) => n === k)?.[1];
const els = (n: XmlNode, out: XmlElement[] = []): XmlElement[] => {
  if (typeof n !== 'string') {
    out.push(n);
    for (const c of n.children) els(c, out);
  }
  return out;
};
const HALO = [
  ['class', 'ag-text-halo'],
  ['stroke', '#ffffff'],
  ['stroke-width', '3'],
  ['stroke-linejoin', 'round'],
  ['stroke-linecap', 'round'],
  ['fill', '#ffffff'],
];

describe(`contratos O sobre el SVG emitido (${files.length} fixtures)`, () => {
  for (const f of files) {
    const name = f.split('/').pop() as string;
    const view = (views[name] ?? 'auto') as 'auto';
    it(name, () => {
      const r = render(readFileSync(f, 'utf8'), { view });
      const body = r.svg.slice(r.svg.indexOf('<svg'));
      const root = parseXml(body);
      const all = els(root);

      // Determinismo: dos corridas, mismo SVG byte a byte.
      expect(render(readFileSync(f, 'utf8'), { view }).svg).toBe(r.svg);

      // O50: cada <text> fuera de defs va precedido por su halo con los atributos exactos.
      for (const p of all) {
        if (p.tag === 'defs' || p.tag === 'text') continue;
        p.children.forEach((c, i) => {
          if (typeof c === 'string' || c.tag !== 'text' || attr(c, 'class') === 'ag-text-halo')
            return;
          const prev = p.children[i - 1];
          expect(
            typeof prev !== 'string' && prev?.tag === 'text',
            `halo antes de «${c.children.join('')}»`,
          ).toBe(true);
          const h = prev as XmlElement;
          for (const [k, v] of HALO) expect(attr(h, k as string)).toBe(v);
          expect(attr(h, 'id')).toBeUndefined();
        });
      }
      const texts = all.filter((e) => e.tag === 'text');
      const halos = texts.filter((t) => attr(t, 'class') === 'ag-text-halo');
      expect(halos.length * 2).toBe(texts.length);

      // O51: el recorte es punto fijo salvo el redondeo a 1 decimal de _fmt
      // (el oráculo tampoco es idempotente al decimal: re-recortar parte del
      // borde ya redondeado) — tolerancia 0.15 px. width/height = viewBox.
      const vb = attr(root, 'viewBox') as string;
      const again = (attr(parseXml(finalizeSvg(body)), 'viewBox') as string).split(',').map(Number);
      vb.split(',')
        .map(Number)
        .forEach((v, i) => {
          expect(Math.abs(v - (again[i] as number))).toBeLessThanOrEqual(0.15);
        });
      const [, , w, h] = vb.split(',');
      expect(attr(root, 'width')).toBe(w);
      expect(attr(root, 'height')).toBe(h);

      // O56: sólo la escala tipográfica congelada {16, 13, 12} px, sobre el
      // texto DEL MOTOR (el interior de un icono embebido es dato del autor:
      // grupo con id + transform, la firma de draw_embedded_icon).
      const authorText = new Set<XmlElement>();
      for (const g of all) {
        if (g.tag === 'g' && attr(g, 'id') !== undefined && attr(g, 'transform') !== undefined) {
          for (const t of els(g)) if (t.tag === 'text') authorText.add(t);
        }
      }
      for (const t of texts.filter((x) => !authorText.has(x))) {
        const fs = attr(t, 'font-size');
        if (fs !== undefined) expect(['16px', '13px', '12px']).toContain(fs);
      }

      // O55: nada resuelve a forma muda — cada §O55 tiene su rótulo BWT visible.
      const o55 = r.log.filter((l) => l.msg.startsWith('§O55:'));
      const bwtLabels = texts.filter((t) => attr(t, 'fill') === '#8a1c1c');
      expect(bwtLabels.length).toBeGreaterThanOrEqual(o55.length);

      // Ningún número no finito en la salida.
      expect(body).not.toMatch(/NaN|Infinity/);
    });
  }
});
