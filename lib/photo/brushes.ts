// Retouch brushes that paint straight onto the picture's pixels:
// smudge, dodge (lighten), burn (darken), blur, sharpen, and face tools —
// enlarge (eyes), shrink (nose), reshape (push), recolour (hair) and whiten
// (teeth, eye whites).
// A stroke is a list of points; the same stroke is first painted live on
// the preview copy, then replayed on the full-size picture when the
// customer lets go, so the result matches what they saw.

export type BrushKind = 'smudge' | 'dodge' | 'burn' | 'blur' | 'sharpen' | 'bloat' | 'pinch' | 'push' | 'recolour' | 'whiten';

export interface BrushOpts {
  radius: number; // in pixels of the image being painted
  strength: number; // 0..1
  hardness: number; // 0..1
  color?: [number, number, number]; // recolour target
}

export interface Box { x0: number; y0: number; x1: number; y1: number }

/** Paints a stroke into `img` (mutated). Call `to(x, y)` for each pointer
 *  position; it fills in evenly spaced dabs and returns the changed area. */
export function createStroke(img: ImageData, kind: BrushKind, opts: BrushOpts) {
  const { width: W, height: H } = img;
  const px = img.data;
  const R = Math.max(1, opts.radius);
  const ri = Math.ceil(R);
  const size = ri * 2 + 1;
  // Brush falloff mask.
  const mask = new Float32Array(size * size);
  const hard = Math.min(0.98, Math.max(0, opts.hardness));
  for (let y = -ri; y <= ri; y++)
    for (let x = -ri; x <= ri; x++) {
      const d = Math.hypot(x, y) / R;
      let m = 0;
      if (d <= hard) m = 1;
      else if (d < 1) {
        const t = (d - hard) / (1 - hard);
        m = 1 - t * t * (3 - 2 * t);
      }
      mask[(y + ri) * size + (x + ri)] = m;
    }
  // Smudge carries paint along the stroke.
  let carry: Float32Array | null = null;
  let last: { x: number; y: number } | null = null;
  const spacing = Math.max(1, R * (kind === 'smudge' ? 0.12 : kind === 'push' ? 0.15 : 0.25));
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };

  const sample = (cx: number, cy: number) => {
    const out = new Float32Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      const yy = Math.min(H - 1, Math.max(0, cy - ri + y));
      for (let x = 0; x < size; x++) {
        const xx = Math.min(W - 1, Math.max(0, cx - ri + x));
        const s = (yy * W + xx) * 4, o = (y * size + x) * 4;
        out[o] = px[s]; out[o + 1] = px[s + 1]; out[o + 2] = px[s + 2]; out[o + 3] = px[s + 3];
      }
    }
    return out;
  };

  const dab = (fx: number, fy: number) => {
    const cx = Math.round(fx), cy = Math.round(fy);
    const st = opts.strength;
    let local: Float32Array | null = null;
    if (kind === 'blur' || kind === 'sharpen' || kind === 'bloat' || kind === 'pinch' || kind === 'push') local = sample(cx, cy);
    const warp = kind === 'bloat' || kind === 'pinch' || kind === 'push';
    let dirX = 0, dirY = 0;
    if (kind === 'push' && last) { const dl = Math.hypot(fx - last.x, fy - last.y) || 1; dirX = ((fx - last.x) / dl) * spacing; dirY = ((fy - last.y) / dl) * spacing; }
    if (kind === 'push' && !last) return;
    const bil = (L: Float32Array, sx: number, sy: number, c: number) => {
      const x0 = Math.max(0, Math.min(size - 1, Math.floor(sx))), y0 = Math.max(0, Math.min(size - 1, Math.floor(sy)));
      const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1);
      const tx = Math.max(0, Math.min(1, sx - x0)), ty = Math.max(0, Math.min(1, sy - y0));
      const a = L[(y0 * size + x0) * 4 + c], b = L[(y0 * size + x1) * 4 + c], d = L[(y1 * size + x0) * 4 + c], e = L[(y1 * size + x1) * 4 + c];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
    };
    const tc = opts.color;
    const tcHsl = tc ? rgbHsl(tc[0], tc[1], tc[2]) : null;
    if (kind === 'smudge' && !carry) {
      carry = sample(cx, cy);
      return;
    }
    for (let y = 0; y < size; y++) {
      const yy = cy - ri + y;
      if (yy < 0 || yy >= H) continue;
      for (let x = 0; x < size; x++) {
        const xx = cx - ri + x;
        if (xx < 0 || xx >= W) continue;
        const m = mask[y * size + x];
        if (m <= 0) continue;
        const p = (yy * W + xx) * 4;
        const o = (y * size + x) * 4;
        if (warp && local) {
          // Liquify: sample from a point nearer the centre (enlarge), further out (shrink) or behind the stroke (push).
          const rx = x - ri, ry = y - ri;
          let sx: number, sy: number;
          if (kind === 'push') { sx = x - dirX * m * st * 1.2; sy = y - dirY * m * st * 1.2; }
          else { const f = kind === 'bloat' ? 1 - st * 0.22 * m : 1 + st * 0.22 * m; sx = ri + rx * f; sy = ri + ry * f; }
          for (let c = 0; c < 4; c++) px[p + c] = bil(local, sx, sy, c);
        } else if (kind === 'recolour' && tcHsl) {
          // Keep each pixel's light and shade, take the new hue and colour.
          const r = px[p], g = px[p + 1], b = px[p + 2];
          const [, , l] = rgbHsl(r, g, b);
          const L2 = Math.max(0, Math.min(1, l * 0.85 + tcHsl[2] * 0.15));
          const [nr, ng, nb] = hslRgb(tcHsl[0], tcHsl[1], L2);
          const k = m * st * 0.35;
          px[p] = r + (nr - r) * k; px[p + 1] = g + (ng - g) * k; px[p + 2] = b + (nb - b) * k;
        } else if (kind === 'whiten') {
          const r = px[p], g = px[p + 1], b = px[p + 2];
          const avg = (r + g + b) / 3;
          const k = m * st * 0.12;
          // Less yellow (desaturate) and a touch brighter.
          px[p] = r + (avg - r) * k * 1.5 + (255 - r) * k * 0.5;
          px[p + 1] = g + (avg - g) * k * 1.5 + (255 - g) * k * 0.5;
          px[p + 2] = b + (avg - b) * k * 1.5 + (255 - b) * k * 0.6;
        } else if (kind === 'smudge') {
          const k = m * st;
          for (let c = 0; c < 4; c++) {
            const cur = px[p + c];
            const nv = cur + (carry![o + c] - cur) * k;
            px[p + c] = nv;
            // The brush picks up a little of what it passes over.
            carry![o + c] = carry![o + c] + (nv - carry![o + c]) * 0.18;
          }
        } else if (kind === 'dodge' || kind === 'burn') {
          const k = m * st * 0.12;
          const r = px[p], g = px[p + 1], b = px[p + 2];
          const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
          const mid = 0.35 + 0.65 * (1 - Math.abs(L - 0.5) * 1.6); // gentler on extremes
          const f = k * Math.max(0.15, mid);
          if (kind === 'dodge') {
            px[p] = r + (255 - r) * f; px[p + 1] = g + (255 - g) * f; px[p + 2] = b + (255 - b) * f;
          } else {
            px[p] = r * (1 - f); px[p + 1] = g * (1 - f); px[p + 2] = b * (1 - f);
          }
        } else if (local) {
          // 5×5 neighbourhood average from the sample.
          let sr = 0, sg = 0, sb = 0, n = 0;
          for (let dy = -2; dy <= 2; dy++) {
            const ly = Math.min(size - 1, Math.max(0, y + dy));
            for (let dx = -2; dx <= 2; dx++) {
              const lx = Math.min(size - 1, Math.max(0, x + dx));
              const q = (ly * size + lx) * 4;
              sr += local[q]; sg += local[q + 1]; sb += local[q + 2]; n++;
            }
          }
          sr /= n; sg /= n; sb /= n;
          const k = m * st * (kind === 'blur' ? 0.5 : 0.35);
          const r = local[o], g = local[o + 1], b = local[o + 2];
          if (kind === 'blur') {
            px[p] = r + (sr - r) * k; px[p + 1] = g + (sg - g) * k; px[p + 2] = b + (sb - b) * k;
          } else {
            px[p] = r + (r - sr) * k; px[p + 1] = g + (g - sg) * k; px[p + 2] = b + (b - sb) * k;
          }
        }
      }
    }
    for (const b of [box, move]) {
      b.x0 = Math.min(b.x0, cx - ri);
      b.y0 = Math.min(b.y0, cy - ri);
      b.x1 = Math.max(b.x1, cx + ri + 1);
      b.y1 = Math.max(b.y1, cy + ri + 1);
    }
  };
  let move: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const clip = (b: Box): Box | null => (isFinite(b.x0) ? { x0: Math.max(0, b.x0), y0: Math.max(0, b.y0), x1: Math.min(W, b.x1), y1: Math.min(H, b.y1) } : null);

  return {
    /** Moves the brush to (x, y), painting along the way. Returns the area changed by this move. */
    to(x: number, y: number): Box | null {
      move = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      if (!last) {
        dab(x, y);
        last = { x, y };
      } else {
        const dist = Math.hypot(x - last.x, y - last.y);
        if (dist < spacing) return null;
        const steps = Math.floor(dist / spacing);
        const lx = last.x, ly = last.y;
        for (let i = 1; i <= steps; i++) {
          const t = (i * spacing) / dist;
          dab(lx + (x - lx) * t, ly + (y - ly) * t);
        }
        const t = (steps * spacing) / dist;
        last = { x: lx + (x - lx) * t, y: ly + (y - ly) * t };
      }
      return clip(move);
    },
    bounds: () => clip(box),
  };
}

/** Replays a stroke recorded on a smaller copy onto a bigger picture. */
export function replayStroke(canvas: HTMLCanvasElement, kind: BrushKind, opts: BrushOpts, pts: { x: number; y: number }[], scale: number): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const stroke = createStroke(img, kind, { ...opts, radius: opts.radius * scale });
  pts.forEach((p) => stroke.to(p.x * scale, p.y * scale));
  ctx.putImageData(img, 0, 0);
  return out;
}

function rgbHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslRgb(h: number, s: number, l: number): [number, number, number] {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
