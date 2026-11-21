// Packaging inside the design editor.
//  · Templates and new boxes become ordinary editor objects (shapes, text,
//    patterns) on a page sized to the flat blank, plus the dieline as locked
//    path objects tagged __die = cut | crease | perf | glue.
//  · Any object can be marked as a die line, so hand-drawn windows, hang
//    holes or unique shapes join the dieline.
//  · The press PDF is the editor's own vector export of the artwork with the
//    die objects hidden, plus the die lines added as overprinting spot
//    colours (CutContour, Crease, Perforation, Glue area).

import { makeDieline, type BoxStyleId, type Dieline } from './dieline.ts';
import type { SceneItem } from './templates.ts';
import { pathToPdf } from './editorPdf.ts';

export const PX = 96 / 25.4;          // editor pixels per millimetre
export const PAGE_MARGIN = 10;         // mm around the blank (bleed + slug)
export type DieKind = 'cut' | 'crease' | 'perf' | 'glue';
export const DIE_STYLE: Record<DieKind, { colour: string; dash: number[] | null; name: string }> = {
  cut: { colour: '#EC008C', dash: null, name: 'Cut (CutContour)' },
  crease: { colour: '#00A0E3', dash: [8, 4], name: 'Crease (fold)' },
  perf: { colour: '#F7A600', dash: [3, 3], name: 'Perforation' },
  glue: { colour: '#2BB673', dash: [6, 3], name: 'Glue area' },
};

export interface PackSpec {
  style: BoxStyleId; product: { L: number; W: number; H: number }; clearance: { L: number; W: number; H: number };
  grade: string; gsm: number; t: number; glue: number; tuck: number; lidDepth: number;
}
export const specInner = (s: PackSpec) => ({ L: s.product.L + s.clearance.L, W: s.product.W + s.clearance.W, D: s.product.H + s.clearance.H });
export const specDieline = (s: PackSpec): Dieline => { const i = specInner(s); return makeDieline({ style: s.style, L: i.L, W: i.W, D: i.D, t: s.t, glue: s.glue, tuck: s.tuck, lidDepth: s.lidDepth }); };
export const pageSizePx = (d: Dieline) => ({ width: Math.round((d.w + 2 * PAGE_MARGIN) * PX), height: Math.round((d.h + 2 * PAGE_MARGIN) * PX) });

/** Template artwork → editor objects (fabric), placed with the blank at (originPx). */
export function sceneToFabric(F: any, items: SceneItem[], origin: { x: number; y: number }): any[] {
  const X = (mm: number) => origin.x + mm * PX, Y = (mm: number) => origin.y + mm * PX;
  const out: any[] = [];
  for (const it of items) {
    if (it.k === 'rect') out.push(new F.Rect({ name: it.name, left: X(it.x), top: Y(it.y), width: it.w * PX, height: it.h * PX, fill: it.fill || 'transparent', stroke: it.stroke || null, strokeWidth: it.stroke ? (it.sw || 0.3) * PX : 0, rx: (it.rx || 0) * PX, ry: (it.rx || 0) * PX, opacity: it.opacity ?? 1, strokeUniform: false }));
    else if (it.k === 'circle') out.push(new F.Circle({ name: it.name, left: X(it.cx - it.r), top: Y(it.cy - it.r), radius: it.r * PX, fill: it.fill || 'transparent', opacity: it.opacity ?? 1 }));
    else if (it.k === 'path') {
      const p = new F.Path(it.d, { name: it.name, fill: it.fill || '', stroke: it.stroke || null, strokeWidth: it.stroke ? it.sw || 0.3 : 0, opacity: it.opacity ?? 1, isVectorPath: true });
      p.set({ scaleX: PX, scaleY: PX, left: X(p.left), top: Y(p.top) });
      out.push(p);
    } else {
      out.push(new F.Textbox(it.text, { name: it.name, left: X(it.x), top: Y(it.y), width: it.w * PX, fontSize: it.size * PX, fontFamily: it.font, fontWeight: it.weight || 400, fontStyle: it.italic ? 'italic' : 'normal', fill: it.fill, textAlign: it.align || 'left', charSpacing: (it.spacing || 0) * 1000, lineHeight: it.lineHeight || 1.16, angle: it.rot || 0 }));
    }
  }
  return out;
}

/** Dieline → locked editor path objects tagged with their line type. */
export function dieToFabric(F: any, d: Dieline, origin: { x: number; y: number }, spec?: PackSpec): any[] {
  const out: any[] = [];
  for (const kind of ['crease', 'perf', 'cut'] as const) {
    const dd = d.lines.filter((l) => l.kind === kind).map((l) => l.d).join(' ');
    if (!dd) continue;
    const st = DIE_STYLE[kind];
    const p = new F.Path(dd, { name: `Dieline · ${st.name}`, fill: '', stroke: st.colour, strokeWidth: 1, strokeUniform: true, strokeDashArray: st.dash, objectCaching: false });
    p.set({ scaleX: PX, scaleY: PX, left: origin.x + p.left * PX, top: origin.y + p.top * PX });
    p.set({ locked: true, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, hasControls: false });
    p.__die = kind; p.__dieGen = true;
    if (spec && kind === 'cut') p.__pack = JSON.stringify(spec);
    out.push(p);
  }
  return out;
}

type M6 = [number, number, number, number, number, number];
const ap = (m: M6, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const f2 = (v: number) => Math.round(v * 100) / 100;

/** An editor object's outline as absolute canvas-pixel path data (for die export). */
export function objectPathPx(o: any): string | null {
  const m = o.calcTransformMatrix() as M6;
  const P = (x: number, y: number) => { const [a, b] = ap(m, x, y); return `${f2(a)} ${f2(b)}`; };
  const t = o.type;
  if (t === 'path' && Array.isArray(o.path)) {
    const ox = o.pathOffset?.x || 0, oy = o.pathOffset?.y || 0;
    let out = '', cx = 0, cy = 0;
    for (const seg of o.path) {
      const c = String(seg[0]);
      if (c === 'M' || c === 'L') { out += `${c}${P(seg[1] - ox, seg[2] - oy)} `; cx = seg[1]; cy = seg[2]; }
      else if (c === 'C') { out += `C${P(seg[1] - ox, seg[2] - oy)} ${P(seg[3] - ox, seg[4] - oy)} ${P(seg[5] - ox, seg[6] - oy)} `; cx = seg[5]; cy = seg[6]; }
      else if (c === 'Q') { out += `Q${P(seg[1] - ox, seg[2] - oy)} ${P(seg[3] - ox, seg[4] - oy)} `; cx = seg[3]; cy = seg[4]; }
      else if (c === 'Z' || c === 'z') out += 'Z ';
      else if (c === 'H') { out += `L${P(seg[1] - ox, cy - oy)} `; cx = seg[1]; }
      else if (c === 'V') { out += `L${P(cx - ox, seg[1] - oy)} `; cy = seg[1]; }
    }
    return out.trim();
  }
  if (t === 'line') { const c = o.calcLinePoints(); return `M${P(c.x1, c.y1)} L${P(c.x2, c.y2)}`; }
  if (t === 'rect' || t === 'image' || t === 'textbox' || t === 'i-text' || t === 'text') { const w = o.width / 2, h = o.height / 2; return `M${P(-w, -h)} L${P(w, -h)} L${P(w, h)} L${P(-w, h)} Z`; }
  if (t === 'circle' || t === 'ellipse') {
    const rx = t === 'circle' ? o.radius : o.rx, ry = t === 'circle' ? o.radius : o.ry, k = 0.5522847498;
    return `M${P(rx, 0)} C${P(rx, ry * k)} ${P(rx * k, ry)} ${P(0, ry)} C${P(-rx * k, ry)} ${P(-rx, ry * k)} ${P(-rx, 0)} C${P(-rx, -ry * k)} ${P(-rx * k, -ry)} ${P(0, -ry)} C${P(rx * k, -ry)} ${P(rx, -ry * k)} ${P(rx, 0)} Z`;
  }
  if ((t === 'polyline' || t === 'polygon') && Array.isArray(o.points)) {
    const ox = o.pathOffset?.x || 0, oy = o.pathOffset?.y || 0;
    return o.points.map((q: any, i: number) => `${i ? 'L' : 'M'}${P(q.x - ox, q.y - oy)}`).join(' ') + (t === 'polygon' ? ' Z' : '');
  }
  return null;
}

const SPOT: Record<DieKind, { name: string; c: number[]; dash?: number[] }> = {
  cut: { name: 'CutContour', c: [0, 1, 0, 0] },
  crease: { name: 'Crease', c: [1, 0, 0, 0], dash: [3, 1.6] },
  perf: { name: 'Perforation', c: [0, 0.35, 1, 0], dash: [1, 1] },
  glue: { name: 'Glue area', c: [0.75, 0, 0.9, 0], dash: [2, 1] },
};

/**
 * Adds die lines to page 1 of an artwork PDF as overprinting spot colours.
 * `lines` paths are in page millimetres from the top-left corner. Sets
 * TrimBox to the cut outline and BleedBox to trim + bleed.
 */
export async function appendDieLayer(pdfBytes: Uint8Array | ArrayBuffer, lines: { kind: DieKind; d: string }[], o: { bleed?: number } = {}): Promise<Uint8Array> {
  const lib: any = await import('pdf-lib');
  const { PDFDocument, PDFName } = lib;
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPage(0), ctx = doc.context;
  const { height } = page.getSize();
  const PT = 72 / 25.4;
  const map = (x: number, y: number): [number, number] => [x * PT, height - y * PT];
  const res = page.node.Resources();
  const sep = (name: string, c: number[]) => ctx.obj([PDFName.of('Separation'), PDFName.of(name), PDFName.of('DeviceCMYK'), ctx.obj({ FunctionType: 2, Domain: [0, 1], C0: [0, 0, 0, 0], C1: c, N: 1 })]);
  const csKey = PDFName.of('ColorSpace'), gsKey = PDFName.of('ExtGState');
  const cs = res.lookup(csKey) || ctx.obj({}); res.set(csKey, cs);
  const gs = res.lookup(gsKey) || ctx.obj({}); res.set(gsKey, gs);
  gs.set(PDFName.of('MtDieOP'), ctx.obj({ Type: 'ExtGState', OP: true, op: true, OPM: 1 }));
  let s = 'q /MtDieOP gs 1 J 1 j\n';
  for (const k of ['glue', 'perf', 'crease', 'cut'] as const) {
    const ls = lines.filter((l) => l.kind === k);
    if (!ls.length) continue;
    const name = `MtDie${k}`;
    cs.set(PDFName.of(name), sep(SPOT[k].name, SPOT[k].c));
    const dash = SPOT[k].dash ? `[${SPOT[k].dash!.map((v) => (v * PT).toFixed(2)).join(' ')}] 0 d` : '[] 0 d';
    s += `/${name} CS 1 SCN 0.5 w ${dash}\n${ls.map((l) => pathToPdf(l.d, map)).join('')}S\n`;
  }
  s += '[] 0 d Q\n';
  const ref = ctx.register(ctx.flateStream(new TextEncoder().encode(s)));
  page.node.normalize();
  page.node.addContentStream(ref);
  // trim = cut outline bounds
  const cuts = lines.filter((l) => l.kind === 'cut');
  if (cuts.length) {
    const nums = cuts.flatMap((l) => (l.d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number));
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    const b = o.bleed ?? 3;
    const [x0, y1] = map(Math.min(...xs), Math.min(...ys)), [x1, y0] = map(Math.max(...xs), Math.max(...ys));
    page.node.set(PDFName.of('TrimBox'), ctx.obj([x0, y0, x1, y1]));
    page.node.set(PDFName.of('BleedBox'), ctx.obj([x0 - b * PT, y0 - b * PT, x1 + b * PT, y1 + b * PT]));
  }
  return doc.save({ useObjectStreams: false });
}
