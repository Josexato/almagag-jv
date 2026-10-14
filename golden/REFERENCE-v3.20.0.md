# Tablas golden de referencia — AlmaGag Python v3.20.0

Generadas con `golden/scripts/measure_reference.py` (procedencia verificada: commit fijado en `golden/PROVENANCE.json`, checkout limpio). `det` = dos corridas, mismo SVG byte a byte. `ms` = render del oráculo (referencia del presupuesto de performance).

## Corpus py-v3.20.0 (40 fixtures públicos del repo Python)

Fuente: `fixtures/py-v3.20.0` · medidos 40/40 · referencia v3.20.0@`9c7087d`.

| fixture | vista | motor | cruces | arista×nodo | labels | own-line | tinta % | aspecto | WARN | ms | det |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 01-iconos-registrados.sdjf | auto | auto | 0 | 0 | 0 | 0 | 16.7 | 3.9 | 1 | 188 | sí |
| 02-iconos-no-registrados.sdjf | auto | auto | 0 | 0 | 0 | 0 | 18.2 | 2.09 | 1 | 20 | sí |
| 03-conexiones.sdjf | auto | auto | 0 | 0 | 1 | 0 | 9.9 | 1.62 | 0 | 13 | sí |
| 04-gradientes-colores.sdjf | auto | auto | 0 | 0 | 0 | 0 | 26.1 | 2.44 | 0 | 30 | sí |
| 05-arquitectura-gag.gag | auto | auto | 3 | 1 | 5 | 5 | 30.9 | 1.09 | 0 | 1472 | sí |
| 06-flujo-ejecucion.sdjf | auto | auto | 5 | 1 | 14 | 1 | 29.1 | 1.07 | 0 | 821 | sí |
| 06-waypoints.sdjf | auto | auto | 1 | 0 | 0 | 0 | 9.0 | 1.48 | 0 | 31 | sí |
| 07-containers.sdjf | auto | auto | 0 | 2 | 3 | 1 | 42.2 | 0.86 | 0 | 52 | sí |
| 08-auto-layout.sdjf | auto | auto | 0 | 0 | 0 | 0 | 14.9 | 0.79 | 0 | 137 | sí |
| 09-proportional-sizing.sdjf | auto | auto | 0 | 0 | 0 | 0 | 13.2 | 1.38 | 0 | 19 | sí |
| 10-hybrid-layout.sdjf | auto | auto | 3 | 0 | 0 | 0 | 12.5 | 1.05 | 0 | 23 | sí |
| 11-stresstest.sdjf | auto | auto | 0 | 0 | 0 | 0 | 10.0 | 2.19 | 0 | 36 | sí |
| 12-custom-icons.gag | auto | auto | 0 | 0 | 0 | 0 | 12.5 | 1.01 | 0 | 59 | sí |
| 13-stresstest.gag | auto | auto | 0 | 0 | 0 | 0 | 13.9 | 2.8 | 0 | 1836 | sí |
| 14-stresstest.sdjf | auto | hier | 1 | 1 | 0 | 0 | 9.3 | 1.97 | 0 | 17 | sí |
| 15-architecture-template.gag | auto | auto | 8 | 0 | 6 | 3 | 29.9 | 0.95 | 0 | 1045 | sí |
| 16-contract-band.gag | auto | auto | 0 | 0 | 0 | 0 | 24.2 | 0.91 | 0 | 23 | sí |
| 17-semantic-connections.gag | auto | auto | 1 | 0 | 0 | 0 | 9.6 | 2.02 | 0 | 11 | sí |
| activacion-datacenter.sdjf | auto | hier | 1 | 2 | 2 | 0 | 11.5 | 1.67 | 0 | 44 | sí |
| cakephp-mvc.gag | auto | auto | 7 | 4 | 1 | 3 | 22.5 | 0.84 | 0 | 953 | sí |
| ciclo-retrabajo.sdjf | auto | hier | 0 | 1 | 0 | 0 | 13.0 | 1.13 | 0 | 7 | sí |
| considerations-demo.sdjf | auto | auto | 0 | 0 | 0 | 2 | 13.5 | 0.65 | 1 | 18 | sí |
| continentes-america.sdjf | auto | auto | 0 | 1 | 10 | 1 | 10.4 | 1.27 | 0 | 4172 | sí |
| es-primo.gag | auto | hier | 0 | 1 | 0 | 0 | 9.0 | 1.29 | 0 | 12 | sí |
| git.sdjf | auto | auto | 6 | 1 | 20 | 9 | 51.6 | 0.55 | 0 | 3517 | sí |
| layout-optimization-flow.sdjf | auto | hier | 1 | 0 | 7 | 4 | 26.4 | 0.96 | 0 | 27 | sí |
| mina-arquitectura-fisica.sdjf | auto | auto | 19 | 9 | 17 | 5 | 88.1 | 1.44 | 14 | 1741 | sí |
| mina-fisico-v2.gag | auto | auto | 4 | 6 | 17 | 6 | 52.0 | 1.46 | 0 | 272 | sí |
| mina-hld.gag | auto | auto | 4 | 1 | 1 | 8 | 17.7 | 1.59 | 0 | 825 | sí |
| mina-presupuesto.sdjf | auto | auto | 0 | 0 | 1 | 4 | 14.8 | 0.89 | 0 | 6019 | sí |
| organigrama-empresa.sdjf | auto | auto | 0 | 0 | 0 | 2 | 9.2 | 1.18 | 0 | 17 | sí |
| red-dual-homing-areas.sdjf | auto | hier | 0 | 0 | 1 | 0 | 5.3 | 0.84 | 0 | 17 | sí |
| red-dual-homing.sdjf | auto | auto | 1 | 0 | 0 | 0 | 8.4 | 2.05 | 0 | 31 | sí |
| red-minera-antes.gag | auto | auto | 3 | 0 | 2 | 1 | 8.5 | 1.9 | 0 | 439 | sí |
| red-minera-despues.gag | auto | auto | 1 | 0 | 1 | 3 | 7.5 | 1.51 | 0 | 827 | sí |
| reference-cheatsheet.sdjf | auto | auto | 0 | 0 | 15 | 2 | 50.9 | 0.59 | 1 | 9297 | sí |
| roadmap-versions.sdjf | auto | auto | 0 | 0 | 0 | 0 | 16.2 | 2.13 | 0 | 36 | sí |
| routing-architecture.sdjf | auto | auto | 2 | 0 | 2 | 2 | 12.6 | 1.68 | 0 | 64 | sí |
| svg-to-bwt-flow.sdjf | auto | auto | 0 | 0 | 1 | 3 | 15.6 | 0.37 | 1 | 1371 | sí |
| system-architecture.sdjf | auto | auto | 0 | 0 | 1 | 6 | 8.0 | 1.03 | 0 | 78 | sí |
| **TOTAL (40)** | | 34 auto / 6 hier | **71** | **31** | **128** | **71** | | | 19 | 35617 | 40/40 |

## Corpus constructos (27 fixtures nuevos, compartidos Python ⇄ TS)

Fuente: `fixtures/constructos` · medidos 26/27 · referencia v3.20.0@`9c7087d`.

| fixture | vista | motor | cruces | arista×nodo | labels | own-line | tinta % | aspecto | WARN | ms | det |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| c01-partition-bsp.sdjf | auto | hier | 0 | 0 | 0 | 0 | 14.6 | 0.74 | 1 | 113 | sí |
| c02-partition-grid.sdjf | auto | hier | 0 | 0 | 0 | 0 | 15.7 | 0.43 | 0 | 15 | sí |
| c03-partition-compactacion.sdjf | auto | hier | 1 | 0 | 0 | 0 | 17.6 | 0.86 | 0 | 21 | sí |
| c04-partition-invalida.sdjf | auto | hier | 0 | 0 | 0 | 0 | 26.4 | 1.67 | 1 | 17 | sí |
| c05-serpenteo-celda-ancha.sdjf | auto | hier | 0 | 0 | 0 | 0 | 10.3 | 1.38 | 1 | 13 | sí |
| c06-serpenteo-feeders.sdjf | auto | hier | 0 | 0 | 0 | 0 | 15.1 | 2.3 | 0 | 15 | sí |
| c07-genealogia-tres-generaciones.sdjf | auto | auto | 0 | 0 | 0 | 0 | 14.4 | 1.0 | 0 | 19 | sí |
| c08-genealogia-peine-ancho.sdjf | auto | auto | 0 | 0 | 5 | 0 | 17.7 | 2.13 | 0 | 29 | sí |
| c09-template-steps.sdjf | auto | auto | 0 | 0 | 0 | 0 | 22.0 | 0.2 | 1 | 12 | sí |
| c10-columns-decision.sdjf | auto | hier | 0 | 0 | 0 | 0 | 10.2 | 1.0 | 0 | 10 | sí |
| c11-vista-lanes.sdjf | lanes | hier | 0 | 0 | 0 | 0 | 8.5 | 0.97 | 0 | 7 | sí |
| c12-vista-matrix.sdjf | matrix | hier | 0 | 0 | 0 | 1 | 11.7 | 1.5 | 0 | 7 | sí |
| c13-areas-roles-banda.sdjf | auto | hier | 2 | 0 | 0 | 0 | 19.2 | 0.12 | 1 | 22 | sí |
| c14-bus-troncal.sdjf | auto | hier | 0 | 0 | 0 | 0 | 14.9 | 0.43 | 0 | 15 | sí |
| c15-corredores-2x2.sdjf | auto | hier | 0 | 0 | 0 | 0 | 24.0 | 0.5 | 0 | 16 | sí |
| c16-abanico-origen.sdjf | auto | hier | 0 | 0 | 0 | 0 | 4.6 | 4.78 | 1 | 11 | sí |
| c17-areas-contains.sdjf | auto | hier | 0 | 0 | 1 | 0 | 45.6 | 0.72 | 0 | 13 | sí |
| c18-zonas-fisicas-anidadas.sdjf | auto | auto | 0 | 5 | 0 | 1 | 54.4 | 1.5 | 0 | 37 | sí |
| c19-journeys-areas.sdjf | auto | hier | 0 | 0 | 0 | 0 | 22.4 | 0.84 | 2 | 15 | sí |
| c20-roles-status-legend.sdjf | auto | hier | 0 | 0 | 0 | 0 | 33.0 | 0.38 | 3 | 8 | sí |
| c21-theme-semantica-estilos.sdjf | auto | hier | 0 | 1 | 0 | 0 | 17.2 | 1.52 | 0 | 11 | sí |
| c22-flow-up-agregacion.sdjf | auto | auto | 0 | 0 | 0 | 0 | 14.4 | 1.14 | 0 | 14 | sí |
| c23-considerations-o53.sdjf | auto | auto | 0 | 0 | 3 | 1 | 15.2 | 0.88 | 0 | 23 | sí |
| c24-iconos-embebidos-bwt.gag | auto | auto | 0 | 0 | 0 | 0 | 16.4 | 0.35 | 2 | 8 | sí |
| c25-ciclo-arcos.sdjf | auto | hier | 0 | 1 | 0 | 0 | 30.0 | 0.39 | 1 | 8 | sí |
| c26-perf-60-nodos.sdjf | auto | hier | 0 | 5 | 5 | 0 | 45.5 | 2.05 | 0 | 106 | sí |
| c27-selfloop-hier.sdjf | auto | **ERROR** | — | — | — | — | — | — | — | — | RecursionError: maximum recursion depth exceeded |
| **TOTAL (26)** | | 7 auto / 19 hier | **3** | **12** | **14** | **3** | | | 14 | 585 | 26/26 |
