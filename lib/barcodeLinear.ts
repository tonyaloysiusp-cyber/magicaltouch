// Linear barcodes for the design editor. Retail codes (EAN-13, EAN-8, UPC-A,
// ITF-14) use lib/barcode.ts (GS1 sizes, guard bars, check digit). Code 128,
// Code 39, UPC-E and ITF use the JsBarcode encoders (a widely used library),
// so the bars are a real, scannable symbol; this file turns the module
// pattern into vector bars with the quiet zones each symbology needs.

import { barcodeSvg, normalise, type BarcodeType } from './barcode';

export type CodeKind = 'ean13' | 'ean8' | 'upca' | 'upce' | 'itf14' | 'itf' | 'code128' | 'code39';
export const CODE_KINDS: { id: CodeKind; name: string; hint: string; placeholder: string }[] = [
  { id: 'ean13', name: 'EAN-13', hint: 'Retail products worldwide (12 digits + check digit).', placeholder: '400638133393' },
  { id: 'upca', name: 'UPC-A', hint: 'Retail products in North America (11 digits + check digit).', placeholder: '03600029145' },
  { id: 'ean8', name: 'EAN-8', hint: 'Small retail packs (7 digits + check digit).', placeholder: '9638507' },
  { id: 'upce', name: 'UPC-E', hint: 'Small packs, North America (6 digits, or a zero-suppressible UPC-A).', placeholder: '123456' },
  { id: 'itf14', name: 'ITF-14', hint: 'Outer cartons and cases (13 digits + check digit).', placeholder: '1540014128876' },
  { id: 'itf', name: 'ITF (Interleaved 2 of 5)', hint: 'Digits only, even count — warehouse and logistics labels.', placeholder: '12345678' },
  { id: 'code128', name: 'Code 128', hint: 'Letters, numbers and symbols — shipping, inventory, asset tags.', placeholder: 'MTD-2026-0042' },
  { id: 'code39', name: 'Code 39', hint: 'Capital letters, digits and - . $ / + % space — industry and ID badges.', placeholder: 'ABC-123' },
];

export interface LinearOptions { kind: CodeKind; value: string; x: number; heightMm: number; text: boolean; ink: string; bg: string | null }
export interface LinearResult { svg: string; wMm: number; hMm: number; value: string; error?: string; note?: string }

const r3 = (n: number) => String(Math.round(n * 1000) / 1000);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Retail code through lib/barcode (GS1 rules); magnification from the module width. */
function retail(o: LinearOptions): LinearResult {
  const type = o.kind as BarcodeType;
  const n = normalise(type, o.value.replace(/\s/g, ''));
  if (n.error) return { svg: '', wMm: 0, hMm: 0, value: o.value, error: n.error };
  const base = type === 'itf14' ? 0.495 : 0.33;
  const svg = barcodeSvg({ type, code: n.code, magnification: Math.round((o.x / base) * 100), heightMm: o.heightMm, bwrMm: 0, text: o.text, ink: o.ink, bg: o.bg });
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { svg, wMm: m ? +m[1] : 0, hMm: m ? +m[2] : 0, value: n.code, note: n.added ? `Check digit added: ${n.code.slice(-1)}` : undefined };
}

export async function linearBarcode(o: LinearOptions): Promise<LinearResult> {
  if (o.kind === 'ean13' || o.kind === 'ean8' || o.kind === 'upca' || o.kind === 'itf14') return retail(o);
  const mod: any = await import('jsbarcode');
  const JsBarcode = mod.default || mod;
  const format = o.kind === 'code128' ? 'CODE128' : o.kind === 'code39' ? 'CODE39' : o.kind === 'upce' ? 'UPCE' : 'ITF';
  const value = o.kind === 'code39' ? o.value.toUpperCase() : o.value.trim();
  const obj: any = {};
  let valid = true;
  try { JsBarcode(obj, value, { format, valid: (v: boolean) => { valid = v; } }); } catch { valid = false; }
  const enc: { data: string; text: string }[] = obj.encodings || [];
  if (!valid || !enc.length) {
    const why = o.kind === 'itf' ? 'ITF needs an even number of digits.' : o.kind === 'upce' ? 'UPC-E needs 6 digits (or 7–8 with number system and check digit).' : o.kind === 'code39' ? 'Code 39 allows A–Z, 0–9, space and - . $ / + %.' : 'Code 128 allows printable ASCII characters only.';
    return { svg: '', wMm: 0, hMm: 0, value, error: why };
  }
  const bits = enc.map((e) => e.data).join('');
  const X = o.x, qz = (o.kind === 'upce' ? 9 : 10) * X, H = o.heightMm;
  const textH = o.text ? Math.max(2.4, X * 9) : 0;
  const w = qz * 2 + bits.length * X, h = H + (o.text ? textH + 1 : 0);
  let rects = '';
  for (let i = 0; i < bits.length;) {
    if (bits[i] === '1') { let j = i; while (j < bits.length && bits[j] === '1') j++; rects += `<rect x="${r3(qz + i * X)}" y="0" width="${r3((j - i) * X)}" height="${r3(H)}"/>`; i = j; } else i++;
  }
  const text = enc.map((e) => e.text).join('').trim() || value;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(w)} ${r3(h)}" width="${r3(w)}mm" height="${r3(h)}mm">`;
  if (o.bg) s += `<rect width="${r3(w)}" height="${r3(h)}" fill="${o.bg}"/>`;
  s += `<g fill="${o.ink}">${rects}</g>`;
  if (o.text) s += `<text x="${r3(w / 2)}" y="${r3(H + textH)}" font-family="Roboto Mono, Courier New, monospace" font-size="${r3(textH)}" text-anchor="middle" fill="${o.ink}">${esc(text)}</text>`;
  return { svg: s + '</svg>', wMm: w, hMm: h, value };
}

/** Print-quality warnings for a module width (mm) and height. */
export function barcodeWarnings(o: LinearOptions): string[] {
  const out: string[] = [];
  const retailKind = o.kind === 'ean13' || o.kind === 'ean8' || o.kind === 'upca' || o.kind === 'upce';
  if (retailKind && o.x < 0.264) out.push('Below 80 % magnification (0.264 mm bars): many shop scanners will not read it.');
  if (retailKind && o.x > 0.66) out.push('Above 200 % magnification: larger than GS1 allows for retail codes.');
  if (o.kind === 'itf14' && o.x < 0.495) out.push('ITF-14 bars under 0.495 mm are below the GS1 minimum for cartons.');
  if (!retailKind && o.kind !== 'itf14' && o.x < 0.19) out.push('Bars thinner than 0.19 mm need a high-resolution printer and scanner.');
  if (o.heightMm < 10) out.push('Bars under 10 mm tall are hard to scan with handheld scanners.');
  const dark = (c: string) => { const v = parseInt(c.replace('#', ''), 16); const r = v >> 16, g = (v >> 8) & 255, b = v & 255; return 0.299 * r + 0.587 * g + 0.114 * b < 128; };
  if (!dark(o.ink)) out.push('Bars must be dark: light or red bars do not scan.');
  if (o.bg && dark(o.bg)) out.push('The background must be light (white is best).');
  return out;
}
