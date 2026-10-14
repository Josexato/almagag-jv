/**
 * Resolución y dibujo de la FORMA de un icono (draw_icon_shape del oráculo),
 * con su precedencia exacta:
 *   1. embebido (`icons{}` del archivo), también para 'union'
 *   2. 'union' → barra §H7 rotulada (BUGS-DRAW-006)
 *   3. alias §O55 (inet/wan/internet → cloud) que esté embebido
 *   4. builtin (plantillas extraídas del oráculo, A5)
 *   5. BWT rotulado con el type + WARNING §O55 (nunca forma muda)
 * Mejoras nombradas `[jv]`: `type: "bwt"` declarado se dibuja (el oráculo
 * revienta, PY-011); embebido inválido cae a BWT con aviso (el oráculo revienta).
 */
import { FONT_SIZE_ZONE, FONT_WEIGHT_ZONE, ICON_HEIGHT, ICON_WIDTH } from '../config.ts';
import { attrs, esc, num } from '../emit/xml.ts';
import type { Log } from '../log.ts';
import { pySorted } from '../normalize/py.ts';
import { attr, parseXml, serializeXml, XmlError } from '../xml/xml.ts';
import { BUILTIN_ICONS } from './builtin.generated.ts';
import { adjustLightness } from './color.ts';
import { renderTemplate } from './template.ts';

export const ICON_TYPE_ALIASES: Readonly<Record<string, string>> = {
  inet: 'cloud',
  wan: 'cloud',
  internet: 'cloud',
};

/** Módulos de icono que existen en el oráculo (find_spec ≠ None). */
const MODULES = new Set([...Object.keys(BUILTIN_ICONS)]);

export interface IconInput {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly type: string;
  /** `element.get('color', 'gray')`: null si el elemento trae color: null. */
  readonly color: string | null;
}

export interface IconOutput {
  readonly defs: readonly string[];
  readonly body: string;
  readonly kind: 'embedded' | 'union' | 'builtin' | 'bwt';
}

export type Embedded = ReadonlyMap<string, string>;
/** Nombres embebidos para el inventario §Q64 (`t in embedded`). */
export type EmbeddedNames = ReadonlySet<string> | null;

/** f-string de Python de un número en transform (float: 2.0 → «2.0»). */
const pyNum = (v: number) => (Number.isInteger(v) ? `${v}.0` : String(v));

function bwtGlyph(x: number, y: number): string {
  return renderTemplate((BUILTIN_ICONS['bwt'] as (typeof BUILTIN_ICONS)[string]).body, x, y, {
    id: '',
    base: '',
    light: () => '',
  });
}

function bwtLabel(type: string, x: number, y: number): string {
  return `<text${attrs({
    fill: '#8a1c1c',
    'font-family': "'JetBrains Mono', monospace",
    'font-size': `${FONT_SIZE_ZONE}px`,
    'font-weight': FONT_WEIGHT_ZONE,
    'text-anchor': 'middle',
    x: x + ICON_WIDTH / 2,
    y: y - 5,
  })}>${esc(type)}</text>`;
}

function embedded(el: IconInput, svg: string, log: Log): IconOutput | null {
  let wrapped = svg.trim();
  const color = el.color;
  if (color && wrapped.includes('currentColor'))
    wrapped = wrapped.split('currentColor').join(color);
  try {
    if (wrapped.startsWith('<svg')) {
      const root = parseXml(wrapped);
      const vb = (attr(root, 'viewBox') ?? `0 0 ${ICON_WIDTH} ${ICON_HEIGHT}`)
        .trim()
        .split(/[\s,]+/);
      const w = Number(vb[2]);
      const h = Number(vb[3]);
      if (!(w > 0) || !(h > 0)) throw new XmlError(`viewBox inválido '${attr(root, 'viewBox')}'`);
      const scale = Math.min(ICON_WIDTH / w, ICON_HEIGHT / h);
      const inner = root.children.map(serializeXml).join('');
      return {
        defs: [],
        body: `<g${attrs({ id: el.id, transform: `translate(${num(el.x)},${num(el.y)}) scale(${pyNum(scale)})` })}>${inner}</g>`,
        kind: 'embedded',
      };
    }
    // Fragmento: va dentro de <g translate> sin escala; se valida como XML.
    const g = parseXml(`<g>${wrapped}</g>`);
    return {
      defs: [],
      body: `<g${attrs({ id: el.id, transform: `translate(${num(el.x)},${num(el.y)})` })}>${g.children.map(serializeXml).join('')}</g>`,
      kind: 'embedded',
    };
  } catch (e) {
    if (!(e instanceof XmlError)) throw e;
    log.warning(
      `[jv] icono embebido '${el.type}' de '${el.id}' inválido (${e.message}) — se dibuja el BWT (el oráculo revienta)`,
    );
    return null;
  }
}

export function drawIconShape(el: IconInput, emb: Embedded | null, log: Log): IconOutput {
  const { x, y, type } = el;
  const color = el.color;
  if (emb?.has(type)) {
    const out = embedded(el, emb.get(type) as string, log);
    if (out) return out;
    return { defs: [], body: bwtGlyph(x, y) + bwtLabel(type, x, y), kind: 'bwt' };
  }
  if (type === 'union') {
    const cx = x + ICON_WIDTH / 2;
    const cy = y + ICON_HEIGHT / 2;
    const bw = ICON_WIDTH * 0.7;
    const bh = 8;
    return {
      defs: [],
      body:
        `<rect${attrs({ fill: color && color !== 'gray' ? color : '#5a5a5a', height: bh, rx: 4, ry: 4, stroke: '#333', 'stroke-width': 1, width: bw, x: cx - bw / 2, y: cy - bh / 2 })}/>` +
        `<text${attrs({ fill: '#6b6558', 'font-family': 'Arial, sans-serif', 'font-size': `${FONT_SIZE_ZONE}px`, 'text-anchor': 'middle', x: cx, y: cy + bh / 2 + 13 })}>union</text>`,
      kind: 'union',
    };
  }
  const resolved = ICON_TYPE_ALIASES[type] ?? type;
  if (resolved !== type && emb?.has(resolved)) {
    const out = embedded({ ...el, type: resolved }, emb.get(resolved) as string, log);
    if (out) return out;
  }
  const tpl = resolved === 'bwt' ? undefined : BUILTIN_ICONS[resolved];
  if (tpl) {
    const base = color ?? 'None';
    const lightCache = new Map<number, string>();
    let bad = false;
    const light = (f: number) => {
      let v = lightCache.get(f);
      if (v === undefined) {
        const r = adjustLightness(base, f);
        if (r === null) bad = true;
        v = r ?? '#808080';
        lightCache.set(f, v);
      }
      return v;
    };
    const body = renderTemplate(tpl.body, x, y, { id: el.id, base, light });
    const defs = tpl.gradient
      ? [
          `<linearGradient${attrs({ id: `gradient-${el.id}`, x1: '0%', x2: '0%', y1: '0%', y2: '100%' })}>` +
            `<stop${attrs({ offset: '0%', 'stop-color': light(1.3) })}/>` +
            `<stop${attrs({ offset: '100%', 'stop-color': light(0.7) })}/></linearGradient>`,
        ]
      : [];
    if (bad || color === null) {
      log.warning(
        `[jv] color ${color === null ? 'null' : `'${color}'`} de '${el.id}' no es un color válido para los tonos — ` +
          'se usa gris (el oráculo revienta)',
      );
    }
    return { defs, body, kind: 'builtin' };
  }
  if (resolved === 'bwt') {
    log.warning(
      `[jv] type 'bwt' declarado en '${el.id}': se dibuja el BWT (el oráculo revienta, PY-011)`,
    );
    return { defs: [], body: bwtGlyph(x, y) + bwtLabel(type, x, y), kind: 'bwt' };
  }
  const missing = resolved.includes('.') ? resolved.split('.')[0] : resolved;
  log.warning(
    `§O55: type '${type}' sin icono registrado — se dibuja el BWT por defecto. ` +
      `Error: No module named 'AlmaGag.draw.icons.${missing}'`,
  );
  return { defs: [], body: bwtGlyph(x, y) + bwtLabel(type, x, y), kind: 'bwt' };
}

/** §Q64: types que caerán al BWT (sin módulo, alias ni embebido). Orden de sorted(). */
export function unresolvedIconTypes(
  elements: ReadonlyArray<{ readonly type: string; readonly isContainer: boolean }>,
  emb: EmbeddedNames,
): string[] {
  const out = new Set<string>();
  for (const e of elements) {
    if (e.type === 'union' || e.isContainer) continue;
    if (emb?.has(e.type)) continue;
    const r = ICON_TYPE_ALIASES[e.type] ?? e.type;
    if (emb?.has(r)) continue;
    if (!MODULES.has(r) && r !== 'bwt') out.add(e.type);
  }
  return pySorted(out);
}
