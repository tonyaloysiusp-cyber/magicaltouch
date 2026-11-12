// Portrait cut-out for ID photos, on top of the in-browser subject model.
// The raw model mask is small (320 px) and soft, which leaves blotchy
// edges, holes in light shirts and a halo of the old wall colour. This:
//  1. runs the model on a letterboxed square (no squashing of the person),
//  2. keeps the person (largest region + anything joined to the bottom
//     edge) and fills holes inside them,
//  3. snaps the edge to the real photo with a guided filter (hair and
//     shoulders follow the picture, not the 320-px mask),
//  4. removes the old background colour from the soft edge pixels, so a
//     new white background has no coloured fringe.
// The pure parts (box blur, guided filter, region clean-up, colour clean-up)
// take plain arrays so they can be unit-tested.

/** Box blur of a w×h float image with radius r (integral image, O(n)). */
export function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const W = w + 1;
  const sat = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += src[y * w + x]; sat[(y + 1) * W + x + 1] = sat[y * W + x + 1] + row; }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const s = sat[y1 * W + x1] - sat[y0 * W + x1] - sat[y1 * W + x0] + sat[y0 * W + x0];
      out[y * w + x] = s / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

/** Guided filter (He et al.): smooths p while following the edges of guide I. */
export function guidedFilter(I: Float32Array, p: Float32Array, w: number, h: number, r: number, eps: number): Float32Array {
  const n = w * h;
  const Ip = new Float32Array(n), II = new Float32Array(n);
  for (let i = 0; i < n; i++) { Ip[i] = I[i] * p[i]; II[i] = I[i] * I[i]; }
  const mI = boxBlur(I, w, h, r), mP = boxBlur(p, w, h, r), mIp = boxBlur(Ip, w, h, r), mII = boxBlur(II, w, h, r);
  const a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = mII[i] - mI[i] * mI[i];
    a[i] = (mIp[i] - mI[i] * mP[i]) / (v + eps);
    b[i] = mP[i] - a[i] * mI[i];
  }
  const ma = boxBlur(a, w, h, r), mb = boxBlur(b, w, h, r);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
  return q;
}

/**
 * Binary person mask clean-up: keeps the largest region plus regions that
 * touch the bottom edge (shoulders) and are not tiny, then fills holes
 * (background pockets not connected to the top/left/right border).
 */
export function cleanRegions(mask: Uint8Array, w: number, h: number): Uint8Array {
  const n = w * h;
  const lab = new Int32Array(n).fill(-1);
  const sizes: number[] = [], bottom: boolean[] = [];
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!mask[s] || lab[s] >= 0) continue;
    const id = sizes.length; let sp = 0, size = 0, touches = false;
    stack[sp++] = s; lab[s] = id;
    while (sp) {
      const i = stack[--sp]; size++;
      const x = i % w, y = (i / w) | 0;
      if (y === h - 1) touches = true;
      if (x > 0 && mask[i - 1] && lab[i - 1] < 0) { lab[i - 1] = id; stack[sp++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && lab[i + 1] < 0) { lab[i + 1] = id; stack[sp++] = i + 1; }
      if (y > 0 && mask[i - w] && lab[i - w] < 0) { lab[i - w] = id; stack[sp++] = i - w; }
      if (y < h - 1 && mask[i + w] && lab[i + w] < 0) { lab[i + w] = id; stack[sp++] = i + w; }
    }
    sizes.push(size); bottom.push(touches);
  }
  const out = new Uint8Array(n);
  if (!sizes.length) return out;
  const big = sizes.indexOf(Math.max(...sizes));
  const keep = sizes.map((sz, i) => i === big || (bottom[i] && sz > n * 0.01));
  for (let i = 0; i < n; i++) if (lab[i] >= 0 && keep[lab[i]]) out[i] = 1;
  // Fill holes: flood the background from the top, left and right borders.
  const outside = new Uint8Array(n); let sp = 0;
  const push = (i: number) => { if (!out[i] && !outside[i]) { outside[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < w; x++) push(x);
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) {
    const i = stack[--sp]; const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  // Pockets touching only the bottom edge between the arms stay background
  // only if they are big; small ones are filled.
  for (let i = 0; i < n; i++) if (!out[i] && !outside[i]) out[i] = 1;
  return out;
}

/**
 * 0–1 map of how far each pixel's colour is from the local background
 * colour (estimated from nearby pixels marked as clearly background).
 */
export function bgDistance(rgba: Uint8ClampedArray, background: Uint8Array, w: number, h: number, r: number): Float32Array {
  const n = w * h;
  const wb = new Float32Array(n);
  for (let i = 0; i < n; i++) wb[i] = background[i] ? 1 : 0;
  // Grow the background weights inwards a little so the edge has a local estimate.
  const sw = boxBlur(wb, w, h, r);
  let gr = 0, gg = 0, gb = 0, gn = 0;
  for (let i = 0; i < n; i++) if (wb[i]) { gr += rgba[i * 4]; gg += rgba[i * 4 + 1]; gb += rgba[i * 4 + 2]; gn++; }
  const glob = gn ? [gr / gn, gg / gn, gb / gn] : [255, 255, 255];
  const B: Float32Array[] = [];
  for (let c = 0; c < 3; c++) {
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = rgba[i * 4 + c] * wb[i];
    B.push(boxBlur(ch, w, h, r));
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = Math.min(1, sw[i] * 4); // local estimate where there is enough background nearby
    let d2 = 0;
    for (let c = 0; c < 3; c++) {
      const bc = sw[i] > 1e-4 ? B[c][i] / sw[i] : glob[c];
      const b = bc * t + glob[c] * (1 - t);
      d2 += (rgba[i * 4 + c] - b) ** 2;
    }
    out[i] = Math.min(1, Math.sqrt(d2) / 110);
  }
  return out;
}

/**
 * Removes the old background colour from semi-transparent edge pixels:
 * colour = (observed − (1−α)·background) / α, with the background estimated
 * locally from nearby pixels that are clearly background.
 */
export function decontaminate(rgba: Uint8ClampedArray, alpha: Float32Array, w: number, h: number, r: number): void {
  const n = w * h;
  const wb = new Float32Array(n);
  for (let i = 0; i < n; i++) wb[i] = alpha[i] < 0.15 ? 1 : 0;
  const sw = boxBlur(wb, w, h, r);
  for (let c = 0; c < 3; c++) {
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = rgba[i * 4 + c] * wb[i];
    const bc = boxBlur(ch, w, h, r);
    for (let i = 0; i < n; i++) {
      const a = alpha[i];
      if (a <= 0.02 || a >= 0.97 || sw[i] < 1e-3) continue;
      const B = bc[i] / sw[i];
      const o = rgba[i * 4 + c];
      const F = (o - (1 - a) * B) / Math.max(a, 0.25);
      // Limit the change so a slightly-too-low alpha cannot tint the skin.
      rgba[i * 4 + c] = Math.max(0, Math.min(255, Math.max(o - 90, Math.min(o + 90, F))));
    }
  }
}

export interface Matte { w: number; h: number; alpha: Float32Array; rgb: Uint8ClampedArray; orig: Uint8ClampedArray; bounds: { x: number; y: number; w: number; h: number } | null; head: { top: number; chin: number; cx: number } | null }

/**
 * Head box from the alpha (0–1 units): crown = first row with the person,
 * chin ≈ where the silhouette is narrowest below the head before the
 * shoulders widen (the neck), centre = middle of the head rows.
 */
export function headFromAlpha(alpha: Float32Array, w: number, h: number): { top: number; chin: number; cx: number } | null {
  const rows: { l: number; r: number }[] = [];
  let top = -1;
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) if (alpha[y * w + x] > 0.5) { if (l < 0) l = x; r = x; }
    rows.push({ l, r });
    if (top < 0 && r - l > w * 0.02) top = y;
  }
  if (top < 0) return null;
  // Widest row in the head zone (top + 5%…top + 35% of the picture height).
  let maxW = 0, maxY = top;
  for (let y = top; y < Math.min(h, top + h * 0.35); y++) { const ww = rows[y].r - rows[y].l; if (ww > maxW) { maxW = ww; maxY = y; } }
  // Neck: narrowest width below the widest head row, before the shoulders
  // widen past 1.5× the head width; the jaw meets the neck at the first row
  // that is (nearly) that narrow, and the chin sits a little below that.
  let minW = Infinity, end = h - 1;
  for (let y = maxY; y < h; y++) {
    const ww = rows[y].r - rows[y].l;
    if (ww < 0) continue;
    if (ww > maxW * 1.5) { end = y; break; }
    if (ww < minW) minW = ww;
  }
  let neck = -1;
  for (let y = maxY; y < end; y++) { const ww = rows[y].r - rows[y].l; if (ww >= 0 && ww <= minW * 1.05) { neck = y; break; } }
  if (neck < 0 || neck - top < h * 0.08) return null;
  const chin = Math.min(h - 1, top + (neck - top) * 1.05);
  let sx = 0, cnt = 0;
  for (let y = top; y < chin; y++) if (rows[y].r >= 0) { sx += (rows[y].l + rows[y].r) / 2; cnt++; }
  return { top: top / h, chin: chin / h, cx: cnt ? sx / cnt / w : 0.5 };
}

/** Full portrait cut-out. Returns the matte at working size (≤ maxSide). */
export async function portraitMatte(img: HTMLImageElement, onStatus?: (s: string) => void, maxSide = 1400): Promise<Matte> {
  const bgr = await import('./editor/bgRemove');
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const k = Math.min(1, maxSide / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
  const work = document.createElement('canvas'); work.width = w; work.height = h;
  const wctx = work.getContext('2d', { willReadFrequently: true })!;
  wctx.drawImage(img, 0, 0, w, h);
  const px = wctx.getImageData(0, 0, w, h);

  // 1. Letterbox into a square, padded with the average border colour.
  const S = Math.max(w, h);
  const sq = document.createElement('canvas'); sq.width = S; sq.height = S;
  const sctx = sq.getContext('2d')!;
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (let x = 0; x < w; x += 4) for (const y of [0, h - 1]) { const i = (y * w + x) * 4; br += px.data[i]; bg += px.data[i + 1]; bb += px.data[i + 2]; bn++; }
  for (let y = 0; y < h; y += 4) for (const x of [0, w - 1]) { const i = (y * w + x) * 4; br += px.data[i]; bg += px.data[i + 1]; bb += px.data[i + 2]; bn++; }
  sctx.fillStyle = `rgb(${Math.round(br / bn)},${Math.round(bg / bn)},${Math.round(bb / bn)})`;
  sctx.fillRect(0, 0, S, S);
  const ox = (S - w) / 2, oy = (S - h) / 2;
  sctx.drawImage(work, ox, oy);
  const m = await bgr.detectSubject(sq, onStatus);
  onStatus?.('Refining the edges…');

  // Upsample the mask to the working size (bilinear).
  const n = m.size, coarse = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = ((x + ox) / S) * n - 0.5, v = ((y + oy) / S) * n - 0.5;
    const x0 = Math.max(0, Math.min(n - 1, Math.floor(u))), y0 = Math.max(0, Math.min(n - 1, Math.floor(v)));
    const x1 = Math.min(n - 1, x0 + 1), y1 = Math.min(n - 1, y0 + 1), fx = Math.max(0, Math.min(1, u - x0)), fy = Math.max(0, Math.min(1, v - y0));
    const a = m.data[y0 * n + x0] * (1 - fx) + m.data[y0 * n + x1] * fx, b = m.data[y1 * n + x0] * (1 - fx) + m.data[y1 * n + x1] * fx;
    coarse[y * w + x] = a * (1 - fy) + b * fy;
  }

  // 2. Keep the person, fill holes.
  const bin = new Uint8Array(w * h);
  for (let i = 0; i < bin.length; i++) bin[i] = coarse[i] > 0.5 ? 1 : 0;
  const clean = cleanRegions(bin, w, h);
  const p = new Float32Array(w * h);
  for (let i = 0; i < p.length; i++) p[i] = clean[i] ? 1 : coarse[i] * 0.4;

  // 3. Edge-aware refinement. The guide is how different each pixel is from
  // the local wall colour (skin and a green or beige wall can have the same
  // brightness, so brightness alone cannot find the edge).
  const sure = new Uint8Array(w * h); // clearly background: outside the person and low in the model mask
  for (let i = 0; i < sure.length; i++) sure[i] = !clean[i] && coarse[i] < 0.2 ? 1 : 0;
  const I = bgDistance(px.data, sure, w, h, Math.max(8, Math.round(Math.max(w, h) / 24)));
  const r = Math.max(3, Math.round(Math.min(w, h) / 160));
  const q = guidedFilter(I, p, w, h, r, 2e-3);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < alpha.length; i++) {
    let a = Math.max(0, Math.min(1, (q[i] - 0.15) / 0.7));
    // On the edge (soft part of the model mask, e.g. between hair strands),
    // a pixel that looks like the wall is wall.
    // Pixels part-way between wall and person colour are partly transparent.
    if (a < 0.98 || coarse[i] < 0.97) a = Math.min(a, Math.max(0, (I[i] - 0.05) / 0.5));
    alpha[i] = a;
  }

  // 4. Colour clean-up on the soft edge.
  const rgb = new Uint8ClampedArray(px.data);
  decontaminate(rgb, alpha, w, h, Math.max(6, r * 3));

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x] > 0.5) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const bounds = maxX < 0 ? null : { x: minX / w, y: minY / h, w: (maxX - minX + 1) / w, h: (maxY - minY + 1) / h };
  return { w, h, alpha, rgb, orig: px.data, bounds, head: headFromAlpha(alpha, w, h) };
}

/** Matte → transparent canvas (alpha edits from brushes are already in `alpha`). */
export function matteCanvas(mt: Matte): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = mt.w; c.height = mt.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(mt.w, mt.h);
  for (let i = 0; i < mt.alpha.length; i++) {
    img.data[i * 4] = mt.rgb[i * 4]; img.data[i * 4 + 1] = mt.rgb[i * 4 + 1]; img.data[i * 4 + 2] = mt.rgb[i * 4 + 2];
    img.data[i * 4 + 3] = Math.round(mt.alpha[i] * 255);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Paints the alpha with a soft round brush (restore = 1, erase = 0). */
export function brushAlpha(mt: Matte, x: number, y: number, radius: number, restore: boolean): void {
  const original = mt.orig;
  const r = Math.max(1, radius), r2 = r * r;
  const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(mt.w - 1, Math.ceil(x + r));
  const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(mt.h - 1, Math.ceil(y + r));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const d2 = (xx - x) ** 2 + (yy - y) ** 2;
    if (d2 > r2) continue;
    const f = Math.min(1, (1 - Math.sqrt(d2) / r) * 2.5); // soft edge
    const i = yy * mt.w + xx;
    mt.alpha[i] = restore ? Math.max(mt.alpha[i], f) : Math.min(mt.alpha[i], 1 - f);
    if (restore) for (let c = 0; c < 3; c++) mt.rgb[i * 4 + c] = original[i * 4 + c] * f + mt.rgb[i * 4 + c] * (1 - f);
  }
}
