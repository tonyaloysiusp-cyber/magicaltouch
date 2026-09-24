// ---------------------------------------------------------------------
// lib/editor/pdfExport.ts
// Walks the live Fabric canvas and draws each object into a jsPDF
// document using jsPDF's own vector primitives, so shapes/text stay real
// vector data instead of one flattened raster image. Anything that can't
// be represented safely as vector (gradients, patterns, clip masks,
// multi-subpath/hole paths, groups) falls back to rendering just that
// object as an embedded image.
//
// exportArtboardsToPDF() produces one PDF page per artboard: each
// artboard's own objects (matched by __artboardId, in the same world
// coordinate space Fabric uses) are drawn with their positions shifted
// so the artboard's top-left lands at that page's local (0,0).
// ---------------------------------------------------------------------

import { getAbsolutePolygonPoints } from './geometry';
import { createPdfFontCache, ensurePdfFont } from './pdfFonts';
import { nativeResMultiplier, clampMultiplierForSafety } from './imageQuality';

interface ArtboardLike {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

// This app's whole document/canvas coordinate space is 96px = 1 inch
// (see lib/editor/units.ts) regardless of the artboard's own target
// print DPI, which is a raster-quality setting, not a geometry scale.
// jsPDF's own `unit: 'px'` mode does not reliably apply this same 96px/
// inch conversion for a custom `format: [w, h]` array in this jsPDF
// version — verified empirically: a 336×192px page (meant to be a
// 3.5"×2" business card) came out with a MediaBox of 448×256pt (4.67"×
// 2.67", 33% too big in every dimension). To sidestep that, every
// caller here builds the jsPDF document in 'pt' units and this module
// converts every px coordinate/size to pt (1px = 0.75pt) right at the
// point it's handed to a jsPDF drawing call — never earlier, so all the
// intermediate Fabric-space geometry math above stays in the same units
// Fabric itself uses.
export const PT_PER_PX = 72 / 96;
export const toPt = (px: number) => px * PT_PER_PX;

function isPaintable(value: any): value is string {
  return typeof value === 'string' && value !== '';
}

function colorToRGB(F: any, value: string): [number, number, number] {
  try {
    const src = new F.Color(value).getSource();
    return [src[0], src[1], src[2]];
  } catch {
    return [0, 0, 0];
  }
}

function hasMultipleSubpaths(obj: any): boolean {
  const cmds: any[] = obj.path || [];
  let moveCount = 0;
  for (const cmd of cmds) {
    if (cmd[0] === 'M') moveCount++;
    if (moveCount > 1) return true;
  }
  return false;
}

function needsRasterFallback(obj: any): boolean {
  if (obj.clipPath) return true;
  if (obj.fill && typeof obj.fill === 'object') return true;
  if (obj.stroke && typeof obj.stroke === 'object') return true;
  if (obj.type === 'group' || obj.type === 'activeSelection') return true;
  if (obj.type === 'path' && hasMultipleSubpaths(obj)) return true;
  const supported = ['rect', 'triangle', 'circle', 'ellipse', 'polygon', 'path', 'line', 'i-text', 'text', 'textbox'];
  if (!supported.includes(obj.type)) return true;
  return false;
}

async function withOpacity(pdf: any, opacity: number | undefined, draw: () => void | Promise<void>) {
  const o = typeof opacity === 'number' ? Math.max(0, Math.min(1, opacity)) : 1;
  if (o >= 1) {
    await draw();
    return;
  }
  pdf.saveGraphicsState();
  try {
    pdf.setGState(new pdf.GState({ opacity: o, 'stroke-opacity': o }));
    await draw();
  } finally {
    pdf.restoreGraphicsState();
  }
}

function applyPaintAndGetStyle(pdf: any, F: any, obj: any): string | null {
  const hasFill = isPaintable(obj.fill);
  const hasStroke = isPaintable(obj.stroke) && (obj.strokeWidth || 0) > 0;

  if (hasFill) {
    const [r, g, b] = colorToRGB(F, obj.fill);
    pdf.setFillColor(r, g, b);
  }
  if (hasStroke) {
    const [r, g, b] = colorToRGB(F, obj.stroke);
    pdf.setDrawColor(r, g, b);
    const avgScale = ((obj.scaleX || 1) + (obj.scaleY || 1)) / 2;
    pdf.setLineWidth(Math.max(toPt((obj.strokeWidth || 1) * avgScale), 0.01));
  }

  if (hasFill && hasStroke) return 'FD';
  if (hasFill) return 'F';
  if (hasStroke) return 'S';
  return null;
}

function drawClosedPolygon(pdf: any, pts: [number, number][], style: string, offsetX: number, offsetY: number) {
  if (pts.length < 2) return;
  const shifted = pts.map(([x, y]) => [toPt(x - offsetX), toPt(y - offsetY)] as [number, number]);
  const [x0, y0] = shifted[0];
  const segments = shifted.slice(1).map((p, i) => [p[0] - shifted[i][0], p[1] - shifted[i][1]]);
  pdf.lines(segments, x0, y0, [1, 1], style, true);
}

// Pen-drawn (and any other single-subpath) Path objects previously went
// through getAbsolutePolygonPoints -> flattenPathToLocalPoints, which
// subdivides every C/Q command into ~12 straight-line segments — real
// vector data, but a polygon approximation of the curve rather than the
// curve itself, so a bezier path exported to PDF and reopened in a real
// vector editor would show as a many-sided polygon, not an editable
// curve. This draws the path's actual M/L/C/Q/Z commands as jsPDF's own
// path primitives (moveTo/lineTo/curveTo), which emit a real PDF `c`
// bezier operator (verified against the raw content stream) — the curve
// stays a curve.
function drawBezierPathObject(pdf: any, F: any, obj: any, offsetX: number, offsetY: number) {
  const commands: any[] = obj.path || [];
  if (commands.length < 2) return;
  const style = applyPaintAndGetStyle(pdf, F, obj);
  if (!style) return;

  const offset = obj.pathOffset || { x: 0, y: 0 };
  const matrix: any = obj.calcTransformMatrix();
  const toAbsPt = (x: number, y: number): [number, number] => {
    const tp: any = F.util.transformPoint(new F.Point(x - offset.x, y - offset.y), matrix);
    return [toPt(tp.x - offsetX), toPt(tp.y - offsetY)];
  };

  let cur = { x: 0, y: 0 };
  let drewAnything = false;
  commands.forEach((cmd: any[]) => {
    const type = cmd[0];
    if (type === 'M') {
      cur = { x: cmd[1], y: cmd[2] };
      const [x, y] = toAbsPt(cur.x, cur.y);
      pdf.moveTo(x, y);
      drewAnything = true;
    } else if (type === 'L') {
      const next = { x: cmd[1], y: cmd[2] };
      const [x, y] = toAbsPt(next.x, next.y);
      pdf.lineTo(x, y);
      cur = next;
    } else if (type === 'C') {
      const p1 = { x: cmd[1], y: cmd[2] };
      const p2 = { x: cmd[3], y: cmd[4] };
      const p3 = { x: cmd[5], y: cmd[6] };
      const [x1, y1] = toAbsPt(p1.x, p1.y);
      const [x2, y2] = toAbsPt(p2.x, p2.y);
      const [x3, y3] = toAbsPt(p3.x, p3.y);
      pdf.curveTo(x1, y1, x2, y2, x3, y3);
      cur = p3;
    } else if (type === 'Q') {
      // jsPDF's path API is cubic-only — degree-elevate the quadratic to
      // an exactly equivalent cubic in LOCAL space first, then transform,
      // so a non-uniform scale/rotation applies consistently to both.
      const p1 = { x: cmd[1], y: cmd[2] };
      const p2 = { x: cmd[3], y: cmd[4] };
      const c1 = { x: cur.x + (2 / 3) * (p1.x - cur.x), y: cur.y + (2 / 3) * (p1.y - cur.y) };
      const c2 = { x: p2.x + (2 / 3) * (p1.x - p2.x), y: p2.y + (2 / 3) * (p1.y - p2.y) };
      const [x1, y1] = toAbsPt(c1.x, c1.y);
      const [x2, y2] = toAbsPt(c2.x, c2.y);
      const [x3, y3] = toAbsPt(p2.x, p2.y);
      pdf.curveTo(x1, y1, x2, y2, x3, y3);
      cur = p2;
    } else if (type === 'Z' || type === 'z') {
      pdf.close();
    }
  });

  if (!drewAnything) return;
  if (style === 'F') pdf.fill();
  else if (style === 'S') pdf.stroke();
  else if (style === 'FD') pdf.fillStroke();
}

function drawLineObject(pdf: any, F: any, obj: any, offsetX: number, offsetY: number) {
  if (!isPaintable(obj.stroke) || !((obj.strokeWidth || 0) > 0)) return;
  const matrix = obj.calcTransformMatrix();
  const x1 = obj.x1 ?? 0;
  const y1 = obj.y1 ?? 0;
  const x2 = obj.x2 ?? 0;
  const y2 = obj.y2 ?? 0;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const p1: any = F.util.transformPoint(new F.Point(x1 - cx, y1 - cy), matrix);
  const p2: any = F.util.transformPoint(new F.Point(x2 - cx, y2 - cy), matrix);

  const [r, g, b] = colorToRGB(F, obj.stroke);
  pdf.setDrawColor(r, g, b);
  const avgScale = ((obj.scaleX || 1) + (obj.scaleY || 1)) / 2;
  pdf.setLineWidth(Math.max(toPt((obj.strokeWidth || 1) * avgScale), 0.01));
  pdf.line(toPt(p1.x - offsetX), toPt(p1.y - offsetY), toPt(p2.x - offsetX), toPt(p2.y - offsetY));
}

function mapFontFamily(fontFamily: string | undefined): string {
  const f = (fontFamily || '').toLowerCase();
  if (f.includes('times') || f.includes('georgia')) return 'times';
  if (f.includes('courier') || f.includes('mono')) return 'courier';
  return 'helvetica';
}

function mapFontStyle(obj: any): string {
  const weight = obj.fontWeight;
  const bold = weight === 'bold' || (typeof weight === 'number' && weight >= 600);
  const italic = obj.fontStyle === 'italic';
  if (bold && italic) return 'bolditalic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

async function drawTextObject(pdf: any, F: any, obj: any, offsetX: number, offsetY: number, fontCache: ReturnType<typeof createPdfFontCache>) {
  const rawLines: string[] =
    obj._textLines && obj._textLines.length
      ? obj._textLines.map((l: any) => (Array.isArray(l) ? l.join('') : l))
      : String(obj.text || '').split('\n');
  if (!rawLines.length) return;

  const scaleX = obj.scaleX || 1;
  const scaleY = obj.scaleY || 1;
  const avgScale = (scaleX + scaleY) / 2;

  // Local (pre-transform) metrics — the transform matrix below applies scale/rotation.
  const fontSizeLocal = obj.fontSize || 16;
  const lineHeightLocal = fontSizeLocal * (obj.lineHeight || 1.16);
  const w = obj.width || 0;
  const h = rawLines.length * lineHeightLocal;

  // Font size itself isn't affected by the coordinate transform, so scale it explicitly.
  const fontSizePt = Math.max(fontSizeLocal * avgScale * PT_PER_PX, 1);

  const style = mapFontStyle(obj);
  const bold = style === 'bold' || style === 'bolditalic';
  const registered = await ensurePdfFont(pdf, fontCache, obj.fontFamily, bold);
  if (registered) {
    pdf.setFont(registered.name, style);
  } else {
    // Not one of our curated webfonts (a plain system font like Arial/
    // Georgia, or something unrecognized) — fall back to the closest of
    // jsPDF's built-in fonts, same as before.
    pdf.setFont(mapFontFamily(obj.fontFamily), style);
  }
  pdf.setFontSize(fontSizePt);
  if (isPaintable(obj.fill)) {
    const [r, g, b] = colorToRGB(F, obj.fill);
    pdf.setTextColor(r, g, b);
  } else {
    pdf.setTextColor(0, 0, 0);
  }

  // calcTransformMatrix()'s local coordinate frame is always centered on the
  // object (local (0,0) = visual center) regardless of originX/originY — that
  // setting only affects how obj.left/top map to the center, which the matrix
  // already accounts for. Treating originX/Y as if they also shifted this
  // local frame (the previous code) put every left-originX/top-originY text
  // object — i.e. every text object this editor creates — half its own
  // width/height off from where it should render.
  const offX = -w / 2;
  const offY = -h / 2;
  const align: 'left' | 'center' | 'right' | 'justify' = ['left', 'center', 'right', 'justify'].includes(obj.textAlign)
    ? obj.textAlign
    : 'left';
  const angle = -(obj.angle || 0);
  const matrix = obj.calcTransformMatrix();
  // Converts a width jsPDF measured in POINTS (at the font/size already
  // set on `pdf`, which bakes in avgScale) back into this function's own
  // local (pre-transform) px frame, so it composes with offX/w/matrix
  // exactly like every other measurement here.
  const localWidth = (text: string) => pdf.getTextWidth(text) / (avgScale * PT_PER_PX);

  const drawAt = (text: string, localX: number, baselineLocal: number, lineAlign: 'left' | 'center' | 'right') => {
    const local = new F.Point(localX, offY + baselineLocal);
    const abs: any = F.util.transformPoint(local, matrix);
    pdf.text(text, toPt(abs.x - offsetX), toPt(abs.y - offsetY), { angle, align: lineAlign, baseline: 'alphabetic' });
  };

  rawLines.forEach((line, i) => {
    if (!line) return;
    const baselineLocal = i * lineHeightLocal + fontSizeLocal * 0.8;

    // Real justify: stretch this line's word gaps to fill the box width —
    // matching Fabric's own textAlign:'justify' canvas rendering, which
    // (unlike the usual CSS convention) stretches every line, including
    // the last one. A line with no spaces has nothing to distribute into
    // (same as Fabric's own enlargeSpaces), so it falls through to plain
    // left placement below.
    if (align === 'justify' && line.includes(' ')) {
      const words = line.split(' ');
      const wordWidths = words.map(localWidth);
      const totalWordWidth = wordWidths.reduce((a, b) => a + b, 0);
      const gapCount = words.length - 1;
      const naturalGapWidth = localWidth(' ');
      const extraWidth = Math.max(0, w - (totalWordWidth + naturalGapWidth * gapCount));
      const gapWidth = naturalGapWidth + extraWidth / gapCount;
      let cursorX = offX;
      words.forEach((word, wi) => {
        drawAt(word, cursorX, baselineLocal, 'left');
        cursorX += wordWidths[wi] + gapWidth;
      });
      return;
    }

    let localX = offX;
    if (align === 'center') localX = offX + w / 2;
    else if (align === 'right') localX = offX + w;
    drawAt(line, localX, baselineLocal, align === 'justify' ? 'left' : align);
  });
}

function drawImageObject(pdf: any, obj: any, offsetX: number, offsetY: number) {
  const rect = obj.getBoundingRect(true, true);
  if (!rect.width || !rect.height) return;
  // `multiplier: 1` is NOT "native resolution" — fabric sizes its output
  // canvas from the object's current ON-SCREEN bounding box, so a plain
  // multiplier of 1 silently re-embeds the image at whatever size it
  // happens to be displayed/scaled to on the design canvas (e.g. a
  // 6000x4000 photo placed small on a business card used to export at a
  // few hundred pixels). nativeResMultiplier undoes the object's own
  // scale so the embedded PNG always carries the image's real pixel data.
  const multiplier = clampMultiplierForSafety(obj, nativeResMultiplier(obj));
  const dataUrl = obj.toDataURL({ format: 'png', multiplier });
  pdf.addImage(dataUrl, 'PNG', toPt(rect.left - offsetX), toPt(rect.top - offsetY), toPt(rect.width), toPt(rect.height));
}

function drawObjectAsRaster(pdf: any, obj: any, offsetX: number, offsetY: number) {
  const rect = obj.getBoundingRect(true, true);
  if (!rect.width || !rect.height) return;
  const dataUrl = obj.toDataURL({ format: 'png', multiplier: 3 });
  pdf.addImage(dataUrl, 'PNG', toPt(rect.left - offsetX), toPt(rect.top - offsetY), toPt(rect.width), toPt(rect.height));
}

async function renderOneObject(
  pdf: any,
  F: any,
  obj: any,
  offsetX: number,
  offsetY: number,
  fontCache: ReturnType<typeof createPdfFontCache>
) {
  if (obj.type === 'image') {
    drawImageObject(pdf, obj, offsetX, offsetY);
    return;
  }
  if (needsRasterFallback(obj)) {
    drawObjectAsRaster(pdf, obj, offsetX, offsetY);
    return;
  }
  if (obj.type === 'line') {
    drawLineObject(pdf, F, obj, offsetX, offsetY);
    return;
  }
  if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
    await drawTextObject(pdf, F, obj, offsetX, offsetY, fontCache);
    return;
  }
  if (obj.type === 'path') {
    drawBezierPathObject(pdf, F, obj, offsetX, offsetY);
    return;
  }
  // rect (incl. the artboard background), triangle, circle, ellipse, polygon.
  const pts = getAbsolutePolygonPoints(obj, F);
  if (pts.length < 2) return;
  const style = applyPaintAndGetStyle(pdf, F, obj);
  if (style) drawClosedPolygon(pdf, pts, style, offsetX, offsetY);
}

async function renderObjectsToPage(
  pdf: any,
  F: any,
  objects: any[],
  offsetX: number,
  offsetY: number,
  fontCache: ReturnType<typeof createPdfFontCache>
) {
  for (const obj of objects) {
    await withOpacity(pdf, obj.opacity, async () => {
      try {
        await renderOneObject(pdf, F, obj, offsetX, offsetY, fontCache);
      } catch (err) {
        console.error('Vector PDF render failed for object, falling back to raster:', obj.type, err);
        try {
          if (obj.type === 'image') drawImageObject(pdf, obj, offsetX, offsetY);
          else drawObjectAsRaster(pdf, obj, offsetX, offsetY);
        } catch (err2) {
          console.error('Raster fallback also failed for object:', obj.type, err2);
        }
      }
    });
  }
}

// Single-artboard / legacy entry point: draws every real object on the
// canvas onto the current page at world coordinates (offset 0,0).
export async function exportCanvasToPDF(pdf: any, canvas: any, F: any) {
  const objects: any[] = canvas
    .getObjects()
    .filter((o: any) => !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && o.visible !== false);
  await renderObjectsToPage(pdf, F, objects, 0, 0, createPdfFontCache());
}

// Multi-artboard entry point: one PDF page per artboard. The first
// artboard renders onto the page the caller already created (matching
// `new jsPDF({ format: [w, h] })`); every subsequent artboard gets its
// own addPage() at that artboard's own size.
export async function exportArtboardsToPDF(pdf: any, canvas: any, F: any, artboards: ArtboardLike[]) {
  // Shared across every artboard/page in this export, so a font used on
  // multiple artboards is only fetched and registered with jsPDF once.
  const fontCache = createPdfFontCache();
  for (let i = 0; i < artboards.length; i++) {
    const ab = artboards[i];
    if (i > 0) {
      pdf.addPage([toPt(ab.width), toPt(ab.height)], ab.width > ab.height ? 'landscape' : 'portrait');
    }
    const objects: any[] = canvas
      .getObjects()
      .filter(
        (o: any) =>
          !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && o.visible !== false && o.__artboardId === ab.id
      );
    await renderObjectsToPage(pdf, F, objects, ab.x, ab.y, fontCache);
  }
}
