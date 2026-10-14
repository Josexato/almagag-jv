# almagag-jv

Reescritura en TypeScript, para browser y Node, del motor de diagramas
[AlmaGag](https://github.com/Josexato/AlmaGag): string JSON `.sdjf`/`.gag` →
string SVG, sin DOM ni filesystem en el núcleo.

- **Referencia (oráculo congelado):** AlmaGag Python **v3.20.0** — `golden/PROVENANCE.json`.
- **Versión:** 0.0.1 — fase 0 cerrada (esqueleto). El motor todavía emite una
  colocación trivial; ver [`docs/ROADMAP.md`](docs/ROADMAP.md).

```bash
npm ci
npm run ci                                   # typecheck · lint · test · build · golden · bench
node dist/cli.js archivo.sdjf -o salida.svg  # CLI (o `npx almagag-jv` instalado)
```

```ts
import { render } from 'almagag-jv';
const { svg, profile, log } = render(jsonString, { view: 'auto' });
```

| Doc | Qué contiene |
|---|---|
| [`docs/PROPUESTA-v0.md`](docs/PROPUESTA-v0.md) | propuesta aceptada (stack, A1–A5, fases) + fe de erratas |
| [`docs/DECISIONES.md`](docs/DECISIONES.md) | decisiones propias y heredadas |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | fases, presupuesto de performance, alcance explícito de cada flag/vista |
| [`docs/TECHNICAL_DEBT.md`](docs/TECHNICAL_DEBT.md) | tickets `TS-*` |
| [`docs/HALLAZGOS-PYTHON.md`](docs/HALLAZGOS-PYTHON.md) | bugs del oráculo encontrados midiendo |
| [`golden/REFERENCE-v3.20.0.md`](golden/REFERENCE-v3.20.0.md) | tablas golden de ambos corpus |
| [`docs/reportes/FASE-0.md`](docs/reportes/FASE-0.md) | cierre de la fase 0 con números |
