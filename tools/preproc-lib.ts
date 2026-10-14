/**
 * Comparación de mensajes con el oráculo. Etiquetas con compuerta en la fase
 * actual: lo implementado. Las líneas `[jv]` son diagnósticos SÓLO del motor
 * TS (donde el oráculo calla o revienta): no entran a la igualdad, se cuentan.
 */
export interface PreprocRow {
  name: string;
  origin: string;
  input?: string;
  outcome: 'ok' | 'excepcion' | 'sin corte' | 'rechazado';
  exception?: string;
  exception_msg?: string;
  log: string[];
  motor?: 'auto' | 'hier';
  normalized?: string;
  /** Desenlace de la corrida COMPLETA (sin corte) del oráculo. */
  full_outcome?: 'ok' | 'excepcion';
  full_exception?: string;
}

/** Prefijos de mensaje con compuerta (fase 1). */
export const GATED: readonly RegExp[] = [
  /^(INFO|WARNING)\|\[schema\] /,
  /^(INFO|WARNING)\|\[formato\] /,
  /^INFO\|§H7: /,
  /^INFO\|§O57: /,
  /^WARNING\|§Q63 /,
  /^(INFO|WARNING)\|§O53: /,
  /^INFO\|Layout template '.*' omitido: /,
  /^WARNING\|Layout template '.*' desconocido/,
  /^INFO\|\d+ icono\(s\) SVG embebido\(s\) detectado\(s\)$/,
  /^INFO\|§Q64: /,
];

export const isGated = (line: string): boolean => GATED.some((re) => re.test(line));

export function compareTagged(
  py: readonly string[],
  ts: readonly string[],
): { ok: true } | { ok: false; py: string[]; ts: string[] } {
  const a = py.filter(isGated);
  const b = ts.filter(isGated);
  if (a.length === b.length && a.every((l, i) => l === b[i])) return { ok: true };
  return { ok: false, py: a, ts: b };
}
