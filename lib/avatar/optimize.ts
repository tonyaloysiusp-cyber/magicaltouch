// ---------------------------------------------------------------------
// lib/avatar/optimize.ts
// Turns whatever photo a user picks (a 20 MB camera shot, a screenshot,
// an iPhone HEIC) into three small square WebP/JPEG avatars before
// anything is uploaded: 512px (profile page), 128px and 64px (menus).
//
// Uploaded images are treated as untrusted:
//  - the real file signature (magic bytes) is checked, not the filename
//  - it must actually decode as an image
//  - it is redrawn onto a fresh canvas and re-encoded, which drops EXIF
//    (GPS location, camera serial) and any non-image payload
// ---------------------------------------------------------------------

export const AVATAR_SIZES = [512, 128, 64] as const;
export type AvatarSize = (typeof AVATAR_SIZES)[number];

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000; // ~8000x6000; beyond this decoding can crash phones
const MIN_SIDE = 32;

export class AvatarError extends Error {}

type Kind = 'jpeg' | 'png' | 'webp' | 'heic';

async function sniff(file: File): Promise<Kind | null> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  if (ascii(4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1|avif)$/.test(ascii(8, 12))) return 'heic';
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export interface OptimizedAvatar {
  size: AvatarSize;
  blob: Blob;
  ext: 'webp' | 'jpg';
}

export async function optimizeAvatar(file: File): Promise<OptimizedAvatar[]> {
  if (file.size > MAX_INPUT_BYTES) throw new AvatarError('That photo is larger than 25 MB. Please choose a smaller one.');
  const kind = await sniff(file);
  if (!kind) throw new AvatarError('Please choose a JPG, PNG, WebP or HEIC photo.');

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    throw new AvatarError(
      kind === 'heic'
        ? "This browser can't open HEIC photos. Please choose a JPG or PNG instead."
        : "That file couldn't be opened as an image.",
    );
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w < MIN_SIDE || h < MIN_SIDE) throw new AvatarError('That photo is too small. Please use one at least 32×32 pixels.');
  if (w * h > MAX_INPUT_PIXELS) throw new AvatarError('That photo has too many pixels. Please choose a smaller one.');

  // Centre square crop.
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) / 2;

  const out: OptimizedAvatar[] = [];
  for (const size of AVATAR_SIZES) {
    const target = Math.min(size, side); // never upscale a small photo
    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new AvatarError('Your browser could not process the photo.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // PNG avatars with transparency get a white background so the
    // JPEG fallback doesn't turn them black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target, target);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);

    // Quality tuned for faces: visibly clean at 512px while typically
    // landing around 30-120 KB. Safari can't encode WebP and silently
    // returns PNG, so fall back to JPEG in that case.
    let blob = await canvasToBlob(canvas, 'image/webp', 0.86);
    let ext: 'webp' | 'jpg' = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.88);
      ext = 'jpg';
    }
    if (!blob) throw new AvatarError('Your browser could not process the photo.');
    out.push({ size, blob, ext });
  }
  return out;
}

// avatar_url always stores the 512px variant; smaller ones sit beside it
// with the same naming, so any component can ask for the size it needs.
export function avatarVariant(url: string | null | undefined, size: AvatarSize): string | null {
  if (!url) return null;
  return url.replace(/avatar-512\.(webp|jpg)(\?.*)?$/, (_m, ext, q = '') => `avatar-${size}.${ext}${q}`);
}
