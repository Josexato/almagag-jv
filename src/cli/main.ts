/**
 * CLI: almagag-jv archivo.sdjf [-o salida.svg] [--view auto|columns|areas|lanes|matrix]
 * Código de salida: 0 ok · 1 error de formato/lectura · 2 uso inválido.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { FormatError, REFERENCE_VERSION, render, type View } from '../core/index.ts';
import { ENGINE_NAME, ENGINE_VERSION } from '../core/version.ts';

const VIEWS: readonly View[] = ['auto', 'columns', 'areas', 'lanes', 'matrix'];
const USAGE = `uso: ${ENGINE_NAME} archivo.sdjf [-o salida.svg] [--view ${VIEWS.join('|')}]`;

function main(argv: readonly string[]): number {
  let file: string | undefined;
  let out: string | undefined;
  let view: View = 'auto';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === '-o' || a === '--output') out = argv[++i];
    else if (a === '--view') {
      const v = argv[++i];
      if (!VIEWS.includes(v as View)) {
        console.error(`vista inválida '${v}'. ${USAGE}`);
        return 2;
      }
      view = v as View;
    } else if (a === '--version') {
      console.log(
        `${ENGINE_NAME} ${ENGINE_VERSION} (referencia AlmaGag Python v${REFERENCE_VERSION})`,
      );
      return 0;
    } else if (a === '-h' || a === '--help') {
      console.log(USAGE);
      return 0;
    } else if (!file) file = a;
    else {
      console.error(`argumento inesperado '${a}'. ${USAGE}`);
      return 2;
    }
  }
  if (!file) {
    console.error(USAGE);
    return 2;
  }
  let input: string;
  try {
    input = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`ERROR: no se pudo leer ${file}: ${(e as Error).message}`);
    return 1;
  }
  try {
    const res = render(input, { view });
    for (const l of res.log) console.error(`${l.level}:${ENGINE_NAME}:${l.msg}`);
    const target = out ?? `${basename(file).replace(/\.(sdjf|gag|json)$/i, '')}.svg`;
    writeFileSync(target, res.svg, 'utf8');
    console.error(`INFO:${ENGINE_NAME}:Diagrama generado: ${target}`);
    return 0;
  } catch (e) {
    if (e instanceof FormatError) {
      console.error(`ERROR:${ENGINE_NAME}:${e.message}`);
      return 1;
    }
    throw e;
  }
}

process.exitCode = main(process.argv.slice(2));
