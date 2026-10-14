# Tabla golden de referencia — AlmaGag Python v3.20.0

Generada con `golden/scripts/measure_reference.py` sobre `docs/diagrams/gags/` (40 fixtures, `layout_algorithm='select'`). Los 40 fixtures son deterministas: dos corridas producen el mismo SVG byte a byte.

| fixture | motor | cruces | arista×nodo | labels | own-line | tinta % | aspecto | WARN |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 01-iconos-registrados.sdjf | auto | 0 | 0 | 0 | 0 | 16.7 | 3.9 | 1 |
| 02-iconos-no-registrados.sdjf | auto | 0 | 0 | 0 | 0 | 18.2 | 2.09 | 1 |
| 03-conexiones.sdjf | auto | 0 | 0 | 1 | 0 | 9.9 | 1.62 | 0 |
| 04-gradientes-colores.sdjf | auto | 0 | 0 | 0 | 0 | 26.1 | 2.44 | 0 |
| 05-arquitectura-gag.gag | auto | 3 | 1 | 5 | 5 | 30.9 | 1.09 | 0 |
| 06-flujo-ejecucion.sdjf | auto | 5 | 1 | 14 | 1 | 29.1 | 1.07 | 0 |
| 06-waypoints.sdjf | auto | 1 | 0 | 0 | 0 | 9.0 | 1.48 | 0 |
| 07-containers.sdjf | auto | 0 | 2 | 3 | 1 | 42.2 | 0.86 | 0 |
| 08-auto-layout.sdjf | auto | 0 | 0 | 0 | 0 | 14.9 | 0.79 | 0 |
| 09-proportional-sizing.sdjf | auto | 0 | 0 | 0 | 0 | 13.2 | 1.38 | 0 |
| 10-hybrid-layout.sdjf | auto | 3 | 0 | 0 | 0 | 12.5 | 1.05 | 0 |
| 11-stresstest.sdjf | auto | 0 | 0 | 0 | 0 | 10.0 | 2.19 | 0 |
| 12-custom-icons.gag | auto | 0 | 0 | 0 | 0 | 12.5 | 1.01 | 0 |
| 13-stresstest.gag | auto | 0 | 0 | 0 | 0 | 13.9 | 2.8 | 0 |
| 14-stresstest.sdjf | hier | 1 | 1 | 0 | 0 | 9.3 | 1.97 | 0 |
| 15-architecture-template.gag | auto | 8 | 0 | 6 | 3 | 29.9 | 0.95 | 0 |
| 16-contract-band.gag | auto | 0 | 0 | 0 | 0 | 24.2 | 0.91 | 0 |
| 17-semantic-connections.gag | auto | 1 | 0 | 0 | 0 | 9.6 | 2.02 | 0 |
| activacion-datacenter.sdjf | hier | 1 | 2 | 2 | 0 | 11.5 | 1.67 | 0 |
| cakephp-mvc.gag | auto | 7 | 4 | 1 | 3 | 22.5 | 0.84 | 0 |
| ciclo-retrabajo.sdjf | hier | 0 | 1 | 0 | 0 | 13.0 | 1.13 | 0 |
| considerations-demo.sdjf | auto | 0 | 0 | 0 | 2 | 13.5 | 0.65 | 1 |
| continentes-america.sdjf | auto | 0 | 1 | 10 | 1 | 10.4 | 1.27 | 0 |
| es-primo.gag | hier | 0 | 1 | 0 | 0 | 9.0 | 1.29 | 0 |
| git.sdjf | auto | 6 | 1 | 20 | 9 | 51.6 | 0.55 | 0 |
| layout-optimization-flow.sdjf | hier | 1 | 0 | 7 | 4 | 26.4 | 0.96 | 0 |
| mina-arquitectura-fisica.sdjf | auto | 19 | 9 | 17 | 5 | 88.1 | 1.44 | 14 |
| mina-fisico-v2.gag | auto | 4 | 6 | 17 | 6 | 52.0 | 1.46 | 0 |
| mina-hld.gag | auto | 4 | 1 | 1 | 8 | 17.7 | 1.59 | 0 |
| mina-presupuesto.sdjf | auto | 0 | 0 | 1 | 4 | 14.8 | 0.89 | 0 |
| organigrama-empresa.sdjf | auto | 0 | 0 | 0 | 2 | 9.2 | 1.18 | 0 |
| red-dual-homing-areas.sdjf | hier | 0 | 0 | 1 | 0 | 5.3 | 0.84 | 0 |
| red-dual-homing.sdjf | auto | 1 | 0 | 0 | 0 | 8.4 | 2.05 | 0 |
| red-minera-antes.gag | auto | 3 | 0 | 2 | 1 | 8.5 | 1.9 | 0 |
| red-minera-despues.gag | auto | 1 | 0 | 1 | 3 | 7.5 | 1.51 | 0 |
| reference-cheatsheet.sdjf | auto | 0 | 0 | 15 | 2 | 50.9 | 0.59 | 1 |
| roadmap-versions.sdjf | auto | 0 | 0 | 0 | 0 | 16.2 | 2.13 | 0 |
| routing-architecture.sdjf | auto | 2 | 0 | 2 | 2 | 12.6 | 1.68 | 0 |
| svg-to-bwt-flow.sdjf | auto | 0 | 0 | 1 | 3 | 15.6 | 0.37 | 1 |
| system-architecture.sdjf | auto | 0 | 0 | 1 | 6 | 8.0 | 1.03 | 0 |
| **TOTAL (40)** | 33 auto / 7 hier | **71** | **31** | **128** | **71** | — | — | 19 |
