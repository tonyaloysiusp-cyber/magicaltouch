// Pixel operations for Photo Studio: crop/straighten, rotate, flip,
// resize, spot healing and background fill. Each returns a NEW canvas so
// the previous one can stay in the undo history untouched.

export type PhysUnit = 'px' | 'mm' | 'cm' | 'in';
export const UNIT_LABEL: Record<PhysUnit, string> = { px: 'px', mm: 'mm', cm: 'cm', in: 'in' };
const PER_INCH: Record<Exclude<PhysUnit, 'px'>, number> = { mm: 25.4, cm: 2.54, in: 1 };

export const toPx = (v: number, unit: PhysUnit, dpi: number) => (unit === 'px' ? v : (v / PER_INCH[unit]) * dpi);
export const fromPx = (px: number, unit: PhysUnit, dpi: number) => (unit === 'px' ? px : (px / dpi) * PER_INCH[unit]);
export const fmtNum = (v: number, unit: PhysUnit) => (unit === 'px' ? String(Math.round(v)) : String(Math.round(v * 100) / 100));

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
const ctx2d = (c: HTMLCanvasElement) => {
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = true;
  (x as any).imageSmoothingQuality = 'high';
  return x;
};

/** High-quality resample: halves step by step when shrinking a lot, so
 *  fine detail doesn't turn to jagged noise. */
export function resample(src: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  let cur = src;
  while (cur.width / 2 >= w * 1.05 && cur.height / 2 >= h * 1.05) {
    const half = makeCanvas(cur.width / 2, cur.height / 2);
    ctx2d(half).drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
  }
  const out = makeCanvas(w, h);
  ctx2d(out).drawImage(cur, 0, 0, w, h);
  return out;
}

export interface CropBox { x: number; y: number; w: number; h: number }

/** Largest rectangle of aspect `ratio` (w/h) that fits inside a w×h picture
 *  rotated by `angle` radians, centred. */
export function inscribedRect(w: number, h: number, angle: number, ratio: number): CropBox {
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  // For a rectangle W×H (W = ratio·H) to fit inside the rotated picture,
  // both its axis projections must fit: W·c + H·s ≤ w and W·s + H·c ≤ h.
  const H1 = w / (ratio * c + s);
  const H2 = h / (ratio * s + c);
  const H = Math.min(H1, H2);
  const W = H * ratio;
  return { x: (w - W) / 2, y: (h - H) / 2, w: W, h: H };
}

/** Crops (with optional straighten angle) and resamples to outW×outH. */
export function cropTo(src: HTMLCanvasElement, box: CropBox, angle: number, outW: number, outH: number): HTMLCanvasElement {
  const big = Math.max(box.w / outW, box.h / outH);
  // Draw at native resolution first, then resample — sharper than one big jump.
  const nativeW = Math.max(1, Math.round(box.w)), nativeH = Math.max(1, Math.round(box.h));
  const stage = makeCanvas(nativeW, nativeH);
  const x = ctx2d(stage);
  x.scale(nativeW / box.w, nativeH / box.h);
  x.translate(-box.x, -box.y);
  if (angle) {
    x.translate(src.width / 2, src.height / 2);
    x.rotate(angle);
    x.translate(-src.width / 2, -src.height / 2);
  }
  x.drawImage(src, 0, 0);
  if (Math.round(outW) === nativeW && Math.round(outH) === nativeH) return stage;
  return big >= 1 ? resample(stage, outW, outH) : (() => {
    const up = makeCanvas(outW, outH);
    ctx2d(up).drawImage(stage, 0, 0, up.width, up.height);
    return up;
  })();
}

export function rotate90(src: HTMLCanvasElement, dir: 1 | -1): HTMLCanvasElement {
  const out = makeCanvas(src.height, src.width);
  const x = out.getContext('2d')!;
  x.translate(out.width / 2, out.height / 2);
  x.rotate((dir * Math.PI) / 2);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
}

export function flip(src: HTMLCanvasElement, axis: 'h' | 'v'): HTMLCanvasElement {
  const out = makeCanvas(src.width, src.height);
  const x = out.getContext('2d')!;
  if (axis === 'h') { x.translate(out.width, 0); x.scale(-1, 1); }
  else { x.translate(0, out.height); x.scale(1, -1); }
  x.drawImage(src, 0, 0);
  return out;
}

export function fillBackground(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const out = makeCanvas(src.width, src.height);
  const x = out.getContext('2d')!;
  x.fillStyle = color;
  x.fillRect(0, 0, out.width, out.height);
  x.drawImage(src, 0, 0);
  return out;
}

export function hasTransparency(src: HTMLCanvasElement): boolean {
  const small = makeCanvas(Math.min(src.width, 256), Math.min(src.height, 256));
  small.getContext('2d')!.drawImage(src, 0, 0, small.width, small.height);
  const d = small.getContext('2d')!.getImageData(0, 0, small.width, small.height).data;
  for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true;
  return false;
}

// ------------------------------------------------------------ spot heal

/**
 * Removes spots, blemishes and small objects inside the painted area.
 * Finds the best-matching nearby patch (by comparing the ring of pixels
 * just outside the area), copies it in, corrects its colour to the
 * surroundings and blends the edge softly — so skin and texture keep
 * their grain instead of turning into a smooth smudge.
 */
export function spotHeal(src: HTMLCanvasElement, strokes: { x: number; y: number }[], radius: number): HTMLCanvasElement {
  const W = src.width, H = src.height;
  if (!strokes.length) return src;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of strokes) {
    x0 = Math.min(x0, p.x - radius); y0 = Math.min(y0, p.y - radius);
    x1 = Math.max(x1, p.x + radius); y1 = Math.max(y1, p.y + radius);
  }
  const ring = Math.max(3, Math.round(radius * 0.35));
  const bx = Math.max(0, Math.floor(x0 - ring)), by = Math.max(0, Math.floor(y0 - ring));
  const bw = Math.min(W, Math.ceil(x1 + ring)) - bx, bh = Math.min(H, Math.ceil(y1 + ring)) - by;
  if (bw < 2 || bh < 2) return src;

  // Mask of the painted area, inside the box.
  const mc = makeCanvas(bw, bh);
  const mx = mc.getContext('2d')!;
  mx.fillStyle = '#fff';
  mx.strokeStyle = '#fff';
  mx.lineCap = 'round';
  mx.lineJoin = 'round';
  mx.lineWidth = radius * 2;
  mx.beginPath();
  strokes.forEach((p, i) => (i ? mx.lineTo(p.x - bx, p.y - by) : mx.moveTo(p.x - bx, p.y - by)));
  if (strokes.length === 1) { mx.arc(strokes[0].x - bx, strokes[0].y - by, radius, 0, Math.PI * 2); mx.fill(); }
  else mx.stroke();
  const mask = mx.getImageData(0, 0, bw, bh).data;
  // Ring = pixels within `ring` outside the mask.
  const rc = makeCanvas(bw, bh);
  const rx = rc.getContext('2d')!;
  rx.strokeStyle = '#fff';
  rx.lineCap = 'round';
  rx.lineJoin = 'round';
  rx.lineWidth = radius * 2 + ring * 2;
  rx.beginPath();
  strokes.forEach((p, i) => (i ? rx.lineTo(p.x - bx, p.y - by) : rx.moveTo(p.x - bx, p.y - by)));
  if (strokes.length === 1) { rx.fillStyle = '#fff'; rx.arc(strokes[0].x - bx, strokes[0].y - by, radius + ring, 0, Math.PI * 2); rx.fill(); }
  else rx.stroke();
  const ringMask = rx.getImageData(0, 0, bw, bh).data;

  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  const full = sctx.getImageData(0, 0, W, H).data;
  const at = (x: number, y: number) => (y * W + x) * 4;

  // Candidate source offsets around the area.
  const span = Math.max(bw, bh);
  let best: { dx: number; dy: number; err: number } | null = null;
  for (const dist of [1.1, 1.5, 2.1]) {
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const dx = Math.round(Math.cos(ang) * span * dist), dy = Math.round(Math.sin(ang) * span * dist);
      if (bx + dx < 0 || by + dy < 0 || bx + dx + bw > W || by + dy + bh > H) continue;
      // The source area must not overlap the area being healed.
      if (Math.abs(dx) < bw && Math.abs(dy) < bh) continue;
      let err = 0, cnt = 0;
      for (let y = 0; y < bh; y += 2) for (let x = 0; x < bw; x += 2) {
        const mi = (y * bw + x) * 4;
        if (ringMask[mi] < 128 || mask[mi] > 0) continue;
        const a = at(bx + x, by + y), b = at(bx + x + dx, by + y + dy);
        const e0 = full[a] - full[b], e1 = full[a + 1] - full[b + 1], e2 = full[a + 2] - full[b + 2];
        err += e0 * e0 + e1 * e1 + e2 * e2;
        cnt++;
      }
      if (cnt && (!best || err / cnt < best.err)) best = { dx, dy, err: err / cnt };
    }
  }

  const out = makeCanvas(W, H);
  const octx = out.getContext('2d')!;
  octx.drawImage(src, 0, 0);
  const region = octx.getImageData(bx, by, bw, bh);
  const d = region.data;

  if (!best) {
    // Nowhere to copy from (area touches every edge): smooth fill from the border.
    return out;
  }
  // Colour correction: average difference along the ring.
  let cr = 0, cg = 0, cb = 0, cn = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const mi = (y * bw + x) * 4;
    if (ringMask[mi] < 128 || mask[mi] > 0) continue;
    const a = at(bx + x, by + y), b = at(bx + x + best.dx, by + y + best.dy);
    cr += full[a] - full[b]; cg += full[a + 1] - full[b + 1]; cb += full[a + 2] - full[b + 2]; cn++;
  }
  if (cn) { cr /= cn; cg /= cn; cb /= cn; }
  // Soft edge: blur the mask a little.
  const soft = makeCanvas(bw, bh);
  const sx = soft.getContext('2d')!;
  sx.filter = `blur(${Math.max(1, radius * 0.25)}px)`;
  sx.drawImage(mc, 0, 0);
  const sm = sx.getImageData(0, 0, bw, bh).data;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const mi = (y * bw + x) * 4;
    const alpha = Math.max(mask[mi], sm[mi]) / 255;
    if (alpha <= 0) continue;
    const b = at(bx + x + best.dx, by + y + best.dy);
    d[mi] = d[mi] * (1 - alpha) + (full[b] + cr) * alpha;
    d[mi + 1] = d[mi + 1] * (1 - alpha) + (full[b + 1] + cg) * alpha;
    d[mi + 2] = d[mi + 2] * (1 - alpha) + (full[b + 2] + cb) * alpha;
    d[mi + 3] = d[mi + 3] * (1 - alpha) + full[b + 3] * alpha;
  }
  octx.putImageData(region, bx, by);
  return out;
}
