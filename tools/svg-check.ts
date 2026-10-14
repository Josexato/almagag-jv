/** Un SVG mínimamente válido: raíz <svg> con xmlns y viewBox de 4 números finitos. */
export function svgIsValid(svg: string): boolean {
  const m = /<svg\b[^>]*\bviewBox="([^"]+)"/.exec(svg);
  if (
    !m ||
    !svg.includes('xmlns="http://www.w3.org/2000/svg"') ||
    !svg.trimEnd().endsWith('</svg>')
  ) {
    return false;
  }
  const nums = (m[1] as string)
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return nums.length === 4 && nums.every(Number.isFinite);
}
