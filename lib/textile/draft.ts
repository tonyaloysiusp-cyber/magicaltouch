// Pattern drafting from the customer's own measurements (all in cm in,
// mm out). Nothing here is a standard size: every body measurement must be
// typed by the user. The few construction choices (ease, shoulder drop,
// neck width, flare, gathers) are style settings with visible defaults
// that the user can change. The result is a set of flat pieces (same model
// as the jersey templates) that the print studio, the roll layout, the
// print PDF and the tech pack all understand.
//
// Drafted pieces must be tried as a test garment (toile) before cutting
// good fabric — the UI says so.

import type { Piece, Product } from '../garments.ts';

export type GarmentType = 'tshirt' | 'polo' | 'kurta' | 'chudidar' | 'dupatta' | 'fabric' | 'tee';
export type NeckStyle = 'round' | 'v' | 'boat' | 'square';
export type SleeveStyle = 'sleeveless' | 'cap' | 'short' | 'elbow' | 'three-quarter' | 'full';

export interface Field { key: string; label: string; hint?: string; style?: boolean; min: number; max: number }

/** Body measurements (required) and style settings (with defaults) per garment, in cm. */
export const KURTA_FIELDS: Field[] = [
  { key: 'bust', label: 'Bust / chest (round)', min: 50, max: 200 },
  { key: 'waist', label: 'Waist (round)', min: 40, max: 200 },
  { key: 'hip', label: 'Hip / seat (round)', min: 50, max: 220 },
  { key: 'shoulder', label: 'Shoulder (across the back, point to point)', min: 25, max: 70 },
  { key: 'length', label: 'Kurta length (shoulder to hem)', min: 40, max: 160 },
  { key: 'waistLength', label: 'Shoulder to waist', min: 25, max: 70 },
  { key: 'armhole', label: 'Armhole (round)', min: 25, max: 70 },
  { key: 'frontNeck', label: 'Front neck depth', min: 5, max: 35 },
  { key: 'backNeck', label: 'Back neck depth', min: 1, max: 30 },
  { key: 'sleeveLength', label: 'Sleeve length (shoulder down)', hint: 'For the sleeve style you want', min: 3, max: 90 },
  { key: 'bicep', label: 'Upper arm (round)', min: 15, max: 70 },
  { key: 'sleeveOpening', label: 'Sleeve opening (round)', min: 12, max: 70 },
  { key: 'neckWidth', label: 'Neck width', style: true, min: 8, max: 35 },
  { key: 'ease', label: 'Ease added to bust, waist and hip', style: true, min: 0, max: 20 },
  { key: 'shoulderDrop', label: 'Shoulder drop', style: true, min: 1, max: 8 },
  { key: 'hipDepth', label: 'Waist to hip', style: true, min: 10, max: 35 },
  { key: 'flare', label: 'Extra flare at the hem (each side)', style: true, min: 0, max: 60 },
  { key: 'slit', label: 'Side slit length', style: true, min: 0, max: 80 },
];
export const KURTA_STYLE_DEFAULTS: Record<string, number> = { neckWidth: 15, ease: 6, shoulderDrop: 4, hipDepth: 20, flare: 0, slit: 25 };

export const CHUDIDAR_FIELDS: Field[] = [
  { key: 'waist', label: 'Waist (round)', min: 40, max: 200 },
  { key: 'hip', label: 'Hip / seat (round)', min: 50, max: 220 },
  { key: 'crotch', label: 'Crotch depth (waist to seat, sitting)', min: 15, max: 45 },
  { key: 'thigh', label: 'Thigh (round)', min: 30, max: 110 },
  { key: 'knee', label: 'Knee (round)', min: 20, max: 80 },
  { key: 'calf', label: 'Calf (round)', min: 18, max: 70 },
  { key: 'ankle', label: 'Ankle opening (round)', min: 15, max: 50 },
  { key: 'length', label: 'Length (waist to ankle)', min: 60, max: 130 },
  { key: 'kneeLength', label: 'Waist to knee', min: 35, max: 80 },
  { key: 'gathers', label: 'Extra length for gathers at the ankle', style: true, min: 0, max: 60 },
  { key: 'ease', label: 'Ease at hip and thigh', style: true, min: 0, max: 20 },
  { key: 'casing', label: 'Waist casing (drawstring channel) height', style: true, min: 2, max: 8 },
];
export const CHUDIDAR_STYLE_DEFAULTS: Record<string, number> = { gathers: 30, ease: 6, casing: 4 };

export const TEE_FIELDS: Field[] = [
  { key: 'chest', label: 'Chest (round)', min: 50, max: 200 },
  { key: 'length', label: 'Body length (shoulder to hem)', min: 35, max: 110 },
  { key: 'shoulder', label: 'Shoulder (point to point)', min: 25, max: 70 },
  { key: 'armhole', label: 'Armhole (round)', min: 25, max: 70 },
  { key: 'sleeveLength', label: 'Sleeve length', min: 5, max: 90 },
  { key: 'bicep', label: 'Upper arm (round)', min: 15, max: 70 },
  { key: 'sleeveOpening', label: 'Sleeve opening (round)', min: 12, max: 70 },
  { key: 'hem', label: 'Hem (round)', min: 50, max: 220 },
  { key: 'neckWidth', label: 'Neck opening width', min: 8, max: 30 },
  { key: 'frontNeck', label: 'Front neck depth', min: 3, max: 30 },
  { key: 'backNeck', label: 'Back neck depth', min: 1, max: 10 },
  { key: 'ease', label: 'Ease added to chest and hem', style: true, min: 0, max: 30 },
  { key: 'shoulderDrop', label: 'Shoulder drop', style: true, min: 1, max: 8 },
  { key: 'collarHeight', label: 'Polo collar height (finished)', style: true, min: 2, max: 10 },
  { key: 'placket', label: 'Polo placket length', style: true, min: 8, max: 25 },
];
export const TEE_STYLE_DEFAULTS: Record<string, number> = { ease: 8, shoulderDrop: 4, collarHeight: 7, placket: 15 };

export const DUPATTA_FIELDS: Field[] = [
  { key: 'width', label: 'Width', min: 20, max: 160 },
  { key: 'length', label: 'Length', min: 50, max: 400 },
  { key: 'border', label: 'Border width (each edge, 0 = none)', style: true, min: 0, max: 40 },
];
export const DUPATTA_STYLE_DEFAULTS: Record<string, number> = { border: 0 };
export const FABRIC_FIELDS: Field[] = [
  { key: 'width', label: 'Fabric width (printable)', min: 20, max: 330 },
  { key: 'length', label: 'Length', min: 20, max: 5000 },
];

export type Measures = Record<string, number | undefined>;

/** Required body measurements that are still empty (style settings fall back to their defaults). */
export function missing(fields: Field[], m: Measures): Field[] {
  return fields.filter((f) => !f.style && !(typeof m[f.key] === 'number' && (m[f.key] as number) > 0));
}
/** Measurements outside a sensible range (likely a typing mistake or wrong unit). */
export function outOfRange(fields: Field[], m: Measures): Field[] {
  return fields.filter((f) => typeof m[f.key] === 'number' && ((m[f.key] as number) < f.min || (m[f.key] as number) > f.max));
}
/** Measurements that contradict each other (checked before drafting). */
export function conflicts(type: GarmentType, m: Measures): string[] {
  const v = (k: string) => m[k] || 0, out: string[] = [];
  if (type === 'kurta') {
    if (v('waistLength') >= v('length')) out.push('Shoulder to waist must be shorter than the kurta length.');
    if (v('frontNeck') >= v('waistLength')) out.push('Front neck depth must be less than shoulder to waist.');
    if (v('sleeveOpening') > v('bicep') * 1.6) out.push('Sleeve opening is much wider than the upper arm — check both.');
    if (v('shoulder') > v('bust') * 0.6) out.push('Shoulder is wider than expected for this bust — check the shoulder measurement.');
  }
  if (type === 'chudidar') {
    if (v('kneeLength') >= v('length')) out.push('Waist to knee must be shorter than the full length.');
    if (v('crotch') >= v('kneeLength')) out.push('Crotch depth must be less than waist to knee.');
    if (!(v('thigh') >= v('knee') && v('knee') >= v('ankle') * 0.9)) out.push('Thigh, knee and ankle should get smaller down the leg — check them.');
  }
  return out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const P = (x: number, y: number) => `${r1(x)} ${r1(y)}`;

/** Neckline from the left neck point (x0, 0) to the right one (x1, 0), at the given depth. */
function neckline(style: NeckStyle, cx: number, half: number, depth: number): string {
  const L = cx - half, R = cx + half;
  if (style === 'v') return `M${P(L, 0)}L${P(cx, depth)}L${P(R, 0)}`;
  if (style === 'square') return `M${P(L, 0)}L${P(L, depth)}L${P(R, depth)}L${P(R, 0)}`;
  // round / boat: smooth curve (boat = wide and shallow, set by the caller)
  return `M${P(L, 0)}C${P(L, depth * 0.75)} ${P(cx - half * 0.55, depth)} ${P(cx, depth)}C${P(cx + half * 0.55, depth)} ${P(R, depth * 0.75)} ${P(R, 0)}`;
}

/** Kurta / kameez body piece (front or back), full width, mm. */
function kurtaBody(m: Measures, neck: NeckStyle, back: boolean): Piece {
  const g = (k: string) => (m[k] ?? KURTA_STYLE_DEFAULTS[k] ?? 0) * 10; // cm → mm
  const ease = g('ease');
  const bq = (g('bust') + ease) / 4, wq = (g('waist') + ease) / 4, hq = (g('hip') + ease) / 4;
  const sh = g('shoulder') / 2, drop = g('shoulderDrop');
  const ad = Math.max(g('armhole') / 2, drop + 60); // armhole depth from the shoulder line (half the round measure)
  const len = g('length'), wl = g('waistLength'), hl = Math.min(len - 20, wl + g('hipDepth'));
  const hem = hq + g('flare');
  const half = Math.max(bq, wq, hq, hem, sh) + 2;
  const cx = half, W = half * 2;
  let nw = g('neckWidth') / 2, nd = back ? g('backNeck') : g('frontNeck');
  const style: NeckStyle = back ? (neck === 'square' ? 'square' : neck === 'boat' ? 'boat' : 'round') : neck;
  if (style === 'boat') { nw = Math.max(nw, sh * 0.75); nd = Math.min(nd, back ? 25 : 50); }
  nw = Math.min(nw, sh - 15);
  // Right half (x from the centre line), then mirrored.
  const scoop = back ? 8 : 18; // the front armhole curves in more than the back
  const right = [
    `L${P(cx + sh, drop)}`,
    `C${P(cx + sh - scoop, drop + (ad - drop) * 0.6)} ${P(cx + sh + (bq - sh) * 0.3, ad)} ${P(cx + bq, ad)}`,
    `L${P(cx + wq, wl)}`, `L${P(cx + hq, hl)}`, `L${P(cx + hem, len)}`,
  ].join('');
  const left = [
    `L${P(cx - hem, len)}`, `L${P(cx - hq, hl)}`, `L${P(cx - wq, wl)}`, `L${P(cx - bq, ad)}`,
    `C${P(cx - sh - (bq - sh) * 0.3, ad)} ${P(cx - sh + scoop, drop + (ad - drop) * 0.6)} ${P(cx - sh, drop)}`,
    'Z',
  ].join('');
  const d = neckline(style, cx, nw, nd) + right + left;
  const notches: [number, number][] = [[r1(cx - wq), r1(wl)], [r1(cx + wq), r1(wl)], [r1(cx - hq), r1(hl)], [r1(cx + hq), r1(hl)]];
  return { id: back ? 'back' : 'front', label: back ? 'Back' : 'Front', w: r1(W), h: r1(len), qty: 1, d, grain: 'vertical', notches };
}

const SLEEVE_FRACTION: Record<SleeveStyle, number> = { sleeveless: 0, cap: 0.18, short: 0.35, elbow: 0.55, 'three-quarter': 0.75, full: 1 };

/** Sleeve: cap height from the armhole, width from the upper arm (+5 cm ease), opening as measured. */
function kurtaSleeve(m: Measures, style: SleeveStyle): Piece[] {
  if (style === 'sleeveless') return [];
  const g = (k: string) => (m[k] ?? 0) * 10;
  const bw = g('bicep') + 50; // ease for movement
  const cap = Math.max(60, g('armhole') / 3);
  // The measured sleeve length is for the chosen style; for the shorter styles the opening is widened towards the arm.
  const len = Math.max(cap + 40, g('sleeveLength'));
  const open = Math.min(bw, Math.max(g('sleeveOpening'), style === 'full' || style === 'three-quarter' ? 0 : bw * 0.85));
  const cx = bw / 2;
  const d = `M${P(0, cap)}C${P(bw * 0.18, cap * 0.35)} ${P(cx - bw * 0.22, 0)} ${P(cx, 0)}C${P(cx + bw * 0.22, 0)} ${P(bw * 0.82, cap * 0.35)} ${P(bw, cap)}L${P(cx + open / 2, len)}L${P(cx - open / 2, len)}Z`;
  const base = { w: r1(bw), h: r1(len), qty: 1, d, role: 'sleeve' as const, grain: 'vertical' as const, notches: [[r1(cx), 0]] as [number, number][] };
  return [{ id: 'sleeve-l', label: 'Sleeve left', ...base }, { id: 'sleeve-r', label: 'Sleeve right', mirror: true, ...base }];
}

/** Neck facing (bias strip) long enough for the neckline, 4 cm wide. */
function facing(len: number): Piece {
  const w = Math.max(200, Math.round(len));
  return { id: 'facing', label: 'Neck facing (bias)', w, h: 40, qty: 1, d: `M0 0H${w}V40H0Z`, role: 'trim', grain: 'bias' };
}

export function draftKurta(m: Measures, neck: NeckStyle, sleeve: SleeveStyle): Product {
  const front = kurtaBody(m, neck, false), back = kurtaBody(m, neck, true);
  const g = (k: string) => (m[k] ?? KURTA_STYLE_DEFAULTS[k] ?? 0) * 10;
  const neckRound = Math.PI * (g('neckWidth') / 2) + g('frontNeck') + g('backNeck') + 60;
  const slit = g('slit');
  return {
    id: 'kurta', label: `Kurta / kameez (${neck} neck, ${sleeve.replace('-', ' ')} sleeves)`,
    note: `Drafted from your measurements. Side slit ${slit / 10} cm from the hem. Make a test garment first.`,
    pieces: [front, back, ...kurtaSleeve(m, sleeve), facing(neckRound)],
  };
}

/** Chudidar: two leg pieces (each the full leg round + crotch extension, inseam at both edges), cut on the bias. */
export function draftChudidar(m: Measures): Product {
  const g = (k: string) => (m[k] ?? CHUDIDAR_STYLE_DEFAULTS[k] ?? 0) * 10;
  const ease = g('ease');
  const top = (g('hip') + ease) / 2 + g('hip') / 8; // half hip + crotch extension
  const thigh = g('thigh') + ease * 0.6, knee = g('knee') + 30, calf = g('calf') + 20, ankle = g('ankle') + 15;
  const crotch = g('crotch') + 20, kneeY = g('kneeLength'), len = g('length') + g('gathers');
  const calfY = kneeY + (g('length') - kneeY) * 0.45 + g('gathers') * 0.5; // the gathers sit below the calf
  const cx = Math.max(top, thigh) / 2 + 2, W = cx * 2;
  const half = (w: number) => w / 2;
  const d = [
    `M${P(cx - half(top), 0)}L${P(cx + half(top), 0)}`,
    `C${P(cx + half(top), crotch * 0.6)} ${P(cx + half(thigh) + 8, crotch * 0.85)} ${P(cx + half(thigh), crotch)}`,
    `L${P(cx + half(knee), kneeY)}L${P(cx + half(calf), calfY)}L${P(cx + half(ankle), len)}`,
    `L${P(cx - half(ankle), len)}L${P(cx - half(calf), calfY)}L${P(cx - half(knee), kneeY)}L${P(cx - half(thigh), crotch)}`,
    `C${P(cx - half(thigh) - 8, crotch * 0.85)} ${P(cx - half(top), crotch * 0.6)} ${P(cx - half(top), 0)}Z`,
  ].join('');
  const leg = { w: r1(W), h: r1(len), qty: 1, d, role: 'body' as const, grain: 'bias' as const, notches: [[r1(cx - knee / 2), r1(kneeY)], [r1(cx + knee / 2), r1(kneeY)], [r1(cx - thigh / 2), r1(crotch)], [r1(cx + thigh / 2), r1(crotch)]] as [number, number][] };
  const cas = g('casing') * 2 + 15;
  const bandW = Math.round(g('hip') + ease + 40);
  return {
    id: 'chudidar', label: 'Chudidar',
    note: `Drafted from your measurements. Cut both legs on the bias (45°). ${g('gathers') / 10} cm extra length for ankle gathers. Make a test garment first.`,
    pieces: [
      { id: 'leg-l', label: 'Leg left (bias)', ...leg },
      { id: 'leg-r', label: 'Leg right (bias)', mirror: true, ...leg },
      { id: 'casing', label: 'Waist casing', w: bandW, h: r1(cas), qty: 1, d: `M0 0H${bandW}V${r1(cas)}H0Z`, role: 'trim', grain: 'vertical' },
    ],
  };
}

export function draftRect(type: 'dupatta' | 'fabric', m: Measures): Product {
  const w = Math.round((m.width || 0) * 10), h = Math.round((m.length || 0) * 10);
  const label = type === 'dupatta' ? 'Dupatta' : 'Fabric length';
  const border = type === 'dupatta' ? Math.max(0, Math.round((m.border ?? 0) * 10)) : 0;
  return {
    id: type, label: `${label} ${r1(w / 10)} × ${r1(h / 10)} cm${border ? `, ${border / 10} cm border` : ''}`,
    note: type === 'dupatta' ? `Single piece${border ? ` with a ${border / 10} cm border on every edge (the trim colour)` : ''}; hem or tassels are finishing, not printed.` : 'Printed running fabric at the width and length you set.',
    pieces: [{ id: type, label, w, h, qty: 1, d: `M0 0H${w}V${h}H0Z`, role: 'body', grain: 'vertical', ...(border && border * 2 < Math.min(w, h) ? { border } : {}) }],
  };
}

/** T-shirt or polo drafted from the customer's own measurements (one size). */
export function draftTee(m: Measures, polo: boolean, sleeve: 'short' | 'long'): Product {
  const v = (k: string) => m[k] ?? TEE_STYLE_DEFAULTS[k] ?? 0;
  const armDepth = v('armhole') / 2;
  // The kurta block with chest = bust and the hem as waist and hip (a straight side seam).
  const km: Measures = {
    bust: v('chest'), waist: v('hem'), hip: v('hem'), shoulder: v('shoulder'), length: v('length'),
    waistLength: Math.min(v('length') - 3, (armDepth + v('length')) / 2), armhole: v('armhole'), frontNeck: polo ? Math.min(v('frontNeck'), 4) : v('frontNeck'), backNeck: v('backNeck'),
    neckWidth: v('neckWidth'), ease: v('ease'), shoulderDrop: v('shoulderDrop'), hipDepth: 2, flare: 0,
  };
  const front = kurtaBody(km, 'round', false), back = kurtaBody(km, 'round', true);
  const sl = kurtaSleeve({ ...m, sleeveLength: v('sleeveLength'), bicep: v('bicep'), sleeveOpening: v('sleeveOpening'), armhole: v('armhole') }, sleeve === 'long' ? 'full' : 'short');
  const neckRound = Math.round((Math.PI * (v('neckWidth') / 2) + v('frontNeck') + v('backNeck')) * 10 + 20);
  const pieces: Piece[] = [front, back, ...sl];
  if (polo) {
    const ch = v('collarHeight') * 10 * 2 + 15, pl = v('placket') * 10;
    pieces.push({ id: 'collar', label: 'Collar (fold in half)', w: neckRound, h: r1(ch), qty: 1, d: `M0 0H${neckRound}V${r1(ch)}H0Z`, role: 'trim', grain: 'vertical', fold: true });
    pieces.push({ id: 'placket', label: 'Placket (cut 2)', w: 70, h: r1(pl + 20), qty: 2, d: `M0 0H70V${r1(pl + 20)}H0Z`, role: 'trim', grain: 'vertical' });
  } else {
    pieces.push({ id: 'collar', label: 'Neck rib', w: Math.round(neckRound * 0.85), h: 40, qty: 1, d: `M0 0H${Math.round(neckRound * 0.85)}V40H0Z`, role: 'trim', grain: 'vertical', fold: true });
  }
  return { id: polo ? 'polo-mtm' : 'tee', label: `${polo ? 'Polo' : 'T-shirt'} (${sleeve} sleeves) — drafted`, note: 'Drafted from your measurements. Make a test garment first.', pieces };
}

/** Pieces for one set of measurements (one size). */
export function draftFor(type: GarmentType, m: Measures, o: { neck: NeckStyle; sleeve: SleeveStyle; polo?: boolean; teeSleeve?: 'short' | 'long' }): Product {
  if (type === 'kurta') return draftKurta(m, o.neck, o.sleeve);
  if (type === 'chudidar') return draftChudidar(m);
  if (type === 'tee') return draftTee(m, !!o.polo, o.teeSleeve || 'short');
  return draftRect(type as 'dupatta' | 'fabric', m);
}

/** Stored ready-to-use size presets for rectangles (common market sizes, user picks them on purpose). */
export const DUPATTA_PRESETS: { label: string; width: number; length: number }[] = [
  { label: '2.25 × 0.9 m (common)', width: 90, length: 225 },
  { label: '2.5 × 1 m', width: 100, length: 250 },
  { label: '2 × 0.5 m (stole)', width: 50, length: 200 },
];
