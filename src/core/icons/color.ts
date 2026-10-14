/**
 * Port exacto de color_to_rgb / adjust_lightness / rgb_to_hex del oráculo
 * (draw/icons/__init__.py). Sólo 20 nombres CSS: cualquier otro nombre cae a
 * #808080 en el cálculo de tonos (comportamiento del oráculo, no de CSS).
 * Donde el oráculo revienta (hex inválido), se devuelve null y el llamador
 * nombra el problema.
 */
import { pyLower } from '../normalize/py.ts';

export const CSS_COLORS: Readonly<Record<string, string>> = {
  lightgreen: '#90EE90',
  gold: '#FFD700',
  tomato: '#FF6347',
  lightblue: '#ADD8E6',
  gray: '#808080',
  grey: '#808080',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  cyan: '#00FFFF',
  white: '#FFFFFF',
  black: '#000000',
  silver: '#C0C0C0',
  lime: '#00FF00',
  lavender: '#E6E6FA',
  lightyellow: '#FFFFE0',
};

/** int(s, 16) de Python (espacios alrededor y signo permitidos). null = ValueError. */
function pyInt16(s: string): number | null {
  const t = s.trim();
  if (!/^[-+]?[0-9a-fA-F]+$/.test(t)) return null;
  return Number.parseInt(t, 16);
}

export function colorToRgb(color: string): [number, number, number] | null {
  if (color.startsWith('#')) {
    let hex = color.replace(/^#+/, '');
    if ([...hex].length === 3) hex = [...hex].map((c) => c + c).join('');
    const cps = [...hex];
    const parts = [0, 2, 4].map((i) => pyInt16(cps.slice(i, i + 2).join('')));
    if (parts.some((p) => p === null)) return null;
    return parts as [number, number, number];
  }
  return colorToRgb(CSS_COLORS[pyLower(color)] ?? '#808080');
}

/** f'{n:02x}' de Python (el signo cuenta en el ancho). */
function hex2(n: number): string {
  const d = Math.abs(n).toString(16);
  const sign = n < 0 ? '-' : '';
  return sign + d.padStart(Math.max(0, 2 - sign.length), '0');
}

export function adjustLightness(color: string, factor: number): string | null {
  const rgb = colorToRgb(color);
  if (!rgb) return null;
  let [r, g, b] = rgb;
  if (factor > 1) {
    r = Math.trunc(r + (255 - r) * (factor - 1));
    g = Math.trunc(g + (255 - g) * (factor - 1));
    b = Math.trunc(b + (255 - b) * (factor - 1));
  } else {
    r = Math.trunc(r * factor);
    g = Math.trunc(g * factor);
    b = Math.trunc(b * factor);
  }
  return `#${hex2(Math.min(255, r))}${hex2(Math.min(255, g))}${hex2(Math.min(255, b))}`;
}
