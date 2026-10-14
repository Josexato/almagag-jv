/**
 * almagag-jv — API pública del núcleo. Entrada: string JSON (.sdjf/.gag).
 * Salida: string SVG + bitácora. Sin DOM, sin filesystem (corre en browser).
 */
import { emitTrivialSvg } from './emit/svg.ts';
import { trivialScene } from './layout/trivial.ts';
import { Log, type LogEntry } from './log.ts';
import { normalize } from './normalize/index.ts';
import type { Profile, View } from './strategy/select.ts';
import { ENGINE_NAME, ENGINE_VERSION, REFERENCE_VERSION } from './version.ts';

export { FormatError, type LogEntry, type LogLevel } from './log.ts';
export type { Profile, View } from './strategy/select.ts';
export { ENGINE_NAME, ENGINE_VERSION, REFERENCE_VERSION } from './version.ts';

export interface RenderOptions {
  readonly view?: View;
}

export interface RenderResult {
  readonly svg: string;
  readonly profile: Profile;
  readonly log: readonly LogEntry[];
}

export function render(input: string, opts: RenderOptions = {}): RenderResult {
  const log = new Log();
  const { diagram, profile } = normalize(input, opts.view ?? 'auto', log);
  const scene = trivialScene(diagram, log);
  log.warning(
    `[${profile}] fase 0: colocación trivial en grilla — layout, ruteo y audit ` +
      `no implementados (${scene.nodes.size} nodos, ${scene.edges.size} aristas)`,
  );
  const svg = emitTrivialSvg(
    scene,
    `${ENGINE_NAME} ${ENGINE_VERSION} · referencia AlmaGag Python v${REFERENCE_VERSION} · perfil ${profile}`,
  );
  return { svg, profile, log: log.entries };
}
