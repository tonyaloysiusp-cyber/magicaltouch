// Press PDFs for a dieline. Vector only, at 1:1 in millimetres:
//  · DIELINE — cut and crease as named spot colours ("CutContour", "Crease")
//    set to overprint, so the die layer never knocks out the artwork; panel
//    labels and a spec box sit outside the knife line in a non-printing
//    "Dieline info" spot colour.
//  · TEMPLATE — the same plus the bleed band, for designers to put artwork on.
// Spot names follow common RIP / die-maker conventions; rename in prepress if
// your converter uses others.

import type { Dieline } from './dieline.ts';
import { ruleLength } from './dieline.ts';

const PT = 72 / 25.4;
const n = (v: number) => String(Math.round(v * 1000) / 1000);

/** Path data (M/L/C/Z, mm, y down) → PDF path operators (pt, y up). */
function pathOps(d: string, H: number, ox: number, oy: number): string {
  const nums = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
  const cmds = d.match(/[MLCZ]/g) || [];
  const X = (x: number) => n((x + ox) * PT), Y = (y: number) => n((H - (y + oy)) * PT);
  let i = 0, out = '';
  for (const c of cmds) {
    if (c === 'M') { out += `${X(nums[i])} ${Y(nums[i + 1])} m\n`; i += 2; }
    else if (c === 'L') { out += `${X(nums[i])} ${Y(nums[i + 1])} l\n`; i += 2; }
    else if (c === 'C') { out += `${X(nums[i])} ${Y(nums[i + 1])} ${X(nums[i + 2])} ${Y(nums[i + 3])} ${X(nums[i + 4])} ${Y(nums[i + 5])} c\n`; i += 6; }
    else out += 'h\n';
  }
  return out;
}

export interface DiePdfOptions { template?: boolean; bleed?: number; margin?: number; title?: string; board?: string }

export async function dielinePdf(d: Dieline, o: DiePdfOptions = {}): Promise<Uint8Array> {
  const lib: any = await import('pdf-lib');
  const { PDFDocument, PDFName, PDFString, StandardFonts, cmyk } = lib;
  const m = o.margin ?? 20, b = o.bleed ?? 3, info = 34;
  const Wmm = d.w + 2 * m, Hmm = d.h + 2 * m + info;
  const doc = await PDFDocument.create();
  doc.setTitle(o.title || `${d.title} — dieline`); doc.setProducer(''); doc.setCreator('');
  const page = doc.addPage([Wmm * PT, Hmm * PT]);
  const ctx = doc.context;
  const sep = (name: string, c: number[]) => ctx.obj([PDFName.of('Separation'), PDFName.of(name), PDFName.of('DeviceCMYK'), ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: c, N: 1 })]);
  const res = page.node.Resources();
  res.set(PDFName.of('ColorSpace'), ctx.obj({ CsCut: sep('CutContour', [0, 1, 0, 0]), CsCrease: sep('Crease', [1, 0, 0, 0]), CsInfo: sep('Dieline info', [0, 0, 0, 0.6]), CsBleed: sep('Bleed guide', [0.35, 0.05, 0, 0]) }));
  res.set(PDFName.of('ExtGState'), ctx.obj({ GsOP: ctx.obj({ Type: 'ExtGState', OP: true, op: true, OPM: 1 }) }));
  const ox = m, oy = m + info;
  const of = (k: string) => d.lines.filter((l) => l.kind === k).map((l) => pathOps(l.d, Hmm, ox, oy)).join('');
  let cs = 'q /GsOP gs\n1 J 1 j\n';
  if (o.template && b > 0) cs += `/CsBleed CS 1 SCN ${n(2 * b * PT)} w\n${of('cut')}S\n`;
  cs += `/CsCrease CS 1 SCN 0.5 w [${n(3 * PT)} ${n(1.6 * PT)}] 0 d\n${of('crease')}S\n[] 0 d\n`;
  if (d.lines.some((l) => l.kind === 'perf')) cs += `/CsCrease CS 1 SCN 0.5 w [${n(1 * PT)} ${n(1 * PT)}] 0 d\n${of('perf')}S\n[] 0 d\n`;
  cs += `/CsCut CS 1 SCN 0.5 w\n${of('cut')}S\nQ\n`;
  // Spec box (non-printing info colour) above the dieline
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  res.set(PDFName.of('Font'), ctx.obj({ F1: font.ref, F2: bold.ref }));
  const txt = (s: string, x: number, y: number, size: number, f = 'F1') => {
    const enc = (f === 'F2' ? bold : font).encodeText(s).toString();
    return `BT /${f} ${n(size)} Tf ${n(x * PT)} ${n((Hmm - y) * PT)} Td ${enc} Tj ET\n`;
  };
  const r1 = (v: number) => Math.round(v * 10) / 10;
  cs += 'q /GsOP gs /CsInfo cs 1 scn\n';
  cs += txt(`${d.title}${o.template ? ' — artwork template' : ' — dieline'}`, m, 10, 9, 'F2');
  cs += txt(`Inside ${r1(d.inside.L)} × ${r1(d.inside.W)} × ${r1(d.inside.D)} mm (L × W × D) · board ${o.board || `${r1(d.t)} mm`} · flat ${r1(d.w)} × ${r1(d.h)} mm`, m, 15.5, 6.5);
  cs += txt(`Knife ${r1(ruleLength(d, 'cut') / 1000)} m · crease ${r1(ruleLength(d, 'crease') / 1000)} m · scale 100 % — do not resize`, m, 20.5, 6.5);
  cs += txt(`Magenta solid = CutContour (cut)   ·   Cyan dashed = Crease (fold)${o.template ? `   ·   Light blue band = ${b} mm bleed: run artwork to its outer edge` : ''}`, m, 25.5, 6.5);
  cs += txt('Spot lines overprint and must not be printed. Confirm with your die maker before cutting.', m, 30.5, 6);
  for (const p of d.panels) if (p.w > 14 && p.h > 8) cs += txt(p.name, ox + p.x + 2, oy + p.y + 4.5, 5.5);
  cs += 'Q\n';
  const stream = ctx.flateStream(new TextEncoder().encode(cs));
  page.node.set(PDFName.of('Contents'), ctx.register(stream));
  const trim = [ox * PT, (Hmm - oy - d.h) * PT, (ox + d.w) * PT, (Hmm - oy) * PT];
  page.node.set(PDFName.of('TrimBox'), ctx.obj(trim));
  page.node.set(PDFName.of('BleedBox'), ctx.obj([trim[0] - b * PT, trim[1] - b * PT, trim[2] + b * PT, trim[3] + b * PT]));
  doc.setSubject(PDFString ? `${d.title} dieline` : '');
  return doc.save({ useObjectStreams: false });
}
