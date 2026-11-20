// Retail and carton barcodes, encoded to the GS1 rules (deterministic, no
// lookup service): EAN-13, UPC-A, EAN-8 and ITF-14. Geometry in millimetres:
// X = module width (0.330 mm at 100 % for EAN/UPC), quiet zones, guard bars,
// bar width reduction for press gain. Human-readable digits are drawn as
// stroked vector paths so the files need no font.

export type BarcodeType = 'ean13' | 'upca' | 'ean8' | 'itf14';
export const BARCODE_TYPES: { id: BarcodeType; name: string; digits: number; hint: string }[] = [
  { id: 'ean13', name: 'EAN-13', digits: 13, hint: 'Retail products worldwide (GTIN-13).' },
  { id: 'upca', name: 'UPC-A', digits: 12, hint: 'Retail products in the USA and Canada (GTIN-12).' },
  { id: 'ean8', name: 'EAN-8', digits: 8, hint: 'Small packs where EAN-13 does not fit.' },
  { id: 'itf14', name: 'ITF-14', digits: 14, hint: 'Outer shipping cartons (GTIN-14), with bearer bars.' },
];

/** GS1 check digit for the given digits (without the check digit). */
export function gs1Check(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}

/** Normalises input: digits only; adds the check digit when one is missing, or reports a wrong one. */
export function normalise(type: BarcodeType, input: string): { code: string; error?: string; added?: boolean } {
  const n = BARCODE_TYPES.find((t) => t.id === type)!.digits;
  const d = input.replace(/\D/g, '');
  if (d.length === n - 1) return { code: d + gs1Check(d), added: true };
  if (d.length !== n) return { code: d, error: `${BARCODE_TYPES.find((t) => t.id === type)!.name} needs ${n - 1} digits (the check digit is added) or ${n} digits.` };
  const want = gs1Check(d.slice(0, -1));
  if (Number(d[n - 1]) !== want) return { code: d, error: `The check digit should be ${want}, not ${d[n - 1]}.` };
  return { code: d };
}

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((p) => p.replace(/./g, (c) => (c === '0' ? '1' : '0')));
const G = R.map((p) => p.split('').reverse().join(''));
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'GLGLGL', 'GLGGLG', 'GGLLGL'];
const ITF = ['nnwwn', 'wnnnw', 'nwnnw', 'wwnnn', 'nnwnw', 'wnwnn', 'nwwnn', 'nnnww', 'wnnwn', 'nwnwn'];

/** EAN/UPC module string (1 = bar) and which modules are guard bars (extend lower). */
export function eanModules(type: 'ean13' | 'upca' | 'ean8', code: string): { bits: string; guard: boolean[] } {
  let bits = '', guard: boolean[] = [];
  const add = (s: string, g: boolean) => { bits += s; guard = guard.concat(Array(s.length).fill(g)); };
  if (type === 'ean8') {
    add('101', true);
    for (let i = 0; i < 4; i++) add(L[+code[i]], false);
    add('01010', true);
    for (let i = 4; i < 8; i++) add(R[+code[i]], false);
    add('101', true);
    return { bits, guard };
  }
  const c13 = type === 'upca' ? '0' + code : code;
  const par = PARITY[+c13[0]];
  add('101', true);
  for (let i = 1; i <= 6; i++) add((par[i - 1] === 'L' ? L : G)[+c13[i]], type === 'upca' && i === 1);
  add('01010', true);
  for (let i = 7; i <= 12; i++) add(R[+c13[i]], type === 'upca' && i === 12);
  add('101', true);
  return { bits, guard };
}

export interface BarcodeOptions { type: BarcodeType; code: string; magnification: number; heightMm?: number; bwrMm: number; text: boolean; ink: string; bg: string | null }
export const DEFAULT_BARCODE: BarcodeOptions = { type: 'ean13', code: '400638133393', magnification: 100, bwrMm: 0, text: true, ink: '#000000', bg: '#FFFFFF' };

// Stroked digit outlines (OCR-B-like), in a 0..10 × 0..16 box.
const DIG: Record<string, string> = {
  '0': 'M5 1C1.5 1 1 4.5 1 8C1 11.5 1.5 15 5 15C8.5 15 9 11.5 9 8C9 4.5 8.5 1 5 1Z',
  '1': 'M2.5 4L6 1L6 15M2.5 15L9 15',
  '2': 'M1.5 4C1.5 2 3 1 5 1C7 1 8.5 2 8.5 4C8.5 7 1.5 10 1.5 15L8.8 15',
  '3': 'M1.5 2.5C2.3 1.5 3.5 1 5 1C7.2 1 8.5 2.2 8.5 4C8.5 6 7 7.5 4.5 7.5C7.5 7.5 9 9 9 11.5C9 13.8 7.3 15 5 15C3.3 15 2 14.4 1.2 13.2',
  '4': 'M7 15L7 1L1 11L9.5 11',
  '5': 'M8.5 1L2.2 1L1.6 7.4C2.6 6.6 3.7 6.2 5 6.2C7.6 6.2 9 8 9 10.5C9 13.2 7.3 15 4.8 15C3.2 15 2 14.4 1.2 13.4',
  '6': 'M7.8 1.8C7 1.3 6 1 5 1C2.2 1 1 4.5 1 9C1 13 2.5 15 5 15C7.5 15 9 13.2 9 10.6C9 8 7.5 6.4 5.2 6.4C3.2 6.4 1.8 7.5 1.1 9',
  '7': 'M1 1L9 1C6 5 4.2 9.5 3.6 15',
  '8': 'M5 7.6C2.8 7.6 1.6 6.3 1.6 4.3C1.6 2.3 3 1 5 1C7 1 8.4 2.3 8.4 4.3C8.4 6.3 7.2 7.6 5 7.6ZM5 7.6C2.5 7.6 1 9.1 1 11.3C1 13.6 2.7 15 5 15C7.3 15 9 13.6 9 11.3C9 9.1 7.5 7.6 5 7.6Z',
  '9': 'M2.2 14.2C3 14.7 4 15 5 15C7.8 15 9 11.5 9 7C9 3 7.5 1 5 1C2.5 1 1 2.8 1 5.4C1 8 2.5 9.6 4.8 9.6C6.8 9.6 8.2 8.5 8.9 7',
  '<': 'M8.5 3L2 8L8.5 13', '>': 'M1.5 3L8 8L1.5 13',
};

export interface BarcodeGeom { w: number; h: number; bars: { x: number; w: number; h: number; y: number }[]; digits: { ch: string; x: number; y: number; size: number }[]; bearer?: { t: number }; x: number }

export function barcodeGeom(o: BarcodeOptions): BarcodeGeom {
  const k = Math.max(0.8, Math.min(2, o.magnification / 100));
  if (o.type === 'itf14') {
    // ITF-14: X ≈ 0.495 mm at 100 % (GS1 range 0.495–1.016), wide:narrow 2.5, bars 32 mm, quiet zone 10X, bearer 4.8 mm frame.
    const X = 0.495 * k, N = X, Wd = 2.5 * X, H = (o.heightMm ?? 32) * Math.min(1, k), qz = 10 * X, bearer = 4.8 * Math.min(1, k) * 0.5;
    const bars: BarcodeGeom['bars'] = []; let x = qz + bearer;
    const put = (wide: boolean, bar: boolean) => { const w = wide ? Wd : N; if (bar) bars.push({ x: x + o.bwrMm / 2, w: Math.max(0.05, w - o.bwrMm), h: H, y: bearer }); x += w; };
    // start: narrow bar, narrow space, narrow bar, narrow space
    put(false, true); put(false, false); put(false, true); put(false, false);
    for (let i = 0; i < 14; i += 2) { const a = ITF[+o.code[i]], b = ITF[+o.code[i + 1]]; for (let j = 0; j < 5; j++) { put(a[j] === 'w', true); put(b[j] === 'w', false); } }
    put(true, true); put(false, false); put(false, true); // stop
    x += qz + bearer;
    const textH = o.text ? 6 * Math.min(1, k) : 0;
    const digits = o.text ? o.code.split('').map((ch, i) => ({ ch, x: (x / 2) - 14 * 2.6 * Math.min(1, k) / 2 + i * 2.6 * Math.min(1, k), y: H + 2 * bearer + 1.5, size: 3.6 * Math.min(1, k) })) : [];
    return { w: x, h: H + 2 * bearer + textH + (o.text ? 2 : 0), bars, digits, bearer: { t: bearer }, x: X };
  }
  const X = 0.33 * k;
  const { bits, guard } = eanModules(o.type, o.code);
  const qzL = (o.type === 'ean8' ? 7 : o.type === 'upca' ? 9 : 11) * X, qzR = (o.type === 'ean8' ? 7 : o.type === 'upca' ? 9 : 7) * X;
  const barH = (o.heightMm ?? (o.type === 'ean8' ? 18.23 : 22.85)) * k;
  const guardExtra = 5 * X, digitSize = 2.75 * k;
  const bars: BarcodeGeom['bars'] = [];
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === '1') { let j = i; while (j < bits.length && bits[j] === '1' && guard[j] === guard[i]) j++; bars.push({ x: qzL + i * X + o.bwrMm / 2, w: Math.max(0.05, (j - i) * X - o.bwrMm), h: barH + (guard[i] && o.text ? guardExtra : 0), y: 0 }); i = j; }
    else i++;
  }
  const digits: BarcodeGeom['digits'] = [];
  if (o.text) {
    const ty = barH + guardExtra * 0.25, mod = (m: number) => qzL + m * X;
    if (o.type === 'ean13') {
      digits.push({ ch: o.code[0], x: qzL - 7 * X, y: ty, size: digitSize });
      for (let n = 0; n < 6; n++) digits.push({ ch: o.code[1 + n], x: mod(3 + n * 7) + 0.6 * X, y: ty, size: digitSize });
      for (let n = 0; n < 6; n++) digits.push({ ch: o.code[7 + n], x: mod(50 + n * 7) + 0.6 * X, y: ty, size: digitSize });
      digits.push({ ch: '>', x: mod(95) + 1.5 * X, y: ty, size: digitSize });
    } else if (o.type === 'upca') {
      digits.push({ ch: o.code[0], x: qzL - 7 * X, y: ty, size: digitSize * 0.8 });
      for (let n = 0; n < 5; n++) digits.push({ ch: o.code[1 + n], x: mod(10 + n * 7) + 0.6 * X, y: ty, size: digitSize });
      for (let n = 0; n < 5; n++) digits.push({ ch: o.code[6 + n], x: mod(50 + n * 7) + 0.6 * X, y: ty, size: digitSize });
      digits.push({ ch: o.code[11], x: mod(95) + 1.5 * X, y: ty, size: digitSize * 0.8 });
    } else {
      digits.push({ ch: '<', x: qzL - 6 * X, y: ty, size: digitSize });
      for (let n = 0; n < 4; n++) digits.push({ ch: o.code[n], x: mod(3 + n * 7) + 0.6 * X, y: ty, size: digitSize });
      for (let n = 0; n < 4; n++) digits.push({ ch: o.code[4 + n], x: mod(36 + n * 7) + 0.6 * X, y: ty, size: digitSize });
      digits.push({ ch: '>', x: mod(67) + 1 * X, y: ty, size: digitSize });
    }
  }
  return { w: qzL + bits.length * X + qzR, h: barH + (o.text ? guardExtra + digitSize * 1.1 : 0), bars, digits, x: X };
}

const r3 = (n: number) => String(Math.round(n * 1000) / 1000);
/** Digit outline path (stroked) at x, y (top), height = size mm. */
export function digitPath(ch: string, x: number, y: number, size: number): string {
  const d = DIG[ch]; if (!d) return '';
  const s = size / 16;
  return d.replace(/-?\d*\.?\d+/g, (() => { let i = 0; return (m: string) => { const v = Number(m); const out = i++ % 2 === 0 ? x + v * s : y + v * s; return ` ${r3(out)}`; }; })());
}

export function barcodeSvg(o: BarcodeOptions): string {
  const g = barcodeGeom(o);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(g.w)} ${r3(g.h)}" width="${r3(g.w)}mm" height="${r3(g.h)}mm">`;
  if (o.bg) s += `<rect width="${r3(g.w)}" height="${r3(g.h)}" fill="${o.bg}"/>`;
  s += `<g fill="${o.ink}">${g.bars.map((b) => `<rect x="${r3(b.x)}" y="${r3(b.y)}" width="${r3(b.w)}" height="${r3(b.h)}"/>`).join('')}</g>`;
  if (g.bearer) { const t = g.bearer.t, H = g.bars[0]?.h ?? 0; s += `<rect x="${r3(t / 2)}" y="${r3(t / 2)}" width="${r3(g.w - t)}" height="${r3(H + t)}" fill="none" stroke="${o.ink}" stroke-width="${r3(t)}"/>`; }
  if (g.digits.length) s += `<g fill="none" stroke="${o.ink}" stroke-width="${r3((g.digits[0].size / 16) * 1.6)}" stroke-linecap="round" stroke-linejoin="round">${g.digits.map((d) => `<path d="${digitPath(d.ch, d.x, d.y, d.size)}"/>`).join('')}</g>`;
  return s + '</svg>';
}

/** 1:1 vector PDF: bars in 100 % K (or the chosen CMYK), no fonts. */
export async function barcodePdf(o: BarcodeOptions, cmykInk: [number, number, number, number] = [0, 0, 0, 1]): Promise<Uint8Array> {
  const { PDFDocument, PDFName } = await import('pdf-lib');
  const g = barcodeGeom(o), PT = 72 / 25.4;
  const doc = await PDFDocument.create(); doc.setProducer(''); doc.setCreator(''); doc.setTitle(`${o.type.toUpperCase()} ${o.code}`);
  const page = doc.addPage([g.w * PT, g.h * PT]);
  const H = g.h, X = (v: number) => r3(v * PT), Y = (v: number) => r3((H - v) * PT);
  const ink = cmykInk.map((v) => r3(v)).join(' ');
  let cs = `q ${ink} k ${ink} K\n`;
  if (o.bg === null) { /* transparent background */ }
  for (const b of g.bars) cs += `${X(b.x)} ${Y(b.y + b.h)} ${r3(b.w * PT)} ${r3(b.h * PT)} re\n`;
  cs += 'f\n';
  if (g.bearer) { const t = g.bearer.t, Hb = g.bars[0]?.h ?? 0; cs += `${r3(t * PT)} w ${X(t / 2)} ${Y(t / 2 + Hb + t)} ${r3((g.w - t) * PT)} ${r3((Hb + t) * PT)} re S\n`; }
  if (g.digits.length) {
    cs += `${r3((g.digits[0].size / 16) * 1.6 * PT)} w 1 J 1 j\n`;
    for (const d of g.digits) {
      const p = digitPath(d.ch, d.x, d.y, d.size); const nums = (p.match(/-?\d*\.?\d+/g) || []).map(Number); const cmds = p.match(/[MLCZ]/g) || [];
      let i = 0; for (const c of cmds) { if (c === 'M') { cs += `${X(nums[i])} ${Y(nums[i + 1])} m\n`; i += 2; } else if (c === 'L') { cs += `${X(nums[i])} ${Y(nums[i + 1])} l\n`; i += 2; } else if (c === 'C') { cs += `${X(nums[i])} ${Y(nums[i + 1])} ${X(nums[i + 2])} ${Y(nums[i + 3])} ${X(nums[i + 4])} ${Y(nums[i + 5])} c\n`; i += 6; } else cs += 'h\n'; }
      cs += 'S\n';
    }
  }
  cs += 'Q\n';
  const ctx = doc.context;
  page.node.set(PDFName.of('Contents'), ctx.register(ctx.flateStream(new TextEncoder().encode(cs))));
  return doc.save({ useObjectStreams: false });
}
