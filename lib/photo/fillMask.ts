// Content-aware fill and selection helpers for Photo Studio.
//
// contentAwareFill(): fills the selected area from its surroundings.
//   1. A smooth base is grown inwards from the edge with an image pyramid
//      (each level averages only known pixels; holes are filled from the
//      coarser level and relaxed), so colours and light flow naturally.
//   2. Texture is borrowed from the best-matching nearby patch (compared on
//      a ring just outside the hole) and its fine detail is added on top,
//      so grain, fabric or grass doesn't look painted over.
//   3. The result is blended in with a softened mask edge.
// pathToMask(): a pen path (bezier anchors) to a selection mask.
// maskEdges(): outline pixels of a mask, for marching ants on screen.

import { makeCanvas } from './ops';

export interface PenPoint { x: number; y: number; hin?: { x: number; y: number }; hout?: { x: number; y: number } }

export function penPath2D(pts: PenPoint[], close: boolean) {
  const p = new Path2D();
  if (!pts.length) return p;
  p.moveTo(pts[0].x, pts[0].y);
  const seg = (a: PenPoint, b: PenPoint) => {
    const c1 = a.hout || a, c2 = b.hin || b;
    if (c1 === a && c2 === b) p.lineTo(b.x, b.y);
    else p.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
  };
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]);
  if (close && pts.length > 2) { seg(pts[pts.length - 1], pts[0]); p.closePath(); }
  return p;
}

/** SVG path data for the same path (for drawing it on screen). */
export function penPathD(pts: PenPoint[], close: boolean) {
  if (!pts.length) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  const seg = (a: PenPoint, b: PenPoint) => {
    const c1 = a.hout || a, c2 = b.hin || b;
    d += c1 === a && c2 === b ? ` L${b.x},${b.y}` : ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
  };
  for (let i = 1; i < pts.length; i++) seg(pts[i - 1], pts[i]);
  if (close && pts.length > 2) { seg(pts[pts.length - 1], pts[0]); d += ' Z'; }
  return d;
}

export function pathToMask(w: number, h: number, pts: PenPoint[]) {
  const m = makeCanvas(w, h);
  const ctx = m.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fill(penPath2D(pts, true));
  return m;
}

/** Outline pixels of a mask at a given size (indices into a w×h grid). */
export function maskEdges(mask: HTMLCanvasElement, w: number, h: number): Uint32Array {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(mask, 0, 0, w, h);
  const a = ctx.getImageData(0, 0, w, h).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 127;
  const out: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!on(x, y)) continue;
    if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) out.push(y * w + x);
  }
  return Uint32Array.from(out);
}

function bboxOf(alpha: Uint8ClampedArray, W: number, H: number) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Fill the selected area of `src` from its surroundings. */
export function contentAwareFill(src: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
  const W = src.width, H = src.height;
  const mctx = makeCanvas(W, H).getContext('2d', { willReadFrequently: true })!;
  mctx.drawImage(mask, 0, 0, W, H);
  const mfull = mctx.getImageData(0, 0, W, H).data;
  const bb = bboxOf(mfull, W, H);
  const out = makeCanvas(W, H);
  const octx = out.getContext('2d', { willReadFrequently: true })!;
  octx.drawImage(src, 0, 0);
  if (!bb) return out;
  const hw = bb.x1 - bb.x0 + 1, hh = bb.y1 - bb.y0 + 1;
  const pad = Math.round(Math.max(hw, hh) * 0.6) + 8;
  const bx = Math.max(0, bb.x0 - pad), by = Math.max(0, bb.y0 - pad);
  const bw = Math.min(W, bb.x1 + 1 + pad) - bx, bh = Math.min(H, bb.y1 + 1 + pad) - by;
  const img = octx.getImageData(bx, by, bw, bh);
  const d = img.data;
  const N = bw * bh;
  // hole: 1 where we must invent pixels
  const hole = new Uint8Array(N);
  let holeCount = 0;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const v = mfull[((by + y) * W + bx + x) * 4 + 3];
    if (v > 8) { hole[y * bw + x] = 1; holeCount++; }
  }
  if (holeCount === N) return out; // nothing to learn from
  // ---- 1. pyramid fill (RGB as floats)
  type Lvl = { w: number; h: number; c: Float32Array; k: Uint8Array };
  const base: Lvl = { w: bw, h: bh, c: new Float32Array(N * 3), k: new Uint8Array(N) };
  for (let i = 0; i < N; i++) { base.c[i * 3] = d[i * 4]; base.c[i * 3 + 1] = d[i * 4 + 1]; base.c[i * 3 + 2] = d[i * 4 + 2]; base.k[i] = hole[i] ? 0 : 1; }
  const levels: Lvl[] = [base];
  while (levels[levels.length - 1].w > 4 && levels[levels.length - 1].h > 4) {
    const p = levels[levels.length - 1];
    const w = Math.ceil(p.w / 2), h = Math.ceil(p.h / 2);
    const c = new Float32Array(w * h * 3), k = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const sx = x * 2 + i, sy = y * 2 + j;
        if (sx >= p.w || sy >= p.h) continue;
        const q = sy * p.w + sx;
        if (!p.k[q]) continue;
        r += p.c[q * 3]; g += p.c[q * 3 + 1]; b += p.c[q * 3 + 2]; n++;
      }
      const o = y * w + x;
      if (n) { c[o * 3] = r / n; c[o * 3 + 1] = g / n; c[o * 3 + 2] = b / n; k[o] = 1; }
    }
    levels.push({ w, h, c, k });
  }
  // coarsest: fill any unknown with the mean of known
  const top = levels[levels.length - 1];
  {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < top.w * top.h; i++) if (top.k[i]) { r += top.c[i * 3]; g += top.c[i * 3 + 1]; b += top.c[i * 3 + 2]; n++; }
    n = Math.max(1, n);
    for (let i = 0; i < top.w * top.h; i++) if (!top.k[i]) { top.c[i * 3] = r / n; top.c[i * 3 + 1] = g / n; top.c[i * 3 + 2] = b / n; }
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l], C = levels[l + 1];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const o = y * L.w + x;
      if (L.k[o]) continue;
      const q = Math.min(C.h - 1, y >> 1) * C.w + Math.min(C.w - 1, x >> 1);
      L.c[o * 3] = C.c[q * 3]; L.c[o * 3 + 1] = C.c[q * 3 + 1]; L.c[o * 3 + 2] = C.c[q * 3 + 2];
    }
    // relax unknown pixels toward their neighbours
    const iters = l === 0 ? 6 : 4;
    for (let it = 0; it < iters; it++) for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      const o = y * L.w + x;
      if (L.k[o]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      const add = (xx: number, yy: number) => { if (xx < 0 || yy < 0 || xx >= L.w || yy >= L.h) return; const q = yy * L.w + xx; r += L.c[q * 3]; g += L.c[q * 3 + 1]; b += L.c[q * 3 + 2]; n++; };
      add(x - 1, y); add(x + 1, y); add(x, y - 1); add(x, y + 1);
      if (n) { L.c[o * 3] = r / n; L.c[o * 3 + 1] = g / n; L.c[o * 3 + 2] = b / n; }
    }
  }
  // ---- 2. patch filling (onion peel): tile by tile from the edge inwards,
  // each tile copied from the best-matching fully-known tile nearby, judged on
  // the pixels already known around it. The smooth base guides the match so
  // light and colour stay consistent across the hole.
  const res = new Uint8ClampedArray(d);
  const known = new Uint8Array(N);
  for (let i = 0; i < N; i++) known[i] = hole[i] ? 0 : 1;
  for (let i = 0; i < N; i++) if (hole[i]) { res[i * 4] = base.c[i * 3]; res[i * 4 + 1] = base.c[i * 3 + 1]; res[i * 4 + 2] = base.c[i * 3 + 2]; res[i * 4 + 3] = 255; }
  const T = Math.max(6, Math.min(20, Math.round(Math.max(hw, hh) / 30)));
  const M = Math.max(3, Math.round(T / 2));
  // integral image of the hole, to find fully-known source tiles fast
  const I = new Uint32Array((bw + 1) * (bh + 1));
  for (let y = 0; y < bh; y++) { let row = 0; for (let x = 0; x < bw; x++) { row += hole[y * bw + x]; I[(y + 1) * (bw + 1) + x + 1] = I[y * (bw + 1) + x + 1] + row; } }
  const holeIn = (x: number, y: number, w: number, h: number) => I[(y + h) * (bw + 1) + x + w] - I[y * (bw + 1) + x + w] - I[(y + h) * (bw + 1) + x] + I[y * (bw + 1) + x];
  const S = T + 2 * M;
  const cands: number[] = [];
  const cstep = Math.max(2, Math.round(T / 2));
  for (let y = 0; y + S <= bh; y += cstep) for (let x = 0; x + S <= bw; x += cstep) if (!holeIn(x, y, S, S)) cands.push(y * bw + x);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  while (cands.length > 1500) cands.splice(Math.floor(rnd() * cands.length), 1);
  if (cands.length) {
    const gx0 = bb.x0 - bx, gy0 = bb.y0 - by;
    const cols = Math.ceil(hw / T), rows = Math.ceil(hh / T);
    const done = new Uint8Array(cols * rows);
    // tiles with no hole pixels are already done
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = gx0 + c * T, y = gy0 + r * T;
      if (!holeIn(x, y, Math.min(T, bw - x), Math.min(T, bh - y))) done[r * cols + c] = 1;
    }
    let left = done.reduce((a, v) => a + (v ? 0 : 1), 0);
    let guard = 0;
    while (left > 0 && guard++ < 10000) {
      // the open tile with the most known pixels around it
      let bestTile = -1, bestKnown = -1;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (done[r * cols + c]) continue;
        const x = gx0 + c * T - M, y = gy0 + r * T - M;
        let k = 0;
        for (let j = 0; j < S; j += 2) for (let i = 0; i < S; i += 2) {
          const xx = x + i, yy = y + j;
          if (xx >= 0 && yy >= 0 && xx < bw && yy < bh && known[yy * bw + xx]) k++;
        }
        if (k > bestKnown) { bestKnown = k; bestTile = r * cols + c; }
      }
      if (bestTile < 0) break;
      const tr = Math.floor(bestTile / cols), tc = bestTile % cols;
      const tx = gx0 + tc * T - M, ty = gy0 + tr * T - M;
      // match: SSD on known pixels (plus a light pull toward the smooth base on unknown ones)
      let bc = cands[0], be = Infinity;
      for (const cpos of cands) {
        const cx0 = cpos % bw, cy0 = (cpos - cx0) / bw;
        // nearby sources are preferred (coherent texture, same lighting)
        let e = Math.hypot(cx0 - tx, cy0 - ty) * 0.6 * S;
        for (let j = 0; j < S && e < be; j += 2) for (let i = 0; i < S; i += 2) {
          const xx = tx + i, yy = ty + j;
          if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
          const o = yy * bw + xx, q = (cy0 + j) * bw + cx0 + i;
          const wgt = known[o] ? 1 : 0.04;
          const dr = res[o * 4] - d[q * 4], dg = res[o * 4 + 1] - d[q * 4 + 1], db = res[o * 4 + 2] - d[q * 4 + 2];
          e += wgt * (dr * dr + dg * dg + db * db);
        }
        if (e < be) { be = e; bc = cpos; }
      }
      const cx0 = bc % bw, cy0 = (bc - cx0) / bw;
      // copy the tile (and its margin where still unknown)
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const xx = tx + i, yy = ty + j;
        if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) continue;
        const o = yy * bw + xx;
        if (!hole[o]) continue;
        const q = (cy0 + j) * bw + cx0 + i;
        const inCore = i >= M && j >= M && i < M + T && j < M + T;
        if (!known[o] && inCore) {
          res[o * 4] = d[q * 4]; res[o * 4 + 1] = d[q * 4 + 1]; res[o * 4 + 2] = d[q * 4 + 2]; res[o * 4 + 3] = 255;
          known[o] = 2;
        } else if (known[o] === 2) {
          // overlap with an earlier tile: cross-fade so no seam shows
          const di = Math.min(i, j, S - 1 - i, S - 1 - j);
          const a = Math.min(1, di / M) * 0.5;
          for (let ch = 0; ch < 3; ch++) res[o * 4 + ch] = res[o * 4 + ch] * (1 - a) + d[q * 4 + ch] * a;
        }
      }
      done[bestTile] = 1;
      left--;
    }
    // soften tile seams inside the hole (one light 3x3 pass)
    const tmp = new Uint8ClampedArray(res);
    for (let y = 1; y < bh - 1; y++) for (let x = 1; x < bw - 1; x++) {
      const o = y * bw + x;
      if (!hole[o]) continue;
      const lx = (x - gx0) % T, ly = (y - gy0) % T;
      if (lx > 1 && lx < T - 2 && ly > 1 && ly < T - 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        let s2 = 0;
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s2 += tmp[((y + j) * bw + x + i) * 4 + ch];
        res[o * 4 + ch] = s2 / 9;
      }
    }
  }
  const fillC = makeCanvas(bw, bh);
  fillC.getContext('2d')!.putImageData(new ImageData(res, bw, bh), 0, 0);
  // soft blend: feathered copy of the mask
  const soft = makeCanvas(bw, bh);
  const sctx = soft.getContext('2d')!;
  const f = Math.max(1, Math.round(Math.min(hw, hh) * 0.03));
  sctx.filter = `blur(${f}px)`;
  sctx.drawImage(mask, bx, by, bw, bh, 0, 0, bw, bh);
  sctx.filter = 'none';
  sctx.drawImage(mask, bx, by, bw, bh, 0, 0, bw, bh); // keep the inside fully filled
  const fctx = fillC.getContext('2d')!;
  fctx.globalCompositeOperation = 'destination-in';
  fctx.drawImage(soft, 0, 0);
  octx.drawImage(fillC, bx, by);
  return out;
}
