/**
 * Pasadas de vocabulario sobre el documento crudo, en el orden del oráculo
 * (generator.py): unions §H7 → semantics §Q63 → theme §O57. Mensajes
 * idénticos; lo que el oráculo descarta en SILENCIO aquí se nombra con la
 * etiqueta `[jv]` (fuera de la comparación de igualdad, contado aparte).
 */

import type { Log } from '../log.ts';
import type { Json, ParsedJson } from '../parse/json.ts';
import { pyStr } from '../parse/pyrepr.ts';
import { type Doc, idKey, isDict, isList, pyIter, pyLower, truthy } from './py.ts';

export interface UnionInfo {
  /** ids (clave Python) de los nodos de unión sintéticos. */
  readonly unionNodes: ReadonlySet<string>;
  /** Conexiones de barra padre→unión creadas por la expansión. */
  readonly barEdges: ReadonlySet<Map<string, Json>>;
}

/** §H7: cada unión → nodo de barra (type union) + aristas padre→unión. */
export function expandUnions(doc: Doc, p: ParsedJson, log: Log): UnionInfo {
  const unionNodes = new Set<string>();
  const barEdges = new Set<Map<string, Json>>();
  const unions = doc.get('unions');
  if (!truthy(unions)) return { unionNodes, barEdges };
  const items = isList(unions) ? unions : [];
  if (!isList(unions)) {
    // El schema ya nombró la forma; Python iteraría y reventaría.
    return { unionNodes, barEdges };
  }
  if (!isList(doc.get('elements'))) doc.set('elements', []);
  if (!isList(doc.get('connections'))) doc.set('connections', []);
  const elements = doc.get('elements') as Json[];
  const connections = doc.get('connections') as Json[];
  const existing = new Set(elements.filter(isDict).map((e) => idKey(e.get('id'))));
  let n = 0;
  items.forEach((u, i) => {
    if (!isDict(u)) {
      log.warning(`[jv] unions[${i}] no es un objeto — se ignora (el oráculo revienta)`);
      return;
    }
    const uid = u.get('id');
    const betweenRaw = u.get('between');
    const between = truthy(betweenRaw) ? pyIter(betweenRaw) : [];
    if (!truthy(uid) || between === null || between.length < 2) {
      log.warning(
        `[jv] unions[${i}] inválida (id ${truthy(uid) ? pyStr(p, u, 'id') : 'ausente'}, ` +
          `${between === null ? 'between no iterable' : `${between.length} progenitor(es)`}) — ` +
          'se ignora (el oráculo la descarta en silencio)',
      );
      return;
    }
    const key = idKey(uid);
    if (!existing.has(key)) {
      elements.push(
        new Map<string, Json>([
          ['id', uid as Json],
          ['type', 'union'],
          ['label', ''],
        ]),
      );
      existing.add(key);
      unionNodes.add(key);
    }
    for (const parent of between) {
      const bar = new Map<string, Json>([
        ['from', parent],
        ['to', uid as Json],
        ['direction', 'none'],
      ]);
      connections.push(bar);
      barEdges.add(bar);
    }
    n++;
  });
  if (n) log.info(`§H7: ${n} union(es) expandida(s) a nodo de barra`);
  return { unionNodes, barEdges };
}

/** §Q63: el mapa `semantics` DEL ARCHIVO clasifica conexiones sin semantic_type. */
export function applyEmbeddedSemantics(doc: Doc, p: ParsedJson, log: Log): number {
  const spec = doc.get('semantics');
  if (!isDict(spec) || spec.size === 0) return 0;
  const classes: Array<[string, string[], Json | undefined]> = [];
  for (const [name, val] of spec) {
    let keywordsRaw: Json | undefined;
    let color: Json | undefined;
    let holder: Map<string, Json> | Json[] | null = null;
    if (isDict(val)) {
      keywordsRaw = val.has('keywords') ? val.get('keywords') : [];
      color = val.get('color');
      if (isList(keywordsRaw)) holder = keywordsRaw;
    } else {
      keywordsRaw = val;
      if (isList(val)) holder = val;
    }
    const it = pyIter(keywordsRaw);
    if (it === null) {
      log.warning(
        `[jv] semantics['${name}']: keywords no iterables — clase ignorada (el oráculo revienta)`,
      );
      continue;
    }
    // [str(k).lower() for k in keywords if k] — str() de Python por ítem.
    const kws = it
      .map((k, i) => [k, i] as const)
      .filter(([k]) => truthy(k))
      .map(([k, i]) =>
        pyLower(holder && typeof k !== 'string' ? pyStr(p, holder, i) : pyStrValue(k)),
      );
    if (kws.length) classes.push([name, kws, color]);
  }
  if (!classes.length) return 0;
  let n = 0;
  for (const conn of pyIter(doc.has('connections') ? doc.get('connections') : []) ?? []) {
    if (!isDict(conn)) continue;
    if (truthy(conn.get('semantic_type'))) continue; // lo declarado JAMÁS se pisa
    const label = pyLower(conn.has('label') ? pyStr(p, conn, 'label') : '');
    if (!label) continue;
    for (const [name, kws, color] of classes) {
      if (kws.some((k) => label.includes(k))) {
        conn.set('semantic_type', name);
        if (truthy(color) && !truthy(conn.get('color'))) conn.set('color', color as Json);
        n++;
        break;
      }
    }
  }
  if (n) {
    log.warning(
      `§Q63 [semantic]: ${n} enlace(s) con semantic_type inferido del label vía el mapa ` +
        '`semantics` del archivo — declararlo explícito es lo correcto',
    );
  }
  return n;
}

/** str() de Python de un valor suelto (sin contenedor que recuerde int/float). */
function pyStrValue(v: Json): string {
  if (typeof v === 'string') return v;
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (v === null) return 'None';
  return String(v);
}

/** §O57: tokens de tema → hex, sólo coincidencias exactas con claves del theme. */
export function applyTheme(doc: Doc, log: Log): number {
  const theme = doc.get('theme');
  if (!isDict(theme) || theme.size === 0) return 0;
  let resolved = 0;
  const resolve = (item: Map<string, Json>) => {
    const c = item.get('color');
    if (typeof c === 'string' && theme.has(c)) {
      item.set('color', theme.get(c) as Json);
      resolved++;
    }
  };
  for (const key of ['elements', 'connections', 'areas', 'lanes']) {
    const v = doc.get(key);
    for (const item of truthy(v) ? (pyIter(v) ?? []) : []) if (isDict(item)) resolve(item);
  }
  const roles = doc.get('roles');
  if (isDict(roles)) for (const spec of roles.values()) if (isDict(spec)) resolve(spec);
  if (resolved)
    log.info(`§O57: ${resolved} color(es) resueltos desde theme (${theme.size} token(s))`);
  return resolved;
}
