/**
 * La escena: el estado completo del diagrama entre pasadas (A1).
 *
 * Reglas que el type-checker y el runtime hacen cumplir:
 * - Todo es `readonly` y los valores están congelados: una pasada no puede
 *   colgar estado ad-hoc de un objeto (el bug de `layout.copy()` del Python).
 * - Cada pasada es `(Scene) => Scene`. Revertir = quedarse con la referencia
 *   anterior; probar→medir→revertir no copia nada que no cambió.
 * - Las aristas tienen `EdgeId` estable por orden de declaración: dos
 *   aristas paralelas a→b son dos ids (en Python colisionaban en "a->b").
 */
import { IMap } from './imap.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export type NodeId = string;
export type EdgeId = `e${number}`;

export interface SceneNode {
  readonly id: NodeId;
  /** id declarado por el autor (texto), para el SVG (`<g id>`, gradientes). */
  readonly authorId: string;
  readonly type: string;
  readonly label: string;
  /** `element.get('color', 'gray')`; null = color inválido declarado. */
  readonly color: string | null;
  readonly status: string;
  readonly box: Box;
  /** Coordenadas declaradas por el autor (compatibilidad heredada, H5). */
  readonly pinned: boolean;
  /** Elemento con `contains`: no es icono (el oráculo lo dibuja por la vía de contenedores). */
  readonly isContainer: boolean;
}

export type Route =
  | { readonly kind: 'straight'; readonly points: readonly Point[] }
  | { readonly kind: 'ortho'; readonly points: readonly Point[] }
  | {
      readonly kind: 'bezier';
      readonly points: readonly Point[];
      readonly control: readonly Point[];
    }
  | { readonly kind: 'arc'; readonly points: readonly Point[]; readonly radius: number }
  | { readonly kind: 'manual'; readonly points: readonly Point[] };

export interface SceneEdge {
  readonly id: EdgeId;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly label: string | null;
  readonly route: Route | null;
}

export interface Scene {
  readonly nodes: IMap<NodeId, SceneNode>;
  readonly edges: IMap<EdgeId, SceneEdge>;
}

export function makeScene(nodes: readonly SceneNode[], edges: readonly SceneEdge[]): Scene {
  return Object.freeze({
    nodes: IMap.of(nodes.map((n) => [n.id, freezeNode(n)] as const)),
    edges: IMap.of(edges.map((e) => [e.id, freezeEdge(e)] as const)),
  });
}

function freezeNode(n: SceneNode): SceneNode {
  Object.freeze(n.box);
  return Object.freeze(n);
}

function freezeEdge(e: SceneEdge): SceneEdge {
  if (e.route) {
    for (const p of e.route.points) Object.freeze(p);
    Object.freeze(e.route.points);
    if (e.route.kind === 'bezier') {
      for (const p of e.route.control) Object.freeze(p);
      Object.freeze(e.route.control);
    }
    Object.freeze(e.route);
  }
  return Object.freeze(e);
}

/** Mueve un nodo (desplazamiento relativo) y devuelve una escena nueva. */
export function moveNode(s: Scene, id: NodeId, dx: number, dy: number): Scene {
  return Object.freeze({
    nodes: s.nodes.update(id, (n) =>
      freezeNode({ ...n, box: { ...n.box, x: n.box.x + dx, y: n.box.y + dy } }),
    ),
    edges: s.edges,
  });
}

/** Asigna la ruta de una arista y devuelve una escena nueva. */
export function setRoute(s: Scene, id: EdgeId, route: Route | null): Scene {
  return Object.freeze({
    nodes: s.nodes,
    edges: s.edges.update(id, (e) => freezeEdge({ ...e, route })),
  });
}

export function center(b: Box): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
