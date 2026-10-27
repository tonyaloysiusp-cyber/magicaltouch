// ---------------------------------------------------------------------
// lib/qrStyle.ts
// Pro QR code designs, drawn as one SVG (so PNG and SVG downloads and the
// preview are always identical):
//  - 8 dot shapes, 5 corner-frame shapes, 5 corner-centre shapes
//  - solid, linear or radial gradient colours; separate corner colours
//  - quiet-zone size, error-correction level, logo size and plate shape
//  - a frame with a caption ("Scan me") in several styles
// Scanning safety: corner patterns are always solid shapes in their own
// 7×7 / 3×3 places, the quiet zone is never less than 2 modules, and a
// logo forces level H with at most ~26% of the width covered.
// ---------------------------------------------------------------------

import { qrMatrix, type Ecc } from './qr';

export type DotShape = 'square' | 'rounded' | 'dots' | 'fluid' | 'classy' | 'diamond' | 'vbars' | 'hbars';
export type EyeFrame = 'square' | 'rounded' | 'circle' | 'leaf' | 'thin';
export type EyeBall = 'square' | 'rounded' | 'circle' | 'diamond' | 'leaf';
export type FrameStyle = 'none' | 'box' | 'badge' | 'bubble' | 'ribbon' | 'border';
export type Fill = 'solid' | 'linear' | 'radial';

export interface QrLook {
  fg: string;
  fg2: string;
  fill: Fill;
  angle: number; // degrees, linear gradient
  bg: string; // 'transparent' allowed
  dot: DotShape;
  eyeFrame: EyeFrame;
  eyeBall: EyeBall;
  eyeColor: string | null; // null = same as code
  eyeBallColor: string | null;
  quiet: number; // 2..6 modules
  ecc: 'auto' | Ecc;
  logoScale: number; // 0.15..0.26 of the width
  logoPlate: 'square' | 'circle' | 'none';
  frame: FrameStyle;
  frameColor: string;
  caption: string;
  captionColor: string;
}

export const DEFAULT_LOOK: QrLook = {
  fg: '#000000', fg2: '#3B82C4', fill: 'solid', angle: 45, bg: '#ffffff',
  dot: 'square', eyeFrame: 'square', eyeBall: 'square', eyeColor: null, eyeBallColor: null,
  quiet: 4, ecc: 'auto', logoScale: 0.22, logoPlate: 'square',
  frame: 'none', frameColor: '#000000', caption: 'SCAN ME', captionColor: '#ffffff',
};

/** Ready-made looks: one tap sets every option. */
export const LOOK_PRESETS: { name: string; look: Partial<QrLook> }[] = [
  { name: 'Classic', look: { fg: '#000000', fill: 'solid', dot: 'square', eyeFrame: 'square', eyeBall: 'square', eyeColor: null, eyeBallColor: null, bg: '#ffffff', frame: 'none' } },
  { name: 'Soft', look: { fg: '#1F2A44', fill: 'solid', dot: 'rounded', eyeFrame: 'rounded', eyeBall: 'rounded', eyeColor: null, eyeBallColor: null, bg: '#ffffff', frame: 'none' } },
  { name: 'Dots', look: { fg: '#3B1D5A', fill: 'solid', dot: 'dots', eyeFrame: 'rounded', eyeBall: 'circle', eyeColor: null, eyeBallColor: '#7B1046', bg: '#ffffff', frame: 'none' } },
  { name: 'Fluid', look: { fg: '#0F4C3A', fill: 'solid', dot: 'fluid', eyeFrame: 'rounded', eyeBall: 'circle', eyeColor: null, eyeBallColor: null, bg: '#F1FAF5', frame: 'none' } },
  { name: 'Sunset', look: { fg: '#A0134B', fg2: '#C25400', fill: 'linear', angle: 45, dot: 'rounded', eyeFrame: 'leaf', eyeBall: 'leaf', eyeColor: '#7A1F2B', eyeBallColor: '#7A1F2B', bg: '#ffffff', frame: 'none' } },
  { name: 'Ocean', look: { fg: '#0D47A1', fg2: '#00727D', fill: 'radial', dot: 'dots', eyeFrame: 'rounded', eyeBall: 'circle', eyeColor: '#0D47A1', eyeBallColor: '#0D47A1', bg: '#ffffff', frame: 'none' } },
  { name: 'Gold', look: { fg: '#4E342E', fg2: '#7A5A10', fill: 'linear', angle: 135, dot: 'rounded', eyeFrame: 'square', eyeBall: 'rounded', eyeColor: '#3E2723', eyeBallColor: '#6D4C0F', bg: '#FFFBF0', frame: 'none' } },
  { name: 'Scan me', look: { fg: '#111111', fill: 'solid', dot: 'rounded', eyeFrame: 'rounded', eyeBall: 'rounded', eyeColor: null, eyeBallColor: null, bg: '#ffffff', frame: 'box', frameColor: '#111111', caption: 'SCAN ME', captionColor: '#ffffff' } },
  { name: 'Menu', look: { fg: '#3E2723', fill: 'solid', dot: 'vbars', eyeFrame: 'rounded', eyeBall: 'rounded', eyeColor: null, eyeBallColor: null, bg: '#FFF8E1', frame: 'badge', frameColor: '#3E2723', caption: 'SEE OUR MENU', captionColor: '#FFF8E1' } },
  { name: 'Pay', look: { fg: '#1B5E20', fill: 'solid', dot: 'square', eyeFrame: 'rounded', eyeBall: 'square', eyeColor: null, eyeBallColor: null, bg: '#ffffff', frame: 'bubble', frameColor: '#1B5E20', caption: 'SCAN TO PAY', captionColor: '#ffffff' } },
];

export interface QrGrid {
  matrix: boolean[][];
  modules: number;
  quiet: number;
  total: number;
  ecc: Ecc;
  hole: { x0: number; x1: number } | null;
}

/** Throws a friendly Error when the text is too long. */
export function buildGrid(text: string, look: QrLook, withLogo: boolean): QrGrid {
  const ecc: Ecc = withLogo ? 'H' : look.ecc === 'auto' ? 'M' : look.ecc;
  let matrix: boolean[][];
  try {
    matrix = qrMatrix(text, ecc);
  } catch {
    throw new Error(withLogo ? 'That is too much text for a QR code with a logo. Shorten it, or turn the logo off.' : 'That is too much text for one QR code. Please shorten it or choose a lower error correction.');
  }
  const n = matrix.length;
  const quiet = Math.max(2, Math.min(6, Math.round(look.quiet)));
  let hole: QrGrid['hole'] = null;
  if (withLogo) {
    let w = Math.round(n * Math.max(0.15, Math.min(0.26, look.logoScale)));
    if (w % 2 !== n % 2) w += 1;
    w = Math.min(w, n - 2 * 9);
    const x0 = (n - w) / 2;
    hole = { x0, x1: x0 + w };
  }
  return { matrix, modules: n, quiet, total: n + 2 * quiet, ecc, hole };
}

const inEye = (x: number, y: number, n: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** A rectangle path with its own radius for each corner (tl, tr, br, bl). */
function rectPath(x: number, y: number, w: number, h: number, [tl, tr, br, bl]: number[]) {
  return `M${r3(x + tl)} ${r3(y)}H${r3(x + w - tr)}${tr ? `A${tr} ${tr} 0 0 1 ${r3(x + w)} ${r3(y + tr)}` : ''}V${r3(y + h - br)}${br ? `A${br} ${br} 0 0 1 ${r3(x + w - br)} ${r3(y + h)}` : ''}H${r3(x + bl)}${bl ? `A${bl} ${bl} 0 0 1 ${r3(x)} ${r3(y + h - bl)}` : ''}V${r3(y + tl)}${tl ? `A${tl} ${tl} 0 0 1 ${r3(x + tl)} ${r3(y)}` : ''}Z`;
}
const circlePath = (cx: number, cy: number, r: number) => `M${r3(cx - r)} ${r3(cy)}a${r} ${r} 0 1 0 ${r3(2 * r)} 0a${r} ${r} 0 1 0 ${r3(-2 * r)} 0Z`;

function dotsPath(G: QrGrid, shape: DotShape) {
  const n = G.modules, q = G.quiet, M = G.matrix;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < n && y < n && M[y][x] && !inEye(x, y, n) && !inHole(G, x, y);
  let d = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!on(x, y)) continue;
      const X = q + x, Y = q + y;
      switch (shape) {
        case 'dots': d += circlePath(X + 0.5, Y + 0.5, 0.45); break;
        case 'rounded': d += rectPath(X + 0.04, Y + 0.04, 0.92, 0.92, [0.3, 0.3, 0.3, 0.3]); break;
        case 'diamond': d += `M${X + 0.5} ${Y}L${X + 1} ${Y + 0.5}L${X + 0.5} ${Y + 1}L${X} ${Y + 0.5}Z`; break;
        case 'classy': d += rectPath(X, Y, 1, 1, [0.5, 0, 0.5, 0]); break;
        case 'fluid': {
          // Rounded only where there is no neighbour, so touching squares
          // flow into one smooth shape.
          const u = on(x, y - 1), dn = on(x, y + 1), l = on(x - 1, y), r = on(x + 1, y);
          const k = 0.5;
          d += rectPath(X, Y, 1, 1, [!u && !l ? k : 0, !u && !r ? k : 0, !dn && !r ? k : 0, !dn && !l ? k : 0]);
          break;
        }
        case 'vbars': {
          const u = on(x, y - 1), dn = on(x, y + 1);
          d += rectPath(X + 0.1, Y - (u ? 0.01 : 0), 0.8, 1 + (u ? 0.01 : 0), [u ? 0 : 0.4, u ? 0 : 0.4, dn ? 0 : 0.4, dn ? 0 : 0.4]);
          break;
        }
        case 'hbars': {
          const l = on(x - 1, y), r = on(x + 1, y);
          d += rectPath(X - (l ? 0.01 : 0), Y + 0.1, 1 + (l ? 0.01 : 0), 0.8, [l ? 0 : 0.4, r ? 0 : 0.4, r ? 0 : 0.4, l ? 0 : 0.4]);
          break;
        }
        default: d += `M${X} ${Y}h1.02v1.02h-1.02z`;
      }
    }
  return d;
}
const inHole = (G: QrGrid, x: number, y: number) => !!G.hole && x >= G.hole.x0 && x < G.hole.x1 && y >= G.hole.x0 && y < G.hole.x1;

function eyeFramePath(X: number, Y: number, s: EyeFrame, corner: 'tl' | 'tr' | 'bl') {
  switch (s) {
    case 'circle': return circlePath(X + 3.5, Y + 3.5, 3.5) + circlePath(X + 3.5, Y + 3.5, 2.5);
    case 'rounded': return rectPath(X, Y, 7, 7, [2, 2, 2, 2]) + rectPath(X + 1, Y + 1, 5, 5, [1.3, 1.3, 1.3, 1.3]);
    case 'leaf': {
      const big = corner === 'tl' ? [3, 0, 3, 0] : corner === 'tr' ? [0, 3, 0, 3] : [0, 3, 0, 3];
      const small = big.map((v) => (v ? 2 : 0));
      return rectPath(X, Y, 7, 7, big) + rectPath(X + 1, Y + 1, 5, 5, small);
    }
    case 'thin': return rectPath(X + 0.25, Y + 0.25, 6.5, 6.5, [0.6, 0.6, 0.6, 0.6]) + rectPath(X + 0.9, Y + 0.9, 5.2, 5.2, [0.3, 0.3, 0.3, 0.3]);
    default: return `M${X} ${Y}h7v7h-7zM${X + 1} ${Y + 1}v5h5v-5z`;
  }
}
function eyeBallPath(X: number, Y: number, s: EyeBall, corner: 'tl' | 'tr' | 'bl') {
  const x = X + 2, y = Y + 2;
  switch (s) {
    case 'circle': return circlePath(x + 1.5, y + 1.5, 1.5);
    case 'rounded': return rectPath(x, y, 3, 3, [0.9, 0.9, 0.9, 0.9]);
    case 'diamond': return `M${x + 1.5} ${y - 0.15}L${x + 3.15} ${y + 1.5}L${x + 1.5} ${y + 3.15}L${x - 0.15} ${y + 1.5}Z`;
    case 'leaf': return rectPath(x, y, 3, 3, corner === 'tl' ? [1.4, 0, 1.4, 0] : [0, 1.4, 0, 1.4]);
    default: return `M${x} ${y}h3v3h-3z`;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The finished design as SVG. Units are modules; `size` is the pixel size
 * of the code part (the frame adds room for the caption).
 */
export function qrDesignSvg(G: QrGrid, L: QrLook, logoDataUrl?: string | null, size = 1024): { svg: string; width: number; height: number } {
  const T = G.total, n = G.modules, q = G.quiet;
  const paint = L.fill === 'solid' ? L.fg : 'url(#qrg)';
  const grad =
    L.fill === 'linear'
      ? `<linearGradient id="qrg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${T}" y2="0" gradientTransform="rotate(${L.angle} ${T / 2} ${T / 2})"><stop offset="0" stop-color="${L.fg}"/><stop offset="1" stop-color="${L.fg2}"/></linearGradient>`
      : L.fill === 'radial'
        ? `<radialGradient id="qrg" gradientUnits="userSpaceOnUse" cx="${T / 2}" cy="${T / 2}" r="${T * 0.62}"><stop offset="0" stop-color="${L.fg2}"/><stop offset="1" stop-color="${L.fg}"/></radialGradient>`
        : '';
  const eyes = ([[0, 0, 'tl'], [n - 7, 0, 'tr'], [0, n - 7, 'bl']] as [number, number, 'tl' | 'tr' | 'bl'][])
    .map(([ex, ey, c]) => `<path fill-rule="evenodd" fill="${L.eyeColor || paint}" d="${eyeFramePath(q + ex, q + ey, L.eyeFrame, c)}"/><path fill="${L.eyeBallColor || L.eyeColor || paint}" d="${eyeBallPath(q + ex, q + ey, L.eyeBall, c)}"/>`)
    .join('');
  let logo = '';
  if (G.hole && logoDataUrl) {
    const s = G.hole.x1 - G.hole.x0, p0 = q + G.hole.x0;
    const plateFill = L.bg === 'transparent' ? '#ffffff' : L.bg;
    const plate = L.logoPlate === 'none' ? '' : L.logoPlate === 'circle' ? `<circle cx="${p0 + s / 2}" cy="${p0 + s / 2}" r="${s / 2}" fill="${plateFill}"/>` : `<rect x="${p0}" y="${p0}" width="${s}" height="${s}" rx="${s * 0.16}" fill="${plateFill}"/>`;
    const pad = L.logoPlate === 'circle' ? s * 0.17 : 0.6;
    logo = `${plate}<image href="${logoDataUrl}" x="${p0 + pad}" y="${p0 + pad}" width="${s - 2 * pad}" height="${s - 2 * pad}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const code = `<g>${L.bg !== 'transparent' ? `<rect width="${T}" height="${T}" rx="${L.frame === 'none' ? 0 : 1.2}" fill="${L.bg}"/>` : ''}<path fill="${paint}" d="${dotsPath(G, L.dot)}"/>${eyes}${logo}</g>`;

  // Frame + caption around the code.
  const font = `font-family="Arial, Helvetica, sans-serif" font-weight="700"`;
  const cap = esc((L.caption || '').trim().slice(0, 24));
  let w = T, h = T, body = code;
  if (L.frame !== 'none') {
    const pad = 1.6;
    const fs = Math.max(2.4, T * 0.085);
    const capH = cap ? fs * 2 : 0;
    w = T + pad * 2;
    if (L.frame === 'border') {
      h = T + pad * 2 + (cap ? capH : 0);
      body = `<rect x="0.4" y="0.4" width="${w - 0.8}" height="${h - 0.8}" rx="${pad * 1.2}" fill="${L.bg === 'transparent' ? 'none' : L.bg}" stroke="${L.frameColor}" stroke-width="0.8"/><g transform="translate(${pad} ${pad})">${code}</g>${cap ? `<text x="${w / 2}" y="${T + pad * 2 + capH * 0.42}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" ${font} fill="${L.frameColor}" letter-spacing="${fs * 0.08}">${cap}</text>` : ''}`;
    } else if (L.frame === 'box') {
      h = T + pad * 2 + capH;
      body = `<rect width="${w}" height="${h}" rx="${pad * 1.4}" fill="${L.frameColor}"/><g transform="translate(${pad} ${pad})">${code}</g>${cap ? `<text x="${w / 2}" y="${T + pad + capH / 2 + pad * 0.4}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" ${font} fill="${L.captionColor}" letter-spacing="${fs * 0.08}">${cap}</text>` : ''}`;
    } else if (L.frame === 'badge') {
      const gap = 1.2;
      h = T + pad * 2 + (cap ? capH + gap : 0);
      body = `<rect x="0" y="0" width="${w}" height="${T + pad * 2}" rx="${pad * 1.4}" fill="${L.frameColor}"/><g transform="translate(${pad} ${pad})">${code}</g>${cap ? `<rect x="${w * 0.12}" y="${T + pad * 2 + gap}" width="${w * 0.76}" height="${capH}" rx="${capH / 2}" fill="${L.frameColor}"/><text x="${w / 2}" y="${T + pad * 2 + gap + capH / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fs * 0.9}" ${font} fill="${L.captionColor}" letter-spacing="${fs * 0.06}">${cap}</text>` : ''}`;
    } else if (L.frame === 'bubble') {
      const tail = 1.6;
      h = T + pad * 2 + (cap ? capH + tail : 0);
      const top = cap ? capH + tail : 0;
      body = `${cap ? `<rect x="0" y="0" width="${w}" height="${capH}" rx="${capH / 2}" fill="${L.frameColor}"/><path d="M${w / 2 - tail} ${capH - 0.05}L${w / 2} ${capH + tail}L${w / 2 + tail} ${capH - 0.05}Z" fill="${L.frameColor}"/><text x="${w / 2}" y="${capH / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fs * 0.9}" ${font} fill="${L.captionColor}" letter-spacing="${fs * 0.06}">${cap}</text>` : ''}<rect x="0.4" y="${top + 0.4}" width="${w - 0.8}" height="${T + pad * 2 - 0.8}" rx="${pad * 1.2}" fill="${L.bg === 'transparent' ? 'none' : L.bg}" stroke="${L.frameColor}" stroke-width="0.8"/><g transform="translate(${pad} ${top + pad})">${code}</g>`;
    } else if (L.frame === 'ribbon') {
      h = T + pad * 2 + (cap ? capH * 0.5 : 0);
      const ry = T + pad * 2 - capH * 0.5;
      body = `<rect x="0.4" y="0.4" width="${w - 0.8}" height="${T + pad * 2 - 0.8}" rx="${pad}" fill="${L.bg === 'transparent' ? 'none' : L.bg}" stroke="${L.frameColor}" stroke-width="0.8"/><g transform="translate(${pad} ${pad})">${code}</g>${cap ? `<path d="M${w * 0.08} ${ry}H${w * 0.92}L${w * 0.86} ${ry + capH / 2}L${w * 0.92} ${ry + capH}H${w * 0.08}L${w * 0.14} ${ry + capH / 2}Z" fill="${L.frameColor}"/><text x="${w / 2}" y="${ry + capH / 2}" text-anchor="middle" dominant-baseline="middle" font-size="${fs * 0.85}" ${font} fill="${L.captionColor}" letter-spacing="${fs * 0.06}">${cap}</text>` : ''}`;
      h = ry + capH;
      if (!cap) h = T + pad * 2;
    }
  }
  const k = size / T;
  const W = Math.round(w * k), H = Math.round(h * k);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(w)} ${r3(h)}" width="${W}" height="${H}"><defs>${grad}</defs>${body}</svg>`,
    width: W,
    height: H,
  };
}

/** PNG data URL of the design at `size` px wide code. */
export async function qrDesignPng(G: QrGrid, L: QrLook, logoDataUrl: string | null, size = 1600): Promise<string> {
  const { svg, width, height } = qrDesignSvg(G, L, logoDataUrl, size);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('The QR code could not be drawn.'));
    i.src = url;
  });
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return cv.toDataURL('image/png');
}
