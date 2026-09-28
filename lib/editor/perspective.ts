// ---------------------------------------------------------------------
// lib/editor/perspective.ts
// A real projective transform (corner-pin distort / "Perspective"): given
// 4 destination corners, warps the source image's actual pixels into
// that quadrilateral via a genuine homography (4-point DLT + Gaussian
// elimination) and inverse-mapped bilinear sampling -- not a CSS filter,
// not a skew pretending to be perspective. Fabric.js has no built-in
// projective transform for image objects, so this bakes the warp into a
// new raster the same way Crop/Resize already bake their own pixel
// operations in PhotoEditorWorkspace.
//
// Scope note: no live per-frame pixel preview while dragging handles --
// that would need a second rendering path (WebGL or CSS matrix3d) kept
// in exact sync with this bake, which is real added risk for a cosmetic
// win. The handle drag shows a live outline of the target shape instead;
// the actual warped pixels appear the instant you click Apply, same
// "position, then commit" flow Crop and Resize already use in this file.
// ---------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

function solveLinearSystem(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivotRow][col])) pivotRow = r;
    }
    [m[col], m[pivotRow]] = [m[pivotRow], m[col]];
    const pivot = m[col][col];
    if (Math.abs(pivot) < 1e-10) continue; // degenerate (collinear points) -- best effort, caller clamps handles to avoid this
    for (let c = col; c <= n; c++) m[col][c] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col];
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }
  return m.map((row) => row[n]);
}

/** The 3x3 projective matrix H (row-major, h33 = 1, returned flat as 9 numbers) mapping each `from[i]` to `to[i]`. */
export function computeHomography(from: Point[], to: Point[]): number[] {
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = from[i];
    const { x: dx, y: dy } = to[i];
    a.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    a.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }
  const h = solveLinearSystem(a, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function applyHomography(h: number[], p: Point): Point {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  if (Math.abs(w) < 1e-10) return { x: NaN, y: NaN };
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

function bilinearSample(data: Uint8ClampedArray, w: number, h: number, x: number, y: number): [number, number, number, number] {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
    const bottom = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
    out[c] = top * (1 - fy) + bottom * fy;
  }
  return out;
}

/**
 * Warps `source` (its full srcW x srcH extent, treated as a rectangle
 * with corners (0,0)-(srcW,0)-(srcW,srcH)-(0,srcH)) so that those four
 * corners land at `dstCorners` (clockwise from top-left, in the same
 * coordinate space as srcW/srcH), returning a new canvas sized to the
 * destination quad's bounding box. Pixels outside the warped quad are
 * left transparent.
 */
export function warpQuadToCanvas(source: CanvasImageSource, srcW: number, srcH: number, dstCorners: Point[]): HTMLCanvasElement {
  const minX = Math.min(...dstCorners.map((p) => p.x));
  const minY = Math.min(...dstCorners.map((p) => p.y));
  const maxX = Math.max(...dstCorners.map((p) => p.x));
  const maxY = Math.max(...dstCorners.map((p) => p.y));
  const outW = Math.max(1, Math.round(maxX - minX));
  const outH = Math.max(1, Math.round(maxY - minY));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const sctx = srcCanvas.getContext('2d') as CanvasRenderingContext2D;
  sctx.drawImage(source, 0, 0, srcW, srcH);
  const srcData = sctx.getImageData(0, 0, srcW, srcH).data;

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const octx = out.getContext('2d') as CanvasRenderingContext2D;
  const outImageData = octx.createImageData(outW, outH);
  const outData = outImageData.data;

  const localDst = dstCorners.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  const srcRectCorners: Point[] = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ];
  // Solving dest-local -> src directly (rather than src -> dest and inverting the
  // matrix) is exactly the mapping the inverse-sampling loop below needs.
  const destToSrc = computeHomography(localDst, srcRectCorners);

  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const sp = applyHomography(destToSrc, { x: ox + 0.5, y: oy + 0.5 });
      const di = (oy * outW + ox) * 4;
      if (!Number.isFinite(sp.x) || !Number.isFinite(sp.y) || sp.x < 0 || sp.x >= srcW || sp.y < 0 || sp.y >= srcH) {
        continue; // stays transparent (createImageData zero-initializes)
      }
      const [r, g, b, a] = bilinearSample(srcData, srcW, srcH, sp.x, sp.y);
      outData[di] = r;
      outData[di + 1] = g;
      outData[di + 2] = b;
      outData[di + 3] = a;
    }
  }
  octx.putImageData(outImageData, 0, 0);
  return out;
}
