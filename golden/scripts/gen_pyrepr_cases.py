#!/usr/bin/env python3
"""Golden diferencial de json.loads + repr() de CPython.

Genera documentos JSON aleatorios (semilla fija) con los casos que importan
para los mensajes del schema que habla: int vs float, exponentes, -0.0,
enteros grandes, NaN/Infinity, comillas y escapes en strings, anidamiento.
Para cada documento guarda repr(json.loads(doc)) o el error. El motor TS
debe reproducir exactamente el repr (pyrepr.ts) y aceptar/rechazar igual.

    python golden/scripts/gen_pyrepr_cases.py > golden/pyrepr-cases.json
"""
import json
import math
import random
import sys

rng = random.Random(20261014)
FLOATS = [0.0, -0.0, 1.0, 2.0, 0.1, 0.5, 1e-05, 0.0001, 123456789012345.0, 1e16, 1e+20,
          1.5e-7, 3.141592653589793, 1e308, 5e-324, 100.0, 2.5e15, 9999999999999998.0]
STRS = ['', 'a', "o'brien", 'di "hola"', 'mixto \' y "', 'tab\tnl\n', 'ñandú', '\\barra',
        'ctrl\x01', 'emoji 🌵', 'id-1', 'Línea 1\nLínea 2']


def rnd(depth=0):
    r = rng.random()
    if depth > 3 or r < 0.35:
        k = rng.randrange(8)
        if k == 0:
            return rng.choice(FLOATS) * rng.choice([1, -1])
        if k == 1:
            return rng.randrange(-10**6, 10**6)
        if k == 2:
            return rng.choice([10**18 + 7, -(2**63), 2**53 + 1])
        if k == 3:
            return rng.choice(STRS)
        if k == 4:
            return rng.choice([True, False, None])
        if k == 5:
            return round(rng.uniform(-1e3, 1e3), rng.randrange(0, 6))
        if k == 6:
            return rng.choice([float('nan'), float('inf'), float('-inf')])
        return rng.choice(STRS) + str(rng.randrange(100))
    if r < 0.65:
        return [rnd(depth + 1) for _ in range(rng.randrange(4))]
    return {rng.choice(STRS) + str(rng.randrange(5)): rnd(depth + 1) for _ in range(rng.randrange(4))}


def main():
    cases = []
    for _ in range(2000):
        doc = json.dumps(rnd(), ensure_ascii=rng.random() < 0.5,
                         indent=rng.choice([None, 1, 2]))
        cases.append({'json': doc, 'repr': repr(json.loads(doc))})
    # rechazos de json.loads (estrictos) que el TS debe rechazar igual
    for bad in ['{', '[1,]', '{"a":1,}', "{'a':1}", '01', '1.', '.5', '+1', '"\x01"',
                '[1 2]', '{"a" 1}', 'nul', '"\\x41"', '[] []', 'NaNx']:
        try:
            json.loads(bad)
            cases.append({'json': bad, 'repr': 'ACEPTADO?'})
        except json.JSONDecodeError as e:
            cases.append({'json': bad, 'error': e.msg})
    json.dump({'python': sys.version.split()[0], 'cases': cases}, sys.stdout,
              ensure_ascii=False, indent=0)
    print()


if __name__ == '__main__':
    main()
