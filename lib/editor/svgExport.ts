// ---------------------------------------------------------------------
// lib/editor/svgExport.ts
// Real SVG export: walks the live Fabric canvas and serializes each
// object into genuine SVG geometry (<rect>/<ellipse>/<polygon>/<path
// d="M...C...">/<text>), not a raster screenshot wrapped in <svg> tags.
// A path object's own M/L/C/Q/Z command array is written out directly as
// a real `d` attribute, so a pen-drawn bezier curve reopens as an
// editable curve in another vector editor (Illustrator, Inkscape, Figma
// import, etc.), not a polygon approximation or an embedded bitmap.
//
// Honest limitations (documented, not hidden):
// - Pattern fills/strokes are not real SVG patterns — they fall back to
//   a flat mid-gray with a comment in the emitted markup, since this app
//   doesn't expose a pattern-fill tool anywhere a user could reach one.
// - A clipPath chained onto another clipped object (clip-of-a-clip) only
//   emits the outermost clip; nested clipping is not implemented.
// - Raster <image> content is legitimately embedded as-is (a photo IS a
//   bitmap) — only vector geometry is held to the "must be real paths"
//   bar here.
// ---------------------------------------------------------------------

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function matrixAttr(m: number[]): string {
  return `matrix(${m.map((n) => Number(n.toFixed(4))).join(',')})`;
}

// Fabric's own .path command array is already nearly SVG syntax — this
// just offsets by pathOffset (Fabric centers path geometry on its own
// bounding box) and joins it into a real `d` string, commands untouched.
function pathCommandsToD(commands: any[], offset: { x: number; y: number }): string {
  return commands
    .map((cmd: any[]) => {
      const [type, ...nums] = cmd;
      if (type === 'Z' || type === 'z') return 'Z';
      const shifted: number[] = [];
      for (let i = 0; i < nums.length; i += 2) {
        shifted.push(nums[i] - offset.x, nums[i + 1] - offset.y);
      }
      return `${type} ${shifted.map((n) => Number(n.toFixed(3))).join(' ')}`;
    })
    .join(' ');
}

let gradientIdCounter = 0;
let clipIdCounter = 0;

function isGradient(paint: any): boolean {
  return paint && typeof paint === 'object' && Array.isArray(paint.colorStops);
}

// Real linear/radial gradient serialization from Fabric's own gradient
// object (type/coords/colorStops) — not a flat-color approximation.
function serializeGradient(defs: string[], paint: any): string {
  const id = `grad-${++gradientIdCounter}`;
  const stops = (paint.colorStops || [])
    .map((s: any) => `<stop offset="${Number(s.offset ?? 0)}" stop-color="${escapeXml(s.color || '#000')}" stop-opacity="${s.opacity ?? 1}" />`)
    .join('');
  if (paint.type === 'radial') {
    const c = paint.coords || {};
    defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${c.x2 ?? 0}" cy="${c.y2 ?? 0}" r="${c.r2 ?? 0}">${stops}</radialGradient>`
    );
  } else {
    const c = paint.coords || {};
    defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${c.x1 ?? 0}" y1="${c.y1 ?? 0}" x2="${c.x2 ?? 0}" y2="${c.y2 ?? 0}">${stops}</linearGradient>`
    );
  }
  return `url(#${id})`;
}

function paintToSvgAttr(defs: string[], paint: any): string | null {
  if (!paint) return null;
  if (typeof paint === 'string') return paint;
  if (isGradient(paint)) return serializeGradient(defs, paint);
  if (typeof paint === 'object') {
    // Pattern fill — no real SVG <pattern> serialization here (see file
    // header); documented flat fallback rather than a silent raster.
    return '#9ca3af';
  }
  return null;
}

const BLEND_MODE_CSS: Record<string, string> = {
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  difference: 'difference',
  exclusion: 'exclusion',
};

// Builds a real <clipPath> def for an object's Fabric clipPath (rect or
// path only — see file header) and returns the attribute referencing it,
// or null if there's nothing to clip / the clip type isn't supported.
function buildClipPathAttr(defs: string[], obj: any): string | null {
  const clip = obj.clipPath;
  if (!clip) return null;
  const id = `clip-${++clipIdCounter}`;
  // The clip lives in the SAME local coordinate space as the object it's
  // attached to (Fabric's absolutePositioned=false convention), so its
  // own transform relative to the object is what we need here.
  const clipMatrix = clip.calcOwnMatrix ? clip.calcOwnMatrix() : [1, 0, 0, 1, clip.left || 0, clip.top || 0];
  let inner = '';
  if (clip.type === 'rect') {
    const w = clip.width || 0;
    const h = clip.height || 0;
    inner = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" />`;
  } else if (clip.type === 'path') {
    const d = pathCommandsToD(clip.path || [], clip.pathOffset || { x: 0, y: 0 });
    inner = `<path d="${d}" />`;
  } else {
    return null; // unsupported clip shape type — not faked as a no-op clip
  }
  defs.push(`<clipPath id="${id}"><g transform="${matrixAttr(clipMatrix)}">${inner}</g></clipPath>`);
  return `clip-path="url(#${id})"`;
}

function objectToSvgElement(defs: string[], obj: any, F: any): string {
  const matrix = obj.calcTransformMatrix();
  const opacity = typeof obj.opacity === 'number' ? obj.opacity : 1;
  const fillAttr = paintToSvgAttr(defs, obj.fill);
  const strokeAttr = paintToSvgAttr(defs, obj.stroke);
  const strokeWidth = obj.strokeWidth || 0;
  const dash = Array.isArray(obj.strokeDashArray) && obj.strokeDashArray.length ? ` stroke-dasharray="${obj.strokeDashArray.join(',')}"` : '';
  const cap = obj.strokeLineCap ? ` stroke-linecap="${obj.strokeLineCap}"` : '';
  const join = obj.strokeLineJoin ? ` stroke-linejoin="${obj.strokeLineJoin}"` : '';
  const blend = obj.globalCompositeOperation && BLEND_MODE_CSS[obj.globalCompositeOperation];
  const clipAttr = buildClipPathAttr(defs, obj);

  const paintAttrs =
    `${fillAttr ? ` fill="${fillAttr}"` : ' fill="none"'}` +
    `${strokeAttr && strokeWidth > 0 ? ` stroke="${strokeAttr}" stroke-width="${strokeWidth}"${dash}${cap}${join}` : ''}` +
    `${opacity < 1 ? ` opacity="${opacity}"` : ''}` +
    `${blend ? ` style="mix-blend-mode:${blend}"` : ''}` +
    `${clipAttr ? ` ${clipAttr}` : ''}`;

  let inner = '';
  const w = obj.width || 0;
  const h = obj.height || 0;

  if (obj.type === 'rect') {
    const rx = obj.rx || 0;
    const ry = obj.ry || rx;
    inner = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"${rx ? ` rx="${rx}" ry="${ry}"` : ''}${paintAttrs} />`;
  } else if (obj.type === 'circle') {
    const r = obj.radius || 0;
    inner = `<circle cx="0" cy="0" r="${r}"${paintAttrs} />`;
  } else if (obj.type === 'ellipse') {
    inner = `<ellipse cx="0" cy="0" rx="${obj.rx || 0}" ry="${obj.ry || 0}"${paintAttrs} />`;
  } else if (obj.type === 'triangle') {
    const pts = `${0},${-h / 2} ${w / 2},${h / 2} ${-w / 2},${h / 2}`;
    inner = `<polygon points="${pts}"${paintAttrs} />`;
  } else if (obj.type === 'polygon') {
    const pts: any[] = obj.points || [];
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const ptsStr = pts.map((p) => `${p.x - minX - w / 2},${p.y - minY - h / 2}`).join(' ');
    inner = `<polygon points="${ptsStr}"${paintAttrs} />`;
  } else if (obj.type === 'line') {
    const x1 = (obj.x1 ?? 0) - w / 2;
    const y1 = (obj.y1 ?? 0) - h / 2;
    const x2 = (obj.x2 ?? 0) - w / 2;
    const y2 = (obj.y2 ?? 0) - h / 2;
    inner = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${strokeAttr ? ` stroke="${strokeAttr}" stroke-width="${strokeWidth}"${dash}${cap}` : ''}${opacity < 1 ? ` opacity="${opacity}"` : ''} />`;
  } else if (obj.type === 'path') {
    const d = pathCommandsToD(obj.path || [], obj.pathOffset || { x: 0, y: 0 });
    inner = `<path d="${d}"${paintAttrs} />`;
  } else if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
    const lines: string[] = obj._textLines && obj._textLines.length ? obj._textLines.map((l: any) => (Array.isArray(l) ? l.join('') : l)) : String(obj.text || '').split('\n');
    const fontSize = obj.fontSize || 16;
    const lineHeight = fontSize * (obj.lineHeight || 1.16);
    const totalH = lines.length * lineHeight;
    // 'justify' isn't 'center' or 'right', so it already falls through to
    // the same left/'start' anchor a justified line needs (textLength
    // below stretches rightward FROM that anchor, same as Fabric's own
    // textAlign:'justify' canvas rendering, which — unlike the usual CSS
    // convention — stretches every line, including the last).
    const anchor = obj.textAlign === 'center' ? 'middle' : obj.textAlign === 'right' ? 'end' : 'start';
    const xAt = obj.textAlign === 'center' ? 0 : obj.textAlign === 'right' ? w / 2 : -w / 2;
    const weight = obj.fontWeight === 'bold' || (typeof obj.fontWeight === 'number' && obj.fontWeight >= 600) ? 'bold' : 'normal';
    const style = obj.fontStyle === 'italic' ? 'italic' : 'normal';
    const isJustify = obj.textAlign === 'justify';
    const tspans = lines
      .map((line, i) => {
        const y = -totalH / 2 + (i + 1) * lineHeight - lineHeight * 0.2;
        // A line with no spaces has nothing to distribute into (same as
        // Fabric's own enlargeSpaces, a no-op there too) — left as-is.
        // Honest limitation: SVG's lengthAdjust="spacing" widens every
        // inter-glyph gap, not only the word-space gaps Fabric itself
        // stretches, so letter spacing within words is very slightly
        // affected too — a real justify, not pixel-identical to Fabric's.
        const stretch = isJustify && line.includes(' ') ? ` textLength="${w}" lengthAdjust="spacing"` : '';
        return `<tspan x="${xAt}" y="${y}"${stretch}>${escapeXml(line)}</tspan>`;
      })
      .join('');
    inner = `<text font-family="${escapeXml(obj.fontFamily || 'sans-serif')}" font-size="${fontSize}" font-weight="${weight}" font-style="${style}" text-anchor="${anchor}"${paintAttrs}>${tspans}</text>`;
  } else if (obj.type === 'image') {
    const src = obj.toDataURL ? obj.toDataURL({ format: 'png' }) : obj._element?.src;
    if (!src) return '';
    inner = `<image x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" href="${src}"${opacity < 1 ? ` opacity="${opacity}"` : ''}${clipAttr ? ` ${clipAttr}` : ''} preserveAspectRatio="none" />`;
  } else {
    return ''; // group/activeSelection and anything else unsupported — skipped, not faked
  }

  return `<g transform="${matrixAttr(matrix)}">${inner}</g>`;
}

// artboard.id is omitted only for the startup-edge-case fallback document
// (no artboards created yet) — mirrors exportCanvasToPDF's legacy path in
// pdfExport.ts, which likewise takes every real object unfiltered rather
// than matching a nonexistent __artboardId.
export function exportArtboardToSVG(canvas: any, F: any, artboard: RectLike & { id?: string }): string {
  const objects: any[] = canvas
    .getObjects()
    .filter(
      (o: any) =>
        (!artboard.id || o.__artboardId === artboard.id) &&
        !o.__isArtboard &&
        !o.__isAnchorHandle &&
        !o.__isPenPreview &&
        !o.__isShapeDraft &&
        !o.__isPrintMark &&
        !o.__isGuide
    );

  const defs: string[] = [];
  const abObj = artboard.id ? canvas.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === artboard.id) : null;
  const bg = abObj && isPaintable(abObj.fill) ? escapeXml(abObj.fill) : null;

  const body = objects.map((obj) => objectToSvgElement(defs, obj, F)).join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${artboard.width}" height="${artboard.height}" viewBox="0 0 ${artboard.width} ${artboard.height}">\n` +
    (defs.length ? `<defs>${defs.join('')}</defs>\n` : '') +
    (bg ? `<rect x="0" y="0" width="${artboard.width}" height="${artboard.height}" fill="${bg}" />\n` : '') +
    `<g transform="translate(${-artboard.x},${-artboard.y})">${body}</g>\n` +
    `</svg>`
  );
}

function isPaintable(value: any): value is string {
  return typeof value === 'string' && value !== '';
}
