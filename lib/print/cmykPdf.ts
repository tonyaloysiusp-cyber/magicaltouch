// CMYK print PDFs. Every print-ready PDF we write goes through this: RGB
// colours in every content stream (pages and embedded artwork, at any depth)
// become FOGRA39 CMYK ink values, grey becomes K only, RGB pictures are
// converted pixel by pixel to DeviceCMYK, and the coated FOGRA39 profile is
// attached as the output intent. Digital files (PNG, JPEG, screen PDFs) stay RGB.
//
// What it cannot convert is reported, never hidden: spot / Lab colour
// spaces, JPEG pictures when no decoder is available (Node), 16-bit images.

import type { PDFDocument as PDFDoc } from 'pdf-lib';

export type ToCmyk = (r: number, g: number, b: number) => [number, number, number, number];
export interface CmykOptions {
  toCmyk: ToCmyk;
  /** sRGB → CMYK pixel converter (the press LUT); without it pictures are reported, not converted. */
  pixels?: (rgba: Uint8Array) => Uint8Array;
  icc?: Uint8Array | null;
  /** Decodes a JPEG to RGBA (browser canvas). */
  decodeJpeg?: (bytes: Uint8Array) => Promise<{ rgba: Uint8Array; width: number; height: number }>;
}
export interface CmykReport { colours: number; images: number; skipped: string[] }

const NUM = '(-?(?:\\d+\\.?\\d*|\\.\\d+))';
const RGB_OP = new RegExp(`${NUM}\\s+${NUM}\\s+${NUM}\\s+(rg|RG)(?=[\\s\\]\\[/<>(){}%]|$)`, 'g');
const GRAY_OP = new RegExp(`(^|[\\s\\]\\[)>}])${NUM}\\s+(g|G)(?=[\\s\\]\\[/<>(){}%]|$)`, 'g');
const f = (n: number) => String(Math.round(n * 10000) / 10000);

/** Rewrites RGB / grey colour operators in one content stream. */
export function rewriteColours(src: string, toCmyk: ToCmyk, rep: CmykReport): string {
  // Leave strings and inline images alone: split them out first.
  const parts = src.split(/(\((?:\\.|[^\\)])*\)|BI[\s\S]*?\sEI\b)/);
  return parts.map((part, i) => {
    if (i % 2) return part;
    return part
      .replace(RGB_OP, (_m, r, g, b, op) => {
        const [C, M, Y, K] = toCmyk(Number(r) * 255, Number(g) * 255, Number(b) * 255);
        rep.colours++;
        return `${f(C)} ${f(M)} ${f(Y)} ${f(K)} ${op === 'rg' ? 'k' : 'K'}`;
      })
      .replace(GRAY_OP, (_m, pre, v, op) => { rep.colours++; return `${pre}0 0 0 ${f(1 - Number(v))} ${op === 'g' ? 'k' : 'K'}`; });
  }).join('');
}

async function convertImage(doc: PDFDoc, ref: any, stream: any, o: CmykOptions, rep: CmykReport, lib: any) {
  const { PDFName, PDFNumber, decodePDFRawStream, PDFRawStream } = lib;
  const dict = stream.dict;
  const cs = dict.lookup(PDFName.of('ColorSpace'));
  const isRgb = cs === PDFName.of('DeviceRGB') || (cs?.asArray && cs.lookup(0) === PDFName.of('ICCBased') && cs.lookup(1)?.dict?.lookup(PDFName.of('N'))?.asNumber?.() === 3);
  if (!isRgb) { if (cs && cs !== PDFName.of('DeviceCMYK') && cs !== PDFName.of('DeviceGray')) rep.skipped.push('a picture in a special colour space'); return; }
  if (!o.pixels) { rep.skipped.push('RGB picture (no converter)'); return; }
  const bpc = dict.lookup(PDFName.of('BitsPerComponent'))?.asNumber?.() ?? 8;
  if (bpc !== 8) { rep.skipped.push(`a ${bpc}-bit picture`); return; }
  const w = dict.lookup(PDFName.of('Width')).asNumber(), h = dict.lookup(PDFName.of('Height')).asNumber();
  const filter = dict.lookup(PDFName.of('Filter'));
  const filters = filter?.asArray ? filter.asArray().map((x: any) => x.toString()) : filter ? [filter.toString()] : [];
  let rgba: Uint8Array;
  if (filters.includes('/DCTDecode')) {
    if (!o.decodeJpeg) { rep.skipped.push('a JPEG picture (left RGB — converted by the RIP with the output profile)'); return; }
    const d = await o.decodeJpeg(stream instanceof PDFRawStream ? stream.contents : stream.getContents());
    rgba = d.rgba;
  } else {
    if (filters.some((x: string) => !['/FlateDecode', '/LZWDecode', '/ASCIIHexDecode', '/ASCII85Decode', '/RunLengthDecode'].includes(x))) { rep.skipped.push('a picture with an unsupported filter'); return; }
    if (dict.lookup(PDFName.of('DecodeParms'))?.lookup?.(PDFName.of('Predictor'))?.asNumber?.() > 1) {
      // PNG predictors: pdf-lib decodes Flate but not predictors — handle the common PNG Up/Sub/... rows.
      const raw = decodePDFRawStream(stream).decode();
      const out = new Uint8Array(w * h * 4), row = w * 3, prev = new Uint8Array(row), cur = new Uint8Array(row);
      for (let y = 0; y < h; y++) {
        const t = raw[y * (row + 1)], s = raw.subarray(y * (row + 1) + 1, (y + 1) * (row + 1));
        for (let i = 0; i < row; i++) {
          const a = i >= 3 ? cur[i - 3] : 0, b = prev[i], c = i >= 3 ? prev[i - 3] : 0;
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          cur[i] = (s[i] + (t === 1 ? a : t === 2 ? b : t === 3 ? (a + b) >> 1 : t === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0)) & 255;
        }
        for (let x = 0; x < w; x++) { out[(y * w + x) * 4] = cur[x * 3]; out[(y * w + x) * 4 + 1] = cur[x * 3 + 1]; out[(y * w + x) * 4 + 2] = cur[x * 3 + 2]; out[(y * w + x) * 4 + 3] = 255; }
        prev.set(cur);
      }
      rgba = out;
    } else {
      const raw = decodePDFRawStream(stream).decode();
      if (raw.length < w * h * 3) { rep.skipped.push('a picture that could not be read'); return; }
      rgba = new Uint8Array(w * h * 4);
      for (let i = 0, j = 0; i < w * h; i++, j += 3) { rgba[i * 4] = raw[j]; rgba[i * 4 + 1] = raw[j + 1]; rgba[i * 4 + 2] = raw[j + 2]; rgba[i * 4 + 3] = 255; }
    }
  }
  const cmyk = o.pixels(rgba);
  const nd = doc.context.obj({ Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceCMYK', BitsPerComponent: 8 }) as any;
  for (const k of ['SMask', 'Mask', 'Interpolate', 'Intent']) { const v = dict.get(PDFName.of(k)); if (v) nd.set(PDFName.of(k), v); }
  const ns = doc.context.flateStream(cmyk, {});
  for (const [k, v] of nd.entries()) ns.dict.set(k, v);
  ns.dict.set(PDFName.of('Width'), PDFNumber.of(w));
  doc.context.assign(ref, ns);
  rep.images++;
}

/** Converts a PDF to CMYK in place (returns new bytes) and reports what it did. */
export async function cmykify(bytes: Uint8Array, o: CmykOptions): Promise<{ bytes: Uint8Array; report: CmykReport }> {
  const lib: any = await import('pdf-lib');
  const { PDFDocument, PDFName, PDFRawStream, PDFRef, decodePDFRawStream, PDFArray } = lib;
  const doc: PDFDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const rep: CmykReport = { colours: 0, images: 0, skipped: [] };
  const seen = new Set<string>();
  const rewriteStream = (ref: any) => {
    const key = ref.toString();
    if (seen.has(key)) return; seen.add(key);
    const s: any = doc.context.lookup(ref);
    if (!(s instanceof PDFRawStream)) return;
    let text: string;
    try { const d = decodePDFRawStream(s).decode(); text = ''; for (let i = 0; i < d.length; i += 0x8000) text += String.fromCharCode.apply(null, Array.from(d.subarray(i, i + 0x8000))); } catch { rep.skipped.push('a drawing that could not be read'); return; }
    const out = rewriteColours(text, o.toCmyk, rep);
    if (out === text) return;
    const data = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) data[i] = out.charCodeAt(i) & 255;
    const ns = doc.context.flateStream(data, {});
    for (const [k, v] of s.dict.entries()) if (!['/Filter', '/Length', '/DecodeParms'].includes(k.toString())) ns.dict.set(k, v);
    doc.context.assign(ref, ns);
  };
  const walkResources = async (res: any) => {
    if (!res) return;
    const xo = res.lookup(PDFName.of('XObject'));
    if (!xo) return;
    for (const [, v] of xo.entries()) {
      if (!(v instanceof PDFRef)) continue;
      const key = v.toString();
      if (seen.has(key)) continue;
      const s = doc.context.lookup(v) as any;
      if (!s?.dict) continue;
      const sub = s.dict.lookup(PDFName.of('Subtype'));
      if (sub === PDFName.of('Form')) { const inner = s.dict.lookup(PDFName.of('Resources')); rewriteStream(v); await walkResources(inner); }
      else if (sub === PDFName.of('Image')) { seen.add(key); await convertImage(doc, v, s, o, rep, lib); }
    }
  };
  for (const page of doc.getPages()) {
    const c: any = page.node.get(PDFName.of('Contents'));
    if (c instanceof PDFRef) {
      const target: any = doc.context.lookup(c);
      if (target instanceof PDFArray) for (const r of target.asArray()) rewriteStream(r); else rewriteStream(c);
    } else if (c instanceof PDFArray) for (const r of c.asArray()) rewriteStream(r);
    await walkResources(page.node.Resources());
  }
  if (o.icc) {
    const icc = doc.context.flateStream(o.icc, { N: 4 });
    const iccRef = doc.context.register(icc);
    doc.catalog.set(PDFName.of('OutputIntents'), doc.context.obj([doc.context.obj({ Type: 'OutputIntent', S: 'GTS_PDFX', OutputConditionIdentifier: lib.PDFString.of('FOGRA39'), OutputCondition: lib.PDFString.of('Offset printing, coated paper'), RegistryName: lib.PDFString.of('http://www.color.org'), Info: lib.PDFString.of('Coated FOGRA39'), DestOutputProfile: iccRef })]));
  }
  rep.skipped = [...new Set(rep.skipped)];
  return { bytes: await doc.save({ useObjectStreams: false }), report: rep };
}
