/**
 * A1 congelado como PROPIEDAD: mutar un candidato jamás toca otra escena.
 * Es el bug de `Layout.copy()` superficial del Python (los dicts de conexión
 * compartidos entre candidatos) — aquí no se puede escribir.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  type EdgeId,
  makeScene,
  moveNode,
  type Route,
  type Scene,
  setRoute,
} from '../src/core/model/scene.ts';

const arbScene = fc
  .integer({ min: 1, max: 12 })
  .chain((n) =>
    fc.record({
      n: fc.constant(n),
      xs: fc.array(fc.integer({ min: -500, max: 500 }), { minLength: n, maxLength: n }),
      edges: fc.array(fc.tuple(fc.nat(n - 1), fc.nat(n - 1)), { maxLength: 20 }),
    }),
  )
  .map(({ n, xs, edges }) =>
    makeScene(
      Array.from({ length: n }, (_, i) => ({
        id: `n${i}`,
        authorId: `n${i}`,
        type: 'server',
        label: `N${i}`,
        color: 'gray',
        status: '',
        box: { x: xs[i] ?? 0, y: i * 10, w: 80, h: 50 },
        pinned: false,
        isContainer: false,
      })),
      edges.map(([a, b], i) => ({
        id: `e${i}` as EdgeId,
        from: `n${a}`,
        to: `n${b}`,
        label: null,
        route: null,
      })),
    ),
  );

type Op =
  | { kind: 'move'; node: number; dx: number; dy: number }
  | { kind: 'route'; edge: number; x: number };
const arbOps = fc.array(
  fc.oneof(
    fc.record({
      kind: fc.constant('move' as const),
      node: fc.nat(11),
      dx: fc.integer(),
      dy: fc.integer(),
    }),
    fc.record({ kind: fc.constant('route' as const), edge: fc.nat(19), x: fc.integer() }),
  ),
  { maxLength: 30 },
);

function snapshot(s: Scene): string {
  return JSON.stringify({ nodes: [...s.nodes], edges: [...s.edges] });
}

function apply(s: Scene, ops: readonly Op[]): Scene {
  let c = s;
  for (const op of ops) {
    if (op.kind === 'move') {
      const id = `n${op.node % c.nodes.size}`;
      c = moveNode(c, id, op.dx, op.dy);
    } else if (c.edges.size > 0) {
      const id = `e${op.edge % c.edges.size}` as EdgeId;
      const route: Route = {
        kind: 'straight',
        points: [
          { x: op.x, y: 0 },
          { x: 0, y: op.x },
        ],
      };
      c = setRoute(c, id, route);
    }
  }
  return c;
}

describe('A1 · escena inmutable', () => {
  it('editar un candidato no altera la escena base ni a un candidato hermano', () => {
    fc.assert(
      fc.property(arbScene, arbOps, arbOps, (base, opsA, opsB) => {
        const before = snapshot(base);
        const a = apply(base, opsA);
        const aSnap = snapshot(a);
        apply(base, opsB); // candidato hermano, descartado
        apply(a, opsB); // derivado de a, descartado
        expect(snapshot(base)).toBe(before);
        expect(snapshot(a)).toBe(aSnap);
      }),
      { numRuns: 300 },
    );
  });

  it('los valores están congelados: escribir un campo lanza en modo estricto', () => {
    fc.assert(
      fc.property(arbScene, (s) => {
        const n = [...s.nodes.values()][0];
        if (!n) return;
        expect(() => {
          (n as { label: string }).label = 'x';
        }).toThrow(TypeError);
        expect(() => {
          (n.box as { x: number }).x = 1;
        }).toThrow(TypeError);
        expect(() => {
          (s as { nodes: unknown }).nodes = null;
        }).toThrow(TypeError);
      }),
    );
  });

  it('structural sharing: lo que no cambió es la MISMA referencia (revertir no copia)', () => {
    fc.assert(
      fc.property(arbScene, (s) => {
        const moved = moveNode(s, 'n0', 5, 5);
        expect(moved.edges).toBe(s.edges);
        for (const [id, node] of s.nodes) if (id !== 'n0') expect(moved.nodes.get(id)).toBe(node);
      }),
    );
  });

  it('aristas paralelas a→b tienen ids distintos (en Python colisionaban en "a->b")', () => {
    const s = makeScene(
      [
        {
          id: 'a',
          authorId: 'a',
          status: '',
          type: 'server',
          label: 'A',
          color: 'gray',
          box: { x: 0, y: 0, w: 80, h: 50 },
          pinned: false,
          isContainer: false,
        },
        {
          id: 'b',
          authorId: 'b',
          status: '',
          type: 'server',
          label: 'B',
          color: 'gray',
          box: { x: 200, y: 0, w: 80, h: 50 },
          pinned: false,
          isContainer: false,
        },
      ],
      [
        { id: 'e0', from: 'a', to: 'b', label: 'uno', route: null },
        { id: 'e1', from: 'a', to: 'b', label: 'dos', route: null },
      ],
    );
    expect(s.edges.size).toBe(2);
    const r = setRoute(s, 'e0', {
      kind: 'straight',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });
    expect(r.edges.get('e1')?.route).toBeNull();
  });
});
