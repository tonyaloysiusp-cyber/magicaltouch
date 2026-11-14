// ---------------------------------------------------------------------
// lib/editor/pdfVectorImport.ts
// Imports a page of ANY PDF (Illustrator, CorelDRAW, InDesign, Canva…) into
// the editor as separate, editable layers: vector paths with their fill and
// stroke, text as editable text (in the closest available font), pictures
// as image layers, gradients as gradients, and clipping masks as masks.
//
// It reads pdf.js's drawing operators directly — nothing is rasterised. What
// cannot be reproduced exactly is reported back so the editor can warn
// (fonts substituted, mesh gradients, tiling patterns, soft masks…). The
// caller decides; nothing is flattened automatically.
// ---------------------------------------------------------------------

import { getPdfjs } from './pdfImport';

export interface VectorImportResult { objects: any[]; width: number; height: number; warnings: string[]; counts: { paths: number; texts: number; images: number; clipped: number } }

type Mat = [number, number, number, number, number, number];
interface GState { ctm: Mat; fill: any; stroke: string; lw: number; dash: number[]; cap: string; join: string; fa: number; sa: number; clip: string | null }

const mulM = (m1: Mat, m2: Mat): Mat => [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1], m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3], m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
const ap = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const r2 = (n: number) => Math.round(n * 100) / 100;
const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
function colorOf(args: any[]): string {
  if (typeof args[0] === 'string') return args[0];
  if (args.length >= 3 && args.every((v) => typeof v === 'number')) { const k = args.some((v) => v > 1) ? 1 : 255; return `#${hex2(args[0] * k)}${hex2(args[1] * k)}${hex2(args[2] * k)}`; }
  return '#000000';
}
// Common PDF font names → web fonts the editor has.
function fontFamilyFor(name: string, family?: string): { family: string; weight: string; style: string; exact: boolean } {
  const n = (name || '').replace(/^[A-Z]{6}\+/, '');
  const low = n.toLowerCase();
  const weight = /black|heavy/.test(low) ? '900' : /extrabold|ultrabold/.test(low) ? '800' : /semibold|demibold/.test(low) ? '600' : /bold/.test(low) ? '700' : /light/.test(low) ? '300' : '400';
  const style = /italic|oblique/.test(low) ? 'italic' : 'normal';
  const base = n.split(/[-,]/)[0].replace(/(MT|PS|Std|Pro|LT)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  const map: Record<string, string> = { arial: 'Arial', helvetica: 'Helvetica', 'helvetica neue': 'Helvetica', times: 'Times New Roman', 'times new roman': 'Times New Roman', courier: 'Courier New', 'courier new': 'Courier New', georgia: 'Georgia', verdana: 'Verdana', 'trebuchet ms': 'Trebuchet MS' };
  const key = base.toLowerCase();
  if (map[key]) return { family: map[key], weight, style, exact: true };
  if (base && /^[A-Za-z][A-Za-z0-9 ]+$/.test(base)) return { family: base, weight, style, exact: false };
  const f = family === 'serif' ? 'Georgia' : family === 'monospace' ? 'Courier New' : 'Arial';
  return { family: f, weight, style, exact: false };
}

/** Builds Fabric objects for one page (1-based). `fit` places the page inside that box (canvas pixels), centred; otherwise 96 px per inch at the origin. */
export async function importPdfPageAsVectors(F: any, bytes: Uint8Array, pageNum: number, opts: { fit?: { x: number; y: number; w: number; h: number }; scale?: number } = {}): Promise<VectorImportResult> {
  const pdfjs = await getPdfjs();
  const OPS = pdfjs.OPS;
  const doc = await pdfjs.getDocument({ data: bytes.slice(), fontExtraProperties: true }).promise;
  const warn = new Set<string>();
  const objects: any[] = [];
  const counts = { paths: 0, texts: 0, images: 0, clipped: 0 };
  try {
    const page = await doc.getPage(pageNum);
    const vp1 = page.getViewport({ scale: 1 });
    const fit = opts.fit;
    const scale = fit ? Math.min(fit.w / vp1.width, fit.h / vp1.height) : opts.scale ?? 96 / 72;
    const vp = page.getViewport({ scale });
    const ox = fit ? fit.x + (fit.w - vp.width) / 2 : 0, oy = fit ? fit.y + (fit.h - vp.height) / 2 : 0;
    const base: Mat = mulM([1, 0, 0, 1, ox, oy], vp.transform as Mat);
    const ops = await page.getOperatorList();
    const text = await page.getTextContent();
    let st: GState = { ctm: base, fill: '#000000', stroke: '#000000', lw: 1, dash: [], cap: 'butt', join: 'miter', fa: 1, sa: 1, clip: null };
    const stack: GState[] = [];
    let path = '';
    let pendingClip: 'nonzero' | 'evenodd' | null = null;
    const textColors: string[] = [];

    const clipObj = (d: string | null) => (d ? new F.Path(d, { absolutePositioned: true, fill: '#000', stroke: null, objectCaching: false }) : undefined);
    const fillValue = (fill: any, bbox: { x: number; y: number; w: number; h: number }) => {
      if (typeof fill === 'string') return fill;
      if (fill && fill.kind === 'grad') {
        const g = fill.ir; // ['RadialAxial', type, bbox, colorStops, p0, p1, r0, r1]
        const stops = (g[3] || []).map(([o, c]: [number, string]) => ({ offset: o, color: c }));
        const m = fill.ctm as Mat;
        const p0 = ap(m, g[4][0], g[4][1]), p1 = ap(m, g[5][0], g[5][1]);
        const k = Math.hypot(m[0], m[1]);
        return new F.Gradient({ type: g[1] === 'radial' ? 'radial' : 'linear', gradientUnits: 'pixels', coords: g[1] === 'radial' ? { x1: p0[0] - bbox.x, y1: p0[1] - bbox.y, r1: (g[6] || 0) * k, x2: p1[0] - bbox.x, y2: p1[1] - bbox.y, r2: (g[7] || 0) * k } : { x1: p0[0] - bbox.x, y1: p0[1] - bbox.y, x2: p1[0] - bbox.x, y2: p1[1] - bbox.y }, colorStops: stops });
      }
      return fill?.fallback || '#888888';
    };
    const emitPath = (fillRule: 'nonzero' | 'evenodd' | null, stroke: boolean) => {
      if (!path) return;
      const o = new F.Path(path, { fill: null, stroke: null, strokeWidth: 0, objectCaching: false });
      const bbox = { x: o.left, y: o.top, w: o.width, h: o.height };
      const k = Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2]));
      o.set({
        fill: fillRule ? fillValue(st.fill, bbox) : null,
        fillRule: fillRule === 'evenodd' ? 'evenodd' : 'nonzero',
        stroke: stroke ? st.stroke : null,
        strokeWidth: stroke ? Math.max(0.1, st.lw * k) : 0,
        strokeDashArray: stroke && st.dash.length ? st.dash.map((v) => v * k) : null,
        strokeLineCap: st.cap, strokeLineJoin: st.join,
        opacity: fillRule ? st.fa : st.sa,
        strokeUniform: false,
      });
      if (st.clip) { o.clipPath = clipObj(st.clip); counts.clipped++; }
      o.name = 'PDF shape';
      objects.push(o); counts.paths++;
    };
    const endPath = () => { if (pendingClip && path) { st = { ...st, clip: path }; if (stack.some((s) => s.clip)) warn.add('Nested clipping masks are kept as the innermost mask only.'); } pendingClip = null; path = ''; };

    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], a = ops.argsArray[i];
      switch (fn) {
        case OPS.save: stack.push(st); st = { ...st }; break;
        case OPS.restore: st = stack.pop() || st; break;
        case OPS.transform: st = { ...st, ctm: mulM(st.ctm, a as Mat) }; break;
        case OPS.paintFormXObjectBegin: stack.push(st); st = { ...st }; if (Array.isArray(a[0]) && a[0].length === 6) st.ctm = mulM(st.ctm, a[0] as Mat); break;
        case OPS.paintFormXObjectEnd: st = stack.pop() || st; break;
        case OPS.setLineWidth: st.lw = a[0]; break;
        case OPS.setLineCap: st.cap = ['butt', 'round', 'square'][a[0]] || 'butt'; break;
        case OPS.setLineJoin: st.join = ['miter', 'round', 'bevel'][a[0]] || 'miter'; break;
        case OPS.setDash: st.dash = Array.isArray(a[0]) ? a[0] : []; break;
        case OPS.setGState: for (const [k, v] of (a[0] || [])) { if (k === 'ca') st.fa = v; else if (k === 'CA') st.sa = v; else if (k === 'LW') st.lw = v; else if (k === 'SMask' && v) warn.add('Soft masks (transparency masks) are not kept — check see-through areas.'); else if (k === 'BM' && v && v !== 'source-over' && v !== 'Normal') warn.add('Blend modes are shown as normal.'); } break;
        case OPS.setFillRGBColor: st.fill = colorOf(a); break;
        case OPS.setStrokeRGBColor: st.stroke = colorOf(a); break;
        case OPS.setFillGray: { const g = Math.round((a[0] ?? 0) * 255); st.fill = `#${hex2(g)}${hex2(g)}${hex2(g)}`; break; }
        case OPS.setStrokeGray: { const g = Math.round((a[0] ?? 0) * 255); st.stroke = `#${hex2(g)}${hex2(g)}${hex2(g)}`; break; }
        case OPS.setFillCMYKColor: { const [c, m, y, k] = a; st.fill = `#${hex2(255 * (1 - c) * (1 - k))}${hex2(255 * (1 - m) * (1 - k))}${hex2(255 * (1 - y) * (1 - k))}`; break; }
        case OPS.setStrokeCMYKColor: { const [c, m, y, k] = a; st.stroke = `#${hex2(255 * (1 - c) * (1 - k))}${hex2(255 * (1 - m) * (1 - k))}${hex2(255 * (1 - y) * (1 - k))}`; break; }
        case OPS.setFillColorN: {
          const ir = a[0];
          if (Array.isArray(ir) && ir[0] === 'RadialAxial') st.fill = { kind: 'grad', ir, ctm: st.ctm, fallback: ir[3]?.[0]?.[1] || '#888888' };
          else if (Array.isArray(ir) && ir[0] === 'TilingPattern') { st.fill = '#999999'; warn.add('Tiling pattern fills are shown as a flat grey.'); }
          else if (Array.isArray(ir) && ir[0] === 'Mesh') { st.fill = '#999999'; warn.add('Mesh gradients are shown as a flat colour.'); }
          else st.fill = colorOf(a);
          break;
        }
        case OPS.setStrokeColorN: st.stroke = typeof a[0] === 'string' || typeof a[0] === 'number' ? colorOf(a) : '#000000'; break;
        case OPS.constructPath: {
          const [pops, pargs] = a as [number[], number[]];
          let j = 0;
          for (const op of pops) {
            if (op === OPS.moveTo) { const [x, y] = ap(st.ctm, pargs[j], pargs[j + 1]); path += `M${r2(x)} ${r2(y)}`; j += 2; }
            else if (op === OPS.lineTo) { const [x, y] = ap(st.ctm, pargs[j], pargs[j + 1]); path += `L${r2(x)} ${r2(y)}`; j += 2; }
            else if (op === OPS.curveTo) { const p = [0, 2, 4].map((o) => ap(st.ctm, pargs[j + o], pargs[j + o + 1])); path += `C${p.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' ')}`; j += 6; }
            else if (op === OPS.curveTo2) {
              // First control point = current point (v operator).
              const cur = (path.match(/(-?[\d.]+) (-?[\d.]+)$/) || [0, '0', '0']).slice(1).map(Number);
              const p = [0, 2].map((o) => ap(st.ctm, pargs[j + o], pargs[j + o + 1]));
              path += `C${r2(cur[0])} ${r2(cur[1])} ${p.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' ')}`; j += 4;
            } else if (op === OPS.curveTo3) { const p = [0, 2].map((o) => ap(st.ctm, pargs[j + o], pargs[j + o + 1])); path += `C${r2(p[0][0])} ${r2(p[0][1])} ${r2(p[1][0])} ${r2(p[1][1])} ${r2(p[1][0])} ${r2(p[1][1])}`; j += 4; }
            else if (op === OPS.closePath) path += 'Z';
            else if (op === OPS.rectangle) {
              const [x, y, w, h] = [pargs[j], pargs[j + 1], pargs[j + 2], pargs[j + 3]];
              const q = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => ap(st.ctm, px, py));
              path += `M${q.map(([px, py]) => `${r2(px)} ${r2(py)}`).join('L')}Z`; j += 4;
            }
          }
          break;
        }
        case OPS.clip: pendingClip = 'nonzero'; break;
        case OPS.eoClip: pendingClip = 'evenodd'; break;
        case OPS.fill: emitPath('nonzero', false); endPath(); break;
        case OPS.eoFill: emitPath('evenodd', false); endPath(); break;
        case OPS.stroke: emitPath(null, true); endPath(); break;
        case OPS.closeStroke: path += 'Z'; emitPath(null, true); endPath(); break;
        case OPS.fillStroke: emitPath('nonzero', true); endPath(); break;
        case OPS.eoFillStroke: emitPath('evenodd', true); endPath(); break;
        case OPS.closeFillStroke: path += 'Z'; emitPath('nonzero', true); endPath(); break;
        case OPS.closeEOFillStroke: path += 'Z'; emitPath('evenodd', true); endPath(); break;
        case OPS.endPath: endPath(); break;
        case OPS.shadingFill: {
          // Fills the current clip with a gradient.
          const ir = a[0];
          const area = st.clip || (() => { const w = vp.width, h = vp.height; return `M${ox} ${oy}L${ox + w} ${oy}L${ox + w} ${oy + h}L${ox} ${oy + h}Z`; })();
          const o = new F.Path(area, { stroke: null, objectCaching: false, opacity: st.fa });
          const bbox = { x: o.left, y: o.top, w: o.width, h: o.height };
          if (Array.isArray(ir) && ir[0] === 'RadialAxial') o.set({ fill: fillValue({ kind: 'grad', ir, ctm: st.ctm }, bbox) });
          else { o.set({ fill: '#999999' }); warn.add('Mesh / function gradients are shown as a flat colour.'); }
          o.name = 'PDF gradient';
          objects.push(o); counts.paths++;
          break;
        }
        case OPS.showText: case OPS.showSpacedText: case OPS.nextLineShowText: case OPS.nextLineSetSpacingShowText:
          textColors.push(typeof st.fill === 'string' ? st.fill : st.fill?.fallback || '#000000'); break;
        case OPS.paintImageXObject: case OPS.paintInlineImageXObject: case OPS.paintImageXObjectRepeat: {
          let img: any = null;
          try {
            if (fn === OPS.paintInlineImageXObject) img = a[0];
            else { const id = a[0]; img = id.startsWith('g_') ? page.commonObjs.get(id) : page.objs.get(id); }
          } catch { img = null; }
          if (!img) { warn.add('Some pictures could not be read.'); break; }
          const w = img.width, h = img.height;
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d')!;
          if (img.bitmap) g.drawImage(img.bitmap, 0, 0);
          else if (img.data) {
            const id = g.createImageData(w, h); const src = img.data; const dst = id.data;
            if (img.kind === 3 || src.length === w * h * 4) dst.set(src.subarray ? src.subarray(0, dst.length) : src);
            else if (img.kind === 2 || src.length === w * h * 3) { for (let p = 0, q = 0; q < dst.length; p += 3, q += 4) { dst[q] = src[p]; dst[q + 1] = src[p + 1]; dst[q + 2] = src[p + 2]; dst[q + 3] = 255; } }
            else if (img.kind === 1) { const rowBytes = (w + 7) >> 3; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const bit = (src[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1; const v = bit ? 255 : 0; const q = (y * w + x) * 4; dst[q] = dst[q + 1] = dst[q + 2] = v; dst[q + 3] = 255; } }
            g.putImageData(id, 0, 0);
          } else { warn.add('Some pictures could not be read.'); break; }
          // Image space: unit square, origin bottom-left → pixels with origin top-left.
          const M = mulM(st.ctm, [1 / w, 0, 0, -1 / h, 0, 1]);
          const o = new F.Image(c, { objectCaching: false, opacity: st.fa });
          F.util.applyTransformToObject(o, mulM(M, [1, 0, 0, 1, w / 2, h / 2]));
          if (st.clip) { o.clipPath = clipObj(st.clip); counts.clipped++; }
          o.name = 'PDF picture';
          objects.push(o); counts.images++;
          break;
        }
        case OPS.paintImageMaskXObject: case OPS.paintSolidColorImageMask: warn.add('Image masks (stencils) are left out.'); break;
        default: break;
      }
    }

    // Text as editable text, positioned on its baseline.
    const items = (text.items as any[]).filter((t) => t.str && t.str.trim());
    const subst = new Set<string>();
    items.forEach((t, idx) => {
      const style = (text.styles as any)[t.fontName] || {};
      const tm = mulM(base, t.transform as Mat);
      const size = Math.hypot(tm[2], tm[3]);
      if (size < 0.5) return;
      const angle = (Math.atan2(tm[1], tm[0]) * 180) / Math.PI;
      let realName = t.fontName;
      try { if (page.commonObjs.has(t.fontName)) realName = page.commonObjs.get(t.fontName)?.name || t.fontName; } catch { /* not loaded */ }
      const fam = fontFamilyFor(realName, style.fontFamily);
      if (!fam.exact) subst.add(fam.family);
      const color = textColors.length === items.length ? textColors[idx] : textColors[0] || '#000000';
      const asc = typeof style.ascent === 'number' && style.ascent > 0 ? style.ascent : 0.8;
      const o = new F.IText(t.str, { fontFamily: fam.family, fontWeight: fam.weight, fontStyle: fam.style, fontSize: size, fill: color, originX: 'left', originY: 'top', objectCaching: false });
      const rad = (angle * Math.PI) / 180;
      // Baseline point → top-left of the text box, along the text's own rotation.
      o.set({ left: tm[4] + Math.sin(rad) * size * asc, top: tm[5] - Math.cos(rad) * size * asc, angle });
      const targetW = (t.width || 0) * scale;
      if (targetW > 0 && o.width > 0) { const k = targetW / o.width; if (k > 0.5 && k < 2) o.set({ scaleX: k }); }
      o.name = 'PDF text';
      objects.push(o); counts.texts++;
    });
    if (subst.size) warn.add(`Fonts not available here were replaced: ${[...subst].slice(0, 6).join(', ')}${subst.size > 6 ? '…' : ''}. Text stays editable; pick the right font if you have it.`);
    if (counts.paths + counts.texts + counts.images > 4000) warn.add('This page has a very large number of objects — editing may be slow. Consider importing it as one picture.');
    return { objects, width: vp.width, height: vp.height, warnings: [...warn], counts };
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}
