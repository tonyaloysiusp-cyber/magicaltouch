// Presentation mockups for drafted garments (kurta / kameez, made-to-measure
// T-shirt / polo, chudidar, dupatta): the real pieces with their artwork,
// assembled as the garment is worn (sleeves set into the armholes, legs side
// by side, the dupatta draped) with soft fold shading. Presentation only —
// built from the production pieces, never written back to them.

import type { Piece, Product } from '../garments.ts';
import { pieceMarkup, type KitDesign } from '../teamKit.ts';
import { DEFAULT_PATTERN } from '../patterns.ts';
import { flatten, normalize } from './vector.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;
let seq = 0;

/** Outer shoulder point of a body piece (the widest point near the top), local mm. */
function shoulderPoints(p: Piece): { left: [number, number]; right: [number, number] } {
  const pts = flatten(normalize(p.d), 1).flatMap((r) => r.pts);
  const top = pts.filter(([, y]) => y < p.h * 0.12);
  const left = top.reduce((a, b) => (b[0] < a[0] ? b : a), top[0] || [0, 0]);
  const right = top.reduce((a, b) => (b[0] > a[0] ? b : a), top[0] || [p.w, 0]);
  return { left: [left[0], left[1]], right: [right[0], right[1]] };
}

function shading(id: string, w: number, h: number, x = 0, y = 0): string {
  return `<defs><linearGradient id="${id}h" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.18"/><stop offset="0.18" stop-color="#000" stop-opacity="0"/><stop offset="0.42" stop-color="#fff" stop-opacity="0.10"/><stop offset="0.58" stop-color="#000" stop-opacity="0.04"/><stop offset="0.82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.2"/></linearGradient>`
    + `<linearGradient id="${id}v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient></defs>`
    + `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="url(#${id}h)"/><rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="url(#${id}v)"/>`;
}

const art = (p: Piece, kit: KitDesign) => pieceMarkup(p, kit, DEFAULT_PATTERN, null, {}, 1, 0, 'live');

/** Mockup SVG of the garment (front or back view). */
export function garmentMockupSvg(kit: KitDesign, product: Product, view: 'front' | 'back' = 'front'): { svg: string; w: number; h: number } {
  const id = `mk${++seq}`;
  const P = (pid: string) => product.pieces.find((p) => p.id === pid);
  const body = P(view) || P('front');
  if (body) {
    // Upper garment: sleeves set at the shoulders, angled down and out, behind the body.
    const sl = P('sleeve-l'), sr = P('sleeve-r') || sl;
    const { left, right } = shoulderPoints(body);
    const ang = 42; // degrees from vertical, a relaxed arm
    const pad = sl ? Math.max(sl.h, sl.w) * 0.95 : 40;
    const W = body.w + 2 * pad, H = body.h + 60;
    const ox = pad, oy = 30;
    let sleeves = '';
    const sleeve = (s: Piece, at: [number, number], side: -1 | 1) => {
      const capX = s.w / 2;
      const cid = `${id}sc${side > 0 ? 'l' : 'r'}`;
      return `<g transform="translate(${r2(ox + at[0])} ${r2(oy + at[1] + 6)}) rotate(${side * ang}) translate(${r2(-capX)} ${r2(-s.h * 0.04)})${s.mirror ? ` translate(${s.w} 0) scale(-1 1)` : ''}"><clipPath id="${cid}"><path d="${s.d}"/></clipPath>${art(s, kit)}<g clip-path="url(#${cid})">${shading(`${id}s${side > 0 ? 'l' : 'r'}`, s.w, s.h)}</g><path d="${s.d}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="1.5"/></g>`;
    };
    if (sl) sleeves = sleeve(view === 'front' ? sl : sr!, left, 1) + sleeve(view === 'front' ? sr! : sl, right, -1);
    const clip = `<clipPath id="${id}c"><path d="${body.d}"/></clipPath>`;
    const bodyG = `<g transform="translate(${ox} ${oy})">${art(body, kit)}<g clip-path="url(#${id}c)">${shading(id, body.w, body.h)}</g><path d="${body.d}" fill="none" stroke="#000" stroke-opacity="0.2" stroke-width="1.5"/></g>`;
    const collar = P('collar') && product.id !== 'kurta' ? `<g transform="translate(${r2(ox + body.w / 2)} ${r2(oy + 4)})"><ellipse cx="0" cy="0" rx="${r2(body.w * 0.16)}" ry="${r2(body.h * 0.025)}" fill="${kit.collar}" opacity="0.9"/></g>` : '';
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}"><defs>${clip}</defs>${sleeves}${bodyG}${collar}</svg>`, w: W, h: H };
  }
  const leg = P('leg-l');
  if (leg) {
    // Chudidar: both legs side by side, gathers at the ankle.
    const overlap = leg.w * 0.22, W = leg.w * 2 - overlap + 40, H = leg.h + 40;
    const g = (x: number, mirror: boolean, k: string) => {
      const ruch = Array.from({ length: 9 }, (_, i) => { const y = leg.h * 0.78 + i * (leg.h * 0.2) / 9; return `<path d="M${r2(leg.w * 0.18)} ${r2(y)}q${r2(leg.w * 0.32)} ${r2(-9)} ${r2(leg.w * 0.64)} 0" stroke="#000" stroke-opacity="0.18" stroke-width="2" fill="none"/>`; }).join('');
      return `<g transform="translate(${r2(x)} 20)${mirror ? ` translate(${leg.w} 0) scale(-1 1)` : ''}"><clipPath id="${id}${k}"><path d="${leg.d}"/></clipPath>${art(leg, kit)}<g clip-path="url(#${id}${k})">${shading(id + k, leg.w, leg.h)}${ruch}</g><path d="${leg.d}" fill="none" stroke="#000" stroke-opacity="0.2" stroke-width="1.5"/></g>`;
    };
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}">${g(20, false, 'l')}${g(20 + leg.w - overlap, true, 'r')}</svg>`, w: W, h: H };
  }
  // Dupatta / fabric: draped with a soft wave.
  const p = product.pieces[0];
  const W = p.w * 0.9 + 80, H = Math.min(p.h, p.w * 2.2) + 80;
  const k = Math.min(1, (H - 80) / p.h);
  const waves = Array.from({ length: 6 }, (_, i) => `<rect x="${r2((p.w / 6) * i)}" y="0" width="${r2(p.w / 12)}" height="${p.h}" fill="#000" opacity="0.06"/>`).join('');
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" height="${r2(H)}"><g transform="translate(40 40) scale(${r2(k * 0.9)} ${r2(k)}) skewY(4)"><clipPath id="${id}d"><path d="${p.d}"/></clipPath>${art(p, kit)}<g clip-path="url(#${id}d)">${waves}${shading(id, p.w, p.h)}</g></g></svg>`, w: W, h: H };
}
