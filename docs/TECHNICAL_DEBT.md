# Tickets — almagag-jv

Formato heredado: `TS-<ÁREA>-NNN`. Estado: 🟢 cerrado · 🟡 abierto · 🔵 por diseño (se resuelve con la arquitectura, verificar al implementar).

| Ticket | Estado | Origen | Descripción | Tratamiento |
|---|---|---|---|---|
| TS-LOG-001 | 🔵 | = BUGS-LOG-003 (Python) | Arcos/bezier medidos por su cuerda | A3: la DrawList poligonaliza (tolerancia 0.5 px); fase 3/5 |
| TS-DRAW-001 | 🟡 | nuevo (heredado sin ticket en Python) | Banda «pasea»: chequeo sólo por ratio `1.25`, sin piso absoluto (falso positivo en c19: 240 vs 126 px) | `blen − csum > max(0.25·csum, 40 px)`; calibrar 40 px en fase 4 midiendo c19 + 16/journeys |
| TS-AUDIT-001 | 🔵 | H3a/H3b de la propuesta | Recorte de extremos K34 tras medir | A3; fase 4. (H3c — journeys — NO es ticket: es contrato, DECISIONES H-01) |
| TS-ARCH-001 | 🟢 | H4 / `"from->to"` | Aristas paralelas colisionaban por clave; estado colgado de copias | `EdgeId` + `IMap` (v0.0.1); propiedad en `test/scene-immutability.test.ts` |
| TS-AUDIT-002 | 🟡 | PY-005 | `icon_vs_icon` no se cuenta en ningún contador | Decidir con el autor en fase 5 si suma a `arista×nodo`, a `labels` o a contador nuevo (cambia la línea de audit, que es contrato) |
| TS-EMIT-001 | 🟡 | PY-003/PY-004 | El recorte O51 debe incluir la tinta real (labels a la izquierda, leyendas) | Por diseño con A3 (bbox sobre la DrawList), verificar en fase 4 con c10/c21 |
| TS-FMT-001 | 🟡 | PY-002 | `canvas.legend`: strings aceptados según spec; hier no debe perder la leyenda | Fase 1 (schema) + fase 4 (emisión en todos los perfiles) |
| TS-HIER-001 | 🟡 | PY-001 | Self-loop en hier no debe reventar | Fase 2: el self-loop no participa del cálculo de niveles; se dibuja como arco (c27) |
| TS-PERF-001 | 🟡 | autor (kickoff fase 0) | c26 (60 nodos) < 1000 ms en browser | Compuerta `npm run bench` en CI desde fase 0 (trivial: 2.05 ms p95); medición browser en fase 2 |
| TS-CI-001 | 🟢 | fase 0 | npm 10.9 `Cannot read properties of null (reading 'edgesOut')` al resolver peers opcionales de vitest | `.npmrc` `legacy-peer-deps=true` (peers opcionales no usados: jsdom, happy-dom, @vitest/browser-*) |

Heredados del Python, abiertos, no se persiguen antes de la paridad:
BUGS-LAYOUT-013, WISH-VAL-001, WISH-DRAW-008, WISH-ARCH-004/006/007/008.
