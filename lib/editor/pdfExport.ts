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

interface ArtboardLike {
  id: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

const PT_PER_PX = 72 / 96;

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
    pdf.setLineWidth(Math.max((obj.strokeWidth || 1) * avgScale, 0.01));
  }

  if (hasFill && hasStroke) return 'FD';
  if (hasFill) return 'F';
  if (hasStroke) return 'S';
  return null;
}

function drawClosedPolygon(pdf: any, pts: [number, number][], style: string, offsetX: number, offsetY: number) {
  if (pts.length < 2) return;
  const shifted = pts.map(([x, y]) => [x - offsetX, y - offsetY] as [number, number]);
  const [x0, y0] = shifted[0];
  const segments = shifted.slice(1).map((p, i) => [p[0] - shifted[i][0], p[1] - shifted[i][1]]);
  pdf.lines(segments, x0, y0, [1, 1], style, true);
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
  pdf.setLineWidth(Math.max((obj.strokeWidth || 1) * avgScale, 0.01));
  pdf.line(p1.x - offsetX, p1.y - offsetY, p2.x - offsetX, p2.y - offsetY);
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
  const align: 'left' | 'center' | 'right' = ['left', 'center', 'right'].includes(obj.textAlign)
    ? obj.textAlign
    : 'left';
  const angle = -(obj.angle || 0);
  const matrix = obj.calcTransformMatrix();

  rawLines.forEach((line, i) => {
    if (!line) return;
    const baselineLocal = i * lineHeightLocal + fontSizeLocal * 0.8;
    let localX = offX;
    if (align === 'center') localX = offX + w / 2;
    else if (align === 'right') localX = offX + w;

    const local = new F.Point(localX, offY + baselineLocal);
    const abs: any = F.util.transformPoint(local, matrix);
    pdf.text(line, abs.x - offsetX, abs.y - offsetY, { angle, align, baseline: 'alphabetic' });
  });
}

function drawImageObject(pdf: any, obj: any, offsetX: number, offsetY: number) {
  const rect = obj.getBoundingRect(true, true);
  if (!rect.width || !rect.height) return;
  // multiplier: 1 keeps the image at its native/full resolution — never scaled down.
  const dataUrl = obj.toDataURL({ format: 'png', multiplier: 1 });
  pdf.addImage(dataUrl, 'PNG', rect.left - offsetX, rect.top - offsetY, rect.width, rect.height);
}

function drawObjectAsRaster(pdf: any, obj: any, offsetX: number, offsetY: number) {
  const rect = obj.getBoundingRect(true, true);
  if (!rect.width || !rect.height) return;
  const dataUrl = obj.toDataURL({ format: 'png', multiplier: 3 });
  pdf.addImage(dataUrl, 'PNG', rect.left - offsetX, rect.top - offsetY, rect.width, rect.height);
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
  // rect (incl. the artboard background), triangle, circle, ellipse, polygon, single-ring path.
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
      pdf.addPage([ab.width, ab.height], ab.width > ab.height ? 'landscape' : 'portrait');
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
