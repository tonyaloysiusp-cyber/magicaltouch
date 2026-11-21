// Board grades and creasing set-up. Calipers come from published mill data;
// crease tooling follows the published formulas below. Everything here is a
// starting point for the die maker — the tool says so wherever it shows it.
//
// Sources
//  · Metsä Board Classic FBB data sheet — grammage → thickness (200 g/m² 350 µm … 340 g/m² 650 µm)
//  · Fedrigoni SYM Pack creasing recommendations — 230–400 g/m², 255–450 µm, 2 pt (0.71 mm)
//    crease rule, rule height 23.80 − caliper on a phenolic matrix, matrix 0.3–0.5 × 1.0–1.4 mm
//  · C&T Matrix "Specialist Matrix" — channel width = caliper × 1.5 + rule width (solid board),
//    caliper × 2.0 + rule width (corrugated); rule height = cutting rule height − matrix base − caliper
//  · CITO creasing lessons — corrugated channel depth = compressed board thickness

export type BoardFamily = 'fbb' | 'sbs' | 'kraft' | 'rigid' | 'corrugated';
export interface BoardGrade {
  id: string; family: BoardFamily; name: string;
  /** grammage → caliper (mm) points for interpolation; one point for fixed boards */
  curve: [number, number][];
  glue: number; source: string;
}

export const BOARD_GRADES: BoardGrade[] = [
  { id: 'fbb', family: 'fbb', name: 'Folding boxboard (FBB / GC)', glue: 14, source: 'Metsä Board Classic FBB data sheet',
    curve: [[200, 0.35], [210, 0.375], [225, 0.4], [235, 0.425], [250, 0.45], [260, 0.475], [275, 0.5], [290, 0.55], [315, 0.6], [340, 0.65]] },
  { id: 'sbs', family: 'sbs', name: 'Solid bleached board (SBS / SBB)', glue: 14, source: 'Fedrigoni SYM Pack creasing table',
    curve: [[230, 0.255], [250, 0.28], [280, 0.315], [310, 0.345], [330, 0.38], [360, 0.42], [400, 0.45]] },
  { id: 'kraft', family: 'kraft', name: 'Kraft / unbleached board', glue: 15, source: 'typical value — check your supplier', curve: [[400, 0.6]] },
  { id: 'rigid', family: 'rigid', name: 'Grey board (rigid wrap)', glue: 18, source: 'typical value — check your supplier', curve: [[1000, 1.5]] },
  { id: 'eflute', family: 'corrugated', name: 'Corrugated E-flute', glue: 25, source: 'nominal flute height', curve: [[0, 1.5]] },
  { id: 'bflute', family: 'corrugated', name: 'Corrugated B-flute', glue: 30, source: 'nominal flute height', curve: [[0, 3]] },
  { id: 'cflute', family: 'corrugated', name: 'Corrugated C-flute', glue: 35, source: 'nominal flute height', curve: [[0, 4]] },
  { id: 'bcflute', family: 'corrugated', name: 'Double wall BC-flute', glue: 40, source: 'nominal flute height', curve: [[0, 7]] },
];

export const gradeById = (id: string) => BOARD_GRADES.find((g) => g.id === id) ?? BOARD_GRADES[0];
/** Grammage range a grade is published for (null for fixed boards). */
export const gsmRange = (g: BoardGrade): [number, number] | null => g.curve.length > 1 ? [g.curve[0][0], g.curve[g.curve.length - 1][0]] : null;

/** Caliper (mm) for a grade at a grammage: linear between published points, clamped outside. */
export function caliperFor(g: BoardGrade, gsm: number): number {
  const c = g.curve;
  if (c.length === 1 || gsm <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (gsm <= c[i][0]) {
    const [g0, t0] = c[i - 1], [g1, t1] = c[i];
    return Math.round((t0 + ((gsm - g0) / (g1 - g0)) * (t1 - t0)) * 1000) / 1000;
  }
  return c[c.length - 1][1];
}

export interface CreaseSetup {
  ruleWidth: number; rulePt: number;       // crease rule (mm, points)
  ruleHeight: number;                      // for a cutting rule of `cutHeight`, no matrix base
  channelWidth: number; channelDepth: number;
  cutHeight: number;
  formula: string; confidence: 'published' | 'formula' | 'outside-range';
  notes: string[];
}

const PT = 0.3528; // 1 pt rule = 0.3528 mm (0.71 mm ≈ 2 pt)
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Crease rule and matrix channel for a board. `cutHeight` is the cutting rule
 * height (23.80 mm is the common European standard used in the Fedrigoni table).
 * `compressed` is the corrugated thickness after crushing, when known.
 */
export function creaseSetup(family: BoardFamily, t: number, o: { cutHeight?: number; compressed?: number; gsm?: number } = {}): CreaseSetup {
  const cutHeight = o.cutHeight ?? 23.8, notes: string[] = [];
  const corr = family === 'corrugated';
  // Rule width: 2 pt across the published 0.25–0.45 mm range; heavier boards take wider rules.
  const rulePt = corr ? (t <= 2 ? 3 : t <= 4.5 ? 4 : 6) : t <= 0.5 ? 2 : t <= 0.8 ? 3 : 4;
  const ruleWidth = r2(rulePt === 2 ? 0.71 : rulePt * PT);
  const k = corr ? 2.0 : 1.5;
  const channelWidth = r2(t * k + ruleWidth);
  const depthBase = corr ? (o.compressed ?? t * 0.5) : t;
  const channelDepth = r2(Math.max(0.2, depthBase));
  const ruleHeight = r2(cutHeight - (corr ? (o.compressed ?? t * 0.5) : t));
  const inTable = (family === 'sbs' || family === 'fbb') && t >= 0.25 && t <= 0.46;
  const confidence: CreaseSetup['confidence'] = inTable ? 'published' : (family === 'kraft' || family === 'rigid' || corr || t > 0.65) ? 'outside-range' : 'formula';
  if (corr && o.compressed == null) notes.push('Corrugated: measure the crushed thickness at the crease; depth and rule height here assume half the board height.');
  if (family === 'rigid') notes.push('Rigid grey board is not creased like carton — it is V-grooved or wrapped. Use these figures only for a test.');
  if (!corr && t > 0.65) notes.push('Board this heavy is outside the published creasing tables — run a crease test before production.');
  if (!corr && t <= 0.5 && rulePt === 2) notes.push('2 pt (0.71 mm) crease rule, as in the board maker table.');
  notes.push('Fold toward the crease bead (the raised side inside the fold).');
  return { ruleWidth, rulePt, ruleHeight, channelWidth, channelDepth, cutHeight, confidence,
    formula: `channel width = ${k} × ${r2(t)} + ${ruleWidth} = ${channelWidth} mm · rule height = ${cutHeight} − ${r2(corr ? (o.compressed ?? t * 0.5) : t)} mm`, notes };
}
