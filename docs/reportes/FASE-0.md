# Cierre fase 0 — almagag-jv 0.0.1

Referencia: AlmaGag Python **v3.20.0** @ `9c7087d5861d` (`golden/PROVENANCE.json`).

## Entregables y números

| Entregable | Estado | Números |
|---|---|---|
| Esqueleto TS strict + build dual | ✅ | TS 6.0.3 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`); `dist/index.js` ESM neutro con **0** referencias a `node:`; `dist/cli.js` Node |
| Núcleo puro | ✅ | 2 guardas (lista negra + typecheck sin tipos de Node), ambas probadas con una violación inyectada |
| CLI mínimo | ✅ | `almagag-jv archivo -o salida.svg [--view]`; colocación trivial **nombrada** en el log; 67/67 fixtures → SVG válido |
| Corre en browser | ✅ | `dist/index.js` importado como módulo ES en Chromium: c26 (60 nodos) en 2.00 ms |
| Suite | ✅ | **93 tests** en 4 archivos (1.2 s) |
| Propiedad A1 (pedido del autor) | ✅ | «mutar un candidato jamás toca otra escena»: 300 casos fast-check por corrida + congelamiento + structural sharing + aristas paralelas |
| Harness golden | ✅ | lee ambas referencias, verifica procedencia y sha256 de los 67 fixtures, compuertas de fase en `golden/gates.json`; **motor 66/66** igual al oráculo, 0 fallas |
| Golden reproducible | ✅ | el script aborta si el checkout Python no está en el commit fijado o está sucio; dos regeneraciones → los mismos 40 sha256 de SVG |
| Fixtures Python | ✅ | 40 en `fixtures/py-v3.20.0/` con sha256 en el golden |
| Corpus de constructos | ✅ | **27** fixtures (25 constructos + self-loop + perf-60); oráculo: 26/27 renderizan, c27 revienta (PY-001); evidencia de activación 18/18 ejecutable + 9 visuales mirados |
| Presupuesto de performance | ✅ instalado | compuerta `npm run bench` en CI desde hoy (2.05 ms p95, motor trivial); oráculo Python en c26: 76 ms |
| CI | ver PR | GitHub Actions Node 22: typecheck · lint · test · build · golden · bench |

## Tablas de referencia

| Corpus | Fixtures | Motor | cruces | arista×nodo | labels | own-line | WARN | det |
|---|---:|---|---:|---:|---:|---:|---:|---|
| py-v3.20.0 | 40/40 | 34 auto / 6 hier | 71 | 31 | 128 | 71 | 19 | 40/40 |
| constructos | 26/27 | 7 auto / 19 hier | 3 | 12 | 14 | 3 | 14 | 26/26 |

Detalle por fixture: `golden/REFERENCE-v3.20.0.md`. Hoja PNG del oráculo
sobre los constructos: `docs/reportes/fase0-constructos-oraculo.png`.

## Hallazgos en el oráculo (para el repo Python)

7 hallazgos con reproducción mínima en `docs/HALLAZGOS-PYTHON.md`: 1 crash
(PY-001 self-loop), 1 aviso falso + 1 pérdida silenciosa (PY-002 leyenda
libre), 3 colisiones/recortes no medidos (PY-003 O51 recorta labels a la
izquierda, PY-004 leyenda sobre label, PY-005 dos iconos en la misma
posición con `labels=0`), 2 observaciones (PY-006 cinta 1×N, PY-007 «pasea»).

## Correcciones a la propuesta

- Corpus Python = **34 auto / 6 hier** (no 33/7); P1 = 26 de **34**.
- Sí hay genealogía en el corpus histórico (13-stresstest, `[AA]`).
- Journeys sin medir = contrato heredado (DECISIONES H-01), no divergencia.

## Lo que NO está (y dónde cae)

Layout, ruteo, audit e iconos reales: fases 1–5. `lanes`/`matrix`: fase 2.
`--sugerir-escenografia`: fase 5. `legacy`, `--epifania`, `--dump-iterations`,
`--color-connections`, `--centrality-*`: fuera de alcance v0 (ROADMAP).
