/**
 * Prueba diferencial contra CPython 3.13: 2000 documentos aleatorios
 * (golden/pyrepr-cases.json, generado por golden/scripts/gen_pyrepr_cases.py)
 * deben dar el MISMO repr() que json.loads + repr de Python, y los 15
 * rechazos de json.loads deben rechazarse también.
 */
import { readFileSync } from 'node:fs';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type Json, JsonSyntaxError, parseJson } from '../src/core/parse/json.ts';
import { pyFloatRepr, pyReprRoot, pyStrRepr } from '../src/core/parse/pyrepr.ts';

function toPlain(v: Json): unknown {
  if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [k, toPlain(x)]));
  if (Array.isArray(v)) return v.map(toPlain);
  return v;
}

const golden = JSON.parse(readFileSync('golden/pyrepr-cases.json', 'utf8')) as {
  python: string;
  cases: Array<{ json: string; repr?: string; error?: string }>;
};

describe('parser JSON ≡ json.loads de Python', () => {
  const ok = golden.cases.filter((c) => c.repr !== undefined);
  const bad = golden.cases.filter((c) => c.error !== undefined);
  it(`${ok.length} documentos: repr idéntico al de CPython ${golden.python}`, () => {
    const diffs: string[] = [];
    for (const c of ok) {
      const got = pyReprRoot(parseJson(c.json));
      if (got !== c.repr) diffs.push(`${c.json}\n  py: ${c.repr}\n  ts: ${got}`);
    }
    expect(diffs.slice(0, 5)).toEqual([]);
  });
  it(`${bad.length} rechazos de json.loads también se rechazan`, () => {
    for (const c of bad) expect(() => parseJson(c.json), c.json).toThrow(JsonSyntaxError);
  });
  it('equivale a JSON.parse en JSON estándar (propiedad)', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        const text = JSON.stringify(v);
        expect(toPlain(parseJson(text).value)).toEqual(JSON.parse(text));
      }),
      { numRuns: 500 },
    );
  });
  it('acepta NaN/Infinity como Python', () => {
    const p = parseJson('{"x": NaN, "y": -Infinity}');
    expect(pyReprRoot(p)).toBe("{'x': nan, 'y': -inf}");
  });
  it('distingue int de float: 2.0 se imprime 2.0', () => {
    expect(pyReprRoot(parseJson('{"spec_version": 2.0, "n": 2}'))).toBe(
      "{'spec_version': 2.0, 'n': 2}",
    );
  });
  it('acepta BOM (mejor que Python) y lo informa', () => {
    const p = parseJson('﻿{"a":1}');
    expect(p.bom).toBe(true);
  });
  it('error con línea y columna', () => {
    try {
      parseJson('{\n  "a": 1,\n}');
      expect.unreachable();
    } catch (e) {
      expect((e as JsonSyntaxError).line).toBe(3);
      expect((e as Error).message).toMatch(/línea 3 columna 1/);
    }
  });
  it('__proto__ es una clave más (sin contaminar prototipos)', () => {
    const p = parseJson('{"__proto__": {"x": 1}}');
    expect([...(p.value as Map<string, unknown>).keys()]).toEqual(['__proto__']);
    expect(({} as Record<string, unknown>)['x']).toBeUndefined();
  });
  it('orden de claves de Python: "2" no salta antes que "b"; duplicada conserva posición', () => {
    expect(pyReprRoot(parseJson('{"b": 1, "2": 2, "b": 3}'))).toBe("{'b': 3, '2': 2}");
  });
  it('pyStrRepr / pyFloatRepr en casos límite', () => {
    expect(pyStrRepr("o'brien")).toBe('"o\'brien"');
    expect(pyStrRepr('a"b\'c')).toBe("'a\"b\\'c'");
    expect(pyFloatRepr(1e16)).toBe('1e+16');
    expect(pyFloatRepr(1e-5)).toBe('1e-05');
    expect(pyFloatRepr(0.0001)).toBe('0.0001');
    expect(pyFloatRepr(-0)).toBe('-0.0');
  });
});
