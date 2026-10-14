/**
 * El schema HABLA (BUGS-VAL-007/X90, validation/schema.py v3.20.0):
 * constructo declarado = renderizado o error explicable, nunca silencio.
 * Nombra toda clave desconocida por superficie y toda forma inesperada.
 * Mensajes idénticos al oráculo (repr/tipos de Python vía pyrepr).
 */

import type { Log } from '../log.ts';
import type { Json, ParsedJson } from '../parse/json.ts';
import { pyRepr, pyStr, pyStrRepr, pyTypeName } from '../parse/pyrepr.ts';
import { type Doc, isDict, isList, pySorted } from './py.ts';

const set = (...k: string[]) => new Set(k);
export const ROOT_KEYS = set(
  'spec_version',
  'elements',
  'connections',
  'canvas',
  'areas',
  'lanes',
  'journeys',
  'considerations',
  'constraints',
  'icons',
  'layout_template',
  'roles',
  'semantics',
  'theme',
  'unions',
);
export const ELEMENT_KEYS = set(
  'id',
  'type',
  'label',
  'contains',
  'shape',
  'x',
  'y',
  'width',
  'height',
  'hp',
  'wp',
  'color',
  'role',
  'status',
  'callout',
  'label_position',
  'label_priority',
  'padding',
  'aspect_ratio',
);
export const CONNECTION_KEYS = set(
  'from',
  'to',
  'label',
  'type',
  'color',
  'style',
  'line_style',
  'direction',
  'routing',
  'semantic_type',
  'waypoints',
  'routing_type',
);
export const CANVAS_KEYS = set('width', 'height', 'flow', 'legend', 'partition');
export const AREA_KEYS = set('id', 'label', 'members', 'color', 'role');
export const JOURNEY_KEYS = set('id', 'label', 'color', 'path');
export const LANE_KEYS = set('id', 'label', 'color', 'members');
export const LEGEND_KEYS = set('label', 'color');

function unknown(d: Map<string, Json>, accepted: Set<string>): string[] {
  return pySorted([...d.keys()].filter((k) => !k.startsWith('_') && !accepted.has(k)));
}

const reprKeys = (ks: string[]) => ks.map(pyStrRepr).join(', ');

/** repr(d.get(k, '?')) */
const reprGet = (p: ParsedJson, d: Map<string, Json>, k: string) =>
  d.has(k) ? pyRepr(p, d, k) : "'?'";
/** f"{d.get(k, '?')}" */
const strGet = (p: ParsedJson, d: Map<string, Json>, k: string) =>
  d.has(k) ? pyStr(p, d, k) : '?';

type Describe = (item: Map<string, Json>) => string;

function auditItems(
  p: ParsedJson,
  log: Log,
  items: Json | undefined,
  accepted: Set<string>,
  where: string,
  describe: Describe,
): number {
  if (!isList(items)) return 0;
  let n = 0;
  items.forEach((item, i) => {
    if (!isDict(item)) {
      log.warning(
        `[schema] ${where}[${i}] no es un objeto (${pyTypeName(p, items, i)}) — se ignora`,
      );
      n++;
      return;
    }
    const bad = unknown(item, accepted);
    if (bad.length) {
      log.warning(
        `[schema] clave(s) desconocida(s) ${reprKeys(bad)} en ${where}[${i}] (${describe(item)}) — se ignoran`,
      );
      n++;
    }
  });
  return n;
}

/** Devuelve el número de hallazgos (0 = el archivo entero se entiende). */
export function auditSchema(doc: Doc, p: ParsedJson, log: Log): number {
  let n = 0;
  if (doc.has('spec_version') && doc.get('spec_version') !== null) {
    log.info(
      `[schema] spec_version ${pyRepr(p, doc, 'spec_version')} declarada — el formato ` +
        'aún no está versionado; el motor la registra y sigue (contrato formal: WISH-ARCH-007)',
    );
  }
  const bad = unknown(doc, ROOT_KEYS);
  if (bad.length) {
    log.warning(`[schema] clave(s) desconocida(s) en la raíz: ${reprKeys(bad)} — se ignoran`);
    n++;
  }
  n += auditItems(p, log, doc.get('elements'), ELEMENT_KEYS, 'elements', (e) =>
    reprGet(p, e, 'id'),
  );
  n += auditItems(
    p,
    log,
    doc.get('connections'),
    CONNECTION_KEYS,
    'connections',
    (c) => `${strGet(p, c, 'from')}→${strGet(p, c, 'to')}`,
  );
  n += auditItems(p, log, doc.get('areas'), AREA_KEYS, 'areas', (a) => reprGet(p, a, 'id'));
  n += auditItems(p, log, doc.get('journeys'), JOURNEY_KEYS, 'journeys', (j) =>
    reprGet(p, j, 'id'),
  );
  n += auditItems(p, log, doc.get('lanes'), LANE_KEYS, 'lanes', (l) => reprGet(p, l, 'id'));

  if (doc.has('canvas') && doc.get('canvas') !== null) {
    const canvas = doc.get('canvas');
    if (isDict(canvas)) {
      const badc = unknown(canvas, CANVAS_KEYS);
      if (badc.length) {
        log.warning(`[schema] clave(s) desconocida(s) en canvas: ${reprKeys(badc)} — se ignoran`);
        n++;
      }
      n += auditItems(p, log, canvas.get('legend'), LEGEND_KEYS, 'canvas.legend', (i) =>
        reprGet(p, i, 'label'),
      );
    } else {
      log.warning(`[schema] canvas no es un objeto (${pyTypeName(p, doc, 'canvas')}) — se ignora`);
      n++;
    }
  }

  const vocab: Array<[string, 'dict' | 'list']> = [
    ['roles', 'dict'],
    ['semantics', 'dict'],
    ['theme', 'dict'],
    ['icons', 'dict'],
    ['unions', 'list'],
    ['considerations', 'list'],
    ['constraints', 'list'],
  ];
  for (const [key, want] of vocab) {
    if (!doc.has(key) || doc.get(key) === null) continue;
    const v = doc.get(key);
    const ok = want === 'dict' ? isDict(v) : isList(v);
    if (!ok) {
      log.warning(
        `[schema] ${key} debería ser ${want === 'dict' ? 'objeto' : 'lista'} (${pyTypeName(p, doc, key)}) — se ignora`,
      );
      n++;
    }
  }
  if (n) {
    log.warning(
      `[schema] ${n} hallazgo(s) — lo no reconocido se nombró arriba; nada se descarta en silencio`,
    );
  }
  return n;
}
