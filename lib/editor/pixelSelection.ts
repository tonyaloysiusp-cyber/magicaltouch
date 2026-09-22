// ---------------------------------------------------------------------
// lib/editor/pixelSelection.ts
// Real, pixel-level selection (marquee/lasso/magic wand) operating on a
// single raster Image object's native pixel data. This is the honest
// place for Photoshop-style pixel selection in an object-based (Fabric)
// editor — vector shapes don't have "pixels" to select, only images do.
//
// A selection is a Uint8ClampedArray mask (0/255 per pixel) at the
// image's natural resolution, so every operation (add/subtract/invert/
// feather/delete/apply-as-mask/extract) works on genuine per-pixel data,
// not a cosmetic approximation.
// ---------------------------------------------------------------------

export interface PixelMask {
  width: number;
  height: number;
  data: Uint8ClampedArray; // 0 = not selected, 255 = selected
}

export type CombineMode = 'new' | 'add' | 'subtract' | 'intersect';

export function createEmptyMask(width: number, height: number): PixelMask {
  return { width, height, data: new Uint8ClampedArray(Math.max(0, width) * Math.max(0, height)) };
}

export function cloneMask(mask: PixelMask): PixelMask {
  return { width: mask.width, height: mask.height, data: new Uint8ClampedArray(mask.data) };
}

// Grayscale-safe combines: these generalize to real 0-255 partial values
// (a soft/feathered brush dab, a painted layer mask) while producing
// EXACTLY the same result as the old binary-only logic whenever both
// inputs are already pure 0/255 — which is every existing caller
// (marquee/lasso/magic-wand all build hard-edged shapes), so this is a
// pure generalization, not a behavior change for anything already
// working.
export function combineMasks(base: PixelMask | null, shape: PixelMask, mode: CombineMode): PixelMask {
  if (!base || mode === 'new') return shape;
  const out = createEmptyMask(base.width, base.height);
  for (let i = 0; i < out.data.length; i++) {
    const a = base.data[i];
    const b = shape.data[i];
    if (mode === 'add') out.data[i] = Math.max(a, b);
    else if (mode === 'subtract') out.data[i] = Math.max(0, a - b);
    else out.data[i] = Math.min(a, b); // intersect
  }
  return out;
}

export function rectMask(width: number, height: number, x: number, y: number, w: number, h: number): PixelMask {
  const mask = createEmptyMask(width, height);
  const x0 = Math.max(0, Math.floor(Math.min(x, x + w)));
  const x1 = Math.min(width, Math.ceil(Math.max(x, x + w)));
  const y0 = Math.max(0, Math.floor(Math.min(y, y + h)));
  const y1 = Math.min(height, Math.ceil(Math.max(y, y + h)));
  for (let py = y0; py < y1; py++) {
    const row = py * width;
    for (let px = x0; px < x1; px++) mask.data[row + px] = 255;
  }
  return mask;
}

export function ellipseMask(width: number, height: number, cx: number, cy: number, rx: number, ry: number): PixelMask {
  const mask = createEmptyMask(width, height);
  if (rx <= 0 || ry <= 0) return mask;
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(width, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(height, Math.ceil(cy + ry));
  for (let py = y0; py < y1; py++) {
    const ny = (py + 0.5 - cy) / ry;
    const row = py * width;
    for (let px = x0; px < x1; px++) {
      const nx = (px + 0.5 - cx) / rx;
      if (nx * nx + ny * ny <= 1) mask.data[row + px] = 255;
    }
  }
  return mask;
}

// A real soft-edged (feathered) circular brush dab: full strength (255)
// through the `hardness` fraction of the radius, then a smooth cosine
// falloff to 0 at the edge — the same falloff shape a real paint/photo
// app's round brush uses, instead of the hard binary edge a plain
// ellipseMask gives you. Used for every brush-like tool (paint mask,
// brush, dodge/burn, eraser) so strokes actually blend instead of
// looking like stamped, cut-out circles.
export function softBrushMask(
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  hardness = 0.5,
  strength = 1
): PixelMask {
  const mask = createEmptyMask(width, height);
  if (radius <= 0) return mask;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height, Math.ceil(cy + radius));
  const hardR = Math.max(0, Math.min(1, hardness)) * radius;
  const softSpan = Math.max(1e-6, radius - hardR);
  for (let py = y0; py < y1; py++) {
    const dy = py + 0.5 - cy;
    const row = py * width;
    for (let px = x0; px < x1; px++) {
      const dx = px + 0.5 - cx;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > radius) continue;
      let falloff = 1;
      if (d > hardR) {
        const t = (d - hardR) / softSpan;
        falloff = 0.5 * (1 + Math.cos(Math.PI * t)); // 1 -> 0, smooth (no hard ring)
      }
      mask.data[row + px] = Math.max(mask.data[row + px], Math.round(falloff * strength * 255));
    }
  }
  return mask;
}

// points: freehand polygon in image-local pixel coordinates (lasso).
export function polygonMask(width: number, height: number, points: { x: number; y: number }[]): PixelMask {
  const mask = createEmptyMask(width, height);
  if (points.length < 3) return mask;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(height, Math.ceil(maxY));
  for (let py = y0; py < y1; py++) {
    const yc = py + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      if ((a.y <= yc && b.y > yc) || (b.y <= yc && a.y > yc)) {
        const t = (yc - a.y) / (b.y - a.y);
        xs.push(a.x + t * (b.x - a.x));
      }
    }
    xs.sort((a, b) => a - b);
    const row = py * width;
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.round(xs[i]));
      const x1 = Math.min(width, Math.round(xs[i + 1]));
      for (let px = x0; px < x1; px++) mask.data[row + px] = 255;
    }
  }
  return mask;
}

// Real flood-fill (contiguous) or global (non-contiguous) color-similarity
// selection over actual pixel data.
export function magicWandMask(imageData: ImageData, startX: number, startY: number, tolerance: number, contiguous: boolean): PixelMask {
  const { width, height, data } = imageData;
  const mask = createEmptyMask(width, height);
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return mask;

  const startIdx = (sy * width + sx) * 4;
  const r0 = data[startIdx];
  const g0 = data[startIdx + 1];
  const b0 = data[startIdx + 2];
  const a0 = data[startIdx + 3];
  const tol = tolerance * tolerance * 4; // squared-distance threshold across r,g,b,a

  const matches = (i: number) => {
    const dr = data[i] - r0;
    const dg = data[i + 1] - g0;
    const db = data[i + 2] - b0;
    const da = data[i + 3] - a0;
    return dr * dr + dg * dg + db * db + da * da <= tol;
  };

  if (!contiguous) {
    for (let p = 0, i = 0; p < mask.data.length; p++, i += 4) {
      if (matches(i)) mask.data[p] = 255;
    }
    return mask;
  }

  const visited = new Uint8Array(width * height);
  const start = sy * width + sx;
  const stack: number[] = [start];
  visited[start] = 1;
  while (stack.length) {
    const p = stack.pop() as number;
    const i = p * 4;
    if (!matches(i)) continue;
    mask.data[p] = 255;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0 && !visited[p - 1]) { visited[p - 1] = 1; stack.push(p - 1); }
    if (x < width - 1 && !visited[p + 1]) { visited[p + 1] = 1; stack.push(p + 1); }
    if (y > 0 && !visited[p - width]) { visited[p - width] = 1; stack.push(p - width); }
    if (y < height - 1 && !visited[p + width]) { visited[p + width] = 1; stack.push(p + width); }
  }
  return mask;
}

export function invertMask(mask: PixelMask): PixelMask {
  const out = createEmptyMask(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) out.data[i] = mask.data[i] ? 0 : 255;
  return out;
}

// Two-pass box blur of the mask — genuinely softens which pixels end up
// selected (and thus what gets deleted/masked), not just a cosmetic edge.
export function featherMask(mask: PixelMask, radius: number): PixelMask {
  if (radius <= 0) return cloneMask(mask);
  const { width, height } = mask;
  const src = mask.data;
  const tmp = new Float32Array(width * height);
  const out = createEmptyMask(width, height);
  const r = Math.max(1, Math.round(radius));

  for (let y = 0; y < height; y++) {
    let sum = 0;
    const row = y * width;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(width - 1, Math.max(0, x))];
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / (r * 2 + 1);
      const add = src[row + Math.min(width - 1, x + r + 1)];
      const sub = src[row + Math.max(0, x - r)];
      sum += add - sub;
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
    for (let y = 0; y < height; y++) {
      out.data[y * width + x] = sum / (r * 2 + 1);
      const add = tmp[Math.min(height - 1, y + r + 1) * width + x];
      const sub = tmp[Math.max(0, y - r) * width + x];
      sum += add - sub;
    }
  }
  return out;
}

export function maskBoundingBox(mask: PixelMask): { x: number; y: number; width: number; height: number } | null {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < mask.height; y++) {
    const row = y * mask.width;
    for (let x = 0; x < mask.width; x++) {
      if (mask.data[row + x] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function maskHasSelection(mask: PixelMask | null): boolean {
  if (!mask) return false;
  for (let i = 0; i < mask.data.length; i++) if (mask.data[i] > 0) return true;
  return false;
}

export interface BoundarySegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// Traces the REAL boundary of a pixel selection mask as a set of unit
// edge segments (a segment is emitted between a selected cell and each
// unselected/out-of-bounds neighbor) — genuine marching-ants geometry
// from the actual mask data, for any shape (rect/ellipse/lasso/wand/
// combined), not a fake dashed rectangle drawn regardless of the real
// selection's shape.
//
// For very large masks, tracing happens at a downsampled resolution and
// segments are scaled back up — an honest, documented tradeoff for a
// purely visual indicator (the real selection mask used for painting/
// fills/masking below is always full resolution, unaffected by this).
export function traceMaskBoundarySegments(mask: PixelMask, maxCells = 4_000_000): BoundarySegment[] {
  const total = mask.width * mask.height;
  const scale = total > maxCells ? Math.ceil(Math.sqrt(total / maxCells)) : 1;
  const w = Math.max(1, Math.ceil(mask.width / scale));
  const h = Math.max(1, Math.ceil(mask.height / scale));

  const selected = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(mask.height - 1, y * scale);
    for (let x = 0; x < w; x++) {
      const sx = Math.min(mask.width - 1, x * scale);
      selected[y * w + x] = mask.data[sy * mask.width + sx] > 127 ? 1 : 0;
    }
  }
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && selected[y * w + x] === 1;

  const segments: BoundarySegment[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const x0 = x * scale;
      const y0 = y * scale;
      const x1 = Math.min(mask.width, x0 + scale);
      const y1 = Math.min(mask.height, y0 + scale);
      if (!at(x, y - 1)) segments.push({ x0, y0, x1, y1: y0 });
      if (!at(x, y + 1)) segments.push({ x0, y0: y1, x1, y1 });
      if (!at(x - 1, y)) segments.push({ x0, y0, x1: x0, y1 });
      if (!at(x + 1, y)) segments.push({ x0: x1, y0, x1, y1 });
    }
  }
  return segments;
}

// Canvas whose alpha channel is the mask — used as the alpha source for
// destination-in/out compositing.
export function maskToCanvas(mask: PixelMask): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imgData = ctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) imgData.data[i * 4 + 3] = mask.data[i];
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Solid-color tint of the mask, for the on-canvas selection preview.
export function maskToTintCanvas(mask: PixelMask, color: [number, number, number], alpha = 0.45): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imgData = ctx.createImageData(mask.width, mask.height);
  const [r, g, b] = color;
  for (let i = 0; i < mask.data.length; i++) {
    const v = mask.data[i];
    imgData.data[i * 4] = r;
    imgData.data[i * 4 + 1] = g;
    imgData.data[i * 4 + 2] = b;
    // Proportional to the mask's own value so a soft/feathered edge shows
    // as a real gradient in the preview, not a hard on/off tint.
    imgData.data[i * 4 + 3] = Math.round((v / 255) * alpha * 255);
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Delete: clears selected pixels to transparent.
export function clearMaskedPixels(source: HTMLCanvasElement, mask: PixelMask): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(maskToCanvas(mask), 0, 0);
  return canvas.toDataURL('image/png');
}

// Apply as mask: keeps only selected pixels, rest become transparent.
export function applyMaskKeepSelected(source: HTMLCanvasElement, mask: PixelMask): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskToCanvas(mask), 0, 0);
  return canvas.toDataURL('image/png');
}

// Extracts just the selection's bounding-box region (masked) as its own
// image — for "copy/cut selection to a new layer".
export function extractMaskedRegion(
  source: HTMLCanvasElement,
  mask: PixelMask
): { dataUrl: string; bbox: { x: number; y: number; width: number; height: number } } | null {
  const bbox = maskBoundingBox(mask);
  if (!bbox) return null;
  const masked = document.createElement('canvas');
  masked.width = source.width;
  masked.height = source.height;
  const mctx = masked.getContext('2d') as CanvasRenderingContext2D;
  mctx.drawImage(source, 0, 0);
  mctx.globalCompositeOperation = 'destination-in';
  mctx.drawImage(maskToCanvas(mask), 0, 0);

  const cropped = document.createElement('canvas');
  cropped.width = bbox.width;
  cropped.height = bbox.height;
  (cropped.getContext('2d') as CanvasRenderingContext2D).drawImage(
    masked,
    bbox.x,
    bbox.y,
    bbox.width,
    bbox.height,
    0,
    0,
    bbox.width,
    bbox.height
  );
  return { dataUrl: cropped.toDataURL('image/png'), bbox };
}
