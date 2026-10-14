/**
 * Mapa inmutable con orden de inserción estable (determinismo, A5).
 * No expone `set`/`delete`: toda edición devuelve un mapa nuevo y deja el
 * original intacto (A1). Los valores se congelan al entrar.
 */
export class IMap<K, V> implements Iterable<[K, V]> {
  readonly #m: Map<K, V>;

  private constructor(m: Map<K, V>) {
    this.#m = m;
    Object.freeze(this);
  }

  static of<K, V>(entries: Iterable<readonly [K, V]>): IMap<K, V> {
    const m = new Map<K, V>();
    for (const [k, v] of entries) m.set(k, Object.freeze(v));
    return new IMap(m);
  }

  get size(): number {
    return this.#m.size;
  }
  get(k: K): V | undefined {
    return this.#m.get(k);
  }
  has(k: K): boolean {
    return this.#m.has(k);
  }
  keys(): IterableIterator<K> {
    return this.#m.keys();
  }
  values(): IterableIterator<V> {
    return this.#m.values();
  }
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.#m.entries();
  }

  /** Devuelve un mapa nuevo con `k` reemplazado (o agregado al final). */
  with(k: K, v: V): IMap<K, V> {
    const m = new Map(this.#m);
    m.set(k, Object.freeze(v));
    return new IMap(m);
  }

  /** Devuelve un mapa nuevo con `fn` aplicado a la entrada `k`. Lanza si no existe. */
  update(k: K, fn: (v: V) => V): IMap<K, V> {
    const cur = this.#m.get(k);
    if (cur === undefined) throw new RangeError(`IMap.update: clave inexistente ${String(k)}`);
    return this.with(k, fn(cur));
  }
}
