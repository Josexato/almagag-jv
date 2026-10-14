# Decisiones de diseño

Cada decisión dice de dónde viene: **propia** (me aparto del Python, con
razón) o **heredada** (contrato del Python que se conserva a propósito).

## Propias (A1–A5, aceptadas por el autor en el kickoff)

- **A1 · Escena inmutable y tipada.** `Scene` con `IMap` (sin `set`/`delete`,
  valores congelados) y pasadas `(Scene) => Scene`. Mata por diseño el bug de
  `Layout.copy()` superficial del Python (H4, confirmado por el autor
  ejecutando). Congelado como propiedad en
  `test/scene-immutability.test.ts`: mutar un candidato jamás toca otra
  escena (300 casos aleatorios por corrida). *Riesgo aceptado:* copia por
  candidato en el optimizer de auto → presupuesto de performance medido
  desde la fase 2 (ver ROADMAP).
- **A2 · Un pipeline con capacidades.** `select_strategy` es contrato
  observable (orden de señales + mensajes §O53 textuales,
  `src/core/strategy/select.ts`); auto/hier son perfiles.
- **A3 · Lo dibujado es lo medido.** Audit sobre la DrawList final; el
  golden mide ambos motores con la misma regla.
- **A4 · `ObstacleIndex` único + métricas incrementales.**
- **A5 · Iconos como datos + determinismo como test** (el núcleo prohíbe
  `Math.random`; `tools/check-core-purity.mjs`).

## Heredadas

- **H-01 · Journeys invisibles a métricas.** Las bandas de `journeys` son
  capa de ANOTACIÓN (`class="ag-journey"`): no se miden en el audit, no son
  obstáculo de ruteo ni de validador. Es contrato (spec §5.8 «invisibles
  para métricas, ruteo y validador»), no divergencia. A3 NO las mide; la
  higiene propia de la banda (W83 «pasea») sigue siendo un aviso del
  emisor. *(Corrige el hallazgo H3c de la propuesta, por indicación del
  autor.)*
- **H-02 · Rectas por defecto en auto** hasta cerrar la paridad (fase 6
  decide ortogonal por defecto con golden propio). Sin esto el golden pierde
  sentido en 26 de los 34 fixtures auto.
- **H-03 · Coordenadas `x`/`y` heredadas se aceptan y respetan** (15 de los
  40 fixtures; 137 elementos). No es un knob nuevo: es compatibilidad del
  formato sagrado.
- **H-04 · El archivo nunca elige vista.** `--view` sólo por CLI; el corpus
  de constructos declara la vista en `fixtures/constructos/views.json`, fuera
  del `.sdjf` (frontera §R).

## Fase 1

- **D-01 · El preprocesado imita la semántica de Python, no la de JS.**
  Parser JSON propio (≡ `json.loads`, objetos como `Map` para el orden del
  dict, int/float distinguidos, NaN/Infinity), truthiness de Python, `str()`/
  `repr()`/`sorted()`/`.lower()` de CPython. Razón: los mensajes del schema
  son contrato carácter a carácter (857 comparados).
- **D-02 · Iconos extraídos del oráculo, no transcritos** (A5 llevado a
  datos): `golden/scripts/extract_icons.py` verifica linealidad en x,y y
  predice una tercera posición antes de escribir las plantillas.
- **D-03 · El TS es «igual o mejor» donde el oráculo revienta o calla**, y
  lo nombra con la etiqueta `[jv]`, que queda FUERA de la igualdad de
  mensajes (se cuenta aparte): 14 diagnósticos en 370 documentos.
- **D-04 · El post-proceso de emisión es el del oráculo** (finalize_svg:
  O51 + O50 sobre el árbol SVG), portado y verificado (400/400). En A3 se
  reemplaza por el cálculo sobre la DrawList, con este golden como juez.

## Nombre

Repo, paquete npm y CLI: **`almagag-jv`** (un nombre, una cosa).
