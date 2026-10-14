#!/usr/bin/env python3
"""Genera una tabla golden ejecutando AlmaGag Python (oráculo congelado).

Reproducible por construcción: el checkout del repo Python DEBE estar en el
commit fijado en golden/PROVENANCE.json y limpio; si no, aborta. No mide
«lo que haya en master ese día».

Por fixture captura: motor elegido por select_strategy, contadores de la
línea de audit, WARNING emitidos, viewBox, sha256 del archivo de entrada,
sha256 del SVG, determinismo (dos corridas, mismo SVG byte a byte) y el
tiempo de render (referencia para el presupuesto de performance).

Uso:
    python golden/scripts/measure_reference.py --python-repo RUTA \\
        --fixtures fixtures/py-v3.20.0 --out golden/reference-v3.20.0.json
    python golden/scripts/measure_reference.py --python-repo RUTA \\
        --fixtures fixtures/constructos --views fixtures/constructos/views.json \\
        --out golden/constructos-v3.20.0.json

`--views` es un JSON {fixture: vista} para las vistas que sólo se eligen
por CLI (`--view lanes|matrix|columns|areas`): la vista NO vive en el
archivo (frontera §R).

Aborta ruidosamente si no midió nada (una guarda vacía es inválida).
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import io
import json
import logging
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LINE_RE = re.compile(
    r"\[(?P<motor>\w+)\] cruces\(arista×arista\)=(?P<cruces>\d+) "
    r"arista×nodo=(?P<arista_nodo>\d+) labels=(?P<labels>\d+) "
    r"own-line=(?P<own_line>\d+) tinta=(?P<tinta>[\d.]+)% "
    r"aspecto=(?P<aspecto>[\d.]+)")
VIEWBOX_RE = re.compile(r'viewBox="([^"]+)"')


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_provenance(repo: str) -> dict:
    with open(os.path.join(ROOT, 'golden', 'PROVENANCE.json'), encoding='utf-8') as fh:
        prov = json.load(fh)
    head = subprocess.run(['git', '-C', repo, 'rev-parse', 'HEAD'],
                          capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(['git', '-C', repo, 'status', '--porcelain'],
                           capture_output=True, text=True, check=True).stdout.strip()
    if head != prov['commit']:
        sys.exit(f"ERROR: el repo Python está en {head}, la procedencia fija "
                 f"{prov['commit']} (v{prov['version']}). "
                 f"Corre: git -C {repo} checkout {prov['commit']}")
    if dirty:
        sys.exit(f'ERROR: el checkout Python tiene cambios locales:\n{dirty}')
    import tomllib
    with open(os.path.join(repo, 'pyproject.toml'), 'rb') as fh:
        version = tomllib.load(fh)['project']['version']
    if version != prov['version']:
        sys.exit(f"ERROR: pyproject declara {version}, la procedencia {prov['version']}")
    return prov


def run_once(generate_diagram, fixture: str, out: str, view: str) -> tuple[str, str, float]:
    logger = logging.getLogger('AlmaGag')
    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter('%(levelname)s|%(message)s'))
    logger.addHandler(handler)
    t0 = time.perf_counter()
    try:
        generate_diagram(fixture, output_file=out, layout_algorithm='select', view=view)
    finally:
        logger.removeHandler(handler)
    dt = time.perf_counter() - t0
    with open(out, encoding='utf-8') as fh:
        svg = fh.read()
    return buf.getvalue(), svg, dt


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--python-repo', required=True)
    ap.add_argument('--fixtures', required=True)
    ap.add_argument('--views', default=None)
    ap.add_argument('--out', required=True)
    ap.add_argument('--svg-dir', default=None,
                    help='opcional: guarda aquí el SVG del Python por fixture')
    ap.add_argument('--log-dir', default=None,
                    help='opcional: guarda aquí el log completo del Python por fixture')
    args = ap.parse_args()

    repo = os.path.abspath(args.python_repo)
    prov = check_provenance(repo)
    fixdir = os.path.abspath(args.fixtures)
    views = {}
    if args.views:
        with open(args.views, encoding='utf-8') as fh:
            views = json.load(fh)
    sys.path.insert(0, repo)
    os.chdir(repo)
    from AlmaGag.generator import generate_diagram  # noqa: E402

    fixtures = sorted(glob.glob(os.path.join(fixdir, '*.sdjf'))
                      + glob.glob(os.path.join(fixdir, '*.gag')))
    rows = []
    tmp = tempfile.mkdtemp(prefix='almagag-golden-')
    for f in fixtures:
        name = os.path.basename(f)
        view = views.get(name, 'auto')
        with open(f, 'rb') as fh:
            row: dict = {'fixture': name, 'fixture_sha256': sha(fh.read()), 'view': view}
        try:
            log1, svg1, dt = run_once(generate_diagram, f, os.path.join(tmp, 'a.svg'), view)
            _, svg2, _ = run_once(generate_diagram, f, os.path.join(tmp, 'b.svg'), view)
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
        row['svg_sha256'] = sha(svg1.encode())[:16]
        row['deterministic'] = svg1 == svg2
        row['render_ms'] = round(dt * 1000)
        if args.log_dir:
            os.makedirs(args.log_dir, exist_ok=True)
            with open(os.path.join(args.log_dir, name + '.log'), 'w', encoding='utf-8') as fh:
                fh.write(log1)
        if args.svg_dir:
            os.makedirs(args.svg_dir, exist_ok=True)
            with open(os.path.join(args.svg_dir, re.sub(r'\.(sdjf|gag)$', '.svg', name)),
                      'w', encoding='utf-8') as fh:
                fh.write(svg1)
        rows.append(row)

    measured = sum(1 for r in rows if 'error' not in r)
    if measured == 0:
        print('ERROR: no se midió ningún fixture — guarda inválida', file=sys.stderr)
        return 1
    doc = {
        'provenance': prov,
        'fixtures_dir': os.path.relpath(fixdir, ROOT),
        'fixtures_measured': measured,
        'fixtures_total': len(rows),
        'rows': rows,
    }
    with open(os.path.join(ROOT, args.out) if not os.path.isabs(args.out) else args.out,
              'w', encoding='utf-8') as fh:
        json.dump(doc, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(f'medidos {measured}/{len(rows)} fixtures → {args.out}', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
