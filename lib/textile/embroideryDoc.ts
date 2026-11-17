// Embroidery in the production files: the real machine files (DST checked
// by reading it back, EXP) made from the saved stitch objects, and an A4
// page for the technical file — stitch preview, size, stitch count, thread
// sequence and placement. A preview is never passed off as a stitch file.

import { DEFAULTS, STITCH_LABEL, previewSvg, stitchDesign, summarise, toDst, toExp, validateDst, type EmbObject } from '../embroidery/stitch.ts';

export interface EmbDesignLike { objects: EmbObject[]; hoop: [number, number]; placement: { piece: string; x: number; y: number } | null }

export function embroideryFiles(d: EmbDesignLike, base: string): { dst: Uint8Array; exp: Uint8Array; ok: boolean; issues: string[]; stitches: number } {
  const st = stitchDesign(d.objects);
  const dst = toDst(st, base.slice(0, 16).toUpperCase() || 'DESIGN');
  const v = validateDst(dst, st, d.hoop);
  return { dst, exp: toExp(st), ok: v.ok, issues: v.issues, stitches: v.stitches };
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const W = 210, H = 297, M = 14;

export function embroideryPageSvg(d: EmbDesignLike, o: { project: string; files: string[]; background?: string }): string {
  const st = stitchDesign(d.objects);
  const sum = summarise(d.objects, st);
  const pv = previewSvg(d.objects, st, { background: o.background || '#FFFFFF' });
  const T = (x: number, y: number, s: string, size = 3.1, bold = false, fill = '#09090B') => `<text x="${x}" y="${y}" font-family="Helvetica" font-size="${size}"${bold ? ' font-weight="700"' : ''} fill="${fill}">${esc(s)}</text>`;
  let g = T(M, 20, 'Embroidery', 6, true) + T(M, 27, `${o.project} · machine embroidery production`, 3.2, false, '#52525B');
  // Preview, scaled into a box (keeps proportions).
  const bw = W - 2 * M, bh = 110, k = Math.min(bw / pv.w, bh / pv.h);
  const inner = pv.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  g += `<rect x="${M}" y="34" width="${bw}" height="${bh}" fill="#F4F4F5"/><g transform="translate(${(M + (bw - pv.w * k) / 2).toFixed(2)} ${(34 + (bh - pv.h * k) / 2).toFixed(2)}) scale(${k.toFixed(4)}) translate(${-pv.x} ${-pv.y})">${inner}</g>`;
  g += T(M, 149, 'Stitch preview — the machine file is the DST / EXP, not this picture.', 2.5, false, '#A1A1AA');
  let y = 160;
  const kv = (a: string, b: string) => { g += T(M, y, a, 3, false, '#52525B') + T(M + 46, y, b, 3.1); y += 5.6; };
  kv('Design size', `${Math.round(sum.sizeMm[0])} × ${Math.round(sum.sizeMm[1])} mm`);
  kv('Hoop', `${d.hoop[0]} × ${d.hoop[1]} mm`);
  kv('Stitches', sum.stitches.toLocaleString('en'));
  kv('Colour changes', String(Math.max(0, sum.colours.length - 1)));
  kv('Run time', `about ${sum.minutes} min at 700 stitches / min`);
  if (d.placement) kv('Placement', `${d.placement.piece} at ${Math.round(d.placement.x)}, ${Math.round(d.placement.y)} mm`);
  kv('Machine files', o.files.join(' · ') || '—');
  y += 3; g += T(M, y, 'Thread sequence', 3.6, true); y += 6;
  sum.colours.forEach((c, i) => {
    g += `<rect x="${M}" y="${y - 3.2}" width="6" height="4" fill="${c.hex}" stroke="#09090B" stroke-width="0.2"/>` + T(M + 9, y, `${i + 1}. ${c.name}${c.name.toUpperCase() !== c.hex.toUpperCase() ? ` (${c.hex.toUpperCase()})` : ''} — ${c.stitches.toLocaleString('en')} stitches`, 3);
    y += 5.4;
  });
  y += 3; g += T(M, y, 'Objects', 3.6, true); y += 6;
  for (const ob of d.objects.slice(0, 12)) { g += T(M, y, `${ob.name || ob.type} — ${STITCH_LABEL[ob.type] || ob.type}${ob.spacing ? `, ${ob.spacing} mm spacing` : ob.type === 'fill' ? `, ${DEFAULTS.fillSpacing} mm spacing` : ''}${ob.angle != null ? `, ${ob.angle}°` : ''}`, 2.9); y += 4.8; if (y > H - 22) break; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#FFFFFF"/>${g}</svg>`;
}
