# Hallazgos en AlmaGag Python v3.20.0 (para fichar en el repo Python)

Encontrados al medir el corpus de constructos con el oráculo (`9c7087d`).
Todos se reprodujeron ejecutando. El motor almagag-jv los trata como
referencia: donde el Python revienta o calla, almagag-jv debe ser IGUAL o
MEJOR (no reventar, nombrar).

| ID | Severidad | Hallazgo | Reproducción mínima | Fixture |
|---|---|---|---|---|
| **PY-001** | crash (×41 en casos aleatorios) | Un **self-loop** dispara hier (`_has_cycle` lo cuenta como ciclo) y `hier/columns.py:144 longest` recursa al infinito: `RecursionError`. Un ciclo de 2 nodos sin self-loop renderiza bien. | `{"elements":[{"id":"a"},{"id":"b"}],"connections":[{"from":"a","to":"b"},{"from":"b","to":"b"}]}` | `c27-selfloop-hier.sdjf` |
| **PY-002a** | aviso falso | Una entrada **string** en `canvas.legend` dispara `[schema] canvas.legend[0] no es un objeto (str) — se ignora`, pero en **auto** el string **sí se dibuja** («Leyenda: Texto libre», verificado en PNG). En hier no se dibuja (ver PY-002b). | matriz abajo, caso `str/auto` | — |
| **PY-002b** | pérdida silenciosa | En **hier** (con `areas`) la entrada **objeto** `{label, color}`, que el schema acepta SIN aviso, no se dibuja y no se nombra. Es lo que pasa en c20 (string + objeto + áreas → hier). | matriz abajo, caso `obj/hier` | `c20-roles-status-legend.sdjf` |
| **PY-003** | tinta recortada | O51 recorta labels a la **izquierda** del icono en la vista columns: «Revisar solicitud» sale como «sar solicitud», «¿Completa?» pierde el «¿». | `c10-columns-decision.sdjf` (PNG) | `c10` |
| **PY-004** | colisión no medida | La leyenda «Enlaces:» se monta sobre el label «Monitoreo» y su último ítem («error») queda fuera del viewBox; `labels=0`. | `c21-theme-semantica-estilos.sdjf` (PNG) | `c21` |
| **PY-005** | colisión no medida | Dos iconos **en la misma posición exacta** (`bd` y `cache` en x=435.36, y=50) y el audit reporta `labels=0`: `icon_vs_icon` no entra a ningún contador. | `c21-theme-semantica-estilos.sdjf` | `c21` |
| **PY-008** | crash tras «se ignora» | `areas` con un ítem no-objeto: `[schema] areas[1] no es un objeto (str) — se ignora`, pero hier revienta en `hier/areas.py:579` con `TypeError: string indices must be integers`. | `golden/preproc-inputs.json` → `schema-area`, `schema-items-no-objeto` | — |
| **PY-009** | crash | `routing: null` pasa la guarda `[formato]` (`_r is not None`) y revienta en `routing/router_manager.py:104` con `AttributeError: 'NoneType' object has no attribute 'get'`. | `{"elements":[{"id":"a"},{"id":"b"}],"connections":[{"from":"a","to":"b","routing":null}]}` | — |
| PY-010 | crash sin nombre | `label` numérico revienta con `AttributeError: 'int' object has no attribute 'split'` (traceback, no mensaje). | `{"elements":[{"id":"a","label":123}]}` | — |
| PY-006 | observación | `area.role` con 5 bandas produce una cinta 1×N vertical (aspecto 0.12); §O52 lo NOMBRA pero la spec promete «nunca una cinta 1×N». | `c13-areas-roles-banda.sdjf` | `c13` |
| PY-007 | observación | Falso positivo de «pasea» en banda corta (ticket heredado): `240px de trazo contra 126px de conexiones (ratio 1.90 > 1.25)`. Confirma TS-DRAW-001. | `c19-journeys-areas.sdjf` | `c19` |

### Matriz PY-002 (ejecutada sobre `9c7087d`)

Caso base: `{"canvas":{"legend":L},"elements":[{"id":"a","type":"server","label":"A"},{"id":"b","type":"server","label":"B"}],"connections":[{"from":"a","to":"b"}]}`;
con áreas se agrega `"areas":[{"id":"P","label":"P","members":["a","b"]}]` (→ hier).
`L_str = ["Texto libre"]`, `L_obj = [{"label":"Swatch rojo","color":"#c62828"}]`.
Conteo = apariciones del texto en el SVG emitido (`grep -c`).

| legend | áreas | motor | aviso `[schema]` | «Texto libre» | «Swatch rojo» | Lectura |
|---|---|---|---:|---:|---:|---|
| str | no | auto | 1 | 1 | — | avisa «se ignora» y lo dibuja → **PY-002a** |
| str | sí | hier | 1 | 0 | — | avisa e ignora: consistente |
| obj | no | auto | 0 | — | 1 | correcto |
| obj | sí | hier | 0 | — | 0 | **no avisa y no dibuja → PY-002b** |
| str+obj | no | auto | 1 | 1 | 1 | PY-002a |
| str+obj | sí | hier | 1 | 0 | 0 | PY-002b (c20) |

Nota para la verificación del autor: «ambos motores avisan e ignoran con
strings» coincide con la fila `str/hier`; la divergencia está en
`str/auto` (dibuja pese al aviso) y en `obj/hier` (pérdida sin aviso).

Consecuencia para el golden de almagag-jv: PY-003/004/005 significan que la
referencia **sub-mide** en c10/c21. La comparación «≤ referencia» se hará con
la misma regla sobre ambos SVG (A3), donde esas colisiones sí cuentan.
