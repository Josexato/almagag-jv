#!/usr/bin/env python3
"""Golden diferencial del post-proceso de emisión del oráculo:
`finalize_svg` = recorte de viewBox §O51 + halo de texto §O50.

Genera SVG sintéticos (semilla fija) que ejercitan todo lo que el recorte
mide — rect/circle/ellipse/line/polyline/polygon/path (M L H V C S Q T A Z,
absolutos y relativos), text con anchors y font-size, transforms anidados
(translate/scale/rotate/matrix/skewX/skewY), defs/marker, clases
`ag-bottom-anchored` (leyendas) — y guarda entrada + salida de
finalize_svg REAL.

    python golden/scripts/measure_finalize.py --python-repo RUTA --out golden/finalize-v3.20.0.json
"""
import argparse
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from measure_reference import check_provenance  # noqa: E402

rng = random.Random(51)


def f(lo, hi, nd=None):
    v = rng.uniform(lo, hi)
    if nd is None:
        nd = rng.choice([0, 1, 2, 3])
    v = round(v, nd)
    return int(v) if nd == 0 else v


def transform():
    parts = []
    for _ in range(rng.randrange(1, 3)):
        k = rng.choice(['translate', 'translate1', 'scale', 'scale2', 'rotate', 'rotate3', 'matrix', 'skewX', 'skewY'])
        if k == 'translate':
            parts.append(f'translate({f(-50, 200)},{f(-50, 200)})')
        elif k == 'translate1':
            parts.append(f'translate({f(-50, 200)})')
        elif k == 'scale':
            parts.append(f'scale({f(0.2, 3, 2)})')
        elif k == 'scale2':
            parts.append(f'scale({f(0.2, 3, 2)} {f(0.2, 3, 2)})')
        elif k == 'rotate':
            parts.append(f'rotate({f(-90, 90)})')
        elif k == 'rotate3':
            parts.append(f'rotate({f(-90, 90)} {f(0, 100)} {f(0, 100)})')
        elif k == 'matrix':
            parts.append('matrix(' + ','.join(str(f(-2, 2, 3)) for _ in range(6)) + ')')
        else:
            parts.append(f'{k}({f(-30, 30)})')
    return ' '.join(parts)


def path_d():
    out = [f'M {f(0, 500)} {f(0, 500)}']
    for _ in range(rng.randrange(1, 6)):
        c = rng.choice('LlHhVvCcSsQqTtAaZz')
        up = c.upper()
        if up in 'LT':
            out.append(f'{c} {f(-100, 500)},{f(-100, 500)}')
        elif up in 'HV':
            out.append(f'{c} {f(-100, 500)}')
        elif up == 'C':
            out.append(f'{c} ' + ' '.join(f'{f(-50, 500)},{f(-50, 500)}' for _ in range(3)))
        elif up in 'SQ':
            out.append(f'{c} ' + ' '.join(f'{f(-50, 500)},{f(-50, 500)}' for _ in range(2)))
        elif up == 'A':
            out.append(f'{c} {f(1, 120)} {f(1, 120)} {f(0, 90)} {rng.randrange(2)} {rng.randrange(2)} {f(-50, 500)} {f(-50, 500)}')
        else:
            out.append(c)
    return ' '.join(out)


def shape(depth=0):
    k = rng.choice(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'text', 'g', 'image', 'unknown'])
    tr = f' transform="{transform()}"' if rng.random() < 0.3 else ''
    cls = ''
    if rng.random() < 0.08:
        cls = ' class="ag-bottom-anchored"'
    elif rng.random() < 0.1:
        cls = ' class="otra ag-x"'
    if k == 'rect' or k == 'image':
        return f'<{k} x="{f(-20, 900)}" y="{f(-20, 700)}" width="{f(0, 300)}" height="{f(0, 200)}"{tr}{cls}/>'
    if k == 'circle':
        return f'<circle cx="{f(0, 900)}" cy="{f(0, 700)}" r="{f(1, 60)}"{tr}{cls}/>'
    if k == 'ellipse':
        return f'<ellipse cx="{f(0, 900)}" cy="{f(0, 700)}" rx="{f(1, 60)}" ry="{f(1, 40)}"{tr}{cls}/>'
    if k == 'line':
        return f'<line x1="{f(0, 900)}" y1="{f(0, 700)}" x2="{f(0, 900)}" y2="{f(0, 700)}"{tr}{cls}/>'
    if k in ('polyline', 'polygon'):
        pts = ' '.join(f'{f(0, 900)},{f(0, 700)}' for _ in range(rng.randrange(2, 6)))
        return f'<{k} points="{pts}"{tr}{cls}/>'
    if k == 'path':
        return f'<path d="{path_d()}"{tr}{cls}/>'
    if k == 'text':
        anchor = rng.choice(['', ' text-anchor="middle"', ' text-anchor="end"', ' text-anchor="start"'])
        fs = rng.choice(['', ' font-size="16px"', ' font-size="12"', ' font-size="13px"', ' font-size="grande"'])
        idv = f' id="t{rng.randrange(1000)}"' if rng.random() < 0.3 else ''
        fill = ' fill="black"' if rng.random() < 0.5 else ''
        txt = rng.choice(['Nodo', 'Línea con acentos ñ', '', 'a&amp;b', 'x' * rng.randrange(1, 30)])
        inner = txt if rng.random() < 0.8 else f'{txt}<tspan>{rng.choice(["sub", "ñ"])}</tspan>'
        return f'<text x="{f(0, 900)}" y="{f(0, 700)}"{anchor}{fs}{fill}{idv}{tr}{cls}>{inner}</text>'
    if k == 'unknown':
        return f'<foreignObject x="{f(0, 900)}" y="{f(0, 700)}"/>'
    if depth > 2:
        return '<g/>'
    kids = ''.join(shape(depth + 1) for _ in range(rng.randrange(0, 4)))
    return f'<g{tr}{cls}>{kids}</g>'


def doc():
    w, h = rng.choice([(1400, 900), (800, 600), (2000, 1500), (300, 200)])
    vb = rng.choice([f' viewBox="0,0,{w},{h}"', f' viewBox="0 0 {w} {h}"', f' viewBox="{f(-50, 50)} {f(-50, 50)} {w} {h}"', ''])
    defs = ('<defs><marker id="m"><path d="M 0 0 L 10 5 L 0 10 z"/></marker>'
            '<linearGradient id="g"/><text x="1" y="1">en defs</text></defs>')
    body = ''.join(shape() for _ in range(rng.randrange(0, 10)))
    if rng.random() < 0.2:
        body += ('<g class="ag-bottom-anchored">' + f'<text x="{f(0, 300)}" y="{h - f(5, 40)}" font-size="12px">Leyenda:</text>'
                 + f'<rect x="{f(0, 300)}" y="{h - f(5, 40)}" width="20" height="8"/></g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" baseProfile="full" height="{h}" version="1.1" '
            f'width="{w}"{vb}>{defs}{body}</svg>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--python-repo', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.python_repo)
    prov = check_provenance(repo)
    sys.path.insert(0, repo)
    from AlmaGag.draw.primitives.svg import finalize_svg
    cases = []
    for _ in range(400):
        src = doc()
        try:
            cases.append({'in': src, 'out': finalize_svg(src)})
        except Exception as e:  # noqa: BLE001
            cases.append({'in': src, 'exception': f'{type(e).__name__}: {e}'})
    with open(os.path.join(ROOT, args.out), 'w', encoding='utf-8') as fh:
        json.dump({'provenance': prov, 'cases': cases}, fh, ensure_ascii=False, indent=0)
        fh.write('\n')
    print(f"{len(cases)} casos; excepciones: {sum('exception' in c for c in cases)}", file=sys.stderr)


if __name__ == '__main__':
    main()
