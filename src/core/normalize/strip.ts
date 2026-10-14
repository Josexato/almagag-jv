/**
 * Proyección para comparar con el oráculo: quita claves `_*` (comentarios y
 * marcas internas). Conserva la clase léxica int/float en los contenedores
 * nuevos (sin eso `2.0` se imprimiría `2`).
 */
import type { Json, ParsedJson } from '../parse/json.ts';

export function stripPrivate(p: ParsedJson): ParsedJson {
  const kinds = new WeakMap<object, Map<string | number, 'int' | 'float'>>();
  const bigInts = new WeakMap<object, Map<string | number, string>>();
  const copyMeta = (from: object, to: object, fromKey: string | number, toKey: string | number) => {
    const k = p.kinds.get(from)?.get(fromKey);
    if (k) {
      if (!kinds.has(to)) kinds.set(to, new Map());
      kinds.get(to)?.set(toKey, k);
    }
    const b = p.bigInts.get(from)?.get(fromKey);
    if (b) {
      if (!bigInts.has(to)) bigInts.set(to, new Map());
      bigInts.get(to)?.set(toKey, b);
    }
  };
  const walk = (v: Json): Json => {
    if (v instanceof Map) {
      const m = new Map<string, Json>();
      for (const [k, x] of v) {
        if (k.startsWith('_')) continue;
        m.set(k, walk(x));
        copyMeta(v, m, k, k);
      }
      return m;
    }
    if (Array.isArray(v)) {
      const a = v.map(walk);
      for (let i = 0; i < v.length; i++) copyMeta(v, a, i, i);
      return a;
    }
    return v;
  };
  return { ...p, value: walk(p.value), kinds, bigInts };
}
