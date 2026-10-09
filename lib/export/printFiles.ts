// Print-ready files written directly in the browser, so they are true
// CMYK (four ink channels), not RGB pictures with a CMYK label:
//  • TIFF  – CMYK (or RGB) with the press profile embedded and the DPI set;
//            opens as CMYK in Photoshop, Affinity, InDesign and RIPs.
//  • PDF   – press PDF: each page is a DeviceCMYK image at full print
//            resolution with a FOGRA39 output intent (PDF/X-style), trim
//            and bleed boxes, and optional crop marks.
// Compression uses the browser's built-in zlib (CompressionStream).

export async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const CS = (globalThis as any).CompressionStream;
  if (!CS) throw new Error('no-compression');
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CS('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ------------------------------------------------------------------ TIFF

export interface TiffInput {
  width: number;
  height: number;
  /** Interleaved samples: CMYK (4), RGB (3) or RGBA (4, mode 'rgba'). */
  data: Uint8Array;
  mode: 'cmyk' | 'rgb' | 'rgba';
  dpi: number;
  icc?: Uint8Array | null;
}

export async function writeTiff(input: TiffInput): Promise<Blob> {
  const { width, height, mode, dpi } = input;
  const spp = mode === 'rgb' ? 3 : 4;
  const rowBytes = width * spp;
  // Horizontal differencing (TIFF predictor 2) — much smaller files.
  const pred = new Uint8Array(input.data.length);
  for (let y = 0; y < height; y++) {
    const o = y * rowBytes;
    for (let i = 0; i < spp; i++) pred[o + i] = input.data[o + i];
    for (let x = spp; x < rowBytes; x++) pred[o + x] = (input.data[o + x] - input.data[o + x - spp]) & 255;
  }
  let strip: Uint8Array;
  let compression = 8; // Adobe Deflate
  let predictor = 2;
  try {
    strip = await deflate(pred);
  } catch {
    strip = input.data;
    compression = 1;
    predictor = 1;
  }

  const software = new TextEncoder().encode('Magical Touch Design\0');
  type Tag = [number, number, number, number[] | Uint8Array];
  // [tag, type, count, values]; types: 2 ASCII, 3 SHORT, 4 LONG, 5 RATIONAL, 7 UNDEFINED
  const tags: Tag[] = [
    [256, 4, 1, [width]],
    [257, 4, 1, [height]],
    [258, 3, spp, Array(spp).fill(8)],
    [259, 3, 1, [compression]],
    [262, 3, 1, [mode === 'cmyk' ? 5 : 2]],
    [273, 4, 1, [0]], // strip offset, patched below
    [277, 3, 1, [spp]],
    [278, 4, 1, [height]],
    [279, 4, 1, [strip.length]],
    [282, 5, 1, [Math.round(dpi * 100), 100]],
    [283, 5, 1, [Math.round(dpi * 100), 100]],
    [284, 3, 1, [1]],
    [296, 3, 1, [2]],
    [305, 2, software.length, software],
    [317, 3, 1, [predictor]],
  ];
  if (mode === 'cmyk') tags.push([332, 3, 1, [1]]);
  if (mode === 'rgba') tags.push([338, 3, 1, [2]]);
  if (input.icc && input.icc.length) tags.push([34675, 7, input.icc.length, input.icc]);
  tags.sort((a, b) => a[0] - b[0]);

  const typeSize: Record<number, number> = { 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 };
  const ifdOffset = 8;
  const ifdSize = 2 + tags.length * 12 + 4;
  let extra = ifdOffset + ifdSize;
  const extraBlocks: { offset: number; bytes: Uint8Array }[] = [];
  const entries: { tag: number; type: number; count: number; inline?: Uint8Array; offset?: number }[] = [];
  for (const [tag, type, count, values] of tags) {
    const size = typeSize[type] * count;
    const bytes = new Uint8Array(size);
    const dv = new DataView(bytes.buffer);
    if (values instanceof Uint8Array) bytes.set(values);
    else if (type === 3) values.forEach((v, i) => dv.setUint16(i * 2, v, true));
    else if (type === 4) values.forEach((v, i) => dv.setUint32(i * 4, v, true));
    else if (type === 5) { dv.setUint32(0, values[0], true); dv.setUint32(4, values[1], true); }
    if (size <= 4) {
      const inline = new Uint8Array(4);
      inline.set(bytes);
      entries.push({ tag, type, count, inline });
    } else {
      if (extra % 2) extra++;
      extraBlocks.push({ offset: extra, bytes });
      entries.push({ tag, type, count, offset: extra });
      extra += size;
    }
  }
  if (extra % 2) extra++;
  const stripOffset = extra;
  const header = new Uint8Array(stripOffset);
  const dv = new DataView(header.buffer);
  header[0] = 0x49; header[1] = 0x49; dv.setUint16(2, 42, true); dv.setUint32(4, ifdOffset, true);
  dv.setUint16(ifdOffset, entries.length, true);
  entries.forEach((e, i) => {
    const p = ifdOffset + 2 + i * 12;
    dv.setUint16(p, e.tag, true);
    dv.setUint16(p + 2, e.type, true);
    dv.setUint32(p + 4, e.count, true);
    if (e.tag === 273) dv.setUint32(p + 8, stripOffset, true);
    else if (e.inline) header.set(e.inline, p + 8);
    else dv.setUint32(p + 8, e.offset!, true);
  });
  dv.setUint32(ifdOffset + 2 + entries.length * 12, 0, true);
  for (const b of extraBlocks) header.set(b.bytes, b.offset);
  return new Blob([header as BlobPart, strip as BlobPart], { type: 'image/tiff' });
}

// ------------------------------------------------------------------- PDF

export interface PressPage {
  /** Samples, interleaved, covering trim + bleed: CMYK (4) or RGB (3). */
  data: Uint8Array;
  space?: 'cmyk' | 'rgb';
  pxWidth: number;
  pxHeight: number;
  /** Finished (trim) size in points. */
  trimW: number;
  trimH: number;
  /** Bleed on each side, in points (0 for none). */
  bleed: number;
}

export interface PressPdfOptions {
  title?: string;
  cropMarks?: boolean;
  icc?: Uint8Array | null;
}

const enc = new TextEncoder();
const pdfStr = (s: string) => '(' + s.replace(/[\\()]/g, (m) => '\\' + m).replace(/[^\x20-\x7e]/g, '') + ')';
const n2 = (v: number) => (Math.round(v * 1000) / 1000).toString();

export async function writePressPdf(pages: PressPage[], opts: PressPdfOptions = {}): Promise<Blob> {
  const parts: (Uint8Array | string)[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (p: Uint8Array | string) => {
    const b = typeof p === 'string' ? enc.encode(p) : p;
    parts.push(b);
    length += b.length;
  };
  let nextId = 1;
  const alloc = () => nextId++;
  const writeObj = (id: number, dict: string, stream?: Uint8Array) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${dict}\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };

  push('%PDF-1.6\n%\xE2\xE3\xCF\xD3\n');
  const catalogId = alloc();
  const pagesId = alloc();
  const infoId = alloc();
  let iccId = 0;
  if (opts.icc && opts.icc.length) iccId = alloc();
  const marks = !!opts.cropMarks;
  const slug = marks ? 24 : 0; // room for crop marks, in points

  const pageIds: number[] = [];
  const pageObjs: { id: number; imgId: number; contentId: number; page: PressPage }[] = [];
  for (const page of pages) pageObjs.push({ id: alloc(), imgId: alloc(), contentId: alloc(), page });

  writeObj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R${iccId ? ` /OutputIntents [<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (FOGRA39) /OutputCondition (Offset printing, coated paper) /RegistryName (http://www.color.org) /Info (Coated FOGRA39 \\(ISO 12647-2:2004\\)) /DestOutputProfile ${iccId} 0 R >>]` : ''} >>`);
  const now = new Date();
  const d = `D:${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}00Z`;
  writeObj(infoId, `<< /Title ${pdfStr(opts.title || 'Design')} /Producer (Magical Touch Design) /Creator (Magical Touch Design) /CreationDate (${d}) /Trapped /False >>`);
  if (iccId) {
    const z = await deflate(opts.icc!).catch(() => null);
    writeObj(iccId, `<< /N 4 /Length ${(z || opts.icc!).length}${z ? ' /Filter /FlateDecode' : ''} >>`, z || opts.icc!);
  }

  for (const { id, imgId, contentId, page } of pageObjs) {
    pageIds.push(id);
    const outerW = page.trimW + 2 * page.bleed + 2 * slug;
    const outerH = page.trimH + 2 * page.bleed + 2 * slug;
    const bx = slug, by = slug;
    const bw = page.trimW + 2 * page.bleed, bh = page.trimH + 2 * page.bleed;
    const tx = slug + page.bleed, ty = slug + page.bleed;

    let z: Uint8Array | null = null;
    try {
      z = await deflate(page.data);
    } catch {
      z = null;
    }
    const data = z || page.data;
    const cs = page.space === 'rgb' ? '/DeviceRGB' : '/DeviceCMYK';
    writeObj(imgId, `<< /Type /XObject /Subtype /Image /Width ${page.pxWidth} /Height ${page.pxHeight} /ColorSpace ${cs} /BitsPerComponent 8 /Length ${data.length}${z ? ' /Filter /FlateDecode' : ''} >>`, data);

    let content = `q ${n2(bw)} 0 0 ${n2(bh)} ${n2(bx)} ${n2(by)} cm /Im0 Do Q\n`;
    if (marks) {
      // Crop marks in registration colour (all four inks), outside the bleed.
      const L = 14, gap = page.bleed + 3;
      const x0 = tx, x1 = tx + page.trimW, y0 = ty, y1 = ty + page.trimH;
      content += 'q 0.25 w 1 1 1 1 K\n';
      for (const [x, y, sx, sy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]] as const) {
        content += `${n2(x + sx * gap)} ${n2(y)} m ${n2(x + sx * (gap + L))} ${n2(y)} l S\n`;
        content += `${n2(x)} ${n2(y + sy * gap)} m ${n2(x)} ${n2(y + sy * (gap + L))} l S\n`;
      }
      content += 'Q\n';
    }
    const cz = enc.encode(content);
    writeObj(contentId, `<< /Length ${cz.length} >>`, cz);
    const boxes = `/MediaBox [0 0 ${n2(outerW)} ${n2(outerH)}] /BleedBox [${n2(bx)} ${n2(by)} ${n2(bx + bw)} ${n2(by + bh)}] /TrimBox [${n2(tx)} ${n2(ty)} ${n2(tx + page.trimW)} ${n2(ty + page.trimH)}]`;
    writeObj(id, `<< /Type /Page /Parent ${pagesId} 0 R ${boxes} /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  }
  writeObj(pagesId, `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);

  const xref = length;
  let x = `xref\n0 ${nextId}\n0000000000 65535 f \n`;
  for (let i = 1; i < nextId; i++) x += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
  push(x);
  push(`trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

export const MM_PER_PT = 25.4 / 72;
