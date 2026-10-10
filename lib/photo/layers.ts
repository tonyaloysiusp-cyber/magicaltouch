// Layers and selections for Photo Studio Pro.
// Every layer is a full-document-size canvas (so all tools share one
// coordinate system); moving a layer re-draws it shifted. Canvases are
// never changed in place: each edit makes a new one, so undo snapshots
// can share untouched layers safely.

import { makeCanvas } from './ops';

export type Blend = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'darken' | 'lighten' | 'color' | 'luminosity' | 'difference';
export const BLENDS: { id: Blend; label: string }[] = [
  { id: 'normal', label: 'Normal' }, { id: 'multiply', label: 'Multiply' }, { id: 'screen', label: 'Screen' }, { id: 'overlay', label: 'Overlay' },
  { id: 'soft-light', label: 'Soft light' }, { id: 'darken', label: 'Darken' }, { id: 'lighten', label: 'Lighten' }, { id: 'difference', label: 'Difference' },
  { id: 'color', label: 'Colour' }, { id: 'luminosity', label: 'Luminosity' },
];

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  opacity: number; // 0..1
  blend: Blend;
}

let seq = 0;
export const newLayerId = () => `L${Date.now().toString(36)}${(seq++).toString(36)}`;
export const makeLayer = (canvas: HTMLCanvasElement, name: string, o: Partial<Layer> = {}): Layer => ({ id: newLayerId(), name, canvas, visible: true, opacity: 1, blend: 'normal', ...o });

const op = (b: Blend): GlobalCompositeOperation => (b === 'normal' ? 'source-over' : b);

export const isPlain = (layers: Layer[]) => layers.length === 1 && layers[0].visible && layers[0].opacity >= 1 && layers[0].blend === 'normal';

/** Flattens the visible layers. `scale` < 1 gives a smaller preview copy. */
export function composite(layers: Layer[], scale = 1, override?: { index: number; canvas: HTMLCanvasElement; dx?: number; dy?: number }): HTMLCanvasElement {
  const w0 = layers[0].canvas.width, h0 = layers[0].canvas.height;
  const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  layers.forEach((l, i) => {
    if (!l.visible || l.opacity <= 0) return;
    const src = override && override.index === i ? override.canvas : l.canvas;
    const dx = override && override.index === i ? (override.dx || 0) * scale : 0;
    const dy = override && override.index === i ? (override.dy || 0) * scale : 0;
    ctx.globalAlpha = l.opacity;
    ctx.globalCompositeOperation = op(l.blend);
    ctx.drawImage(src, dx, dy, w, h);
  });
  return c;
}

export function blankLike(c: HTMLCanvasElement) {
  return makeCanvas(c.width, c.height);
}

export function translate(c: HTMLCanvasElement, dx: number, dy: number) {
  const out = blankLike(c);
  out.getContext('2d')!.drawImage(c, Math.round(dx), Math.round(dy));
  return out;
}

/** Places a picture on a new transparent layer, fitted inside the document. */
export function placeImage(img: CanvasImageSource & { width: number; height: number }, docW: number, docH: number, fill = 0.8) {
  const out = makeCanvas(docW, docH);
  const k = Math.min((docW * fill) / img.width, (docH * fill) / img.height, 1);
  const w = img.width * k, h = img.height * k;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (docW - w) / 2, (docH - h) / 2, w, h);
  return out;
}

/** Merge `upper` into `lower` (keeps the lower layer's name and settings). */
export function mergeDown(lower: Layer, upper: Layer): Layer {
  const c = blankLike(lower.canvas);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(lower.canvas, 0, 0);
  if (upper.visible) {
    ctx.globalAlpha = upper.opacity;
    ctx.globalCompositeOperation = op(upper.blend);
    ctx.drawImage(upper.canvas, 0, 0);
  }
  return { ...lower, canvas: c };
}

// ---------------------------------------------------------------- selection
// A selection is a mask canvas the size of the document: opaque = selected.

export interface Selection {
  mask: HTMLCanvasElement;
  /** For the outline drawn on screen. */
  shape: { kind: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number } | null;
  inverted?: boolean;
}

export function maskShape(w: number, h: number, kind: 'rect' | 'ellipse', x: number, y: number, sw: number, sh: number, feather = 0) {
  const m = makeCanvas(w, h);
  const ctx = m.getContext('2d')!;
  if (feather > 0) ctx.filter = `blur(${feather}px)`;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  if (kind === 'rect') ctx.rect(x, y, sw, sh);
  else ctx.ellipse(x + sw / 2, y + sh / 2, Math.abs(sw / 2), Math.abs(sh / 2), 0, 0, Math.PI * 2);
  ctx.fill();
  return m;
}

export function maskAll(w: number, h: number) {
  const m = makeCanvas(w, h);
  const ctx = m.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return m;
}

export function invertMask(mask: HTMLCanvasElement) {
  const m = maskAll(mask.width, mask.height);
  const ctx = m.getContext('2d')!;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(mask, 0, 0);
  return m;
}

/** Selection from a picture's see-through areas (e.g. a background-removed cut-out). */
export function maskFromAlpha(src: HTMLCanvasElement, w = src.width, h = src.height) {
  const m = makeCanvas(w, h);
  const ctx = m.getContext('2d')!;
  ctx.drawImage(src, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return m;
}

/** orig outside the selection, edited inside it (soft edges blend). */
export function blendMasked(orig: HTMLCanvasElement, edited: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const a = makeCanvas(orig.width, orig.height);
  const actx = a.getContext('2d')!;
  actx.drawImage(orig, 0, 0);
  actx.globalCompositeOperation = 'destination-out';
  actx.drawImage(mask, 0, 0);
  const b = makeCanvas(orig.width, orig.height);
  const bctx = b.getContext('2d')!;
  bctx.drawImage(edited, 0, 0);
  bctx.globalCompositeOperation = 'destination-in';
  bctx.drawImage(mask, 0, 0);
  actx.globalCompositeOperation = 'lighter';
  actx.drawImage(b, 0, 0);
  return a;
}

export function clearMasked(c: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const out = makeCanvas(c.width, c.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(c, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(mask, 0, 0);
  return out;
}

export function copyMasked(c: HTMLCanvasElement, mask: HTMLCanvasElement) {
  const out = makeCanvas(c.width, c.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(c, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  return out;
}

export function fillMasked(c: HTMLCanvasElement, mask: HTMLCanvasElement | null, color: string) {
  const fill = makeCanvas(c.width, c.height);
  const fctx = fill.getContext('2d')!;
  fctx.fillStyle = color;
  fctx.fillRect(0, 0, c.width, c.height);
  if (mask) {
    fctx.globalCompositeOperation = 'destination-in';
    fctx.drawImage(mask, 0, 0);
  }
  const out = makeCanvas(c.width, c.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(c, 0, 0);
  ctx.drawImage(fill, 0, 0);
  return out;
}

/** Paint or erase a stroke (points in document pixels). */
export function paintStroke(c: HTMLCanvasElement, pts: { x: number; y: number }[], o: { size: number; color: string; opacity: number; hardness: number; erase?: boolean; mask?: HTMLCanvasElement | null }) {
  const stroke = makeCanvas(c.width, c.height);
  const s = stroke.getContext('2d')!;
  const blur = (o.size / 2) * (1 - o.hardness) * 0.6;
  if (blur > 0.5) s.filter = `blur(${blur}px)`;
  s.strokeStyle = o.color;
  s.fillStyle = o.color;
  s.lineCap = 'round';
  s.lineJoin = 'round';
  s.lineWidth = Math.max(1, o.size - blur * 1.5);
  s.beginPath();
  if (pts.length === 1) s.arc(pts[0].x, pts[0].y, s.lineWidth / 2, 0, Math.PI * 2);
  else pts.forEach((p, i) => (i ? s.lineTo(p.x, p.y) : s.moveTo(p.x, p.y)));
  pts.length === 1 ? s.fill() : s.stroke();
  if (o.mask) {
    s.filter = 'none';
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(o.mask, 0, 0);
  }
  const out = makeCanvas(c.width, c.height);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(c, 0, 0);
  ctx.globalAlpha = o.opacity;
  ctx.globalCompositeOperation = o.erase ? 'destination-out' : 'source-over';
  ctx.drawImage(stroke, 0, 0);
  return out;
}

/** Small square thumbnail for the Layers panel (checkerboard behind). */
export function layerThumb(c: HTMLCanvasElement, size = 40) {
  const k = size / Math.max(c.width, c.height);
  const t = makeCanvas(Math.max(1, Math.round(c.width * k)), Math.max(1, Math.round(c.height * k)));
  const ctx = t.getContext('2d')!;
  for (let y = 0; y < t.height; y += 5) for (let x = 0; x < t.width; x += 5) {
    ctx.fillStyle = ((x + y) / 5) % 2 ? '#d4d4d8' : '#f4f4f5';
    ctx.fillRect(x, y, 5, 5);
  }
  ctx.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL();
}
