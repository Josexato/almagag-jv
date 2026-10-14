/**
 * Paridad del post-proceso de emisión (§O51 recorte + §O50 halo) con el
 * finalize_svg REAL del oráculo: 400 SVG sintéticos (golden/finalize-v3.20.0.json).
 * Igualdad EXACTA de viewBox/width/height (strings) y del árbol resultante.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { finalizeSvg, pyFixed1 } from '../src/core/emit/finalize.ts';
import { parseXml, type XmlNode } from '../src/core/xml/xml.ts';

const golden = JSON.parse(readFileSync('golden/finalize-v3.20.0.json', 'utf8')) as {
  cases: Array<{ in: string; out?: string; exception?: string }>;
};

/** Árbol comparable: sin prefijos de namespace ni declaraciones xmlns, atributos ordenados. */
function canon(n: XmlNode): unknown {
  if (typeof n === 'string') return n;
  return {
    t: n.tag.replace(/^.*:/, ''),
    a: n.attrs
      .filter(([k]) => !k.startsWith('xmlns'))
      .map(([k, v]) => `${k}=${v}`)
      .sort(),
    c: n.children.map(canon),
  };
}

describe(`finalize_svg ≡ oráculo (${golden.cases.length} SVG)`, () => {
  golden.cases.forEach((c, i) => {
    it(`caso ${i}`, () => {
      if (c.exception) {
        expect(() => finalizeSvg(c.in)).toThrow();
        return;
      }
      const ts = parseXml(finalizeSvg(c.in));
      const py = parseXml(c.out as string);
      for (const k of ['viewBox', 'width', 'height']) {
        expect(ts.attrs.find(([n]) => n === k)?.[1], k).toBe(py.attrs.find(([n]) => n === k)?.[1]);
      }
      expect(canon(ts)).toEqual(canon(py));
    });
  });
  it("'%.1f' de Python: empates exactos al par", () => {
    expect([0.25, 0.75, 1.25, -0.25, 2.5e-1, 12.35].map(pyFixed1)).toEqual([
      '0.2',
      '0.8',
      '1.2',
      '-0.2',
      '0.2',
      '12.3',
    ]);
  });
});

describe('path truncado (el oráculo revienta con IndexError)', () => {
  it('se mide lo leído y la emisión sigue', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800" viewBox="0,0,1000,800"><path d="M 10 10 L 100 100 C 5"/></svg>';
    expect(finalizeSvg(svg)).toContain('viewBox="0,0,140,140"');
  });
});
