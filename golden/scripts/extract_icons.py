#!/usr/bin/env python3
"""Extrae los iconos builtin del oráculo como DATOS (A5): plantillas SVG.

Ejecuta cada `draw_<type>` real de AlmaGag Python v3.20.0 y lo convierte en
una plantilla paramétrica, sin transcribir nada a mano:

- Color: `adjust_lightness` y `create_gradient` se interceptan en el espacio
  de nombres de cada módulo cuando el color es un CENTINELA → tokens
  `{"c": "base"}`, `{"c": "light", "f": 0.6}`, `{"c": "grad"}`. El TS los
  resuelve con su port de adjust_lightness (verificado por el golden de
  paridad, measure_icons.py).
- Geometría: el icono se dibuja en DOS posiciones (0,0) y (1000,2000). Cada
  número de cada atributo debe variar 0 (constante), 1000 (x+c) o 2000
  (y+c); cualquier otra cosa aborta la extracción (no lineal). Una tercera
  posición (7,3) verifica la predicción.

Salida: src/core/icons/builtin.generated.ts (commiteado, con procedencia).

    python golden/scripts/extract_icons.py --python-repo RUTA
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from xml.etree import ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from measure_reference import check_provenance  # noqa: E402

SENT = 'sentinela'
NUM = re.compile(r'-?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?')
TYPES = ['server', 'cloud', 'building', 'firewall', 'database', 'router', 'laptop',
         'computer', 'document', 'user', 'diamond', 'decision']


def render(repo_mod, t, x, y):
    import svgwrite
    dwg = svgwrite.Drawing(debug=False)
    mod = repo_mod(t)
    getattr(mod, f'draw_{t}')(dwg, x, y, SENT, 'ICONID')
    return ET.fromstring(dwg.tostring())


def tokens(value: str, vx: str, vy: str):
    """Plantilla de un atributo: partes de texto y números con su clase."""
    if value == SENT:
        return [{'c': 'base'}]
    m = re.fullmatch(r'§L([\d.]+)§', value)
    if m:
        return [{'c': 'light', 'f': float(m.group(1))}]
    if value == 'url(#gradient-ICONID)':
        return [{'c': 'grad'}]
    if 'ICONID' in value and value != 'ICONID':
        raise SystemExit(f'ICONID embebido en un atributo no previsto: {value!r}')
    if value == 'ICONID':
        return [{'c': 'id'}]
    # Un atributo que no depende de la posición queda LITERAL: tokenizar sus
    # números rompe colores como '#ffff00' (el '00' salía '0' → '#ffff0',
    # inválido → negro). Lo detectó la verificación visual (PNG mirado).
    if value == vx == vy:
        return [value]
    a, b, c = (NUM.findall(v) for v in (value, vx, vy))
    sa, sb = NUM.split(value), NUM.split(vx)
    if sa != sb or len(a) != len(b) or len(a) != len(c):
        raise SystemExit(f'estructura no lineal: {value!r} vs {vx!r}')
    out = []
    for i, txt in enumerate(sa):
        if txt:
            out.append(txt)
        if i < len(a):
            v0, v1, v2 = float(a[i]), float(b[i]), float(c[i])
            if abs(v1 - v0) < 1e-9 and abs(v2 - v0) < 1e-9:
                out.append({'n': v0})
            elif abs(v1 - v0 - 1000) < 1e-6 and abs(v2 - v0) < 1e-9:
                out.append({'x': v0})
            elif abs(v2 - v0 - 2000) < 1e-6 and abs(v1 - v0) < 1e-9:
                out.append({'y': v0})
            else:
                raise SystemExit(f'número no lineal en {value!r}: {v0}→{v1},{v2}')
    return out


def walk(e0, e1, e2):
    if len(e0) != len(e1) or e0.tag != e1.tag:
        raise SystemExit(f'árbol distinto entre posiciones: {e0.tag}')
    tag = e0.tag.split('}')[-1]
    attrs = [[k, tokens(v, e1.get(k), e2.get(k))] for k, v in e0.attrib.items()]
    node = {'tag': tag, 'attrs': attrs, 'children': [walk(a, b, c) for a, b, c in zip(e0, e1, e2)]}
    if (e0.text or '').strip():
        node['text'] = e0.text
    return node


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--python-repo', required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.python_repo)
    prov = check_provenance(repo)
    sys.path.insert(0, repo)
    import importlib
    icons = importlib.import_module('AlmaGag.draw.icons')

    real_adjust = icons.adjust_lightness

    def adjust(color, factor):
        return f'§L{factor}§' if color == SENT else real_adjust(color, factor)

    def gradient(dwg, element_id, base_color):
        # Registra que el icono pide gradiente; el TS emite el <linearGradient>
        # con light=1.3/dark=0.7 (create_gradient de __init__, port verificado).
        GRAD.add(element_id)
        return f'url(#gradient-{element_id})'

    def mod_of(t):
        m = importlib.import_module(f'AlmaGag.draw.icons.{t}')
        for name in ('adjust_lightness', 'create_gradient'):
            if hasattr(m, name):
                setattr(m, name, adjust if name == 'adjust_lightness' else gradient)
        if t == 'decision':  # alias de diamond: intercepta también al delegado
            mod_of('diamond')
        return m

    out = {}
    for t in TYPES:
        GRAD = set()
        globals()['GRAD'] = GRAD
        r0 = render(mod_of, t, 0, 0)
        r1 = render(mod_of, t, 1000, 0)
        r2 = render(mod_of, t, 0, 2000)
        body = [walk(a, b, c) for a, b, c in zip(r0, r1, r2) if a.tag.split('}')[-1] != 'defs']
        out[t] = {'gradient': bool(GRAD), 'body': body}
        # verificación en una 3ª posición: la plantilla predice (7, 3)
        r3 = render(mod_of, t, 7, 3)
        pred = json.dumps([evaluate(n, 7, 3) for n in body], sort_keys=True)
        real = json.dumps([tree(n) for n in r3 if n.tag.split('}')[-1] != 'defs'], sort_keys=True)
        if pred != real:
            raise SystemExit(f'{t}: la plantilla no predice la posición (7,3)')
    # bwt (sin color): draw_bwt(dwg, x, y)
    import svgwrite
    bwt = importlib.import_module('AlmaGag.draw.icons.bwt')
    rs = []
    for (x, y) in ((0, 0), (1000, 0), (0, 2000)):
        d = svgwrite.Drawing(debug=False)
        bwt.draw_bwt(d, x, y)
        rs.append(ET.fromstring(d.tostring()))
    out['bwt'] = {'gradient': False, 'body': [walk(a, b, c) for a, b, c in zip(*rs)
                                               if a.tag.split('}')[-1] != 'defs']}

    header = (
        '/**\n * GENERADO por golden/scripts/extract_icons.py desde AlmaGag Python '
        f"v{prov['version']} @ {prov['commit'][:12]}.\n"
        ' * NO EDITAR A MANO: plantillas de los iconos builtin (A5). Cada número\n'
        ' * es constante ({n}), x+c ({x}) o y+c ({y}); los colores son tokens.\n */\n'
        "import type { IconTemplate } from './template.ts';\n\n"
        'export const BUILTIN_ICONS: Readonly<Record<string, IconTemplate>> = '
    )
    path = os.path.join(ROOT, 'src/core/icons/builtin.generated.ts')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(header + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f'{len(out)} plantillas → {os.path.relpath(path, ROOT)}', file=sys.stderr)


def evaluate(node, x, y):
    attrs = {}
    for k, parts in node['attrs']:
        s = ''
        for p in parts:
            if isinstance(p, str):
                s += NUM.sub(lambda m: fmt(float(m.group(0))), p)
            elif 'n' in p:
                s += fmt(p['n'])
            elif 'x' in p:
                s += fmt(p['x'] + x)
            elif 'y' in p:
                s += fmt(p['y'] + y)
            elif p.get('c') == 'id':
                s += 'ICONID'
            else:
                s += '<color>'
        attrs[k] = s
    return {'tag': node['tag'], 'attrs': attrs, 'children': [evaluate(c, x, y) for c in node['children']]}


def tree(e):
    attrs = {}
    for k, v in e.attrib.items():
        if v == SENT or v.startswith('§L') or v == 'url(#gradient-ICONID)':
            v = '<color>'
        else:
            v = NUM.sub(lambda m: fmt(float(m.group(0))), v)
        attrs[k] = v
    return {'tag': e.tag.split('}')[-1], 'attrs': attrs, 'children': [tree(c) for c in e]}


def fmt(v):
    return f'{round(v, 6):.6f}'


if __name__ == '__main__':
    main()
