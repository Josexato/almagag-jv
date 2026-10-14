#!/usr/bin/env python3
"""Genera la tabla golden de referencia ejecutando AlmaGag Python (oráculo congelado).

Extiende scripts/measure_fixtures.py del repo Python SIN modificarlo:
además de la línea [motor] captura el motor elegido por select_strategy,
los WARNING emitidos, el viewBox del SVG y verifica determinismo (dos
corridas, mismo SVG byte a byte).

Uso:
    python golden/scripts/measure_reference.py <ruta-repo-AlmaGag> > golden/reference-v3.20.0.json

Aborta ruidosamente si no midió nada (herencia de la "nota de guerra"
del medidor Python: una guarda vacía es una guarda inválida).
"""

from __future__ import annotations

import glob
import hashlib
import io
import json
import logging
import os
import re
import sys
import tempfile

LINE_RE = re.compile(
    r"\[(?P<motor>\w+)\] cruces\(arista×arista\)=(?P<cruces>\d+) "
    r"arista×nodo=(?P<arista_nodo>\d+) labels=(?P<labels>\d+) "
    r"own-line=(?P<own_line>\d+) tinta=(?P<tinta>[\d.]+)% "
    r"aspecto=(?P<aspecto>[\d.]+)")
VIEWBOX_RE = re.compile(r'viewBox="([^"]+)"')


def run_once(generate_diagram, fixture: str, out: str) -> tuple[str, str]:
    logger = logging.getLogger('AlmaGag')
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter('%(levelname)s|%(message)s'))
    logger.addHandler(handler)
    try:
        generate_diagram(fixture, output_file=out, layout_algorithm='select')
    finally:
        logger.removeHandler(handler)
    with open(out, encoding='utf-8') as fh:
        svg = fh.read()
    return buf.getvalue(), svg


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    repo = os.path.abspath(sys.argv[1])
    sys.path.insert(0, repo)
    os.chdir(repo)
    from AlmaGag.generator import generate_diagram  # noqa: E402

    try:
        import tomllib
        with open('pyproject.toml', 'rb') as fh:
            version = tomllib.load(fh)['project']['version']
    except Exception:  # noqa: BLE001
        version = 'desconocida'

    fixtures = sorted(glob.glob('docs/diagrams/gags/*.sdjf')
                      + glob.glob('docs/diagrams/gags/*.gag'))
    rows = []
    tmp = tempfile.mkdtemp(prefix='almagag-golden-')
    for f in fixtures:
        name = os.path.basename(f)
        row: dict = {'fixture': name}
        try:
            log1, svg1 = run_once(generate_diagram, f, os.path.join(tmp, 'a.svg'))
            _, svg2 = run_once(generate_diagram, f, os.path.join(tmp, 'b.svg'))
        except Exception as e:  # noqa: BLE001 — un fixture roto no calla al resto
            row['error'] = f'{type(e).__name__}: {e}'
            rows.append(row)
            continue
        m = next((LINE_RE.search(l) for l in log1.splitlines() if LINE_RE.search(l)), None)
        if not m:
            row['error'] = 'sin línea de audit [motor]'
            rows.append(row)
            continue
        row.update(
            motor=m['motor'],
            cruces=int(m['cruces']), arista_nodo=int(m['arista_nodo']),
            labels=int(m['labels']), own_line=int(m['own_line']),
            tinta=float(m['tinta']), aspecto=float(m['aspecto']))
        vb = VIEWBOX_RE.search(svg1)
        row['viewBox'] = vb.group(1) if vb else None
        warnings = [l.split('|', 1)[1] for l in log1.splitlines()
                    if l.startswith('WARNING|') and not LINE_RE.search(l)]
        row['warnings'] = len(warnings)
        row['warning_msgs'] = warnings
        row['svg_sha256'] = hashlib.sha256(svg1.encode()).hexdigest()[:16]
        row['deterministic'] = svg1 == svg2
        rows.append(row)

    measured = sum(1 for r in rows if 'error' not in r)
    if measured == 0:
        print('ERROR: no se midió ningún fixture — guarda inválida', file=sys.stderr)
        return 1
    json.dump({'reference_engine': 'AlmaGag-Python', 'reference_version': version,
               'fixtures_measured': measured, 'rows': rows},
              sys.stdout, ensure_ascii=False, indent=1)
    print()
    return 0


if __name__ == '__main__':
    sys.exit(main())
