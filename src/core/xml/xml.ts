/**
 * Parser/serializador XML liviano para el NÚCLEO (sin DOMParser: el núcleo
 * corre fuera del DOM). Alcance: lo que necesitan los iconos embebidos y las
 * pruebas de paridad — elementos, atributos (orden conservado), texto,
 * comentarios (se descartan, como xml.etree), CDATA, entidades estándar y
 * numéricas, prólogo `<?...?>` y `<!DOCTYPE>` (se saltean).
 */

export interface XmlElement {
  readonly tag: string;
  readonly attrs: ReadonlyArray<readonly [string, string]>;
  readonly children: readonly XmlNode[];
}
export type XmlNode = XmlElement | string;

export class XmlError extends Error {
  override readonly name = 'XmlError';
}

const ENT: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(Number.parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number.parseInt(e.slice(1), 10));
    const v = ENT[e];
    if (v === undefined) throw new XmlError(`entidad desconocida ${m}`);
    return v;
  });
}

export function parseXml(src: string): XmlElement {
  let i = 0;
  const err = (msg: string): never => {
    throw new XmlError(`${msg} (posición ${i})`);
  };
  const skipMisc = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i] as string)) i++;
      if (src.startsWith('<?', i)) {
        const e = src.indexOf('?>', i);
        if (e < 0) err('instrucción <? sin cerrar');
        i = e + 2;
      } else if (src.startsWith('<!--', i)) {
        const e = src.indexOf('-->', i);
        if (e < 0) err('comentario sin cerrar');
        i = e + 3;
      } else if (src.startsWith('<!DOCTYPE', i)) {
        const e = src.indexOf('>', i);
        if (e < 0) err('DOCTYPE sin cerrar');
        i = e + 1;
      } else return;
    }
  };
  const name = (): string => {
    const m = /^[A-Za-z_:][-A-Za-z0-9_:.]*/.exec(src.slice(i, i + 200));
    if (!m) return err('se esperaba un nombre');
    i += m[0].length;
    return m[0];
  };
  function element(): XmlElement {
    if (src[i] !== '<') err("se esperaba '<'");
    i++;
    const tag = name();
    const attrs: Array<[string, string]> = [];
    for (;;) {
      while (/\s/.test(src[i] ?? '')) i++;
      if (src.startsWith('/>', i)) {
        i += 2;
        return { tag, attrs, children: [] };
      }
      if (src[i] === '>') {
        i++;
        break;
      }
      const an = name();
      while (/\s/.test(src[i] ?? '')) i++;
      if (src[i] !== '=') err(`se esperaba '=' tras ${an}`);
      i++;
      while (/\s/.test(src[i] ?? '')) i++;
      const q = src[i];
      if (q !== '"' && q !== "'") err('valor de atributo sin comillas');
      const end = src.indexOf(q as string, i + 1);
      if (end < 0) err('atributo sin cerrar');
      if (attrs.some(([k]) => k === an)) err(`atributo duplicado ${an}`);
      attrs.push([an, decode(src.slice(i + 1, end))]);
      i = end + 1;
    }
    const children: XmlNode[] = [];
    let text = '';
    const flush = () => {
      if (text) children.push(decode(text));
      text = '';
    };
    for (;;) {
      if (i >= src.length) err(`<${tag}> sin cerrar`);
      if (src.startsWith('</', i)) {
        flush();
        i += 2;
        const close = name();
        if (close !== tag) err(`cierre </${close}> no corresponde a <${tag}>`);
        while (/\s/.test(src[i] ?? '')) i++;
        if (src[i] !== '>') err("se esperaba '>'");
        i++;
        return { tag, attrs, children };
      }
      if (src.startsWith('<!--', i)) {
        const e = src.indexOf('-->', i);
        if (e < 0) err('comentario sin cerrar');
        i = e + 3;
      } else if (src.startsWith('<![CDATA[', i)) {
        const e = src.indexOf(']]>', i);
        if (e < 0) err('CDATA sin cerrar');
        flush();
        children.push(src.slice(i + 9, e));
        i = e + 3;
      } else if (src.startsWith('<?', i)) {
        const e = src.indexOf('?>', i);
        if (e < 0) err('instrucción sin cerrar');
        i = e + 2;
      } else if (src[i] === '<') {
        flush();
        children.push(element());
      } else {
        text += src[i];
        i++;
      }
    }
  }
  skipMisc();
  const root = element();
  skipMisc();
  if (i < src.length) err('contenido después del elemento raíz');
  return root;
}

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => escText(s).replace(/"/g, '&quot;');

export function serializeXml(n: XmlNode): string {
  if (typeof n === 'string') return escText(n);
  const a = n.attrs.map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('');
  if (n.children.length === 0) return `<${n.tag}${a}/>`;
  return `<${n.tag}${a}>${n.children.map(serializeXml).join('')}</${n.tag}>`;
}

export const attr = (e: XmlElement, k: string): string | undefined =>
  e.attrs.find(([n]) => n === k)?.[1];
