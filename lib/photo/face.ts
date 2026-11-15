// Face retouching from face landmarks. The landmarks come from MediaPipe's
// Face Landmarker, which runs in the browser (its code and model are fetched
// on first use; the photo itself never leaves the device). Everything below
// the loader is plain pixel maths on the 478 landmark points, so it can be
// unit-tested without a model.
//
// Every edit is capped so a face can be refined but never distorted.

import { blurChannel } from './adjust.ts';

export type Pt = { x: number; y: number };

// ── MediaPipe canonical face-mesh indices ──────────────────────────────────
export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
export const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
export const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
export const EYE_R = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
export const EYE_L = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];
const LOWER_LID_R = [33, 7, 163, 144, 145, 153, 154, 155, 133];
const LOWER_LID_L = [263, 249, 390, 373, 374, 380, 381, 382, 362];
const IRIS_R = [468, 469, 470, 471, 472];
const IRIS_L = [473, 474, 475, 476, 477];
const NOSE_TIP = 1, NOSE_WING_R = 129, NOSE_WING_L = 358;
const JAW_R = [132, 58, 172, 136, 150], JAW_L = [361, 288, 397, 365, 379];
const CHEEK_R = [234, 93, 132], CHEEK_L = [454, 323, 361];
const CHIN = 152;

export interface FaceEdit {
  eyeBright: number;   // 0..100 whiten / brighten the eye whites
  iris: number;        // 0..100 iris clarity
  redEye: boolean;
  darkCircles: number; // 0..100
  teeth: number;       // 0..100 whitening
  lipColour: string;   // #rrggbb
  lipAmount: number;   // 0..100 tint strength (0 = natural)
  lipSat: number;      // -100..100
  eyeSize: number;     // -100..100  (±12 % at most)
  faceSlim: number;    // -100..100  (cheeks, ±4 % of face width)
  jaw: number;         // -100..100  (jaw line, ±3.5 %)
  noseSlim: number;    // -100..100  (±15 % nose width)
  chin: number;        // -100..100  (chin height, ±3 % of face height)
}
export const NO_FACE_EDIT: FaceEdit = { eyeBright: 0, iris: 0, redEye: false, darkCircles: 0, teeth: 0, lipColour: '#B8344F', lipAmount: 0, lipSat: 0, eyeSize: 0, faceSlim: 0, jaw: 0, noseSlim: 0, chin: 0 };
export const isFaceNeutral = (e: FaceEdit) => JSON.stringify({ ...NO_FACE_EDIT, ...e, lipColour: '' }) === JSON.stringify({ ...NO_FACE_EDIT, lipColour: '' });

export const FACE_PRESETS: { group: 'Female portrait' | 'Male portrait'; id: string; name: string; edit: Partial<FaceEdit> }[] = [
  { group: 'Female portrait', id: 'f-fresh', name: 'Fresh eyes', edit: { eyeBright: 35, iris: 30, darkCircles: 40 } },
  { group: 'Female portrait', id: 'f-smile', name: 'Bright smile', edit: { teeth: 45, lipSat: 15 } },
  { group: 'Female portrait', id: 'f-rose', name: 'Rose lips', edit: { lipColour: '#C2435E', lipAmount: 35, lipSat: 10 } },
  { group: 'Female portrait', id: 'f-glam', name: 'Soft glam', edit: { eyeBright: 30, iris: 35, darkCircles: 45, teeth: 30, lipColour: '#A8324A', lipAmount: 30, eyeSize: 20, faceSlim: 20 } },
  { group: 'Male portrait', id: 'm-rested', name: 'Rested', edit: { eyeBright: 25, darkCircles: 45 } },
  { group: 'Male portrait', id: 'm-clean', name: 'Clean smile', edit: { teeth: 40, eyeBright: 20 } },
  { group: 'Male portrait', id: 'm-jaw', name: 'Defined jaw', edit: { jaw: 30, chin: 15, darkCircles: 30 } },
];

// ── Loader ─────────────────────────────────────────────────────────────────
const MP_VERSION = '0.10.14';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
let landmarker: Promise<any> | null = null;

function getLandmarker(onStatus?: (s: string) => void) {
  if (!landmarker) {
    landmarker = (async () => {
      onStatus?.('Loading the face finder…');
      const vision: any = await import(/* webpackIgnore: true */ `${MP_BASE}/vision_bundle.mjs` as string);
      const files = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      return vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        runningMode: 'IMAGE', numFaces: 1,
      });
    })();
    landmarker.catch(() => { landmarker = null; });
  }
  return landmarker;
}

/** Finds the face in a picture; returns its 478 points in pixels, or null when there is no face. */
export async function detectFace(c: HTMLCanvasElement, onStatus?: (s: string) => void): Promise<Pt[] | null> {
  const fake = (window as any).__mtFaceLandmarks; // test hook: landmarks given in 0..1 picture units
  if (Array.isArray(fake)) return fake.map((p: Pt) => ({ x: p.x * c.width, y: p.y * c.height }));
  const lm = await getLandmarker(onStatus);
  onStatus?.('Finding the face…');
  const r = lm.detect(c);
  const pts = r?.faceLandmarks?.[0];
  if (!pts || pts.length < 468) return null;
  return pts.map((p: any) => ({ x: p.x * c.width, y: p.y * c.height }));
}

// ── Geometry helpers ───────────────────────────────────────────────────────
const at = (lm: Pt[], ids: number[]) => ids.map((i) => lm[i]).filter(Boolean);
const mean = (ps: Pt[]): Pt => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function faceBox(lm: Pt[]) {
  const o = at(lm, FACE_OVAL);
  const xs = o.map((p) => p.x), ys = o.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Soft mask (0..1) of a polygon; `feather` in pixels. */
export function polyMask(poly: Pt[], w: number, h: number, feather = 0): Float32Array {
  const m = new Float32Array(w * h);
  if (poly.length < 3) return m;
  for (let y = 0; y < h; y++) {
    const yc = y + 0.5, xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[j], b = poly[i];
      if ((a.y <= yc && b.y > yc) || (b.y <= yc && a.y > yc)) xs.push(a.x + ((yc - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const s = Math.max(0, Math.ceil(xs[k] - 0.5)), e = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = s; x <= e; x++) m[y * w + x] = 1;
    }
  }
  return feather > 0.5 ? blurChannel(m, w, h, Math.round(feather)) : m;
}
const circle = (c: Pt, r: number, n = 24): Pt[] => Array.from({ length: n }, (_, i) => ({ x: c.x + r * Math.cos((i / n) * Math.PI * 2), y: c.y + r * Math.sin((i / n) * Math.PI * 2) }));
const sub = (a: Float32Array, b: Float32Array) => { const o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = Math.max(0, a[i] - b[i]); return o; };

function irisOf(lm: Pt[], ids: number[]) {
  const ps = at(lm, ids);
  if (ps.length < 5) return null;
  const c = ps[0];
  const r = (dist(ps[1], ps[3]) + dist(ps[2], ps[4])) / 4;
  return { c, r: Math.max(1, r) };
}

// ── Colour helpers ─────────────────────────────────────────────────────────
const lumOf = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const hexRgb = (h: string) => { const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// ── Region edits (in place on px) ──────────────────────────────────────────
function eyeWhites(px: Uint8ClampedArray, w: number, h: number, m: Float32Array, amt: number) {
  for (let i = 0; i < m.length; i++) {
    const a = m[i] * amt; if (a <= 0.002) continue;
    const k = i * 4, r = px[k], g = px[k + 1], b = px[k + 2];
    const l = lumOf(r, g, b), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // Only the whites: light and fairly unsaturated (keeps iris, lashes and lid edges).
    const sat = mx ? (mx - mn) / mx : 0;
    const wgt = a * Math.min(1, Math.max(0, (l - 90) / 60)) * Math.min(1, Math.max(0, (0.45 - sat) / 0.25));
    if (wgt <= 0) continue;
    const lift = Math.min(255, l + (255 - l) * 0.35);
    px[k] = r + (lift - r) * wgt; px[k + 1] = g + (lift - g) * wgt; px[k + 2] = b + (lift - b) * wgt;
  }
}
function irisClarity(px: Uint8ClampedArray, m: Float32Array, amt: number) {
  for (let i = 0; i < m.length; i++) {
    const a = m[i] * amt; if (a <= 0.002) continue;
    const k = i * 4, r = px[k], g = px[k + 1], b = px[k + 2], l = lumOf(r, g, b);
    // More colour and a touch of light; pupils (very dark) stay dark.
    const keepPupil = Math.min(1, l / 40);
    const s = 1 + 0.6 * a * keepPupil, lift = 1 + 0.18 * a * keepPupil;
    px[k] = (l + (r - l) * s) * lift; px[k + 1] = (l + (g - l) * s) * lift; px[k + 2] = (l + (b - l) * s) * lift;
  }
}
function fixRedEye(px: Uint8ClampedArray, m: Float32Array) {
  for (let i = 0; i < m.length; i++) {
    if (m[i] <= 0.01) continue;
    const k = i * 4, r = px[k], g = px[k + 1], b = px[k + 2];
    const gb = (g + b) / 2;
    if (r > 80 && r > gb * 1.6) { const t = m[i]; px[k] = r + (gb * 0.9 - r) * t; }
  }
}
function whitenTeeth(px: Uint8ClampedArray, m: Float32Array, amt: number) {
  for (let i = 0; i < m.length; i++) {
    const a = m[i] * amt; if (a <= 0.002) continue;
    const k = i * 4, r = px[k], g = px[k + 1], b = px[k + 2], l = lumOf(r, g, b);
    // Teeth: light pixels; the darker mouth inside and the gums (red) are left alone.
    const light = Math.min(1, Math.max(0, (l - 70) / 50));
    const red = r > g * 1.35 ? Math.max(0, 1 - (r / Math.max(1, g) - 1.35) * 3) : 1;
    const wgt = a * light * red; if (wgt <= 0) continue;
    const yellow = Math.max(0, (r + g) / 2 - b); // yellow cast
    const nb = b + yellow * 0.85, nr = r - yellow * 0.1, ng = g - yellow * 0.05;
    const lift = 1 + 0.12;
    px[k] = r + (nr * lift - r) * wgt; px[k + 1] = g + (ng * lift - g) * wgt; px[k + 2] = b + (nb * lift - b) * wgt;
  }
}
function tintLips(px: Uint8ClampedArray, m: Float32Array, colour: string, amt: number, sat: number) {
  const [cr, cg, cb] = hexRgb(colour), cl = lumOf(cr, cg, cb) || 1;
  for (let i = 0; i < m.length; i++) {
    const mm = m[i]; if (mm <= 0.002) continue;
    const k = i * 4; let r = px[k], g = px[k + 1], b = px[k + 2];
    const l = lumOf(r, g, b);
    if (sat) { const s = 1 + (sat / 100) * mm; r = l + (r - l) * s; g = l + (g - l) * s; b = l + (b - l) * s; }
    if (amt > 0) {
      // Colour of the chosen shade at the lip's own brightness, so shine and creases stay.
      const t = (amt / 100) * mm * 0.85, f = l / cl;
      r += (cr * f - r) * t; g += (cg * f - g) * t; b += (cb * f - b) * t;
    }
    px[k] = r; px[k + 1] = g; px[k + 2] = b;
  }
}
function lightenCircles(px: Uint8ClampedArray, m: Float32Array, ref: number, amt: number) {
  for (let i = 0; i < m.length; i++) {
    const a = m[i] * amt; if (a <= 0.002) continue;
    const k = i * 4, r = px[k], g = px[k + 1], b = px[k + 2], l = lumOf(r, g, b);
    if (l >= ref) continue;
    const gain = Math.min(1.6, (l + (ref - l) * 0.85 * a) / Math.max(1, l));
    // Lift the shadow and take out a little of its blue/purple cast.
    const nr = r * gain, ng = g * gain, nb = b * gain - Math.max(0, b - r) * 0.4 * a;
    px[k] = nr; px[k + 1] = ng; px[k + 2] = nb;
  }
}

// ── Shape edits: backward-mapped local warps ───────────────────────────────
type Warp = { kind: 'scale'; c: Pt; r: number; s: number; xOnly?: boolean } | { kind: 'push'; c: Pt; r: number; dx: number; dy: number };

function sample(src: Uint8ClampedArray, w: number, h: number, x: number, y: number, out: Uint8ClampedArray, k: number) {
  x = Math.max(0, Math.min(w - 1.001, x)); y = Math.max(0, Math.min(h - 1.001, y));
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const i00 = (y0 * w + x0) * 4, i10 = i00 + 4, i01 = i00 + w * 4, i11 = i01 + 4;
  for (let c = 0; c < 4; c++) {
    out[k + c] = (src[i00 + c] * (1 - fx) + src[i10 + c] * fx) * (1 - fy) + (src[i01 + c] * (1 - fx) + src[i11 + c] * fx) * fy;
  }
}
export function warp(px: Uint8ClampedArray, w: number, h: number, warps: Warp[]): Uint8ClampedArray {
  if (!warps.length) return px;
  const out = new Uint8ClampedArray(px);
  // Only pixels inside some warp's radius move.
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (const q of warps) { x0 = Math.min(x0, q.c.x - q.r); y0 = Math.min(y0, q.c.y - q.r); x1 = Math.max(x1, q.c.x + q.r); y1 = Math.max(y1, q.c.y + q.r); }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(w - 1, Math.ceil(x1)); y1 = Math.min(h - 1, Math.ceil(y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    let sx = x, sy = y, moved = false;
    for (const q of warps) {
      const dx = sx - q.c.x, dy = sy - q.c.y, d2 = (dx * dx + dy * dy) / (q.r * q.r);
      if (d2 >= 1) continue;
      const f = (1 - d2) * (1 - d2);
      moved = true;
      if (q.kind === 'scale') {
        const k = 1 - q.s * f; // s > 0 enlarges (samples closer to the centre)
        sx = q.c.x + dx * k; if (!q.xOnly) sy = q.c.y + dy * k;
      } else { sx -= q.dx * f; sy -= q.dy * f; }
    }
    if (moved) sample(px, w, h, sx, sy, out, (y * w + x) * 4);
  }
  return out;
}

export function shapeWarps(lm: Pt[], e: FaceEdit): Warp[] {
  const ws: Warp[] = [];
  const box = faceBox(lm), fw = box.w, fh = box.h, mid = box.x + box.w / 2;
  const clamp = (v: number) => Math.max(-100, Math.min(100, v)) / 100;
  if (e.eyeSize) for (const ids of [EYE_R, EYE_L]) {
    const ps = at(lm, ids); if (ps.length < 8) continue;
    const c = mean(ps), r = Math.max(...ps.map((p) => dist(p, c))) * 1.9;
    ws.push({ kind: 'scale', c, r, s: 0.25 * clamp(e.eyeSize) });
  }
  if (e.noseSlim && lm[NOSE_TIP] && lm[NOSE_WING_R] && lm[NOSE_WING_L]) {
    const c = { x: (lm[NOSE_WING_R].x + lm[NOSE_WING_L].x) / 2, y: (lm[NOSE_WING_R].y + lm[NOSE_WING_L].y + lm[NOSE_TIP].y) / 3 };
    const r = dist(lm[NOSE_WING_R], lm[NOSE_WING_L]) * 1.1;
    ws.push({ kind: 'scale', c, r, s: -0.15 * clamp(e.noseSlim) * 2.2, xOnly: true });
  }
  const pushIn = (ids: number[], amt: number, rad: number) => {
    for (const p of at(lm, ids)) {
      const dir = p.x < mid ? 1 : -1; // towards the centre line
      ws.push({ kind: 'push', c: p, r: rad, dx: dir * amt, dy: 0 });
    }
  };
  if (e.faceSlim) pushIn([...CHEEK_R, ...CHEEK_L], 0.04 * fw * clamp(e.faceSlim) / 2.2, fw * 0.22);
  if (e.jaw) pushIn([...JAW_R, ...JAW_L], 0.035 * fw * clamp(e.jaw) / 2.2, fw * 0.16);
  if (e.chin && lm[CHIN]) ws.push({ kind: 'push', c: lm[CHIN], r: fw * 0.25, dx: 0, dy: 0.03 * fh * clamp(e.chin) });
  return ws;
}

// ── Whole edit ─────────────────────────────────────────────────────────────
/** Applies a face edit to an RGBA pixel array (a new array is returned). */
export function applyFaceEditPx(src: Uint8ClampedArray, w: number, h: number, lm: Pt[], e: FaceEdit): Uint8ClampedArray {
  let px: Uint8ClampedArray = new Uint8ClampedArray(src);
  const box = faceBox(lm), soft = Math.max(1, box.w / 120);
  const eyes = [at(lm, EYE_R), at(lm, EYE_L)];
  if (e.eyeBright > 0) for (const ps of eyes) eyeWhites(px, w, h, polyMask(ps, w, h, soft), Math.min(1, e.eyeBright / 100));
  const irises = [irisOf(lm, IRIS_R), irisOf(lm, IRIS_L)].filter(Boolean) as { c: Pt; r: number }[];
  if (e.redEye) for (const ir of irises) fixRedEye(px, polyMask(circle(ir.c, ir.r * 0.75), w, h, soft));
  if (e.iris > 0) for (const ir of irises) irisClarity(px, polyMask(circle(ir.c, ir.r * 0.95), w, h, soft), Math.min(1, e.iris / 100));
  if (e.darkCircles > 0) {
    [[LOWER_LID_R, CHEEK_R], [LOWER_LID_L, CHEEK_L]].forEach(([lid]) => {
      const ps = at(lm, lid); if (ps.length < 5) return;
      const eyeH = Math.max(4, box.h * 0.05);
      const band = [...ps.map((p) => ({ x: p.x, y: p.y + eyeH * 0.2 })), ...ps.slice().reverse().map((p) => ({ x: p.x, y: p.y + eyeH * 1.3 }))];
      const m = polyMask(band, w, h, soft * 2.5);
      // Reference brightness: the cheek just under the band.
      const c = mean(ps), ref: number[] = [];
      for (let dy = eyeH * 1.8; dy < eyeH * 2.6; dy += 1) for (let dx = -eyeH; dx <= eyeH; dx += 2) {
        const x = Math.round(c.x + dx), y = Math.round(c.y + dy);
        if (x >= 0 && y >= 0 && x < w && y < h) { const k = (y * w + x) * 4; ref.push(lumOf(px[k], px[k + 1], px[k + 2])); }
      }
      if (!ref.length) return;
      ref.sort((a, b) => a - b);
      lightenCircles(px, m, ref[ref.length >> 1], Math.min(1, e.darkCircles / 100));
    });
  }
  const outer = at(lm, LIPS_OUTER), inner = at(lm, LIPS_INNER);
  if (e.teeth > 0 && inner.length > 5) whitenTeeth(px, polyMask(inner, w, h, soft * 0.5), Math.min(1, e.teeth / 100));
  if ((e.lipAmount > 0 || e.lipSat) && outer.length > 5) {
    const m = sub(polyMask(outer, w, h, soft), polyMask(inner, w, h, soft * 0.5));
    tintLips(px, m, e.lipColour, Math.min(100, e.lipAmount), Math.max(-100, Math.min(100, e.lipSat)));
  }
  const ws = shapeWarps(lm, e);
  if (ws.length) px = warp(px, w, h, ws);
  return px;
}

/** Applies a face edit to a canvas, working only on the area around the face. */
export function applyFaceEdit(c: HTMLCanvasElement, lm: Pt[], e: FaceEdit): HTMLCanvasElement {
  const b = faceBox(lm), pad = Math.max(b.w, b.h) * 0.35;
  const x0 = Math.max(0, Math.floor(b.x - pad)), y0 = Math.max(0, Math.floor(b.y - pad));
  const x1 = Math.min(c.width, Math.ceil(b.x + b.w + pad)), y1 = Math.min(c.height, Math.ceil(b.y + b.h + pad));
  const w = x1 - x0, h = y1 - y0;
  const out = document.createElement('canvas'); out.width = c.width; out.height = c.height;
  const ctx = out.getContext('2d')!; ctx.drawImage(c, 0, 0);
  if (w < 4 || h < 4) return out;
  const img = ctx.getImageData(x0, y0, w, h);
  const local = lm.map((p) => ({ x: p.x - x0, y: p.y - y0 }));
  img.data.set(applyFaceEditPx(img.data, w, h, local, e));
  ctx.putImageData(img, x0, y0);
  return out;
}

export const FACE_SLIDERS: { key: keyof FaceEdit; label: string; min: number; max: number; group: 'Eyes' | 'Mouth' | 'Shape' }[] = [
  { key: 'eyeBright', label: 'Brighten eye whites', min: 0, max: 100, group: 'Eyes' },
  { key: 'iris', label: 'Iris clarity', min: 0, max: 100, group: 'Eyes' },
  { key: 'darkCircles', label: 'Dark circles', min: 0, max: 100, group: 'Eyes' },
  { key: 'teeth', label: 'Whiten teeth', min: 0, max: 100, group: 'Mouth' },
  { key: 'lipAmount', label: 'Lip colour', min: 0, max: 100, group: 'Mouth' },
  { key: 'lipSat', label: 'Lip saturation', min: -100, max: 100, group: 'Mouth' },
  { key: 'eyeSize', label: 'Eye size', min: -100, max: 100, group: 'Shape' },
  { key: 'faceSlim', label: 'Slim face', min: -100, max: 100, group: 'Shape' },
  { key: 'jaw', label: 'Slim jaw', min: -100, max: 100, group: 'Shape' },
  { key: 'noseSlim', label: 'Slim nose', min: -100, max: 100, group: 'Shape' },
  { key: 'chin', label: 'Chin height', min: -100, max: 100, group: 'Shape' },
];
