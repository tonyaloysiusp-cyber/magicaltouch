// Garment blocks drafted from body measurements (cm in, mm out, y down).
// Measurement names follow ISO 8559-1 (anthropometric definitions for body
// measurement). The construction is ordinary flat-pattern drafting: quarter
// girths plus ease, darts sharing the bust–waist and hip–waist difference,
// curves for neck, armhole, hip and sleeve cap. Every result must be tried as
// a test garment (toile) before cutting good fabric.

export type Pt = [number, number];
export interface PieceMark { kind: 'notch' | 'dart' | 'drill' | 'fold'; at: Pt; to?: Pt; tip?: Pt; legs?: [Pt, Pt] }
export interface DraftPiece {
  id: string; name: string;
  /** seam line, closed, mm (curves already flattened) */
  seam: Pt[];
  /** indices of seam points that lie on a fold (no seam allowance there) */
  foldEdge?: [number, number];
  grain: [Pt, Pt];
  marks: PieceMark[];
  /** index of a dart tip in `seam`: the cutting line skips it (allowance follows the closed waist) */
  dartTip?: number[];
  cut: string;               // "Cut 2", "Cut 1 on fold"
  allowance: number;         // mm
}
export interface DraftResult { pieces: DraftPiece[]; notes: string[]; checks: { label: string; value: string; ok: boolean }[] }

export interface Body {
  bust: number; waist: number; hip: number; neck: number;
  backWaist: number;   // nape (cervicale) to waist, along the spine
  frontWaist: number;  // side neck point over the bust to the waist
  shoulder: number;    // shoulder length: side neck point to shoulder point
  acrossBack: number; acrossFront: number;
  scye: number;        // scye depth: nape to armpit level
  bustSpan: number;    // bust point to bust point
  bustHeight: number;  // side neck point to bust point
  waistToHip: number;
  upperArm: number; wrist: number; armLength: number; // outer arm length, shoulder point to wrist
}
export const BODY_FIELDS: { key: keyof Body; label: string; iso?: string; min: number; max: number }[] = [
  { key: 'bust', label: 'Bust girth', iso: '5.3.4', min: 60, max: 180 },
  { key: 'waist', label: 'Waist girth', iso: '5.3.10', min: 45, max: 180 },
  { key: 'hip', label: 'Hip girth', iso: '5.3.13', min: 60, max: 200 },
  { key: 'neck', label: 'Neck base girth', iso: '5.3.3', min: 28, max: 60 },
  { key: 'backWaist', label: 'Back waist length (nape to waist)', min: 30, max: 60 },
  { key: 'frontWaist', label: 'Front waist length (neck point over bust)', min: 30, max: 65 },
  { key: 'shoulder', label: 'Shoulder length', iso: '5.4.1', min: 9, max: 20 },
  { key: 'acrossBack', label: 'Across back width', iso: '5.4.4', min: 26, max: 55 },
  { key: 'acrossFront', label: 'Across front width', iso: '5.4.7', min: 24, max: 52 },
  { key: 'scye', label: 'Scye depth', iso: '5.4.6', min: 14, max: 30 },
  { key: 'bustSpan', label: 'Bust point width', iso: '5.2.3', min: 12, max: 26 },
  { key: 'bustHeight', label: 'Neck point to bust point', min: 18, max: 40 },
  { key: 'waistToHip', label: 'Waist to hip', min: 14, max: 28 },
  { key: 'upperArm', label: 'Upper-arm girth', iso: '5.3.16', min: 20, max: 55 },
  { key: 'wrist', label: 'Wrist girth', iso: '5.3.19', min: 12, max: 25 },
  { key: 'armLength', label: 'Outer arm length', iso: '5.7.8', min: 40, max: 75 },
];

/** A reference body (women's UK 12 / EU 40 area, rounded) — a starting point to edit, not a standard. */
export const SAMPLE_BODY: Body = { bust: 92, waist: 74, hip: 100, neck: 37, backWaist: 41, frontWaist: 44, shoulder: 12.5, acrossBack: 35, acrossFront: 33, scye: 20.5, bustSpan: 18, bustHeight: 26, waistToHip: 20.5, upperArm: 28, wrist: 16, armLength: 59 };

export interface Style {
  bustEase: number; waistEase: number; hipEase: number; sleeveEase: number; // cm
  neckline: 'round' | 'v' | 'square' | 'boat';
  neckDrop: number;            // extra front neck depth, cm
  sleeve: 'none' | 'cap' | 'short' | 'elbow' | 'long';
  skirt: 'none' | 'straight' | 'aline' | 'gathered' | 'circle' | 'half-circle';
  skirtLength: number;         // waist to hem, cm
  flare: number;               // A-line extra at the hem per side seam, cm
  fullness: number;            // gathered skirt: hem width ÷ waist
  allowance: number;           // seam allowance, cm
  hem: number;                 // hem allowance, cm
}
export const DEFAULT_STYLE: Style = { bustEase: 8, waistEase: 4, hipEase: 4, sleeveEase: 5, neckline: 'round', neckDrop: 0, sleeve: 'short', skirt: 'gathered', skirtLength: 55, flare: 6, fullness: 2, allowance: 1.5, hem: 3 };

const MM = 10;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Cubic Bézier sampled to `n` points (excluding the start). */
export function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return out;
}
export const polyLen = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const r1 = (v: number) => Math.round(v * 10) / 10;

interface BodiceParts { piece: DraftPiece; armhole: Pt[]; sideLen: number; shoulderLen: number; waistW: number }

/** Back bodice (half; centre back at x = 0). y = 0 at the side neck point. */
function backBodice(b: Body, s: Style): BodiceParts {
  const nw = (b.neck / 6 + 0.5) * MM, nd = 2 * MM;
  const width = ((b.bust + s.bustEase) / 4 - 0.5) * MM;
  const yU = nd + (b.scye + 1.5) * MM, yW = nd + b.backWaist * MM;
  const drop = b.shoulder * MM * Math.sin((18 * Math.PI) / 180);
  const SNP: Pt = [nw, 0], SP: Pt = [nw + Math.sqrt((b.shoulder * MM) ** 2 - drop ** 2), drop];
  const across: Pt = [(b.acrossBack / 2 + 0.5) * MM, nd + (yU - nd) * 0.55];
  const under: Pt = [width, yU];
  const dSup = ((b.bust + s.bustEase) - (b.waist + s.waistEase)) / 2 * MM; // half-body suppression
  const side = Math.max(0, dSup * 0.2), dart = Math.max(0, dSup * 0.3);
  const waistSide: Pt = [width - side, yW];
  const dx = (b.acrossBack / 4) * MM;
  const neck = cubic(SNP, [SNP[0] * 0.6, nd * 0.95], [SNP[0] * 0.15, nd], [0, nd], 10);
  const arm = [SP, ...cubic(SP, [SP[0] + 4, SP[1] + (across[1] - SP[1]) * 0.6], [across[0], across[1] - 15], across, 8), ...cubic(across, [across[0], across[1] + (yU - across[1]) * 0.6], [under[0] - (under[0] - across[0]) * 0.6, yU], under, 10)];
  const seam: Pt[] = [[0, nd], [0, yW], [dx - dart / 2, yW], [dx, yW - (b.backWaist * MM - (b.scye + 1.5) * MM) * 0.85], [dx + dart / 2, yW], waistSide, under, ...arm.slice().reverse().slice(1), ...neck.slice().reverse().slice(1, -1), SNP];
  // seam order: CB nape → CB waist → dart → side waist → underarm → armhole up to SP → shoulder → SNP → neck back to CB
  const ordered: Pt[] = [[0, nd], [0, yW], [dx - dart / 2, yW], [dx, yW - (yW - yU) * 0.8], [dx + dart / 2, yW], waistSide, under, ...arm.slice().reverse().slice(1), SNP, ...neck.slice(0, -1)];
  void seam;
  return {
    piece: { id: 'bodice-back', name: 'Bodice back', seam: ordered, dartTip: [3], foldEdge: [ordered.length - 1, 1], grain: [[width * 0.45, nd + 40], [width * 0.45, yW - 40]], marks: [{ kind: 'dart', at: [dx, yW], tip: [dx, yW - (yW - yU) * 0.8], legs: [[dx - dart / 2, yW], [dx + dart / 2, yW]] }, { kind: 'notch', at: across }], cut: 'Cut 1 on fold', allowance: s.allowance * MM },
    armhole: arm, sideLen: yW - yU, shoulderLen: b.shoulder * MM, waistW: width - side - dart,
  };
}

/** Front bodice (half; centre front at x = 0) with a waist dart under the bust point. */
function frontBodice(b: Body, s: Style, backSide: number): BodiceParts {
  const nw = (b.neck / 6 + 0.5) * MM;
  const width = ((b.bust + s.bustEase) / 4 + 0.5) * MM;
  const nd2 = 2 * MM, yU = nd2 + (b.scye + 1.5) * MM;
  const ySide = yU + backSide;                       // side seam length matches the back
  const yCF = b.frontWaist * MM;                     // centre front waist
  let fnd = (b.neck / 6 + 1.5 + s.neckDrop) * MM;
  if (s.neckline === 'v') fnd += 6 * MM;
  if (s.neckline === 'square') fnd += 3 * MM;
  const drop = b.shoulder * MM * Math.sin((22 * Math.PI) / 180);
  const SNP: Pt = [nw + (s.neckline === 'boat' ? 25 : 0), 0];
  const SP: Pt = [nw + Math.sqrt((b.shoulder * MM) ** 2 - drop ** 2), drop];
  const across: Pt = [(b.acrossFront / 2 + 0.5) * MM, nd2 + (yU - nd2) * 0.6];
  const under: Pt = [width, yU];
  const BP: Pt = [(b.bustSpan / 2) * MM, b.bustHeight * MM];
  const dSup = ((b.bust + s.bustEase) - (b.waist + s.waistEase)) / 2 * MM;
  const side = Math.max(0, dSup * 0.2), dart = Math.max(0, dSup * 0.3);
  const waistSide: Pt = [width - side, ySide];
  const neck: Pt[] = s.neckline === 'v' ? [SNP, [0, fnd]] : s.neckline === 'square' ? [SNP, [SNP[0] * 0.9, fnd], [0, fnd]] : s.neckline === 'boat' ? [SNP, ...cubic(SNP, [SNP[0] * 0.7, fnd * 0.2], [SNP[0] * 0.3, fnd * 0.5], [0, fnd * 0.5], 10)] : [SNP, ...cubic(SNP, [SNP[0], fnd * 0.55], [SNP[0] * 0.55, fnd], [0, fnd], 12)];
  const arm = [SP, ...cubic(SP, [SP[0] - 2, SP[1] + (across[1] - SP[1]) * 0.6], [across[0], across[1] - 12], across, 8), ...cubic(across, [across[0], across[1] + (yU - across[1]) * 0.7], [under[0] - (under[0] - across[0]) * 0.8, yU], under, 10)];
  // Waist from CF (yCF) to side (ySide), with the dart centred under the bust point.
  const wAt = (x: number) => yCF + (ySide - yCF) * (x / waistSide[0]);
  const dl: Pt = [BP[0] - dart / 2, wAt(BP[0] - dart / 2)], dr: Pt = [BP[0] + dart / 2, wAt(BP[0] + dart / 2)];
  const tip: Pt = [BP[0], BP[1] + 20];
  const ordered: Pt[] = [neck[neck.length - 1], [0, yCF], dl, tip, dr, waistSide, under, ...arm.slice().reverse().slice(1), ...neck.slice(0, -1)];
  return {
    piece: { id: 'bodice-front', name: 'Bodice front', seam: ordered, dartTip: [3], foldEdge: [ordered.length - 1, 1], grain: [[width * 0.6, fnd + 40], [width * 0.6, ySide - 40]], marks: [{ kind: 'dart', at: [BP[0], wAt(BP[0])], tip, legs: [dl, dr] }, { kind: 'drill', at: BP }, { kind: 'notch', at: across }], cut: 'Cut 1 on fold', allowance: s.allowance * MM },
    armhole: arm, sideLen: ySide - yU, shoulderLen: b.shoulder * MM, waistW: width - side - dart,
  };
}

/** Set-in sleeve from the drafted armhole length: cap height ≈ a third of the armhole. */
function sleeve(b: Body, s: Style, armhole: number): { piece: DraftPiece; capLen: number } | null {
  if (s.sleeve === 'none') return null;
  const bic = (b.upperArm + s.sleeveEase) * MM, capH = armhole / 3;
  const len = (s.sleeve === 'cap' ? 0.1 : s.sleeve === 'short' ? 0.33 : s.sleeve === 'elbow' ? 0.58 : 1) * b.armLength * MM;
  const capOnly = s.sleeve === 'cap';
  const hemW = s.sleeve === 'long' ? (b.wrist + 6) * MM : s.sleeve === 'elbow' ? bic * 0.85 : bic * 0.95;
  const L: Pt = [-bic / 2, capH], R: Pt = [bic / 2, capH], top: Pt = [0, 0];
  const back = cubic(L, [-bic * 0.38, capH * 0.55], [-bic * 0.2, 0], top, 14), front = cubic(top, [bic * 0.18, 0], [bic * 0.35, capH * 0.6], R, 14);
  const capLen = polyLen([L, ...back]) + polyLen([top, ...front]);
  const yH = capOnly ? capH + 15 : capH + len - capH * 0.3;
  const seam: Pt[] = capOnly ? [L, ...back, ...front, [bic / 2 - 10, yH], [-bic / 2 + 10, yH]] : [L, ...back, ...front, [hemW / 2, yH], [-hemW / 2, yH]];
  return { piece: { id: 'sleeve', name: 'Sleeve', seam, grain: [[0, capH * 0.6], [0, yH - 40]], marks: [{ kind: 'notch', at: top }, { kind: 'notch', at: back[6] }, { kind: 'notch', at: front[8] }], cut: 'Cut 2 (a pair)', allowance: s.allowance * MM }, capLen };
}

/** Skirt pieces for a dress, from the bodice waist widths (so the seams match). */
function skirt(b: Body, s: Style, waistHalf: number): DraftPiece[] {
  if (s.skirt === 'none') return [];
  const len = s.skirtLength * MM, al = s.allowance * MM;
  if (s.skirt === 'gathered') {
    const w = waistHalf * s.fullness;
    return [{ id: 'skirt', name: 'Skirt panel', seam: [[0, 0], [w, 0], [w, len], [0, len]], grain: [[w / 2, 40], [w / 2, len - 40]], marks: [{ kind: 'notch', at: [w / 2, 0] }], cut: 'Cut 2 (front and back) — gather the top to the bodice', allowance: al }];
  }
  if (s.skirt === 'circle' || s.skirt === 'half-circle') {
    const full = s.skirt === 'circle', waist = waistHalf * 2;              // full waist around the body
    const r = waist / (full ? 2 * Math.PI : Math.PI);                    // quarter or half of the ring per piece
    const R = r + len, a1 = full ? Math.PI / 2 : Math.PI;
    const arc = (rad: number, n: number, rev = false): Pt[] => { const pts: Pt[] = []; for (let i = 0; i <= n; i++) { const t = (rev ? n - i : i) / n * a1; pts.push([rad * Math.cos(t), rad * Math.sin(t)]); } return pts; };
    const seam: Pt[] = [...arc(r, 24), ...arc(R, 40, true)];
    return [{ id: 'skirt', name: full ? 'Circle skirt quarter' : 'Half-circle skirt half', seam, grain: [[R * 0.5, R * 0.1], [R * 0.5 * Math.cos(a1 / 2), R * 0.5 * Math.sin(a1 / 2)]], marks: [], cut: full ? 'Cut 4 (or 2 on fold)' : 'Cut 2', allowance: al }];
  }
  // straight / A-line: waist from the bodice, hip from the body, flare at the hem
  const hipHalf = ((b.hip + s.hipEase) / 4) * MM, hd = b.waistToHip * MM;
  const flare = s.skirt === 'aline' ? s.flare * MM : 0;
  const mk = (id: string, name: string, front: boolean): DraftPiece => {
    const hw = hipHalf + (front ? 5 : -5);
    const dartI = Math.max(0, hw - waistHalf / 2 - 10) * (front ? 0.35 : 0.5);
    const ww = waistHalf / 2 + dartI;
    const dx = front ? 90 : 95, dl = front ? 90 : 130;
    const side = cubic([ww, -8], [ww + (hw - ww) * 0.4, hd * 0.25], [hw, hd * 0.6], [hw, hd], 10);
    const seam: Pt[] = [[0, 0], [dx - dartI / 2, 0], [dx, dl], [dx + dartI / 2, 0], [ww, -8], ...side, [hw + flare, len], [0, len]];
    return { id, name, seam, dartTip: [2], foldEdge: [seam.length - 1, 0], grain: [[hw * 0.5, 60], [hw * 0.5, len - 60]], marks: [{ kind: 'dart', at: [dx, 0], tip: [dx, dl], legs: [[dx - dartI / 2, 0], [dx + dartI / 2, 0]] }, { kind: 'notch', at: [hw, hd] }], cut: 'Cut 1 on fold', allowance: al };
  };
  return [mk('skirt-front', 'Skirt front', true), mk('skirt-back', 'Skirt back', false)];
}

export function draftDress(b: Body, s: Style = DEFAULT_STYLE): DraftResult {
  const back = backBodice(b, s), front = frontBodice(b, s, back.sideLen);
  const ah = polyLen(back.armhole) + polyLen(front.armhole);
  const sl = sleeve(b, s, ah);
  const waistHalf = back.waistW + front.waistW; // half the finished waist (one side of the body)
  const pieces = [front.piece, back.piece, ...(sl ? [sl.piece] : []), ...skirt(b, s, waistHalf * 2 / 2)];
  const finishedWaist = waistHalf * 2 / MM;
  const checks = [
    { label: 'Finished bust', value: `${r1(b.bust + s.bustEase)} cm (${s.bustEase} cm ease)`, ok: s.bustEase >= 4 },
    { label: 'Finished waist', value: `${r1(finishedWaist)} cm`, ok: finishedWaist >= b.waist },
    { label: 'Armhole', value: `${r1(ah / MM)} cm`, ok: true },
    ...(sl ? [{ label: 'Sleeve cap ease', value: `${r1((sl.capLen - ah) / MM)} cm`, ok: sl.capLen - ah >= 0 && sl.capLen - ah <= 40 }] : []),
  ];
  const notes = ['Drafted from your measurements — make a test garment (toile) and adjust before cutting good fabric.'];
  if (b.waist > b.bust) notes.push('Waist is larger than bust: the waist darts are set to zero.');
  return { pieces, notes, checks };
}

/** Seam allowance: offset a closed polygon outwards by `d` mm (mitred, limited). Fold edges get no allowance. */
export function offsetPolygon(pts: Pt[], d: number, noAllowance?: [number, number]): Pt[] {
  const n = pts.length; if (n < 3) return pts.slice();
  // orientation: positive area = clockwise in y-down coordinates
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  const edgeD = (i: number) => (noAllowance && ((i === noAllowance[0] && (i + 1) % n === noAllowance[1]) || (noAllowance[0] === i && noAllowance[1] === (i + 1) % n)) ? 0 : d);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const e1: Pt = [p1[0] - p0[0], p1[1] - p0[1]], e2: Pt = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
    const n1: Pt = [(sgn * e1[1]) / l1, (-sgn * e1[0]) / l1], n2: Pt = [(sgn * e2[1]) / l2, (-sgn * e2[0]) / l2];
    const d1 = edgeD((i - 1 + n) % n), d2 = edgeD(i);
    // intersection of the two offset lines
    const a1: Pt = [p0[0] + n1[0] * d1, p0[1] + n1[1] * d1], b1: Pt = [p1[0] + n1[0] * d1, p1[1] + n1[1] * d1];
    const a2: Pt = [p1[0] + n2[0] * d2, p1[1] + n2[1] * d2], b2: Pt = [p2[0] + n2[0] * d2, p2[1] + n2[1] * d2];
    const den = (b1[0] - a1[0]) * (b2[1] - a2[1]) - (b1[1] - a1[1]) * (b2[0] - a2[0]);
    let q: Pt;
    if (Math.abs(den) < 1e-9) q = [p1[0] + n2[0] * d2, p1[1] + n2[1] * d2];
    else { const t = ((a2[0] - a1[0]) * (b2[1] - a2[1]) - (a2[1] - a1[1]) * (b2[0] - a2[0])) / den; q = [a1[0] + (b1[0] - a1[0]) * t, a1[1] + (b1[1] - a1[1]) * t]; }
    const lim = 3 * Math.max(d1, d2);
    if (Math.hypot(q[0] - p1[0], q[1] - p1[1]) > lim) { out.push(b1, a2); } else out.push(q);
  }
  return out;
}

export const toPath = (pts: Pt[], close = true) => pts.map((p, i) => `${i ? 'L' : 'M'}${Math.round(p[0] * 100) / 100} ${Math.round(p[1] * 100) / 100}`).join(' ') + (close ? ' Z' : '');
void lerp;

// ── size chart and grading ──
export type SizeRow = { name: string; body: Body };
/** Grade a base body to other sizes by adding per-size steps (cm) to chosen measurements. */
export function gradeSizes(base: Body, baseName: string, names: string[], steps: Partial<Record<keyof Body, number>>): SizeRow[] {
  const bi = names.indexOf(baseName);
  return names.map((name, i) => {
    const k = i - (bi < 0 ? 0 : bi);
    const body = { ...base };
    for (const key of Object.keys(steps) as (keyof Body)[]) body[key] = Math.round((base[key] + (steps[key] || 0) * k) * 10) / 10;
    return { name, body };
  });
}
/** Common grade steps between neighbouring sizes (cm) — edit them to your own size chart. */
export const DEFAULT_STEPS: Partial<Record<keyof Body, number>> = { bust: 5, waist: 5, hip: 5, neck: 1, backWaist: 0.5, frontWaist: 0.6, shoulder: 0.4, acrossBack: 1, acrossFront: 1, scye: 0.6, bustSpan: 0.6, bustHeight: 0.5, upperArm: 1.5, wrist: 0.5, armLength: 0.6, waistToHip: 0.3 };

/** Cutting line: the seam (dart tips skipped) offset by the seam allowance; fold edges get none. */
export function cutLine(p: DraftPiece): Pt[] {
  const skip = new Set(p.dartTip || []);
  const pts = p.seam.filter((_, i) => !skip.has(i));
  let fold = p.foldEdge;
  if (fold && skip.size) { const map = (i: number) => i - [...skip].filter((k) => k < i).length; fold = [map(fold[0]), map(fold[1])]; }
  return offsetPolygon(pts, p.allowance, fold);
}
