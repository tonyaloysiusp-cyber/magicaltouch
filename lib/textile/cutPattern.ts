// Cutting pattern: every piece of every size at real size, with the stitch
// line (dashed), the cut line (seam allowance added, solid), the grain line
// arrow (straight or bias), notches, a "cut on fold" mark, the piece label
// (piece · size · cut quantity · mirrored) and measurement annotations.
// Laid out on a plotter roll; vector SVG pages in mm for svgToPdf.

import type { Product } from '../garments.ts';
import { offsetPath, flatten, normalize } from './vector.ts';

export interface CutPage { svg: string; width: number; height: number }

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

/** Outward normal at a point on the outline (for notch direction). */
function normalAt(d: string, x: number, y: number): [number, number] {
  let best = Infinity, n: [number, number] = [0, -1];
  for (const r of flatten(normalize(d), 0.5)) {
    const p = r.pts;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
      const qx = a[0] + t * dx, qy = a[1] + t * dy, dd = (qx - x) ** 2 + (qy - y) ** 2;
      if (dd < best) { best = dd; const L = Math.sqrt(L2); n = [dy / L, -dx / L]; }
    }
  }
  return n;
}

export function cuttingPatternPages(sets: { size: string; product: Product; qty: number }[], o: { rollW: number; seam: number; maxLen?: number; project: string; logo?: { src: string; w: number; h: number } | null }): CutPage[] {
  const gap = 25, seam = Math.max(0, o.seam), maxLen = o.maxLen ?? 3000, W = o.rollW;
  type Item = { size: string; pieceIdx: number; set: number; w: number; h: number; copy: number };
  const items: Item[] = [];
  sets.forEach((st, si) => st.product.pieces.forEach((p, pi) => items.push({ size: st.size, pieceIdx: pi, set: si, w: p.w + 2 * seam + 20, h: p.h + 2 * seam + 40, copy: 1 })));
  // Shelf packing, tallest first.
  items.sort((a, b) => b.h - a.h);
  const pages: { y: number; items: (Item & { x: number; y: number })[] }[] = [{ y: 0, items: [] }];
  let x = gap, y = gap + 20, shelfH = 0;
  for (const it of items) {
    if (x + it.w > W - gap) { x = gap; y += shelfH + gap; shelfH = 0; }
    if (y + it.h > maxLen - gap && pages[pages.length - 1].items.length) { pages.push({ y: 0, items: [] }); x = gap; y = gap + 20; shelfH = 0; }
    pages[pages.length - 1].items.push({ ...it, x, y });
    x += it.w + gap; shelfH = Math.max(shelfH, it.h);
  }
  return pages.map((pg, pn) => {
    const H = Math.max(200, Math.max(...pg.items.map((i) => i.y + i.h)) + gap);
    let g = `<rect width="${W}" height="${r2(H)}" fill="#FFFFFF"/>`;
    // Cutting layout = technical file: Magical Touch Design header (never on the print files).
    let tx = gap;
    if (o.logo) { const lh = 9, lw = lh * (o.logo.w / o.logo.h); g += `<image x="${gap}" y="${gap - 8}" width="${r2(lw)}" height="${lh}" href="${o.logo.src}"/>`; tx = gap + lw + 8; }
    else { g += `<text x="${gap}" y="${gap}" font-family="Helvetica" font-size="9" font-weight="700" fill="#111">Magical Touch Design</text>`; tx = gap + 110; }
    g += `<text x="${r2(tx)}" y="${gap}" font-family="Helvetica" font-size="9" fill="#111">${esc(o.project)} — cutting pattern, page ${pn + 1} of ${pages.length} · print at 100 % · seam allowance ${seam} mm (solid = cut, dashed = stitch) · www.magicaltouchdesign.com</text>`;
    // 100 mm check square
    g += `<rect x="${W - gap - 100}" y="${gap - 8}" width="100" height="0.01" fill="none"/><path d="M${W - gap - 100} ${gap + 2}h100M${W - gap - 100} ${gap - 2}v8M${W - gap} ${gap - 2}v8" stroke="#111" stroke-width="0.4" fill="none"/><text x="${W - gap - 50}" y="${gap - 4}" font-family="Helvetica" font-size="6" text-anchor="middle" fill="#111">100 mm — check scale</text>`;
    for (const it of pg.items) {
      const st = sets[it.set], p = st.product.pieces[it.pieceIdx];
      const ox = it.x + 10 + seam, oy = it.y + 30 + seam;
      const cut = seam ? offsetPath(p.d, seam) : p.d;
      g += `<g transform="translate(${r2(ox)} ${r2(oy)})">`;
      g += `<path d="${cut}" fill="none" stroke="#111" stroke-width="0.5"/>`;
      if (seam) g += `<path d="${p.d}" fill="none" stroke="#475569" stroke-width="0.3" stroke-dasharray="3 2"/>`;
      // Grain line
      const cx = p.w / 2, gl = Math.min(p.h * 0.6, 400);
      if (p.grain === 'bias') {
        const L = Math.min(p.w, p.h) * 0.5 / Math.SQRT2;
        g += `<path d="M${r2(cx - L)} ${r2(p.h / 2 + L)}L${r2(cx + L)} ${r2(p.h / 2 - L)}" stroke="#111" stroke-width="0.4"/><path d="M${r2(cx + L)} ${r2(p.h / 2 - L)}l-7 1.5l3.5 3.5Z M${r2(cx - L)} ${r2(p.h / 2 + L)}l7 -1.5l-3.5 -3.5Z" fill="#111"/>`;
        g += `<text x="${r2(cx)}" y="${r2(p.h / 2 + 12)}" font-family="Helvetica" font-size="6" text-anchor="middle" fill="#111">BIAS 45°</text>`;
      } else {
        g += `<path d="M${r2(cx)} ${r2(p.h / 2 - gl / 2)}V${r2(p.h / 2 + gl / 2)}" stroke="#111" stroke-width="0.4"/><path d="M${r2(cx)} ${r2(p.h / 2 - gl / 2)}l-3 7h6Z M${r2(cx)} ${r2(p.h / 2 + gl / 2)}l-3 -7h6Z" fill="#111"/>`;
        g += `<text x="${r2(cx + 4)}" y="${r2(p.h / 2 - gl / 2 + 14)}" font-family="Helvetica" font-size="6" fill="#111">GRAIN</text>`;
      }
      // Notches: a short tick across the seam allowance, square to the edge.
      for (const [nx, ny] of p.notches || []) {
        const [vx, vy] = normalAt(p.d, nx, ny);
        g += `<path d="M${r2(nx - vx * 2)} ${r2(ny - vy * 2)}L${r2(nx + vx * (seam + 3))} ${r2(ny + vy * (seam + 3))}" stroke="#111" stroke-width="0.6"/>`;
      }
      if (p.fold) g += `<path d="M0 ${r2(p.h / 2)}H${r2(p.w)}" stroke="#2563EB" stroke-width="0.4" stroke-dasharray="6 2 1 2"/><text x="${r2(p.w / 2)}" y="${r2(p.h / 2 - 2)}" font-family="Helvetica" font-size="6" text-anchor="middle" fill="#2563EB">FOLD LINE</text>`;
      // Label and measurement annotations
      const cutQty = (p.qty || 1) * st.qty;
      g += `<text x="${r2(cx)}" y="${r2(p.h * 0.32)}" font-family="Helvetica" font-size="11" font-weight="700" text-anchor="middle" fill="#111">${esc(p.label)}</text>`;
      g += `<text x="${r2(cx)}" y="${r2(p.h * 0.32 + 12)}" font-family="Helvetica" font-size="8" text-anchor="middle" fill="#111">Size ${esc(st.size)} · cut ${cutQty}${p.mirror ? ' (mirrored)' : ''}</text>`;
      g += `<path d="M0 ${r2(-seam - 12)}H${r2(p.w)}M0 ${r2(-seam - 15)}v6M${r2(p.w)} ${r2(-seam - 15)}v6" stroke="#64748B" stroke-width="0.3" fill="none"/><text x="${r2(p.w / 2)}" y="${r2(-seam - 14)}" font-family="Helvetica" font-size="6" text-anchor="middle" fill="#64748B">${Math.round(p.w)} mm</text>`;
      g += `<path d="M${r2(-seam - 12)} 0V${r2(p.h)}M${r2(-seam - 15)} 0h6M${r2(-seam - 15)} ${r2(p.h)}h6" stroke="#64748B" stroke-width="0.3" fill="none"/><text transform="translate(${r2(-seam - 14)} ${r2(p.h / 2)}) rotate(-90)" font-family="Helvetica" font-size="6" text-anchor="middle" fill="#64748B">${Math.round(p.h)} mm</text>`;
      g += `</g>`;
    }
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${r2(H)}mm" viewBox="0 0 ${W} ${r2(H)}">${g}</svg>`, width: W, height: r2(H) };
  });
}
