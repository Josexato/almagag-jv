# AlmaGag-TS — propuesta de arranque (entregable previo a la fase 0)

Referencia congelada: **AlmaGag Python v3.20.0** (commit `9c7087d`, merge de
josexato/AlmaGag#113). Todo lo de este documento se midió ejecutando el oráculo
y no sólo leyéndolo. La suite Python corre así: 657 passed, 1 failed y 3 skipped.
El único fallo es `test_exportpng`, por un módulo de export PNG que falta en el
venv; ese export sale del núcleo.

## 1. Hallazgos medidos que cambian el plan

| # | Hallazgo | Evidencia | Consecuencia |
|---|---|---|---|
| H1 | Los 40 fixtures de `docs/diagrams/gags/` cubren 33 casos auto y 7 hier, pero **cero** usan `canvas.partition`, `steps`, `columns` o genealogías. Sólo 2 usan `journeys` y 2 usan `areas`. | Inventario de claves (`golden/REFERENCE-v3.20.0.md`). | El golden de fixtures **no juzga** partition, serpenteo, peine ni T-joint. Hace falta un **golden de constructos** (ver fase 0). |
| H2 | En auto, el ruteo por defecto es **recto** y puede ser diagonal. El ortogonal sin diagonales es propiedad de hier y del `routing` declarado. | Caso de 4 nodos: 2 de 4 `<line>` salen diagonales (`x1=185.6 → x2=154.4`). | Hay que decidir si se mantiene la paridad (pregunta P1). |
| H3 | **Lo medido no es lo dibujado** en tres puntos. (a) Los arcos y bezier se miden por su cuerda (BUGS-LOG-003). (b) El render recorta los extremos al borde (K34) después de medir. (c) La geometría de bandas de journeys se calcula en el renderer y no se mide. | `layout/metrics.py`, `draw/primitives/connections.py` y `journeys.py`. | Decisión A3: se mide la lista de dibujo final. |
| H4 | `Layout.copy()` copia los dicts de conexión de forma **superficial**. Rutear un candidato rechazado muta `computed_path` y unas 13 claves `_*` del «best». | `CONTEXT_ATTRS` en `layout.py` y el bucle de 10 iteraciones de `auto/optimizer.py`. | Decisión A1: escena inmutable con tipos. |
| H5 | 15 de los 40 fixtures traen `x`/`y` manuales (137 elementos) y 9 declaran `routing`. | Inventario. | El formato sagrado **incluye** coordenadas heredadas: se aceptan y se respetan (es compatibilidad, no un knob nuevo). |
| H6 | Los 40 fixtures son deterministas: 2 corridas dan el mismo SVG byte a byte. | `deterministic: true` en `golden/reference-v3.20.0.json`. | El motor TS también tiene que serlo, y se testea. |
| H7 | La banda «pasea» usa el chequeo `blen > 1.25 × csum`: es sólo un ratio, sin piso absoluto. | `draw/primitives/journeys.py:377`. | Se arregla en el diseño con ficha propia (ver §6). |

## 2. Nombre y empaquetado

- **Repo**: `Josexato/almagag-jv`, el que ya existe y está vacío (es el que tengo
  en alcance). Si prefieres `almagag-ts`, se renombra en GitHub sin costo.
- **Paquete npm**: `almagag-ts`. Exporta `render(json: string, opts?) → { svg, log, metrics }`.
- **CLI**: `almagag-ts archivo.sdjf [-o salida.svg] [--view …] [--metrics]`.
  Imprime la misma línea de audit `[motor] cruces(arista×arista)=…`.

## 3. Stack exacto

Las versiones se fijan con lockfile en la fase 0.

| Pieza | Elección | Por qué / contra |
|---|---|---|
| Lenguaje | TypeScript 5.x con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` y `noImplicitOverride` | Que el type-checker haga el trabajo de los tests de humo (H4). Contra: `exactOptional` es verboso al normalizar el JSON. |
| Runtime | Node 22 LTS para el CLI y los tests; ES2022 en browser | El núcleo no importa `node:*`; una regla de lint lo prohíbe. |
| Build | **tsup** (esbuild): ESM para browser y Node, más `.d.ts`; el CLI va en un bundle aparte | Rápido y sin configuración. Contra: los `.d.ts` pasan por rollup-plugin-dts. Se descarta Vite lib-mode por ser más pesado para una librería pura. |
| Tests | **Vitest** más **fast-check** para propiedades | ESM nativo, el mismo runner en Node y en modo browser, y `fast-check` genera grafos aleatorios para ortogonalidad, travesías y determinismo. Contra Jest: ESM incómodo. |
| Lint/format | **Biome** | Un binario, sin el árbol de plugins de eslint. Contra: menos reglas; la prohibición de `node:*` en `src/core` va como script de CI. |
| Visual | **Playwright** (ya instalado: 1.56 + Chromium) | SVG → PNG para «renderizar y MIRAR» y para la demo browser. Vive en `tools/`, nunca en el núcleo. |
| Dependencias de runtime | **Cero** | Emisor de strings propio y parser XML liviano para `icons`; nada de DOMParser. |
| CI | GitHub Actions con `typecheck`, `lint`, `test` y `golden` (compara contra `golden/*.json`) | El golden es un job que falla si un contador empeora sin explicación. |

## 4. Decisiones de arquitectura donde me aparto del Python

**A1 · Escena inmutable y tipada en lugar de dicts con banderas.**
`Scene { elements: ReadonlyMap<Id, Node>, edges: ReadonlyMap<EdgeId, Edge>, areas, … }`.
`Edge.route` es una unión discriminada (`straight | ortho | arc | bezier | manual`)
con puntos tipados. Cada pasada es `(scene) => scene` con structural sharing:
revertir es quedarse con la referencia anterior. Así desaparecen las ~25 claves
`_*` (de `_from_port` a `_family_joint`) y el bug de `copy()` superficial (H4)
no se puede escribir. `EdgeId` es un id estable por arista, no `"from->to"`: el
Python hace colisionar las aristas paralelas en `connection_labels`.

**A2 · Un pipeline con capacidades, no tres motores.**
`select_strategy` se conserva como **contrato observable**: el mismo orden de
señales y los mismos WARNING §O53. Por dentro, cada señal sólo activa
capacidades sobre un único pipeline de pasadas declaradas:

`normalizar → niveles/ciclos → contenedores (bottom-up) → macro-plano (áreas | partition | zonas near) → colocación por celda (columnas | serpenteo | genealogía) → puertos → ruteo → dodge → recorte de codos → labels (anticolisión global) → journeys → emisión`.

auto y hier pasan a ser **perfiles**, es decir, listas de pasadas con parámetros.
El perfil se nombra en el log (`[auto]`/`[hier]`) para que la línea de audit no
cambie. `legacy` no se porta.

**A3 · Lo dibujado es lo medido, por construcción.**
La emisión ocurre en dos etapas.
1. `scene → DrawList`: primitivas con coordenadas finales. Incluye el recorte de
   extremos K34, los arcos y bezier poligonalizados con tolerancia de 0.5 px y
   las bandas de journeys.
2. `DrawList → SVG string`: impresión pura que redondea a 2 decimales (el Python
   emite `162.00000000000512`).

El audit **sólo** lee la DrawList. Con eso se cierran por diseño BUGS-LOG-003 y
los dos huecos de H3.
Como una regla más honesta puede *subir* contadores, el golden mide **con la
misma regla a los dos motores**: el auditor TS parsea también el SVG del Python
(svgwrite emite un subconjunto chico: `line`, `path`, `polyline`, `rect`,
`text`). La tabla final lleva tres columnas: Python según su log, Python medido
por el auditor TS, y TS. El criterio «≤ referencia» se evalúa contra la segunda.

**A4 · Modelo de obstáculos unificado con métricas incrementales.**
Un único `ObstacleIndex`: icono, label, contenedor, celda y banda, cada uno con
`core`/`outer` y su dueño, sobre una grilla hash espacial. Lo usan el ruteo, el
dodge, el recorte de codos, la anticolisión de labels y las bandas, en lugar de
los recálculos ad-hoc de cada pasada. Las métricas son un servicio sobre ese
índice: `metrics.delta(scene, scene')` cuesta lo que cambió. El patrón
*probar → medir → revertir* pasa a ser una primitiva de librería
(`tryPass(scene, pass, accept)`) y deja de ser código repetido.

**A5 · Iconos como datos y determinismo como test.**
Los 12 iconos builtin dejan de ser funciones que dibujan con svgwrite y pasan a
ser plantillas SVG de 80×50 con tokens (`{{fill}}`, `{{gradId}}`). El mismo
camino sirve para los iconos embebidos (`currentColor`, `viewBox` y escala
uniforme `min(80/w, 50/h)`).
Hay un test de determinismo por fixture, y en el núcleo no se usa `Math.random`
ni se itera sobre `Set`/objetos sin orden estable.

## 5. Plan de fases con estimación honesta

Unidad de estimación: el **bloque**, una sesión de trabajo con commit → PR →
merge, de unas 1.5 a 3 kLOC TS netas más sus tests. Volumen a portar: unas
**20.000 líneas Python** de núcleo, contando ya fuera `legacy` (11.390), el
código muerto, debug y templates. Con A1–A4 calculo **13–17 kLOC TS**.

| Fase | Contenido | Cierre medible | Bloques |
|---|---|---|---|
| **0 · Esqueleto** | Repo strict, build dual, CI, CLI mínimo, harness golden (lee `golden/*.json` y compara), auditor TS de SVG ajeno (A3) y **golden de constructos**: unos 25 `.sdjf` públicos nuevos (partition bsp/grid, serpenteo ≥5, peine, T-joint, bus, journeys, roles/status/legend, theme, unions, `flow:up`), medidos con el Python v3.20.0 y con su PNG mirado. | `npm test` verde; golden ×2 (fixtures + constructos) con columna «Python medido por TS». | 1–2 |
| **1 · Formato + validación + emisión mínima** | Parser y normalizador con el «schema que habla» (los mismos WARNING y ValueError en español), unions, theme, semantics, `select_strategy` con §O53, iconos como datos, BWT §O55, O50, O51 y O56, todo sobre una colocación trivial. | Mismo motor elegido que el Python en 40/40 fixtures; mismos mensajes `[schema]`; PNG mirado. | 2 |
| **2 · Layout** | Niveles/SCC, columnas con barycenter, contenedores rígidos, áreas, partition con compactación por intervalos, zonas near/banda, serpenteo y genealogías. | Propiedades: estructura de partition intacta y ratios como máximos. Contadores de tinta y aspecto en ±15%. | 4–6 |
| **3 · Ruteo** | Puertos, corredores, bus, abanico, ortogonal con grafo de visibilidad, y dodge + recorte de codos sobre el `ObstacleIndex`. | Cruces, arista×nodo y labels ≤ referencia (misma regla) en los dos goldens; propiedades de travesías = 0 y codos fuera de iconos. | 3–4 |
| **4 · Emisión completa** | Leyendas (enlaces, recorridos, estados), journeys/bandas, callouts, contenedores, banda de contrato y O52. | Tests de O-contratos sobre el SVG; PNG mirado de todos los fixtures. | 2 |
| **5 · Audit + demo** | Audit completo, validador R1/R2/R3, golden total y una página browser que carga un `.sdjf` y renderiza en vivo (base para GAG-WV). | Tabla final de referencia vs nuevo; demo publicada. | 2 |
| **Total** | | | **14–18 bloques** |

Riesgo principal: la fase 2 de auto. `positioner.py` tiene 1.974 líneas y
`optimizer.py` 1.592, con un bucle heurístico de 10 iteraciones. Ahí la paridad
de contadores puede costar más que la del layout hier. Mitigación: el golden por
fixture se mide desde la fase 2 y no al final.

## 6. Tickets heredados y propios desde el día uno

| Ticket | Origen | Tratamiento |
|---|---|---|
| TS-LOG-001 (= BUGS-LOG-003) | Arcos medidos por cuerda | **Se resuelve por diseño** (A3, DrawList poligonalizada). |
| TS-DRAW-001 (nuevo) | Banda «pasea»: sólo ratio `1.25` | Se agrega un piso absoluto: `blen − csum > max(0.25·csum, 40 px)`. El valor de 40 px se calibra midiendo en la fase 4. |
| TS-AUDIT-001 (nuevo) | Bandas de journeys y recorte K34 sin medir (H3) | **Se resuelve por diseño** (A3). |
| TS-ARCH-001 (nuevo) | Aristas paralelas que colisionan por la clave `"from->to"` | **Se resuelve por diseño** (`EdgeId`, A1). |
| BUGS-LAYOUT-013, WISH-VAL-001, WISH-DRAW-008 | Abiertos en Python | Se heredan como abiertos; no se persiguen antes de la paridad. |

## 7. Preguntas que necesito que respondas antes de la fase 0

1. **P1, ruteo por defecto en auto (H2).** El Python dibuja rectas, incluso
   diagonales, cuando no hay `routing`. ¿Mantengo la paridad, o el motor TS
   rutea ortogonal por defecto? Ortogonal por defecto **cambia el aspecto de 26
   de los 33 fixtures auto**, que son los que tienen al menos una conexión sin `routing`, y saca la comparación de cruces del criterio «≤
   referencia». *Recomiendo* paridad durante las fases 0–5 y ortogonal por
   defecto como fase posterior, con su propio golden.
2. **P2, repo.** ¿Me quedo en `almagag-jv` o lo renombras a `almagag-ts`?
3. **P3, fixtures.** Copio los 40 fixtures públicos (MIT, mismo autor) a
   `fixtures/py-v3.20.0/` para que la CI no dependa del repo Python. El oráculo
   Python sólo se ejecuta para regenerar el golden, nunca en la CI. ¿OK?
