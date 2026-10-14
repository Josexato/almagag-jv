/**
 * El diagrama TIPADO que consume el pipeline, construido desde el documento
 * normalizado. Aquí termina la «zona Python» (Map/Json): de este punto en
 * adelante todo es tipado e inmutable (A1). Donde el oráculo revienta con un
 * traceback (falta `id`, falta `to`, label numérico, raíz no objeto…), el
 * motor da un FormatError NOMBRADO o, si el aviso del schema ya prometió
 * «se ignora», lo cumple.
 */

import { FormatError, type Log } from '../log.ts';
import { type Doc, idKey, isDict, isList, pyIter, pyLower } from '../normalize/py.ts';
import type { UnionInfo } from '../normalize/vocab.ts';
import type { Json, ParsedJson } from '../parse/json.ts';
import { pyStr } from '../parse/pyrepr.ts';

export interface DElement {
  readonly id: string;
  readonly key: string; // clave de identidad Python (1 == 1.0)
  readonly type: string;
  readonly label: string;
  /** `element.get('color', 'gray')`; null = color no-texto (el oráculo revienta al dibujar). */
  readonly color: string | null;
  readonly isContainer: boolean;
  readonly x: number | null;
  readonly y: number | null;
  readonly isUnion: boolean;
  /** str(element.get('status', '')).lower() — clave de badge §V82. */
  readonly status: string;
  readonly raw: ReadonlyMap<string, Json>;
}

export interface DConnection {
  readonly index: number;
  readonly from: string;
  readonly fromKey: string;
  readonly to: string;
  readonly toKey: string;
  readonly label: string | null;
  readonly isUnionBar: boolean;
  readonly raw: ReadonlyMap<string, Json>;
}

export interface Diagram {
  readonly elements: readonly DElement[];
  readonly connections: readonly DConnection[];
  readonly doc: Doc;
}

const num = (v: Json | undefined): number | null => (typeof v === 'number' ? v : null);

export function buildDiagram(doc: Doc, p: ParsedJson, unions: UnionInfo, log: Log): Diagram {
  const els = doc.has('elements') ? doc.get('elements') : [];
  if (!isList(els)) {
    throw new FormatError(
      `[formato] 'elements' debe ser una lista de nodos (llegó ${els === null ? 'null' : typeof els})`,
    );
  }
  const elements: DElement[] = [];
  els.forEach((e, i) => {
    if (!isDict(e)) return; // nombrado por el schema: «no es un objeto — se ignora»
    if (!e.has('id')) throw new FormatError(`[formato] elements[${i}] sin 'id' (obligatorio)`);
    const id = pyStr(p, e, 'id');
    let label: string;
    const l = e.get('label');
    if (l === undefined || l === null) label = '';
    else if (typeof l === 'string') label = l;
    else {
      label = pyStr(p, e, 'label');
      log.warning(
        `[jv] elements[${i}] ('${id}'): label no es texto (${label}) — se usa como texto (el oráculo revienta)`,
      );
    }
    const key = idKey(e.get('id'));
    elements.push(
      Object.freeze({
        id,
        key,
        type: typeof e.get('type') === 'string' ? (e.get('type') as string) : 'unknown',
        label,
        color: !e.has('color')
          ? 'gray'
          : typeof e.get('color') === 'string'
            ? (e.get('color') as string)
            : null,
        isContainer: e.has('contains'),
        x: num(e.get('x')),
        y: num(e.get('y')),
        isUnion: unions.unionNodes.has(key) && e.get('type') === 'union',
        status: pyLower(e.has('status') ? pyStr(p, e, 'status') : ''),
        raw: e,
      }),
    );
  });
  const connections: DConnection[] = [];
  (pyIter(doc.has('connections') ? doc.get('connections') : []) ?? []).forEach((c, i) => {
    if (!isDict(c)) return;
    for (const k of ['from', 'to'] as const) {
      if (!c.has(k)) throw new FormatError(`[formato] connections[${i}] sin '${k}' (obligatorio)`);
    }
    const l = c.get('label');
    connections.push(
      Object.freeze({
        index: i,
        from: pyStr(p, c, 'from'),
        fromKey: idKey(c.get('from')),
        to: pyStr(p, c, 'to'),
        toKey: idKey(c.get('to')),
        label:
          typeof l === 'string' ? l : l === undefined || l === null ? null : pyStr(p, c, 'label'),
        isUnionBar: unions.barEdges.has(c),
        raw: c,
      }),
    );
  });
  return Object.freeze({ elements, connections, doc });
}
