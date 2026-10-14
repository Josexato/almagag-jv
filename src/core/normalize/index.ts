/**
 * Preprocesado del documento, en el ORDEN del oráculo (generator.py v3.20.0):
 * parse → guardas [formato] → schema que habla → unions §H7 → semantics §Q63
 * → theme §O57 → select_strategy (§O53) → avisos de template → modelo tipado.
 */

import { FormatError, type Log } from '../log.ts';
import { buildDiagram, type Diagram } from '../model/diagram.ts';
import { JsonSyntaxError, type ParsedJson, parseJson } from '../parse/json.ts';
import { pyStr } from '../parse/pyrepr.ts';
import { type Profile, selectStrategy, type View } from '../strategy/select.ts';
import { applyFormatGuards } from './guards.ts';
import { type Doc, isDict, isList, truthy } from './py.ts';

import { auditSchema } from './schema.ts';
import { applyEmbeddedSemantics, applyTheme, expandUnions, type UnionInfo } from './vocab.ts';

export interface Normalized {
  readonly parsed: ParsedJson;
  readonly doc: Doc;
  readonly profile: Profile;
  readonly unions: UnionInfo;
  readonly diagram: Diagram;
}

/** Templates que el oráculo reconoce (layout/templates). Se aplican en la fase 2. */
export const KNOWN_TEMPLATES = new Set([
  'architecture',
  'steps',
  'hub_and_spoke',
  'dashboard',
  'er',
  'sequence',
  'state',
]);

export function normalize(text: string, view: View, log: Log): Normalized {
  let parsed: ParsedJson;
  try {
    parsed = parseJson(text);
  } catch (e) {
    if (e instanceof JsonSyntaxError)
      throw new FormatError(`[formato] JSON inválido: ${e.message}`);
    throw e;
  }
  if (parsed.bom)
    log.info('[jv] el archivo empieza con BOM UTF-8 — se ignora (el oráculo lo rechaza)');
  const doc = parsed.value;
  if (!isDict(doc)) {
    throw new FormatError('[formato] la raíz del documento debe ser un objeto JSON {...}');
  }

  applyFormatGuards(doc, parsed, log);
  auditSchema(doc, parsed, log);
  dropIgnored(doc, log);
  const unions = expandUnions(doc, parsed, log);
  applyEmbeddedSemantics(doc, parsed, log);
  applyTheme(doc, log);
  const profile = selectStrategy(doc, view, log);
  templateNotices(doc, parsed, profile, log);
  const diagram = buildDiagram(doc, parsed, unions, log);
  return { parsed, doc, profile, unions, diagram };
}

/**
 * Lo que el schema anunció «se ignora» se ignora DE VERDAD (el oráculo a veces
 * revienta después del aviso: canvas no-objeto, ítems no-objeto). El documento
 * conserva esos valores (su repr es comparable con el del oráculo); las
 * pasadas y el modelo tipado los saltean.
 */
function dropIgnored(doc: Doc, log: Log): void {
  if (doc.has('canvas') && doc.get('canvas') !== null && !isDict(doc.get('canvas'))) {
    log.info('[jv] canvas no-objeto: se ignora tal como anunció [schema] (el oráculo revienta)');
  }
  const conns = doc.get('connections');
  if (doc.has('connections') && conns !== null && !isList(conns)) {
    log.warning(
      `[jv] 'connections' no es una lista — se ignora (el oráculo revienta o la itera como texto)`,
    );
    doc.set('connections', []);
  } else if (doc.has('connections') && conns === null) {
    log.warning(`[jv] 'connections' es null — se trata como lista vacía (el oráculo revienta)`);
    doc.set('connections', []);
  }
}

function templateNotices(doc: Doc, p: ParsedJson, profile: Profile, log: Log): void {
  if (!doc.has('layout_template')) return;
  const t = doc.get('layout_template');
  const name = pyStr(p, doc, 'layout_template');
  if (profile === 'hier') {
    if (truthy(t))
      log.info(`Layout template '${name}' omitido: motor hier hace su propio placement`);
    return;
  }
  if (t === 'auto') {
    log.warning(
      "[jv] layout_template 'auto' (auto-detección) se implementa en la fase 2 — se ignora por ahora",
    );
  } else if (truthy(t)) {
    if (typeof t === 'string' && KNOWN_TEMPLATES.has(t)) {
      log.warning(
        `[jv] layout_template '${name}' reconocido; su colocación llega en la fase 2 — se ignora por ahora`,
      );
    } else {
      log.warning(`Layout template '${name}' desconocido — ignorado`);
    }
  }
}
