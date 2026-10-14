/**
 * Semántica de Python sobre el documento JSON (Map/Array), para que el
 * normalizador decida EXACTAMENTE lo que decide el oráculo: truthiness,
 * iteración de str/dict, `.lower()` sin contexto, orden de `sorted()` por
 * punto de código e igualdad de claves de set/dict (1 == 1.0 == True).
 */
import type { Json, JsonObject } from '../parse/json.ts';

export type Doc = JsonObject;

export const isDict = (v: Json | undefined): v is JsonObject => v instanceof Map;
export const isList = (v: Json | undefined): v is Json[] => Array.isArray(v);

/** bool(v) de Python. Ojo: NaN es verdadero en Python. */
export function truthy(v: Json | undefined): boolean {
  if (v === undefined || v === null || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map) return v.size > 0;
  return true;
}

/**
 * `for x in v` de Python sobre un valor JSON: lista → ítems, str → caracteres,
 * dict → claves. Devuelve null si Python lanzaría TypeError (número/bool/None).
 */
export function pyIter(v: Json | undefined): Json[] | null {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return [...v];
  if (v instanceof Map) return [...v.keys()];
  return null;
}

/** str.lower() de Python: por punto de código, sin la sigma final contextual de JS. */
export function pyLower(s: string): string {
  let out = '';
  for (const ch of s) out += ch.toLowerCase();
  return out;
}

/** sorted() de Python sobre str: orden por punto de código (no por UTF-16). */
export function pySorted(xs: Iterable<string>): string[] {
  return [...xs].sort((a, b) => {
    const A = [...a].map((c) => c.codePointAt(0) as number);
    const B = [...b].map((c) => c.codePointAt(0) as number);
    for (let i = 0; i < Math.min(A.length, B.length); i++) {
      if (A[i] !== B[i]) return (A[i] as number) - (B[i] as number);
    }
    return A.length - B.length;
  });
}

/**
 * Clave de hash de Python para ids: 1, 1.0 y True colisionan; "1" no.
 * Lanza si el valor no es hasheable (list/dict: TypeError en Python).
 */
let nanSerial = 0;
export function idKey(v: Json | undefined): string {
  if (v === undefined || v === null) return 'N';
  if (typeof v === 'string') return `s:${v}`;
  if (typeof v === 'boolean') return `n:${v ? 1 : 0}`;
  // Cada NaN leído del JSON es un objeto float distinto en Python: nunca
  // coincide con otro (ni consigo mismo vía ==). Contador determinista.
  if (typeof v === 'number') return Number.isNaN(v) ? `nan:${nanSerial++}` : `n:${v}`;
  throw new TypeError('unhashable');
}
