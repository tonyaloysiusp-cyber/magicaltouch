// Team kits: one master jersey design + a roster → a personalised print
// file for every player (pure functions, no browser APIs).
//
// The master holds colours, the pattern, logos, the font and where names
// and numbers go. Each player row (name, number, size) is applied to a copy
// at generation time; the master itself never changes.
//
// Everything is drawn as plain vectors in millimetres: piece outlines,
// every pattern motif as its own path (clipped to the piece plus bleed),
// names and numbers as letter outlines (traced from the chosen font in the
// browser and passed in as `glyphs`). Logos stay pictures, as supplied.

import { PRODUCTS, SIZES, layoutPieces, pieceTransform } from './garments.ts';
import type { Product, Piece, Placed } from './garments.ts';
import { sheetPlacements, motifPath, layout } from './patterns.ts';
import type { PatternSettings } from './patterns.ts';
import { pathBox } from './pathFit.ts';

export type KitStyle = 'tshirt' | 'football' | 'cricket' | 'basketball';
export const KIT_STYLES: { id: KitStyle; label: string; product: string }[] = [
  { id: 'football', label: 'Football jersey', product: 'jersey' },
  { id: 'tshirt', label: 'T-shirt', product: 'jersey' },
  { id: 'cricket', label: 'Cricket / polo shirt', product: 'polo' },
  { id: 'basketball', label: 'Basketball vest', product: 'vest' },
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
}

export const DEFAULT_KIT: KitDesign = {
  style: 'football', body: '#1E3A5F', sleeve: '#1E3A5F', collar: '#C9A86A', patternOn: 'body', patternOpacity: 0.35, repeatMm: 70,
  font: 'Oswald', fontWeight: 700, nameColor: '#FFFFFF', numberColor: '#FFFFFF', outlineColor: '#C9A86A', outlineMm: 2,
  nameMm: 55, numberMm: 230, nameTopMm: 95, numberTopMm: 175, frontNumber: true, teamLogo: null, sponsorLogo: null, teamName: 'My Team',
};

export interface Player { name: string; number: string; size: string }
export interface RosterIssue { row: number; level: 'error' | 'warning'; message: string }

const SIZE_IDS = new Map(SIZES.map((s) => [s.label.toLowerCase().replace(/ .*/, ''), s.id] as [string, string]).concat(SIZES.map((s) => [s.id, s.id] as [string, string])));
export const sizeId = (s: string) => SIZE_IDS.get(s.trim().toLowerCase().replace(/ .*/, '')) || null;

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

export function checkRoster(players: Player[]): RosterIssue[] {
  const out: RosterIssue[] = [];
  const seen = new Map<string, number>();
  players.forEach((p, i) => {
    const row = i + 1;
    if (!p.name.trim()) out.push({ row, level: 'error', message: 'Name is missing' });
    if (!p.number.trim()) out.push({ row, level: 'error', message: 'Number is missing' });
    else if (!/^\d{1,3}$/.test(p.number)) out.push({ row, level: 'error', message: 'Number must be 1–3 digits' });
    if (!sizeId(p.size)) out.push({ row, level: 'error', message: `Size “${p.size || '—'}” is not one of ${SIZES.map((s) => s.label.replace(/ .*/, '')).join(', ')}` });
    if (p.number && seen.has(p.number)) out.push({ row, level: 'warning', message: `Number ${p.number} is also on row ${seen.get(p.number)}` });
    if (p.number) seen.set(p.number, row);
    if (p.name.length > 14) out.push({ row, level: 'warning', message: 'Long name — letters will be narrower' });
  });
  return out;
}

export function kitProduct(kit: KitDesign): Product {
  const id = KIT_STYLES.find((s) => s.id === kit.style)?.product || 'jersey';
  return PRODUCTS.find((p) => p.id === id)!;
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

function textMarkup(text: string, glyphs: Glyphs, kit: KitDesign, color: string, cx: number, cy: number, h: number, maxW: number, k: number): string {
  if (!text) return '';
  const d = glyphs[text];
  const ow = (kit.outlineMm * 2) / k;
  if (d) {
    const { t, s } = placedText(d, cx, cy, h, maxW);
    // Outline first (thick stroke underneath), then the fill.
    return `${kit.outlineMm > 0 ? `<path d="${d}" transform="${t}" fill="${kit.outlineColor}" stroke="${kit.outlineColor}" stroke-width="${r2(ow / s)}" stroke-linejoin="round" fill-rule="evenodd"/>` : ''}<path d="${d}" transform="${t}" fill="${color}" fill-rule="evenodd"/>`;
  }
  // Fallback while outlines are being made: live text in the chosen font.
  return `<text x="${r2(cx)}" y="${r2(cy)}" font-family="'${esc(kit.font)}', sans-serif" font-weight="${kit.fontWeight}" font-size="${r2(h * 1.35)}" text-anchor="middle" dominant-baseline="central" fill="${color}"${kit.outlineMm > 0 ? ` stroke="${kit.outlineColor}" stroke-width="${r2(ow)}" paint-order="stroke"` : ''}>${esc(text)}</text>`;
}

function patternPaths(p: PatternSettings, w: number, h: number, mmPerTile: number, k: number): string {
  const d = motifPath(p);
  if (!d) return '';
  const { w: tw } = layout(p);
  const s = mmPerTile / tw / k; // tile units → local piece units
  const places = sheetPlacements(p, w / s, h / s);
  return places.map((q) => `<path d="${d}" fill="${q.color}" fill-rule="evenodd" transform="scale(${r2(s * 10000) / 10000}) translate(${q.x} ${q.y}) rotate(${q.angle}) scale(${q.sx} ${q.sy})"/>`).join('');
}

let clipSeq = 0;
/** One garment piece in its own local units (size-M millimetres), decorated for one player. */
export function pieceMarkup(piece: Piece, kit: KitDesign, pat: PatternSettings, player: Player | null, glyphs: Glyphs, k: number, bleed: number): string {
  const r = role(piece.id);
  const fill = r === 'body' ? kit.body : r === 'sleeve' ? kit.sleeve : kit.collar;
  const b = bleed / k; // bleed in local units
  const id = `pc${++clipSeq}`;
  const sx = (piece.w + 2 * b) / piece.w, sy = (piece.h + 2 * b) / piece.h;
  const clip = `<clipPath id="${id}"><path d="${piece.d}" transform="translate(${r2(piece.w / 2)} ${r2(piece.h / 2)}) scale(${r2(sx * 1000) / 1000} ${r2(sy * 1000) / 1000}) translate(${r2(-piece.w / 2)} ${r2(-piece.h / 2)})"/></clipPath>`;
  const out: string[] = [clip];
  out.push(`<path d="${piece.d}" fill="${fill}" stroke="${fill}" stroke-width="${r2(2 * b)}" stroke-linejoin="round"/>`);
  const wantPattern = kit.patternOn === 'all' || (kit.patternOn === 'body' && r === 'body') || (kit.patternOn === 'sleeves' && r === 'sleeve');
  if (wantPattern) out.push(`<g clip-path="url(#${id})" opacity="${kit.patternOpacity}"><g transform="translate(${r2(-b)} ${r2(-b)})">${patternPaths(pat, piece.w + 2 * b, piece.h + 2 * b, kit.repeatMm, k)}</g></g>`);
  const w = piece.w;
  if (piece.id === 'back' && player) {
    out.push(textMarkup(player.name.toUpperCase(), glyphs, kit, kit.nameColor, w / 2, kit.nameTopMm + kit.nameMm / 2, kit.nameMm, w * 0.78, k));
    out.push(textMarkup(player.number, glyphs, kit, kit.numberColor, w / 2, kit.numberTopMm + kit.numberMm / 2, kit.numberMm, w * 0.7, k));
  }
  if (piece.id === 'front') {
    const logo = (href: string, x: number, y: number, bw: number, bh: number) => `<image href="${href}" x="${r2(x)}" y="${r2(y)}" width="${r2(bw)}" height="${r2(bh)}" preserveAspectRatio="xMidYMid meet"/>`;
    if (kit.teamLogo) out.push(logo(kit.teamLogo, w * 0.62, 125, 85, 85));
    if (kit.sponsorLogo) out.push(logo(kit.sponsorLogo, w * 0.2, 260, w * 0.6, 120));
    if (kit.frontNumber && player) out.push(textMarkup(player.number, glyphs, kit, kit.numberColor, w * 0.3, 168, 80, 110, k));
  }
  return out.join('');
}

/** Front and back (plus sleeves) side by side, for the on-screen preview. */
export function kitPreviewSvg(kit: KitDesign, pat: PatternSettings, player: Player | null, glyphs: Glyphs): string {
  const product = kitProduct(kit);
  const k = SIZES.find((s) => s.id === sizeId(player?.size || 'M'))?.k || 1;
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
 * One player's print file: every piece of their size at real size with
 * bleed, laid out on the roll, in millimetres (or pixels at 96 DPI with
 * `px: true`, which the PDF writer reads).
 */
export function playerPrintSvg(kit: KitDesign, pat: PatternSettings, player: Player, glyphs: Glyphs, opts: { rollW: number; bleed: number; cutLines: boolean; px?: boolean }): { svg: string; width: number; height: number; placed: Placed[] } {
  const product = kitProduct(kit);
  const sz = SIZES.find((s) => s.id === sizeId(player.size)) || SIZES[3];
  const { placed, height } = layoutPieces(product, sz.k, opts.rollW, opts.bleed);
  const parts = placed.map((pl) => `<g transform="${pieceTransform(pl)}">${pieceMarkup(pl.piece, kit, pat, player, glyphs, pl.k, opts.bleed)}</g>`).join('');
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

/** Every distinct string that needs a letter outline for this roster. */
export function glyphTexts(players: Player[], kit: KitDesign): string[] {
  const s = new Set<string>();
  for (const p of players) { if (p.name.trim()) s.add(p.name.toUpperCase()); if (p.number) s.add(p.number); }
  if (kit.frontNumber) for (const p of players) if (p.number) s.add(p.number);
  return [...s];
}

export const safeFile = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'player';
