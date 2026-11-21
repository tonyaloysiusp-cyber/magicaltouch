// PDFs from a Packaging Editor document, 1:1 in millimetres.
//  · PRINT — artwork in DeviceCMYK (colours mapped through the FOGRA39 table
//    when the caller passes a mapper), text already turned into outlines by
//    the caller, images embedded; die lines on top as named spot colours that
//    overprint (CutContour, Crease, Perforation, Glue area). TrimBox = the
//    knife outline, BleedBox = trim + bleed.
//  · TEMPLATE — the same lines on a branded sheet with the spec box and a
//    legend, for designers and die makers. Print plates carry no branding.

import type { PkDoc, PkObj, LineType } from './editorModel.ts';
import { docBounds, objBounds, paintOrder, ruleTotals, innerSize, outerSize, unionBounds } from './editorModel.ts';

const PT = 72 / 25.4;
const n = (v: number) => String(Math.round(v * 1000) / 1000);

export interface EditorPdfInput {
  doc: PkDoc;
  mode: 'print' | 'template';
  /** absolute-mm outline path for each text object (text is never embedded as live type) */
  textPaths: Record<string, string>;
  /** hex → CMYK 0..1; falls back to a plain conversion */
  cmyk?: (hex: string) => [number, number, number, number];
  /** image bytes per image object id */
  images?: Record<string, { bytes: Uint8Array; png: boolean }>;
  logoPng?: Uint8Array | null;
  board?: string;
  brandName?: string;
}

const naiveCmyk = (hex: string): [number, number, number, number] => {
  const h = hex.replace('#', ''), v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const r = parseInt(v.slice(0, 2), 16) / 255, g = parseInt(v.slice(2, 4), 16) / 255, b = parseInt(v.slice(4, 6), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 1];
  return [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k];
};

/** Path data (M/L/H/V/C/Q/Z, absolute or relative) → PDF operators through a point map. */
export function pathToPdf(d: string, map: (x: number, y: number) => [number, number]): string {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, out = '';
  const num = () => Number(toks[i++]);
  const P = (px: number, py: number) => { const [a, b] = map(px, py); return `${n(a)} ${n(b)}`; };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { out += 'h\n'; x = sx; y = sy; if (i < toks.length && !/[a-zA-Z]/.test(toks[i])) i++; continue; }
    if (C === 'M') { x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); sx = x; sy = y; out += `${P(x, y)} m\n`; cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = (rel ? x : 0) + num(); y = (rel ? y : 0) + num(); out += `${P(x, y)} l\n`; }
    else if (C === 'H') { x = (rel ? x : 0) + num(); out += `${P(x, y)} l\n`; }
    else if (C === 'V') { y = (rel ? y : 0) + num(); out += `${P(x, y)} l\n`; }
    else if (C === 'C') { const bx = rel ? x : 0, by = rel ? y : 0; const a = [num() + bx, num() + by, num() + bx, num() + by, num() + bx, num() + by]; out += `${P(a[0], a[1])} ${P(a[2], a[3])} ${P(a[4], a[5])} c\n`; x = a[4]; y = a[5]; }
    else if (C === 'Q') { const bx = rel ? x : 0, by = rel ? y : 0; const qx = num() + bx, qy = num() + by, ex = num() + bx, ey = num() + by; out += `${P(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y))} ${P(ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey))} ${P(ex, ey)} c\n`; x = ex; y = ey; }
    else { i++; } // unsupported command: skip a number to avoid a loop
  }
  return out;
}

export function ellipsePath(x: number, y: number, w: number, h: number): string {
  const k = 0.5522847498, rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
  return `M${cx + rx} ${cy} C${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry} C${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy} C${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry} C${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy} Z`;
}
export const rectPath = (x: number, y: number, w: number, h: number) => `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`;

/** Absolute-mm path for a shape object (path, rect, ellipse); null for text and images. */
export function shapePath(o: PkObj): string | null {
  if (o.kind === 'rect') return rectPath(o.x, o.y, o.w, o.h);
  if (o.kind === 'ellipse') return ellipsePath(o.x, o.y, o.w, o.h);
  if (o.kind === 'path' && o.d) {
    if (!o.x && !o.y) return o.d;
    // translate absolute commands; relative ones move with their start point
    return o.d.replace(/([MLCQ])([^MLCQZHVmlcqzhv]*)/g, (_m, c: string, args: string) => {
      const v = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
      return c + v.map((q, i) => (i % 2 === 0 ? q + o.x : q + o.y)).join(' ') + ' ';
    }).replace(/([HV])\s*(-?\d*\.?\d+)/g, (_m, c: string, q: string) => `${c}${Number(q) + (c === 'H' ? o.x : o.y)}`);
  }
  return null;
}

const SPOTS: Record<Exclude<LineType, 'art'>, { name: string; cs: string; c: number[]; dash?: number[] }> = {
  cut: { name: 'CutContour', cs: 'CsCut', c: [0, 1, 0, 0] },
  crease: { name: 'Crease', cs: 'CsCrease', c: [1, 0, 0, 0], dash: [3, 1.6] },
  perf: { name: 'Perforation', cs: 'CsPerf', c: [0, 0.35, 1, 0], dash: [1, 1] },
  glue: { name: 'Glue area', cs: 'CsGlue', c: [0.75, 0, 0.9, 0], dash: [2, 1] },
};

export async function editorPdf(inp: EditorPdfInput): Promise<Uint8Array> {
  const lib: any = await import('pdf-lib');
  const { PDFDocument, PDFName, StandardFonts } = lib;
  const { doc, mode } = inp;
  const toCmyk = inp.cmyk ?? naiveCmyk;
  const visible = paintOrder(doc).filter((o) => !o.hidden && !doc.layers.find((l) => l.id === o.layer)?.hidden);
  const cutBounds = unionBounds(visible.filter((o) => o.line === 'cut').map(objBounds));
  const all = docBounds({ ...doc, objects: visible });
  const area = cutBounds ?? all;
  const margin = mode === 'template' ? 18 : 12, head = mode === 'template' ? 40 : 0;
  const b = doc.bleed;
  const x0 = Math.min(all.x, area.x - b) - margin, y0 = Math.min(all.y, area.y - b) - margin - head;
  const Wmm = Math.max(all.x + all.w, area.x + area.w + b) + margin - x0, Hmm = Math.max(all.y + all.h, area.y + area.h + b) + margin - y0;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.name} — ${mode === 'print' ? 'print' : 'dieline template'}`); pdf.setProducer(''); pdf.setCreator('');
  const page = pdf.addPage([Wmm * PT, Hmm * PT]);
  const ctx = pdf.context, res = page.node.Resources();
  const map = (x: number, y: number): [number, number] => [(x - x0) * PT, (Hmm - (y - y0)) * PT];
  const sep = (name: string, c: number[]) => ctx.obj([PDFName.of('Separation'), PDFName.of(name), PDFName.of('DeviceCMYK'), ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: c, N: 1 })]);
  const csDict: Record<string, any> = { CsInfo: sep('Dieline info', [0, 0, 0, 0.7]), CsBleed: sep('Bleed guide', [0.35, 0.05, 0, 0]) };
  for (const s of Object.values(SPOTS)) csDict[s.cs] = sep(s.name, s.c);
  res.set(PDFName.of('ColorSpace'), ctx.obj(csDict));
  const gs: Record<string, any> = { GsOP: ctx.obj({ Type: 'ExtGState', OP: true, op: true, OPM: 1 }) };
  const xobj: Record<string, any> = {};
  let cs = '';

  // ── artwork ──
  const cmykOp = (hex: string, fill: boolean) => { const [c, m, y, k] = toCmyk(hex); return `${n(c)} ${n(m)} ${n(y)} ${n(k)} ${fill ? 'k' : 'K'}\n`; };
  let gsN = 0, imN = 0;
  for (const o of visible) {
    if (o.line !== 'art') continue;
    let alpha = '';
    if (o.opacity != null && o.opacity < 1) { const key = `Ga${gsN++}`; gs[key] = ctx.obj({ Type: 'ExtGState', ca: o.opacity, CA: o.opacity }); alpha = `/${key} gs\n`; }
    if (o.kind === 'image' && inp.images?.[o.id]) {
      const im = inp.images[o.id];
      const emb = im.png ? await pdf.embedPng(im.bytes) : await pdf.embedJpg(im.bytes);
      const key = `Im${imN++}`; xobj[key] = emb.ref;
      const [px, py] = map(o.x, o.y + o.h);
      cs += `q ${alpha}${n(o.w * PT)} 0 0 ${n(o.h * PT)} ${n(px)} ${n(py)} cm /${key} Do Q\n`;
      continue;
    }
    const d = o.kind === 'text' ? inp.textPaths[o.id] : shapePath(o);
    if (!d) continue;
    const ops = pathToPdf(d, map);
    const fill = o.fill && o.fill !== 'none' ? o.fill : null, stroke = o.stroke && o.stroke !== 'none' && (o.strokeW ?? 0) > 0 ? o.stroke : null;
    if (!fill && !stroke) continue;
    cs += `q ${alpha}`;
    if (fill) cs += cmykOp(fill, true);
    if (stroke) cs += cmykOp(stroke, false) + `${n((o.strokeW ?? 0.3) * PT)} w 1 J 1 j\n`;
    cs += ops + (fill && stroke ? 'B\n' : fill ? (o.kind === 'text' ? 'f*\n' : 'f\n') : 'S\n') + 'Q\n';
  }

  // ── die lines (overprinting spot colours) ──
  cs += 'q /GsOP gs 1 J 1 j\n';
  if (mode === 'template' && b > 0 && cutBounds) {
    const cutOps = visible.filter((o) => o.line === 'cut').map((o) => shapePath(o)).filter(Boolean).map((d) => pathToPdf(d!, map)).join('');
    cs += `/CsBleed CS 1 SCN ${n(2 * b * PT)} w\n${cutOps}S\n`;
  }
  for (const k of ['glue', 'perf', 'crease', 'cut'] as const) {
    const s = SPOTS[k];
    const ops = visible.filter((o) => o.line === k).map((o) => shapePath(o)).filter(Boolean).map((d) => pathToPdf(d!, map)).join('');
    if (!ops) continue;
    cs += `/${s.cs} CS 1 SCN 0.5 w ${s.dash ? `[${s.dash.map((v) => n(v * PT)).join(' ')}] 0 d` : '[] 0 d'}\n${ops}S\n`;
  }
  cs += '[] 0 d Q\n';

  // ── template sheet: brand, spec box, legend (non-printing info colour) ──
  if (mode === 'template') {
    const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    res.set(PDFName.of('Font'), ctx.obj({ F1: font.ref, F2: bold.ref }));
    const txt = (s: string, x: number, y: number, size: number, f: 'F1' | 'F2' = 'F1') => `BT /${f} ${n(size)} Tf ${n(x * PT)} ${n((Hmm - y) * PT)} Td ${(f === 'F2' ? bold : font).encodeText(s).toString()} Tj ET\n`;
    const r1 = (v: number) => Math.round(v * 10) / 10;
    const L = margin;
    let tx = L;
    if (inp.logoPng) {
      try {
        const logo = await pdf.embedPng(inp.logoPng); xobj.ImLogo = logo.ref;
        const lh = 7, lw = (logo.width / logo.height) * lh;
        cs += `q ${n(lw * PT)} 0 0 ${n(lh * PT)} ${n(L * PT)} ${n((Hmm - 6 - lh) * PT)} cm /ImLogo Do Q\n`;
        tx = L + lw + 5;
      } catch { /* logo is optional */ }
    }
    const i = innerSize(doc.box), o = outerSize(doc.box), t = ruleTotals({ ...doc, objects: visible });
    cs += 'q 0 0 0 1 k\n';
    cs += txt(`${(inp.brandName || 'Magical Touch Design').toUpperCase()}  ·  DIELINE TEMPLATE`, tx, 9, 6.5, 'F2');
    cs += txt(doc.name, tx, 15, 11, 'F2');
    cs += 'Q q 0 0 0 0.6 k\n';
    cs += txt(`Product ${r1(doc.box.product.L)} × ${r1(doc.box.product.W)} × ${r1(doc.box.product.H)} mm  ·  inside ${r1(i.L)} × ${r1(i.W)} × ${r1(i.D)} mm  ·  outside ${r1(o.L)} × ${r1(o.W)} × ${r1(o.D)} mm`, L, 23, 6.5);
    cs += txt(`Board ${inp.board || `${r1(doc.box.t * 100) / 100} mm`}  ·  knife ${r1(t.cut / 1000 * 100) / 100} m  ·  crease ${r1(t.crease / 1000 * 100) / 100} m${t.perf ? `  ·  perforation ${r1(t.perf / 10) / 100} m` : ''}  ·  scale 100 % — do not resize`, L, 28, 6.5);
    cs += txt(`Magenta = cut   ·   Cyan dashed = crease   ·   Orange dotted = perforation   ·   Green dashed = glue   ·   Light blue band = ${b} mm bleed`, L, 33, 6);
    cs += 'Q\n';
    // fine rule under the header
    cs += `q 0 0 0 1 K 0.4 w ${n(L * PT)} ${n((Hmm - 36) * PT)} m ${n((Wmm - L) * PT)} ${n((Hmm - 36) * PT)} l S Q\n`;
    cs += `q 0 0 0 0.5 k\n${txt('Spot lines overprint and must not print. Check a sample with your die maker before production.', L, Hmm - 5, 5.5)}Q\n`;
  }

  res.set(PDFName.of('ExtGState'), ctx.obj(gs));
  if (Object.keys(xobj).length) res.set(PDFName.of('XObject'), ctx.obj(xobj));
  page.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream(new TextEncoder().encode(cs))));
  const [tx0, ty1] = map(area.x, area.y), [tx1, ty0] = map(area.x + area.w, area.y + area.h);
  page.node.set(PDFName.of('TrimBox'), ctx.obj([tx0, ty0, tx1, ty1]));
  page.node.set(PDFName.of('BleedBox'), ctx.obj([tx0 - b * PT, ty0 - b * PT, tx1 + b * PT, ty1 + b * PT]));
  return pdf.save({ useObjectStreams: false });
}
