// ---------------------------------------------------------------------
// lib/mockups.ts
// Shows a finished design in real life: framed on a wall, on a phone, a
// laptop, a T-shirt, a mug, a tote bag, a billboard, business cards, a
// flyer on a desk… Every scene is drawn here in the browser (vector
// drawing plus a few free CC0 room photos from our own library), so
// nothing is uploaded and there are no licensing issues.
//
// A scene draws onto a canvas: draw(ctx, W, H, art, opts). `art` is the
// design as an image. Photo scenes place the design on a four-corner
// area with true perspective (a fine triangle mesh).
// ---------------------------------------------------------------------

export type Pt = [number, number];
export interface MockupOpts { bg: string; accent: string; shadow: boolean }
export interface Scene {
  id: string;
  name: string;
  group: 'Print' | 'Screens' | 'Merch' | 'Rooms';
  /** Best for: 'portrait' designs, 'landscape', 'square' or any. */
  fits: ('portrait' | 'landscape' | 'square')[];
  /** Background photo, if any (CC0, from /templates/photos/pro). */
  photo?: string;
  aspect: number; // output width / height
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, art: CanvasImageSource & { width: number; height: number }, o: MockupOpts, photo?: HTMLImageElement) => void;
}

// ---------------------------------------------------------------- helpers

function homography(src: Pt[], dst: Pt[]) {
  // Solves the 8 unknowns mapping unit-square corners to dst.
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // Gaussian elimination
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < 8; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = new Array(8).fill(0);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k];
    h[r] = s / A[r][r];
  }
  return (x: number, y: number): Pt => {
    const w = h[6] * x + h[7] * y + 1;
    return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
  };
}

function drawTri(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: Pt[], d: Pt[]) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s;
  const [[u0, v0], [u1, v1], [u2, v2]] = d;
  // Grow the destination triangle a hair to hide seams.
  const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
  const g = (u: number, v: number): Pt => { const dx = u - cx, dy = v - cy, l = Math.hypot(dx, dy) || 1; return [u + (dx / l) * 0.6, v + (dy / l) * 0.6]; };
  const [a, b2, c] = [g(u0, v0), g(u1, v1), g(u2, v2)];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c[0], c[1]); ctx.closePath();
  ctx.clip();
  const den = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(den) < 1e-9) { ctx.restore(); return; }
  const m11 = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / den;
  const m12 = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / den;
  const m13 = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / den;
  const m21 = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / den;
  const m22 = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / den;
  const m23 = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / den;
  ctx.transform(m11, m21, m12, m22, m13, m23);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Draws `img` onto the four-corner area (TL, TR, BR, BL) with perspective. */
export function drawPerspective(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, quad: Pt[], steps = 14) {
  const map = homography([[0, 0], [1, 0], [1, 1], [0, 1]], quad);
  const W = img.width, H = img.height;
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < steps; j++) {
      const u0 = i / steps, u1 = (i + 1) / steps, v0 = j / steps, v1 = (j + 1) / steps;
      const s: Pt[] = [[u0 * W, v0 * H], [u1 * W, v0 * H], [u1 * W, v1 * H], [u0 * W, v1 * H]];
      const d = [map(u0, v0), map(u1, v0), map(u1, v1), map(u0, v1)];
      drawTri(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
      drawTri(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
    }
}

/** The part of a slot (4 corners) that holds `aspect` without stretching. */
export function fitInQuad(quad: Pt[], aspect: number, cover = false): Pt[] {
  const map = homography([[0, 0], [1, 0], [1, 1], [0, 1]], quad);
  const wTop = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
  const hLeft = Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]);
  const wB = Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1]);
  const hR = Math.hypot(quad[2][0] - quad[1][0], quad[2][1] - quad[1][1]);
  const slot = (wTop + wB) / (hLeft + hR);
  let w = 1, h = 1;
  if ((aspect > slot) !== cover) h = slot / aspect; else w = aspect / slot;
  if (cover) { w = Math.max(w, 1); h = Math.max(h, 1); }
  const x0 = (1 - w) / 2, y0 = (1 - h) / 2;
  return [map(x0, y0), map(x0 + w, y0), map(x0 + w, y0 + h), map(x0, y0 + h)];
}

const fitRect = (aw: number, ah: number, bw: number, bh: number) => {
  const k = Math.min(bw / aw, bh / ah);
  return { w: aw * k, h: ah * k };
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function softShadow(ctx: CanvasRenderingContext2D, blur: number, y: number, alpha = 0.28) {
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = y;
}
const noShadow = (ctx: CanvasRenderingContext2D) => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowOffsetX = 0; };

function wall(ctx: CanvasRenderingContext2D, W: number, H: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  // gentle light from the top left
  const g = ctx.createRadialGradient(W * 0.25, H * 0.1, 0, W * 0.25, H * 0.1, Math.max(W, H) * 1.1);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.035);
}

function grain(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number) {
  const n = document.createElement('canvas');
  n.width = n.height = 160;
  const x = n.getContext('2d')!;
  const d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255 * amount;
  }
  x.putImageData(d, 0, 0);
  ctx.save();
  ctx.fillStyle = ctx.createPattern(n, 'repeat')!;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Paper/fabric light: a soft sheen across the print. */
function sheen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strength = 0.18) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, `rgba(255,255,255,${strength})`);
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength * 0.6})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function floorShelf(ctx: CanvasRenderingContext2D, W: number, H: number, y: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(0, y, W, H - y);
  const g = ctx.createLinearGradient(0, y, 0, y + H * 0.04);
  g.addColorStop(0, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, H * 0.04);
}

function plant(ctx: CanvasRenderingContext2D, x: number, base: number, s: number) {
  ctx.save();
  ctx.fillStyle = '#d9cbb8';
  roundRect(ctx, x - s * 0.22, base - s * 0.34, s * 0.44, s * 0.34, s * 0.05);
  ctx.fill();
  ctx.fillStyle = '#4f7a4d';
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.28;
    ctx.save();
    ctx.translate(x, base - s * 0.34);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.38, s * 0.07, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? '#5b8a57' : '#3f6b40';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scenes

export const SCENES: Scene[] = [
  {
    id: 'frame-wall', name: 'Framed on a wall', group: 'Print', fits: ['portrait', 'square', 'landscape'], aspect: 4 / 3,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      floorShelf(ctx, W, H, H * 0.86);
      const { w, h } = fitRect(art.width, art.height, W * 0.42, H * 0.6);
      const fr = Math.max(W * 0.014, 10), mat = Math.max(W * 0.03, 18);
      const X = W / 2 - w / 2, Y = H * 0.42 - h / 2;
      if (o.shadow) softShadow(ctx, W * 0.03, W * 0.012, 0.35);
      ctx.fillStyle = o.accent;
      ctx.fillRect(X - mat - fr, Y - mat - fr, w + 2 * (mat + fr), h + 2 * (mat + fr));
      noShadow(ctx);
      ctx.fillStyle = '#fbfaf7';
      ctx.fillRect(X - mat, Y - mat, w + 2 * mat, h + 2 * mat);
      // inner bevel of the mat
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(X - 1, Y - 1, w + 2, h + 2);
      ctx.drawImage(art, X, Y, w, h);
      sheen(ctx, X - mat, Y - mat, w + 2 * mat, h + 2 * mat, 0.12);
      plant(ctx, W * 0.86, H * 0.9, H * 0.42);
    },
  },
  {
    id: 'poster-tape', name: 'Poster on a wall', group: 'Print', fits: ['portrait', 'square'], aspect: 4 / 5,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      grain(ctx, W, H, 0.05);
      const { w, h } = fitRect(art.width, art.height, W * 0.7, H * 0.74);
      const X = W / 2 - w / 2, Y = H * 0.47 - h / 2;
      ctx.save();
      ctx.translate(W / 2, H * 0.47);
      ctx.rotate(-0.012);
      if (o.shadow) softShadow(ctx, W * 0.02, W * 0.008, 0.3);
      ctx.drawImage(art, -w / 2, -h / 2, w, h);
      noShadow(ctx);
      sheen(ctx, -w / 2, -h / 2, w, h, 0.14);
      // tape
      const tape = (x: number, y: number, r: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r);
        ctx.fillStyle = 'rgba(245,240,225,0.85)';
        ctx.fillRect(-W * 0.06, -W * 0.018, W * 0.12, W * 0.036);
        ctx.restore();
      };
      tape(-w / 2 + W * 0.02, -h / 2, -0.6);
      tape(w / 2 - W * 0.02, -h / 2, 0.6);
      ctx.restore();
      void X; void Y;
    },
  },
  {
    id: 'flyer-desk', name: 'Flyer on a desk', group: 'Print', fits: ['portrait', 'square'], photo: '/templates/photos/pro/office.jpg', aspect: 3 / 2,
    draw(ctx, W, H, art, o, photo) {
      // wood from the photo's lower right (no laptop there)
      if (photo) ctx.drawImage(photo, photo.width * 0.5, photo.height * 0.55, photo.width * 0.5, photo.height * 0.45, 0, 0, W, H);
      const { w, h } = fitRect(art.width, art.height, W * 0.42, H * 0.82);
      ctx.save();
      ctx.translate(W * 0.47, H * 0.5);
      ctx.rotate(-0.09);
      if (o.shadow) softShadow(ctx, W * 0.018, W * 0.006, 0.35);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      noShadow(ctx);
      ctx.drawImage(art, -w / 2, -h / 2, w, h);
      sheen(ctx, -w / 2, -h / 2, w, h, 0.12);
      ctx.restore();
    },
  },
  {
    id: 'room-kitchen', name: 'Bright room', group: 'Rooms', fits: ['portrait', 'square'], photo: '/templates/photos/pro/kitchen.jpg', aspect: 3 / 2,
    draw(ctx, W, H, art, o, photo) {
      if (photo) ctx.drawImage(photo, 0, 0, W, H);
      const slot: Pt[] = [[0.375 * W, 0.255 * H], [0.545 * W, 0.255 * H], [0.545 * W, 0.53 * H], [0.375 * W, 0.53 * H]];
      framedInQuad(ctx, art, slot, o, 0.06);
    },
  },
  {
    id: 'room-living', name: 'Living room', group: 'Rooms', fits: ['portrait', 'square'], photo: '/templates/photos/pro/apartment.jpg', aspect: 3 / 2,
    draw(ctx, W, H, art, o, photo) {
      if (photo) ctx.drawImage(photo, 0, 0, W, H);
      const slot: Pt[] = [[0.655 * W, 0.2 * H], [0.79 * W, 0.178 * H], [0.79 * W, 0.47 * H], [0.655 * W, 0.452 * H]];
      framedInQuad(ctx, art, slot, o, 0.06, 'rgba(255,190,120,0.10)');
    },
  },
  {
    id: 'room-bedroom', name: 'Above the bed', group: 'Rooms', fits: ['landscape', 'square'], photo: '/templates/photos/pro/bedroom.jpg', aspect: 3 / 2,
    draw(ctx, W, H, art, o, photo) {
      if (photo) ctx.drawImage(photo, 0, 0, W, H);
      const slot: Pt[] = [[0.255 * W, 0.075 * H], [0.505 * W, 0.11 * H], [0.505 * W, 0.305 * H], [0.255 * W, 0.312 * H]];
      framedInQuad(ctx, art, slot, o, 0.05, 'rgba(255,170,90,0.12)');
    },
  },
  {
    id: 'phone', name: 'Phone', group: 'Screens', fits: ['portrait', 'square'], aspect: 4 / 5,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const ph = H * 0.84, pw = ph * 0.49;
      const X = W / 2 - pw / 2, Y = H / 2 - ph / 2, r = pw * 0.16;
      if (o.shadow) softShadow(ctx, W * 0.05, W * 0.025, 0.4);
      ctx.fillStyle = '#1b1b1f';
      roundRect(ctx, X, Y, pw, ph, r);
      ctx.fill();
      noShadow(ctx);
      ctx.strokeStyle = '#3a3a40';
      ctx.lineWidth = pw * 0.012;
      roundRect(ctx, X + pw * 0.006, Y + pw * 0.006, pw - pw * 0.012, ph - pw * 0.012, r);
      ctx.stroke();
      const b = pw * 0.04, sx = X + b, sy = Y + b, sw = pw - 2 * b, sh = ph - 2 * b;
      ctx.save();
      roundRect(ctx, sx, sy, sw, sh, r * 0.82);
      ctx.clip();
      ctx.fillStyle = '#000';
      ctx.fillRect(sx, sy, sw, sh);
      // design fills the screen width, centred (stories fill it all)
      const k = Math.max(sw / art.width, (art.width / art.height < 0.6 ? sh : 0) / art.height);
      const dw = art.width * k, dh = art.height * k;
      ctx.drawImage(art, sx + (sw - dw) / 2, sy + (sh - dh) / 2, dw, dh);
      // glass reflection
      const g = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
      g.addColorStop(0.4, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
      // dynamic island
      ctx.fillStyle = '#000';
      roundRect(ctx, X + pw / 2 - pw * 0.15, Y + b + pw * 0.03, pw * 0.3, pw * 0.085, pw * 0.05);
      ctx.fill();
    },
  },
  {
    id: 'instagram', name: 'Instagram post', group: 'Screens', fits: ['square', 'portrait'], aspect: 4 / 5,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const cw = W * 0.74, X = (W - cw) / 2;
      const { h: ah } = fitRect(art.width, art.height, cw, cw * 1.25);
      const ch = cw * 0.15 + ah + cw * 0.24;
      const Y = (H - ch) / 2;
      if (o.shadow) softShadow(ctx, W * 0.04, W * 0.015, 0.25);
      ctx.fillStyle = '#fff';
      roundRect(ctx, X, Y, cw, ch, cw * 0.03);
      ctx.fill();
      noShadow(ctx);
      const u = cw / 100;
      // header
      const avatar = ctx.createLinearGradient(X + 4 * u, Y + 4 * u, X + 12 * u, Y + 12 * u);
      avatar.addColorStop(0, '#f9ce34'); avatar.addColorStop(0.5, '#ee2a7b'); avatar.addColorStop(1, '#6228d7');
      ctx.fillStyle = avatar;
      ctx.beginPath(); ctx.arc(X + 8 * u, Y + 7.5 * u, 4.2 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X + 8 * u, Y + 7.5 * u, 3.4 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = o.accent; ctx.beginPath(); ctx.arc(X + 8 * u, Y + 7.5 * u, 3 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = `600 ${3.4 * u}px Arial, sans-serif`;
      ctx.fillText('yourbrand', X + 15 * u, Y + 8.6 * u);
      ctx.fillStyle = '#111';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(X + 92 * u + i * 2.2 * u - 2.2 * u, Y + 7.5 * u, 0.6 * u, 0, Math.PI * 2); ctx.fill(); }
      // image
      const iy = Y + 15 * u;
      ctx.drawImage(art, X, iy, cw, ah);
      // actions
      const ay = iy + ah + 6 * u;
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.55 * u; ctx.lineJoin = 'round';
      // heart
      ctx.fillStyle = '#ed4956';
      ctx.beginPath();
      const hx = X + 6 * u, hy = ay;
      ctx.moveTo(hx, hy + 1.2 * u);
      ctx.bezierCurveTo(hx - 3.2 * u, hy - 1.8 * u, hx - 1 * u, hy - 4 * u, hx, hy - 1.8 * u);
      ctx.bezierCurveTo(hx + 1 * u, hy - 4 * u, hx + 3.2 * u, hy - 1.8 * u, hx, hy + 1.2 * u);
      ctx.fill();
      ctx.beginPath(); ctx.arc(X + 14 * u, ay - 1.2 * u, 2.3 * u, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X + 20 * u, ay - 3.4 * u); ctx.lineTo(X + 25 * u, ay - 1.2 * u); ctx.lineTo(X + 20 * u, ay + 1 * u); ctx.closePath(); ctx.stroke();
      ctx.strokeRect(X + 91 * u, ay - 3.4 * u, 3.6 * u, 4.6 * u);
      ctx.fillStyle = '#111';
      ctx.font = `600 ${3.2 * u}px Arial, sans-serif`;
      ctx.fillText('1,284 likes', X + 4 * u, ay + 7 * u);
      ctx.font = `${3.1 * u}px Arial, sans-serif`;
      ctx.fillStyle = '#222';
      ctx.fillText('yourbrand  Made with Magical Touch ✨', X + 4 * u, ay + 12 * u);
    },
  },
  {
    id: 'laptop', name: 'Laptop', group: 'Screens', fits: ['landscape'], aspect: 3 / 2,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const lw = W * 0.7, sh = lw * 0.62, X = (W - lw) / 2, Y = H * 0.12;
      if (o.shadow) softShadow(ctx, W * 0.04, W * 0.02, 0.35);
      ctx.fillStyle = '#202024';
      roundRect(ctx, X, Y, lw, sh, lw * 0.025);
      ctx.fill();
      noShadow(ctx);
      const b = lw * 0.025;
      ctx.save();
      ctx.beginPath(); ctx.rect(X + b, Y + b, lw - 2 * b, sh - 2 * b); ctx.clip();
      ctx.fillStyle = '#000'; ctx.fillRect(X + b, Y + b, lw - 2 * b, sh - 2 * b);
      const k = Math.max((lw - 2 * b) / art.width, (sh - 2 * b) / art.height);
      ctx.drawImage(art, X + lw / 2 - (art.width * k) / 2, Y + sh / 2 - (art.height * k) / 2, art.width * k, art.height * k);
      ctx.restore();
      // base
      const by = Y + sh;
      const g = ctx.createLinearGradient(0, by, 0, by + lw * 0.04);
      g.addColorStop(0, '#d9dadf'); g.addColorStop(1, '#9fa1a8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(X - lw * 0.08, by);
      ctx.lineTo(X + lw * 1.08, by);
      ctx.lineTo(X + lw * 1.05, by + lw * 0.035);
      ctx.lineTo(X - lw * 0.05, by + lw * 0.035);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a8c93';
      roundRect(ctx, X + lw / 2 - lw * 0.08, by, lw * 0.16, lw * 0.012, lw * 0.006);
      ctx.fill();
    },
  },
  {
    id: 'tshirt', name: 'T-shirt', group: 'Merch', fits: ['square', 'portrait', 'landscape'], aspect: 1,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const s = W / 100;
      ctx.save();
      if (o.shadow) softShadow(ctx, W * 0.03, W * 0.012, 0.25);
      ctx.fillStyle = o.accent;
      ctx.beginPath();
      ctx.moveTo(35 * s, 12 * s);
      ctx.quadraticCurveTo(50 * s, 20 * s, 65 * s, 12 * s);
      ctx.lineTo(88 * s, 22 * s);
      ctx.lineTo(96 * s, 42 * s);
      ctx.lineTo(80 * s, 48 * s);
      ctx.lineTo(76 * s, 40 * s);
      ctx.lineTo(77 * s, 92 * s);
      ctx.quadraticCurveTo(50 * s, 95 * s, 23 * s, 92 * s);
      ctx.lineTo(24 * s, 40 * s);
      ctx.lineTo(20 * s, 48 * s);
      ctx.lineTo(4 * s, 42 * s);
      ctx.lineTo(12 * s, 22 * s);
      ctx.closePath();
      ctx.fill();
      noShadow(ctx);
      ctx.clip();
      // folds
      const g = ctx.createLinearGradient(20 * s, 0, 80 * s, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(0.3, 'rgba(255,255,255,0.08)'); g.addColorStop(0.7, 'rgba(0,0,0,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // collar
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(36 * s, 13 * s);
      ctx.quadraticCurveTo(50 * s, 24 * s, 64 * s, 13 * s);
      ctx.stroke();
      // print
      const { w, h } = fitRect(art.width, art.height, 34 * s, 38 * s);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(art, 50 * s - w / 2, 30 * s, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    },
  },
  {
    id: 'mug', name: 'Mug', group: 'Merch', fits: ['landscape', 'square'], aspect: 4 / 3,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      floorShelf(ctx, W, H, H * 0.78);
      const mw = W * 0.4, mh = mw * 1.05, X = W * 0.27, Y = H * 0.78 - mh;
      if (o.shadow) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(X + mw / 2 + W * 0.02, H * 0.78, mw * 0.6, mw * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
      // handle
      ctx.strokeStyle = '#f2f2f2';
      ctx.lineWidth = mw * 0.09;
      ctx.beginPath(); ctx.ellipse(X + mw, Y + mh * 0.45, mw * 0.2, mh * 0.24, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      // body
      ctx.fillStyle = '#fafafa';
      roundRect(ctx, X, Y, mw, mh, mw * 0.05);
      ctx.fill();
      // wrapped print: vertical strips squeezed toward the edges
      const pw = mw * 0.86, ph = mh * 0.62, px = X + (mw - pw) / 2, py = Y + mh * 0.18;
      const { w: aw, h: ahh } = fitRect(art.width, art.height, Math.PI * 0.5 * pw, ph);
      const strips = 60;
      for (let i = 0; i < strips; i++) {
        const a0 = -Math.PI / 2 + (i / strips) * Math.PI, a1 = -Math.PI / 2 + ((i + 1) / strips) * Math.PI;
        const x0 = px + pw / 2 + (Math.sin(a0) * pw) / 2, x1 = px + pw / 2 + (Math.sin(a1) * pw) / 2;
        const t0 = (a0 + Math.PI / 2) / Math.PI, t1 = (a1 + Math.PI / 2) / Math.PI;
        const sx0 = (t0 * Math.PI * 0.5 * pw - (Math.PI * 0.5 * pw - aw) / 2) / aw, sx1 = (t1 * Math.PI * 0.5 * pw - (Math.PI * 0.5 * pw - aw) / 2) / aw;
        if (sx1 <= 0 || sx0 >= 1) continue;
        const c0 = Math.max(0, sx0), c1 = Math.min(1, sx1);
        const dx0 = x0 + ((c0 - sx0) / (sx1 - sx0)) * (x1 - x0), dx1 = x0 + ((c1 - sx0) / (sx1 - sx0)) * (x1 - x0);
        ctx.drawImage(art, c0 * art.width, 0, (c1 - c0) * art.width, art.height, dx0, py + (ph - ahh) / 2, Math.max(0.5, dx1 - dx0 + 0.4), ahh);
      }
      // roundness light
      const g = ctx.createLinearGradient(X, 0, X + mw, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(0.25, 'rgba(255,255,255,0.0)'); g.addColorStop(0.38, 'rgba(255,255,255,0.35)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = g;
      roundRect(ctx, X, Y, mw, mh, mw * 0.05);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.ellipse(X + mw / 2, Y + mw * 0.01, mw / 2, mw * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'tote', name: 'Tote bag', group: 'Merch', fits: ['portrait', 'square'], aspect: 4 / 5,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const bw = W * 0.62, bh = bw * 1.08, X = (W - bw) / 2, Y = H * 0.3;
      ctx.strokeStyle = '#d8ccb4';
      ctx.lineWidth = bw * 0.045;
      ctx.beginPath(); ctx.moveTo(X + bw * 0.25, Y + 2); ctx.bezierCurveTo(X + bw * 0.25, Y - bw * 0.42, X + bw * 0.75, Y - bw * 0.42, X + bw * 0.75, Y + 2); ctx.stroke();
      if (o.shadow) softShadow(ctx, W * 0.03, W * 0.012, 0.25);
      ctx.fillStyle = '#efe6d2';
      ctx.fillRect(X, Y, bw, bh);
      noShadow(ctx);
      const { w, h } = fitRect(art.width, art.height, bw * 0.7, bh * 0.7);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(art, X + bw / 2 - w / 2, Y + bh * 0.5 - h / 2, w, h);
      ctx.restore();
      const g = ctx.createLinearGradient(X, 0, X + bw, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g;
      ctx.fillRect(X, Y, bw, bh);
    },
  },
  {
    id: 'cards', name: 'Business cards', group: 'Print', fits: ['landscape'], aspect: 3 / 2,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const { w, h } = fitRect(art.width, art.height, W * 0.46, H * 0.46);
      const card = (x: number, y: number, r: number, front: boolean) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(r);
        if (o.shadow) softShadow(ctx, W * 0.02, W * 0.008, 0.3);
        ctx.fillStyle = front ? '#fff' : o.accent;
        roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.02);
        ctx.fill();
        noShadow(ctx);
        if (front) {
          ctx.save();
          roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.02);
          ctx.clip();
          ctx.drawImage(art, -w / 2, -h / 2, w, h);
          sheen(ctx, -w / 2, -h / 2, w, h, 0.1);
          ctx.restore();
        }
        ctx.restore();
      };
      card(W * 0.42, H * 0.42, -0.18, false);
      card(W * 0.46, H * 0.46, -0.12, true);
      card(W * 0.62, H * 0.6, 0.08, true);
    },
  },
  {
    id: 'billboard', name: 'Billboard', group: 'Print', fits: ['landscape'], aspect: 3 / 2,
    draw(ctx, W, H, art, o) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#7fb6e8'); sky.addColorStop(0.7, '#cfe5f5'); sky.addColorStop(1, '#e9e3d6');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      [[0.15, 0.15, 0.08], [0.22, 0.13, 0.06], [0.8, 0.2, 0.07], [0.86, 0.18, 0.05]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(x * W, y * H, r * W, r * W * 0.45, 0, 0, Math.PI * 2); ctx.fill(); });
      // ground
      ctx.fillStyle = '#8c9a6b';
      ctx.fillRect(0, H * 0.86, W, H * 0.14);
      const bw = W * 0.72, bh = bw / 2.4;
      const X = (W - bw) / 2, Y = H * 0.12;
      ctx.fillStyle = '#5b5f66';
      ctx.fillRect(W / 2 - W * 0.018, Y + bh, W * 0.036, H * 0.86 - Y - bh);
      ctx.fillStyle = '#3d4046';
      ctx.fillRect(X - W * 0.012, Y - W * 0.012, bw + W * 0.024, bh + W * 0.024);
      ctx.save();
      ctx.beginPath(); ctx.rect(X, Y, bw, bh); ctx.clip();
      ctx.fillStyle = o.accent; ctx.fillRect(X, Y, bw, bh);
      const k = Math.max(bw / art.width, bh / art.height);
      const fitK = Math.min(bw / art.width, bh / art.height);
      const kk = art.width / art.height > 1.6 ? k : fitK;
      ctx.drawImage(art, X + bw / 2 - (art.width * kk) / 2, Y + bh / 2 - (art.height * kk) / 2, art.width * kk, art.height * kk);
      sheen(ctx, X, Y, bw, bh, 0.1);
      ctx.restore();
      // lights
      ctx.fillStyle = '#2b2e33';
      for (let i = 0; i < 3; i++) ctx.fillRect(X + bw * (0.2 + i * 0.3) - W * 0.015, Y - W * 0.03, W * 0.03, W * 0.012);
      void o;
    },
  },
  {
    id: 'book', name: 'Book / magazine', group: 'Print', fits: ['portrait'], aspect: 4 / 3,
    draw(ctx, W, H, art, o) {
      wall(ctx, W, H, o.bg);
      const { w, h } = fitRect(art.width, art.height, W * 0.36, H * 0.8);
      const X = W / 2 - w / 2, Y = H / 2 - h / 2, sp = w * 0.06;
      if (o.shadow) softShadow(ctx, W * 0.035, W * 0.015, 0.35);
      ctx.fillStyle = '#e9e9e9';
      ctx.fillRect(X + sp * 0.3, Y + h * 0.01, w, h);
      noShadow(ctx);
      // page edges
      ctx.fillStyle = '#f6f3ea';
      ctx.fillRect(X + w, Y + h * 0.012, sp * 0.25, h * 0.976);
      ctx.drawImage(art, X, Y, w, h);
      // spine fold
      const g = ctx.createLinearGradient(X, 0, X + sp * 1.4, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.3, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X, Y, sp * 1.4, h);
      sheen(ctx, X, Y, w, h, 0.1);
    },
  },
];

/** Framed print (mat + thin frame) placed in a perspective slot of a photo. */
function framedInQuad(ctx: CanvasRenderingContext2D, art: CanvasImageSource & { width: number; height: number }, slot: Pt[], o: MockupOpts, matPct: number, tint?: string) {
  // Build the framed print flat, then put it on the wall with perspective.
  const S = 1400;
  const ar = art.width / art.height;
  const fw = ar >= 1 ? S : S * ar, fh = ar >= 1 ? S / ar : S;
  const mat = Math.min(fw, fh) * matPct, fr = Math.min(fw, fh) * 0.025;
  const c = document.createElement('canvas');
  c.width = Math.round(fw + 2 * (mat + fr));
  c.height = Math.round(fh + 2 * (mat + fr));
  const quad = fitInQuad(slot, c.width / c.height, false);
  const x = c.getContext('2d')!;
  x.fillStyle = o.accent;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fbfaf7';
  x.fillRect(fr, fr, c.width - 2 * fr, c.height - 2 * fr);
  x.drawImage(art, fr + mat, fr + mat, fw, fh);
  x.strokeStyle = 'rgba(0,0,0,0.15)';
  x.lineWidth = 3;
  x.strokeRect(fr + mat, fr + mat, fw, fh);
  sheen(x, 0, 0, c.width, c.height, 0.1);
  if (tint) { x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height); }
  if (o.shadow) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.filter = `blur(${Math.max(4, ctx.canvas.width * 0.006)}px)`;
    const off = ctx.canvas.width * 0.006;
    ctx.beginPath();
    quad.forEach(([px, py], i) => (i ? ctx.lineTo(px + off * 0.5, py + off) : ctx.moveTo(px + off * 0.5, py + off)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawPerspective(ctx, c, quad, 10);
}

/** Renders one scene at `width` px wide. */
export async function renderMockup(scene: Scene, art: CanvasImageSource & { width: number; height: number }, o: MockupOpts, width = 1600): Promise<HTMLCanvasElement> {
  const W = width, H = Math.round(width / scene.aspect);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  let photo: HTMLImageElement | undefined;
  if (scene.photo) photo = await loadPhoto(scene.photo);
  scene.draw(ctx, W, H, art, o, photo);
  return c;
}

const photoCache = new Map<string, Promise<HTMLImageElement>>();
function loadPhoto(src: string) {
  if (!photoCache.has(src))
    photoCache.set(
      src,
      new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => { photoCache.delete(src); rej(new Error('photo')); };
        i.src = src;
      }),
    );
  return photoCache.get(src)!;
}

export function shapeOf(w: number, h: number): 'portrait' | 'landscape' | 'square' {
  const r = w / h;
  return r > 1.15 ? 'landscape' : r < 0.87 ? 'portrait' : 'square';
}
