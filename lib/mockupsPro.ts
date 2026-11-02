// ---------------------------------------------------------------------
// lib/mockupsPro.ts — the /mockups page.
// Two kinds of mockups, all drawn in the visitor's browser (nothing is
// uploaded) and all copyright-free:
//  · Photo mockups — real CC0 / free-licence photos from our own library
//    (public/templates/photos/pro, see index.json) with the design put on
//    the screen, wall or paper in true perspective.
//  · Studio mockups — realistic printed and product items (frames, canvas,
//    flyers, cards, books, mugs, bags, boxes…) lit and shadowed on real-
//    photo or studio backgrounds.
// Every scene draws with draw(ctx, W, H, art, photos).
// ---------------------------------------------------------------------

import { drawPerspective, fitInQuad, Pt } from '@/lib/mockups';

export type Art = CanvasImageSource & { width: number; height: number };
export type ProGroup = 'Photo mockups' | 'Frames & wall art' | 'Print & stationery' | 'Devices' | 'Merch & packaging' | 'Outdoor';
export interface ProScene {
  id: string;
  name: string;
  group: ProGroup;
  aspect: number;
  photos: string[];
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, art: Art, ph: Record<string, HTMLImageElement>) => void;
}

const P = (f: string) => `/templates/photos/pro/${f}.jpg`;

// ---------------------------------------------------------------- helpers
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}
function shadow(ctx: CanvasRenderingContext2D, blur: number, dy: number, a: number, dx = 0) {
  ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetX = dx; ctx.shadowOffsetY = dy;
}
const noShadow = (ctx: CanvasRenderingContext2D) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };
function canvas(w: number, h: number) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
/** Draw `img` to cover / fit the box. */
function cover(ctx: CanvasRenderingContext2D, img: Art, x: number, y: number, w: number, h: number, fit = false) {
  const k = (fit ? Math.min : Math.max)(w / img.width, h / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
/** The art cut to an exact aspect (cover), as a canvas. */
function artAt(art: Art, aspect: number, long = 1400) {
  const c = aspect >= 1 ? canvas(long, long / aspect) : canvas(long * aspect, long);
  const x = c.getContext('2d')!;
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  cover(x, art, 0, 0, c.width, c.height);
  return c;
}
/** The art fitted inside a paper of `aspect` with white margins only where needed. */
function artOnPaper(art: Art, aspect: number, paper = '#FBFAF7', long = 1400) {
  const c = aspect >= 1 ? canvas(long, long / aspect) : canvas(long * aspect, long);
  const x = c.getContext('2d')!;
  x.fillStyle = paper; x.fillRect(0, 0, c.width, c.height);
  cover(x, art, 0, 0, c.width, c.height, true);
  return c;
}
/** Fills `aspect`: a close fit is cropped; a very different shape sits on a soft blurred copy of itself. */
function smartFill(art: Art, aspect: number, long = 1400) {
  const ar = art.width / art.height;
  if (Math.abs(Math.log(ar / aspect)) < 0.2) return artAt(art, aspect, long);
  const c = aspect >= 1 ? canvas(long, long / aspect) : canvas(long * aspect, long);
  const x = c.getContext('2d')!;
  x.save(); x.filter = 'blur(28px) brightness(0.82) saturate(1.1)'; cover(x, art, -60, -60, c.width + 120, c.height + 120); x.restore();
  x.save(); x.shadowColor = 'rgba(0,0,0,0.3)'; x.shadowBlur = 30; cover(x, art, c.width * 0.04, c.height * 0.04, c.width * 0.92, c.height * 0.92, true); x.restore();
  return c;
}
/** The art's main colour (average of its edge), for box sides and card backs. */
function mainColor(art: Art) {
  const c = canvas(16, 16); const x = c.getContext('2d')!; x.drawImage(art, 0, 0, 16, 16);
  try { const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < 256; i++) { const px = i % 16, py = (i / 16) | 0; if (px > 1 && px < 14 && py > 1 && py < 14) continue; r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; n++; }
    return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`; } catch { return '#333'; }
}
let noiseTile: HTMLCanvasElement | null = null;
function grain(ctx: CanvasRenderingContext2D, W: number, H: number, a: number) {
  if (!noiseTile) {
    noiseTile = canvas(180, 180);
    const x = noiseTile.getContext('2d')!;
    const d = x.createImageData(180, 180);
    let s = 7;
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = (s % 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
  }
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat')!; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function vignette(ctx: CanvasRenderingContext2D, W: number, H: number, a = 0.28) {
  const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
/** Light falling from the top left across a flat item. */
function light(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, s = 0.16) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, `rgba(255,255,255,${s})`); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(0,0,0,${s * 0.8})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
/** Photo as a background: cover, with blur and tone. */
function photoBg(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number, blur = 0, bright = 1, tint?: string) {
  ctx.save();
  if (blur) ctx.filter = `blur(${blur}px) brightness(${bright})`;
  else if (bright !== 1) ctx.filter = `brightness(${bright})`;
  const pad = blur * 2;
  cover(ctx, img, -pad, -pad, W + 2 * pad, H + 2 * pad);
  ctx.restore();
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
}
/** Screen glass: the art in a 4-corner screen, plus a faint reflection. */
function screenIn(ctx: CanvasRenderingContext2D, art: Art, quad: Pt[], glare = 0.12) {
  const w = (Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1])) / 2;
  const h = (Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[1][0], quad[2][1] - quad[1][1])) / 2;
  const img = smartFill(art, w / h, 1200);
  const x = img.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, img.width, img.height);
  g.addColorStop(0, `rgba(255,255,255,${glare})`); g.addColorStop(0.42, `rgba(255,255,255,${glare * 0.3})`); g.addColorStop(0.43, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.06)');
  x.fillStyle = g; x.fillRect(0, 0, img.width, img.height);
  drawPerspective(ctx, img, quad, 16);
}
const pq = (W: number, H: number, q: [number, number][]): Pt[] => q.map(([x, y]) => [x / 100 * W, y / 100 * H]);

// ---------------------------------------------------------------- backdrops
type Backdrop = { id: string; label: string; photo?: string; table?: boolean; draw: (ctx: CanvasRenderingContext2D, W: number, H: number, ph: Record<string, HTMLImageElement>) => void };
const BACKDROPS: Record<string, Backdrop> = {
  studio: { id: 'studio', label: 'studio', draw(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ECEAE6'); g.addColorStop(0.72, '#DEDBD5'); g.addColorStop(0.73, '#D3CFC8'); g.addColorStop(1, '#C9C4BC');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); vignette(ctx, W, H, 0.22); grain(ctx, W, H, 0.05);
  } },
  linen: { id: 'linen', label: 'linen', draw(ctx, W, H) {
    ctx.fillStyle = '#F2EEE7'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = '#7A6F60';
    for (let i = 0; i < W; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let i = 0; i < H; i += 3) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
    ctx.restore();
    const g = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, W * 1.2); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(90,70,40,0.16)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); grain(ctx, W, H, 0.05);
  } },
  concrete: { id: 'concrete', label: 'concrete', draw(ctx, W, H) {
    ctx.fillStyle = '#A9A8A4'; ctx.fillRect(0, 0, W, H);
    let s = 11;
    for (let i = 0; i < 260; i++) { s = (s * 16807) % 2147483647; const x = (s % 1000) / 1000 * W; s = (s * 16807) % 2147483647; const y = (s % 1000) / 1000 * H; s = (s * 16807) % 2147483647; const r = 20 + (s % 120);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    vignette(ctx, W, H, 0.3); grain(ctx, W, H, 0.12);
  } },
  sage: { id: 'sage', label: 'sage wall', draw(ctx, W, H) {
    ctx.fillStyle = '#A7B39C'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#E8E2D6'; ctx.fillRect(0, H * 0.9, W, H * 0.1); ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, H * 0.9, W, H * 0.008);
    vignette(ctx, W, H, 0.18); grain(ctx, W, H, 0.06);
  } },
  navy: { id: 'navy', label: 'navy wall', draw(ctx, W, H) {
    ctx.fillStyle = '#26344A'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.1, 0, W * 0.5, H * 0.3, W * 0.8); g.addColorStop(0, 'rgba(255,240,210,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.25)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 0.06);
  } },
  plaster: { id: 'plaster', label: 'warm plaster', draw(ctx, W, H) {
    ctx.fillStyle = '#E9DFD2'; ctx.fillRect(0, 0, W, H);
    let s = 21; for (let i = 0; i < 180; i++) { s = (s * 16807) % 2147483647; const x = (s % 1000) / 1000 * W; s = (s * 16807) % 2147483647; const y = (s % 1000) / 1000 * H; const r = 30 + (s % 90);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, i % 2 ? 'rgba(255,255,255,0.08)' : 'rgba(120,90,60,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const g = ctx.createLinearGradient(W, 0, 0, H); g.addColorStop(0, 'rgba(255,248,235,0.3)'); g.addColorStop(1, 'rgba(60,40,20,0.18)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    grain(ctx, W, H, 0.05);
  } },
  pastel: { id: 'pastel', label: 'pastel', draw(ctx, W, H) {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    const wash = (x: number, y: number, r: number, c: string) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    wash(0, 0, W * 0.8, 'rgba(243,166,184,0.55)'); wash(W, H * 0.1, W * 0.7, 'rgba(140,203,255,0.5)'); wash(W * 0.5, H * 1.1, W * 0.7, 'rgba(191,232,200,0.55)');
    grain(ctx, W, H, 0.04);
  } },
  marble: { id: 'marble', label: 'marble', table: true, draw(ctx, W, H) {
    ctx.fillStyle = '#F4F3F1'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.lineCap = 'round';
    let s = 5;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s % 10000) / 10000; };
    for (let v = 0; v < 7; v++) {
      const x0 = -W * 0.1 + rnd() * W * 0.6, y0 = -H * 0.1 + rnd() * H * 0.3;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x0 + W * (0.2 + rnd() * 0.3), y0 + H * (0.2 + rnd() * 0.3), x0 + W * (0.3 + rnd() * 0.4), y0 + H * (0.5 + rnd() * 0.3), x0 + W * (0.7 + rnd() * 0.5), y0 + H * (0.9 + rnd() * 0.4));
      ctx.strokeStyle = `rgba(150,148,145,${0.1 + rnd() * 0.14})`; ctx.lineWidth = 1.5 + rnd() * 5; ctx.filter = `blur(${2 + rnd() * 4}px)`; ctx.stroke();
      ctx.strokeStyle = `rgba(170,165,160,${0.12 + rnd() * 0.1})`; ctx.lineWidth = 0.7; ctx.filter = 'blur(0.6px)'; ctx.stroke();
    }
    ctx.restore(); vignette(ctx, W, H, 0.12); grain(ctx, W, H, 0.04);
  } },
  wood: { id: 'wood', label: 'wood', table: true, draw(ctx, W, H) {
    const plank = H / 5;
    let s = 3;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s % 10000) / 10000; };
    for (let p = 0; p < 6; p++) {
      const y = p * plank, base = [176, 124, 78].map((c) => c - 8 + rnd() * 16);
      ctx.fillStyle = `rgb(${base.join(',')})`; ctx.fillRect(0, y, W, plank);
      const ph0 = rnd() * 10;
      for (let l = 0; l < 70; l++) {
        const ly = y + rnd() * plank, amp = plank * (0.02 + rnd() * 0.05), fr = 2 + rnd() * 3; ctx.beginPath(); ctx.moveTo(0, ly);
        for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, ly + Math.sin(x / W * fr + ph0 + l * 0.15) * amp);
        ctx.strokeStyle = `rgba(${rnd() > 0.35 ? '95,58,28' : '225,180,128'},${0.05 + rnd() * 0.1})`; ctx.lineWidth = 0.5 + rnd() * 2.2; ctx.stroke();
      }
      ctx.save(); ctx.filter = 'blur(1px)'; ctx.drawImage(ctx.canvas, 0, y, W, plank, 0, y, W, plank); ctx.restore();
      ctx.fillStyle = 'rgba(40,20,5,0.45)'; ctx.fillRect(0, y - 1, W, 2);
    }
    const g = ctx.createRadialGradient(W * 0.35, H * 0.3, 0, W * 0.4, H * 0.4, W); g.addColorStop(0, 'rgba(255,240,215,0.18)'); g.addColorStop(1, 'rgba(30,15,0,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); grain(ctx, W, H, 0.06);
  } },
  room: { id: 'room', label: 'living room', photo: P('livingroom'), draw(ctx, W, H, ph) { photoBg(ctx, ph[P('livingroom')], W, H, 16, 1.02, 'rgba(255,250,240,0.08)'); vignette(ctx, W, H, 0.2); } },
  apartment: { id: 'apartment', label: 'apartment', photo: P('apartment'), draw(ctx, W, H, ph) { photoBg(ctx, ph[P('apartment')], W, H, 18, 1.08); vignette(ctx, W, H, 0.25); } },
  bokeh: { id: 'bokeh', label: 'evening lights', photo: P('x_bokeh'), draw(ctx, W, H, ph) { photoBg(ctx, ph[P('x_bokeh')], W, H, 6, 0.85); vignette(ctx, W, H, 0.35); } },
  cafe: { id: 'cafe', label: 'café', photo: P('restaurant'), draw(ctx, W, H, ph) { photoBg(ctx, ph[P('restaurant')], W, H, 18, 0.95); vignette(ctx, W, H, 0.3); } },
};

// ---------------------------------------------------------------- items
// Each item draws itself centred on the backdrop.
type ItemFn = (ctx: CanvasRenderingContext2D, W: number, H: number, art: Art, table: boolean) => void;

function frame(color: string, inner: string, depth = 0.028, mat = 0.07): ItemFn {
  return (ctx, W, H, art) => {
    const ar = art.width / art.height;
    const maxW = W * 0.42, maxH = H * 0.6;
    let fw = maxH * ar, fh = maxH; if (fw > maxW) { fw = maxW; fh = fw / ar; }
    const m = Math.min(fw, fh) * mat, b = Math.min(W, H) * depth;
    const ow = fw + 2 * (m + b), oh = fh + 2 * (m + b), X = (W - ow) / 2, Y = (H - oh) / 2 - H * 0.03;
    ctx.save(); shadow(ctx, W * 0.035, W * 0.018, 0.38, W * 0.006); ctx.fillStyle = color; ctx.fillRect(X, Y, ow, oh); ctx.restore();
    // frame bevel
    const g = ctx.createLinearGradient(X, Y, X + ow, Y + oh); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.fillRect(X, Y, ow, oh);
    ctx.fillStyle = inner; ctx.fillRect(X + b, Y + b, ow - 2 * b, oh - 2 * b);
    // inner shadow from the frame onto the mat
    ctx.save(); ctx.beginPath(); ctx.rect(X + b, Y + b, ow - 2 * b, oh - 2 * b); ctx.clip();
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = b * 0.8; ctx.shadowOffsetY = b * 0.25; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = b; ctx.strokeRect(X + b / 2, Y + b / 2, ow - b, oh - b); ctx.restore();
    ctx.drawImage(art, X + b + m, Y + b + m, fw, fh);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; ctx.strokeRect(X + b + m, Y + b + m, fw, fh);
    // glass
    const gl = ctx.createLinearGradient(X, Y, X + ow * 0.8, Y + oh); gl.addColorStop(0, 'rgba(255,255,255,0.14)'); gl.addColorStop(0.35, 'rgba(255,255,255,0.03)'); gl.addColorStop(0.36, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(X + b, Y + b, ow - 2 * b, oh - 2 * b);
  };
}
const canvasPrint: ItemFn = (ctx, W, H, art) => {
  const ar = art.width / art.height;
  let w = H * 0.56 * ar, h = H * 0.56; if (w > W * 0.46) { w = W * 0.46; h = w / ar; }
  const X = (W - w) / 2, Y = (H - h) / 2 - H * 0.02, d = W * 0.014;
  ctx.save(); shadow(ctx, W * 0.03, W * 0.02, 0.4, W * 0.012); ctx.fillStyle = '#ddd'; ctx.fillRect(X, Y, w + d, h + d * 0.4); ctx.restore();
  // wrapped side (right edge) shows a darker strip of the art
  ctx.save(); ctx.beginPath(); ctx.moveTo(X + w, Y); ctx.lineTo(X + w + d, Y + d * 0.4); ctx.lineTo(X + w + d, Y + h + d * 0.4); ctx.lineTo(X + w, Y + h); ctx.closePath(); ctx.clip();
  ctx.drawImage(art, art.width * 0.97, 0, art.width * 0.03, art.height, X + w, Y, d, h + d * 0.4); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X + w, Y, d, h + d); ctx.restore();
  ctx.drawImage(art, X, Y, w, h);
  // canvas weave
  ctx.save(); ctx.beginPath(); ctx.rect(X, Y, w, h); ctx.clip(); ctx.globalAlpha = 0.06; ctx.strokeStyle = '#000';
  for (let i = 0; i < w; i += 3) { ctx.beginPath(); ctx.moveTo(X + i, Y); ctx.lineTo(X + i, Y + h); ctx.stroke(); }
  ctx.restore(); light(ctx, X, Y, w, h, 0.12);
};
const tapedPoster: ItemFn = (ctx, W, H, art) => {
  const ar = art.width / art.height;
  let w = H * 0.74 * ar, h = H * 0.74; if (w > W * 0.55) { w = W * 0.55; h = w / ar; }
  const X = (W - w) / 2, Y = (H - h) / 2;
  ctx.save(); shadow(ctx, W * 0.012, W * 0.006, 0.3); ctx.fillStyle = '#fff'; ctx.fillRect(X, Y, w, h); ctx.restore();
  ctx.drawImage(artOnPaper(art, w / h), X, Y, w, h);
  const curl = ctx.createLinearGradient(X, Y + h * 0.85, X, Y + h); curl.addColorStop(0, 'rgba(0,0,0,0)'); curl.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = curl; ctx.fillRect(X, Y + h * 0.85, w, h * 0.15); light(ctx, X, Y, w, h, 0.1);
  const tape = (x: number, y: number, a: number) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(245,240,225,0.72)'; ctx.fillRect(-W * 0.035, -W * 0.01, W * 0.07, W * 0.02); ctx.restore(); };
  tape(X + w * 0.5, Y, -0.04); tape(X, Y + h, 0.7); tape(X + w, Y + h, -0.7);
};
/** A sheet lying on a table, slightly turned, with soft contact shadow. */
function sheet(ctx: CanvasRenderingContext2D, art: Art, cx: number, cy: number, w: number, h: number, rot: number, paper = '#FCFBF8', a = 0.3) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
  shadow(ctx, w * 0.06, w * 0.025, a, w * 0.01); ctx.fillStyle = paper; ctx.fillRect(-w / 2, -h / 2, w, h); noShadow(ctx);
  ctx.drawImage(artOnPaper(art, w / h, paper), -w / 2, -h / 2, w, h);
  light(ctx, -w / 2, -h / 2, w, h, 0.1);
  ctx.restore();
}
const flyerFlat: ItemFn = (ctx, W, H, art) => {
  const ar = art.width / art.height; const h = H * 0.78, w = Math.min(h * ar, W * 0.6);
  sheet(ctx, art, W * 0.5, H * 0.5, w, w / ar, -0.06);
};
const flyerStack: ItemFn = (ctx, W, H, art) => {
  const ar = art.width / art.height; const h = H * 0.66, w = Math.min(h * ar, W * 0.42);
  sheet(ctx, art, W * 0.38, H * 0.52, w, w / ar, -0.14, '#FCFBF8', 0.22);
  sheet(ctx, art, W * 0.5, H * 0.5, w, w / ar, 0.02, '#FCFBF8', 0.25);
  sheet(ctx, art, W * 0.63, H * 0.49, w, w / ar, 0.13);
};
const businessCards: ItemFn = (ctx, W, H, art) => {
  const w = W * 0.34, h = w / 1.75;
  // back card shows the art as a colour field with the art's centre
  ctx.save(); ctx.translate(W * 0.4, H * 0.42); ctx.rotate(-0.12); shadow(ctx, w * 0.06, w * 0.03, 0.32); ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -h / 2, w, h); noShadow(ctx);
  ctx.fillStyle = mainColor(art); ctx.fillRect(-w / 2, -h / 2, w, h); const lg = h * 0.42; cover(ctx, art, -lg / 2, -lg / 2, lg, lg, true); light(ctx, -w / 2, -h / 2, w, h, 0.16); ctx.restore();
  ctx.save(); ctx.translate(W * 0.6, H * 0.6); ctx.rotate(0.07); shadow(ctx, w * 0.06, w * 0.03, 0.32); ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -h / 2, w, h); noShadow(ctx);
  ctx.drawImage(smartFill(art, w / h), -w / 2, -h / 2, w, h); light(ctx, -w / 2, -h / 2, w, h, 0.14); ctx.restore();
};
const greetingCard: ItemFn = (ctx, W, H, art) => {
  const ar = art.width / art.height; const h = H * 0.62, w = Math.min(h * ar, W * 0.36);
  const X = W * 0.5 - w * 0.45, Y = H * 0.5 - (w / ar) / 2 - H * 0.04, hh = w / ar;
  // inside page (behind, angled)
  ctx.save(); ctx.fillStyle = '#EDEBE6'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - w * 0.55, Y + hh * 0.05); ctx.lineTo(X - w * 0.55, Y + hh * 1.02); ctx.lineTo(X, Y + hh); ctx.closePath(); shadow(ctx, w * 0.08, w * 0.03, 0.25); ctx.fill(); ctx.restore();
  ctx.save(); const sg = ctx.createLinearGradient(X - w * 0.55, 0, X, 0); sg.addColorStop(0, 'rgba(0,0,0,0.02)'); sg.addColorStop(1, 'rgba(0,0,0,0.18)'); ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - w * 0.55, Y + hh * 0.05); ctx.lineTo(X - w * 0.55, Y + hh * 1.02); ctx.lineTo(X, Y + hh); ctx.closePath(); ctx.fill(); ctx.restore();
  // front
  ctx.save(); shadow(ctx, w * 0.07, w * 0.03, 0.3, w * 0.02); ctx.fillStyle = '#fff'; ctx.fillRect(X, Y, w, hh); ctx.restore();
  ctx.drawImage(artOnPaper(art, w / hh), X, Y, w, hh); light(ctx, X, Y, w, hh, 0.12);
  // floor contact shadow
  const fg = ctx.createRadialGradient(W * 0.5, Y + hh + 4, 0, W * 0.5, Y + hh + 4, w); fg.addColorStop(0, 'rgba(0,0,0,0.18)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fg; ctx.fillRect(X - w, Y + hh, w * 3, H * 0.04);
};
const invitation: ItemFn = (ctx, W, H, art) => {
  const ar = art.width / art.height; const h = H * 0.6, w = Math.min(h * ar, W * 0.36), hh = w / ar;
  // envelope
  const ew = w * 1.12, eh = ew * 0.7;
  ctx.save(); ctx.translate(W * 0.64, H * 0.6); ctx.rotate(0.1); shadow(ctx, ew * 0.05, ew * 0.02, 0.25); ctx.fillStyle = '#E9E2D6'; ctx.fillRect(-ew / 2, -eh / 2, ew, eh); noShadow(ctx);
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.beginPath(); ctx.moveTo(-ew / 2, -eh / 2); ctx.lineTo(0, eh * 0.08); ctx.lineTo(ew / 2, -eh / 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.moveTo(-ew / 2, eh / 2); ctx.lineTo(0, eh * 0.02); ctx.lineTo(ew / 2, eh / 2); ctx.stroke(); light(ctx, -ew / 2, -eh / 2, ew, eh, 0.12); ctx.restore();
  sheet(ctx, art, W * 0.42, H * 0.47, w, hh, -0.07, '#FFFDF8');
};
function device(kind: 'phone' | 'tablet' | 'laptop'): ItemFn {
  return (ctx, W, H, art, table) => {
    if (kind === 'laptop') {
      const sw = W * 0.5, sh = sw / 1.6, bz = sw * 0.03, X = (W - sw) / 2, Y = (H - sh - bz * 2 - H * 0.035) / 2 + bz;
      ctx.save(); shadow(ctx, W * 0.03, W * 0.012, 0.35); ctx.fillStyle = '#1B1C1F'; rr(ctx, X - bz, Y - bz, sw + 2 * bz, sh + 2 * bz, bz); ctx.fill(); ctx.restore();
      ctx.drawImage(smartFill(art, sw / sh), X, Y, sw, sh);
      const gl = ctx.createLinearGradient(X, Y, X + sw, Y + sh); gl.addColorStop(0, 'rgba(255,255,255,0.1)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(X, Y, sw, sh);
      const by = Y + sh + bz, bw = sw * 1.22, bx = (W - bw) / 2, bh = H * 0.035;
      ctx.save(); shadow(ctx, W * 0.03, W * 0.01, 0.3); const bg = ctx.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, '#D9DADC'); bg.addColorStop(1, '#9EA1A6'); ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(X - bz, by); ctx.lineTo(X + sw + bz, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#8A8D92'; ctx.fillRect(W / 2 - sw * 0.08, by, sw * 0.16, bh * 0.25);
      return;
    }
    const portrait = kind === 'phone' ? true : art.height >= art.width;
    const ratio = kind === 'phone' ? 19.5 / 9 : 4 / 3;
    let h = H * (kind === 'phone' ? 0.8 : 0.78), w = portrait ? h / ratio : h * ratio;
    if (w > W * 0.7) { w = W * 0.7; h = portrait ? w * ratio : w / ratio; }
    const X = (W - w) / 2, Y = (H - h) / 2, r = Math.min(w, h) * (kind === 'phone' ? 0.14 : 0.06), b = Math.min(w, h) * (kind === 'phone' ? 0.04 : 0.045);
    ctx.save(); if (table) { ctx.translate(W / 2, H / 2); ctx.rotate(-0.12); ctx.translate(-W / 2, -H / 2); }
    ctx.save(); shadow(ctx, W * 0.035, W * 0.018, 0.4, W * 0.006); ctx.fillStyle = '#121316'; rr(ctx, X, Y, w, h, r); ctx.fill(); ctx.restore();
    const edge = ctx.createLinearGradient(X, Y, X + w, Y + h); edge.addColorStop(0, 'rgba(255,255,255,0.35)'); edge.addColorStop(0.5, 'rgba(255,255,255,0.05)'); edge.addColorStop(1, 'rgba(255,255,255,0.25)');
    ctx.strokeStyle = edge; ctx.lineWidth = Math.max(2, b * 0.25); rr(ctx, X + 1, Y + 1, w - 2, h - 2, r); ctx.stroke();
    ctx.save(); rr(ctx, X + b, Y + b, w - 2 * b, h - 2 * b, r * 0.75); ctx.clip();
    ctx.drawImage(smartFill(art, (w - 2 * b) / (h - 2 * b)), X + b, Y + b, w - 2 * b, h - 2 * b);
    const gl = ctx.createLinearGradient(X, Y, X + w, Y + h * 0.6); gl.addColorStop(0, 'rgba(255,255,255,0.14)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.02)'); gl.addColorStop(0.46, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(X, Y, w, h);
    ctx.restore();
    if (kind === 'phone') { ctx.fillStyle = '#0B0B0D'; rr(ctx, X + w / 2 - w * 0.13, Y + b + h * 0.012, w * 0.26, h * 0.028, h * 0.014); ctx.fill(); }
    ctx.restore();
  };
}
const book: ItemFn = (ctx, W, H, art) => {
  const ar = Math.min(0.8, Math.max(0.62, art.width / art.height));
  const h = H * 0.74, w = h * ar, X = (W - w) / 2 + W * 0.02, Y = (H - h) / 2, sp = w * 0.07;
  ctx.save(); shadow(ctx, W * 0.035, W * 0.02, 0.4, W * 0.014); ctx.fillStyle = '#E6E2DA'; ctx.fillRect(X, Y, w + w * 0.03, h); ctx.restore();
  ctx.fillStyle = '#F7F4EC'; ctx.fillRect(X + w, Y + h * 0.01, w * 0.03, h * 0.98);
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.08)'; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(X + w + i * w * 0.005, Y + h * 0.012); ctx.lineTo(X + w + i * w * 0.005, Y + h * 0.988); ctx.stroke(); } ctx.restore();
  ctx.drawImage(artAt(art, w / h), X, Y, w, h);
  const g = ctx.createLinearGradient(X, 0, X + sp * 1.6, 0); g.addColorStop(0, 'rgba(0,0,0,0.4)'); g.addColorStop(0.25, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(X, Y, sp * 1.6, h); light(ctx, X, Y, w, h, 0.1);
};
const magazine: ItemFn = (ctx, W, H, art) => {
  const h = H * 0.8, w = h * 0.75;
  ctx.save(); ctx.translate(W * 0.5, H * 0.5); ctx.rotate(0.05);
  shadow(ctx, W * 0.03, W * 0.012, 0.32); ctx.fillStyle = '#fff'; ctx.fillRect(-w / 2, -h / 2, w, h); noShadow(ctx);
  ctx.drawImage(artAt(art, w / h), -w / 2, -h / 2, w, h);
  const g = ctx.createLinearGradient(-w / 2, 0, -w / 2 + w * 0.06, 0); g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w * 0.06, h);
  const gl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); gl.addColorStop(0, 'rgba(255,255,255,0.18)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.08)'); ctx.fillStyle = gl; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
};
const tote: ItemFn = (ctx, W, H, art) => {
  const w = W * 0.38, h = w * 1.08, X = (W - w) / 2, Y = H * 0.3;
  ctx.save(); ctx.strokeStyle = '#D8CCB4'; ctx.lineWidth = w * 0.06; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(X + w * 0.22, Y + 4); ctx.bezierCurveTo(X + w * 0.22, Y - h * 0.45, X + w * 0.78, Y - h * 0.45, X + w * 0.78, Y + 4); ctx.stroke(); ctx.restore();
  ctx.save(); shadow(ctx, W * 0.03, W * 0.015, 0.3); ctx.fillStyle = '#EFE6D3'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + w, Y); ctx.lineTo(X + w * 1.02, Y + h); ctx.lineTo(X - w * 0.02, Y + h); ctx.closePath(); ctx.fill(); ctx.restore();
  const s = w * 0.62; ctx.save(); ctx.globalCompositeOperation = 'multiply'; cover(ctx, art, X + (w - s) / 2, Y + h * 0.18, s, s * 1.05, true); ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#5a4a2a'; for (let i = 0; i < w; i += 3) { ctx.beginPath(); ctx.moveTo(X + i, Y); ctx.lineTo(X + i, Y + h); ctx.stroke(); } ctx.restore();
  const fold = ctx.createLinearGradient(X, 0, X + w, 0); fold.addColorStop(0, 'rgba(0,0,0,0.1)'); fold.addColorStop(0.5, 'rgba(255,255,255,0.08)'); fold.addColorStop(1, 'rgba(0,0,0,0.14)'); ctx.fillStyle = fold; ctx.fillRect(X, Y, w, h);
};
const tshirt: ItemFn = (ctx, W, H, art) => {
  const s = Math.min(W, H) * 0.92, cx = W / 2, top = (H - s * 0.95) / 2;
  const path = () => { ctx.beginPath(); const p = (x: number, y: number) => [cx + x * s, top + y * s] as const;
    ctx.moveTo(...p(-0.12, 0.02)); ctx.quadraticCurveTo(...p(0, 0.09), ...p(0.12, 0.02)); ctx.lineTo(...p(0.3, 0.08)); ctx.lineTo(...p(0.44, 0.28)); ctx.lineTo(...p(0.33, 0.35)); ctx.lineTo(...p(0.27, 0.27));
    ctx.lineTo(...p(0.28, 0.95)); ctx.lineTo(...p(-0.28, 0.95)); ctx.lineTo(...p(-0.27, 0.27)); ctx.lineTo(...p(-0.33, 0.35)); ctx.lineTo(...p(-0.44, 0.28)); ctx.lineTo(...p(-0.3, 0.08)); ctx.closePath(); };
  ctx.save(); shadow(ctx, s * 0.04, s * 0.015, 0.3); ctx.fillStyle = '#F7F7F5'; path(); ctx.fill(); ctx.restore();
  ctx.save(); path(); ctx.clip();
  const pw = s * 0.3; ctx.save(); ctx.globalCompositeOperation = 'multiply'; cover(ctx, art, cx - pw / 2, top + s * 0.2, pw, pw * 1.2, true); ctx.restore();
  const g = ctx.createLinearGradient(cx - s * 0.3, 0, cx + s * 0.3, 0); g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(0.3, 'rgba(255,255,255,0.05)'); g.addColorStop(0.7, 'rgba(0,0,0,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fold = ctx.createRadialGradient(cx + s * 0.08, top + s * 0.62, 0, cx + s * 0.08, top + s * 0.62, s * 0.18); fold.addColorStop(0, 'rgba(0,0,0,0.05)'); fold.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = fold; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = s * 0.004; ctx.beginPath(); ctx.moveTo(cx - s * 0.12, top + s * 0.02); ctx.quadraticCurveTo(cx, top + s * 0.09, cx + s * 0.12, top + s * 0.02); ctx.stroke();
};
const mug: ItemFn = (ctx, W, H, art) => {
  const w = W * 0.34, h = w * 0.95, X = (W - w) / 2 - w * 0.08, Y = (H - h) / 2 + H * 0.04;
  // handle
  ctx.save(); ctx.strokeStyle = '#F2F2F0'; ctx.lineWidth = w * 0.09; shadow(ctx, w * 0.05, w * 0.02, 0.25);
  ctx.beginPath(); ctx.ellipse(X + w + w * 0.06, Y + h * 0.45, w * 0.17, h * 0.24, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
  ctx.save(); shadow(ctx, w * 0.12, w * 0.05, 0.3); ctx.fillStyle = '#F4F4F2'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + w, Y); ctx.lineTo(X + w, Y + h); ctx.ellipse(X + w / 2, Y + h, w / 2, w * 0.07, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.restore();
  // print wraps: narrow at the sides
  const pw = w * 0.62, ph = h * 0.62, px = X + (w - pw) / 2, py = Y + h * 0.18;
  const img = artOnPaper(art, pw / ph, 'rgba(0,0,0,0)');
  const strips = 30;
  for (let i = 0; i < strips; i++) {
    const t0 = i / strips, t1 = (i + 1) / strips;
    const a0 = (t0 - 0.5) * Math.PI * 0.62, a1 = (t1 - 0.5) * Math.PI * 0.62;
    const x0 = X + w / 2 + Math.sin(a0) * w / 2 * 0.98, x1 = X + w / 2 + Math.sin(a1) * w / 2 * 0.98;
    ctx.drawImage(img, t0 * img.width, 0, img.width / strips + 1, img.height, x0, py, Math.max(1, x1 - x0 + 0.6), ph);
  }
  void px;
  const sh = ctx.createLinearGradient(X, 0, X + w, 0); sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(0.3, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sh; ctx.fillRect(X, Y, w, h);
  ctx.fillStyle = '#E4E4E1'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y, w / 2, w * 0.07, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3B2A1E'; ctx.beginPath(); ctx.ellipse(X + w / 2, Y + w * 0.012, w * 0.45, w * 0.055, 0, 0, Math.PI * 2); ctx.fill();
};
const box: ItemFn = (ctx, W, H, art) => {
  const s = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2 + H * 0.06;
  const top: Pt[] = [[cx, cy - s * 0.95], [cx + s * 0.85, cy - s * 0.55], [cx, cy - s * 0.15], [cx - s * 0.85, cy - s * 0.55]];
  const left: Pt[] = [[cx - s * 0.85, cy - s * 0.55], [cx, cy - s * 0.15], [cx, cy + s * 0.75], [cx - s * 0.85, cy + s * 0.35]];
  const right: Pt[] = [[cx, cy - s * 0.15], [cx + s * 0.85, cy - s * 0.55], [cx + s * 0.85, cy + s * 0.35], [cx, cy + s * 0.75]];
  ctx.save(); shadow(ctx, s * 0.2, s * 0.08, 0.35); ctx.fillStyle = '#ddd'; ctx.beginPath(); [...left, right[1], right[2]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.restore();
  const col = mainColor(art);
  drawPerspective(ctx, smartFill(art, 1, 900), [left[0], left[1], left[2], left[3]], 10);
  ctx.fillStyle = col; ctx.beginPath(); right.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
  const lid = canvas(400, 400); const lx = lid.getContext('2d')!; cover(lx, art, 120, 120, 160, 160, true);
  drawPerspective(ctx, lid, [top[3], top[0], top[1], top[2]], 8);
  const tl = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy); tl.addColorStop(0, 'rgba(255,255,255,0.18)'); tl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = tl; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
};
const sticker: ItemFn = (ctx, W, H, art) => {
  const r = Math.min(W, H) * 0.3, cx = W / 2, cy = H / 2;
  ctx.save(); shadow(ctx, r * 0.12, r * 0.05, 0.3); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); ctx.clip(); cover(ctx, art, cx - r * 0.9, cy - r * 0.9, r * 1.8, r * 1.8); ctx.restore();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
};
const pillow: ItemFn = (ctx, W, H, art) => {
  const s = Math.min(W, H) * 0.62, X = (W - s) / 2, Y = (H - s) / 2;
  const path = () => { ctx.beginPath(); ctx.moveTo(X, Y); ctx.quadraticCurveTo(X + s / 2, Y + s * 0.05, X + s, Y); ctx.quadraticCurveTo(X + s * 0.95, Y + s / 2, X + s, Y + s); ctx.quadraticCurveTo(X + s / 2, Y + s * 0.95, X, Y + s); ctx.quadraticCurveTo(X + s * 0.05, Y + s / 2, X, Y); ctx.closePath(); };
  ctx.save(); shadow(ctx, s * 0.08, s * 0.04, 0.35); ctx.fillStyle = '#eee'; path(); ctx.fill(); ctx.restore();
  ctx.save(); path(); ctx.clip(); cover(ctx, art, X, Y, s, s);
  const g = ctx.createRadialGradient(X + s * 0.45, Y + s * 0.4, s * 0.1, X + s / 2, Y + s / 2, s * 0.75); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g; ctx.fillRect(X, Y, s, s);
  ctx.globalAlpha = 0.05; ctx.strokeStyle = '#000'; for (let i = 0; i < s; i += 3) { ctx.beginPath(); ctx.moveTo(X + i, Y); ctx.lineTo(X + i, Y + s); ctx.stroke(); }
  ctx.restore();
};

const ITEMS: { id: string; name: string; group: ProGroup; fn: ItemFn; on: string[]; aspect?: number }[] = [
  { id: 'frame-black', name: 'Black frame', group: 'Frames & wall art', fn: frame('#17171A', '#FAFAF8'), on: ['studio', 'linen', 'concrete', 'sage', 'plaster', 'pastel'] },
  { id: 'frame-white', name: 'White frame', group: 'Frames & wall art', fn: frame('#F5F5F3', '#FFFFFF'), on: ['concrete', 'sage', 'navy', 'plaster', 'pastel'] },
  { id: 'frame-oak', name: 'Oak frame', group: 'Frames & wall art', fn: frame('#B88A57', '#FBF9F4'), on: ['studio', 'linen', 'concrete', 'sage', 'navy'] },
  { id: 'frame-gold', name: 'Gold frame', group: 'Frames & wall art', fn: frame('#B8923F', '#FBF8EF', 0.034, 0.1), on: ['studio', 'concrete', 'navy', 'plaster'] },
  { id: 'canvas', name: 'Canvas print', group: 'Frames & wall art', fn: canvasPrint, on: ['studio', 'linen', 'concrete', 'sage', 'plaster', 'navy'] },
  { id: 'poster-tape', name: 'Taped poster', group: 'Frames & wall art', fn: tapedPoster, on: ['concrete', 'linen', 'studio', 'pastel', 'plaster'] },
  { id: 'flyer', name: 'Flyer', group: 'Print & stationery', fn: flyerFlat, on: ['wood', 'marble', 'linen', 'concrete'] },
  { id: 'flyers', name: 'Flyer stack', group: 'Print & stationery', fn: flyerStack, on: ['wood', 'marble', 'concrete'] },
  { id: 'cards', name: 'Business cards', group: 'Print & stationery', fn: businessCards, on: ['wood', 'marble', 'linen', 'concrete'] },
  { id: 'greeting', name: 'Greeting card', group: 'Print & stationery', fn: greetingCard, on: ['studio', 'linen', 'pastel', 'wood'] },
  { id: 'invite', name: 'Invitation & envelope', group: 'Print & stationery', fn: invitation, on: ['marble', 'linen', 'wood', 'pastel'] },
  { id: 'book', name: 'Book cover', group: 'Print & stationery', fn: book, on: ['studio', 'wood', 'marble', 'linen'] },
  { id: 'magazine', name: 'Magazine', group: 'Print & stationery', fn: magazine, on: ['marble', 'wood', 'linen'] },
  { id: 'phone', name: 'Phone', group: 'Devices', fn: device('phone'), on: ['studio', 'pastel', 'bokeh', 'marble', 'wood', 'cafe'] },
  { id: 'tablet', name: 'Tablet', group: 'Devices', fn: device('tablet'), on: ['studio', 'wood', 'marble', 'room'] },
  { id: 'laptop', name: 'Laptop', group: 'Devices', fn: device('laptop'), on: ['studio', 'room', 'apartment', 'cafe'] },
  { id: 'tote', name: 'Tote bag', group: 'Merch & packaging', fn: tote, on: ['studio', 'linen', 'pastel', 'concrete'] },
  { id: 'tshirt', name: 'T-shirt', group: 'Merch & packaging', fn: tshirt, on: ['studio', 'linen', 'pastel', 'concrete'] },
  { id: 'mug', name: 'Mug', group: 'Merch & packaging', fn: mug, on: ['studio', 'wood', 'marble', 'pastel'] },
  { id: 'box', name: 'Product box', group: 'Merch & packaging', fn: box, on: ['studio', 'wood', 'marble', 'pastel'] },
  { id: 'sticker', name: 'Sticker', group: 'Merch & packaging', fn: sticker, on: ['wood', 'marble', 'concrete', 'pastel'] },
  { id: 'pillow', name: 'Cushion', group: 'Merch & packaging', fn: pillow, on: ['room', 'linen', 'studio'] },
];

// ---------------------------------------------------------------- photo scenes
// Corner points are percentages of the photo (TL, TR, BR, BL).
const PHOTO_SCENES: ProScene[] = [
  { id: 'photo-phone-flatlay', name: 'Phone on grey desk', group: 'Photo mockups', aspect: 960 / 640, photos: [P('x_watch')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_watch')], 0, 0, W, H); screenIn(ctx, art, pq(W, H, [[36.9, 21.6], [56.6, 21.6], [56.6, 75.4], [36.9, 75.4]]), 0.08);
  } },
  { id: 'photo-phone-desk', name: 'Phone on wooden desk', group: 'Photo mockups', aspect: 960 / 667, photos: [P('x_desk')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_desk')], 0, 0, W, H); screenIn(ctx, art, pq(W, H, [[10.15, 49.4], [25.05, 49.4], [25.05, 60.9], [10.15, 60.9]]), 0.08);
  } },
  { id: 'photo-notebook-desk', name: 'Notebook cover on desk', group: 'Photo mockups', aspect: 960 / 667, photos: [P('x_desk')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_desk')], 0, 0, W, H);
    const q = pq(W, H, [[54.2, 11.6], [68.4, 11.9], [68.9, 43.3], [54.6, 43.0]]);
    drawPerspective(ctx, artAt(art, (q[1][0] - q[0][0]) / (q[3][1] - q[0][1])), q, 8);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(ph[P('x_desk')], 0, 0, W, H); ctx.restore();
  } },
  { id: 'photo-card-desk', name: 'Card on wooden desk', group: 'Photo mockups', aspect: 960 / 667, photos: [P('x_desk')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_desk')], 0, 0, W, H);
    drawPerspective(ctx, artAt(art, 1.08), pq(W, H, [[31.6, 25.6], [50.0, 25.6], [50.0, 43.2], [31.6, 43.2]]), 8);
  } },
  { id: 'photo-laptop-office', name: 'Laptop in a bright office', group: 'Photo mockups', aspect: 960 / 640, photos: [P('x_laptop2')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_laptop2')], 0, 0, W, H); screenIn(ctx, art, pq(W, H, [[42.0, 7.2], [69.9, 12.3], [65.3, 44.6], [38.8, 36.6]]), 0.1);
  } },
  { id: 'photo-laptop-meeting', name: 'Laptop in a meeting', group: 'Photo mockups', aspect: 960 / 640, photos: [P('x_team2')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_team2')], 0, 0, W, H); screenIn(ctx, art, pq(W, H, [[4.6, 21.6], [27.6, 22.6], [25.4, 46.6], [5.0, 44.4]]), 0.1);
  } },
  { id: 'photo-wall-livingroom', name: 'Art over the sofa', group: 'Photo mockups', aspect: 960 / 640, photos: [P('cleaning')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('cleaning')], 0, 0, W, H);
    // replace the painting: new dark frame over the old one, then the design
    const outer = pq(W, H, [[2.1, 2.3], [32.0, -0.2], [32.1, 23.2], [3.9, 31.6]]);
    ctx.fillStyle = '#26262A'; ctx.beginPath(); outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    const q = pq(W, H, [[3.2, 3.4], [31.3, 0.9], [31.4, 21.9], [4.6, 30.2]]);
    drawPerspective(ctx, smartFill(art, 1.75), q, 10);
    ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff'; ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.restore();
  } },
  { id: 'photo-wall-exterior', name: 'Poster on a white wall', group: 'Photo mockups', aspect: 960 / 722, photos: [P('x_house3')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('x_house3')], 0, 0, W, H);
    const ar = art.width / art.height; let h = H * 0.5, w = h * ar; if (w > W * 0.3) { w = W * 0.3; h = w / ar; }
    const X = W * 0.78 - w / 2, Y = H * 0.38 - h / 2;
    ctx.save(); shadow(ctx, W * 0.008, W * 0.004, 0.22); ctx.fillStyle = '#fff'; ctx.fillRect(X, Y, w, h); ctx.restore();
    ctx.drawImage(artOnPaper(art, w / h), X, Y, w, h);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(ph[P('x_house3')], X, Y, w, h, X, Y, w, h); ctx.restore();
    light(ctx, X, Y, w, h, 0.06);
  } },
  { id: 'photo-table-card', name: 'Card on a coffee table', group: 'Photo mockups', aspect: 960 / 640, photos: [P('livingroom2')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('livingroom2')], 0, 0, W, H);
    const q = pq(W, H, [[14.0, 64.0], [33.0, 61.5], [38.5, 79.5], [16.0, 83.0]]);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.filter = 'blur(6px)'; ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x + 4, y + 6) : ctx.moveTo(x + 4, y + 6))); ctx.closePath(); ctx.fill(); ctx.restore();
    drawPerspective(ctx, artOnPaper(art, 0.72), q, 10);
  } },
  { id: 'photo-billboard-city', name: 'Billboard in the city', group: 'Outdoor', aspect: 960 / 640, photos: [P('city')], draw(ctx, W, H, art, ph) {
    ctx.drawImage(ph[P('city')], 0, 0, W, H);
    const bw = W * 0.34, bh = bw / 2, X = W * 0.08, Y = H * 0.16;
    ctx.fillStyle = '#25272C'; ctx.fillRect(X + bw / 2 - W * 0.012, Y + bh, W * 0.024, H * 0.5);
    ctx.save(); shadow(ctx, W * 0.02, W * 0.008, 0.45); ctx.fillStyle = '#1D1F24'; ctx.fillRect(X - W * 0.008, Y - W * 0.008, bw + W * 0.016, bh + W * 0.016); ctx.restore();
    ctx.drawImage(smartFill(art, 2), X, Y, bw, bh);
    const dusk = ctx.createLinearGradient(X, Y, X + bw, Y + bh); dusk.addColorStop(0, 'rgba(255,170,120,0.18)'); dusk.addColorStop(1, 'rgba(40,30,80,0.22)'); ctx.fillStyle = dusk; ctx.fillRect(X, Y, bw, bh);
  } },
];

const STUDIO_SCENES: ProScene[] = ITEMS.flatMap((it) => it.on.map((b) => {
  const bd = BACKDROPS[b];
  return {
    id: `${it.id}-${b}`,
    name: `${it.name} — ${bd.label}`,
    group: it.group,
    aspect: it.aspect || 4 / 3,
    photos: bd.photo ? [bd.photo] : [],
    draw(ctx: CanvasRenderingContext2D, W: number, H: number, art: Art, ph: Record<string, HTMLImageElement>) { bd.draw(ctx, W, H, ph); it.fn(ctx, W, H, art, !!bd.table); },
  } as ProScene;
}));

export const PRO_SCENES: ProScene[] = [...PHOTO_SCENES, ...STUDIO_SCENES];
export const PRO_GROUPS: ProGroup[] = ['Photo mockups', 'Frames & wall art', 'Print & stationery', 'Devices', 'Merch & packaging', 'Outdoor'];

const cache = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  if (!cache.has(src)) cache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => { cache.delete(src); rej(new Error('photo')); }; i.src = src; }));
  return cache.get(src)!;
}

/** Renders one scene `width` px wide. */
export async function renderPro(scene: ProScene, art: Art, width = 1200): Promise<HTMLCanvasElement> {
  const W = width, H = Math.round(width / scene.aspect);
  const c = canvas(W, H);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const ph: Record<string, HTMLImageElement> = {};
  for (const p of scene.photos) ph[p] = await load(p);
  scene.draw(ctx, W, H, art, ph);
  return c;
}
void fitInQuad;
