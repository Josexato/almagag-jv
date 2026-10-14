# Hallazgos en AlmaGag Python v3.20.0 (para fichar en el repo Python)

Encontrados al medir el corpus de constructos con el oráculo (`9c7087d`).
Todos se reprodujeron ejecutando. El motor almagag-jv los trata como
referencia: donde el Python revienta o calla, almagag-jv debe ser IGUAL o
MEJOR (no reventar, nombrar).

| ID | Severidad | Hallazgo | Reproducción mínima | Fixture |
|---|---|---|---|---|
| **PY-001** | crash | Un **self-loop** dispara hier (`_has_cycle` lo cuenta como ciclo) y `hier/columns.py:144 longest` recursa al infinito: `RecursionError`. Un ciclo de 2 nodos sin self-loop renderiza bien. | `{"elements":[{"id":"a"},{"id":"b"}],"connections":[{"from":"a","to":"b"},{"from":"b","to":"b"}]}` | `c27-selfloop-hier.sdjf` |
| **PY-002a** | aviso falso | `canvas.legend` con un string: `[schema] canvas.legend[0] no es un objeto (str) — se ignora`, pero AUTO **sí lo dibuja** (y la spec §1 dice que los strings valen). | `{"canvas":{"legend":["Texto libre"]},"elements":[{"id":"a"},{"id":"b"}],"connections":[{"from":"a","to":"b"}]}` → `Texto libre` presente en el SVG | `c20` |
| **PY-002b** | pérdida silenciosa | En **hier** (con `areas`) la leyenda libre entera (strings y swatches) **no se dibuja y no se nombra**. | el caso anterior + `"areas":[{"id":"P","label":"P","members":["a","b"]}]` → 0 apariciones de `Texto libre` y de `Swatch` | `c20-roles-status-legend.sdjf` |
| **PY-003** | tinta recortada | O51 recorta labels a la **izquierda** del icono en la vista columns: «Revisar solicitud» sale como «sar solicitud», «¿Completa?» pierde el «¿». | `c10-columns-decision.sdjf` (PNG) | `c10` |
| **PY-004** | colisión no medida | La leyenda «Enlaces:» se monta sobre el label «Monitoreo» y su último ítem («error») queda fuera del viewBox; `labels=0`. | `c21-theme-semantica-estilos.sdjf` (PNG) | `c21` |
| **PY-005** | colisión no medida | Dos iconos **en la misma posición exacta** (`bd` y `cache` en x=435.36, y=50) y el audit reporta `labels=0`: `icon_vs_icon` no entra a ningún contador. | `c21-theme-semantica-estilos.sdjf` | `c21` |
| PY-006 | observación | `area.role` con 5 bandas produce una cinta 1×N vertical (aspecto 0.12); §O52 lo NOMBRA pero la spec promete «nunca una cinta 1×N». | `c13-areas-roles-banda.sdjf` | `c13` |
| PY-007 | observación | Falso positivo de «pasea» en banda corta (ticket heredado): `240px de trazo contra 126px de conexiones (ratio 1.90 > 1.25)`. Confirma TS-DRAW-001. | `c19-journeys-areas.sdjf` | `c19` |

Consecuencia para el golden de almagag-jv: PY-003/004/005 significan que la
referencia **sub-mide** en c10/c21. La comparación «≤ referencia» se hará con
la misma regla sobre ambos SVG (A3), donde esas colisiones sí cuentan.
