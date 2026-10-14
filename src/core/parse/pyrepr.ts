/**
 * `type(x).__name__` y `repr(x)` de Python sobre valores JSON, para que los
 * mensajes del schema que habla sean los del oráculo carácter a carácter.
 */
import type { Json, JsonObject, ParsedJson } from './json.ts';

export type Holder = object;

/** Nombre del tipo Python del valor `holder[key]` (int/float distinguidos). */
/** Valor hijo de un contenedor JSON (lista por índice, objeto por clave). */
export function child(holder: Holder, key: string | number): Json | undefined {
  if (holder instanceof Map) return (holder as JsonObject).get(String(key));
  return (holder as Json[])[key as number];
}

export function pyTypeName(p: ParsedJson, holder: Holder, key: string | number): string {
  const v = child(holder, key);
  return pyTypeOf(p, v, p.kinds.get(holder)?.get(key));
}

export function pyTypeOf(_p: ParsedJson, v: Json | undefined, kind?: 'int' | 'float'): string {
  if (v === null || v === undefined) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'string') return 'str';
  if (typeof v === 'number') return kind ?? (Number.isInteger(v) ? 'int' : 'float');
  if (Array.isArray(v)) return 'list';
  return 'dict';
}

/** repr() de un str de Python (elige comillas como CPython). */
export function pyStrRepr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    if (ch === quote || ch === '\\') out += `\\${ch}`;
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (cp < 0x20 || cp === 0x7f) out += `\\x${cp.toString(16).padStart(2, '0')}`;
    else if (cp >= 0xd800 && cp <= 0xdfff) out += `\\u${cp.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return out + quote;
}

/** repr() de un float de Python (repr de doble más corto, reglas de exponente de CPython). */
export function pyFloatRepr(x: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (x === Number.POSITIVE_INFINITY) return 'inf';
  if (x === Number.NEGATIVE_INFINITY) return '-inf';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  // Dígitos más cortos que redondean al doble (mismo criterio que CPython).
  const [mant, expStr] = x.toExponential().split('e') as [string, string];
  const exp = Number(expStr);
  const neg = mant.startsWith('-');
  const digits = mant.replace('-', '').replace('.', '');
  const sign = neg ? '-' : '';
  if (exp < -4 || exp >= 16) {
    const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : (digits[0] as string);
    return `${sign}${m}e${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
  }
  if (exp >= 0) {
    const intPart = digits.slice(0, exp + 1).padEnd(exp + 1, '0');
    const frac = digits.slice(exp + 1);
    return `${sign}${intPart}.${frac || '0'}`;
  }
  return `${sign}0.${'0'.repeat(-exp - 1)}${digits}`;
}

/** repr() de Python de `holder[key]`, recursivo para listas/dicts. */
export function pyRepr(p: ParsedJson, holder: Holder, key: string | number): string {
  const v = child(holder, key);
  return reprValue(p, v, p.kinds.get(holder)?.get(key), p.bigInts.get(holder)?.get(key));
}

function reprValue(
  p: ParsedJson,
  v: Json | undefined,
  kind?: 'int' | 'float',
  big?: string,
): string {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return pyStrRepr(v);
  if (typeof v === 'number') {
    if (big) return big;
    const k = kind ?? (Number.isInteger(v) ? 'int' : 'float');
    return k === 'int' ? String(v) : pyFloatRepr(v);
  }
  if (Array.isArray(v)) return `[${v.map((_, i) => pyRepr(p, v, i)).join(', ')}]`;
  return `{${[...v.keys()].map((k) => `${pyStrRepr(k)}: ${pyRepr(p, v, k)}`).join(', ')}}`;
}

/** str() de Python (para f-strings sin !r): str sin comillas, resto = repr. */
export function pyStr(p: ParsedJson, holder: Holder, key: string | number): string {
  const v = child(holder, key);
  return typeof v === 'string' ? v : pyRepr(p, holder, key);
}

/** repr() del documento completo (la raíz no tiene contenedor: se envuelve). */
export function pyReprRoot(p: ParsedJson): string {
  const box: Json[] = [p.value];
  if (p.rootKind) p.kinds.set(box, new Map([[0, p.rootKind]]));
  if (p.rootKind === 'int' && !Number.isSafeInteger(p.value)) {
    p.bigInts.set(box, new Map([[0, p.rootLexeme]]));
  }
  return pyRepr(p, box, 0);
}
