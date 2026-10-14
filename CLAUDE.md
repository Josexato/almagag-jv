# almagag-jv — guía para Claude

Reescritura en TypeScript (browser + Node) de AlmaGag. Referencia congelada:
**AlmaGag Python v3.20.0** (`golden/PROVENANCE.json`). Autor: José Cáceres (@Josexato).

## Regla de oro

El código del Python gana a sus docs, y la EJECUCIÓN gana al código leído.
Ante duda de comportamiento: correr el oráculo Python con un caso mínimo y
medir. El repo Python es de SÓLO LECTURA: jamás se modifica.

## Lo sagrado

Formato `.sdjf`/`.gag` · frontera §R (el archivo declara intención, el motor
decide TODA la geometría) · contratos O · doctrina del audit (lo dibujado es
lo medido; toda violación se NOMBRA, en español neutro y con números) ·
conquistas de comportamiento. Detalle: `docs/PROPUESTA-v0.md`, `docs/DECISIONES.md`.

## Cómo se trabaja

- Un criterio por commit, con su test. Suite siempre verde: `npm run ci`.
- Golden: `npm run golden` (compuertas en `golden/gates.json` por fase).
  Ningún contador empeora sin explicación numérica en el commit.
- Renderizar y MIRAR: `npm run png -- out/ts --out out/png --sheet out/hoja.png`.
- Núcleo puro (`src/core`): sin `node:*`, sin DOM, sin `Math.random`
  (`tools/check-core-purity.mjs` + `tsconfig.core.json` sin tipos de Node).
- Español neutro en docs, commits y reportes; números medidos, no adjetivos.
- Tickets en `docs/TECHNICAL_DEBT.md`; fases en `docs/ROADMAP.md`;
  hallazgos del Python en `docs/HALLAZGOS-PYTHON.md`.
- Versionado 0.x declarando siempre la versión Python de referencia.

## Seguridad de fixtures

Los archivos de casos reales que el autor suba al chat contienen nombres
reales: viven SÓLO en el scratchpad de la sesión, JAMÁS entran al repo. Los
fixtures del repo son públicos (`fixtures/py-v3.20.0/` copiados del repo
Python, MIT) o genéricos (`fixtures/constructos/`).
