/**
 * FASE 0 — colocación trivial en grilla, sólo para que el CLI emita algo
 * medible desde el día uno. NO es el motor: la reemplaza la fase 2.
 * Respeta `x`/`y` declarados (compatibilidad heredada, H5).
 */

import type { Log } from '../log.ts';
import {
  type EdgeId,
  makeScene,
  type Scene,
  type SceneEdge,
  type SceneNode,
} from '../model/scene.ts';
import type { Diagram } from '../parse/sdjf.ts';

export const ICON_W = 80;
export const ICON_H = 50;
const CELL_W = 180;
const CELL_H = 130;
const MARGIN = 50;

export function trivialScene(d: Diagram, log: Log): Scene {
  const cols = Math.max(1, Math.ceil(Math.sqrt(d.elements.length)));
  const nodes: SceneNode[] = d.elements.map((e, i) => {
    const pinned = typeof e.x === 'number' && typeof e.y === 'number';
    const x = pinned ? (e.x as number) : MARGIN + (i % cols) * CELL_W;
    const y = pinned ? (e.y as number) : MARGIN + Math.floor(i / cols) * CELL_H;
    return {
      id: e.id,
      type: typeof e.type === 'string' ? e.type : 'unknown',
      label: typeof e.label === 'string' ? e.label : e.id,
      color: typeof e['color'] === 'string' ? (e['color'] as string) : 'gray',
      box: { x, y, w: ICON_W, h: ICON_H },
      pinned,
    };
  });
  const ids = new Set(nodes.map((n) => n.id));
  const edges: SceneEdge[] = d.connections
    .map((c, i) => ({
      id: `e${i}` as EdgeId,
      from: c.from,
      to: c.to,
      label: typeof c.label === 'string' ? c.label : null,
      route: null,
    }))
    .filter((e) => ids.has(e.from) && ids.has(e.to));
  // Nada se descarta en silencio: la arista con un extremo inexistente se
  // NOMBRA (en fase 0 incluye las que apuntan a `unions` aún no expandidas).
  const dropped = d.connections.filter((c) => !ids.has(c.from) || !ids.has(c.to));
  if (dropped.length > 0) {
    log.warning(
      `[fase0] ${dropped.length} arista(s) con extremo inexistente, no dibujada(s): ` +
        dropped.map((c) => `${c.from}→${c.to}`).join(', '),
    );
  }
  return makeScene(nodes, edges);
}
