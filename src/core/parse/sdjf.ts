/**
 * Lectura del SDJF (.sdjf/.gag). Fase 0: sólo la forma mínima tipada que
 * necesitan `select_strategy` y el emisor trivial; el resto del documento
 * viaja intacto en `raw` hasta que la fase 1 lo normalice con el «schema
 * que habla».
 */
import { FormatError } from '../log.ts';

export interface RawElement {
  readonly id: string;
  readonly type?: string;
  readonly label?: string;
  readonly x?: number;
  readonly y?: number;
  readonly contains?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface RawConnection {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly [key: string]: unknown;
}

export interface Diagram {
  readonly elements: readonly RawElement[];
  readonly connections: readonly RawConnection[];
  readonly raw: Readonly<Record<string, unknown>>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseDiagram(input: string): Diagram {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    throw new FormatError(`[formato] JSON inválido: ${(e as Error).message}`);
  }
  if (!isRecord(data)) {
    throw new FormatError('[formato] la raíz del documento debe ser un objeto JSON');
  }
  // Guarda de migración que ENSEÑA (Python generator.py, v3.9).
  if ('flows' in data) {
    throw new FormatError(
      "[formato] 'flows' se renombró a 'journeys' en v3.9 — misma estructura " +
        '({id, label, color, path}); sólo cambia la clave',
    );
  }
  const els = data['elements'];
  if (!Array.isArray(els)) {
    throw new FormatError("[formato] falta 'elements' (lista de nodos)");
  }
  const elements = els.map((e, i): RawElement => {
    if (!isRecord(e) || typeof e['id'] !== 'string') {
      throw new FormatError(`[formato] elements[${i}] sin 'id' de texto`);
    }
    return e as RawElement;
  });
  const conns = data['connections'] ?? [];
  if (!Array.isArray(conns)) {
    throw new FormatError("[formato] 'connections' debe ser una lista");
  }
  const connections = conns.map((c, i): RawConnection => {
    if (!isRecord(c) || typeof c['from'] !== 'string' || typeof c['to'] !== 'string') {
      throw new FormatError(`[formato] connections[${i}] sin 'from'/'to' de texto`);
    }
    return c as RawConnection;
  });
  return { elements, connections, raw: data };
}
