// Image frames, crops and clipping masks.
//
// A frame is an ordinary image object whose clipPath is a shape (square,
// circle, star, heart, any vector path…). The frame's place on the page is
// stored implicitly in that clipPath, so the photo inside can be moved,
// scaled or replaced while the frame stays exactly where it is:
//
//   page matrix of the frame = image matrix × clipPath's own matrix
//
// An empty frame shows a placeholder picture until a photo is dropped in.

import { ShapeKind, shapePathD } from './shapePaths';

export type FrameKind = ShapeKind | 'custom';

export interface FrameMeta {
  kind: FrameKind;
  empty?: boolean;
}

export interface FrameGeometry {
  center: { x: number; y: number };
  width: number;
  height: number;
  angle: number;
}

// --- clip shapes ---------------------------------------------------------

function makeClipShape(F: any, kind: FrameKind, w: number, h: number, radius?: number) {
  const base = { originX: 'center', originY: 'center', fill: '#000000', stroke: '' };
  if (kind === 'rect') return new F.Rect({ ...base, width: w, height: h });
  if (kind === 'roundRect') {
    const rr = radius ?? Math.min(w, h) * 0.12;
    return new F.Rect({ ...base, width: w, height: h, rx: rr, ry: rr });
  }
  if (kind === 'circle' || kind === 'ellipse') return new F.Ellipse({ ...base, rx: w / 2, ry: h / 2 });
  const d = shapePathD(kind === 'custom' ? 'rect' : kind, w, h);
  const p = new F.Path(d, base);
  return p;
}

// --- geometry --------------------------------------------------------------

// Where the frame sits on the page (centre, size, rotation).
export function frameGeometry(F: any, img: any): FrameGeometry {
  const clip = img.clipPath;
  const M = img.calcTransformMatrix();
  if (!clip || clip.absolutePositioned) {
    const d = F.util.qrDecompose(M);
    return { center: { x: d.translateX, y: d.translateY }, width: img.getScaledWidth(), height: img.getScaledHeight(), angle: img.angle || 0 };
  }
  const P = F.util.multiplyTransformMatrices(M, clip.calcOwnMatrix ? clip.calcOwnMatrix() : clip.calcTransformMatrix());
  const d = F.util.qrDecompose(P);
  const cw = clip.type === 'ellipse' ? clip.rx * 2 : clip.width;
  const ch = clip.type === 'ellipse' ? clip.ry * 2 : clip.height;
  return {
    center: { x: d.translateX, y: d.translateY },
    width: Math.abs(cw * d.scaleX),
    height: Math.abs(ch * d.scaleY),
    angle: d.angle,
  };
}

// Places `clip` so that, on the page, it covers `geo` — whatever the
// image's own position, scale, rotation or flip.
function placeClip(F: any, img: any, clip: any, geo: FrameGeometry, stretch = { x: 1, y: 1 }) {
  img.setCoords();
  const M = img.calcTransformMatrix();
  const P = F.util.composeMatrix({ translateX: geo.center.x, translateY: geo.center.y, angle: geo.angle, scaleX: stretch.x, scaleY: stretch.y });
  const L = F.util.multiplyTransformMatrices(F.util.invertTransform(M), P);
  const d = F.util.qrDecompose(L);
  clip.set({
    left: d.translateX,
    top: d.translateY,
    angle: d.angle,
    scaleX: d.scaleX,
    scaleY: d.scaleY,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    originX: 'center',
    originY: 'center',
    absolutePositioned: false,
  });
  img.clipPath = clip;
  img.dirty = true;
}

// Scales/positions the image so it fully covers the frame (no gaps), with
// the photo centred in it.
function coverFrame(img: any, geo: FrameGeometry) {
  const nw = img.width || 1;
  const nh = img.height || 1;
  // Size needed along the frame's own axes, accounting for any rotation
  // difference between photo and frame.
  const rel = (((geo.angle - (img.angle || 0)) % 360) + 360) % 360;
  const rad = (rel * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const needW = geo.width * c + geo.height * s;
  const needH = geo.width * s + geo.height * c;
  const scale = Math.max(needW / nw, needH / nh);
  img.set({ scaleX: scale * (img.scaleX < 0 ? -1 : 1), scaleY: scale });
  img.setPositionByOrigin(geo.center, 'center', 'center');
  img.setCoords();
}

// Rebuilds the clip for a frame after the photo inside it moved or changed.
export function setFrameGeometry(F: any, img: any, geo: FrameGeometry) {
  const meta: FrameMeta = img.__frame || { kind: 'rect' };
  const clip = img.clipPath && !img.clipPath.absolutePositioned ? img.clipPath : null;
  let shape = clip;
  if (!shape) shape = makeClipShape(F, meta.kind === 'custom' ? 'rect' : meta.kind, geo.width, geo.height);
  else resizeClipShape(F, shape, meta.kind, geo.width, geo.height);
  // A custom outline keeps its own path and is stretched to the frame.
  const custom = shape.type === 'path' && (meta.kind === 'custom' || !meta.kind);
  const stretch = custom ? { x: geo.width / (shape.width || 1), y: geo.height / (shape.height || 1) } : { x: 1, y: 1 };
  placeClip(F, img, shape, geo, stretch);
}

// The clip shape is drawn at the frame's real size; its scale only undoes
// the photo's own scale (so rounded corners and outlines stay exact).
function resizeClipShape(F: any, clip: any, kind: FrameKind, w: number, h: number) {
  if (clip.type === 'rect') {
    const ratio = clip.width ? w / clip.width : 1;
    clip.set({ width: w, height: h, rx: (clip.rx || 0) * ratio, ry: (clip.ry || 0) * ratio });
  } else if (clip.type === 'ellipse') {
    clip.set({ rx: w / 2, ry: h / 2 });
  } else if (clip.type === 'path' && kind !== 'custom') {
    const fresh = new F.Path(shapePathD(kind as ShapeKind, w, h));
    clip.set({ path: fresh.path, width: fresh.width, height: fresh.height, pathOffset: fresh.pathOffset });
  }
  // A custom (pen-drawn or converted) outline is stretched in placeClip.
}

// --- placeholders -------------------------------------------------------

let placeholderCache: { light: string } | null = null;

// A neutral "drop a photo here" picture for empty frames.
export function placeholderDataUrl(): string {
  if (placeholderCache) return placeholderCache.light;
  if (typeof document === 'undefined') return '';
  const size = 480;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#E8F5FF');
  g.addColorStop(1, '#FCE9EE');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Simple picture icon: frame, sun and hills.
  ctx.strokeStyle = 'rgba(9,9,11,0.35)';
  ctx.fillStyle = 'rgba(9,9,11,0.18)';
  ctx.lineWidth = 10;
  const s = size * 0.34;
  const x0 = (size - s) / 2;
  const y0 = (size - s * 0.8) / 2 - 18;
  ctx.strokeRect(x0, y0, s, s * 0.8);
  ctx.beginPath();
  ctx.arc(x0 + s * 0.7, y0 + s * 0.25, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 + 8, y0 + s * 0.8 - 8);
  ctx.lineTo(x0 + s * 0.38, y0 + s * 0.38);
  ctx.lineTo(x0 + s * 0.6, y0 + s * 0.6);
  ctx.lineTo(x0 + s * 0.74, y0 + s * 0.48);
  ctx.lineTo(x0 + s - 8, y0 + s * 0.8 - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(9,9,11,0.55)';
  ctx.font = '600 30px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Drop a photo', size / 2, y0 + s * 0.8 + 56);
  placeholderCache = { light: c.toDataURL('image/png') };
  return placeholderCache.light;
}

// --- creation -------------------------------------------------------------

// An empty frame of the given shape and page box.
export function createFrame(F: any, kind: FrameKind, box: { left: number; top: number; width: number; height: number }): Promise<any> {
  return new Promise((resolve) => {
    F.Image.fromURL(placeholderDataUrl(), (img: any) => {
      img.set({ left: 0, top: 0, objectCaching: false });
      img.__frame = { kind, empty: true } as FrameMeta;
      img.name = 'Photo frame';
      const geo: FrameGeometry = {
        center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
        width: box.width,
        height: box.height,
        angle: 0,
      };
      coverFrame(img, geo);
      setFrameGeometry(F, img, geo);
      resolve(img);
    });
  });
}

// Puts a new photo into a frame (or replaces the photo of any image that
// has a crop/frame): same frame position, size, shape, rotation, opacity,
// shadow and filters — only the picture changes, centred and covering.
export function fillFrame(F: any, img: any, src: string): Promise<any> {
  const geo = isFramed(img) ? frameGeometry(F, img) : { center: img.getCenterPoint(), width: img.getScaledWidth(), height: img.getScaledHeight(), angle: img.angle || 0 };
  return new Promise((resolve, reject) => {
    img.setSrc(
      src,
      (_loaded: any, isError?: boolean) => {
        if (isError || !img.width) {
          reject(new Error('image-load-failed'));
          return;
        }
        if (!img.__frame) img.__frame = { kind: 'rect' };
        img.__frame = { ...img.__frame, empty: false };
        coverFrame(img, geo);
        setFrameGeometry(F, img, geo);
        if (img.filters && img.filters.length && img.applyFilters) img.applyFilters();
        img.setCoords();
        resolve(img);
      },
      { crossOrigin: 'anonymous' }
    );
  });
}

export const isFramed = (img: any) => !!img && img.type === 'image' && !!img.clipPath && !img.clipPath.absolutePositioned;

// Turns any shape on the page (square, circle, star, heart, pen path…)
// into a frame holding `img`. The shape object is consumed.
export function placeImageInShape(F: any, img: any, shape: any) {
  const shapeCenter = shape.getCenterPoint();
  // The shape's own outline size (not including its stroke).
  const sw = shape.type === 'circle' ? shape.radius * 2 : shape.width;
  const sh = shape.type === 'circle' ? shape.radius * 2 : shape.height;
  const geo: FrameGeometry = {
    center: { x: shapeCenter.x, y: shapeCenter.y },
    width: (sw || 1) * Math.abs(shape.scaleX || 1),
    height: (sh || 1) * Math.abs(shape.scaleY || 1),
    angle: shape.angle || 0,
  };
  const meta = shape.__shape?.kind as ShapeKind | undefined;
  let kind: FrameKind = meta || 'custom';
  if (!meta) {
    if (shape.type === 'rect') kind = shape.rx ? 'roundRect' : 'rect';
    else if (shape.type === 'circle' || shape.type === 'ellipse') kind = 'ellipse';
  }
  img.set({ angle: geo.angle });
  coverFrame(img, geo);
  img.__frame = { kind, empty: false } as FrameMeta;
  if (kind === 'custom') {
    // Keep the exact outline of a pen-drawn or other custom shape.
    const P = shape.calcTransformMatrix();
    const M = img.calcTransformMatrix();
    const L = F.util.multiplyTransformMatrices(F.util.invertTransform(M), P);
    const d = F.util.qrDecompose(L);
    return new Promise<any>((resolve) => {
      shape.clone((clip: any) => {
        clip.set({
          left: d.translateX,
          top: d.translateY,
          angle: d.angle,
          scaleX: d.scaleX,
          scaleY: d.scaleY,
          originX: 'center',
          originY: 'center',
          fill: '#000000',
          stroke: '',
          shadow: null,
          absolutePositioned: false,
        });
        img.clipPath = clip;
        img.dirty = true;
        resolve(img);
      });
    });
  }
  if (kind === 'roundRect' && shape.type === 'rect') {
    const clip = new F.Rect({ originX: 'center', originY: 'center', width: geo.width, height: geo.height, rx: (shape.rx || 0) * Math.abs(shape.scaleX || 1), ry: (shape.ry || 0) * Math.abs(shape.scaleY || 1), fill: '#000' });
    placeClip(F, img, clip, geo);
  } else {
    setFrameGeometry(F, img, geo);
  }
  return Promise.resolve(img);
}

// Takes the photo back out of its frame: the whole picture is shown again.
export function releaseFrame(img: any) {
  img.clipPath = null;
  delete img.__frame;
  img.dirty = true;
}

// --- crop / "edit photo inside frame" mode ---------------------------------

export interface CropSession {
  img: any;
  geo: FrameGeometry;
  saved: { clipPath: any; lockRotation: boolean; lockUniScaling: boolean; hasControls: boolean };
}

// Starts adjusting the photo inside its frame: the clip is lifted so the
// whole photo shows; the frame outline stays fixed (drawn by the caller
// with drawCropOverlay). Ratio presets change the frame, not the photo.
export function beginCrop(F: any, img: any): CropSession {
  if (!isFramed(img)) {
    if (!img.__frame) img.__frame = { kind: 'rect' };
    setFrameGeometry(F, img, { center: img.getCenterPoint(), width: img.getScaledWidth(), height: img.getScaledHeight(), angle: img.angle || 0 });
  }
  const geo = frameGeometry(F, img);
  const session: CropSession = {
    img,
    geo,
    saved: { clipPath: img.clipPath, lockRotation: !!img.lockRotation, lockUniScaling: !!img.lockUniScaling, hasControls: img.hasControls !== false },
  };
  img.clipPath = null;
  img.set({ lockRotation: false, lockUniScaling: true, hasControls: true });
  img.dirty = true;
  return session;
}

// Changes the frame to an aspect ratio (w / h), keeping its centre and
// fitting inside the current frame.
export function setCropAspect(session: CropSession, aspect: number | null, original?: { w: number; h: number }) {
  const g = session.geo;
  const target = aspect ?? (original ? original.w / original.h : g.width / g.height);
  const area = Math.max(g.width, g.height);
  let w = g.width;
  let h = g.width / target;
  if (h > area) {
    h = area;
    w = h * target;
  }
  session.geo = { ...g, width: w, height: h };
}

// Ensures the photo still covers the whole frame (scales it up if needed).
export function keepCovering(session: CropSession) {
  const img = session.img;
  const g = session.geo;
  const rel = (((g.angle - (img.angle || 0)) % 360) + 360) % 360;
  const rad = (rel * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  const needW = g.width * c + g.height * s;
  const needH = g.width * s + g.height * c;
  const sx = Math.abs(img.scaleX || 1);
  const minScale = Math.max(needW / (img.width || 1), needH / (img.height || 1));
  if (sx < minScale - 1e-9) {
    const c0 = img.getCenterPoint();
    img.set({ scaleX: minScale * Math.sign(img.scaleX || 1), scaleY: minScale });
    img.setPositionByOrigin(c0, 'center', 'center');
  }
  img.setCoords();
  // Then slide the photo so no part of the frame falls outside it.
  const F = (typeof window !== 'undefined' && (window as any).fabric) || null;
  if (!F) return;
  const M = img.calcTransformMatrix();
  const inv = F.util.invertTransform(M);
  const a = (g.angle * Math.PI) / 180;
  const corners = [
    [-g.width / 2, -g.height / 2],
    [g.width / 2, -g.height / 2],
    [g.width / 2, g.height / 2],
    [-g.width / 2, g.height / 2],
  ].map(([x, y]) => F.util.transformPoint(new F.Point(g.center.x + x * Math.cos(a) - y * Math.sin(a), g.center.y + x * Math.sin(a) + y * Math.cos(a)), inv));
  const hw = (img.width || 1) / 2;
  const hh = (img.height || 1) / 2;
  const xs = corners.map((p: any) => p.x);
  const ys = corners.map((p: any) => p.y);
  let dx = 0;
  let dy = 0;
  if (Math.max(...xs) > hw) dx = Math.max(...xs) - hw;
  else if (Math.min(...xs) < -hw) dx = Math.min(...xs) + hw;
  if (Math.max(...ys) > hh) dy = Math.max(...ys) - hh;
  else if (Math.min(...ys) < -hh) dy = Math.min(...ys) + hh;
  if (dx || dy) {
    // Local offset → page offset through the photo's own transform.
    const origin = F.util.transformPoint(new F.Point(0, 0), M);
    const moved = F.util.transformPoint(new F.Point(dx, dy), M);
    const c = img.getCenterPoint();
    img.setPositionByOrigin(new F.Point(c.x + (moved.x - origin.x), c.y + (moved.y - origin.y)), 'center', 'center');
    img.setCoords();
  }
}

export function endCrop(F: any, session: CropSession) {
  const img = session.img;
  keepCovering(session);
  img.setCoords();
  const clip = session.saved.clipPath;
  img.set({ lockRotation: session.saved.lockRotation, lockUniScaling: session.saved.lockUniScaling, hasControls: session.saved.hasControls });
  img.clipPath = clip || null;
  setFrameGeometry(F, img, session.geo);
  img.setCoords();
}

export function cancelCrop(session: CropSession, snapshot: any) {
  const img = session.img;
  img.set(snapshot);
  img.clipPath = session.saved.clipPath;
  img.set({ lockRotation: session.saved.lockRotation, lockUniScaling: session.saved.lockUniScaling, hasControls: session.saved.hasControls });
  img.dirty = true;
  img.setCoords();
}

// Dims everything outside the frame while cropping. `vt` = viewport transform.
export function drawCropOverlay(ctx: CanvasRenderingContext2D, vt: number[], geo: FrameGeometry, canvasW: number, canvasH: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvasW, canvasH);
  const cx = geo.center.x * vt[0] + vt[4];
  const cy = geo.center.y * vt[3] + vt[5];
  const w = geo.width * vt[0];
  const h = geo.height * vt[3];
  const a = (geo.angle * Math.PI) / 180;
  const corners = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  // Counter-clockwise inner path cuts a hole (non-zero winding).
  ctx.moveTo(corners[0][0], corners[0][1]);
  ctx.lineTo(corners[3][0], corners[3][1]);
  ctx.lineTo(corners[2][0], corners[2][1]);
  ctx.lineTo(corners[1][0], corners[1][1]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(9,9,11,0.55)';
  ctx.fill('nonzero');
  ctx.beginPath();
  ctx.moveTo(corners[0][0], corners[0][1]);
  corners.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.strokeStyle = '#8CCBFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Rule-of-thirds grid
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const t = i / 3;
    const p = (u: number, v: number) => [cx + (u - 0.5) * w * Math.cos(a) - (v - 0.5) * h * Math.sin(a), cy + (u - 0.5) * w * Math.sin(a) + (v - 0.5) * h * Math.cos(a)];
    const [x1, y1] = p(t, 0);
    const [x2, y2] = p(t, 1);
    const [x3, y3] = p(0, t);
    const [x4, y4] = p(1, t);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.stroke();
  }
  ctx.restore();
}
