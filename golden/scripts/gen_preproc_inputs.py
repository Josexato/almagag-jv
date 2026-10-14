#!/usr/bin/env python3
"""Casos de entrada para el golden de preprocesado (semilla fija).

Cubren cada superficie del schema que habla, las guardas [formato], unions,
semantics y theme, más combinaciones aleatorias. Sólo genera TEXTO JSON; el
oráculo los mide con measure_preproc.py.

    python golden/scripts/gen_preproc_inputs.py > golden/preproc-inputs.json
"""
import json
import random
import sys

rng = random.Random(1014)
J = lambda d: json.dumps(d, ensure_ascii=False)  # noqa: E731
B = lambda **k: {'elements': [{'id': 'a', 'type': 'server', 'label': 'A'},  # noqa: E731
                              {'id': 'b', 'type': 'server', 'label': 'B'}],
                 'connections': [{'from': 'a', 'to': 'b'}], **k}

cases = {}
def add(name, doc, raw=False):
    cases[name] = doc if raw else J(doc)

# --- schema: claves desconocidas por superficie
add('schema-raiz', B(desconocida=1, otra=[], _comment='ok'))
add('schema-raiz-comillas', B(**{"o'clave": 1, 'di"c': 2}))
add('schema-elemento', {'elements': [{'id': 'a', 'tipo': 'x', 'colour': 'red'}, {'id': 7, 'foo': 1}]})
add('schema-elemento-sin-id', {'elements': [{'idx': 'a', 'type': 'server', 'foo': 1, 'id': 'z'}]})
add('schema-conexion', B(connections=[{'from': 'a', 'to': 'b', 'peso': 3, 'lable': 'x'}]))
add('schema-area', B(areas=[{'id': 'A1', 'label': 'x', 'members': ['a'], 'orden': 1}, 'texto']))
add('schema-journey', B(journeys=[{'id': 'j', 'label': 'J', 'path': ['a', 'b'], 'grosor': 3}]))
add('schema-lane', B(lanes=[{'id': 'L', 'label': 'L', 'members': ['a'], 'ancho': 1}, 5, 2.5, None, [1]]))
add('schema-canvas', B(canvas={'width': 100, 'fondo': 'red', 'legend': [{'label': 'x', 'size': 2}, 'txt', 3]}))
add('schema-canvas-no-objeto', B(canvas=[1, 2]))
add('schema-canvas-string', B(canvas='grande'))
add('schema-vocab-formas', B(roles=['a'], semantics='x', theme=3, icons=[], unions={}, considerations={}, constraints='c'))
add('schema-items-no-objeto', {'elements': [{'id': 'a'}], 'connections': [], 'areas': [1, True, None, 'x', 2.0, [], {}]})
add('schema-spec-float', B(spec_version=2.0))
add('schema-spec-str', B(spec_version='2.1'))
add('schema-spec-int', B(spec_version=3))
add('schema-spec-null', B(spec_version=None))
add('schema-limpio', B(canvas={'width': 800, 'height': 600, 'flow': 'down'}))
# --- guardas [formato]
add('formato-flows', B(flows=[]))
add('formato-template-flow', B(layout_template='flow'))
add('formato-data-flow', B(connections=[{'from': 'a', 'to': 'b', 'semantic_type': 'data_flow'},
                                       {'from': 'b', 'to': 'a', 'semantic_type': 'control_flow'}]))
add('formato-routing-str', B(connections=[{'from': 'a', 'to': 'b', 'routing': 'orthogonal'}]))
add('formato-routing-int', B(connections=[{'from': 'a', 'to': 'b', 'routing': 5}]))
add('formato-routing-lista', B(connections=[{'from': 'a', 'to': 'b', 'routing': ['x']}]))
add('formato-routing-null', B(connections=[{'from': 'a', 'to': 'b', 'routing': None}]))
add('formato-roles-str', B(roles={'com': 'Comercial', 'ope': {'label': 'Ops', 'color': '#123456'}}))
# --- unions
fam = {'elements': [{'id': p, 'type': 'user', 'label': p} for p in ('p', 'm', 'h1', 'h2')],
       'connections': [{'from': 'u', 'to': 'h1'}, {'from': 'u', 'to': 'h2'}]}
add('unions-ok', {**fam, 'unions': [{'id': 'u', 'between': ['p', 'm']}]})
add('unions-sin-id', {**fam, 'unions': [{'between': ['p', 'm']}]})
add('unions-un-padre', {**fam, 'unions': [{'id': 'u', 'between': ['p']}]})
add('unions-between-null', {**fam, 'unions': [{'id': 'u', 'between': None}]})
add('unions-id-existente', {**fam, 'elements': fam['elements'] + [{'id': 'u', 'type': 'server'}],
                            'unions': [{'id': 'u', 'between': ['p', 'm']}]})
add('unions-vacia', {**fam, 'unions': []})
add('unions-tres-padres', {**fam, 'unions': [{'id': 'u', 'between': ['p', 'm', 'h2']}]})
add('unions-ciclo', {'elements': [{'id': 'p'}, {'id': 'm'}], 'connections': [{'from': 'u', 'to': 'p'}],
                     'unions': [{'id': 'u', 'between': ['p', 'm']}]})
# --- semantics
sc = [{'from': 'a', 'to': 'b', 'label': 'Enlace FO 10 Mbps'}, {'from': 'b', 'to': 'a', 'label': 'Soporte técnico'},
      {'from': 'a', 'to': 'a', 'label': 'nada'}, {'from': 'b', 'to': 'b', 'label': 'FO', 'semantic_type': 'event'},
      {'from': 'a', 'to': 'b', 'label': 42}, {'from': 'a', 'to': 'b'}, {'from': 'a', 'to': 'b', 'label': 'mw', 'color': 'red'}]
add('semantics-dict', B(connections=sc, semantics={'transporte': {'keywords': ['FO', 'MW', 'Mbps'], 'color': '#1f6fd0'},
                                                   'soporte': ['soporte', 'FAT']}))
add('semantics-keywords-raros', B(connections=sc, semantics={'num': [42, 0, None, '', False, True], 'x': {'keywords': []}}))
add('semantics-vacio', B(connections=sc, semantics={}))
add('semantics-color-token', B(connections=sc, semantics={'t': {'keywords': ['fo'], 'color': 'azul'}}, theme={'azul': '#0000ff'}))
add('semantics-acentos', B(connections=[{'from': 'a', 'to': 'b', 'label': 'ÉTICA Ñandú'}], semantics={'e': ['ética'], 'n': ['ñ']}))
# --- theme
add('theme-todo', {'theme': {'p': '#111111', 'q': '#222222'},
                   'elements': [{'id': 'a', 'color': 'p'}, {'id': 'b', 'color': 'red'}, {'id': 'c', 'color': 5}],
                   'connections': [{'from': 'a', 'to': 'b', 'color': 'q'}],
                   'areas': [{'id': 'A', 'members': ['a'], 'color': 'p'}], 'lanes': [{'id': 'L', 'color': 'q'}],
                   'roles': {'r': {'label': 'R', 'color': 'p'}, 's': 'texto'}})
add('theme-vacio', B(theme={}))
add('theme-sin-uso', B(theme={'x': '#000000'}))
# --- bordes de entrada
add('borde-vacio', {})
add('borde-elements-vacio', {'elements': []})
add('borde-ids-int', {'elements': [{'id': 1}, {'id': 2}], 'connections': [{'from': 1, 'to': 2}]})
add('borde-ids-dup', {'elements': [{'id': 'a'}, {'id': 'a', 'label': 'dup'}]})
add('borde-nan', '{"elements":[{"id":"a","x":NaN,"y":1}]}', raw=True)
add('borde-raiz-lista', '[]', raw=True)
add('borde-sin-id', {'elements': [{'type': 'server'}]})
add('borde-conexion-sin-to', {'elements': [{'id': 'a'}], 'connections': [{'from': 'a'}]})
add('borde-elements-str', {'elements': 'no lista'})
add('borde-label-int', {'elements': [{'id': 'a', 'label': 123}]})
add('borde-conexion-no-objeto', {'elements': [{'id': 'a'}], 'connections': ['a->b']})

# --- combinaciones aleatorias
KEYS_ROOT = ['zona', 'versión', 'notas', 'flujo']
for n in range(250):
    els = [{'id': f'n{i}', 'type': rng.choice(['server', 'cloud', 'turbina', 'decision', 'user']),
            'label': f'Nodo {i}'} for i in range(rng.randrange(1, 6))]
    ids = [e['id'] for e in els]
    conns = [{'from': rng.choice(ids), 'to': rng.choice(ids)} for _ in range(rng.randrange(0, 6))]
    doc = {'elements': els, 'connections': conns}
    for e in els:
        if rng.random() < 0.15:
            e[rng.choice(['tipo', 'size', 'Label'])] = rng.choice([1, 'x', 2.5])
        if rng.random() < 0.2:
            e['color'] = rng.choice(['t1', 't2', 'red', '#abcdef'])
    for c in conns:
        r = rng.random()
        if r < 0.1:
            c['routing'] = rng.choice(['orthogonal', 'bezier', 3, ['x']])
        elif r < 0.2:
            c['semantic_type'] = rng.choice(['data_flow', 'control_flow', 'event', 'sync'])
        elif r < 0.35:
            c['label'] = rng.choice(['FO principal', 'soporte', 'MW', 'otro', ''])
        if rng.random() < 0.1:
            c['grosor'] = 2
        if rng.random() < 0.15:
            c['color'] = rng.choice(['t1', 'blue'])
    if rng.random() < 0.3:
        doc['theme'] = {'t1': '#101010', 't2': '#202020'}
    if rng.random() < 0.25:
        doc['semantics'] = {'transporte': {'keywords': ['FO', 'MW']}, 'soporte': ['soporte']}
    if rng.random() < 0.2:
        doc['areas'] = [{'id': 'A', 'label': 'A', 'members': ids[:2]}]
        if rng.random() < 0.3:
            doc['areas'][0]['peso'] = 1
    if rng.random() < 0.15:
        doc['considerations'] = [{'align': ids[:2]}]
    if rng.random() < 0.15:
        doc['roles'] = {'r1': rng.choice(['Uno', {'label': 'Uno', 'color': 't1'}])}
    if rng.random() < 0.15 and len(ids) >= 2:
        doc['unions'] = [{'id': 'u0', 'between': ids[:2]}]
        doc['connections'].append({'from': 'u0', 'to': ids[-1]})
    if rng.random() < 0.15:
        doc[rng.choice(KEYS_ROOT)] = rng.choice([1, 'x', None])
    if rng.random() < 0.1:
        doc['spec_version'] = rng.choice([2.0, '2', 1])
    if rng.random() < 0.1:
        doc['canvas'] = {'width': 900, rng.choice(['zoom', 'flow']): 'down'}
    if rng.random() < 0.08:
        doc['layout_template'] = rng.choice(['flow', 'steps', 'nada'])
    add(f'rand-{n:03d}', doc)

json.dump({'_comment': 'Entradas del golden de preprocesado; generadas por gen_preproc_inputs.py (semilla 1014).',
           'cases': cases}, sys.stdout, ensure_ascii=False, indent=1)
print()
