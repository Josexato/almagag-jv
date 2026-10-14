# Cierre fase 1 — almagag-jv 0.1.0

Referencia: AlmaGag Python **v3.20.0** @ `9c7087d5861d` (`golden/PROVENANCE.json`).
Alcance: formato + validación + emisión mínima sobre colocación trivial.

## Jueces y resultados

Cada juez compara contra una EJECUCIÓN del oráculo sin modificar su repo:
interceptores en tiempo de ejecución o llamadas directas a sus funciones.

| Juez | Qué compara | Casos | Resultado |
|---|---|---:|---|
| Parser JSON ≡ `json.loads` | `repr()` de CPython 3.13 de documentos aleatorios + rechazos | 2000 + 15 | 2000/2000, 15/15 |
| Preprocesado ≡ `generate_diagram` real | mensajes con compuerta (en orden), motor, `repr()` del documento normalizado | 370 documentos (67 fixtures + 303 casos) | 370/370 · **857 mensajes idénticos** · 365 `repr` idénticos |
| Iconos ≡ `draw_icon_shape` real | árbol XML (tolerancia 0.006 sólo en decimales) | 230 (20 types × 10 colores + embebidos) | 230/230 |
| Emisión ≡ `finalize_svg` real | §O51 viewBox/width/height (string exacto) + §O50 árbol | 400 SVG sintéticos (283 recortados, 419 halos) | 400/400 |
| §O55 ≡ corrida completa del oráculo | conjunto de avisos por fixture | 66 fixtures, 16 avisos | 66/66 |
| Contratos O sobre el SVG emitido | O50 · O51 · O55 · O56 · determinismo · sin NaN | 67 fixtures | 67/67 |
| Golden fase 1 (CI) | procedencia, sha256, motor, mensajes, SVG válido, determinismo | 67 fixtures | motor 66/66 · 26 mensajes con compuerta idénticos · 0 fallas |

Mensajes con compuerta por familia (juez de preprocesado): `[schema]` 477,
`[formato]` 134, §Q64 130, §H7 34, §O57 28, §Q63 18, template 17, §O53 10,
iconos embebidos 9.

**Sensibilidad probada con sabotaje.** Si `adjust_lightness` usa `round` en
vez de `trunc`, fallan 116 de 230 iconos. Un corrimiento de +0.01 en x rompe
180 de 230. Las plantillas con el defecto del color rompen 61 de 231. Alterar
el texto de §Q64 rompe 3 de 67 fixtures en el golden.

## Donde el oráculo revienta

En las 370 entradas, el Python revienta en 53 si se mira la corrida completa:

- 41 son PY-001 (self-loop en hier).
- 12 son otros crashes: falta `id`, falta `to`, raíz no objeto, label
  numérico, `areas`/`canvas` no-objeto, `routing: null`.

El TS da FormatError nombrado en 5 y completa las otras 48. En ninguna
termina con un error crudo.

## Lo que encontró MIRAR (no los tests)

1. **La cinta del BWT salía negra.** El extractor tokenizaba el `00` de
   `#ffff00`. El test de paridad lo dejaba pasar porque comparaba `00` y `0`
   como números iguales. Se corrigieron los dos y quedó una regresión fijada.
2. **Aparecía un §O55 falso sobre contenedores** (c18). Ahora el contenedor
   es una caja provisional, y quedó un juez §O55 contra el oráculo (66/66).

Lección de proceso: dos reemplazos por script fallaron en silencio porque
el formateador había cambiado el texto. Ahora todo reemplazo afirma que
encontró su objetivo.

## Hallazgos nuevos en el oráculo (docs/HALLAZGOS-PYTHON.md)

| ID | Qué pasa |
|---|---|
| PY-001 | Confirmado ×41 en casos aleatorios. |
| PY-002 | Precisado con una matriz ejecutada de 6 casos. |
| PY-008 | `areas` con un ítem no-objeto: el schema dice «se ignora» y después hier revienta con `TypeError`. |
| PY-009 | `routing: null` revienta el ruteo con `AttributeError`. |
| PY-010 | Un label numérico da un traceback en vez de un aviso. |
| PY-011 | `type: "bwt"` declarado revienta el render: la firma de `draw_bwt` no coincide con la llamada. |

## Performance y tamaño

| Medida | Valor |
|---|---|
| c26 (60 nodos) en Node | mediana 22.5 ms · p95 51.6 ms |
| c26 en Chromium | 38.3 ms |
| Presupuesto | < 1000 ms |
| Bundle del núcleo | 99.0 KB (25.0 KB gzip) |
| Plantillas de iconos | 33.7 KB |

El costo nuevo frente a la fase 0 (~2 ms) es parsear y recortar 110 KB de
SVG (TS-PERF-002). A3 lo elimina.

## Suite

1241 tests (era 93 en la fase 0). Compuertas activas en CI: procedencia,
sha256, sin excepción, SVG válido, motor, determinismo, mensajes.

## Imagen

`docs/reportes/fase1-motor-ts-constructos.png`: los 27 constructos tal como
los emite el motor TS (colocación trivial, iconos reales).

## Pendiente (no es de esta fase)

- Templates (`steps`, `architecture`…): se avisan con `[jv]` y se aplican en
  la fase 2.
- Leyenda libre en todos los perfiles: fase 4.
- Contenedores reales: fase 4.
