// Team kits: one master jersey design + a roster → a personalised print
// file for every player (pure functions, no browser APIs).
//
// The master holds colours, the pattern, logos, the font and where names
// and numbers go. Each player row (name, number, size) is applied to a copy
// at generation time; the master itself never changes.
//
// Everything is drawn as plain vectors in millimetres: piece outlines,
// every pattern motif as its own path (clipped to the piece plus bleed),
// names and numbers as letter outlines (the chosen font's own curves, read
// from the font file in the browser and passed in as `glyphs`). Logos stay pictures, as supplied.

import { PRODUCTS, SIZES, layoutPieces, pieceTransform } from './garments.ts';
import type { Product, Piece, Placed } from './garments.ts';
import { sheetPlacements, motifPath, layout, placedMotif } from './patterns.ts';
import type { PatternSettings } from './patterns.ts';
import { pathBox } from './pathFit.ts';
import { boardLayout, pieceArt, type ArtEl } from './textile/art.ts';
import { nest, findOverlaps, polyArea } from './textile/nest.ts';
import { normalize, flatten } from './textile/vector.ts';

export type KitStyle = 'tshirt' | 'football' | 'cricket' | 'basketball' | 'polo';
export const KIT_STYLES: { id: KitStyle; label: string; product: string }[] = [
  { id: 'football', label: 'Football jersey', product: 'jersey' },
  { id: 'cricket', label: 'Cricket jersey', product: 'polo' },
  { id: 'basketball', label: 'Basketball vest', product: 'vest' },
  { id: 'tshirt', label: 'Round-neck T-shirt', product: 'jersey' },
  { id: 'polo', label: 'Polo T-shirt', product: 'polo' },
];

/** Which designer a style belongs to (each has its own page). */
export type GarmentKind = 'jersey' | 'polo' | 'tshirt';
export const GARMENT_STYLES: Record<GarmentKind, KitStyle[]> = {
  jersey: ['football', 'cricket', 'basketball'],
  polo: ['polo'],
  tshirt: ['tshirt'],
};

/** Body graphics drawn in the accent colours (on the front and back pieces). */
export type KitGraphic = 'plain' | 'sash' | 'hoops' | 'stripes' | 'pinstripes' | 'side-panels' | 'chevron' | 'yoke' | 'split' | 'band' | 'diagonal' | 'halftone' | 'double-sash' | 'centre-stripe';
export const KIT_GRAPHICS: { id: KitGraphic; label: string }[] = [
  { id: 'plain', label: 'Plain' }, { id: 'sash', label: 'Sash' }, { id: 'hoops', label: 'Hoops' },
  { id: 'stripes', label: 'Stripes' }, { id: 'pinstripes', label: 'Pinstripes' }, { id: 'side-panels', label: 'Side panels' },
  { id: 'chevron', label: 'Chevron' }, { id: 'yoke', label: 'Shoulder yoke' }, { id: 'split', label: 'Half & half' }, { id: 'band', label: 'Chest band' },
  { id: 'diagonal', label: 'Diagonal stripes' }, { id: 'halftone', label: 'Halftone fade' }, { id: 'double-sash', label: 'Double sash' }, { id: 'centre-stripe', label: 'Centre stripe' },
];

export interface KitDesign {
  style: KitStyle;
  body: string; sleeve: string; collar: string;
  patternOn: 'none' | 'body' | 'sleeves' | 'all';
  patternOpacity: number;           // 0–1
  repeatMm: number;
  font: string; fontWeight: number;
  nameColor: string; numberColor: string; outlineColor: string; outlineMm: number;
  nameMm: number; numberMm: number; // letter heights at size M
  nameTopMm: number; numberTopMm: number; // from the top of the back piece, size M
  frontNumber: boolean;
  teamLogo?: string | null; sponsorLogo?: string | null; // data URLs
  teamName: string;
  graphic?: KitGraphic; accent?: string; accent2?: string; cuffs?: boolean;
  /** Names and numbers: same height on every size (default) or grown with the garment. */
  letterGrade?: 'fixed' | 'scale';
  frontText?: string; frontTextColor?: string; frontTextMm?: number; frontTextTopMm?: number;
  personalise?: boolean; // names and numbers per player (off: sizes and quantities only)
  /** Extra sizes defined by measurement (flat chest width in cm); scaled from the size-M block. */
  customSizes?: CustomSize[];
  /** Polo placket: number of buttons (0 = hidden placket) and their colour. */
  placketButtons?: number; buttonColor?: string;
  neck?: 'round' | 'v';
  /** Free artwork drawn on the flat print pieces in the print studio (board coordinates, size-M mm). */
  art?: ArtEl[];
  /** Hide the quick graphic / logos / standard name & number places when the print studio artwork replaces them. */
  studioOnly?: boolean;
  // Positions on the front piece (size-M mm); unset = the standard place.
  teamLogoX?: number; teamLogoY?: number; teamLogoMm?: number;
  sponsorX?: number; sponsorY?: number; sponsorMm?: number;
  frontNumX?: number; frontNumY?: number; frontNumMm?: number; frontTextX?: number;
}

export const DEFAULT_KIT: KitDesign = {
  style: 'football', body: '#1E3A5F', sleeve: '#1E3A5F', collar: '#C9A86A', patternOn: 'body', patternOpacity: 0.35, repeatMm: 70,
  font: 'Oswald', fontWeight: 700, nameColor: '#FFFFFF', numberColor: '#FFFFFF', outlineColor: '#C9A86A', outlineMm: 2,
  nameMm: 55, numberMm: 230, nameTopMm: 95, numberTopMm: 175, frontNumber: true, teamLogo: null, sponsorLogo: null, teamName: 'My Team',
  graphic: 'plain', accent: '#C9A86A', accent2: '#FFFFFF', cuffs: true, frontText: '', frontTextColor: '#FFFFFF', frontTextMm: 60, frontTextTopMm: 420, personalise: true,
};

/** Starting design for each designer. */
export function kitFor(kind: GarmentKind): KitDesign {
  if (kind === 'polo') return { ...DEFAULT_KIT, style: 'polo', body: '#FFFFFF', sleeve: '#FFFFFF', collar: '#1E3A5F', accent: '#1E3A5F', graphic: 'band', patternOn: 'none', nameColor: '#1E3A5F', numberColor: '#1E3A5F', outlineMm: 0, frontNumber: false, personalise: false, frontText: '', teamName: 'My Company' };
  if (kind === 'tshirt') return { ...DEFAULT_KIT, style: 'tshirt', body: '#111827', sleeve: '#111827', collar: '#111827', accent: '#F59E0B', graphic: 'plain', patternOn: 'none', frontNumber: false, personalise: false, frontText: 'MAGICAL', frontTextColor: '#F59E0B', frontTextTopMm: 300, teamName: 'My T-shirt' };
  return { ...DEFAULT_KIT };
}

export interface Player { name: string; number: string; size: string; qty?: number }
export interface CustomSize { label: string; chestCm: number }
export interface RosterIssue { row: number; level: 'error' | 'warning'; message: string }

const SIZE_IDS = new Map(SIZES.map((s) => [s.label.toLowerCase().replace(/ .*/, ''), s.id] as [string, string]).concat(SIZES.map((s) => [s.id, s.id] as [string, string])));
export const sizeId = (s: string) => SIZE_IDS.get(s.trim().toLowerCase().replace(/ .*/, '')) || null;
/** The size-M block's flat chest width and body length (cm) for this garment. */
export function blockMeasure(kit: KitDesign): { chestCm: number; lengthCm: number } {
  const f = kitProduct(kit).pieces.find((p) => p.id === 'front');
  return { chestCm: Math.round((f?.w || 560) / 10 * 10) / 10, lengthCm: Math.round((f?.h || 740) / 10 * 10) / 10 };
}
/** A standard size (XS–3XL…) or one of the kit's custom measured sizes. */
export function sizeInfo(kit: KitDesign | null | undefined, s: string): { id: string; label: string; k: number } | null {
  const id = sizeId(s || '');
  if (id) { const z = SIZES.find((x) => x.id === id)!; return { id, label: z.label.replace(/ .*/, ''), k: z.k }; }
  const c = kit?.customSizes?.find((x) => x.label.trim().toLowerCase() === (s || '').trim().toLowerCase());
  if (c && c.chestCm > 0) return { id: `custom:${c.label}`, label: c.label, k: c.chestCm / blockMeasure(kit!).chestCm };
  return null;
}
const sizeNames = (kit?: KitDesign | null) => [...SIZES.map((s) => s.label.replace(/ .*/, '')), ...(kit?.customSizes || []).map((c) => c.label)].join(', ');

/** Reads "name, number, size" lines or CSV (with or without a header row). */
export function parseRoster(text: string): Player[] {
  const lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const split = (l: string) => {
    const out: string[] = []; let cur = '', q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if ((ch === ',' || ch === ';' || ch === '\t') && !q) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  let rows = lines.map(split);
  let iName = 0, iNum = 1, iSize = 2;
  const head = rows[0]?.map((c) => c.toLowerCase());
  if (head && head.some((c) => /name|player/.test(c)) && head.some((c) => /number|no\b|#/.test(c))) {
    iName = head.findIndex((c) => /name|player/.test(c));
    iNum = head.findIndex((c) => /number|no\b|#/.test(c));
    iSize = head.findIndex((c) => /size/.test(c));
    rows = rows.slice(1);
  }
  return rows.map((r) => ({ name: (r[iName] || '').slice(0, 20), number: (r[iNum] || '').replace(/[^0-9]/g, '').slice(0, 3), size: iSize >= 0 ? (r[iSize] || '') : '' }));
}

export function checkRoster(players: Player[], personalise = true, kit?: KitDesign | null): RosterIssue[] {
  const out: RosterIssue[] = [];
  const seen = new Map<string, number>();
  players.forEach((p, i) => {
    const row = i + 1;
    if (!personalise) {
      if (!sizeInfo(kit, p.size)) out.push({ row, level: 'error', message: `Size “${p.size || '—'}” is not one of ${sizeNames(kit)}` });
      if (!(Number(p.qty) >= 1)) out.push({ row, level: 'error', message: 'Quantity must be 1 or more' });
      return;
    }
    if (!p.name.trim()) out.push({ row, level: 'error', message: 'Name is missing' });
    if (!p.number.trim()) out.push({ row, level: 'error', message: 'Number is missing' });
    else if (!/^\d{1,3}$/.test(p.number)) out.push({ row, level: 'error', message: 'Number must be 1–3 digits' });
    if (!sizeInfo(kit, p.size)) out.push({ row, level: 'error', message: `Size “${p.size || '—'}” is not one of ${sizeNames(kit)}` });
    if (p.number && seen.has(p.number)) out.push({ row, level: 'warning', message: `Number ${p.number} is also on row ${seen.get(p.number)}` });
    if (p.number) seen.set(p.number, row);
    if (p.name.length > 14) out.push({ row, level: 'warning', message: 'Long name — letters will be narrower' });
  });
  return out;
}

export function kitProduct(kit: KitDesign): Product {
  const id = KIT_STYLES.find((s) => s.id === kit.style)?.product || 'jersey';
  const base = PRODUCTS.find((p) => p.id === id)!;
  // V-neck: the jersey / vest front neckline becomes a V (same shoulder points), and the collar band gets longer.
  if (kit.neck === 'v' && (id === 'jersey' || id === 'vest')) {
    return {
      ...base,
      pieces: base.pieces.map((pc) => {
        if (pc.id === 'front') return { ...pc, d: pc.d.replace(/^M(\d+) 0C[^L]*?(\d+) 0L/, (_m, a, b) => `M${a} 0L${(Number(a) + Number(b)) / 2} ${id === 'vest' ? 210 : 175}L${b} 0L`) };
        if (pc.id === 'collar') return { ...pc, label: 'V-neck collar band', w: Math.round(pc.w * 1.12), d: `M0 0H${Math.round(pc.w * 1.12)}V45H0Z` };
        return pc;
      }),
    };
  }
  return base;
}
/** Which designer section a style belongs to. */
export function garmentOf(style: KitStyle): GarmentKind {
  return (Object.keys(GARMENT_STYLES) as GarmentKind[]).find((k) => GARMENT_STYLES[k].includes(style)) || 'jersey';
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const role = (id: string) => (id === 'front' || id === 'back' ? 'body' : id.startsWith('sleeve') ? 'sleeve' : 'trim');

/** Glyph outlines keyed by text: path in the -50…50 box (from lib/patternText). */
export type Glyphs = Record<string, string | null | undefined>;

/** A text outline placed with its centre at (cx, cy), cap height h, max width maxW (local units). */
export function placedText(d: string, cx: number, cy: number, h: number, maxW: number): { t: string; s: number } {
  const b = pathBox(d);
  let s = h / Math.max(1e-6, b.h);
  if (b.w * s > maxW) s = maxW / b.w;
  s = Math.round(s * 10000) / 10000;
  return { s, t: `translate(${r2(cx)} ${r2(cy)}) scale(${s}) translate(${r2(-(b.x + b.w / 2))} ${r2(-(b.y + b.h / 2))})` };
}

function textMarkup(text: string, glyphs: Glyphs, kit: KitDesign, color: string, cx: number, cy: number, h: number, maxW: number, k: number, live = false): string {
  if (!text) return '';
  const d = live ? null : glyphs[text];
  const ow = (kit.outlineMm * 2) / k;
  if (d) {
    const { t, s } = placedText(d, cx, cy, h, maxW);
    // Outline first (thick stroke underneath), then the fill.
    // Exact font outlines: nonzero winding, as the font defines its letters (connected script letters may overlap).
    return `${kit.outlineMm > 0 ? `<path d="${d}" transform="${t}" fill="${kit.outlineColor}" stroke="${kit.outlineColor}" stroke-width="${r2(ow / s)}" stroke-linejoin="round"/>` : ''}<path d="${d}" transform="${t}" fill="${color}"/>`;
  }
  // Live (retypeable) text in the chosen font — also the fallback while outlines are being made.
  return `<text x="${r2(cx)}" y="${r2(cy)}" font-family="'${esc(kit.font)}', sans-serif" font-weight="${kit.fontWeight}" font-size="${r2(h * 1.35)}" text-anchor="middle" dominant-baseline="central" fill="${color}"${kit.outlineMm > 0 ? ` stroke="${kit.outlineColor}" stroke-width="${r2(ow)}" paint-order="stroke"` : ''}>${esc(text)}</text>`;
}

function patternPaths(p: PatternSettings, w: number, h: number, mmPerTile: number, k: number): string {
  const d = motifPath(p);
  if (!d && !(p.motif === 'image' && p.image)) return '';
  const { w: tw } = layout(p);
  const s = mmPerTile / tw / k; // tile units → local piece units
  const places = sheetPlacements(p, w / s, h / s);
  return places.map((q) => placedMotif(p, d, q, `scale(${r2(s * 10000) / 10000}) `)).join('');
}

let clipSeq = 0;

/** Accent graphics for a body piece, in piece units (drawn over the bleed too; clipped by the caller). */
export function graphicMarkup(kit: KitDesign, w: number, h: number, b: number, back: boolean): string {
  const g = kit.graphic || 'plain';
  const a = kit.accent || '#C9A86A', a2 = kit.accent2 || '#FFFFFF';
  const R = (x: number, y: number, rw: number, rh: number, f = a) => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(rw)}" height="${r2(rh)}" fill="${f}"/>`;
  const X0 = -b - 2, XW = w + 2 * b + 4;
  switch (g) {
    case 'sash': {
      const bw = w * 0.24, ang = back ? 38 : -38;
      return `<g transform="rotate(${ang} ${r2(w / 2)} ${r2(h * 0.48)})">${R(-w, h * 0.48 - bw / 2 - 10, 3 * w, 10, a2)}${R(-w, h * 0.48 - bw / 2, 3 * w, bw)}${R(-w, h * 0.48 + bw / 2, 3 * w, 10, a2)}</g>`;
    }
    case 'hoops': {
      const hb = h / 10; let o = '';
      for (let y = h * 0.16; y < h + b; y += hb * 2) o += R(X0, y, XW, hb);
      return o;
    }
    case 'stripes': {
      const sw = w / 9; let o = '';
      for (let x = sw * 0.5; x < w + b; x += sw * 2) o += R(x, -b - 2, sw, h + 2 * b + 4);
      return o;
    }
    case 'pinstripes': {
      let o = '';
      for (let x = 20; x < w + b; x += 40) o += R(x, -b - 2, 5, h + 2 * b + 4);
      return o;
    }
    case 'side-panels':
      return R(X0, -b - 2, w * 0.13 + b + 2, h + 2 * b + 4) + R(w * 0.87, -b - 2, w * 0.13 + b + 2, h + 2 * b + 4) + R(w * 0.13, -b - 2, 7, h + 2 * b + 4, a2) + R(w * 0.87 - 7, -b - 2, 7, h + 2 * b + 4, a2);
    case 'chevron': {
      const y = h * 0.27, d = h * 0.15, bw = h * 0.075;
      const band = (y0: number, t: number, f: string) => `<path d="M${r2(X0)} ${r2(y0)}L${r2(w / 2)} ${r2(y0 + d)}L${r2(X0 + XW)} ${r2(y0)}L${r2(X0 + XW)} ${r2(y0 + t)}L${r2(w / 2)} ${r2(y0 + d + t)}L${r2(X0)} ${r2(y0 + t)}Z" fill="${f}"/>`;
      return band(y, bw, a) + band(y + bw + 12, 12, a2);
    }
    case 'yoke':
      return R(X0, -b - 2, XW, h * 0.24 + b + 2) + R(X0, h * 0.24, XW, 9, a2);
    case 'split':
      return back ? R(X0, -b - 2, w / 2 + b + 2, h + 2 * b + 4) : R(w / 2, -b - 2, w / 2 + b + 2, h + 2 * b + 4);
    case 'band':
      return R(X0, h * 0.30 - 14, XW, 8, a2) + R(X0, h * 0.30, XW, h * 0.085) + R(X0, h * 0.30 + h * 0.085 + 6, XW, 8, a2);
    case 'diagonal': {
      let o = ''; const sw = 34;
      for (let x = -h; x < w + h; x += sw * 2.6) o += `<rect x="${r2(x)}" y="${r2(-h)}" width="${sw}" height="${r2(3 * h)}" fill="${a}" transform="rotate(${back ? 30 : -30} ${r2(x)} ${r2(h / 2)})"/>`;
      return o;
    }
    case 'halftone': {
      // Dots that grow towards the hem — real circles, so they print as vectors.
      let o = ''; const step = 26;
      for (let y = h * 0.35; y < h + b + step; y += step) {
        const t = Math.min(1, (y - h * 0.35) / (h * 0.65));
        const rr = 1.5 + t * (step * 0.55);
        const off = (Math.round(y / step) % 2) * (step / 2);
        for (let x = -b - step + off; x < w + b + step; x += step) o += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(rr)}"/>`;
      }
      return `<g fill="${a}">${o}</g>`;
    }
    case 'double-sash': {
      const bw = w * 0.11, ang = back ? 38 : -38, cy = h * 0.48;
      return `<g transform="rotate(${ang} ${r2(w / 2)} ${r2(cy)})">${R(-w, cy - bw - 14, 3 * w, bw)}${R(-w, cy - 7, 3 * w, 14, a2)}${R(-w, cy + 14, 3 * w, bw)}</g>`;
    }
    case 'centre-stripe':
      return R(w / 2 - w * 0.09, -b - 2, w * 0.18, h + 2 * b + 4) + R(w / 2 - w * 0.09 - 12, -b - 2, 7, h + 2 * b + 4, a2) + R(w / 2 + w * 0.09 + 5, -b - 2, 7, h + 2 * b + 4, a2);
    default: return '';
  }
}

export interface Box { x: number; y: number; w: number; h: number }
/** Where each front / back element sits (size-M mm, piece units) — also the click targets in the editor. */
export function frontLayout(kit: KitDesign, w: number): { teamLogo: Box; sponsor: Box; frontText: Box; frontNum: Box } {
  const lm = kit.teamLogoMm ?? 85, sw = kit.sponsorMm ?? w * 0.6, sh = sw * 0.36;
  const fh = kit.frontTextMm || 60, fw = w * 0.72, nh = kit.frontNumMm ?? 80, nw = nh * 1.4;
  return {
    teamLogo: { x: (kit.teamLogoX ?? w * 0.62 + lm / 2) - lm / 2, y: kit.teamLogoY ?? 125, w: lm, h: lm },
    sponsor: { x: (kit.sponsorX ?? w / 2) - sw / 2, y: kit.sponsorY ?? 260, w: sw, h: sh },
    frontText: { x: (kit.frontTextX ?? w / 2) - fw / 2, y: kit.frontTextTopMm || 300, w: fw, h: fh },
    frontNum: { x: (kit.frontNumX ?? w * 0.3) - nw / 2, y: (kit.frontNumY ?? 168) - nh / 2, w: nw, h: nh },
  };
}
export function backLayout(kit: KitDesign, w: number): { name: Box; number: Box } {
  return { name: { x: w * 0.11, y: kit.nameTopMm, w: w * 0.78, h: kit.nameMm }, number: { x: w * 0.15, y: kit.numberTopMm, w: w * 0.7, h: kit.numberMm } };
}

/** One garment piece in its own local units (size-M millimetres), decorated for one player. */
export type TextMode = 'outline' | 'live';
/** Whether the standard name / number are drawn: not when the print-studio artwork has its own {NAME} / {NUMBER} (hidden layers count, so hiding one does not bring the standard one back). */
export function stdLettering(kit: KitDesign): { name: boolean; number: boolean } {
  const texts: string[] = [];
  const walk = (l: ArtEl[]) => l.forEach((e: any) => { if (e.kind === 'text') texts.push(String(e.text)); else if (e.kind === 'group') walk(e.els); });
  walk(kit.art || []);
  return { name: !texts.some((t) => /\{NAME\}/i.test(t)), number: !texts.some((t) => /\{NUMBER\}/i.test(t)) };
}
export function pieceMarkup(piece: Piece, kit: KitDesign, pat: PatternSettings, player: Player | null, glyphs: Glyphs, k: number, bleed: number, textMode: TextMode = 'outline'): string {
  const r = role(piece.id);
  const fill = r === 'body' ? kit.body : r === 'sleeve' ? kit.sleeve : kit.collar;
  const b = bleed / k; // bleed in local units
  const lk = kit.letterGrade === 'scale' ? 1 : k; // lettering height divisor: real size on every garment
  const id = `pc${++clipSeq}`;
  const sx = (piece.w + 2 * b) / piece.w, sy = (piece.h + 2 * b) / piece.h;
  const clip = `<clipPath id="${id}"><path d="${piece.d}" transform="translate(${r2(piece.w / 2)} ${r2(piece.h / 2)}) scale(${r2(sx * 1000) / 1000} ${r2(sy * 1000) / 1000}) translate(${r2(-piece.w / 2)} ${r2(-piece.h / 2)})"/></clipPath>`;
  const out: string[] = [clip];
  out.push(`<path d="${piece.d}" fill="${fill}" stroke="${fill}" stroke-width="${r2(2 * b)}" stroke-linejoin="round"/>`);
  const w = piece.w;
  const deco: string[] = [];
  const studio = !!kit.studioOnly;
  if (r === 'body' && !studio) deco.push(graphicMarkup(kit, w, piece.h, b, piece.id === 'back'));
  if (r === 'sleeve' && kit.cuffs && kit.graphic && kit.graphic !== 'plain') deco.push(`<rect x="${r2(-b - 2)}" y="${r2(piece.h - 34)}" width="${r2(w + 2 * b + 4)}" height="${r2(34 + b + 2)}" fill="${kit.accent || kit.collar}"/><rect x="${r2(-b - 2)}" y="${r2(piece.h - 46)}" width="${r2(w + 2 * b + 4)}" height="7" fill="${kit.accent2 || '#FFFFFF'}"/>`);
  const wantPattern = kit.patternOn === 'all' || (kit.patternOn === 'body' && r === 'body') || (kit.patternOn === 'sleeves' && r === 'sleeve');
  if (wantPattern) deco.push(`<g opacity="${kit.patternOpacity}"><g transform="translate(${r2(-b)} ${r2(-b)})">${patternPaths(pat, piece.w + 2 * b, piece.h + 2 * b, kit.repeatMm, k)}</g></g>`);
  // Print-studio artwork: the board clipped to this piece (plus bleed).
  if (kit.art?.length) deco.push(pieceArt(kit.art, boardLayout(kitProduct(kit)), piece.id, { textMode, vars: { name: player?.name ?? 'NAME', number: player?.number ?? '10', size: player?.size ?? 'M', team: kit.teamName }, uid: id, fixK: lk }));
  if (deco.some(Boolean)) out.push(`<g clip-path="url(#${id})">${deco.join('')}</g>`);
  const personal = kit.personalise !== false && !studio;
  // Print-studio lettering replaces the standard name / number (never both at once).
  const std = stdLettering(kit);
  if (piece.id === 'back' && player && personal) {
    if (std.name) out.push(textMarkup(player.name.toUpperCase(), glyphs, kit, kit.nameColor, w / 2, kit.nameTopMm + kit.nameMm / 2, kit.nameMm / lk, w * 0.78, k, textMode === 'live'));
    if (std.number) out.push(textMarkup(player.number, glyphs, kit, kit.numberColor, w / 2, kit.numberTopMm + kit.numberMm / 2, kit.numberMm / lk, w * 0.7, k, textMode === 'live'));
  }
  if (piece.id === 'front' && !studio) {
    const logo = (href: string, x: number, y: number, bw: number, bh: number) => `<image href="${href}" x="${r2(x)}" y="${r2(y)}" width="${r2(bw)}" height="${r2(bh)}" preserveAspectRatio="xMidYMid meet"/>`;
    const L = frontLayout(kit, w);
    if (kit.teamLogo) out.push(logo(kit.teamLogo, L.teamLogo.x, L.teamLogo.y, L.teamLogo.w, L.teamLogo.h));
    if (kit.sponsorLogo) out.push(logo(kit.sponsorLogo, L.sponsor.x, L.sponsor.y, L.sponsor.w, L.sponsor.h));
    if (kit.frontText && kit.frontText.trim()) out.push(textMarkup(kit.frontText.trim(), glyphs, { ...kit, outlineMm: 0 }, kit.frontTextColor || '#FFFFFF', L.frontText.x + L.frontText.w / 2, L.frontText.y + L.frontText.h / 2, L.frontText.h, L.frontText.w, k, textMode === 'live'));
    if (kit.frontNumber && player && personal && std.number) out.push(textMarkup(player.number, glyphs, kit, kit.numberColor, L.frontNum.x + L.frontNum.w / 2, L.frontNum.y + L.frontNum.h / 2, L.frontNum.h / lk, L.frontNum.w, k, textMode === 'live'));
  }
  return out.join('');
}

/** Front and back (plus sleeves) side by side, for the on-screen preview. */
export function kitPreviewSvg(kit: KitDesign, pat: PatternSettings, player: Player | null, glyphs: Glyphs): string {
  const product = kitProduct(kit);
  const k = sizeInfo(kit, player?.size || 'M')?.k || 1;
  const front = product.pieces.find((p) => p.id === 'front')!, back = product.pieces.find((p) => p.id === 'back')!;
  const sleeves = product.pieces.filter((p) => p.id.startsWith('sleeve'));
  const gap = 60, W = front.w + back.w + gap, sh = sleeves.length ? sleeves[0].h + 40 : 0, H = Math.max(front.h, back.h) + sh;
  let body = `<g>${pieceMarkup(front, kit, pat, player, glyphs, k, 0)}</g><g transform="translate(${front.w + gap} 0)">${pieceMarkup(back, kit, pat, player, glyphs, k, 0)}</g>`;
  sleeves.forEach((sl, i) => {
    const x = i === 0 ? (front.w - sl.w) / 2 : front.w + gap + (back.w - sl.w) / 2;
    body += `<g transform="translate(${r2(x + (sl.mirror ? sl.w : 0))} ${Math.max(front.h, back.h) + 40}) scale(${sl.mirror ? -1 : 1} 1)">${pieceMarkup(sl, kit, pat, player, glyphs, k, 0)}</g>`;
  });
  const lab = `<text x="${front.w / 2}" y="-14" text-anchor="middle" font-size="22" fill="#888" font-family="sans-serif">FRONT</text><text x="${front.w + gap + back.w / 2}" y="-14" text-anchor="middle" font-size="22" fill="#888" font-family="sans-serif">BACK</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-20 -50 ${W + 40} ${H + 70}">${lab}${body}</svg>`;
}

/**
 * Realistic front and back view of the finished garment (sleeves attached,
 * collar, soft shading) for the on-screen preview. Same artwork as the print
 * pieces; only the sleeves are folded the way they hang when worn.
 */
export function kitMockupSvg(kit: KitDesign, pat: PatternSettings, player: Player | null, glyphs: Glyphs, view: 'both' | 'front' | 'back' = 'both', edit?: { selected?: string | null }): string {
  const product = kitProduct(kit);
  const k = sizeInfo(kit, player?.size || 'M')?.k || 1;
  const front = product.pieces.find((p) => p.id === 'front')!, back = product.pieces.find((p) => p.id === 'back')!;
  const sleeve = product.pieces.find((p) => p.id === 'sleeve-l');
  const W = front.w;
  const sid = `mk${++clipSeq}`;
  // Folded sleeve outline (left side, in body units) and how the sleeve piece sits in it.
  const sleevePoly = 'M60 30L-142 150L-62 278L30 262Z';
  const sleeveAt = 'translate(-100 212) rotate(57.4) translate(-220 -228)';
  const sleeves = (_isBack: boolean) => {
    if (!sleeve) return '';
    const oneOf = (pc: Piece) => `<g clip-path="url(#${sid}-sl)"><path d="${sleevePoly}" fill="${kit.sleeve}"/><g transform="${sleeveAt}">${pieceMarkup(pc, kit, pat, player, glyphs, k, 0)}</g><path d="${sleevePoly}" fill="url(#${sid}-sh)" opacity="0.5"/></g><path d="${sleevePoly}" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>${edit ? `<path class="mt-part" data-el="sleeve" d="${sleevePoly}" fill="transparent" stroke="${edit.selected === 'sleeve' ? '#3B82C4' : 'transparent'}" stroke-width="4"/>` : ''}`;
    // The right sleeve is its own piece (its print art is pre-mirrored, so mirroring it here reads right).
    const right = product.pieces.find((p) => p.id === 'sleeve-r') || sleeve;
    return `${oneOf(sleeve)}<g transform="translate(${W} 0) scale(-1 1)">${oneOf(right)}</g>`;
  };
  const neck = (p: Piece) => p.d.match(/^M[\d.]+ 0L[\d.]+ [\d.]+L[\d.]+ 0/)?.[0] || p.d.match(/^M[^L]*?(?=L)/)?.[0] || '';
  // Editor click targets: every part of the shirt and every element on it.
  const hits = (piece: Piece, isBack: boolean) => {
    const sel = edit?.selected || null;
    const box = (el: string, b: Box, label?: string, empty?: boolean) => {
      const on = sel === el;
      const ph = empty ? `<rect x="${r2(b.x)}" y="${r2(b.y)}" width="${r2(b.w)}" height="${r2(b.h)}" rx="8" fill="#3B82C4" fill-opacity="0.08" stroke="#3B82C4" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="7 6" pointer-events="none"/><text x="${r2(b.x + b.w / 2)}" y="${r2(b.y + b.h / 2)}" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="${r2(Math.min(26, b.h * 0.4))}" font-weight="700" fill="#3B82C4" pointer-events="none">${esc(label || '+')}</text>` : '';
      return `${ph}<rect class="mt-hit" data-el="${el}" x="${r2(b.x - 6)}" y="${r2(b.y - 6)}" width="${r2(b.w + 12)}" height="${r2(b.h + 12)}" rx="8" fill="transparent" stroke="${on ? '#3B82C4' : 'transparent'}" stroke-width="3" stroke-dasharray="${on ? '0' : '8 6'}"/>${on ? [[b.x - 6, b.y - 6], [b.x + b.w + 6, b.y - 6], [b.x - 6, b.y + b.h + 6], [b.x + b.w + 6, b.y + b.h + 6]].map(([x, y]) => `<rect x="${r2(x - 6)}" y="${r2(y - 6)}" width="12" height="12" fill="#fff" stroke="#3B82C4" stroke-width="3" pointer-events="none"/>`).join('') : ''}`;
    };
    const part = (el: string, d: string) => `<path class="mt-part" data-el="${el}" d="${d}" fill="transparent" stroke="${sel === el ? '#3B82C4' : 'transparent'}" stroke-width="4"/>`;
    let o = part('body', piece.d) + `<path class="mt-part" data-el="collar" d="${neck(piece)}" fill="none" stroke="${sel === 'collar' ? '#3B82C4' : 'transparent'}" stroke-width="34" stroke-opacity="${sel === 'collar' ? 0.35 : 1}" pointer-events="stroke"/>`;
    const personal = kit.personalise !== false;
    if (isBack) {
      if (personal) { const B = backLayout(kit, piece.w); const sl = stdLettering(kit); o += (sl.name ? box('name', B.name) : '') + (sl.number ? box('number', B.number) : ''); }
    } else {
      const L = frontLayout(kit, piece.w);
      o += box('teamLogo', L.teamLogo, '+ Logo', !kit.teamLogo) + box('sponsor', L.sponsor, '+ Sponsor / print', !kit.sponsorLogo) + box('frontText', L.frontText, '+ Text', !(kit.frontText || '').trim());
      if (kit.frontNumber && personal && stdLettering(kit).number) o += box('frontNum', L.frontNum);
    }
    return o;
  };
  const view1 = (piece: Piece, isBack: boolean) => {
    const inner = isBack ? "" : `<path d="${neck(piece)}Z" fill="${shade(kit.body, -0.45)}"/>`;
    const collar = product.id === 'polo'
      ? `<path d="M250 80L250 232L310 232L310 80Z" fill="${kit.collar}" opacity="${isBack ? 0 : 1}"/>${isBack ? '' : placketButtons(kit)}<path d="${isBack ? 'M185 -6C215 26 345 26 375 -6L372 -26C340 -2 220 -2 188 -26Z' : 'M196 -8C230 -30 330 -30 364 -8L362 4C330 -14 230 -14 198 4ZM198 -6L279 4L247 104L172 30ZM362 -6L281 4L313 104L388 30Z'}" fill="${kit.collar}" stroke="${shade(kit.collar, -0.25)}" stroke-width="2"/>`
      : `<path d="${neck(piece)}" fill="none" stroke="${kit.collar}" stroke-width="${product.id === 'vest' ? 14 : 20}" stroke-linecap="round"/>`;
    const arm = product.id === 'vest' ? `<path d="M95 0C95 120 65 185 0 225M465 0C465 120 495 185 560 225" fill="none" stroke="${kit.collar}" stroke-width="12" stroke-linecap="round"/>` : '';
    return `${sleeves(isBack)}${inner}<g>${pieceMarkup(piece, kit, pat, player, glyphs, k, 0)}</g><path d="${piece.d}" fill="url(#${sid}-sh)" opacity="0.55"/>${arm}${collar}<path d="${piece.d}" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>${edit ? hits(piece, isBack) : ''}`;
  };
  const defs = `<defs><clipPath id="${sid}-sl"><path d="${sleevePoly}"/></clipPath><linearGradient id="${sid}-sh" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.22"/><stop offset="0.18" stop-color="#000" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.10"/><stop offset="0.82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></linearGradient></defs>`;
  const pad = sleeve ? 170 : 30, gap = 120, H = Math.max(front.h, back.h);
  const views: [Piece, boolean, string][] = view === 'front' ? [[front, false, 'FRONT']] : view === 'back' ? [[back, true, 'BACK']] : [[front, false, 'FRONT'], [back, true, 'BACK']];
  const cell = W + 2 * pad;
  const body = views.map(([pc, isB, lab], i) => `<g transform="translate(${pad + i * (cell + gap)} 40)">${view1(pc, isB)}<text x="${W / 2}" y="${H + 60}" text-anchor="middle" font-size="24" letter-spacing="4" fill="#8A8F98" font-family="Arial, sans-serif">${lab}</text></g>`).join('');
  const TW = views.length * cell + (views.length - 1) * gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${TW} ${H + 120}">${defs}${body}</svg>`;
}

/** Buttons on the polo placket (front view). */
function placketButtons(kit: KitDesign): string {
  const n = Math.max(0, Math.min(4, Math.round(kit.placketButtons ?? 3)));
  if (!n) return '';
  const c = kit.buttonColor || shade(kit.collar, 0.55);
  return Array.from({ length: n }, (_, i) => { const y = 110 + (i * 100) / Math.max(1, n - 1 || 1); return `<circle cx="280" cy="${n === 1 ? 150 : Math.round(y)}" r="7" fill="${c}" stroke="${shade(c, -0.35)}" stroke-width="1.5"/><circle cx="278" cy="${n === 1 ? 148 : Math.round(y) - 2}" r="1.6" fill="${shade(c, -0.4)}"/><circle cx="282" cy="${n === 1 ? 152 : Math.round(y) + 2}" r="1.6" fill="${shade(c, -0.4)}"/>`; }).join('');
}

/** Lighter (amt > 0) or darker (amt < 0) version of a hex colour. */
export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '').padEnd(6, '0');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0).map((v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
  return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

/**
 * One player's print file: every piece of their size at real size with
 * bleed, laid out on the roll, in millimetres (or pixels at 96 DPI with
 * `px: true`, which the PDF writer reads).
 */
export function playerPrintSvg(kit: KitDesign, pat: PatternSettings, player: Player, glyphs: Glyphs, opts: { rollW: number; bleed: number; cutLines: boolean; px?: boolean; textMode?: TextMode }): { svg: string; width: number; height: number; placed: Placed[] } {
  const product = kitProduct(kit);
  const sz = sizeInfo(kit, player.size) || { k: 1, label: player.size || 'M' };
  const { placed, height } = layoutPieces(product, sz.k, opts.rollW, opts.bleed);
  const parts = placed.map((pl) => `<g transform="${pieceTransform(pl)}">${pieceMarkup(pl.piece, kit, pat, player, glyphs, pl.k, opts.bleed, opts.textMode)}</g>`).join('');
  const cuts = opts.cutLines ? `<g id="cut-lines" fill="none" stroke="#EC008C" stroke-width="0.5">${placed.map((pl) => `<path d="${pl.piece.d}" transform="${pieceTransform(pl)}" vector-effect="non-scaling-stroke"/>`).join('')}</g>` : '';
  const label = `<text x="15" y="${height - 4}" font-family="sans-serif" font-size="7" fill="#666">${esc(`${kit.teamName} · ${player.name} #${player.number} · size ${sz.label} · ${product.label} · ${opts.rollW} mm roll · bleed ${opts.bleed} mm`)}</text>`;
  const W = opts.rollW;
  const unit = opts.px ? 96 / 25.4 : 1;
  const inner = `${parts}${cuts}${label}`;
  const svg = opts.px
    ? `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r2(W * unit)}" height="${r2(height * unit)}" viewBox="0 0 ${r2(W * unit)} ${r2(height * unit)}"><g transform="scale(${unit})">${inner}</g></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}mm" height="${height}mm" viewBox="0 0 ${W} ${height}">${inner}</svg>`;
  return { svg, width: W, height, placed };
}

export interface SheetOptions { rollW: number; bleed: number; gap?: number; pageMm?: number; cutLines: boolean; group?: 'player' | 'fabric'; mirror?: boolean; px?: boolean; textMode?: TextMode }
export interface SheetPage { svg: string; width: number; height: number; pieces: number }

/** The garments to print: one per player, or (not personalised) one per quantity of each size. */
export function printList(players: Player[], kit: KitDesign): Player[] {
  if (kit.personalise !== false) return players;
  const out: Player[] = [];
  for (const p of players) for (let i = 0; i < Math.max(0, Math.min(500, Math.round(Number(p.qty) || 0))); i++) out.push({ name: '', number: '', size: p.size });
  return out;
}

/**
 * Every selected player's pieces nested together on the roll — one print
 * file for the whole order. Pieces keep their player's size, name and number
 * and get a small label (player · size · piece) in the gap above them. When
 * the run is longer than `pageMm`, it continues on the next PDF page.
 */
/** True area of a piece outline (mm² at size M). */
const areaCache = new Map<string, number>();
export function pieceArea(piece: Piece): number {
  const hit = areaCache.get(piece.d); if (hit != null) return hit;
  let a = 0;
  try { for (const r of flatten(normalize(piece.d), 0.5)) a += polyArea(r.pts); } catch { a = piece.w * piece.h; }
  if (!(a > 0)) a = piece.w * piece.h;
  areaCache.set(piece.d, a);
  return a;
}

export function rosterSheets(kit: KitDesign, pat: PatternSettings, players: Player[], glyphs: Glyphs, o: SheetOptions): { pages: SheetPage[]; totalMm: number; tooWide: number; utilisation: number; overlaps: number } {
  const product = kitProduct(kit);
  const gap = o.gap ?? 15, bleed = o.bleed, rollW = o.rollW, pageMax = Math.max(500, o.pageMm || 5000);
  type It = { piece: Piece; w: number; h: number; k: number; copy: number; player: Player; idx: number; rot?: boolean; tooWide?: boolean };
  const items: It[] = [];
  players.forEach((pl, idx) => {
    const k = sizeInfo(kit, pl.size)?.k || 1;
    for (const pc of product.pieces) for (let c = 0; c < pc.qty; c++) items.push({ piece: pc, w: pc.w * k, h: pc.h * k, k, copy: c, player: pl, idx });
  });
  const room = rollW - 2 * gap - 2 * bleed;
  for (const it of items) if (it.w > room) { if (it.h <= room) { const t = it.w; it.w = it.h; it.h = t; it.rot = true; } else it.tooWide = true; }
  if (o.group === 'fabric') items.sort((a, b) => b.h - a.h || b.w - a.w);
  else items.sort((a, b) => a.idx - b.idx || b.h - a.h || b.w - a.w);
  const LAB = 9; // label line above each piece
  const pages: { placed: (Placed & { player: Player; idx: number })[]; height: number }[] = [];
  let cur: (Placed & { player: Player; idx: number })[] = [];
  let x = gap, y = gap, rowH = 0, lastIdx = -1;
  const close = () => { pages.push({ placed: cur, height: Math.ceil(y + rowH + gap) }); cur = []; x = gap; y = gap; rowH = 0; };
  if (o.group === 'fabric') {
    // Save fabric: compact nesting (MaxRects, pieces may turn 90°), split into pages at piece boundaries.
    const res = nest(items.map((it, i) => ({ id: String(i), w: it.piece.w * it.k + 2 * bleed + LAB, h: it.piece.h * it.k + 2 * bleed + LAB, canRotate: !it.tooWide })), { rollW, gap });
    const byY = res.placed.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    let start = 0, bottom = 0, list: (Placed & { player: Player; idx: number })[] = [];
    const flush = () => { if (list.length) pages.push({ placed: list, height: Math.ceil(bottom - start + gap) }); list = []; };
    for (const p of byY) {
      const it = items[Number(p.id)];
      if (list.length && p.y + p.h - start > pageMax - gap) { flush(); start = p.y - gap; bottom = 0; }
      // The box has a label line above the piece either way round (its extra width stays as gap).
      const w = p.rot ? it.piece.h * it.k : it.piece.w * it.k, h = p.rot ? it.piece.w * it.k : it.piece.h * it.k;
      const lx = p.x, ly = p.y - start + LAB;
      list.push({ piece: it.piece, x: lx + bleed, y: ly + bleed, w, h, k: it.k, copy: it.copy, rot: p.rot || undefined, tooWide: res.tooWide.includes(p.id) || undefined, player: it.player, idx: it.idx });
      bottom = Math.max(bottom, p.y + p.h);
    }
    flush();
  } else for (const it of items) {
    const Wd = it.w + 2 * bleed, Hd = it.h + 2 * bleed + LAB;
    const newRow = (x + Wd + gap > rollW && x > gap) || (lastIdx >= 0 && it.idx !== lastIdx && x > gap);
    if (newRow) { x = gap; y += rowH + gap; rowH = 0; }
    if (y + Hd + gap > pageMax && cur.length) close();
    cur.push({ piece: it.piece, x: x + bleed, y: y + LAB + bleed, w: it.w, h: it.h, k: it.k, copy: it.copy, rot: it.rot, tooWide: it.tooWide, player: it.player, idx: it.idx });
    x += Wd + gap; rowH = Math.max(rowH, Hd); lastIdx = it.idx;
  }
  if (cur.length) close();
  const personal = kit.personalise !== false;
  const out: SheetPage[] = pages.map((pg, n) => {
    const H = pg.height + 14;
    const flip = o.mirror ? ` transform="translate(${rollW} 0) scale(-1 1)"` : '';
    const parts = pg.placed.map((pl) => `<g transform="${pieceTransform(pl)}">${pieceMarkup(pl.piece, kit, pat, pl.player, glyphs, pl.k, bleed, o.textMode)}</g>`).join('');
    const cuts = o.cutLines ? `<g id="cut-lines" fill="none" stroke="#EC008C" stroke-width="0.5"${flip}>${pg.placed.map((pl) => `<path d="${pl.piece.d}" transform="${pieceTransform(pl)}" vector-effect="non-scaling-stroke"/>`).join('')}</g>` : '';
    const sz = (pl: Player) => sizeInfo(kit, pl.size)?.label || pl.size;
    const labels = `<g id="labels" font-family="Arial, Helvetica, sans-serif" font-size="6.5" fill="#444">${pg.placed.map((pl) => {
      const who = personal ? `${pl.idx + 1}. ${pl.player.name.toUpperCase()} #${pl.player.number}` : `${pl.idx + 1}.`;
      const lx = o.mirror ? rollW - pl.x - pl.w : pl.x;
      return `<text x="${r2(lx - bleed)}" y="${r2(pl.y - bleed - 2.5)}">${esc(`${who} · ${sz(pl.player)} · ${pl.piece.label}${pl.piece.qty > 1 ? ` ${pl.copy + 1}` : ''}${pl.rot ? ' · turned' : ''}${pl.tooWide ? ' · WIDER THAN ROLL' : ''}`)}</text>`;
    }).join('')}</g>`;
    const foot = `<text x="${gap}" y="${H - 5}" font-family="Arial, Helvetica, sans-serif" font-size="7" fill="#666">${esc(`${kit.teamName} · ${product.label} · ${players.length} garments · page ${n + 1} of ${pages.length} · roll ${rollW} mm · bleed ${bleed} mm${o.mirror ? ' · mirrored' : ''} · print at 100%`)}</text>`;
    const inner = `<g id="print"${flip}>${parts}</g>${cuts}${labels}${foot}`;
    const unit = o.px ? 96 / 25.4 : 1;
    const svg = o.px
      ? `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r2(rollW * unit)}" height="${r2(H * unit)}" viewBox="0 0 ${r2(rollW * unit)} ${r2(H * unit)}"><g transform="scale(${unit})">${inner}</g></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${rollW}mm" height="${H}mm" viewBox="0 0 ${rollW} ${H}">${inner}</svg>`;
    return { svg, width: rollW, height: H, pieces: pg.placed.length };
  });
  // Fabric use from the true piece shapes; overlaps are checked on the final layout (a sheet with any is not ready).
  const totalMm = out.reduce((a, p) => a + p.height, 0);
  const used = items.reduce((s, it) => s + pieceArea(it.piece) * it.k * it.k, 0);
  const overlaps = pages.reduce((n, pg) => n + findOverlaps(pg.placed.map((pl, i) => ({ id: String(i), x: pl.x - bleed, y: pl.y - bleed, w: pl.w + 2 * bleed, h: pl.h + 2 * bleed })), 0).length, 0);
  return { pages: out, totalMm, tooWide: items.filter((i) => i.tooWide).length, utilisation: totalMm ? Math.min(1, used / (rollW * totalMm)) : 0, overlaps };
}

/** Every distinct string that needs a letter outline for this roster. */
export function glyphTexts(players: Player[], kit: KitDesign): string[] {
  const s = new Set<string>();
  for (const p of players) { if (p.name.trim()) s.add(p.name.toUpperCase()); if (p.number) s.add(p.number); }
  if (kit.personalise === false) s.clear();
  if (kit.frontText && kit.frontText.trim()) s.add(kit.frontText.trim());
  return [...s];
}

export const safeFile = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'player';
