// Real CMYK for print. Colours are converted with a colour-managed table
// built by LittleCMS from the FOGRA39 "Coated" press profile (the
// European/Middle-East offset printing standard, also what most digital
// print shops expect): sRGB → FOGRA39, perceptual intent with black-point
// compensation, 33×33×33 grid, trilinear interpolation (average error
// under half a level). The same profile is embedded in every CMYK file
// so printers and Photoshop read the colours exactly as intended.
//
// Files in /public/color:
//   srgb-to-fogra39.bin   – the conversion table (C,M,Y,K bytes, r-major)
//   srgb-proof-fogra39.bin – sRGB → FOGRA39 → sRGB, for on-screen proofing
//   FOGRA39L_coated.icc   – the press profile ("free of known copyright
//                           restrictions", per the profile itself)

const N = 33;
let lutPromise: Promise<Uint8Array> | null = null;
let proofPromise: Promise<Uint8Array> | null = null;
let iccPromise: Promise<Uint8Array> | null = null;

const fetchBin = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  return new Uint8Array(await res.arrayBuffer());
};

export const loadCmykTable = () => (lutPromise ??= fetchBin('/color/srgb-to-fogra39.bin'));
export const loadProofTable = () => (proofPromise ??= fetchBin('/color/srgb-proof-fogra39.bin'));
export const loadPressProfile = () => (iccPromise ??= fetchBin('/color/FOGRA39L_coated.icc'));
export const PRESS_PROFILE_NAME = 'Coated FOGRA39 (ISO 12647-2:2004)';

// K-only ink that prints each sRGB grey at the same lightness on FOGRA39
// (computed from the profile with LittleCMS).
const GREY_TO_K = new Uint8Array([255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,254,254,253,252,251,249,248,247,247,246,245,243,242,241,240,240,239,237,236,235,234,233,232,232,231,229,228,227,226,225,224,224,223,222,221,219,217,216,215,214,213,212,211,210,209,208,207,205,204,203,202,201,200,199,198,197,196,195,194,193,192,190,189,188,187,186,185,184,183,182,181,180,178,177,175,174,173,172,171,170,169,168,167,165,164,163,162,161,160,159,158,156,155,154,153,152,151,149,148,148,147,146,145,144,142,141,140,139,137,136,135,134,132,131,130,129,127,126,125,123,122,121,119,118,117,116,114,114,113,112,110,109,108,106,105,104,102,101,100,98,97,96,94,93,93,91,90,89,87,86,85,83,82,80,79,78,76,75,75,73,72,70,69,67,66,65,63,62,60,59,59,57,56,54,53,51,50,48,47,45,45,44,42,41,39,37,36,34,33,31,31,30,28,27,25,23,22,20,19,17,17,16,14,13,11,9,8,6,6,5,3,1,0]);

function interp(lut: Uint8Array, channels: number, r: number, g: number, b: number, out: Float32Array) {
  const fr = (r / 255) * (N - 1), fg = (g / 255) * (N - 1), fb = (b / 255) * (N - 1);
  const ir = Math.min(fr | 0, N - 2), ig = Math.min(fg | 0, N - 2), ib = Math.min(fb | 0, N - 2);
  const dr = fr - ir, dg = fg - ig, db = fb - ib;
  for (let c = 0; c < channels; c++) out[c] = 0;
  for (let x = 0; x < 2; x++) {
    const wx = x ? dr : 1 - dr;
    for (let y = 0; y < 2; y++) {
      const wy = wx * (y ? dg : 1 - dg);
      for (let z = 0; z < 2; z++) {
        const w = wy * (z ? db : 1 - db);
        if (!w) continue;
        const base = (((ir + x) * N + (ig + y)) * N + (ib + z)) * channels;
        for (let c = 0; c < channels; c++) out[c] += w * lut[base + c];
      }
    }
  }
}

export interface CmykOptions {
  /** Pure greys/black from the design become K-only ink (crisp black text
   *  with no colour fringing). On by default for designs; off for photos. */
  pureBlack?: boolean;
  /** Composites transparent pixels onto this colour first (default white). */
  background?: [number, number, number];
}

/** Converts RGBA pixels to interleaved CMYK bytes (0 = no ink, 255 = full). */
export function rgbaToCmyk(rgba: Uint8ClampedArray | Uint8Array, lut: Uint8Array, opts: CmykOptions = {}): Uint8Array {
  const n = rgba.length / 4;
  const out = new Uint8Array(n * 4);
  const tmp = new Float32Array(4);
  const [br, bg, bb] = opts.background || [255, 255, 255];
  // Small cache: designs repeat the same colours a lot.
  const cache = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const a = rgba[i * 4 + 3] / 255;
    let r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    if (a < 1) {
      r = Math.round(r * a + br * (1 - a));
      g = Math.round(g * a + bg * (1 - a));
      b = Math.round(b * a + bb * (1 - a));
    }
    const o = i * 4;
    if (opts.pureBlack && r === g && g === b && r < 250) {
      // Neutral grey → K only, with the same lightness the press gives.
      out[o] = 0; out[o + 1] = 0; out[o + 2] = 0;
      out[o + 3] = GREY_TO_K[r];
      continue;
    }
    const key = (r << 16) | (g << 8) | b;
    const hit = cache.get(key);
    if (hit !== undefined) {
      out[o] = hit >>> 24; out[o + 1] = (hit >>> 16) & 255; out[o + 2] = (hit >>> 8) & 255; out[o + 3] = hit & 255;
      continue;
    }
    interp(lut, 4, r, g, b, tmp);
    const c = Math.round(tmp[0]), m = Math.round(tmp[1]), y = Math.round(tmp[2]), k = Math.round(tmp[3]);
    out[o] = c; out[o + 1] = m; out[o + 2] = y; out[o + 3] = k;
    if (cache.size < 200000) cache.set(key, ((c << 24) | (m << 16) | (y << 8) | k) >>> 0);
  }
  return out;
}

/** On-screen preview of how colours will print (soft proof). Modifies in place. */
export function proofRgbaInPlace(rgba: Uint8ClampedArray, proof: Uint8Array) {
  const tmp = new Float32Array(3);
  for (let i = 0; i < rgba.length; i += 4) {
    interp(proof, 3, rgba[i], rgba[i + 1], rgba[i + 2], tmp);
    rgba[i] = tmp[0]; rgba[i + 1] = tmp[1]; rgba[i + 2] = tmp[2];
  }
}

/** One colour, as printed percentages — for colour pickers and readouts. */
export async function hexToCmykPercent(hex: string): Promise<[number, number, number, number]> {
  const lut = await loadCmykTable();
  const v = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const tmp = new Float32Array(4);
  interp(lut, 4, (v >> 16) & 255, (v >> 8) & 255, v & 255, tmp);
  return [0, 1, 2, 3].map((i) => Math.round((tmp[i] / 255) * 100)) as [number, number, number, number];
}

/** Total ink coverage check (FOGRA39 limit is 330%). */
export function maxInkCoverage(cmyk: Uint8Array): number {
  let max = 0;
  for (let i = 0; i < cmyk.length; i += 4) {
    const t = cmyk[i] + cmyk[i + 1] + cmyk[i + 2] + cmyk[i + 3];
    if (t > max) max = t;
  }
  return Math.round((max / 255) * 100);
}
