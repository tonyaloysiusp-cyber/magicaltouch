// Print set for a job — the files a print shop needs, from one place (the
// Print Size Calculator or Export → Print files in the editor):
//  · ACTUAL SIZE  — every side at 100 % on a sheet big enough for the job,
//                   its bleed and the marks (an A4 tri-fold goes on A3).
//  · FIT TO PRINT — the same sheets scaled so artwork, bleed and every mark
//                   fit inside the printable area of your paper (A4 with a
//                   3 mm no-print edge); marks and folds recalculated.
//  · NORMAL       — trim + bleed only, no marks (TrimBox / BleedBox set).
//  · JOB REPORT   — the one branded document (2 pages).
// Print files never carry the Magical Touch Design brand.

import { DEFAULT_PRESS, SHEETS, layoutPress, normalLayout, pressPdfPages, verifyPressPdf, type Artwork, type MarkType, type PressLayout, type PressOptions } from './pressSheet.ts';
import { sidePressJob, type PrintJobInfo } from './printJob.ts';
import { jobReportPages, type JobDetails, type ReportFile } from './jobReport.ts';
import { cmykify, type CmykOptions } from './cmykPdf.ts';

export interface PackageOptions {
  actualSheet: string;   // 'auto' | sheet id
  fitSheet: string;      // sheet id (default 'a4')
  margin: number; markType: MarkType;
}
export const DEFAULT_PACKAGE: PackageOptions = { actualSheet: 'auto', fitSheet: 'a4', margin: 3, markType: 1 };
export interface PrintSelection { actual: boolean; fit: boolean; normal: boolean; report: boolean }
export const ALL_FILES: PrintSelection = { actual: true, fit: true, normal: true, report: true };

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
    return try_(list[list.length - 1] || SHEETS[SHEETS.length - 1])[0];
  }
  const s = SHEETS.find((x) => x.id === sheetId) || SHEETS[0];
  const [a, b] = try_(s);
  return b.scale > a.scale ? b : a;
}

const sheetTag = (n: string) => n.replace(/\s*landscape/, '').replace(/[^\w]+/g, '');
export function fileNames(base: string, actual: PressLayout, fit: PressLayout) {
  const pct = String(Math.round(fit.scale * 1000) / 10).replace('.', '-');
  return {
    actual: `${base}_PRINT_ACTUAL_SIZE_on_${sheetTag(actual.sheet.name)}.pdf`,
    fit: `${base}_PRINT_FIT_TO_${sheetTag(fit.sheet.name)}${fit.scale < 1 ? `_${pct}pc` : ''}.pdf`,
    normal: `${base}_PRINT_NORMAL_with_bleed.pdf`,
    report: `${base}_JOB_REPORT.pdf`,
    template: `${base}_LAYOUT_TEMPLATE.pdf`,
  };
}

export function describeFile(label: string, file: string, l: PressLayout, job: PrintJobInfo, markType: MarkType | null): ReportFile {
  return { label, file, sheet: `${l.sheet.name} (${l.sheet.w} × ${l.sheet.h} mm)`, scale: l.scale, printed: `${r1(job.trimW * l.scale)} × ${r1(job.trimH * l.scale)} mm`, marks: `${markType ? `crop marks type ${markType}${job.folds.length ? ', fold marks' : ''}` : 'bleed only, no marks'} · CMYK` };
}

export interface PrintSetInput {
  job: PrintJobInfo; base: string; options: PackageOptions; files: PrintSelection;
  /** Artwork per side (null: no artwork — print files are skipped). */
  arts: Artwork[] | null;
  details: JobDetails; date: string; colour: string;
  previews?: ({ src: string; w: number; h: number } | null)[];
  logo?: { src: string; w: number; h: number } | null;
  /** SVG pages → PDF bytes (svgToPdf in the browser). */
  toPdf: (pages: { svg: string; widthMm: number; heightMm: number }[]) => Promise<Uint8Array>;
  /** Print files are converted to CMYK (FOGRA39) with this; without it they stay as supplied. */
  cmyk?: CmykOptions | null;
}
export interface PrintSet {
  out: { name: string; data: Uint8Array }[];
  actualLayout: PressLayout; fitLayout: PressLayout; warnings: string[]; cmyk: boolean;
}

export async function makePrintSet(i: PrintSetInput): Promise<PrintSet> {
  const { job, options: o } = i;
  const actualLayout = planSheet(job, 'actual', o.actualSheet, o);
  const fitLayout = planSheet(job, 'fit', o.fitSheet, o);
  const names = fileNames(i.base, actualLayout, fitLayout);
  const warnings: string[] = [];
  const out: PrintSet['out'] = [];
  const sides = job.sides.length;
  const sheetsFor = (l: PressLayout) => job.sides.map((_, s) => {
    const sj = sidePressJob(job, s, i.base);
    const ls = layoutPress(sj, { ...DEFAULT_PRESS, margin: o.margin, markType: o.markType, sheet: l.sheet, mode: l.scale < 1 ? 'fit' : 'actual' });
    return { job: sj, layout: ls, art: i.arts?.[s] ?? null };
  });
  const filesForReport: ReportFile[] = [];
  // Every print file goes to CMYK (marks are already press inks); the check runs on the converted file.
  const press = async (b: Uint8Array) => {
    if (!i.cmyk) return b;
    const r = await cmykify(b, i.cmyk);
    for (const s of r.report.skipped) if (!warnings.includes(`Not converted to CMYK: ${s}.`)) warnings.push(`Not converted to CMYK: ${s}.`);
    return r.bytes;
  };
  if (i.arts) {
    if (i.files.actual) {
      if (actualLayout.fits) {
        const b = await press(await pressPdfPages(sheetsFor(actualLayout), `${i.base} — actual size`));
        const v = await verifyPressPdf(b, actualLayout, sides);
        if (!v.ok) throw new Error(`Actual-size file failed its check: ${v.issues.join(' ')}`);
        out.push({ name: names.actual, data: b });
        filesForReport.push(describeFile('Actual size', names.actual, actualLayout, job, o.markType));
      } else warnings.push(...actualLayout.warnings);
    }
    if (i.files.fit) {
      const b = await press(await pressPdfPages(sheetsFor(fitLayout), `${i.base} — fit to print`));
      const v = await verifyPressPdf(b, fitLayout, sides);
      if (!v.ok) throw new Error(`Fit-to-print file failed its check: ${v.issues.join(' ')}`);
      out.push({ name: names.fit, data: b });
      filesForReport.push(describeFile('Fit to print', names.fit, fitLayout, job, o.markType));
    }
    if (i.files.normal) {
      const nl = normalLayout(sidePressJob(job, 0, i.base));
      const b = await press(await pressPdfPages(job.sides.map((_, s) => ({ job: sidePressJob(job, s, i.base), layout: nl, art: i.arts![s] ?? null })), `${i.base} — normal`));
      const v = await verifyPressPdf(b, nl, sides);
      if (!v.ok) throw new Error(`Normal file failed its check: ${v.issues.join(' ')}`);
      out.push({ name: names.normal, data: b });
      filesForReport.push(describeFile('Normal (bleed, no marks)', names.normal, nl, job, null));
    }
  }
  if (i.files.report) {
    // The report lists the print files of this job even when only the report is downloaded.
    const listed = filesForReport.length ? filesForReport : [
      ...(actualLayout.fits ? [describeFile('Actual size', names.actual, actualLayout, job, o.markType)] : []),
      describeFile('Fit to print', names.fit, fitLayout, job, o.markType),
      describeFile('Normal (bleed, no marks)', names.normal, normalLayout(sidePressJob(job, 0, i.base)), job, null),
    ];
    const pages = jobReportPages({ job, details: i.details, date: i.date, previews: i.previews || [], files: listed, margin: o.margin, markType: o.markType, colour: i.colour, logo: i.logo });
    out.push({ name: names.report, data: await i.toPdf(pages.map((svg) => ({ svg, widthMm: 297, heightMm: 210 }))) });
  }
  return { out, actualLayout, fitLayout, warnings, cmyk: !!i.cmyk };
}
