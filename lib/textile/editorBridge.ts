// Textile inside the design editor (the same way packaging works).
// A garment spec (type, size or measurements, neck, sleeve) drafts real
// pattern pieces (lib/textile/draft.ts, lib/textile/blocks.ts). Each piece
// becomes an editable fabric shape on a page laid out like a marker; the cut
// line (seam allowance added) is tagged __die = 'cut' so the press PDF cuts
// on it; seam line, grain arrow, notches and the piece label are locked
// guides tagged __pat. Templates add colour, panels and patterns clipped to
// the pieces. All sizes in millimetres.

import { draftFor, type Measures, type NeckStyle, type SleeveStyle } from './draft.ts';
import { readySize, READY_SIZE_NAMES, type ReadySize } from './sizes.ts';
import { draftDress, SAMPLE_BODY, DEFAULT_STYLE, toPath, type Body, type Style } from './blocks.ts';
import { offsetPolygon, type Pt } from './blocks.ts';
import { pathToPolylines } from '../dxf.ts';

export type GarmentId = 'polo' | 'tshirt' | 'jersey' | 'kurta' | 'chudidar' | 'frock' | 'dupatta';
export const GARMENTS: { id: GarmentId; name: string; hint: string }[] = [
  { id: 'polo', name: 'Polo shirt', hint: 'Front, back, sleeves, collar and placket' },
  { id: 'tshirt', name: 'T-shirt', hint: 'Front, back, sleeves and neck rib' },
  { id: 'jersey', name: 'Sports jersey', hint: 'T-shirt block for sublimated team kits' },
  { id: 'kurta', name: 'Kurti / kameez', hint: 'Front, back, sleeves, side slits, neck facing' },
  { id: 'chudidar', name: 'Churidar', hint: 'Fitted legs with gathers and waist casing' },
  { id: 'frock', name: 'Frock / dress', hint: 'Bodice with darts, sleeve and skirt' },
  { id: 'dupatta', name: 'Dupatta', hint: 'Rectangle with optional border' },
];

export interface TextileSpec {
  garment: GarmentId;
  size: ReadySize | 'custom';
  measures: Measures;          // cm, the drafting inputs of the garment (draft.ts field keys or Body for frocks)
  neck: NeckStyle; sleeve: SleeveStyle;
  allowance: number;           // seam allowance, mm
  skirt?: Style['skirt'];      // frock skirt
}

export interface LaidPiece { id: string; label: string; d: string; x: number; y: number; w: number; h: number; qty: number; grain?: 'vertical' | 'bias'; notches?: [number, number][]; fold?: boolean; mirror?: boolean; /** x (piece-local mm) of the cut-on-fold edge */ foldX?: number; /** cutting line when drafted with fold/dart rules (piece-local mm, allowance already set) */ cutD?: string }
export interface TextileLayout { pieces: LaidPiece[]; w: number; h: number }

const chartFor = (g: GarmentId): 'tee' | 'kurta' | 'chudidar' | null => (g === 'polo' || g === 'tshirt' || g === 'jersey' ? 'tee' : g === 'kurta' ? 'kurta' : g === 'chudidar' ? 'chudidar' : null);

export function defaultTextileSpec(garment: GarmentId = 'polo', size: ReadySize = 'M'): TextileSpec {
  const chart = chartFor(garment);
  const measures: Measures = chart ? readySize(chart, size) : garment === 'frock' ? { ...(SAMPLE_BODY as any), skirtLength: DEFAULT_STYLE.skirtLength } : { width: 90, length: 225 };
  return { garment, size: chart ? size : 'custom', measures, neck: 'round', sleeve: garment === 'kurta' ? 'elbow' : 'short', allowance: 10, skirt: 'gathered' };
}
export const SIZES = READY_SIZE_NAMES;

/** Drafted pieces for a spec, laid out in rows (gap 30 mm) no wider than `rowWidth`. */
export function layoutPieces(spec: TextileSpec, rowWidth = 1500): TextileLayout {
  let raw: Omit<LaidPiece, 'x' | 'y'>[] = [];
  if (spec.garment === 'frock') {
    const r = draftDress({ ...(SAMPLE_BODY as Body), ...(spec.measures as any) }, { ...DEFAULT_STYLE, skirtLength: Number(spec.measures.skirtLength) || DEFAULT_STYLE.skirtLength, sleeve: spec.sleeve === 'sleeveless' ? 'none' : spec.sleeve === 'cap' ? 'cap' : spec.sleeve === 'elbow' ? 'elbow' : spec.sleeve === 'full' || spec.sleeve === 'three-quarter' ? 'long' : 'short', skirt: spec.skirt || 'gathered', neckline: spec.neck === 'v' ? 'v' : spec.neck === 'square' ? 'square' : spec.neck === 'boat' ? 'boat' : 'round' });
    raw = r.pieces.map((p) => {
      // Printed garments are cut flat: a cut-on-fold half is opened out into the whole piece.
      let seam = p.seam, tips = new Set((p.dartTip || []).map((i) => `${p.seam[i][0]},${p.seam[i][1]}`));
      let unfolded = false;
      if (p.foldEdge) {
        const n = seam.length, fx = seam[p.foldEdge[0]][0], run: Pt[] = [];
        for (let i = p.foldEdge[1]; ; i = (i + 1) % n) { run.push(seam[i]); if (i === p.foldEdge[0]) break; }
        const mir = (q: Pt): Pt => [2 * fx - q[0], q[1]];
        seam = [...run, ...run.slice(1, -1).reverse().map(mir)];
        tips = new Set([...tips, ...[...tips].map((k) => { const [x, y] = k.split(',').map(Number); return `${2 * fx - x},${y}`; })]);
        unfolded = true;
      }
      const xs = seam.map((q) => q[0]), ys = seam.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
      const pts = seam.map((q) => [q[0] - x0, q[1] - y0] as Pt);
      const cutPts = offsetPolygon(seam.filter((q) => !tips.has(`${q[0]},${q[1]}`)), spec.allowance).map((q) => [q[0] - x0, q[1] - y0] as Pt);
      const qty = /Cut 4/.test(p.cut) ? (unfolded ? 2 : 4) : /Cut 2/.test(p.cut) ? 2 : 1;
      return { cutD: toPath(cutPts), id: p.id, label: p.name, d: toPath(pts), w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, qty, grain: 'vertical' as const, notches: p.marks.filter((m) => m.kind === 'notch').map((m) => [m.at[0] - x0, m.at[1] - y0] as [number, number]) };
    });
  } else {
    const type = spec.garment === 'kurta' ? 'kurta' : spec.garment === 'chudidar' ? 'chudidar' : spec.garment === 'dupatta' ? 'dupatta' : 'tee';
    const prod = draftFor(type as any, spec.measures, { neck: spec.neck, sleeve: spec.sleeve, polo: spec.garment === 'polo', teeSleeve: spec.sleeve === 'full' ? 'long' : 'short' });
    raw = prod.pieces.map((p) => ({ id: p.id, label: p.label, d: p.d, w: p.w, h: p.h, qty: p.qty, grain: p.grain, notches: p.notches, fold: p.fold, mirror: p.mirror }));
  }
  // One printed piece per cut: "Cut 2" becomes two pieces (the second a mirror pair).
  raw = raw.flatMap((p) => (p.qty > 1 && !/placket/.test(p.id) ? Array.from({ length: p.qty }, (_, i) => ({ ...p, id: i ? `${p.id}-${i + 1}` : p.id, label: `${p.label} (${i + 1} of ${p.qty})`, qty: 1, mirror: i % 2 === 1 ? true : p.mirror })) : [p]));
  const gap = 30, a = spec.allowance;
  const pieces: LaidPiece[] = [];
  let x = a, y = a, rowH = 0, maxW = 0;
  for (const p of raw) {
    if (x > a && x + p.w + a > rowWidth) { x = a; y += rowH + gap; rowH = 0; }
    pieces.push({ ...p, x, y });
    x += p.w + 2 * a + gap; rowH = Math.max(rowH, p.h + 2 * a); maxW = Math.max(maxW, x);
  }
  return { pieces, w: Math.round(maxW - gap + a), h: Math.round(y + rowH + a) };
}

/** Cutting line: the stitch line flattened and offset by the seam allowance (mm, piece-local). */
export function cutPath(p: { d: string; cutD?: string }, allowance: number): string {
  if (p.cutD) return p.cutD;
  const polys = pathToPolylines(p.d);
  const main = polys.sort((a, b) => b.pts.length - a.pts.length)[0];
  if (!main || main.pts.length < 3) return p.d;
  const pts = main.pts as unknown as Pt[];
  const clean = pts.filter((q, i) => i === 0 || Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) > 0.2);
  return toPath(offsetPolygon(clean, allowance));
}

// ── Design themes for the templates ──
export type TexMotif = 'none' | 'stripes' | 'hoops' | 'dots' | 'florals' | 'chevron' | 'paisley';
export interface TexTheme { id: string; name: string; body: string; trim: string; accent: string; motif: TexMotif; motifColour: string; panel?: 'yoke' | 'side' | 'hem' | 'sash' | 'border' }
export interface TextileTemplate { id: string; name: string; garment: GarmentId; theme: TexTheme; neck?: NeckStyle; sleeve?: SleeveStyle; skirt?: Style['skirt']; text?: string }

export const TEXTILE_TEMPLATES: TextileTemplate[] = [
  { id: 'polo-corporate', name: 'Corporate polo', garment: 'polo', theme: { id: 'navy', name: 'Navy', body: '#1F2A44', trim: '#FFFFFF', accent: '#E3B341', motif: 'none', motifColour: '#FFFFFF', panel: 'yoke' }, text: 'YOUR COMPANY' },
  { id: 'polo-stripe', name: 'Striped polo', garment: 'polo', theme: { id: 'stripe', name: 'Stripe', body: '#F4F1EA', trim: '#1B4D3E', accent: '#1B4D3E', motif: 'stripes', motifColour: '#1B4D3E' } },
  { id: 'tshirt-band', name: 'Chest-band T-shirt', garment: 'tshirt', theme: { id: 'band', name: 'Band', body: '#FFFFFF', trim: '#E4572E', accent: '#E4572E', motif: 'none', motifColour: '#E4572E', panel: 'hem' }, text: 'EST. 2026' },
  { id: 'jersey-hoops', name: 'Football jersey · hoops', garment: 'jersey', theme: { id: 'hoops', name: 'Hoops', body: '#0B6E4F', trim: '#FFFFFF', accent: '#FFFFFF', motif: 'hoops', motifColour: '#FFFFFF' }, text: '10' },
  { id: 'jersey-sash', name: 'Cricket jersey · sash', garment: 'jersey', theme: { id: 'sash', name: 'Sash', body: '#14213D', trim: '#FCA311', accent: '#FCA311', motif: 'none', motifColour: '#FCA311', panel: 'sash' }, text: 'TEAM' },
  { id: 'kurti-floral', name: 'Floral kurti', garment: 'kurta', neck: 'round', sleeve: 'three-quarter', theme: { id: 'floral', name: 'Floral', body: '#FCE4EC', trim: '#AD1457', accent: '#AD1457', motif: 'florals', motifColour: '#E91E63', panel: 'border' } },
  { id: 'kurti-yoke', name: 'Yoke kurti (V neck)', garment: 'kurta', neck: 'v', sleeve: 'elbow', theme: { id: 'yoke', name: 'Indigo yoke', body: '#E8EEF8', trim: '#283593', accent: '#283593', motif: 'paisley', motifColour: '#3949AB', panel: 'yoke' } },
  { id: 'kurti-chevron', name: 'Chevron kurti', garment: 'kurta', neck: 'boat', sleeve: 'short', theme: { id: 'chev', name: 'Chevron', body: '#FFF8E1', trim: '#E65100', accent: '#E65100', motif: 'chevron', motifColour: '#FB8C00' } },
  { id: 'churidar-plain', name: 'Churidar', garment: 'chudidar', theme: { id: 'plain', name: 'Plain', body: '#7B1FA2', trim: '#4A148C', accent: '#CE93D8', motif: 'none', motifColour: '#CE93D8', panel: 'hem' } },
  { id: 'frock-gathered', name: 'Gathered frock', garment: 'frock', sleeve: 'short', skirt: 'gathered', theme: { id: 'pastel', name: 'Pastel dots', body: '#E3F2FD', trim: '#1565C0', accent: '#1565C0', motif: 'dots', motifColour: '#64B5F6', panel: 'hem' } },
  { id: 'frock-aline', name: 'A-line dress', garment: 'frock', sleeve: 'cap', skirt: 'aline', theme: { id: 'sage', name: 'Sage', body: '#E8F5E9', trim: '#2E7D32', accent: '#2E7D32', motif: 'florals', motifColour: '#66BB6A' } },
  { id: 'dupatta-border', name: 'Bordered dupatta', garment: 'dupatta', theme: { id: 'border', name: 'Gold border', body: '#B71C1C', trim: '#FFD54F', accent: '#FFD54F', motif: 'paisley', motifColour: '#E57373', panel: 'border' } },
];

export function templateSpec(t: TextileTemplate): TextileSpec {
  const s = defaultTextileSpec(t.garment);
  return { ...s, neck: t.neck || s.neck, sleeve: t.sleeve || s.sleeve, skirt: t.skirt || s.skirt };
}

export type TexItem =
  | { k: 'rect'; name: string; x: number; y: number; w: number; h: number; fill: string; opacity?: number; rot?: number }
  | { k: 'path'; name: string; d: string; fill?: string; stroke?: string; sw?: number; opacity?: number }
  | { k: 'text'; name: string; x: number; y: number; w: number; text: string; size: number; fill: string; font: string; weight: number };
export interface PieceArt { piece: LaidPiece; items: TexItem[] }

function motifPath(m: TexMotif, w: number, h: number): string {
  const s = Math.max(18, Math.min(w, h) / 9);
  let d = '';
  if (m === 'stripes') for (let x = 0; x < w; x += s) d += `M${x.toFixed(1)} 0h${(s * 0.35).toFixed(1)}v${h}h${(-s * 0.35).toFixed(1)}Z`;
  else if (m === 'hoops') for (let y = s; y < h; y += s * 2) d += `M0 ${y.toFixed(1)}h${w}v${s.toFixed(1)}h${-w}Z`;
  else if (m === 'dots') { const r = s * 0.14; for (let y = s / 2; y < h; y += s) for (let x = s / 2 + ((Math.round(y / s) % 2) * s) / 2; x < w; x += s) d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`; }
  else if (m === 'chevron') for (let y = 0; y < h + s; y += s) d += `M0 ${y.toFixed(1)}l${(w / 2).toFixed(1)} ${(s * 0.6).toFixed(1)}l${(w / 2).toFixed(1)} ${(-s * 0.6).toFixed(1)}v${(s * 0.25).toFixed(1)}l${(-w / 2).toFixed(1)} ${(s * 0.6).toFixed(1)}l${(-w / 2).toFixed(1)} ${(-s * 0.6).toFixed(1)}Z`;
  else if (m === 'florals') { for (let y = s; y < h; y += s * 1.6) for (let x = s + ((Math.round(y / (s * 1.6)) % 2) * s * 0.8); x < w; x += s * 1.6) { const r = s * 0.22; for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r; d += `M${(cx - r * 0.6).toFixed(1)} ${cy.toFixed(1)}a${(r * 0.6).toFixed(1)} ${(r * 0.6).toFixed(1)} 0 1 0 ${(r * 1.2).toFixed(1)} 0a${(r * 0.6).toFixed(1)} ${(r * 0.6).toFixed(1)} 0 1 0 ${(-r * 1.2).toFixed(1)} 0`; } } }
  else if (m === 'paisley') for (let y = s; y < h; y += s * 1.5) for (let x = s + ((Math.round(y / (s * 1.5)) % 2) * s * 0.75); x < w; x += s * 1.5) { const r = s * 0.3; d += `M${x.toFixed(1)} ${(y + r).toFixed(1)}c${(-r * 1.4).toFixed(1)} 0 ${(-r * 1.4).toFixed(1)} ${(-r * 2).toFixed(1)} 0 ${(-r * 2).toFixed(1)}c${(r * 0.8).toFixed(1)} 0 ${(r * 1.2).toFixed(1)} ${(r * 0.6).toFixed(1)} ${(r * 0.6).toFixed(1)} ${(r * 1.2).toFixed(1)}c${(r * 0.4).toFixed(1)} ${(-r * 0.2).toFixed(1)} ${(r * 0.6).toFixed(1)} ${(r * 0.4).toFixed(1)} ${(-r * 0.6).toFixed(1)} ${(r * 0.8).toFixed(1)}Z`; }
  return d;
}

/** Artwork for each piece of a template: base colour, motif, panels, chest text (piece-local mm). */
export function templateArt(t: TextileTemplate, layout: TextileLayout): PieceArt[] {
  const th = t.theme;
  return layout.pieces.map((p) => {
    const items: TexItem[] = [];
    const trimPiece = /collar|placket|rib|facing|casing|waistband/i.test(p.id + p.label);
    items.push({ k: 'path', name: `${p.label} · fabric`, d: p.d, fill: trimPiece ? th.trim : th.body });
    if (!trimPiece && th.motif !== 'none') items.push({ k: 'path', name: `${p.label} · pattern`, d: motifPath(th.motif, p.w, p.h), fill: th.motifColour, opacity: th.motif === 'florals' || th.motif === 'paisley' || th.motif === 'dots' ? 0.55 : 0.9 });
    if (!trimPiece && th.panel === 'yoke' && /front|back/i.test(p.id)) items.push({ k: 'rect', name: `${p.label} · yoke`, x: 0, y: 0, w: p.w, h: p.h * 0.2, fill: th.accent });
    if (!trimPiece && th.panel === 'hem' && !/bodice/.test(p.id)) items.push({ k: 'rect', name: `${p.label} · band`, x: 0, y: p.h * (/sleeve/i.test(p.id) ? 0.7 : 0.82), w: p.w, h: p.h * 0.06, fill: th.accent });
    if (!trimPiece && th.panel === 'border') items.push({ k: 'rect', name: `${p.label} · border`, x: 0, y: p.h - Math.min(90, p.h * 0.1), w: p.w, h: Math.min(90, p.h * 0.1), fill: th.accent });
    if (!trimPiece && th.panel === 'sash' && /front/i.test(p.id)) items.push({ k: 'path', name: `${p.label} · sash`, d: `M${p.w * 0.1} 0 L${p.w * 0.35} 0 L${p.w} ${p.h * 0.62} L${p.w} ${p.h * 0.9} Z`, fill: th.accent });
    if (t.text && /^front$/i.test(p.id)) items.push({ k: 'text', name: 'Chest text', x: p.w * 0.15, y: p.h * 0.3, w: p.w * 0.7, text: t.text, size: Math.min(36, p.w * 0.07), fill: th.panel === 'sash' ? '#FFFFFF' : th.accent === th.body ? th.trim : th.accent, font: 'Montserrat', weight: 700 });
    if (t.text && /^back$/i.test(p.id) && /^\d+$/.test(t.text)) items.push({ k: 'text', name: 'Back number', x: p.w * 0.2, y: p.h * 0.28, w: p.w * 0.6, text: t.text, size: p.w * 0.36, fill: th.trim, font: 'Oswald', weight: 700 });
    return { piece: p, items };
  });
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function itemSvg(it: TexItem): string {
  if (it.k === 'rect') return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="${it.fill}"${it.opacity != null ? ` opacity="${it.opacity}"` : ''}/>`;
  if (it.k === 'path') return `<path d="${it.d}" fill="${it.fill || 'none'}"${it.stroke ? ` stroke="${it.stroke}" stroke-width="${it.sw || 1}"` : ''}${it.opacity != null ? ` opacity="${it.opacity}"` : ''}/>`;
  return `<text x="${it.x + it.w / 2}" y="${it.y + it.size}" font-family="'${it.font}',sans-serif" font-size="${it.size}" font-weight="${it.weight}" fill="${it.fill}" text-anchor="middle">${esc(it.text)}</text>`;
}

/** Flat lay of the pieces with their artwork (gallery preview). */
export function textileFlatSvg(t: TextileTemplate): string {
  const lay = layoutPieces(templateSpec(t), 1600);
  const art = templateArt(t, lay);
  const body = art.map(({ piece: p, items }, i) => `<g transform="translate(${p.x} ${p.y})"><clipPath id="tc-${t.id}-${i}"><path d="${p.d}"/></clipPath><g clip-path="url(#tc-${t.id}-${i})">${items.map(itemSvg).join('')}</g><path d="${p.d}" fill="none" stroke="#11182733" stroke-width="2"/></g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lay.w} ${lay.h}">${body}</svg>`;
}

/** Garment sketch: the front piece with the sleeves set at the shoulders (gallery mockup). */
export function textileSketchSvg(t: TextileTemplate): string {
  const lay = layoutPieces(templateSpec(t), 4000);
  const art = templateArt(t, lay);
  const front = art.find((a) => /^front|bodice-front|skirt/.test(a.piece.id)) || art[0];
  const sleeve = art.find((a) => /sleeve/.test(a.piece.id));
  const skirt = t.garment === 'frock' ? art.find((a) => /^skirt/.test(a.piece.id)) : null;
  const P = front.piece, clip = (id: string, a: PieceArt) => `<clipPath id="${id}"><path d="${a.piece.d}"/></clipPath><g clip-path="url(#${id})">${a.items.map(itemSvg).join('')}</g><path d="${a.piece.d}" fill="none" stroke="#0000002a" stroke-width="3"/>`;
  let s = '';
  // A cut-on-fold piece is half the garment: show it with its mirror image.
  const half = P.foldX != null;
  const W = half ? P.w * 2 : P.w;
  const ox = half && P.foldX! < P.w / 2 ? P.w : 0; // fold on the left → the piece is the right half
  const skH = skirt ? skirt.piece.h * 0.9 : 0, H = P.h + skH;
  if (sleeve && t.garment !== 'chudidar' && t.garment !== 'dupatta') {
    const sw = sleeve.piece.w, ang = 62;
    s += `<g transform="translate(${W * 0.06} ${P.h * 0.07}) rotate(${ang}) translate(${-sw / 2} 0)">${clip(`sk-${t.id}-l`, sleeve)}</g>`;
    s += `<g transform="translate(${W * 0.94} ${P.h * 0.07}) rotate(${-ang}) translate(${-sw / 2} 0)">${clip(`sk-${t.id}-r`, sleeve)}</g>`;
  }
  if (skirt && skirt.piece.foldX != null) {
    const k = (W * 1.5) / (skirt.piece.w * 2), sw = skirt.piece.w, left = skirt.piece.foldX < sw / 2; // fold on the left → right half
    const x0 = (W - W * 1.5) / 2;
    s += `<g transform="translate(${x0} ${P.h * 0.97}) scale(${k})"><g transform="translate(${left ? sw : 0} 0)">${clip(`sk-${t.id}-s`, skirt)}</g><g transform="translate(${left ? sw : 2 * sw} 0) scale(-1 1)">${clip(`sk-${t.id}-t`, skirt)}</g></g>`;
  } else if (skirt) { const sx = (W * 1.7) / skirt.piece.w; s += `<g transform="translate(${(W - W * 1.7) / 2} ${P.h * 0.97}) scale(${sx} 0.9)">${clip(`sk-${t.id}-s`, skirt)}</g>`; }
  if (t.garment === 'chudidar') {
    s += `<g>${clip(`sk-${t.id}-a`, front)}</g><g transform="translate(${W * 2.1} 0) scale(-1 1)">${clip(`sk-${t.id}-b`, front)}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-W * 0.2} -20 ${W * 2.4} ${P.h + 40}">${s}</svg>`;
  }
  if (half) s += `<g transform="translate(${ox} 0)">${clip(`sk-${t.id}-f`, front)}</g><g transform="translate(${ox === 0 ? 2 * P.w : P.w} 0) scale(-1 1)">${clip(`sk-${t.id}-g`, front)}</g>`;
  else s += `<g>${clip(`sk-${t.id}-f`, front)}</g>`;
  const pad = W * 0.55;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} -40 ${W + 2 * pad} ${H + 80}">${s}</svg>`;
}

// ── Editor objects ──
export const TEX_PX = 96 / 25.4;          // editor px per mm (same as packaging)
export const TEX_MARGIN = 10;             // mm around the marker on the page
export const GUIDE = { seam: '#64748b', grain: '#0f766e', notch: '#dc2626', label: '#334155' };
const CUT_COLOUR = '#ec008c';

export const pageSizeFor = (lay: TextileLayout) => ({ width: (lay.w + 2 * TEX_MARGIN) * TEX_PX, height: (lay.h + 2 * TEX_MARGIN) * TEX_PX });
const lockedGuide = { locked: true, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false, selectable: false, evented: false, perPixelTargetFind: true, objectCaching: false };

/** A path in piece-local mm placed on the page at the piece's position. */
function placedPath(F: any, d: string, origin: { x: number; y: number }, p: LaidPiece, opts: any) {
  const o = new F.Path(d, opts);
  o.set({ scaleX: TEX_PX, scaleY: TEX_PX, left: origin.x + (p.x + o.left) * TEX_PX, top: origin.y + (p.y + o.top) * TEX_PX });
  return o;
}
export function pieceClip(F: any, p: LaidPiece, origin: { x: number; y: number }, allowance: number) {
  return placedPath(F, cutPath(p, allowance), origin, p, { absolutePositioned: true, fill: '#000', strokeWidth: 0 });
}

/** Artwork for the pieces: template art when given, otherwise plain fabric in `colour`. Every object is tagged with its piece. */
export function artToFabric(F: any, art: PieceArt[], origin: { x: number; y: number }, allowance: number): any[] {
  const out: any[] = [];
  for (const { piece: p, items } of art) {
    const cut = cutPath(p, allowance);
    items.forEach((it, i) => {
      let o: any;
      if (i === 0 && it.k === 'path') { o = placedPath(F, cut, origin, p, { name: it.name, fill: it.fill, strokeWidth: 0, isVectorPath: true }); o.__texBase = true; }
      else if (it.k === 'rect') o = new F.Rect({ name: it.name, left: origin.x + (p.x + it.x) * TEX_PX, top: origin.y + (p.y + it.y) * TEX_PX, width: it.w * TEX_PX, height: it.h * TEX_PX, fill: it.fill, opacity: it.opacity ?? 1 });
      else if (it.k === 'path') o = placedPath(F, it.d, origin, p, { name: it.name, fill: it.fill || '', strokeWidth: 0, opacity: it.opacity ?? 1, isVectorPath: true });
      else o = new F.Textbox(it.text, { name: it.name, left: origin.x + (p.x + it.x) * TEX_PX, top: origin.y + (p.y + it.y) * TEX_PX, width: it.w * TEX_PX, fontSize: it.size * TEX_PX, fontFamily: it.font, fontWeight: it.weight, fill: it.fill, textAlign: 'center' });
      if (!o.__texBase && it.k !== 'text') o.clipPath = pieceClip(F, p, origin, allowance);
      o.__piece = p.id;
      out.push(o);
    });
  }
  return out;
}

/** Plain fabric art for a spec (no template). */
export function plainArt(lay: TextileLayout, body = '#e5e7eb', trim = '#94a3b8'): PieceArt[] {
  return lay.pieces.map((p) => ({ piece: p, items: [{ k: 'path', name: `${p.label} · fabric`, d: p.d, fill: /collar|placket|rib|facing|casing/i.test(p.id + p.label) ? trim : body }] }));
}

/** Cut lines (die layer, magenta) and pattern guides: stitch line, grain, notches, piece label. Locked and click-through. */
export function guidesToFabric(F: any, spec: TextileSpec, lay: TextileLayout, origin: { x: number; y: number }, sizeName: string): any[] {
  const out: any[] = [];
  const cutD = lay.pieces.map((p) => {
    const d = cutPath(p, spec.allowance);
    let i = 0; return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (v) => String(Math.round((Number(v) + (i++ % 2 === 0 ? p.x : p.y)) * 100) / 100));
  }).join(' ');
  const cut = new F.Path(cutD, { name: 'Pattern · Cut line', fill: '', stroke: CUT_COLOUR, strokeWidth: 1, strokeUniform: true });
  cut.set({ scaleX: TEX_PX, scaleY: TEX_PX, left: origin.x + cut.left * TEX_PX, top: origin.y + cut.top * TEX_PX, ...lockedGuide });
  cut.__die = 'cut'; cut.__dieGen = true; cut.__tex = JSON.stringify(spec);
  for (const p of lay.pieces) {
    const seam = placedPath(F, p.d, origin, p, { name: `${p.label} · stitch line`, fill: '', stroke: GUIDE.seam, strokeWidth: 0.8, strokeUniform: true, strokeDashArray: [5, 3], ...lockedGuide });
    seam.__pat = 'seam'; seam.__dieGen = true; out.push(seam);
    const gx = p.w / 2, gy0 = p.h * 0.22, gy1 = p.h * 0.62;
    const gd = p.grain === 'bias'
      ? `M${gx - 60} ${gy0 + 60}L${gx + 60} ${gy0 - 60}M${gx + 60} ${gy0 - 60}l-14 2M${gx + 60} ${gy0 - 60}l-2 14M${gx - 60} ${gy0 + 60}l14 -2M${gx - 60} ${gy0 + 60}l2 -14`
      : `M${gx} ${gy0}V${gy1}M${gx} ${gy0}l-6 12M${gx} ${gy0}l6 12M${gx} ${gy1}l-6 -12M${gx} ${gy1}l6 -12`;
    const grain = placedPath(F, gd, origin, p, { name: `${p.label} · grain line`, fill: '', stroke: GUIDE.grain, strokeWidth: 1, strokeUniform: true, ...lockedGuide });
    grain.__pat = 'grain'; grain.__dieGen = true; out.push(grain);
    if (p.notches?.length) {
      const nd = p.notches.map(([x, y]) => `M${x - 3} ${y - 3}L${x + 3} ${y + 3}M${x - 3} ${y + 3}L${x + 3} ${y - 3}`).join('');
      const n = placedPath(F, nd, origin, p, { name: `${p.label} · notches`, fill: '', stroke: GUIDE.notch, strokeWidth: 1, strokeUniform: true, ...lockedGuide });
      n.__pat = 'notch'; n.__dieGen = true; out.push(n);
    }
    const fs = Math.max(7, Math.min(16, p.w / 14));
    const label = new F.Textbox(`${p.label}\n${sizeName} · ${p.grain === 'bias' ? 'bias grain' : 'straight grain'}`, { name: `${p.label} · label`, left: origin.x + (p.x + p.w * 0.1) * TEX_PX, top: origin.y + (p.y + p.h * 0.66) * TEX_PX, width: p.w * 0.8 * TEX_PX, fontSize: fs * TEX_PX, fontFamily: 'Inter', fill: GUIDE.label, textAlign: 'center', ...lockedGuide });
    label.__pat = 'label'; label.__dieGen = true; out.push(label);
  }
  out.push(cut);
  return out;
}

/** Where an object goes when the pieces change size: it keeps its place on its piece.
 *  Objects covering most of the piece stretch with it; others scale evenly (no distortion). */
export function remapOnPiece(r: { x: number; y: number; w: number; h: number }, from: LaidPiece, to: LaidPiece) {
  const fx = to.w / from.w, fy = to.h / from.h;
  const cx = to.x + ((r.x + r.w / 2 - from.x) * fx), cy = to.y + ((r.y + r.h / 2 - from.y) * fy);
  const fills = r.w >= from.w * 0.8 && r.h >= from.h * 0.8;
  const k = Math.min(fx, fy);
  return { cx, cy, fx: fills ? fx : k, fy: fills ? fy : k };
}

/** The piece whose box contains a point (mm, marker coordinates). */
export function pieceAt(lay: TextileLayout, x: number, y: number): LaidPiece | null {
  return lay.pieces.find((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) || null;
}

/** Fabric needed for the marker at a fabric width (mm): pieces laid in rows, length in metres. */
export function fabricNeed(spec: TextileSpec, fabricWidth: number) {
  const lay = layoutPieces(spec, fabricWidth);
  const tooWide = lay.pieces.filter((p) => p.w + 2 * spec.allowance > fabricWidth).map((p) => p.label);
  const area = lay.pieces.reduce((s, p) => s + p.w * p.h, 0);
  return { metres: Math.round(lay.h / 10) / 100, efficiency: Math.round((area / (fabricWidth * lay.h)) * 100), tooWide };
}

/** Everything a new textile page holds: artwork per piece plus guides and cut lines (editor objects, page at 0,0). */
export function buildTextilePage(F: any, spec: TextileSpec, t: TextileTemplate | null) {
  const lay = layoutPieces(spec);
  const origin = { x: TEX_MARGIN * TEX_PX, y: TEX_MARGIN * TEX_PX };
  const art = t ? templateArt(t, lay) : plainArt(lay);
  const objs = [...artToFabric(F, art, origin, spec.allowance), ...guidesToFabric(F, spec, lay, origin, spec.size === 'custom' ? 'Custom size' : `Size ${spec.size}`)];
  return { size: pageSizeFor(lay), objs, lay };
}
export const TEX_KEYS = ['__die', '__dieGen', '__pat', '__tex', '__piece', '__texBase'] as const;
