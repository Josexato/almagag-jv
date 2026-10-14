/** Plantillas de iconos builtin (datos extraídos del oráculo, A5). */
import { esc, num } from '../emit/xml.ts';

export type Part =
  | string
  | { readonly n: number }
  | { readonly x: number }
  | { readonly y: number }
  | { readonly c: 'base' | 'grad' | 'id' }
  | { readonly c: 'light'; readonly f: number };

export interface TemplateNode {
  readonly tag: string;
  readonly attrs: ReadonlyArray<readonly [string, readonly Part[]]>;
  readonly children: readonly TemplateNode[];
  readonly text?: string;
}

export interface IconTemplate {
  readonly gradient: boolean;
  readonly body: readonly TemplateNode[];
}

export interface Paint {
  readonly id: string;
  readonly base: string;
  readonly light: (f: number) => string;
}

/** Constantes con su repr exacto (no se redondean: hay matrices de 7 decimales). */
const exact = (v: number) => (Object.is(v, -0) ? '0' : String(v));

function attrValue(parts: readonly Part[], x: number, y: number, paint: Paint): string {
  let s = '';
  for (const p of parts) {
    if (typeof p === 'string') s += p;
    else if ('n' in p) s += exact(p.n);
    else if ('x' in p) s += num(p.x + x);
    else if ('y' in p) s += num(p.y + y);
    else if (p.c === 'base') s += paint.base;
    else if (p.c === 'grad') s += `url(#gradient-${paint.id})`;
    else if (p.c === 'id') s += paint.id;
    else if (p.c === 'light') s += paint.light(p.f);
  }
  return s;
}

export function renderTemplate(
  nodes: readonly TemplateNode[],
  x: number,
  y: number,
  paint: Paint,
): string {
  return nodes
    .map((n) => {
      const a = n.attrs
        .map(([k, parts]) => ` ${k}="${esc(attrValue(parts, x, y, paint))}"`)
        .join('');
      const inner = (n.text ? esc(n.text) : '') + renderTemplate(n.children, x, y, paint);
      return inner ? `<${n.tag}${a}>${inner}</${n.tag}>` : `<${n.tag}${a}/>`;
    })
    .join('');
}
