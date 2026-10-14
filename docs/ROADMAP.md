# Roadmap — almagag-jv

Motor de referencia (oráculo congelado): **AlmaGag Python v3.20.0**
(`9c7087d`, ver `golden/PROVENANCE.json`). No se persigue el tren: la
paridad se cierra contra v3.20.0 y el delta posterior del Python se porta
como fase final con su propio golden.

## Fases

| Fase | Contenido | Cierre medible | Bloques | Estado |
|---|---|---|---|---|
| **0 · Esqueleto** | Repo strict, build dual, CI, CLI mínimo, harness golden, corpus de constructos | ver «Cierre fase 0» | 1–2 | ✅ v0.0.1 |
| **1 · Formato + validación + emisión mínima** | Normalizador con el «schema que habla» (mismos `[schema]`/`[formato]`), `unions`, `theme`, `semantics`, iconos como datos, BWT §O55, O50/O51/O56 sobre colocación trivial | Mismos WARNING `[schema]` que el oráculo en los 67 fixtures; PNG mirado | 2 | ✅ v0.1.0 |
| **2 · Layout** | Niveles/SCC, columnas, contenedores rígidos, áreas, partition con compactación por intervalos, zonas near/banda, serpenteo, genealogías, **vistas `lanes` y `matrix`** | tinta/aspecto ±15%; propiedades de partition/serpentina/peine; **presupuesto de performance** (abajo) | 4–6 | — |
| **3 · Ruteo** | Puertos, corredores, bus, abanico, ortogonal, dodge + recorte de codos sobre `ObstacleIndex` | cruces/arista×nodo/labels ≤ referencia (misma regla, A3) | 3–4 | — |
| **4 · Emisión completa** | Leyendas, journeys/bandas, callouts, banda de contrato, O52 | O-contratos sobre el SVG; PNG de los 67 fixtures | 2 | — |
| **5 · Audit + demo + `--sugerir-escenografia`** | Audit completo, validador R1/R2/R3, golden total, demo browser (base GAG-WV), escenografía asistida | Tabla final referencia vs nuevo | 2 | — |
| **6 · Ortogonal por defecto en auto** | Decisión del autor: DESPUÉS de cerrar paridad, con golden propio | golden nuevo; diff de contadores explicado | 1–2 | — |

### Presupuesto de performance (desde la fase 2)

`fixtures/constructos/c26-perf-60-nodos.sdjf` (60 nodos, 5 áreas, 10
contenedores): **render completo < 1000 ms en browser** (Chromium vía
`npm run smoke:browser`) y en Node (`npm run bench`, compuerta de CI).
Referencia Python v3.20.0 en el mismo fixture: 76 ms. Si A1 (escenas
inmutables, candidatos por iteración) no lo cumple, se reporta en la
fase 2 con números, no en la 5.

## Alcance explícito de la superficie del Python (sin huecos silenciosos)

| Superficie Python v3.20.0 | Destino en almagag-jv |
|---|---|
| `-o/--output` | ✅ fase 0 |
| `--view auto\|columns\|areas\|lanes\|matrix` | ✅ selector en fase 0; vistas `columns`/`areas` fase 2, **`lanes`/`matrix` fase 2** (fixtures c11/c12 ya en el golden) |
| `--sugerir-escenografia` (tabla de conectividad + partition recomendada) | **fase 5**, con golden propio (texto recomendado por fixture con áreas) |
| `--layout-algorithm select\|auto\|hier` | fase 2 (forzar perfil, debug) |
| `--layout-algorithm legacy` (LAF) | ❌ **fuera de alcance** — congelado en Python, sólo debug |
| `--exportpng` (§O58) | ❌ fuera del núcleo: en browser lo hace un canvas (demo fase 5); en Node, `tools/render-png.ts` (dev) |
| `--epifania`/`--debug-phases`/`--visualize-growth` (un SVG por fase) | ❌ **fuera de alcance v0** — el pipeline de pasadas (A2) lo hace barato después |
| `--dump-iterations` | ❌ fuera de alcance v0 (ídem) |
| `--debug`/`--visualdebug`/`--guide-lines` | ❌ fuera de alcance v0; `--debug` = log DEBUG en fase 1 |
| `--color-connections` | ❌ fuera de alcance v0 (paleta sin semántica, debug) |
| `--centrality-*` | ❌ fuera de alcance — hiperparámetros de `legacy` |
| `layout_template` (`architecture`, `steps`, `hub_and_spoke`, `dashboard`, `er`, `sequence`, `state`) | fase 2 (perfil auto); `steps` ya en el corpus (c09) |

## Cierres

- Fase 0 (v0.0.1): `docs/reportes/FASE-0.md`.
- Fase 1 (v0.1.0): `docs/reportes/FASE-1.md`.
