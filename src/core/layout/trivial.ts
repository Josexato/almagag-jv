/**
 * FASE 0 — colocación trivial en grilla, sólo para que el CLI emita algo
 * medible desde el día uno. NO es el motor: la reemplaza la fase 2.
 * Respeta `x`/`y` declarados (compatibilidad heredada, H5).
 */

import type { Log } from '../log.ts';
import type { Diagram } from '../model/diagram.ts';
import {
  type EdgeId,
  makeScene,
  type Scene,
  type SceneEdge,
  type SceneNode,
} from '../model/scene.ts';

export const ICON_W = 80;
export const ICON_H = 50;
const CELL_W = 180;
const CELL_H = 130;
const MARGIN = 50;

export function trivialScene(d: Diagram, log: Log): Scene {
  const cols = Math.max(1, Math.ceil(Math.sqrt(d.elements.length)));
  // Ids duplicados: el oráculo dibuja ambos y las conexiones van al ÚLTIMO.
  const lastByKey = new Map<string, string>();
  const nodes: SceneNode[] = d.elements.map((e, i) => {
    const finite = (v: number | null) => v !== null && Number.isFinite(v);
    const pinned = finite(e.x) && finite(e.y);
    const x = pinned ? (e.x as number) : MARGIN + (i % cols) * CELL_W;
    const y = pinned ? (e.y as number) : MARGIN + Math.floor(i / cols) * CELL_H;
    const sid = `n${i}`;
    lastByKey.set(e.key, sid);
    return {
      id: sid,
      authorId: e.id,
      type: e.type,
      label: e.label,
      color: e.color,
      status: e.status,
      box: { x, y, w: ICON_W, h: ICON_H },
      pinned,
    };
  });
  const edges: SceneEdge[] = [];
  const dropped: string[] = [];
  for (const c of d.connections) {
    const a = lastByKey.get(c.fromKey);
    const b = lastByKey.get(c.toKey);
    if (a && b)
      edges.push({ id: `e${c.index}` as EdgeId, from: a, to: b, label: c.label, route: null });
    else dropped.push(`${c.from}→${c.to}`);
  }
  // Nada se descarta en silencio: la arista con un extremo inexistente se NOMBRA.
  if (dropped.length > 0) {
    log.warning(
      `[fase0] ${dropped.length} arista(s) con extremo inexistente, no dibujada(s): ` +
        dropped.join(', '),
    );
  }
  return makeScene(nodes, edges);
}
