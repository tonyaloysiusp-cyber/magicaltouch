// ---------------------------------------------------------------------
// lib/editor/inpaint.ts
// Real content-aware fill / object removal for a pixel selection.
//
// Reconstructs the masked region via harmonic (Laplace-equation)
// diffusion: every masked pixel repeatedly becomes the average of its
// unmasked/already-solved neighbors, using the surrounding real pixel
// data as fixed boundary values, converging to the smoothest color
// field consistent with what's actually around the hole. This is the
// same principle behind classic PDE-based inpainting (the basis for
// tools like OpenCV's Navier-Stokes inpainting) — genuine reconstruction
// from real neighboring content, not a blur or a solid-color fill.
//
// Honest limitation: it fills flat/gradient/simple-textured backgrounds
// convincingly but, unlike patch-based synthesis (PatchMatch and
// similar), it does not copy or repeat fine texture/pattern detail from
// elsewhere in the image — a large hole in a strongly patterned
// background will come out smooth rather than reproducing the pattern.
// ---------------------------------------------------------------------

import type { PixelMask } from './pixelSelection';
import { maskBoundingBox } from './pixelSelection';

export function contentAwareFill(source: HTMLCanvasElement, mask: PixelMask): string {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(source, 0, 0);

  const bbox = maskBoundingBox(mask);
  if (!bbox) return canvas.toDataURL('image/png');

  // Solve over the hole's bounding box plus a margin of real surrounding
  // pixels — those margin pixels are what the diffusion actually pulls
  // color from, and keeping the working region small (rather than the
  // whole canvas) is what keeps this fast.
  const margin = Math.max(12, Math.round(Math.max(bbox.width, bbox.height) * 0.2));
  const rx = Math.max(0, bbox.x - margin);
  const ry = Math.max(0, bbox.y - margin);
  const rw = Math.min(canvas.width, bbox.x + bbox.width + margin) - rx;
  const rh = Math.min(canvas.height, bbox.y + bbox.height + margin) - ry;

  const region = ctx.getImageData(rx, ry, rw, rh);
  const data = region.data;
  const holeIdx: number[] = [];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumA = 0;
  let knownCount = 0;

  for (let ly = 0; ly < rh; ly++) {
    for (let lx = 0; lx < rw; lx++) {
      const gx = rx + lx;
      const gy = ry + ly;
      const li = ly * rw + lx;
      const selected = mask.data[gy * mask.width + gx] > 127;
      if (selected) {
        holeIdx.push(li);
      } else {
        const p = li * 4;
        sumR += data[p];
        sumG += data[p + 1];
        sumB += data[p + 2];
        sumA += data[p + 3];
        knownCount++;
      }
    }
  }
  if (holeIdx.length === 0) return canvas.toDataURL('image/png');

  // Seed the hole with the average known color first — the diffusion
  // converges to the same result regardless of the starting values, this
  // just gets there faster than starting from black/transparent.
  const avgR = knownCount ? sumR / knownCount : 128;
  const avgG = knownCount ? sumG / knownCount : 128;
  const avgB = knownCount ? sumB / knownCount : 128;
  const avgA = knownCount ? sumA / knownCount : 255;
  for (const li of holeIdx) {
    const p = li * 4;
    data[p] = avgR;
    data[p + 1] = avgG;
    data[p + 2] = avgB;
    data[p + 3] = avgA;
  }

  // Enough Gauss-Seidel sweeps for color information to diffuse all the
  // way across the hole (roughly proportional to its size), capped by a
  // total work budget so a very large selection stays responsive rather
  // than freezing the tab.
  const diag = Math.sqrt(bbox.width * bbox.width + bbox.height * bbox.height);
  const distanceIters = Math.max(120, Math.min(700, Math.round(diag * 2.5)));
  const workBudget = 60_000_000;
  const budgetIters = Math.max(40, Math.floor(workBudget / holeIdx.length));
  const iterations = Math.min(distanceIters, budgetIters);

  for (let iter = 0; iter < iterations; iter++) {
    for (const li of holeIdx) {
      const lx = li % rw;
      const ly = (li / rw) | 0;
      let n = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (lx > 0) {
        const q = (li - 1) * 4;
        r += data[q]; g += data[q + 1]; b += data[q + 2]; a += data[q + 3]; n++;
      }
      if (lx < rw - 1) {
        const q = (li + 1) * 4;
        r += data[q]; g += data[q + 1]; b += data[q + 2]; a += data[q + 3]; n++;
      }
      if (ly > 0) {
        const q = (li - rw) * 4;
        r += data[q]; g += data[q + 1]; b += data[q + 2]; a += data[q + 3]; n++;
      }
      if (ly < rh - 1) {
        const q = (li + rw) * 4;
        r += data[q]; g += data[q + 1]; b += data[q + 2]; a += data[q + 3]; n++;
      }
      if (n === 0) continue;
      const p = li * 4;
      data[p] = r / n;
      data[p + 1] = g / n;
      data[p + 2] = b / n;
      data[p + 3] = a / n;
    }
  }

  ctx.putImageData(region, rx, ry);
  return canvas.toDataURL('image/png');
}
