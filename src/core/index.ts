/**
 * almagag-jv — API pública del núcleo. Entrada: string JSON (.sdjf/.gag).
 * Salida: string SVG + bitácora. Sin DOM, sin filesystem (corre en browser).
 */
import { emitSvg } from './emit/svg.ts';
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
  const { diagram, profile, icons, doc } = normalize(input, opts.view ?? 'auto', log);
  const scene = trivialScene(diagram, log);
  const containers = diagram.elements.filter((e) => e.isContainer).length;
  if (containers) {
    log.warning(
      `[jv] fase 1: ${containers} contenedor(es) como caja provisional — su dibujo llega en la fase 4`,
    );
  }
  log.warning(
    `[${profile}] fase 1: colocación trivial en grilla — layout, ruteo y audit ` +
      `no implementados (${scene.nodes.size} nodos, ${scene.edges.size} aristas)`,
  );
  const canvas = doc.get('canvas');
  const dim = (k: string) => {
    const v = canvas instanceof Map ? canvas.get(k) : undefined;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  };
  const svg = emitSvg(
    scene,
    {
      comment: `${ENGINE_NAME} ${ENGINE_VERSION} · referencia AlmaGag Python v${REFERENCE_VERSION} · perfil ${profile}`,
      canvas: { width: dim('width'), height: dim('height') },
      icons,
    },
    log,
  );
  return { svg, profile, log: log.entries };
}
