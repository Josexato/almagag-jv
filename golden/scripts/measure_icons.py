#!/usr/bin/env python3
"""Golden de paridad de iconos: `draw_icon_shape` REAL del oráculo (sin
interceptar) para cada type × color, más union, BWT, alias e iconos
embebidos. Guarda el SVG completo (defs + cuerpo) y los avisos.

    python golden/scripts/measure_icons.py --python-repo RUTA --out golden/icons-v3.20.0.json
"""
from __future__ import annotations

import argparse
import io
import json
import logging
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from measure_reference import check_provenance  # noqa: E402

TYPES = ['server', 'cloud', 'building', 'firewall', 'database', 'router', 'laptop', 'computer',
         'document', 'user', 'diamond', 'decision', 'union', 'inet', 'wan', 'internet',
         'turbina', 'unknown', 'bwt', 'Server']
COLORS = [None, 'gray', 'lightblue', 'LightBlue', '#1565c0', '#abc', 'chartreuse', '#000000', '#ffffff', 'tomato']
EMBEDDED = {
    'sensor': '<svg viewBox="0 0 40 25"><circle cx="20" cy="12" r="10" fill="currentColor"/><rect x="5" y="20" width="30" height="4" fill="#333"/></svg>',
    'antena': '<path d="M40 5 L60 45 L20 45 Z" fill="currentColor" stroke="#222"/>',
    'sinvb': '<svg><rect x="0" y="0" width="80" height="50" fill="currentColor"/></svg>',
    'alto': '<svg viewBox="0 0 10 100"><rect width="10" height="100" fill="red"/></svg>',
    'conns': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50"><circle cx="40" cy="25" r="20"/><!-- comentario --><g><rect x="1" y="2" width="3" height="4"/></g></svg>',
    'union': '<svg viewBox="0 0 80 50"><circle cx="40" cy="25" r="5" fill="currentColor"/></svg>',
    'cloud': '<svg viewBox="0 0 80 50"><ellipse cx="40" cy="25" rx="30" ry="15" fill="currentColor"/></svg>',
    'wan': '<svg viewBox="0 0 80 50"><rect width="80" height="50" fill="purple"/></svg>',
}
EMB_TYPES = list(EMBEDDED) + ['inet', 'internet']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--python-repo', required=True)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.python_repo)
    prov = check_provenance(repo)
    sys.path.insert(0, repo)
    import svgwrite
    from AlmaGag.draw.icons import draw_icon_shape
    logger = logging.getLogger('AlmaGag')
    logger.setLevel(logging.INFO)
    rows = []

    def one(t, color, embedded):
        el = {'id': 'el-1', 'x': 123.5, 'y': 67.25, 'type': t}
        if color is not None:
            el['color'] = color
        dwg = svgwrite.Drawing(debug=False)
        buf = io.StringIO()
        h = logging.StreamHandler(buf)
        h.setFormatter(logging.Formatter('%(levelname)s|%(message)s'))
        logger.addHandler(h)
        try:
            draw_icon_shape(dwg, el, embedded)
            row = {'type': t, 'color': color, 'embedded': embedded is not None, 'svg': dwg.tostring()}
        except Exception as e:  # noqa: BLE001
            row = {'type': t, 'color': color, 'embedded': embedded is not None,
                   'exception': f'{type(e).__name__}: {e}'}
        finally:
            logger.removeHandler(h)
        row['log'] = [l for l in buf.getvalue().splitlines() if '|' in l]
        rows.append(row)

    for t in TYPES:
        for c in COLORS:
            one(t, c, None)
    for t in EMB_TYPES:
        for c in (None, '#e8820c', 'lightgreen'):
            one(t, c, EMBEDDED)
    with open(os.path.join(ROOT, args.out), 'w', encoding='utf-8') as fh:
        json.dump({'provenance': prov, 'embedded': EMBEDDED, 'rows': rows}, fh, ensure_ascii=False, indent=0)
        fh.write('\n')
    print(f"{len(rows)} iconos; excepciones: {sum('exception' in r for r in rows)}", file=sys.stderr)


if __name__ == '__main__':
    main()
