/**
 * FASE 0 — emisor trivial: caja rotulada por nodo, recta centro a centro
 * por arista y viewBox recortado al bbox + 40 (O51). La emisión real
 * (DrawList → SVG, A3) llega en las fases 1 y 4.
 */
import { center, type Scene } from '../model/scene.ts';
import { attrs, esc, num } from './xml.ts';

const CROP_MARGIN = 40; // O51
const NODE_FONT = 16; // O56
const CHAR_W = 0.62 * NODE_FONT; // estimación de ancho de carácter de O51

export function emitTrivialSvg(scene: Scene, comment: string): string {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  const body: string[] = [];

  for (const e of scene.edges.values()) {
    const a = scene.nodes.get(e.from);
    const b = scene.nodes.get(e.to);
    if (!a || !b) continue;
    const p = center(a.box);
    const q = center(b.box);
    body.push(
      `<line${attrs({ class: 'ag-edge', 'data-edge': e.id, x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: '#4c4c4c', 'stroke-width': 2 })}/>`,
    );
  }
  for (const n of scene.nodes.values()) {
    const { x, y, w, h } = n.box;
    const lines = n.label.split('\n');
    const tw = Math.max(...lines.map((l) => l.length)) * CHAR_W;
    const ty = y + h + 18;
    x0 = Math.min(x0, x, x + w / 2 - tw / 2);
    x1 = Math.max(x1, x + w, x + w / 2 + tw / 2);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, ty + (lines.length - 1) * 20.6);
    body.push(
      `<g${attrs({ class: 'ag-node', 'data-id': n.id })}>` +
        `<rect${attrs({ x, y, width: w, height: h, rx: 6, fill: n.color, 'fill-opacity': 0.25, stroke: '#333' })}/>` +
        lines
          .map(
            (l, i) =>
              `<text${attrs({ x: x + w / 2, y: ty + i * 20.6, 'text-anchor': 'middle', 'font-size': NODE_FONT, 'font-family': 'sans-serif' })}>${esc(l)}</text>`,
          )
          .join('') +
        '</g>',
    );
  }
  if (!Number.isFinite(x0)) {
    x0 = 0;
    y0 = 0;
    x1 = 0;
    y1 = 0;
  }
  const vx = x0 - CROP_MARGIN;
  const vy = y0 - CROP_MARGIN;
  const vw = x1 - x0 + 2 * CROP_MARGIN;
  const vh = y1 - y0 + 2 * CROP_MARGIN;
  return (
    '<?xml version="1.0" encoding="utf-8"?>\n' +
    `<svg xmlns="http://www.w3.org/2000/svg"${attrs({ width: vw, height: vh })} viewBox="${num(vx)} ${num(vy)} ${num(vw)} ${num(vh)}">` +
    `<!-- ${esc(comment)} -->` +
    `<rect${attrs({ x: vx, y: vy, width: vw, height: vh, fill: '#ffffff' })}/>` +
    body.join('') +
    '</svg>\n'
  );
}
