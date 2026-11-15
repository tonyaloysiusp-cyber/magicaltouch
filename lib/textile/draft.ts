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

export type GarmentType = 'tshirt' | 'polo' | 'kurta' | 'chudidar' | 'dupatta' | 'fabric';
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

export const DUPATTA_FIELDS: Field[] = [
  { key: 'width', label: 'Width', min: 20, max: 160 },
  { key: 'length', label: 'Length', min: 50, max: 400 },
];
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
  return { id: back ? 'back' : 'front', label: back ? 'Back' : 'Front', w: r1(W), h: r1(len), qty: 1, d };
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
  const base = { w: r1(bw), h: r1(len), qty: 1, d, role: 'sleeve' as const };
  return [{ id: 'sleeve-l', label: 'Sleeve left', ...base }, { id: 'sleeve-r', label: 'Sleeve right', mirror: true, ...base }];
}

/** Neck facing (bias strip) long enough for the neckline, 4 cm wide. */
function facing(len: number): Piece {
  const w = Math.max(200, Math.round(len));
  return { id: 'facing', label: 'Neck facing (bias)', w, h: 40, qty: 1, d: `M0 0H${w}V40H0Z`, role: 'trim' };
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
  const leg = { w: r1(W), h: r1(len), qty: 1, d, role: 'body' as const };
  const cas = g('casing') * 2 + 15;
  const bandW = Math.round(g('hip') + ease + 40);
  return {
    id: 'chudidar', label: 'Chudidar',
    note: `Drafted from your measurements. Cut both legs on the bias (45°). ${g('gathers') / 10} cm extra length for ankle gathers. Make a test garment first.`,
    pieces: [
      { id: 'leg-l', label: 'Leg left (bias)', ...leg },
      { id: 'leg-r', label: 'Leg right (bias)', mirror: true, ...leg },
      { id: 'casing', label: 'Waist casing', w: bandW, h: r1(cas), qty: 1, d: `M0 0H${bandW}V${r1(cas)}H0Z`, role: 'trim' },
    ],
  };
}

export function draftRect(type: 'dupatta' | 'fabric', m: Measures): Product {
  const w = Math.round((m.width || 0) * 10), h = Math.round((m.length || 0) * 10);
  const label = type === 'dupatta' ? 'Dupatta' : 'Fabric length';
  return {
    id: type, label: `${label} ${r1(w / 10)} × ${r1(h / 10)} cm`,
    note: type === 'dupatta' ? 'Single piece; hem or tassels are finishing, not printed.' : 'Printed running fabric at the width and length you set.',
    pieces: [{ id: type, label, w, h, qty: 1, d: `M0 0H${w}V${h}H0Z`, role: 'body' }],
  };
}

/** Stored ready-to-use size presets for rectangles (common market sizes, user picks them on purpose). */
export const DUPATTA_PRESETS: { label: string; width: number; length: number }[] = [
  { label: '2.25 × 0.9 m (common)', width: 90, length: 225 },
  { label: '2.5 × 1 m', width: 100, length: 250 },
  { label: '2 × 0.5 m (stole)', width: 50, length: 200 },
];
