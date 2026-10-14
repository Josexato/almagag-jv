/**
 * Post-proceso único de emisión — port de draw/primitives/svg.py::finalize_svg
 * y viewbox.py del oráculo v3.20.0:
 *   §O51 recorte de viewBox/width/height al bbox de lo dibujado + 40, SÓLO
 *        contrae, leyendas `ag-bottom-anchored` re-ancladas al borde inferior;
 *   §O50 halo de texto portable: copia con trazo blanco ANTES de cada <text>.
 * Verificado contra el finalize_svg REAL (golden/finalize-v3.20.0.json).
 */
import { parseXml, serializeXml, type XmlElement, type XmlNode } from '../xml/xml.ts';

interface MEl {
  tag: string;
  attrs: Array<[string, string]>;
  children: Array<MEl | string>;
}

const toM = (e: XmlElement): MEl => ({
  tag: e.tag,
  attrs: e.attrs.map(([k, v]) => [k, v]),
  children: e.children.map((c) => (typeof c === 'string' ? c : toM(c))),
});
const fromM = (e: MEl): XmlElement => ({
  tag: e.tag,
  attrs: e.attrs,
  children: e.children.map((c): XmlNode => (typeof c === 'string' ? c : fromM(c))),
});
const get = (e: MEl, k: string): string | undefined => e.attrs.find(([n]) => n === k)?.[1];
function set(e: MEl, k: string, v: string): void {
  const a = e.attrs.find(([n]) => n === k);
  if (a) a[1] = v;
  else e.attrs.push([k, v]);
}
const local = (tag: string) => tag.replace(/^.*:/, '');

export const CROP_MARGIN = 40;
export const BOTTOM_ANCHORED_CLASS = 'ag-bottom-anchored';
const CHAR_W = 0.62;
const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const nums = (s: string): number[] => (s.match(NUM) ?? []).map(Number);

/** float() de Python sobre un atributo. null = ValueError. */
function pyFloat(s: string | undefined, dflt: number): number | null {
  if (s === undefined) return dflt;
  const t = s.trim().replace(/(?<=\d)_(?=\d)/g, '');
  if (/^[-+]?(inf|infinity)$/i.test(t)) return t.startsWith('-') ? -Infinity : Infinity;
  if (/^[-+]?nan$/i.test(t)) return Number.NaN;
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(t)) return null;
  return Number(t);
}

type M6 = [number, number, number, number, number, number];
const ID: M6 = [1, 0, 0, 1, 0, 0];
function mul(m: M6, n: M6): M6 {
  const [ma, mb, mc, md, me, mf] = m;
  const [na, nb, nc, nd, ne, nf] = n;
  return [
    ma * na + mc * nb,
    mb * na + md * nb,
    ma * nc + mc * nd,
    mb * nc + md * nd,
    ma * ne + mc * nf + me,
    mb * ne + md * nf + mf,
  ];
}
const apply = (m: M6, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];
const rad = (d: number) => (d * Math.PI) / 180;

export function parseTransform(s: string | undefined): M6 {
  let m = ID;
  for (const [, name, args] of (s ?? '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = nums(args as string);
    let t: M6 | null = null;
    if (name === 'translate') t = [1, 0, 0, 1, v[0] as number, v.length > 1 ? (v[1] as number) : 0];
    else if (name === 'scale')
      t = [v[0] as number, 0, 0, v.length > 1 ? (v[1] as number) : (v[0] as number), 0, 0];
    else if (name === 'rotate') {
      const a = rad(v[0] as number);
      t = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
      if (v.length === 3)
        t = mul(mul([1, 0, 0, 1, v[1] as number, v[2] as number], t), [
          1,
          0,
          0,
          1,
          -(v[1] as number),
          -(v[2] as number),
        ]);
    } else if (name === 'matrix' && v.length === 6) t = v as M6;
    else if (name === 'skewX') t = [1, 0, Math.tan(rad(v[0] as number)), 1, 0, 0];
    else if (name === 'skewY') t = [1, Math.tan(rad(v[0] as number)), 0, 1, 0, 0];
    if (t) m = mul(m, t);
  }
  return m;
}

function arcPoints(
  p0: [number, number],
  rx0: number,
  ry0: number,
  rot: number,
  large: boolean,
  sweep: boolean,
  p1: [number, number],
  samples = 16,
): Array<[number, number]> {
  const [x0, y0] = p0;
  const [x1, y1] = p1;
  let rx = Math.abs(rx0);
  let ry = Math.abs(ry0);
  if (rx === 0 || ry === 0 || (x0 === x1 && y0 === y1)) return [p1];
  const phi = rad(((rot % 360) + 360) % 360);
  const cosp = Math.cos(phi);
  const sinp = Math.sin(phi);
  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;
  const x1p = cosp * dx + sinp * dy;
  const y1p = -sinp * dx + cosp * dy;
  const lam = (x1p / rx) ** 2 + (y1p / ry) ** 2;
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = den ? Math.sqrt(Math.max(0, num / den)) : 0;
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cosp * cxp - sinp * cyp + (x0 + x1) / 2;
  const cy = sinp * cxp + cosp * cyp + (y0 + y1) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const norm = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const a = Math.acos(Math.max(-1, Math.min(1, dot / norm)));
    return ux * vy - uy * vx < 0 ? -a : a;
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
  else if (sweep && dtheta < 0) dtheta += 2 * Math.PI;
  const pts: Array<[number, number]> = [];
  for (let k = 0; k <= samples; k++) {
    const t = theta1 + (dtheta * k) / samples;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    pts.push([cosp * ex - sinp * ey + cx, sinp * ex + cosp * ey + cy]);
  }
  return pts;
}

function pathPoints(d: string): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  let cur: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const v = nums(args as string);
    const rel = cmd === (cmd as string).toLowerCase();
    let c = (cmd as string).toUpperCase();
    if (c === 'Z') {
      cur = start;
      continue;
    }
    const pt = (dx: number, dy: number): [number, number] =>
      rel ? [cur[0] + dx, cur[1] + dy] : [dx, dy];
    let i = 0;
    // Path truncado (faltan argumentos): el oráculo revienta con IndexError
    // (_element_corners sólo atrapa TypeError/ValueError). Aquí se mide lo
    // leído hasta ese punto y se sigue: igual o mejor.
    const at = (k: number) => {
      if (k >= v.length) throw new RangeError('IndexError');
      return v[k] as number;
    };
    try {
      while (i < v.length) {
        if (c === 'M') {
          cur = pt(at(i), at(i + 1));
          i += 2;
          start = cur;
          pts.push(cur);
          c = 'L';
        } else if (c === 'L' || c === 'T') {
          cur = pt(at(i), at(i + 1));
          i += 2;
          pts.push(cur);
        } else if (c === 'H') {
          cur = [rel ? cur[0] + at(i) : at(i), cur[1]];
          i += 1;
          pts.push(cur);
        } else if (c === 'V') {
          cur = [cur[0], rel ? cur[1] + at(i) : at(i)];
          i += 1;
          pts.push(cur);
        } else if (c === 'C') {
          pts.push(pt(at(i), at(i + 1)));
          pts.push(pt(at(i + 2), at(i + 3)));
          cur = pt(at(i + 4), at(i + 5));
          i += 6;
          pts.push(cur);
        } else if (c === 'S' || c === 'Q') {
          pts.push(pt(at(i), at(i + 1)));
          cur = pt(at(i + 2), at(i + 3));
          i += 4;
          pts.push(cur);
        } else if (c === 'A') {
          const end = pt(at(i + 5), at(i + 6));
          pts.push(
            ...arcPoints(
              cur,
              at(i),
              at(i + 1),
              at(i + 2),
              Boolean(at(i + 3)),
              Boolean(at(i + 4)),
              end,
            ),
          );
          cur = end;
          i += 7;
        } else break;
      }
    } catch (e) {
      if (e instanceof RangeError) return pts;
      throw e;
    }
  }
  return pts;
}

/** ''.join(elem.itertext()) */
function itertext(e: MEl): string {
  return e.children.map((c) => (typeof c === 'string' ? c : itertext(c))).join('');
}

function textCorners(e: MEl): Array<[number, number]> {
  const x = pyFloat(get(e, 'x'), 0);
  const y = pyFloat(get(e, 'y'), 0);
  if (x === null || y === null) return [];
  let fs = pyFloat((get(e, 'font-size') ?? '14').split('px').join(''), 14);
  if (fs === null) fs = 14;
  const w = [...itertext(e)].length * fs * CHAR_W;
  const anchor = get(e, 'text-anchor') ?? 'start';
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return [
    [x0, y - fs],
    [x0 + w, y - fs],
    [x0, y + fs * 0.25],
    [x0 + w, y + fs * 0.25],
  ];
}

function elementCorners(e: MEl): Array<[number, number]> {
  const tag = local(e.tag);
  const f = (k: string) => {
    const v = pyFloat(get(e, k), 0);
    if (v === null) throw new TypeError('ValueError');
    return v;
  };
  try {
    if (tag === 'rect' || tag === 'image') {
      const x = f('x');
      const y = f('y');
      return [
        [x, y],
        [x + f('width'), y + f('height')],
      ];
    }
    if (tag === 'circle') {
      const cx = f('cx');
      const cy = f('cy');
      const r = f('r');
      return [
        [cx - r, cy - r],
        [cx + r, cy + r],
      ];
    }
    if (tag === 'ellipse') {
      const cx = f('cx');
      const cy = f('cy');
      const rx = f('rx');
      const ry = f('ry');
      return [
        [cx - rx, cy - ry],
        [cx + rx, cy + ry],
      ];
    }
    if (tag === 'line')
      return [
        [f('x1'), f('y1')],
        [f('x2'), f('y2')],
      ];
    if (tag === 'polyline' || tag === 'polygon') {
      const v = nums(get(e, 'points') ?? '');
      const out: Array<[number, number]> = [];
      for (let i = 0; i + 1 < v.length; i += 2) out.push([v[i] as number, v[i + 1] as number]);
      return out;
    }
    if (tag === 'path') return pathPoints(get(e, 'd') ?? '');
    if (tag === 'text') return textCorners(e);
  } catch (err) {
    if (err instanceof TypeError) return [];
    throw err;
  }
  return [];
}

const SKIP_TAGS = new Set([
  'defs',
  'title',
  'desc',
  'metadata',
  'style',
  'marker',
  'linearGradient',
  'radialGradient',
  'filter',
  'clipPath',
  'mask',
  'symbol',
  'pattern',
]);

function walkBbox(e: MEl, ctm: M6, b: number[], skip: ReadonlySet<string>): void {
  if (SKIP_TAGS.has(local(e.tag))) return;
  const classes = (get(e, 'class') ?? '').split(/\s+/).filter(Boolean);
  if (classes.some((c) => skip.has(c))) return;
  const tr = get(e, 'transform');
  const m = tr ? mul(ctm, parseTransform(tr)) : ctm;
  for (const [x, y] of elementCorners(e)) {
    const [tx, ty] = apply(m, x, y);
    b[0] = Math.min(b[0] as number, tx);
    b[1] = Math.min(b[1] as number, ty);
    b[2] = Math.max(b[2] as number, tx);
    b[3] = Math.max(b[3] as number, ty);
  }
  for (const c of e.children) if (typeof c !== 'string') walkBbox(c, m, b, skip);
}

function contentBbox(
  root: MEl,
  skip: ReadonlySet<string> = new Set(),
): [number, number, number, number] | null {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  walkBbox(root, ID, b, skip);
  if (b[0] === Infinity || (b[0] as number) > (b[2] as number)) return null;
  return b as [number, number, number, number];
}

/** _fmt del oráculo: entero si lo es, si no 1 decimal ('%.1f'). */
export function fmt1(x: number): string {
  if (Number.isInteger(x)) return String(x);
  return pyFixed1(x);
}

/**
 * f'{x:.1f}' de Python: redondeo del valor binario EXACTO con empates al par.
 * Se opera sobre la expansión decimal exacta (toFixed(100)); multiplicar
 * x*10 en coma flotante fabrica empates falsos (495.45000000000005 → 4954.5).
 */
export function pyFixed1(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const neg = x < 0 || Object.is(x, -0);
  const [ip, fp] = Math.abs(x).toFixed(100).split('.') as [string, string];
  const d = Number(fp[0]);
  const rest = fp.slice(1);
  const first = rest[0] ?? '0';
  const tail = rest.slice(1);
  let up: boolean;
  if (first > '5') up = true;
  else if (first < '5') up = false;
  else if (/[1-9]/.test(tail)) up = true;
  else up = d % 2 === 1; // empate exacto → al par
  let intDigits = ip;
  let frac = d;
  if (up) {
    frac++;
    if (frac === 10) {
      frac = 0;
      intDigits = (BigInt(intDigits) + 1n).toString();
    }
  }
  return `${neg ? '-' : ''}${intDigits}.${frac}`;
}

function iterG(e: MEl, out: MEl[]): MEl[] {
  if (local(e.tag) === 'g') out.push(e);
  for (const c of e.children) if (typeof c !== 'string') iterG(c, out);
  return out;
}

export function cropViewbox(root: MEl, margin = CROP_MARGIN): boolean {
  const vb = get(root, 'viewBox') ?? get(root, 'viewbox');
  let vx: number;
  let vy: number;
  let vw: number;
  let vh: number;
  if (vb) {
    const v = nums(vb);
    if (v.length !== 4) return false;
    [vx, vy, vw, vh] = v as [number, number, number, number];
  } else {
    vx = 0;
    vy = 0;
    const w = pyFloat((get(root, 'width') ?? '0').split('px').join(''), 0);
    const h = pyFloat((get(root, 'height') ?? '0').split('px').join(''), 0);
    if (w === null || h === null) return false;
    vw = w;
    vh = h;
  }
  if (vw <= 0 || vh <= 0) return false;
  const bbox = contentBbox(root, new Set([BOTTOM_ANCHORED_CLASS]));
  if (!bbox) return false;
  let [minx, miny, maxx, maxy] = bbox;
  const legends = iterG(root, []).filter((g) =>
    (get(g, 'class') ?? '').split(/\s+/).includes(BOTTOM_ANCHORED_CLASS),
  );
  for (const g of legends) {
    const sub = contentBbox(g);
    if (sub) {
      minx = Math.min(minx, sub[0]);
      maxx = Math.max(maxx, sub[2]);
    }
  }
  const x0 = Math.max(vx, minx - margin);
  const y0 = Math.max(vy, miny - margin);
  const x1 = Math.min(vx + vw, maxx + margin);
  let y1 = Math.min(vy + vh, maxy + margin);
  if (legends.length) {
    let distMax = 0;
    for (const g of legends) {
      const sub = contentBbox(g);
      if (sub) distMax = Math.max(distMax, vy + vh - sub[1]);
    }
    if (distMax) y1 = Math.min(vy + vh, Math.max(y1, maxy + 12 + distMax));
  }
  if (x1 - x0 >= vw && y1 - y0 >= vh) return false;
  if (x1 <= x0 || y1 <= y0) return false;
  set(root, 'viewBox', `${fmt1(x0)},${fmt1(y0)},${fmt1(x1 - x0)},${fmt1(y1 - y0)}`);
  root.attrs = root.attrs.filter(([k]) => k !== 'viewbox');
  set(root, 'width', fmt1(x1 - x0));
  set(root, 'height', fmt1(y1 - y0));
  const dx = x0 - vx;
  const dy = y1 - (vy + vh);
  for (const g of legends) if (dx || dy) set(g, 'transform', `translate(${fmt1(dx)},${fmt1(dy)})`);
  return true;
}

export const TEXT_HALO_ATTRS: ReadonlyArray<readonly [string, string]> = [
  ['class', 'ag-text-halo'],
  ['stroke', '#ffffff'],
  ['stroke-width', '3'],
  ['stroke-linejoin', 'round'],
  ['stroke-linecap', 'round'],
  ['fill', '#ffffff'],
];

const clone = (e: MEl): MEl => ({
  tag: e.tag,
  attrs: e.attrs.map(([k, v]) => [k, v]),
  children: e.children.map((c) => (typeof c === 'string' ? c : clone(c))),
});

function allElements(e: MEl, out: MEl[]): MEl[] {
  out.push(e);
  for (const c of e.children) if (typeof c !== 'string') allElements(c, out);
  return out;
}

/** §O50: copia con halo blanco inmediatamente ANTES de cada <text> (no dentro de defs/text). */
export function injectTextHalos(root: MEl): void {
  for (const parent of allElements(root, [])) {
    const t = local(parent.tag);
    if (t === 'defs' || t === 'text') continue;
    for (let i = parent.children.length - 1; i >= 0; i--) {
      const child = parent.children[i];
      if (child === undefined || typeof child === 'string' || local(child.tag) !== 'text') continue;
      const halo = clone(child);
      halo.attrs = halo.attrs.filter(([k]) => k !== 'id');
      for (const [k, v] of TEXT_HALO_ATTRS) set(halo, k, v);
      parent.children.splice(i, 0, halo);
    }
  }
}

/** Post-proceso de emisión: §O51 y luego §O50 (mismo orden que el oráculo). */
export function finalizeSvg(svg: string): string {
  const root = toM(parseXml(svg));
  cropViewbox(root);
  injectTextHalos(root);
  return serializeXml(fromM(root));
}
