// ---------------------------------------------------------------------
// lib/editor/pdfVector.ts
// True-vector drawing of Fabric objects into a jsPDF document.
//
// Covers what used to be turned into pictures: rounded rectangles,
// circles and ellipses as real curves; linear and radial gradients as PDF
// shadings (shapes AND text, via text clipping); letter spacing, mixed
// styles and justified text placed exactly where Fabric lays them out;
// see-through colours; dashed lines; groups; holes in paths; and soft
// shadows (only the blurred shadow itself is a picture — the object on
// top stays vector).
//
// renderVector() returns false for anything it can't draw faithfully,
// and the caller falls back to a sharp picture of just that object.
// ---------------------------------------------------------------------

import { toPt } from './units';
import { ensurePdfFont, createPdfFontCache } from './pdfFonts';

type Pt = [number, number];
type Cmd = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];
type FontCache = ReturnType<typeof createPdfFontCache>;

export interface VectorCtx {
  offsetX: number;
  offsetY: number;
  pageHeightPt: number;
  fontCache: FontCache;
  opacity: number; // accumulated opacity from parent groups
}

const K = 0.5522847498;
const EMOJI = new RegExp('\\p{Extended_Pictographic}', 'u');
// Scripts whose letters join or reorder (Arabic, Hebrew, Indian, Thai…)
// and East-Asian text (very large fonts): drawn as a sharp picture so
// every letter comes out right.
const COMPLEX_SCRIPT = /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0FFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const isText = (o: any) => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';

// ---------------------------------------------------------------- colours

interface Rgba { r: number; g: number; b: number; a: number }
function parseColor(F: any, v: any): Rgba | null {
  if (typeof v !== 'string' || !v || v === 'transparent' || v === 'none') return null;
  try {
    const s = new F.Color(v).getSource();
    if (!s) return null;
    return { r: s[0], g: s[1], b: s[2], a: s[3] ?? 1 };
  } catch {
    return null;
  }
}
const isGradient = (v: any) => v && typeof v === 'object' && Array.isArray(v.colorStops) && (v.type === 'linear' || v.type === 'radial');

// ---------------------------------------------------------------- geometry

function mul(a: number[], b: number[]): number[] {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}
const apply = (m: number[], x: number, y: number): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// Local outline of a shape (object-centred coordinates, before its transform).
function localCommands(obj: any): { cmds: Cmd[]; closed: boolean } | null {
  const w = obj.width || 0, h = obj.height || 0;
  switch (obj.type) {
    case 'rect': {
      const x = -w / 2, y = -h / 2;
      const rx = Math.min(obj.rx || 0, w / 2), ry = Math.min(obj.ry || 0, h / 2);
      if (!rx && !ry) return { cmds: [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']], closed: true };
      const kx = rx * K, ky = ry * K;
      return {
        closed: true,
        cmds: [
          ['M', x + rx, y], ['L', x + w - rx, y], ['C', x + w - rx + kx, y, x + w, y + ry - ky, x + w, y + ry],
          ['L', x + w, y + h - ry], ['C', x + w, y + h - ry + ky, x + w - rx + kx, y + h, x + w - rx, y + h],
          ['L', x + rx, y + h], ['C', x + rx - kx, y + h, x, y + h - ry + ky, x, y + h - ry],
          ['L', x, y + ry], ['C', x, y + ry - ky, x + rx - kx, y, x + rx, y], ['Z'],
        ],
      };
    }
    case 'circle':
    case 'ellipse': {
      const rx = obj.type === 'circle' ? obj.radius || 0 : obj.rx || 0;
      const ry = obj.type === 'circle' ? obj.radius || 0 : obj.ry || 0;
      if (obj.type === 'circle' && (obj.startAngle || 0) !== 0 && ((obj.endAngle ?? 360) - (obj.startAngle || 0)) % 360 !== 0) return null; // arcs/pies
      const kx = rx * K, ky = ry * K;
      return {
        closed: true,
        cmds: [['M', rx, 0], ['C', rx, ky, kx, ry, 0, ry], ['C', -kx, ry, -rx, ky, -rx, 0], ['C', -rx, -ky, -kx, -ry, 0, -ry], ['C', kx, -ry, rx, -ky, rx, 0], ['Z']],
      };
    }
    case 'triangle':
      return { closed: true, cmds: [['M', -w / 2, h / 2], ['L', 0, -h / 2], ['L', w / 2, h / 2], ['Z']] };
    case 'polygon':
    case 'polyline': {
      const pts: { x: number; y: number }[] = obj.points || [];
      if (pts.length < 2) return null;
      const o = obj.pathOffset || { x: 0, y: 0 };
      const cmds: Cmd[] = pts.map((p, i) => [i ? 'L' : 'M', p.x - o.x, p.y - o.y] as Cmd);
      if (obj.type === 'polygon') cmds.push(['Z']);
      return { cmds, closed: obj.type === 'polygon' };
    }
    case 'path': {
      const o = obj.pathOffset || { x: 0, y: 0 };
      const cmds: Cmd[] = [];
      let cur: Pt = [0, 0], start: Pt = [0, 0];
      for (const c of obj.path || []) {
        const t = c[0];
        if (t === 'M') { cur = [c[1], c[2]]; start = cur; cmds.push(['M', cur[0] - o.x, cur[1] - o.y]); }
        else if (t === 'L') { cur = [c[1], c[2]]; cmds.push(['L', cur[0] - o.x, cur[1] - o.y]); }
        else if (t === 'C') { cmds.push(['C', c[1] - o.x, c[2] - o.y, c[3] - o.x, c[4] - o.y, c[5] - o.x, c[6] - o.y]); cur = [c[5], c[6]]; }
        else if (t === 'Q') {
          const c1: Pt = [cur[0] + (2 / 3) * (c[1] - cur[0]), cur[1] + (2 / 3) * (c[2] - cur[1])];
          const c2: Pt = [c[3] + (2 / 3) * (c[1] - c[3]), c[4] + (2 / 3) * (c[2] - c[4])];
          cmds.push(['C', c1[0] - o.x, c1[1] - o.y, c2[0] - o.x, c2[1] - o.y, c[3] - o.x, c[4] - o.y]);
          cur = [c[3], c[4]];
        } else if (t === 'Z' || t === 'z') { cmds.push(['Z']); cur = start; }
        else return null; // anything unexpected
      }
      return { cmds, closed: cmds.some((c) => c[0] === 'Z') };
    }
  }
  return null;
}

function emit(pdf: any, cmds: Cmd[], m: number[], ctx: VectorCtx) {
  const P = (x: number, y: number) => { const [ax, ay] = apply(m, x, y); return [toPt(ax - ctx.offsetX), toPt(ay - ctx.offsetY)]; };
  for (const c of cmds) {
    if (c[0] === 'M') { const [x, y] = P(c[1], c[2]); pdf.moveTo(x, y); }
    else if (c[0] === 'L') { const [x, y] = P(c[1], c[2]); pdf.lineTo(x, y); }
    else if (c[0] === 'C') { const [x1, y1] = P(c[1], c[2]); const [x2, y2] = P(c[3], c[4]); const [x3, y3] = P(c[5], c[6]); pdf.curveTo(x1, y1, x2, y2, x3, y3); }
    else pdf.close();
  }
}

// ---------------------------------------------------------------- gradients

let patternSeq = 0;
// Adds the gradient as a PDF shading and returns what pdf.fill() needs.
// Returns null when a stop has its own transparency that differs from the
// others (PDF shadings can't fade to see-through without a soft mask).
function shadingFor(pdf: any, F: any, obj: any, grad: any, ctx: VectorCtx): { data: any; alpha: number } | null {
  const stops = [...grad.colorStops].sort((a: any, b: any) => a.offset - b.offset).map((s: any) => {
    const c = parseColor(F, s.color);
    const a = (c?.a ?? 1) * (s.opacity ?? 1);
    return { offset: Math.max(0, Math.min(1, s.offset)), color: [c?.r ?? 0, c?.g ?? 0, c?.b ?? 0] as number[], a };
  });
  if (!stops.length) return null;
  const alpha = stops[0].a;
  if (stops.some((s) => Math.abs(s.a - alpha) > 0.01)) return null;
  const w = obj.width || 0, h = obj.height || 0;
  // gradient space -> object local -> canvas -> page points (PDF y-up)
  let g = [1, 0, 0, 1, -w / 2 + (grad.offsetX || 0), -h / 2 + (grad.offsetY || 0)];
  if (grad.gradientUnits === 'percentage') g = mul(g, [w, 0, 0, h, 0, 0]);
  if (grad.gradientTransform) g = mul(g, grad.gradientTransform);
  const m = mul(obj.calcTransformMatrix(), g);
  const s = toPt(1);
  const toPage = [m[0] * s, -m[1] * s, m[2] * s, -m[3] * s, (m[4] - ctx.offsetX) * s, ctx.pageHeightPt - (m[5] - ctx.offsetY) * s];
  const c = grad.coords || {};
  const coords = grad.type === 'linear'
    ? [c.x1 || 0, c.y1 || 0, c.x2 || 0, c.y2 || 0]
    : [c.x1 || 0, c.y1 || 0, c.r1 || 0, c.x2 ?? c.x1 ?? 0, c.y2 ?? c.y1 ?? 0, c.r2 || 0];
  const key = `mtsh${++patternSeq}`;
  pdf.advancedAPI((doc: any) => {
    const pattern = new doc.ShadingPattern(grad.type === 'linear' ? 'axial' : 'radial', coords, stops.map((st) => ({ offset: st.offset, color: st.color })));
    doc.addShadingPattern(key, pattern);
  });
  return { data: { key, matrix: new pdf.Matrix(toPage[0], toPage[1], toPage[2], toPage[3], toPage[4], toPage[5]) }, alpha };
}

// ---------------------------------------------------------------- paint

function withAlpha(pdf: any, fillA: number, strokeA: number, draw: () => void) {
  if (fillA >= 0.999 && strokeA >= 0.999) { draw(); return; }
  pdf.saveGraphicsState();
  try {
    pdf.setGState(new pdf.GState({ opacity: Math.max(0, Math.min(1, fillA)), 'stroke-opacity': Math.max(0, Math.min(1, strokeA)) }));
    draw();
  } finally {
    pdf.restoreGraphicsState();
  }
}

function strokeSetup(pdf: any, obj: any, scaleForWidth: number) {
  const w = toPt((obj.strokeWidth || 1) * (obj.strokeUniform ? 1 : scaleForWidth));
  pdf.setLineWidth(Math.max(w, 0.01));
  const cap = obj.strokeLineCap === 'round' ? 1 : obj.strokeLineCap === 'square' ? 2 : 0;
  const join = obj.strokeLineJoin === 'round' ? 1 : obj.strokeLineJoin === 'bevel' ? 2 : 0;
  try { pdf.setLineCap(cap); pdf.setLineJoin(join); } catch { /* older jsPDF */ }
  if (obj.strokeDashArray && obj.strokeDashArray.length) {
    const k = obj.strokeUniform ? 1 : scaleForWidth;
    pdf.setLineDashPattern(obj.strokeDashArray.map((d: number) => toPt(d * k)), 0);
  } else pdf.setLineDashPattern([], 0);
}

const avgScale = (obj: any) => {
  const m = obj.calcTransformMatrix();
  return (Math.hypot(m[0], m[1]) + Math.hypot(m[2], m[3])) / 2;
};

function drawShape(pdf: any, F: any, obj: any, ctx: VectorCtx): boolean {
  const out = localCommands(obj);
  if (!out) return false;
  const m = obj.calcTransformMatrix();
  if (obj.stroke && typeof obj.stroke === 'object') return false; // gradient strokes: picture
  const fillGrad = isGradient(obj.fill) ? shadingFor(pdf, F, obj, obj.fill, ctx) : null;
  if (isGradient(obj.fill) && !fillGrad) return false;
  const fill = fillGrad ? null : parseColor(F, obj.fill);
  const stroke = (obj.strokeWidth || 0) > 0 ? parseColor(F, obj.stroke) : null;
  const evenOdd = obj.fillRule === 'evenodd';
  const fillA = (fillGrad ? fillGrad.alpha : fill?.a ?? 1) * ctx.opacity * (obj.opacity ?? 1);
  const strokeA = (stroke?.a ?? 1) * ctx.opacity * (obj.opacity ?? 1);
  const doFill = () => {
    if (fillGrad) { emit(pdf, out.cmds, m, ctx); evenOdd ? pdf.fillEvenOdd(fillGrad.data) : pdf.fill(fillGrad.data); }
    else if (fill && out.closed !== false) { pdf.setFillColor(fill.r, fill.g, fill.b); emit(pdf, out.cmds, m, ctx); evenOdd ? pdf.fillEvenOdd() : pdf.fill(); }
    else if (fill) { pdf.setFillColor(fill.r, fill.g, fill.b); emit(pdf, out.cmds, m, ctx); pdf.fill(); }
  };
  const doStroke = () => {
    if (!stroke) return;
    pdf.setDrawColor(stroke.r, stroke.g, stroke.b);
    strokeSetup(pdf, obj, avgScale(obj));
    emit(pdf, out.cmds, m, ctx);
    pdf.stroke();
    pdf.setLineDashPattern([], 0);
  };
  withAlpha(pdf, fillA, strokeA, () => {
    if (obj.paintFirst === 'stroke') { doStroke(); doFill(); } else { doFill(); doStroke(); }
  });
  return true;
}

function drawLine(pdf: any, F: any, obj: any, ctx: VectorCtx): boolean {
  const stroke = parseColor(F, obj.stroke);
  if (!stroke || !((obj.strokeWidth || 0) > 0)) return true;
  const m = obj.calcTransformMatrix();
  const cx = ((obj.x1 ?? 0) + (obj.x2 ?? 0)) / 2, cy = ((obj.y1 ?? 0) + (obj.y2 ?? 0)) / 2;
  const cmds: Cmd[] = [['M', (obj.x1 ?? 0) - cx, (obj.y1 ?? 0) - cy], ['L', (obj.x2 ?? 0) - cx, (obj.y2 ?? 0) - cy]];
  withAlpha(pdf, 1, stroke.a * ctx.opacity * (obj.opacity ?? 1), () => {
    pdf.setDrawColor(stroke.r, stroke.g, stroke.b);
    strokeSetup(pdf, obj, avgScale(obj));
    emit(pdf, cmds, m, ctx);
    pdf.stroke();
    pdf.setLineDashPattern([], 0);
  });
  return true;
}

// ---------------------------------------------------------------- text
// Positions come from Fabric's own layout (__charBounds, line offsets),
// so alignment, justify and letter spacing match the screen exactly.

function styleOf(obj: any, line: number, ch: number) {
  const s = typeof obj.getCompleteStyleDeclaration === 'function' ? obj.getCompleteStyleDeclaration(line, ch) : {};
  return {
    fill: s.fill ?? obj.fill,
    stroke: s.stroke ?? obj.stroke,
    strokeWidth: s.strokeWidth ?? obj.strokeWidth,
    fontFamily: s.fontFamily ?? obj.fontFamily,
    fontSize: s.fontSize ?? obj.fontSize,
    fontWeight: s.fontWeight ?? obj.fontWeight,
    fontStyle: s.fontStyle ?? obj.fontStyle,
    deltaY: s.deltaY ?? 0,
    underline: s.underline ?? obj.underline,
    linethrough: s.linethrough ?? obj.linethrough,
    textBackgroundColor: s.textBackgroundColor ?? obj.textBackgroundColor,
  };
}
const sameStyle = (a: any, b: any) => a.fill === b.fill && a.stroke === b.stroke && a.fontFamily === b.fontFamily && a.fontSize === b.fontSize && a.fontWeight === b.fontWeight && a.fontStyle === b.fontStyle && a.deltaY === b.deltaY && a.underline === b.underline && a.linethrough === b.linethrough && a.textBackgroundColor === b.textBackgroundColor;
const isBold = (w: any) => w === 'bold' || (typeof w === 'number' && w >= 600) || (typeof w === 'string' && Number(w) >= 600);

async function drawText(pdf: any, F: any, obj: any, ctx: VectorCtx): Promise<boolean> {
  const lines: string[][] = obj._textLines;
  const bounds: any[][] = obj.__charBounds;
  if (!Array.isArray(lines) || !Array.isArray(bounds) || obj.path) return false;
  if (typeof obj.text === 'string' && EMOJI.test(obj.text)) return false;
  if (obj.direction === 'rtl') return false;
  if (typeof obj.text === 'string' && COMPLEX_SCRIPT.test(obj.text)) return false;
  const m = obj.calcTransformMatrix();
  const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
  if (Math.abs(sx - sy) / Math.max(sx, sy) > 0.02) return false; // stretched text: picture
  const angle = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  if (m[0] * m[3] - m[1] * m[2] < 0) return false; // flipped text
  const fsMult = obj._fontSizeMult || 1.13, fsFrac = obj._fontSizeFraction ?? 0.222;
  const left0 = typeof obj._getLeftOffset === 'function' ? obj._getLeftOffset() : -obj.width / 2;
  let lineTop = typeof obj._getTopOffset === 'function' ? obj._getTopOffset() : -obj.height / 2;
  const charSpacePx = ((obj.charSpacing || 0) / 1000) * (obj.fontSize || 16);
  const baseAlpha = ctx.opacity * (obj.opacity ?? 1);

  // Gradient-filled text: draw the letters as a clipping path, then paint
  // the gradient through them — still vector.
  const gradFill = isGradient(obj.fill) ? shadingFor(pdf, F, obj, obj.fill, ctx) : null;
  if (isGradient(obj.fill) && !gradFill) return false;
  if (gradFill && obj.styles && Object.keys(obj.styles).length) return false;
  if (obj.stroke && typeof obj.stroke === 'object') return false;

  type Run = { text: string; x: number; y: number; st: ReturnType<typeof styleOf>; width: number };
  const runs: Run[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heightOfLine = typeof obj.getHeightOfLine === 'function' ? obj.getHeightOfLine(i) : obj.fontSize * fsMult * obj.lineHeight;
    const maxHeight = heightOfLine / (obj.lineHeight || 1);
    const lineLeft = typeof obj._getLineLeftOffset === 'function' ? obj._getLineLeftOffset(i) : 0;
    // Fabric draws each line at its top + maxHeight, raised by the font-size fraction.
    const baseline = lineTop + maxHeight - maxHeight * fsFrac;
    let cur: Run | null = null;
    for (let j = 0; j < line.length; j++) {
      const st = styleOf(obj, i, j);
      const b = bounds[i]?.[j];
      if (!b) continue;
      const x = left0 + lineLeft + b.left;
      if (cur && sameStyle(cur.st, st) && line[j] !== ' ' && cur.text[cur.text.length - 1] !== ' ') {
        cur.text += line[j];
        cur.width = x + b.kernedWidth - cur.x;
      } else {
        if (cur) runs.push(cur);
        cur = { text: line[j], x, y: baseline + (st.deltaY || 0), st, width: b.kernedWidth ?? b.width };
      }
    }
    if (cur) runs.push(cur);
    lineTop += heightOfLine;
  }

  const P = (x: number, y: number) => { const [ax, ay] = apply(m, x, y); return [toPt(ax - ctx.offsetX), toPt(ay - ctx.offsetY)]; };
  const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight();

  const setFontFor = async (st: Run['st']) => {
    const bold = isBold(st.fontWeight);
    const italic = st.fontStyle === 'italic';
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    const reg = await ensurePdfFont(pdf, ctx.fontCache, st.fontFamily, bold);
    if (reg) pdf.setFont(reg.name, style);
    else {
      const f = String(st.fontFamily || '').toLowerCase();
      pdf.setFont(f.includes('times') || f.includes('georgia') || f.includes('serif') && !f.includes('sans') ? 'times' : f.includes('mono') || f.includes('courier') ? 'courier' : 'helvetica', style);
    }
    pdf.setFontSize(Math.max(0.5, toPt((st.fontSize || 16) * sx)));
  };

  {
    for (const r of runs) {
      if (!r.text.trim()) continue;
      await setFontFor(r.st);
      const [x, y] = P(r.x, r.y);
      // Highlight behind the letters
      const bgC = parseColor(F, r.st.textBackgroundColor);
      if (bgC && !gradFill) {
        const h = (r.st.fontSize || 16) * fsMult;
        withAlpha(pdf, bgC.a * baseAlpha, 1, () => {
          pdf.setFillColor(bgC.r, bgC.g, bgC.b);
          emit(pdf, [['M', r.x, r.y - h * 0.78], ['L', r.x + r.width, r.y - h * 0.78], ['L', r.x + r.width, r.y + h * 0.22], ['L', r.x, r.y + h * 0.22], ['Z']], m, { ...ctx, offsetX: ctx.offsetX, offsetY: ctx.offsetY });
          pdf.fill();
        });
      }
      const fill = gradFill ? null : parseColor(F, r.st.fill);
      const stroke = (r.st.strokeWidth || 0) > 0 ? parseColor(F, r.st.stroke) : null;
      const opts: any = { angle: -angle, baseline: 'alphabetic', charSpace: toPt(charSpacePx * sx) };
      if (gradFill) {
        // Each word becomes a clipping area (clips from separate text
        // objects would intersect), then the gradient is painted through it.
        pdf.saveGraphicsState();
        try {
          pdf.text(r.text, x, y, { ...opts, renderingMode: 'addToPathForClipping' });
          withAlpha(pdf, gradFill.alpha * baseAlpha, 1, () => {
            pdf.moveTo(0, 0); pdf.lineTo(pageW, 0); pdf.lineTo(pageW, pageH); pdf.lineTo(0, pageH); pdf.close();
            pdf.fill(gradFill.data);
          });
        } finally {
          pdf.restoreGraphicsState();
        }
        continue;
      }
      if (!fill && !stroke) continue;
      if (fill) pdf.setTextColor(fill.r, fill.g, fill.b);
      if (stroke) { pdf.setDrawColor(stroke.r, stroke.g, stroke.b); pdf.setLineWidth(toPt((r.st.strokeWidth || 1) * sx)); try { pdf.setLineJoin(1); } catch { /* */ } }
      const mode = fill && stroke ? 'fillThenStroke' : stroke ? 'stroke' : 'fill';
      withAlpha(pdf, (fill?.a ?? 1) * baseAlpha, (stroke?.a ?? 1) * baseAlpha, () => {
        if (fill && stroke && obj.paintFirst === 'stroke') {
          // stroke underneath, then the fill on top (like Fabric)
          pdf.text(r.text, x, y, { ...opts, renderingMode: 'stroke' });
          pdf.text(r.text, x, y, { ...opts, renderingMode: 'fill' });
        } else pdf.text(r.text, x, y, { ...opts, renderingMode: mode });
      });
      // Underline / strike-through as thin bars
      if ((r.st.underline || r.st.linethrough) && fill) {
        const fs = r.st.fontSize || 16;
        const thick = fs / 15;
        const bars = [r.st.underline ? fs * 0.12 : null, r.st.linethrough ? -fs * 0.28 : null].filter((v) => v !== null) as number[];
        withAlpha(pdf, fill.a * baseAlpha, 1, () => {
          pdf.setFillColor(fill.r, fill.g, fill.b);
          bars.forEach((dy) => { emit(pdf, [['M', r.x, r.y + dy], ['L', r.x + r.width, r.y + dy], ['L', r.x + r.width, r.y + dy + thick], ['L', r.x, r.y + dy + thick], ['Z']], m, ctx); pdf.fill(); });
        });
      }
    }
  }
  return true;
}

// ---------------------------------------------------------------- shadows
// Only the soft shadow is a picture; the object itself is drawn as vector on top.

function drawShadowPicture(pdf: any, F: any, obj: any, ctx: VectorCtx) {
  const sh = obj.shadow;
  if (!sh) return;
  // Draw a copy of the object filled with the shadow colour, offset and blurred.
  const rect = obj.getBoundingRect(true, true);
  const blur = (sh.blur || 0) * (sh.nonScaling ? 1 : avgScale(obj));
  const ox = (sh.offsetX || 0) * (sh.nonScaling ? 1 : avgScale(obj));
  const oy = (sh.offsetY || 0) * (sh.nonScaling ? 1 : avgScale(obj));
  const pad = blur * 2 + 4;
  const k = 3; // 288 dpi
  const W = Math.ceil((rect.width + pad * 2 + Math.abs(ox)) * k), H = Math.ceil((rect.height + pad * 2 + Math.abs(oy)) * k);
  if (W * H > 40_000_000 || W < 1 || H < 1) return;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const x0 = rect.left - pad + Math.min(0, ox), y0 = rect.top - pad + Math.min(0, oy);
  g.scale(k, k);
  g.translate(-x0, -y0);
  g.shadowColor = sh.color || 'rgba(0,0,0,0.3)';
  g.shadowBlur = blur * k; // shadowBlur ignores the scale transform
  // Render the object far away and cast only its shadow into view.
  const far = 100000;
  g.shadowOffsetX = (ox + far) * k;
  g.shadowOffsetY = oy * k;
  g.translate(-far, 0);
  const saved = obj.shadow;
  obj.shadow = null;
  try {
    const m = obj.calcTransformMatrix();
    g.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    obj._render(g);
  } finally {
    obj.shadow = saved;
  }
  pdf.addImage(c.toDataURL('image/png'), 'PNG', toPt(x0 - ctx.offsetX), toPt(y0 - ctx.offsetY), toPt(W / k), toPt(H / k), undefined, 'FAST');
}

// ---------------------------------------------------------------- entry

export async function renderVector(pdf: any, F: any, obj: any, ctx: VectorCtx): Promise<boolean> {
  if (obj.clipPath) return false;
  if (obj.globalCompositeOperation && obj.globalCompositeOperation !== 'source-over') return false;
  if (obj.type === 'group') {
    if (!obj._objects) return false;
    const inner = { ...ctx, opacity: ctx.opacity * (obj.opacity ?? 1) };
    for (const child of obj._objects) {
      if (child.visible === false) continue;
      const ok = await renderVector(pdf, F, child, inner);
      if (!ok) return false; // caller pictures the whole group instead
    }
    return true;
  }
  const hasShadow = !!obj.shadow && ((obj.shadow.blur || 0) > 0 || obj.shadow.offsetX || obj.shadow.offsetY);
  // A see-through object over its own shadow picture would show the
  // object twice — leave those as pictures.
  if (hasShadow && ((obj.opacity ?? 1) < 1 || ctx.opacity < 1)) return false;
  let handled = false;
  const draw = async () => {
    if (isText(obj)) handled = await drawText(pdf, F, obj, ctx);
    else if (obj.type === 'line') handled = drawLine(pdf, F, obj, ctx);
    else if (['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'polyline', 'path'].includes(obj.type)) handled = drawShape(pdf, F, obj, ctx);
  };
  if (hasShadow) {
    // Decide first whether the object itself can be vector; only then add its shadow.
    const probe = isText(obj) ? Array.isArray(obj._textLines) && !(typeof obj.text === 'string' && EMOJI.test(obj.text)) : ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'polyline', 'path', 'line'].includes(obj.type);
    if (!probe) return false;
    try { drawShadowPicture(pdf, F, obj, ctx); } catch { return false; }
  }
  await draw();
  return handled;
}
