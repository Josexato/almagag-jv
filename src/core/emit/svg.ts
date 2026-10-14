/**
 * Emisión mínima (fase 1): canvas con viewBox, iconos (builtin/embebidos/
 * union/BWT §O55), labels con la escala tipográfica §O56 y badges de status
 * §V82, aristas rectas centro a centro (colocación trivial), y el
 * post-proceso del oráculo: §O51 recorte + §O50 halo (finalize.ts).
 * La emisión completa (leyendas, journeys, contenedores) es la fase 4.
 */
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FONT_SIZE_NODE,
  ICON_HEIGHT,
  ICON_WIDTH,
  TEXT_LINE_HEIGHT,
} from '../config.ts';
import { drawIconShape, type Embedded } from '../icons/index.ts';
import type { Log } from '../log.ts';
import { center, type Scene } from '../model/scene.ts';
import { finalizeSvg } from './finalize.ts';
import { attrs, esc, num } from './xml.ts';

/** WISH-DRAW-004 (V82): el badge colorea la ÚLTIMA línea del label. */
export const STATUS_BADGES: Readonly<Record<string, readonly [string, string]>> = {
  ok: ['◉', '#2e7d32'],
  partial: ['◪', '#b8860b'],
  empty: ['▢', '#757575'],
};

const LABEL_GAP = 20; // get_text_coords('bottom'): y + ICON_HEIGHT + 20
const CANVAS_MARGIN = 50;

export interface EmitOptions {
  readonly comment: string;
  readonly canvas: { readonly width: number | null; readonly height: number | null };
  readonly icons: Embedded | null;
}

function label(text: string, x: number, y: number, status: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const badge = STATUS_BADGES[status];
  return lines
    .map((line, i) => {
      const last = i === lines.length - 1;
      const t = badge && last ? `${badge[0]} ${line}` : line;
      const fill = badge && last ? badge[1] : 'black';
      return `<text${attrs({ x, y: y + i * TEXT_LINE_HEIGHT, 'text-anchor': 'middle', 'font-size': `${FONT_SIZE_NODE}px`, 'font-family': 'Arial, sans-serif', fill })}>${esc(t)}</text>`;
    })
    .join('');
}

export function emitSvg(scene: Scene, opts: EmitOptions, log: Log): string {
  const defs: string[] = [];
  const edges: string[] = [];
  const nodes: string[] = [];
  let maxX = 0;
  let maxY = 0;
  for (const e of scene.edges.values()) {
    const a = scene.nodes.get(e.from);
    const b = scene.nodes.get(e.to);
    if (!a || !b) continue;
    const p = center(a.box);
    const q = center(b.box);
    edges.push(
      `<line${attrs({ class: 'ag-edge', x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: 'black', 'stroke-width': 2 })}/>`,
    );
  }
  for (const n of scene.nodes.values()) {
    const { x, y } = n.box;
    const icon = drawIconShape(
      { id: n.authorId, x, y, type: n.type, color: n.color },
      opts.icons,
      log,
    );
    defs.push(...icon.defs);
    nodes.push(
      icon.body + label(n.label, x + ICON_WIDTH / 2, y + ICON_HEIGHT + LABEL_GAP, n.status),
    );
    maxX = Math.max(maxX, x + ICON_WIDTH);
    maxY = Math.max(
      maxY,
      y + ICON_HEIGHT + LABEL_GAP + n.label.split('\n').length * TEXT_LINE_HEIGHT,
    );
  }
  // El canvas sólo crece (como el oráculo); §O51 lo contrae al contenido.
  const w = Math.max(opts.canvas.width ?? CANVAS_WIDTH, maxX + CANVAS_MARGIN);
  const h = Math.max(opts.canvas.height ?? CANVAS_HEIGHT, maxY + CANVAS_MARGIN);
  const raw =
    `<svg xmlns="http://www.w3.org/2000/svg"${attrs({ baseProfile: 'full', height: h, version: '1.1', width: w })} viewBox="0,0,${num(w)},${num(h)}">` +
    `<defs>${defs.join('')}</defs>` +
    edges.join('') +
    nodes.join('') +
    '</svg>';
  return `<?xml version="1.0" encoding="utf-8" ?>\n<!-- ${esc(opts.comment)} -->\n${finalizeSvg(raw)}\n`;
}
