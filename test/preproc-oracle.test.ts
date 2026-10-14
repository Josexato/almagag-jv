/**
 * Juez de la fase 1: el preprocesado TS ≡ el del oráculo Python v3.20.0 en
 * 370 documentos (67 fixtures + 303 casos de golden/preproc-inputs.json),
 * medidos por golden/scripts/measure_preproc.py sobre el generate_diagram REAL.
 *
 * Por documento: (1) mensajes etiquetados idénticos y en orden, (2) mismo
 * motor, (3) mismo repr() del documento normalizado, (4) si el oráculo
 * revienta, el TS da FormatError nombrado o sigue habiendo NOMBRADO el
 * problema — nunca revienta con un error crudo.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FormatError, Log } from '../src/core/log.ts';
import { normalize } from '../src/core/normalize/index.ts';
import { stripPrivate } from '../src/core/normalize/strip.ts';
import { pyReprRoot } from '../src/core/parse/pyrepr.ts';
import { compareTagged, isGated, type PreprocRow } from '../tools/preproc-lib.ts';

const golden = JSON.parse(readFileSync('golden/preproc-v3.20.0.json', 'utf8')) as {
  rows: PreprocRow[];
};
const inputOf = (r: PreprocRow) => r.input ?? readFileSync(`${r.origin}/${r.name}`, 'utf8');

describe(`preprocesado ≡ oráculo (${golden.rows.length} documentos)`, () => {
  for (const r of golden.rows) {
    it(`${r.origin}/${r.name}`, () => {
      const log = new Log();
      let res: ReturnType<typeof normalize> | null = null;
      let err: unknown = null;
      try {
        res = normalize(inputOf(r), 'auto', log);
      } catch (e) {
        err = e;
      }
      const ts = log.entries.map((e) => `${e.level}|${e.msg}`);
      if (err && !(err instanceof FormatError)) throw err; // jamás un error crudo
      if (r.outcome === 'ok' && err && r.full_outcome === 'excepcion') {
        // El oráculo termina el preprocesado pero revienta DESPUÉS (corrida
        // completa): el FormatError nombrado del TS es «igual o mejor».
        expect(err).toBeInstanceOf(FormatError);
      } else if (r.outcome === 'ok') {
        expect(err, 'el oráculo procesa este documento; el TS no puede rechazarlo').toBeNull();
        expect(compareTagged(r.log, ts)).toEqual({ ok: true });
        expect(res?.profile).toBe(r.motor);
        if (res && r.normalized !== undefined) {
          expect(pyReprRoot(stripPrivate({ ...res.parsed, value: res.doc }))).toBe(r.normalized);
        }
      } else {
        // El oráculo revienta: lo que alcanzó a decir es prefijo de lo del TS.
        const py = r.log.filter(isGated);
        expect(ts.filter(isGated).slice(0, py.length)).toEqual(py);
        expect(err !== null || ts.some((l) => l.includes('[jv]') || l.includes('[schema]'))).toBe(
          true,
        );
      }
    });
  }
});
