// LAYOUT TEMPLATE — the guide file a designer works on: every side at actual
// size with trim (black), bleed (blue), safe area (green dashed), folds
// (green dashed), panel names, cut and fold marks, and a branded title strip
// along the bottom edge, outside the artwork area. Not a print file.

import { DEFAULT_PRESS, guidesSvg, layoutPress, type MarkType } from './pressSheet.ts';
import { sidePressJob, type PrintJobInfo } from './printJob.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const PAD = 8, BAND = 20;

export function layoutTemplatePages(job: PrintJobInfo, o: { name: string; markType?: MarkType; logo?: { src: string; w: number; h: number } | null }): { svg: string; widthMm: number; heightMm: number }[] {
  return job.sides.map((sideName, i) => {
    const sj = sidePressJob(job, i, o.name);
    const l = layoutPress(sj, { ...DEFAULT_PRESS, sheet: 'finished', margin: 0, info: false, markType: o.markType || 1 });
    const W = r2(l.sheet.w + 2 * PAD), H = r2(l.sheet.h + 2 * PAD + BAND);
    const T = (x: number, y: number, s: string, size: number, fill = '#09090B', bold = false, anchor = 'start') =>
      `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}"${bold ? ' font-weight="700"' : ''} fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
    let g = `<rect width="${W}" height="${H}" fill="#FFFFFF"/><g transform="translate(${PAD} ${PAD})">${guidesSvg(sj, l)}</g>`;
    // Branded title strip (outside the artwork and its marks).
    const by = H - BAND, s = Math.min(1, W / 260);
    const cols = ['#F472B6', '#A78BFA', '#38BDF8', '#4ADE80', '#FACC15'];
    g += cols.map((c, k) => `<rect x="${r2((W / cols.length) * k)}" y="${r2(by)}" width="${r2(W / cols.length + 0.2)}" height="0.8" fill="${c}"/>`).join('');
    let x = PAD;
    if (o.logo) { const lh = 6 * s, lw = lh * (o.logo.w / o.logo.h); g += `<image x="${x}" y="${r2(by + 4)}" width="${r2(lw)}" height="${r2(lh)}" href="${o.logo.src}"/>`; x += lw + 5; }
    g += T(x, by + 7, `LAYOUT TEMPLATE · ${job.title}${job.sides.length > 1 ? ` · ${sideName}` : ''}`, 2.8 * s, '#09090B', true);
    g += T(x, by + 11.5, `${job.trimW} × ${job.trimH} mm finished · ${job.bleed} mm bleed · ${job.safe} mm safe area${job.folds.length ? ` · ${job.folds.length} fold${job.folds.length > 1 ? 's' : ''}` : ''} · guides for designing — not a print file`, 2.2 * s, '#52525B');
    // Legend
    const items: [string, string][] = [
      [`<line x1="0" y1="1" x2="6" y2="1" stroke="#E30613" stroke-width="0.5"/>`, 'cut'],
      [`<line x1="0" y1="1" x2="6" y2="1" stroke="#00A651" stroke-width="0.5" stroke-dasharray="1.2 0.8"/>`, 'fold'],
      [`<rect x="0" y="0" width="6" height="2.2" fill="none" stroke="#111111" stroke-width="0.3"/>`, 'trim'],
      [`<rect x="0" y="0" width="6" height="2.2" fill="none" stroke="#3B9BD8" stroke-width="0.3"/>`, 'bleed'],
      [`<rect x="0" y="0" width="6" height="2.2" fill="none" stroke="#2F9E7A" stroke-width="0.3" stroke-dasharray="1.2 0.8"/>`, 'safe'],
    ];
    let lx = PAD;
    items.forEach(([ic, t]) => { g += `<g transform="translate(${r2(lx)} ${r2(by + 14.5)}) scale(${s})">${ic}</g>` + T(lx + 7.5 * s, by + 16.5, t, 2.1 * s, '#52525B'); lx += 20 * s; });
    g += T(W - PAD, by + 16.5, 'www.magicaltouchdesign.com', 2.1 * s, '#52525B', false, 'end');
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${g}</svg>`, widthMm: W, heightMm: H };
  });
}
