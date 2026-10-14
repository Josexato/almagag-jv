import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FormatError, REFERENCE_VERSION, render } from '../src/core/index.ts';
import { svgIsValid } from '../tools/svg-check.ts';

const MIN = JSON.stringify({
  elements: [
    { id: 'a', type: 'server', label: 'A & <B>' },
    { id: 'b', type: 'database', label: 'Línea 1\nLínea 2' },
  ],
  connections: [
    { from: 'a', to: 'b' },
    { from: 'a', to: 'fantasma' },
  ],
});

describe('render (fase 0)', () => {
  it('devuelve un SVG válido, con el perfil y la referencia declarados', () => {
    const r = render(MIN);
    expect(svgIsValid(r.svg)).toBe(true);
    expect(r.profile).toBe('auto');
    expect(REFERENCE_VERSION).toBe('3.20.0');
    expect(r.svg).toContain(`referencia AlmaGag Python v${REFERENCE_VERSION}`);
  });
  it('escapa texto XML y no emite números con más de 2 decimales', () => {
    const { svg } = render(MIN);
    expect(svg).toContain('A &amp; &lt;B&gt;');
    expect(svg).not.toMatch(/\d\.\d{3,}/);
  });
  it('la fase trivial se NOMBRA en el log con números (nada de silencio)', () => {
    const { log } = render(MIN);
    expect(log.some((l) => l.level === 'WARNING' && /2 nodos, 1 aristas/.test(l.msg))).toBe(true);
  });
  it('una arista con extremo inexistente se NOMBRA, no desaparece en silencio', () => {
    const { log } = render(MIN);
    expect(
      log.some(
        (l) =>
          l.level === 'WARNING' &&
          l.msg.includes('1 arista(s) con extremo inexistente') &&
          l.msg.includes('a→fantasma'),
      ),
    ).toBe(true);
  });
  it('determinismo: dos corridas, mismo SVG byte a byte', () => {
    expect(render(MIN).svg).toBe(render(MIN).svg);
  });
  it("'flows' corta con FormatError que enseña el reemplazo", () => {
    expect(() => render(JSON.stringify({ elements: [], flows: [] }))).toThrow(FormatError);
    expect(() => render(JSON.stringify({ elements: [], flows: [] }))).toThrow(/journeys/);
  });
  it('JSON roto y elemento sin id → FormatError nombrado (el oráculo revienta con traceback)', () => {
    expect(() => render('{')).toThrow(/JSON inválido/);
    expect(() => render('[]')).toThrow(/raíz del documento/);
    expect(() => render('{"elements":[{"type":"x"}]}')).toThrow(/elements\[0\] sin 'id'/);
    expect(() => render('{"elements":[{"id":"a"}],"connections":[{"from":"a"}]}')).toThrow(
      /sin 'to'/,
    );
  });
  it("lo que el oráculo acepta, se acepta: '{}' vacío, ids numéricos, NaN", () => {
    expect(svgIsValid(render('{}').svg)).toBe(true);
    expect(
      render('{"elements":[{"id":1},{"id":2}],"connections":[{"from":1,"to":2}]}').svg,
    ).toContain('ag-edge');
    expect(svgIsValid(render('{"elements":[{"id":"a","x":NaN,"y":1}]}').svg)).toBe(true);
  });
  it('respeta x/y declarados (compatibilidad heredada)', () => {
    const { svg } = render(JSON.stringify({ elements: [{ id: 'a', x: 321, y: 123 }] }));
    expect(svg).toContain('x="321" y="123"');
  });
});

describe('CLI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'almagag-jv-'));
  const run = (args: string[]) =>
    execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', 'src/cli/main.ts', ...args],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  it('archivo → SVG en disco', () => {
    const src = join(dir, 'min.sdjf');
    const out = join(dir, 'min.svg');
    writeFileSync(src, MIN);
    run([src, '-o', out]);
    expect(svgIsValid(readFileSync(out, 'utf8'))).toBe(true);
  });
  it('--version declara la referencia', () => {
    expect(run(['--version'])).toMatch(
      /almagag-jv 0\.\d+\.\d+ \(referencia AlmaGag Python v3\.20\.0\)/,
    );
  });
  it('error de formato → exit 1 con mensaje nombrado', () => {
    const bad = join(dir, 'bad.sdjf');
    writeFileSync(bad, '{"elements":[],"flows":[]}');
    try {
      run([bad, '-o', join(dir, 'x.svg')]);
      expect.unreachable();
    } catch (e) {
      const err = e as { status: number; stderr: string };
      expect(err.status).toBe(1);
      expect(err.stderr).toMatch(/'flows' se renombró a 'journeys'/);
    }
  });
});
