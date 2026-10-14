/**
 * Selector de motor por señales — CONTRATO OBSERVABLE heredado de
 * AlmaGag Python v3.20.0 (`generator.py::select_strategy`), con sus
 * mensajes §O53. Por dentro (A2) cada motor es un perfil de capacidades
 * sobre un único pipeline; aquí sólo se decide el perfil.
 *
 * Orden: --view > considerations/constraints > areas+contains > contains
 * > areas > decision/diamond > ciclo sin coordenadas > auto.
 */
import type { Log } from '../log.ts';
import type { Diagram, RawConnection, RawElement } from '../parse/sdjf.ts';
import { stronglyConnectedComponents } from './scc.ts';

export type Profile = 'auto' | 'hier';
export type View = 'auto' | 'columns' | 'areas' | 'lanes' | 'matrix';

function truthy(v: unknown): boolean {
  if (v === undefined || v === null || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

export function hasCycle(
  elements: readonly RawElement[],
  connections: readonly RawConnection[],
): boolean {
  const ids = elements.map((e) => e.id);
  const idset = new Set(ids);
  const out = new Map<string, string[]>(ids.map((i) => [i, []]));
  for (const c of connections) {
    if (c.from === c.to && idset.has(c.from)) return true; // self-loop
    const succ = out.get(c.from);
    if (succ && idset.has(c.to)) succ.push(c.to);
  }
  return stronglyConnectedComponents(ids, out).some((s) => s.length >= 2);
}

export function selectStrategy(d: Diagram, view: View, log: Log): Profile {
  const raw = d.raw;
  const soft = truthy(raw['considerations'])
    ? 'considerations'
    : truthy(raw['constraints'])
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
    if (truthy(raw['areas'])) {
      log.info(
        `§O53: '${soft}' fuerza AUTO — 'areas' (§I27) se representa ` +
          'como zonas near (§N46): cajas punteadas rotuladas, no la ' +
          'vista por ámbitos de hier',
      );
    }
    return 'auto';
  }
  if (d.elements.some((e) => 'contains' in e)) {
    if (truthy(raw['areas'])) {
      log.info(
        "§O53: 'areas' + 'contains' — la vista por ámbitos (hier) " +
          'monta los contenedores DENTRO de sus áreas (ARCH-009)',
      );
      return 'hier';
    }
    return 'auto';
  }
  if (truthy(raw['areas'])) return 'hier';
  if (d.elements.some((e) => e.type === 'decision' || e.type === 'diamond')) return 'hier';
  if (!d.elements.some((e) => 'x' in e || 'y' in e) && hasCycle(d.elements, d.connections)) {
    return 'hier';
  }
  return 'auto';
}
