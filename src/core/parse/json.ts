/**
 * Parser JSON propio, compatible con `json.loads` de Python (el oráculo).
 *
 * Por qué no `JSON.parse`:
 * - Python acepta `NaN`, `Infinity`, `-Infinity` (el formato sagrado es
 *   «todo lo que el Python v3.20.0 acepta»).
 * - Los mensajes del schema que habla dependen del TIPO Python de cada valor
 *   (`int` vs `float`: `2.0` se imprime `2.0`, no `2`), que `JSON.parse`
 *   pierde. Aquí cada contenedor recuerda la clase léxica de sus números.
 * - Errores con línea/columna/carácter en español.
 *
 * Diferencias deliberadas (igual o MEJOR): se acepta un BOM UTF-8 inicial
 * (Python lo rechaza con «Unexpected UTF-8 BOM») y se informa en `bom`.
 */

/**
 * Los objetos JSON son `Map`: conservan el orden de inserción de TODAS las
 * claves, como el dict de Python. (Un objeto JS reordena las claves con forma
 * de entero — "0", "2" — al principio: rompería el determinismo de `roles`,
 * `icons`, `theme`… con claves numéricas. Lo detectó la prueba diferencial.)
 */
export type JsonObject = Map<string, Json>;
export type Json = null | boolean | number | string | Json[] | JsonObject;
export type NumKind = 'int' | 'float';

export interface ParsedJson {
  readonly value: Json;
  readonly bom: boolean;
  /** Clase léxica Python de los números hijos de cada contenedor. */
  readonly kinds: WeakMap<object, Map<string | number, NumKind>>;
  /** Lexema original de los enteros fuera del rango seguro de JS. */
  readonly bigInts: WeakMap<object, Map<string | number, string>>;
  /** Clase léxica de la raíz si es un número. */
  readonly rootKind: NumKind | null;
  readonly rootLexeme: string;
}

export class JsonSyntaxError extends Error {
  override readonly name = 'JsonSyntaxError';
  constructor(
    readonly reason: string,
    readonly line: number,
    readonly column: number,
    readonly pos: number,
  ) {
    super(`${reason}: línea ${line} columna ${column} (carácter ${pos})`);
  }
}

const WS = new Set([' ', '\t', '\n', '\r']);
const ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};
const NUM_RE = /-?(?:0|[1-9]\d*)(\.\d+)?([eE][-+]?\d+)?/y;

export function parseJson(text: string): ParsedJson {
  let bom = false;
  let s = text;
  if (s.charCodeAt(0) === 0xfeff) {
    bom = true;
    s = s.slice(1);
  }
  const kinds = new WeakMap<object, Map<string | number, NumKind>>();
  const bigInts = new WeakMap<object, Map<string | number, string>>();
  let i = 0;

  const fail = (reason: string, at = i): never => {
    let line = 1;
    let col = 1;
    for (let k = 0; k < at && k < s.length; k++) {
      if (s[k] === '\n') {
        line++;
        col = 1;
      } else col++;
    }
    throw new JsonSyntaxError(reason, line, col, at + (bom ? 1 : 0));
  };
  const skip = () => {
    while (i < s.length && WS.has(s[i] as string)) i++;
  };
  const record = (
    holder: object,
    key: string | number,
    kind: NumKind,
    lexeme: string,
    v: number,
  ) => {
    let m = kinds.get(holder);
    if (!m) {
      m = new Map();
      kinds.set(holder, m);
    }
    m.set(key, kind);
    if (kind === 'int' && !Number.isSafeInteger(v)) {
      let b = bigInts.get(holder);
      if (!b) {
        b = new Map();
        bigInts.set(holder, b);
      }
      b.set(key, lexeme);
    }
  };

  function parseString(): string {
    const start = i;
    i++; // comilla de apertura
    let out = '';
    for (;;) {
      if (i >= s.length) fail('cadena sin cerrar', start);
      const c = s[i] as string;
      if (c === '"') {
        i++;
        return out;
      }
      if (c === '\\') {
        const e = s[i + 1];
        if (e === 'u') {
          const hex = s.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail('escape \\u inválido');
          out += String.fromCharCode(Number.parseInt(hex, 16));
          i += 6;
        } else if (e !== undefined && e in ESCAPES) {
          out += ESCAPES[e];
          i += 2;
        } else fail('escape inválido');
      } else if (c.charCodeAt(0) < 0x20) {
        fail('carácter de control sin escapar dentro de la cadena');
      } else {
        out += c;
        i++;
      }
    }
  }

  // Devuelve [valor, clase numérica si es número, lexema].
  function parseValue(): [Json, NumKind | null, string] {
    skip();
    const c = s[i];
    if (c === '{') return [parseObject(), null, ''];
    if (c === '[') return [parseArray(), null, ''];
    if (c === '"') return [parseString(), null, ''];
    if (s.startsWith('true', i)) {
      i += 4;
      return [true, null, ''];
    }
    if (s.startsWith('false', i)) {
      i += 5;
      return [false, null, ''];
    }
    if (s.startsWith('null', i)) {
      i += 4;
      return [null, null, ''];
    }
    if (s.startsWith('NaN', i)) {
      i += 3;
      return [Number.NaN, 'float', 'NaN'];
    }
    if (s.startsWith('Infinity', i)) {
      i += 8;
      return [Number.POSITIVE_INFINITY, 'float', 'Infinity'];
    }
    if (s.startsWith('-Infinity', i)) {
      i += 9;
      return [Number.NEGATIVE_INFINITY, 'float', '-Infinity'];
    }
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(s);
    if (m) {
      i += m[0].length;
      const kind: NumKind = m[1] !== undefined || m[2] !== undefined ? 'float' : 'int';
      return [Number(m[0]), kind, m[0]];
    }
    return fail('se esperaba un valor');
  }

  function parseArray(): Json[] {
    const arr: Json[] = [];
    i++;
    skip();
    if (s[i] === ']') {
      i++;
      return arr;
    }
    for (;;) {
      const [v, kind, lex] = parseValue();
      if (kind) record(arr, arr.length, kind, lex, v as number);
      arr.push(v);
      skip();
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] === ']') {
        i++;
        return arr;
      }
      fail("se esperaba ',' o ']'");
    }
  }

  function parseObject(): JsonObject {
    const obj: JsonObject = new Map();
    i++;
    skip();
    if (s[i] === '}') {
      i++;
      return obj;
    }
    for (;;) {
      skip();
      if (s[i] !== '"') fail('se esperaba un nombre de propiedad entre comillas dobles');
      const key = parseString();
      skip();
      if (s[i] !== ':') fail("se esperaba ':'");
      i++;
      const [v, kind, lex] = parseValue();
      // Clave duplicada: gana la última pero conserva la POSICIÓN de la
      // primera (igual que el dict de Python: d[k] = v no reordena).
      obj.set(key, v);
      if (kind) record(obj, key, kind, lex, v as number);
      else kinds.get(obj)?.delete(key);
      skip();
      if (s[i] === ',') {
        i++;
        continue;
      }
      if (s[i] === '}') {
        i++;
        return obj;
      }
      fail("se esperaba ',' o '}'");
    }
  }

  const [value, rootKind, rootLexeme] = parseValue();
  skip();
  if (i < s.length) fail('datos extra después del documento');
  return { value, bom, kinds, bigInts, rootKind, rootLexeme };
}
