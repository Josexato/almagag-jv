// Genera out/almagag-jv-prueba.html: UNA página autocontenida (motor IIFE +
// ejemplos incrustados) que se abre con doble clic. Sin servidor, sin red:
// el .sdjf se lee y se dibuja dentro del navegador.
//   npm run build && npm run prueba
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const engine = readFileSync('dist/almagag-jv.iife.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const EJEMPLOS = [
  'fixtures/constructos/c24-iconos-embebidos-bwt.gag',
  'fixtures/constructos/c20-roles-status-legend.sdjf',
  'fixtures/constructos/c21-theme-semantica-estilos.sdjf',
  'fixtures/constructos/c07-genealogia-tres-generaciones.sdjf',
  'fixtures/py-v3.20.0/03-conexiones.sdjf',
  'fixtures/py-v3.20.0/04-gradientes-colores.sdjf',
];
const ejemplos = Object.fromEntries(
  EJEMPLOS.map((f) => [f.split('/').pop(), readFileSync(f, 'utf8')]),
);
const json = JSON.stringify(ejemplos).replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>almagag-jv — prueba en el navegador</title>
<style>
  :root { --bg:#f6f5f2; --panel:#fff; --ink:#1d1d1b; --muted:#6b6558; --line:#d9d6cf; --warn:#9a6700; --err:#a61b1b; --jv:#1f5fa8; }
  * { box-sizing: border-box; }
  body { margin:0; font:14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
  header { padding:12px 16px; border-bottom:1px solid var(--line); background:var(--panel); display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; }
  header h1 { font-size:16px; margin:0; }
  header .ver { color:var(--muted); font-size:12px; }
  .aviso { font-size:12px; color:var(--muted); }
  main { display:grid; grid-template-columns: minmax(280px, 38%) 1fr; gap:12px; padding:12px; min-height: calc(100vh - 60px); }
  @media (max-width: 800px) { main { grid-template-columns: 1fr; } }
  section { background:var(--panel); border:1px solid var(--line); border-radius:8px; display:flex; flex-direction:column; min-width:0; }
  .bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; padding:8px; border-bottom:1px solid var(--line); }
  textarea { flex:1; min-height:320px; width:100%; border:0; padding:10px; font:12px/1.4 ui-monospace, Menlo, Consolas, monospace; resize:vertical; outline:none; }
  button, select, label.btn { font:inherit; padding:5px 10px; border:1px solid var(--line); border-radius:6px; background:#fff; cursor:pointer; }
  button.primary { background:var(--ink); color:#fff; border-color:var(--ink); }
  input[type=file] { display:none; }
  #lienzo { flex:1; overflow:auto; padding:8px; min-height:320px; display:flex; align-items:flex-start; justify-content:center; }
  #lienzo svg { max-width:100%; height:auto; }
  #log { border-top:1px solid var(--line); max-height:220px; overflow:auto; margin:0; padding:8px; font:12px/1.4 ui-monospace, Menlo, Consolas, monospace; }
  #log div { white-space:pre-wrap; }
  .WARNING { color:var(--warn); } .ERROR { color:var(--err); font-weight:600; } .INFO, .DEBUG { color:var(--muted); } .jv { color:var(--jv); }
  .estado { margin-left:auto; color:var(--muted); font-size:12px; }
</style>
</head>
<body>
<header>
  <h1>almagag-jv</h1>
  <span class="ver">${pkg.version} · referencia AlmaGag Python v${pkg.almagag.referenceVersion} · todo corre en este navegador</span>
  <span class="aviso">Fase 1: formato, validación, iconos y contratos de emisión iguales al Python; la colocación todavía es una grilla trivial (el layout real es la fase 2).</span>
</header>
<main>
  <section>
    <div class="bar">
      <label class="btn">Abrir .sdjf / .gag<input id="archivo" type="file" accept=".sdjf,.gag,.json,application/json"></label>
      <select id="ejemplo" aria-label="Ejemplos"><option value="">Ejemplos…</option></select>
      <select id="vista" aria-label="Vista">
        <option value="auto">vista: auto</option><option value="columns">columns</option>
        <option value="areas">areas</option><option value="lanes">lanes</option><option value="matrix">matrix</option>
      </select>
      <button class="primary" id="dibujar">Dibujar</button>
    </div>
    <textarea id="fuente" spellcheck="false" aria-label="Contenido del archivo"></textarea>
  </section>
  <section>
    <div class="bar">
      <button id="descargar" disabled>Descargar SVG</button>
      <span class="estado" id="estado"></span>
    </div>
    <div id="lienzo"></div>
    <div id="log" aria-live="polite"></div>
  </section>
</main>
<script>${engine}</script>
<script>
const EJEMPLOS = ${json};
const $ = (id) => document.getElementById(id);
let ultimo = null, nombre = 'diagrama';
for (const k of Object.keys(EJEMPLOS)) $('ejemplo').add(new Option(k, k));
function dibujar() {
  const t0 = performance.now();
  $('log').textContent = '';
  try {
    const r = AlmaGag.render($('fuente').value, { view: $('vista').value });
    const ms = performance.now() - t0;
    ultimo = r.svg;
    $('lienzo').innerHTML = r.svg.slice(r.svg.indexOf('<svg'));
    for (const l of r.log) {
      const d = document.createElement('div');
      d.className = l.msg.startsWith('[jv]') ? l.level + ' jv' : l.level;
      d.textContent = l.level + ': ' + l.msg;
      $('log').appendChild(d);
    }
    $('estado').textContent = 'perfil ' + r.profile + ' · ' + r.log.length + ' mensaje(s) · ' + ms.toFixed(1) + ' ms';
    $('descargar').disabled = false;
  } catch (e) {
    ultimo = null;
    $('lienzo').innerHTML = '';
    const d = document.createElement('div');
    d.className = 'ERROR';
    d.textContent = (e && e.name === 'FormatError' ? 'ERROR: ' : 'ERROR interno: ') + (e && e.message);
    $('log').appendChild(d);
    $('estado').textContent = 'sin dibujo';
    $('descargar').disabled = true;
  }
}
$('dibujar').onclick = dibujar;
$('vista').onchange = dibujar;
$('ejemplo').onchange = (ev) => {
  const k = ev.target.value; if (!k) return;
  $('fuente').value = EJEMPLOS[k]; nombre = k.replace(/\\.(sdjf|gag|json)$/i, ''); dibujar();
};
$('archivo').onchange = async (ev) => {
  const f = ev.target.files[0]; if (!f) return;
  $('fuente').value = await f.text(); nombre = f.name.replace(/\\.(sdjf|gag|json)$/i, ''); dibujar();
  ev.target.value = '';
};
$('fuente').addEventListener('keydown', (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') dibujar(); });
$('descargar').onclick = () => {
  if (!ultimo) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ultimo], { type: 'image/svg+xml' }));
  a.download = nombre + '.svg'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('ejemplo').value = Object.keys(EJEMPLOS)[0]; $('ejemplo').onchange({ target: $('ejemplo') });
</script>
</body>
</html>
`;
mkdirSync('out', { recursive: true });
writeFileSync('out/almagag-jv-prueba.html', html);
console.log(
  `out/almagag-jv-prueba.html (${(html.length / 1024).toFixed(1)} KB, motor ${pkg.version} incrustado, ${EJEMPLOS.length} ejemplos)`,
);
