/**
 * Guardas de migración `[formato]` (generator.py v3.20.0, «guardas que
 * ENSEÑAN»): nombre viejo → error/aviso que nombra el reemplazo, y campos
 * objeto que llegan como string se coercen con aviso. Mensajes idénticos
 * al oráculo. Mutan el documento recién parseado (propiedad del render).
 */

import { FormatError, type Log } from '../log.ts';
import type { Json, ParsedJson } from '../parse/json.ts';
import { pyStr, pyTypeName } from '../parse/pyrepr.ts';
import { type Doc, isDict, pyIter } from './py.ts';

export function applyFormatGuards(doc: Doc, p: ParsedJson, log: Log): void {
  if (doc.has('flows')) {
    throw new FormatError(
      "[formato] 'flows' se renombró a 'journeys' en v3.9 — misma estructura " +
        '({id, label, color, path}); sólo cambia la clave',
    );
  }
  if (doc.get('layout_template') === 'flow') {
    log.warning(
      "[formato] el template 'flow' se renombró a 'steps' en v3.9 — se ignora; " +
        "declarar layout_template: 'steps'",
    );
    doc.set('layout_template', null);
  }
  const conns = connectionDicts(doc);
  for (const c of conns) {
    const st = c.get('semantic_type');
    if (st === 'data_flow' || st === 'control_flow') {
      const neu = st.replace('_flow', '_link');
      log.warning(
        `[formato] semantic_type '${st}' se renombró a '${neu}' en v3.9 — se tratará ` +
          'como clase custom sin color',
      );
    }
  }
  for (const c of conns) {
    const r = c.get('routing');
    if (typeof r === 'string') {
      log.warning(`[formato] routing como string ('${r}') — interpretado como {"type": "${r}"}`);
      c.set('routing', new Map<string, Json>([['type', r]]));
    } else if (r !== undefined && r !== null && !isDict(r)) {
      log.warning(
        `[formato] routing inválido (${pyTypeName(p, c, 'routing')}) en ` +
          `${strOrNone(p, c, 'from')}→${strOrNone(p, c, 'to')} — se ignora`,
      );
      c.delete('routing');
    }
  }
  const roles = doc.get('roles');
  if (isDict(roles)) {
    for (const [k, v] of roles) {
      if (typeof v === 'string') {
        log.warning(
          `[formato] roles['${k}'] como string — interpretado como {"label": "${v}"} ` +
            'SIN color; declarar {"label", "color"} para conservarlo',
        );
        roles.set(k, new Map<string, Json>([['label', v]]));
      }
    }
  }
}

/** `str(c.get(k))`: None si falta (f-string de Python sobre .get sin default). */
function strOrNone(p: ParsedJson, c: Map<string, Json>, k: string): string {
  return c.has(k) ? pyStr(p, c, k) : 'None';
}

/**
 * Las conexiones-objeto. Python itera `data.get('connections', [])` y llama
 * `.get` sobre cada una: un ítem no-objeto lo revienta (AttributeError). Aquí
 * se saltean; el schema los NOMBRA («no es un objeto — se ignora») y el
 * normalizador los descarta, cumpliendo lo que el aviso promete.
 */
export function connectionDicts(doc: Doc): Map<string, Json>[] {
  const it = pyIter(doc.has('connections') ? doc.get('connections') : []) ?? [];
  return it.filter(isDict);
}
