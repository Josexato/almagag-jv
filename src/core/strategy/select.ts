/**
 * Selector de motor por señales — CONTRATO OBSERVABLE heredado de
 * AlmaGag Python v3.20.0 (`generator.py::select_strategy`), con sus
 * mensajes §O53. Corre sobre el documento YA normalizado (uniones
 * expandidas, theme resuelto), como en el oráculo. Por dentro (A2) cada
 * motor es un perfil de capacidades; aquí sólo se decide el perfil.
 *
 * Orden: --view > considerations/constraints > areas+contains > contains
 * > areas > decision/diamond > ciclo sin coordenadas > auto.
 */

import type { Log } from '../log.ts';
import { type Doc, idKey, isDict, pyIter, truthy } from '../normalize/py.ts';
import type { Json } from '../parse/json.ts';
import { stronglyConnectedComponents } from './scc.ts';

export type Profile = 'auto' | 'hier';
export type View = 'auto' | 'columns' | 'areas' | 'lanes' | 'matrix';

const dicts = (v: Json | undefined): Map<string, Json>[] => (pyIter(v ?? []) ?? []).filter(isDict);

export function hasCycle(doc: Doc): boolean {
  const elements = dicts(doc.get('elements'));
  const ids = elements.map((e) => idKey(e.get('id')));
  const idset = new Set(ids);
  const out = new Map<string, string[]>(ids.map((i) => [i, []]));
  for (const c of dicts(doc.get('connections'))) {
    const f = idKey(c.get('from'));
    const t = idKey(c.get('to'));
    if (f === t && idset.has(f)) return true; // self-loop
    const succ = out.get(f);
    if (succ && idset.has(t)) succ.push(t);
  }
  return stronglyConnectedComponents([...out.keys()], out).some((s) => s.length >= 2);
}

export function selectStrategy(doc: Doc, view: View, log: Log): Profile {
  const elements = dicts(doc.get('elements'));
  const soft = truthy(doc.get('considerations'))
    ? 'considerations'
    : truthy(doc.get('constraints'))
      ? 'constraints'
      : null;
  if (view !== 'auto') {
    if (soft) {
      log.warning(
        `§O53: la vista '--view ${view}' fuerza hier — señal anulada: ` +
          `'${soft}' (align/near/avoid, §④) sólo la aplica AUTO`,
      );
    }
    return 'hier';
  }
  if (soft) {
    if (truthy(doc.get('areas'))) {
      log.info(
        `§O53: '${soft}' fuerza AUTO — 'areas' (§I27) se representa ` +
          'como zonas near (§N46): cajas punteadas rotuladas, no la ' +
          'vista por ámbitos de hier',
      );
    }
    return 'auto';
  }
  if (elements.some((e) => e.has('contains'))) {
    if (truthy(doc.get('areas'))) {
      log.info(
        "§O53: 'areas' + 'contains' — la vista por ámbitos (hier) " +
          'monta los contenedores DENTRO de sus áreas (ARCH-009)',
      );
      return 'hier';
    }
    return 'auto';
  }
  if (truthy(doc.get('areas'))) return 'hier';
  if (elements.some((e) => e.get('type') === 'decision' || e.get('type') === 'diamond'))
    return 'hier';
  if (!elements.some((e) => e.has('x') || e.has('y')) && hasCycle(doc)) return 'hier';
  return 'auto';
}
