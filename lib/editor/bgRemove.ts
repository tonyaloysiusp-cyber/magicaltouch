// Background removal that runs entirely in the browser: a small salient-
// object segmentation model (U²-Net-p, Apache-2.0, ~4.5 MB, served from
// /models) finds the subject; the result is a soft mask the user can
// refine (edge softness, cut-off, restore/erase brushes) before applying.

const MODEL_URL = '/models/u2netp.onnx';
const SIZE = 320;
const ORT_VERSION = '1.19.2';

let sessionPromise: Promise<any> | null = null;
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

// The ONNX runtime is loaded on demand (only when someone removes a
// background), straight from its pinned CDN build.
function loadOrt(): Promise<any> {
  const w = window as any;
  if (w.ort) return Promise.resolve(w.ort);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${ORT_BASE}ort.min.js`;
    s.async = true;
    s.onload = () => (w.ort ? resolve(w.ort) : reject(new Error('ort-missing')));
    s.onerror = () => reject(new Error('ort-load-failed'));
    document.head.appendChild(s);
  });
}

async function getSession(onStatus?: (s: string) => void) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      onStatus?.('Loading the background remover…');
      const ort: any = await loadOrt();
      ort.env.wasm.wasmPaths = ORT_BASE;
      // Single-threaded works everywhere (no special page headers needed).
      ort.env.wasm.numThreads = 1;
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
    })();
    sessionPromise.catch(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

export interface SubjectMask {
  data: Float32Array; // SIZE × SIZE, 0..1
  size: number;
}

// Runs the model on a picture and returns the subject mask.
export async function detectSubject(el: HTMLImageElement | HTMLCanvasElement, onStatus?: (s: string) => void): Promise<SubjectMask> {
  const session = await getSession(onStatus);
  onStatus?.('Finding the subject…');
  const ort: any = await loadOrt();
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(el, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  let max = 1;
  for (let i = 0; i < data.length; i += 4) max = Math.max(max, data[i], data[i + 1], data[i + 2]);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let p = 0, i = 0; i < data.length; i += 4, p++) {
    input[p] = (data[i] / max - mean[0]) / std[0];
    input[SIZE * SIZE + p] = (data[i + 1] / max - mean[1]) / std[1];
    input[2 * SIZE * SIZE + p] = (data[i + 2] / max - mean[2]) / std[2];
  }
  const tensor = new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]);
  const out = await session.run({ [session.inputNames[0]]: tensor });
  const pred: Float32Array = out[session.outputNames[0]].data;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pred.length; i++) {
    if (pred[i] < lo) lo = pred[i];
    if (pred[i] > hi) hi = pred[i];
  }
  const range = hi - lo || 1;
  const mask = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < mask.length; i++) mask[i] = (pred[i] - lo) / range;
  return { data: mask, size: SIZE };
}

export interface RefineOptions {
  cutoff: number; // 0..1, how much of the soft edge counts as subject
  softness: number; // 0..1, width of the transition
  feather: number; // 0..10, blur of the edge (in mask pixels)
}

export const DEFAULT_REFINE: RefineOptions = { cutoff: 0.5, softness: 0.35, feather: 1.5 };

function blurMask(src: Float32Array, n: number, radius: number) {
  if (radius <= 0) return src;
  const r = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0;
      let cnt = 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < n) {
          sum += src[y * n + xx];
          cnt++;
        }
      }
      tmp[y * n + x] = sum / cnt;
    }
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let sum = 0;
      let cnt = 0;
      for (let k = -r; k <= r; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < n) {
          sum += tmp[yy * n + x];
          cnt++;
        }
      }
      out[y * n + x] = sum / cnt;
    }
  }
  return out;
}

// Mask after refinement, as a grayscale canvas at the model's size.
export function refinedMaskCanvas(mask: SubjectMask, opt: RefineOptions): HTMLCanvasElement {
  const n = mask.size;
  const blurred = blurMask(mask.data, n, opt.feather);
  const lo = Math.max(0, opt.cutoff - opt.softness / 2);
  const hi = Math.min(1, opt.cutoff + opt.softness / 2 + 1e-3);
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = Math.max(0, Math.min(1, (blurred[i] - lo) / (hi - lo)));
    const a = Math.round(v * 255);
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 255;
    img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Combines the source picture with a mask (plus the user's restore/erase
// painting, both at the picture's own size) into a transparent PNG.
export function composeCutout(
  source: HTMLImageElement | HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  paint?: { restore: HTMLCanvasElement | null; erase: HTMLCanvasElement | null },
  maxSize = 4096
): HTMLCanvasElement {
  const sw = (source as any).naturalWidth || source.width;
  const sh = (source as any).naturalHeight || source.height;
  const k = Math.min(1, maxSize / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k));
  const h = Math.max(1, Math.round(sh * k));
  // Alpha mask at full size (smooth upscaling of the model's mask).
  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const mctx = m.getContext('2d')!;
  mctx.imageSmoothingEnabled = true;
  (mctx as any).imageSmoothingQuality = 'high';
  mctx.drawImage(maskCanvas, 0, 0, w, h);
  if (paint?.restore) mctx.drawImage(paint.restore, 0, 0, w, h);
  if (paint?.erase) {
    mctx.globalCompositeOperation = 'destination-out';
    mctx.drawImage(paint.erase, 0, 0, w, h);
    mctx.globalCompositeOperation = 'source-over';
  }
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d')!;
  octx.drawImage(source, 0, 0, w, h);
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(m, 0, 0);
  octx.globalCompositeOperation = 'source-over';
  return out;
}

// The bounding box of the subject in 0..1 units (for smart cropping).
export function subjectBounds(mask: SubjectMask, threshold = 0.5) {
  const n = mask.size;
  let minX = n;
  let minY = n;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (mask.data[y * n + x] >= threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX / n, y: minY / n, w: (maxX - minX + 1) / n, h: (maxY - minY + 1) / n };
}
