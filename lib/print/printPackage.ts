// Print package for a job designed in the editor: three files from one click.
//  1. ACTUAL SIZE  — every side at 100 % on a sheet big enough for the job,
//     its bleed and the marks (an A4 tri-fold goes on A3), cut + fold marks.
//  2. FIT TO PRINT — the same sheets scaled so the artwork, bleed and every
//     mark fit inside the printable area of the chosen paper (A4 with a 3 mm
//     no-print edge, say); marks and fold positions are recalculated.
//  3. INFORMATION  — one A4 page: preview, sizes, folds, files, people.
// The artwork comes in as one vector PDF, one page per side, each page the
// trim size plus bleed (what the editor's PDF export makes).

import { DEFAULT_PRESS, SHEETS, layoutPress, pressPdfPages, verifyPressPdf, type MarkType, type PressLayout, type PressOptions } from './pressSheet.ts';
import { sidePressJob, type PrintJobInfo } from './printJob.ts';

export interface PackageOptions {
  actualSheet: string;   // 'auto' | sheet id
  fitSheet: string;      // sheet id (default 'a4')
  margin: number; markType: MarkType;
}
export const DEFAULT_PACKAGE: PackageOptions = { actualSheet: 'auto', fitSheet: 'a4', margin: 3, markType: 1 };

type Sheet = { w: number; h: number; name: string };
const r1 = (n: number) => Math.round(n * 10) / 10;

function oriented(s: (typeof SHEETS)[number]): Sheet[] {
  return [{ w: s.w, h: s.h, name: s.name }, { w: s.h, h: s.w, name: `${s.name} landscape` }];
}

/** Layout of the job on a sheet, choosing the orientation that fits (actual) or scales least (fit). */
export function planSheet(job: PrintJobInfo, mode: 'actual' | 'fit', sheetId: string, o: PackageOptions): PressLayout {
  const po: PressOptions = { ...DEFAULT_PRESS, margin: o.margin, markType: o.markType, mode, sheet: 'finished' };
  const j0 = sidePressJob(job, 0, 'plan');
  const try_ = (s: (typeof SHEETS)[number]) => oriented(s).map((sh) => layoutPress(j0, { ...po, sheet: sh }));
  if (mode === 'actual') {
    const list = sheetId === 'auto' ? SHEETS : SHEETS.filter((s) => s.id === sheetId);
    for (const s of list) { const fit = try_(s).find((l) => l.fits); if (fit) return fit; }
    // Nothing fits: report on the chosen (or the largest) sheet so the warning says what is needed.
    return try_(list[list.length - 1] || SHEETS[SHEETS.length - 1])[0];
  }
  const s = SHEETS.find((x) => x.id === sheetId) || SHEETS[0];
  const [a, b] = try_(s);
  return b.scale > a.scale ? b : a;
}

export interface PackageResult {
  actual: Uint8Array | null; fit: Uint8Array;
  actualLayout: PressLayout; fitLayout: PressLayout;
  warnings: string[];
}

export async function buildPrintFiles(job: PrintJobInfo, artPdf: Uint8Array, name: string, o: PackageOptions): Promise<PackageResult> {
  const actualLayout = planSheet(job, 'actual', o.actualSheet, o);
  const fitLayout = planSheet(job, 'fit', o.fitSheet, o);
  const warnings: string[] = [];
  const sides = job.sides.length;
  const sheetsFor = (l: PressLayout) => job.sides.map((_, i) => {
    const sj = sidePressJob(job, i, name);
    // Same sheet, scale and position for every side; only the folds (mirrored) differ.
    const ls = layoutPress(sj, { ...DEFAULT_PRESS, margin: o.margin, markType: o.markType, sheet: l.sheet, mode: l.scale < 1 ? 'fit' : 'actual' });
    return { job: sj, layout: ls, art: { kind: 'pdf' as const, bytes: artPdf, page: i } };
  });
  let actual: Uint8Array | null = null;
  if (actualLayout.fits) {
    actual = await pressPdfPages(sheetsFor(actualLayout), `${name} — actual size`);
    const v = await verifyPressPdf(actual, actualLayout, sides);
    if (!v.ok) throw new Error(`Actual-size file failed its check: ${v.issues.join(' ')}`);
  } else warnings.push(...actualLayout.warnings);
  const fit = await pressPdfPages(sheetsFor(fitLayout), `${name} — fit to print`);
  const v2 = await verifyPressPdf(fit, fitLayout, sides);
  if (!v2.ok) throw new Error(`Fit-to-print file failed its check: ${v2.issues.join(' ')}`);
  return { actual, fit, actualLayout, fitLayout, warnings };
}

export function describeFile(label: string, file: string, l: PressLayout, job: PrintJobInfo, markType: MarkType) {
  return { label, file, sheet: `${l.sheet.name} (${l.sheet.w} × ${l.sheet.h} mm)`, scale: l.scale, printed: `${r1(job.trimW * l.scale)} × ${r1(job.trimH * l.scale)} mm`, marks: `crop marks type ${markType}${job.folds.length ? ', green fold marks' : ''}` };
}
