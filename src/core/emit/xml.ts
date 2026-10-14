/** Utilidades del emisor de strings SVG (reemplazo de svgwrite). */

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

/** Número a 2 decimales sin ceros de cola (Python emitía `162.00000000000512`). */
export function num(n: number): string {
  if (!Number.isFinite(n)) throw new RangeError(`emisor: coordenada no finita ${n}`);
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

export function attrs(a: Readonly<Record<string, string | number>>): string {
  return Object.entries(a)
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? num(v) : esc(v)}"`)
    .join('');
}
