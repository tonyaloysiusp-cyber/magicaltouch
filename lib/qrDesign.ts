// ---------------------------------------------------------------------
// lib/qrDesign.ts
// Turns what a person types (a link, a social username, text, an email,
// a phone number, Wi-Fi details) into the exact text a phone camera
// understands, and draws real, scannable QR codes from it — with an
// optional logo in the centre.
//
// Scanning safety rules:
//  - Without a logo the code uses error correction M (15%).
//  - With a logo it switches to H (30%) and the logo plate covers at
//    most ~22% of the width (~5% of the area), well inside what H repairs.
//  - The three corner "eyes" and the 4-module quiet zone are never
//    covered or restyled into something a scanner can't find.
// ---------------------------------------------------------------------

import { qrMatrix, type Ecc } from './qr';

export type QrKind = 'link' | 'username' | 'text' | 'email' | 'phone' | 'whatsapp' | 'wifi' | 'sms' | 'vcard' | 'event' | 'location';
export type QrStyle = 'square' | 'rounded' | 'dots';

export const SOCIAL_PLATFORMS: { id: string; label: string; prefix: string }[] = [
  { id: 'instagram', label: 'Instagram', prefix: 'https://www.instagram.com/' },
  { id: 'tiktok', label: 'TikTok', prefix: 'https://www.tiktok.com/@' },
  { id: 'x', label: 'X (Twitter)', prefix: 'https://x.com/' },
  { id: 'facebook', label: 'Facebook', prefix: 'https://www.facebook.com/' },
  { id: 'youtube', label: 'YouTube', prefix: 'https://www.youtube.com/@' },
  { id: 'linkedin', label: 'LinkedIn', prefix: 'https://www.linkedin.com/in/' },
  { id: 'threads', label: 'Threads', prefix: 'https://www.threads.net/@' },
  { id: 'snapchat', label: 'Snapchat', prefix: 'https://www.snapchat.com/add/' },
  { id: 'pinterest', label: 'Pinterest', prefix: 'https://www.pinterest.com/' },
  { id: 'telegram', label: 'Telegram', prefix: 'https://t.me/' },
  { id: 'github', label: 'GitHub', prefix: 'https://github.com/' },
];

export interface QrFields {
  value?: string; // link / text / username / email / phone
  platform?: string; // username kind
  subject?: string; // email
  message?: string; // email body, WhatsApp text
  ssid?: string;
  password?: string;
  security?: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
  // contact card
  firstName?: string;
  lastName?: string;
  org?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  // event
  start?: string; // datetime-local value
  end?: string;
  location?: string;
}

/** "example.com/x" → "https://example.com/x"; leaves real schemes alone. */
export function normalizeLink(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return s; // https:, mailto:, tel:, etc.
  if (/^www\./i.test(s) || /^[^\s/]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(s)) return `https://${s}`;
  return s;
}

const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
const digits = (s: string) => s.replace(/[^\d+]/g, '');

/** The exact text encoded in the QR code, or '' when there is nothing to encode yet. */
export function buildQrPayload(kind: QrKind, f: QrFields): string {
  const v = (f.value || '').trim();
  switch (kind) {
    case 'link':
      return normalizeLink(v);
    case 'username': {
      if (!v) return '';
      // A full profile link pasted here is used as is.
      if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) return normalizeLink(v);
      const p = SOCIAL_PLATFORMS.find((x) => x.id === f.platform) || SOCIAL_PLATFORMS[0];
      const handle = v.replace(/^@+/, '').replace(/\s+/g, '');
      return handle ? p.prefix + encodeURI(handle) : '';
    }
    case 'text':
      return f.value || '';
    case 'email': {
      if (!v) return '';
      const q = [f.subject?.trim() && `subject=${encodeURIComponent(f.subject.trim())}`, f.message?.trim() && `body=${encodeURIComponent(f.message.trim())}`].filter(Boolean);
      return `mailto:${v}${q.length ? `?${q.join('&')}` : ''}`;
    }
    case 'phone':
      return v ? `tel:${digits(v)}` : '';
    case 'whatsapp': {
      const n = digits(v).replace(/^\+/, '');
      if (!n) return '';
      return `https://wa.me/${n}${f.message?.trim() ? `?text=${encodeURIComponent(f.message.trim())}` : ''}`;
    }
    case 'sms': {
      const n = digits(v);
      return n ? `SMSTO:${n}:${f.message?.trim() || ''}` : '';
    }
    case 'vcard': {
      const fn = [f.firstName, f.lastName].map((x) => (x || '').trim()).filter(Boolean).join(' ');
      if (!fn && !f.org?.trim()) return '';
      const e = (x?: string) => (x || '').trim().replace(/([\\;,])/g, '\\$1');
      return [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${e(f.lastName)};${e(f.firstName)};;;`, `FN:${e(fn || f.org)}`,
        f.org?.trim() && `ORG:${e(f.org)}`, f.title?.trim() && `TITLE:${e(f.title)}`,
        f.phone?.trim() && `TEL;TYPE=CELL:${digits(f.phone)}`, f.email?.trim() && `EMAIL:${f.email.trim()}`,
        f.website?.trim() && `URL:${normalizeLink(f.website)}`, f.address?.trim() && `ADR:;;${e(f.address)};;;;`,
        'END:VCARD',
      ].filter(Boolean).join('\n');
    }
    case 'event': {
      const title = (f.value || '').trim();
      if (!title || !f.start) return '';
      const stamp = (x: string) => x.replace(/[-:]/g, '').replace(/(T\d{4})$/, (m) => `${m}00`);
      return ['BEGIN:VEVENT', `SUMMARY:${title}`, `DTSTART:${stamp(f.start)}`, f.end && `DTEND:${stamp(f.end)}`, f.location?.trim() && `LOCATION:${f.location.trim()}`, 'END:VEVENT'].filter(Boolean).join('\n');
    }
    case 'location': {
      if (!v) return '';
      const m = v.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      return m ? `https://maps.google.com/?q=${m[1]},${m[2]}` : `https://maps.google.com/?q=${encodeURIComponent(v)}`;
    }
    case 'wifi': {
      const ssid = (f.ssid || '').trim();
      if (!ssid) return '';
      const sec = f.security || 'WPA';
      const pass = sec === 'nopass' ? '' : `P:${wifiEsc(f.password || '')};`;
      return `WIFI:T:${sec};S:${wifiEsc(ssid)};${pass}${f.hidden ? 'H:true;' : ''};`;
    }
  }
}

// --- colour checks ----------------------------------------------------
function lum(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
/** A warning when the colours would make the code hard or impossible to scan, else null. */
export function contrastWarning(fg: string, bg: string): string | null {
  const a = lum(fg), b = lum(bg);
  if (a > b) return 'The code colour is lighter than the background. Most phone cameras can’t read light-on-dark codes — swap them.';
  const ratio = (b + 0.05) / (a + 0.05);
  if (ratio < 4) return 'These colours are too close together to scan reliably. Use a darker code colour or a lighter background.';
  return null;
}

// --- geometry ---------------------------------------------------------
export interface QrLayout {
  matrix: boolean[][];
  modules: number; // matrix size
  quiet: number; // modules of empty margin on each side
  total: number; // modules + 2 * quiet
  ecc: Ecc;
  /** Cleared centre square in module units (inclusive start, exclusive end), when a logo is used. */
  hole: { x0: number; x1: number } | null;
}

/** Throws a friendly Error when the text is too long for a QR code. */
export function layoutQr(text: string, withLogo: boolean): QrLayout {
  const ecc: Ecc = withLogo ? 'H' : 'M';
  let matrix: boolean[][];
  try {
    matrix = qrMatrix(text, ecc);
  } catch {
    throw new Error(withLogo ? 'That is too much text for a QR code with a logo. Shorten it, or turn the logo off.' : 'That is too much text for one QR code. Please shorten it.');
  }
  const n = matrix.length;
  const quiet = 4;
  let hole: QrLayout['hole'] = null;
  if (withLogo) {
    // ~22% of the code's width, odd-sized so it stays centred, and never
    // reaching the corner eyes (7 modules + 1 separator).
    let w = Math.round(n * 0.22);
    if (w % 2 !== n % 2) w += 1;
    w = Math.min(w, n - 2 * 9);
    const x0 = (n - w) / 2;
    hole = { x0, x1: x0 + w };
  }
  return { matrix, modules: n, quiet, total: n + 2 * quiet, ecc, hole };
}

const inEye = (x: number, y: number, n: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
const inHole = (L: QrLayout, x: number, y: number) => !!L.hole && x >= L.hole.x0 && x < L.hole.x1 && y >= L.hole.x0 && y < L.hole.x1;

export interface QrDrawOptions {
  fg: string;
  bg: string; // 'transparent' allowed
  style: QrStyle;
}

/** Draws the code (without the logo image) on a 2D canvas context of `px` × `px`. */
export function drawQr(ctx: CanvasRenderingContext2D, L: QrLayout, px: number, o: QrDrawOptions) {
  const c = px / L.total;
  ctx.clearRect(0, 0, px, px);
  if (o.bg !== 'transparent') {
    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, px, px);
  }
  ctx.fillStyle = o.fg;
  const n = L.modules;
  const off = L.quiet * c;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!L.matrix[y][x] || inEye(x, y, n) || inHole(L, x, y)) continue;
      const X = off + x * c, Y = off + y * c;
      if (o.style === 'dots') {
        ctx.beginPath();
        ctx.arc(X + c / 2, Y + c / 2, c * 0.46, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.style === 'rounded') {
        roundRect(ctx, X, Y, c + 0.5, c + 0.5, c * 0.3);
        ctx.fill();
      } else {
        // +0.5px overlap avoids hairline gaps between neighbouring squares.
        ctx.fillRect(X, Y, c + 0.5, c + 0.5);
      }
    }
  // Corner eyes: a 7×7 ring and a 3×3 centre, solid so every scanner finds them.
  const eyes: [number, number][] = [[0, 0], [n - 7, 0], [0, n - 7]];
  const r = o.style === 'square' ? 0 : 1;
  for (const [ex, ey] of eyes) {
    const X = off + ex * c, Y = off + ey * c;
    ctx.beginPath();
    roundRect(ctx, X, Y, 7 * c, 7 * c, r * 1.6 * c);
    roundRect(ctx, X + c, Y + c, 5 * c, 5 * c, r * 1.1 * c, true);
    ctx.fill('evenodd');
    ctx.beginPath();
    roundRect(ctx, X + 2 * c, Y + 2 * c, 3 * c, 3 * c, r * 0.8 * c);
    ctx.fill();
  }
}

/** The square (in px) where the logo goes, inside its plate. */
export function logoBox(L: QrLayout, px: number) {
  if (!L.hole) return null;
  const c = px / L.total;
  const plate = { x: (L.quiet + L.hole.x0) * c, size: (L.hole.x1 - L.hole.x0) * c };
  const pad = c * 0.6;
  return { plate, logo: { x: plate.x + pad, size: plate.size - 2 * pad } };
}

/** Draws the logo plate and the logo, fitted (contain) inside the box. */
export function drawLogo(ctx: CanvasRenderingContext2D, L: QrLayout, px: number, img: CanvasImageSource & { width: number; height: number }, plateColor: string) {
  const box = logoBox(L, px);
  if (!box) return;
  const { plate, logo } = box;
  ctx.fillStyle = plateColor === 'transparent' ? '#ffffff' : plateColor;
  ctx.beginPath();
  roundRect(ctx, plate.x, plate.x, plate.size, plate.size, plate.size * 0.16);
  ctx.fill();
  const k = Math.min(logo.size / img.width, logo.size / img.height);
  const w = img.width * k, h = img.height * k;
  ctx.drawImage(img, logo.x + (logo.size - w) / 2, logo.x + (logo.size - h) / 2, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, reverse = false) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!reverse) {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
  } else {
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x, y, x, y + h, rr);
    ctx.arcTo(x, y + h, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x + w, y, rr);
    ctx.arcTo(x + w, y, x, y, rr);
  }
  ctx.closePath();
}

/** A crisp vector SVG of the code (logo embedded when given as a data URL). */
export function qrSvg(L: QrLayout, o: QrDrawOptions, logoDataUrl?: string | null): string {
  const n = L.modules, q = L.quiet, T = L.total;
  let d = '';
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (!L.matrix[y][x] || inEye(x, y, n) || inHole(L, x, y)) continue;
      const X = q + x, Y = q + y;
      if (o.style === 'dots') d += `M${X + 0.04} ${Y + 0.5}a.46 .46 0 1 0 .92 0a.46 .46 0 1 0 -.92 0z`;
      else d += `M${X} ${Y}h1v1h-1z`;
    }
  const rad = o.style === 'square' ? 0 : 1;
  const eyes = [[0, 0], [n - 7, 0], [0, n - 7]]
    .map(([ex, ey]) => {
      const X = q + ex, Y = q + ey;
      return `<path fill-rule="evenodd" d="M${X} ${Y}h7v7h-7zM${X + 1} ${Y + 1}v5h5v-5z"${rad ? ' stroke-linejoin="round"' : ''}/><rect x="${X + 2}" y="${Y + 2}" width="3" height="3" rx="${rad * 0.8}"/>`;
    })
    .join('');
  let logo = '';
  if (L.hole && logoDataUrl) {
    const s = L.hole.x1 - L.hole.x0, p0 = q + L.hole.x0;
    logo = `<rect x="${p0}" y="${p0}" width="${s}" height="${s}" rx="${s * 0.16}" fill="${o.bg === 'transparent' ? '#ffffff' : o.bg}"/><image href="${logoDataUrl}" x="${p0 + 0.6}" y="${p0 + 0.6}" width="${s - 1.2}" height="${s - 1.2}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${T} ${T}" width="1024" height="1024" shape-rendering="crispEdges">${o.bg !== 'transparent' ? `<rect width="${T}" height="${T}" fill="${o.bg}"/>` : ''}<g fill="${o.fg}"><path d="${d}"/>${eyes}</g>${logo}</svg>`;
}
