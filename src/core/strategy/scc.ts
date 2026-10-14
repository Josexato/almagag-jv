/** Componentes fuertemente conexas (Tarjan iterativo, orden determinista). */
export function stronglyConnectedComponents(
  ids: readonly string[],
  out: ReadonlyMap<string, readonly string[]>,
): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: string[][] = [];
  let counter = 0;

  for (const root of ids) {
    if (index.has(root)) continue;
    const work: Array<{ v: string; i: number }> = [{ v: root, i: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const frame = work[work.length - 1] as { v: string; i: number };
      const succ = out.get(frame.v) ?? [];
      if (frame.i < succ.length) {
        const w = succ[frame.i] as string;
        frame.i++;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v) as number, index.get(w) as number));
        }
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent) {
        low.set(parent.v, Math.min(low.get(parent.v) as number, low.get(frame.v) as number));
      }
      if (low.get(frame.v) === index.get(frame.v)) {
        const comp: string[] = [];
        let w: string;
        do {
          w = stack.pop() as string;
          onStack.delete(w);
          comp.push(w);
        } while (w !== frame.v);
        result.push(comp);
      }
    }
  }
  return result;
}
