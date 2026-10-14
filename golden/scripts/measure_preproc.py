#!/usr/bin/env python3
"""Golden del PREPROCESADO del oráculo: mensajes + documento normalizado.

Corre el `generate_diagram` REAL del Python (sin modificar el repo) con dos
interceptores en tiempo de ejecución:
- `select_strategy` se envuelve: registra el motor elegido y una copia del
  documento ya normalizado (guardas [formato] + schema + unions + semantics
  + theme), justo antes de templates.
- `Layout` se reemplaza por un corte: la corrida termina al acabar el
  preprocesado (layout/ruteo/emisión no interesan aquí).

Por documento guarda: log (INFO/WARNING/ERROR, en orden), motor, repr() del
documento normalizado (sin claves `_*`), o la excepción si el oráculo
revienta (tipo + mensaje). Verifica procedencia como measure_reference.py.

    python golden/scripts/measure_preproc.py --python-repo RUTA \\
        --cases golden/preproc-inputs.json --out golden/preproc-v3.20.0.json
"""
from __future__ import annotations

import argparse
import copy
import glob
import io
import json
import logging
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from measure_reference import check_provenance  # noqa: E402


class Cut(Exception):
    pass


def strip_private(v):
    if isinstance(v, dict):
        return {k: strip_private(x) for k, x in v.items() if not (isinstance(k, str) and k.startswith('_'))}
    if isinstance(v, list):
        return [strip_private(x) for x in v]
    return v


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--python-repo', required=True)
    ap.add_argument('--cases', required=True, help='JSON {name: texto} con documentos extra')
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.python_repo)
    prov = check_provenance(repo)

    docs: list[tuple[str, str, str]] = []  # (nombre, origen, texto)
    for corpus in ('fixtures/py-v3.20.0', 'fixtures/constructos'):
        for f in sorted(glob.glob(os.path.join(ROOT, corpus, '*.sdjf'))
                        + glob.glob(os.path.join(ROOT, corpus, '*.gag'))):
            with open(f, encoding='utf-8') as fh:
                docs.append((os.path.basename(f), corpus, fh.read()))
    with open(os.path.join(ROOT, args.cases), encoding='utf-8') as fh:
        extra = json.load(fh)
    for name, text in extra['cases'].items():
        docs.append((name, 'casos', text))

    sys.path.insert(0, repo)
    os.chdir(repo)
    import AlmaGag.generator as gen  # noqa: E402

    state: dict = {}
    real_select = gen.select_strategy

    def spy_select(data, view='auto'):
        r = real_select(data, view)
        state['motor'] = r
        state['normalized'] = repr(strip_private(copy.deepcopy(data)))
        return r

    def cut(*a, **k):
        raise Cut()

    gen.select_strategy = spy_select
    real_layout = gen.Layout
    gen.Layout = cut
    logger = logging.getLogger('AlmaGag')
    tmp = os.path.join(ROOT, 'out', 'preproc')
    os.makedirs(tmp, exist_ok=True)
    rows = []
    for name, origin, text in docs:
        path = os.path.join(tmp, 'doc.sdjf')
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(text)
        state.clear()
        buf = io.StringIO()
        h = logging.StreamHandler(buf)
        h.setLevel(logging.INFO)
        h.setFormatter(logging.Formatter('%(levelname)s|%(message)s'))
        logger.addHandler(h)
        row = {'name': name, 'origin': origin}
        if origin == 'casos':
            row['input'] = text
        try:
            ok = gen.generate_diagram(path, output_file=os.path.join(tmp, 'x.svg'),
                                      layout_algorithm='select')
            row['outcome'] = 'sin corte' if ok is not False else 'rechazado'
        except Cut:
            row['outcome'] = 'ok'
        except Exception as e:  # noqa: BLE001 — el oráculo revienta: se registra
            row['outcome'] = 'excepcion'
            row['exception'] = type(e).__name__
            row['exception_msg'] = str(e)
        finally:
            logger.removeHandler(h)
        row['log'] = [l for l in buf.getvalue().splitlines() if '|' in l]
        if 'motor' in state:
            row['motor'] = state['motor']
            row['normalized'] = state['normalized']
        # Corrida COMPLETA (sin corte): ¿el oráculo revienta más adelante?
        gen.Layout = real_layout
        try:
            gen.generate_diagram(path, output_file=os.path.join(tmp, 'x.svg'), layout_algorithm='select')
            row['full_outcome'] = 'ok'
        except Exception as e:  # noqa: BLE001
            row['full_outcome'] = 'excepcion'
            row['full_exception'] = type(e).__name__
        finally:
            gen.Layout = cut
        rows.append(row)
    out = {'provenance': prov, 'rows': rows}
    with open(os.path.join(ROOT, args.out), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    from collections import Counter
    print(f"{len(rows)} documentos: preproc {dict(Counter(r['outcome'] for r in rows))}, "
          f"corrida completa {dict(Counter(r['full_outcome'] for r in rows))}", file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
