// PDF side of the imposition studio (pdf-lib, runs in the browser and in
// Node for tests): read a PDF's boxes, fonts, images, colour spaces and
// blank pages, and write an imposed document. Source pages are embedded as
// form XObjects — text stays text and vectors stay vectors.

import type { Box, Doc, Item, Source, SourcePage } from './model.ts';
import { clipLocal, apply, decompose } from './model.ts';

export const PT = 72 / 25.4; // points per mm
const mm = (pt: number) => Math.round((pt / PT) * 1000) / 1000;

export interface FontInfo { name: string; subtype: string; embedded: boolean }
export interface ImageInfo { w: number; h: number; colorSpace: string; bpc: number }
export interface PageReport {
  index: number; media: Box; crop: Box | null; trim: Box | null; bleed: Box | null; art: Box | null; rotate: number;
  fonts: FontInfo[]; images: ImageInfo[]; colorSpaces: string[]; blank: boolean; contentBytes: number; marksLikely: boolean;
}
export interface PdfReport { name: string; pageCount: number; pages: PageReport[]; source: Source; fonts: FontInfo[]; colorSpaces: string[]; warnings: string[]; title?: string; producer?: string; creator?: string }

function boxOf(arr: any): Box | null {
  try {
    if (!arr || typeof arr.asRectangle !== 'function') return null;
    const r = arr.asRectangle();
    return { x: mm(r.x), y: mm(r.y), w: mm(r.width), h: mm(r.height) };
  } catch { return null; }
}

export async function analyzePdf(bytes: Uint8Array, name = 'document.pdf'): Promise<PdfReport> {
  const L: any = await import('pdf-lib');
  const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFStream, decodePDFRawStream } = L;
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const N = (s: string) => PDFName.of(s);
  const look = (o: any) => (o ? ctx.lookup(o) : undefined);
  const nameStr = (o: any): string => { const v = look(o); if (!v) return ''; if (v instanceof PDFName) return v.decodeText ? v.decodeText() : String(v).replace(/^\//, ''); if (v instanceof PDFArray) return nameStr(v.get(0)); return String(v); };

  const pages: PageReport[] = [];
  const warnings: string[] = [];
  const allFonts = new Map<string, FontInfo>();
  const allCs = new Set<string>();

  const scanResources = (res: any, fonts: Map<string, FontInfo>, images: ImageInfo[], cs: Set<string>, depth: number) => {
    if (!(res instanceof PDFDict) || depth > 4) return;
    const fd = look(res.get(N('Font')));
    if (fd instanceof PDFDict) for (const [, ref] of fd.entries()) {
      const f = look(ref); if (!(f instanceof PDFDict)) continue;
      const subtype = nameStr(f.get(N('Subtype')));
      const base = nameStr(f.get(N('BaseFont'))) || '(unnamed)';
      let desc = look(f.get(N('FontDescriptor')));
      if (!desc && subtype === 'Type0') { const df = look(f.get(N('DescendantFonts'))); const d0 = df instanceof PDFArray ? look(df.get(0)) : null; if (d0 instanceof PDFDict) desc = look(d0.get(N('FontDescriptor'))); }
      const embedded = subtype === 'Type3' || (desc instanceof PDFDict && !!(desc.get(N('FontFile')) || desc.get(N('FontFile2')) || desc.get(N('FontFile3'))));
      fonts.set(base, { name: base.replace(/^[A-Z]{6}\+/, ''), subtype, embedded });
    }
    const csd = look(res.get(N('ColorSpace')));
    if (csd instanceof PDFDict) for (const [, v] of csd.entries()) { const c = look(v); const n = c instanceof PDFArray ? nameStr(c.get(0)) + (nameStr(c.get(0)) === 'Separation' ? ` (${nameStr(c.get(1))})` : '') : nameStr(c); if (n) cs.add(n); }
    const xo = look(res.get(N('XObject')));
    if (xo instanceof PDFDict) for (const [, ref] of xo.entries()) {
      const x = look(ref); const dict = x instanceof PDFRawStream || x instanceof PDFStream ? x.dict : x;
      if (!(dict instanceof PDFDict)) continue;
      const st = nameStr(dict.get(N('Subtype')));
      if (st === 'Image') {
        const c = look(dict.get(N('ColorSpace')));
        const csName = c instanceof PDFArray ? nameStr(c.get(0)) : nameStr(c) || (dict.get(N('ImageMask')) ? 'Mask' : '');
        if (csName) cs.add(csName);
        images.push({ w: Number(look(dict.get(N('Width')))?.asNumber?.() ?? 0), h: Number(look(dict.get(N('Height')))?.asNumber?.() ?? 0), colorSpace: csName || '—', bpc: Number(look(dict.get(N('BitsPerComponent')))?.asNumber?.() ?? 0) });
      } else if (st === 'Form') scanResources(look(dict.get(N('Resources'))), fonts, images, cs, depth + 1);
    }
  };

  doc.getPages().forEach((p: any, i: number) => {
    const node = p.node;
    const media = boxOf(node.MediaBox()) || { x: 0, y: 0, w: mm(p.getWidth()), h: mm(p.getHeight()) };
    const crop = boxOf(look(node.get(N('CropBox'))));
    const trim = boxOf(look(node.get(N('TrimBox'))));
    const bleed = boxOf(look(node.get(N('BleedBox'))));
    const art = boxOf(look(node.get(N('ArtBox'))));
    const rotate = ((p.getRotation?.().angle ?? 0) % 360 + 360) % 360;
    const fonts = new Map<string, FontInfo>(); const images: ImageInfo[] = []; const cs = new Set<string>();
    try { scanResources(node.Resources?.() ?? look(node.get(N('Resources'))), fonts, images, cs, 0); } catch { /* unusual resources */ }
    // Content size (decoded) — a page with almost no drawing operators is blank.
    let bytesLen = 0, text = '';
    try {
      const c = look(node.get(N('Contents')));
      const streams = c instanceof PDFArray ? c.asArray().map(look) : [c];
      for (const s of streams) {
        if (!s) continue;
        let raw: Uint8Array;
        try { raw = s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents(); } catch { raw = s.contents || new Uint8Array(); }
        bytesLen += raw.length;
        if (text.length < 200000) text += new TextDecoder('latin1').decode(raw.subarray(0, 200000));
      }
    } catch { /* no contents */ }
    const drawing = /\b(re|l|c|v|y|Tj|TJ|Do|sh|BI)\b/.test(text);
    const blank = !drawing && images.length === 0;
    const outside = trim ? Math.min(trim.x - media.x, trim.y - media.y, media.x + media.w - trim.x - trim.w, media.y + media.h - trim.y - trim.h) : 0;
    pages.push({ index: i, media, crop, trim, bleed, art, rotate, fonts: [...fonts.values()], images, colorSpaces: [...cs], blank, contentBytes: bytesLen, marksLikely: !!trim && outside >= 8 });
    fonts.forEach((f, k) => allFonts.set(k, f)); cs.forEach((c) => allCs.add(c));
  });

  // Boxes the imposition uses: trim (TrimBox → CropBox → MediaBox) and the bleed it can draw (BleedBox → CropBox → MediaBox).
  const source: Source = { name, pages: pages.map((r): SourcePage => {
    const visible = r.crop || r.media;
    const trim = r.trim || r.crop || r.media;
    let bleedBox = r.bleed || visible;
    if (!r.bleed && r.trim) bleedBox = visible; // area outside the trim may hold marks; still drawable
    return { media: r.media, trim, bleedBox, rotate: r.rotate };
  }) };

  const sizes = new Set(source.pages.map((p) => `${Math.round(p.trim.w)}×${Math.round(p.trim.h)}`));
  if (sizes.size > 1) warnings.push(`Mixed page sizes: ${[...sizes].join(', ')} mm.`);
  const noBleed = pages.filter((p) => !p.trim && !p.bleed).length;
  if (noBleed === pages.length) warnings.push('No trim or bleed boxes: the whole page is treated as the trim with no bleed. Use “Define bleeds” or “Info / modify” if the file has bleed.');
  const notEmb = [...allFonts.values()].filter((f) => !f.embedded);
  if (notEmb.length) warnings.push(`Fonts not embedded (the printer’s RIP will substitute them): ${notEmb.map((f) => f.name).join(', ')}.`);
  if (allCs.has('DeviceRGB') || allCs.has('ICCBased')) warnings.push('Contains RGB / ICC colour — check whether your printer needs CMYK.');
  const blanks = pages.filter((p) => p.blank).map((p) => p.index + 1);
  if (blanks.length) warnings.push(`Blank page${blanks.length > 1 ? 's' : ''}: ${blanks.join(', ')}.`);
  const rotated = pages.filter((p) => p.rotate).map((p) => p.index + 1);
  if (rotated.length) warnings.push(`Rotated page${rotated.length > 1 ? 's' : ''} (shown turned in viewers): ${rotated.join(', ')} — handled automatically.`);
  if (pages.some((p) => p.marksLikely)) warnings.push('Some pages have a large area outside the trim — they probably already carry crop marks. Bleed is limited to the area you set, so old marks are not printed.');
  let title: string | undefined, producer: string | undefined, creator: string | undefined;
  try { title = doc.getTitle(); producer = doc.getProducer(); creator = doc.getCreator(); } catch { /* none */ }
  return { name, pageCount: pages.length, pages, source, fonts: [...allFonts.values()], colorSpaces: [...allCs], warnings, title, producer, creator };
}

// ------------------------------------------------------------------ writing

export type Variant = 'print' | 'editable' | 'front' | 'back';
const hex = (h: string) => { const v = h.replace('#', ''); const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

/** Sheets for a variant: front / back use the sheets' sides, or odd / even sheets when there are none. */
export function sheetsFor(doc: Doc, v: Variant) {
  if (v !== 'front' && v !== 'back') return doc.sheets;
  const sided = doc.sheets.some((s) => s.side);
  return doc.sheets.filter((s, i) => (sided ? s.side === v : v === 'front' ? i % 2 === 0 : i % 2 === 1));
}

export async function buildPdf(doc: Doc, sourceBytes: Uint8Array[], o: { variant?: Variant; title?: string } = {}): Promise<{ bytes: Uint8Array; layers: boolean }> {
  const L: any = await import('pdf-lib');
  const { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFString, PDFOperator, PDFDict } = L;
  const out = await PDFDocument.create();
  out.setTitle(o.title || 'Imposed document'); out.setCreator('Magical Touch Design — Print Layout'); out.setProducer('magicaltouchdesign.com');
  const srcDocs = await Promise.all(sourceBytes.map((b) => PDFDocument.load(b, { ignoreEncryption: true })));
  const font = await out.embedFont(StandardFonts.Helvetica);
  const cache = new Map<string, any>();
  const variant = o.variant || 'print';
  const editable = variant === 'editable';

  // Layers (optional content) for the editable variant: artwork, stick-ons, masking tape, marks.
  const LAYERS = ['Artwork', 'Stick-ons', 'Masking tape', 'Printer marks'];
  let ocRefs: any[] = [];
  let layers = false;
  if (editable) {
    try {
      ocRefs = LAYERS.map((n) => out.context.register(out.context.obj({ Type: 'OCG', Name: PDFString.of(n) })));
      out.catalog.set(PDFName.of('OCProperties'), out.context.obj({ OCGs: ocRefs, D: { Order: ocRefs, ON: ocRefs, Name: PDFString.of('Magical Touch layers') } }));
      layers = true;
    } catch { layers = false; }
  }
  const layerOf = (it: Item) => (it.tag === 'mark' ? 3 : it.tag === 'tape' ? 2 : it.tag === 'stuck' ? 1 : 0);

  for (const s of sheetsFor(doc, variant)) {
    const page = out.addPage([s.w * PT, s.h * PT]);
    try { page.setTrimBox(s.trim.x * PT, s.trim.y * PT, s.trim.w * PT, s.trim.h * PT); } catch { /* old pdf-lib */ }
    if (layers) {
      try {
        const res = page.node.Resources();
        const props = out.context.obj({}) as any;
        ocRefs.forEach((r, i) => props.set(PDFName.of(`oc${i}`), r));
        res.set(PDFName.of('Properties'), props);
      } catch { layers = false; }
    }
    const groups = [0, 1, 2, 3].map((l) => s.items.filter((it) => layerOf(it) === l));
    for (let l = 0; l < 4; l++) {
      if (!groups[l].length) continue;
      if (layers) page.pushOperators(PDFOperator.of('BDC', [PDFName.of('OC'), PDFName.of(`oc${l}`)]));
      for (const it of groups[l]) {
        const d = decompose(it.m);
        if (it.k === 'page') {
          const c = it.clip;
          if (c.w <= 0 || c.h <= 0) continue;
          const key = `${it.src}:${it.page}:${c.x}:${c.y}:${c.w}:${c.h}`;
          let emb = cache.get(key);
          if (!emb) {
            const sp = srcDocs[it.src]?.getPage(it.page);
            if (!sp) continue;
            emb = await out.embedPage(sp, { left: c.x * PT, bottom: c.y * PT, right: (c.x + c.w) * PT, top: (c.y + c.h) * PT });
            cache.set(key, emb);
          }
          const q = clipLocal(it);
          const at = apply(it.m, q.x, q.y);
          page.drawPage(emb, { x: at.x * PT, y: at.y * PT, xScale: d.sx, yScale: d.sy, rotate: degrees(d.deg) });
        } else if (it.k === 'text') {
          const [r, g, b] = hex(it.color);
          const w = font.widthOfTextAtSize(it.text, it.size) / PT;
          const ox = it.align === 'r' ? -w : it.align === 'l' ? 0 : -w / 2;
          const at = apply(it.m, ox, 0);
          page.drawText(it.text, { x: at.x * PT, y: at.y * PT, size: it.size, font, color: rgb(r, g, b), rotate: degrees(d.deg) });
        } else if (it.k === 'rect') {
          const [r, g, b] = hex(it.color);
          page.drawRectangle({ x: d.x * PT, y: d.y * PT, width: it.w * d.sx * PT, height: it.h * d.sy * PT, color: rgb(r, g, b), rotate: degrees(d.deg), borderWidth: 0 });
        } else if (it.k === 'line') {
          const [r, g, b] = hex(it.color);
          const p1 = apply(it.m, it.x1, it.y1), p2 = apply(it.m, it.x2, it.y2);
          page.drawLine({ start: { x: p1.x * PT, y: p1.y * PT }, end: { x: p2.x * PT, y: p2.y * PT }, thickness: it.width, color: rgb(r, g, b) });
        }
      }
      if (layers) page.pushOperators(PDFOperator.of('EMC'));
    }
  }
  void PDFDict;
  return { bytes: await out.save(), layers };
}

/** A sample document: numbered pages with bleed, trim and safe area drawn — for testing a layout. */
export async function samplePdf(o: { pages: number; w: number; h: number; bleed: number }): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle('Sample document'); doc.setCreator('Magical Touch Design — Print Layout');
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const b = o.bleed, W = o.w + 2 * b, H = o.h + 2 * b;
  const hues = [[0.23, 0.51, 0.77], [0.93, 0.44, 0.56], [0.36, 0.8, 0.72], [0.79, 0.66, 0.42], [0.55, 0.78, 0.29], [0.65, 0.61, 0.83]];
  for (let i = 0; i < o.pages; i++) {
    const p = doc.addPage([W * PT, H * PT]);
    const [r, g, bl] = hues[i % hues.length];
    p.drawRectangle({ x: 0, y: 0, width: W * PT, height: H * PT, color: rgb(r, g, bl) });
    p.drawRectangle({ x: (b + 5) * PT, y: (b + 5) * PT, width: (o.w - 10) * PT, height: (o.h - 10) * PT, borderColor: rgb(1, 1, 1), borderWidth: 0.6, opacity: 0 });
    const t = String(i + 1);
    const size = Math.min(o.w, o.h) * PT * 0.45;
    p.drawText(t, { x: (W * PT - font.widthOfTextAtSize(t, size)) / 2, y: (H * PT - size * 0.7) / 2, size, font, color: rgb(1, 1, 1) });
    p.drawText(i % 2 === 0 ? 'right-hand page' : 'left-hand page', { x: (b + 6) * PT, y: (b + 6) * PT, size: 8, font, color: rgb(1, 1, 1) });
    p.setTrimBox(b * PT, b * PT, o.w * PT, o.h * PT);
    p.setBleedBox(0, 0, W * PT, H * PT);
  }
  return doc.save();
}
