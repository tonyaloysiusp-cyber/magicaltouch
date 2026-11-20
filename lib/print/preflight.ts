// PDF Preflight Inspector — reads a PDF and checks it for print the way a
// prepress department would. Deterministic: it parses the page boxes,
// resources and content streams; it never changes the file.
//
// Checks: page size and boxes (TrimBox / BleedBox / bleed amount), fonts
// (embedded or not), placed image resolution (pixels ÷ placed size), colour
// spaces (RGB / CMYK / grey / spot / ICC), output intent, overprint,
// transparency, smallest text and thinnest strokes.

import type { PDFDocument as PDFDoc } from 'pdf-lib';

export type Level = 'ok' | 'warn' | 'error';
export type Target = 'press-cmyk' | 'press-modern' | 'digital';
export const TARGETS: { id: Target; name: string; hint: string }[] = [
  { id: 'press-cmyk', name: 'Offset / digital press (CMYK, like PDF/X-1a)', hint: 'CMYK or spot only, fonts embedded, no live transparency, 300 ppi images, 3 mm bleed.' },
  { id: 'press-modern', name: 'Press, modern workflow (like PDF/X-4)', hint: 'Fonts embedded, output intent, transparency and ICC colour allowed, 300 ppi, 3 mm bleed.' },
  { id: 'digital', name: 'Screen / digital PDF', hint: 'Fonts embedded and images 150 ppi; colour and bleed not checked.' },
];
export interface Finding { level: Level; check: string; message: string; fix?: string; pages?: number[] }
export interface PageInfo {
  n: number; mediaMm: [number, number]; trimMm: [number, number] | null; bleedMm: number | null;
  images: { name: string; px: [number, number]; ppi: number; colour: string }[];
  minTextPt: number | null; minStrokePt: number | null;
}
export interface PreflightReport {
  target: Target; pages: PageInfo[]; findings: Finding[]; status: Level;
  fonts: { name: string; embedded: boolean; type: string }[];
  colourSpaces: string[]; spots: string[]; outputIntent: string | null;
  overprint: boolean; transparency: boolean; producer: string | null; version: string | null;
}

const MM = 25.4 / 72;
const r1 = (v: number) => Math.round(v * 10) / 10;

type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]];
const scaleOf = (m: M) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

/** Tokenises a content stream: numbers, names, operators; strings, arrays' strings and inline images are skipped. */
function* tokens(src: string): Generator<string> {
  const n = src.length; let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '%') { while (i < n && src[i] !== '\n' && src[i] !== '\r') i++; continue; }
    if (c <= ' ') { i++; continue; }
    if (c === '(') { let d = 1; i++; while (i < n && d) { if (src[i] === '\\') i += 2; else { if (src[i] === '(') d++; else if (src[i] === ')') d--; i++; } } yield '()'; continue; }
    if (c === '<' && src[i + 1] === '<') { i += 2; yield '<<'; continue; }
    if (c === '>' && src[i + 1] === '>') { i += 2; yield '>>'; continue; }
    if (c === '<') { while (i < n && src[i] !== '>') i++; i++; yield '<>'; continue; }
    if (c === '[' || c === ']' || c === '{' || c === '}') { i++; yield c; continue; }
    let j = i + 1;
    while (j < n && src[j] > ' ' && !'()<>[]{}/%'.includes(src[j])) j++;
    const t = src.slice(i, j); i = j;
    if (t === 'BI') { const e = src.indexOf('EI', i); i = e < 0 ? n : e + 2; continue; }
    yield t;
  }
}

export async function preflightPdf(bytes: Uint8Array, target: Target = 'press-cmyk'): Promise<PreflightReport> {
  const lib: any = await import('pdf-lib');
  const { PDFDocument, PDFName, PDFRef, PDFRawStream, PDFArray, PDFDict, decodePDFRawStream } = lib;
  const doc: PDFDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const look = (v: any) => (v instanceof PDFRef ? ctx.lookup(v) : v);
  const nm = (v: any) => (v ? String(look(v)?.toString?.() ?? '').replace(/^\//, '') : '');
  const fonts = new Map<string, { name: string; embedded: boolean; type: string }>();
  const cs = new Set<string>(), spots = new Set<string>();
  let overprint = false, transparency = false;
  const findings: Finding[] = [];
  const pages: PageInfo[] = [];

  const colourOf = (v: any): string => {
    v = look(v);
    if (!v) return 'unknown';
    if (v instanceof PDFArray) {
      const kind = nm(v.get(0));
      if (kind === 'ICCBased') { const s = look(v.get(1)); const N = s?.dict?.lookup?.(PDFName.of('N'))?.asNumber?.(); return N === 4 ? 'ICC CMYK' : N === 1 ? 'ICC Gray' : 'ICC RGB'; }
      if (kind === 'Separation') { const name = nm(v.get(1)); if (name !== 'All' && name !== 'None') spots.add(name); return `Spot: ${name}`; }
      if (kind === 'DeviceN') { const names = look(v.get(1)); names?.asArray?.().forEach((x: any) => { const s = nm(x); if (!['Cyan', 'Magenta', 'Yellow', 'Black', 'None', 'All'].includes(s)) spots.add(s); }); return 'DeviceN'; }
      if (kind === 'Indexed') return `Indexed (${colourOf(v.get(1))})`;
      if (kind === 'Pattern') return 'Pattern';
      return kind;
    }
    const s = nm(v);
    return s === 'DeviceRGB' ? 'RGB' : s === 'DeviceCMYK' ? 'CMYK' : s === 'DeviceGray' ? 'Gray' : s;
  };

  const doPage = (page: any, n: number) => {
    const node = page.node;
    const box = (k: string) => { const a = look(node.getInheritableAttribute ? node.getInheritableAttribute(PDFName.of(k)) : node.get(PDFName.of(k))); return a?.asArray ? a.asArray().map((x: any) => look(x).asNumber()) as number[] : null; };
    const media = box('MediaBox') || [0, 0, 595, 842], trim = box('TrimBox'), bleedB = box('BleedBox');
    const info: PageInfo = { n, mediaMm: [r1((media[2] - media[0]) * MM), r1((media[3] - media[1]) * MM)], trimMm: trim ? [r1((trim[2] - trim[0]) * MM), r1((trim[3] - trim[1]) * MM)] : null, bleedMm: null, images: [], minTextPt: null, minStrokePt: null };
    if (trim) {
      const outer = bleedB || media;
      info.bleedMm = r1(Math.min(trim[0] - outer[0], trim[1] - outer[1], outer[2] - trim[2], outer[3] - trim[3]) * MM);
    }
    const seenXo = new Set<string>();
    const walk = (contents: string[], res: any, base: M, depth: number) => {
      res = look(res);
      const xo = look(res?.get?.(PDFName.of('XObject')));
      const gs = look(res?.get?.(PDFName.of('ExtGState')));
      const csd = look(res?.get?.(PDFName.of('ColorSpace')));
      const fd = look(res?.get?.(PDFName.of('Font')));
      if (gs instanceof PDFDict) for (const [, v] of gs.entries()) {
        const g = look(v); if (!g?.get) continue;
        if (String(look(g.get(PDFName.of('OP')))) === 'true' || String(look(g.get(PDFName.of('op')))) === 'true') overprint = true;
        const ca = look(g.get(PDFName.of('ca')))?.asNumber?.() ?? 1, CA = look(g.get(PDFName.of('CA')))?.asNumber?.() ?? 1;
        const bm = nm(g.get(PDFName.of('BM'))), sm = nm(g.get(PDFName.of('SMask')));
        if (ca < 1 || CA < 1 || (bm && bm !== 'Normal' && bm !== 'Compatible') || (sm && sm !== 'None')) transparency = true;
      }
      if (csd instanceof PDFDict) for (const [, v] of csd.entries()) cs.add(colourOf(v));
      if (fd instanceof PDFDict) for (const [, v] of fd.entries()) {
        const f = look(v); if (!f?.get) continue;
        const sub = nm(f.get(PDFName.of('Subtype')));
        let base = nm(f.get(PDFName.of('BaseFont'))) || '(unnamed)';
        let desc = look(f.get(PDFName.of('FontDescriptor')));
        if (sub === 'Type0') { const d0 = look(look(f.get(PDFName.of('DescendantFonts')))?.get?.(0)); desc = look(d0?.get?.(PDFName.of('FontDescriptor'))); }
        const embedded = sub === 'Type3' || !!(desc && (desc.get(PDFName.of('FontFile')) || desc.get(PDFName.of('FontFile2')) || desc.get(PDFName.of('FontFile3'))));
        base = base.replace(/^[A-Z]{6}\+/, '');
        const k = `${base}|${embedded}`;
        if (!fonts.has(k)) fonts.set(k, { name: base, embedded, type: sub });
      }
      for (const src of contents) {
        const stack: M[] = []; let ctm: M = base; const nums: number[] = []; let tfs = 0; let tm: M = [1, 0, 0, 1, 0, 0]; let lw = 1, lwScale = scaleOf(base);
        let lastName = '';
        for (const t of tokens(src)) {
          if (t[0] === '/') { lastName = t.slice(1); nums.length = 0; continue; }
          const v = Number(t);
          if (t !== '' && !Number.isNaN(v) && /^[-+.\d]/.test(t)) { nums.push(v); continue; }
          switch (t) {
            case 'q': stack.push(ctm); break;
            case 'Q': ctm = stack.pop() || base; break;
            case 'cm': if (nums.length >= 6) ctm = mul(nums.slice(-6) as M, ctm); break;
            case 'w': if (nums.length) { lw = nums[nums.length - 1]; lwScale = scaleOf(ctm); } break;
            case 'S': case 's': case 'B': case 'b': case 'B*': case 'b*': {
              const pt = lw === 0 ? 0 : lw * lwScale;
              if (info.minStrokePt === null || pt < info.minStrokePt) info.minStrokePt = r1(pt * 100) / 100;
              break;
            }
            case 'rg': case 'RG': cs.add('RGB'); break;
            case 'k': case 'K': cs.add('CMYK'); break;
            case 'g': case 'G': cs.add('Gray'); break;
            case 'Tf': if (nums.length) tfs = nums[nums.length - 1]; break;
            case 'Tm': if (nums.length >= 6) tm = nums.slice(-6) as M; break;
            case 'BT': tm = [1, 0, 0, 1, 0, 0]; break;
            case 'Tj': case 'TJ': case "'": case '"': {
              const pt = Math.abs(tfs) * scaleOf(tm) * scaleOf(ctm);
              if (pt > 0 && (info.minTextPt === null || pt < info.minTextPt)) info.minTextPt = r1(pt);
              break;
            }
            case 'Do': {
              const x = look(xo?.get?.(PDFName.of(lastName)));
              if (!x?.dict) break;
              const sub = nm(x.dict.get(PDFName.of('Subtype')));
              if (sub === 'Image') {
                const w = look(x.dict.get(PDFName.of('Width')))?.asNumber?.() || 0, h = look(x.dict.get(PDFName.of('Height')))?.asNumber?.() || 0;
                const pw = Math.hypot(ctm[0], ctm[1]), ph = Math.hypot(ctm[2], ctm[3]);
                const ppi = Math.min(pw > 0 ? w / (pw / 72) : 9999, ph > 0 ? h / (ph / 72) : 9999);
                const isMask = String(look(x.dict.get(PDFName.of('ImageMask')))) === 'true';
                const colour = isMask ? 'Mask' : colourOf(x.dict.get(PDFName.of('ColorSpace')));
                if (!isMask) cs.add(colour.startsWith('Indexed') ? colour.replace(/^Indexed \((.*)\)$/, '$1') : colour);
                if (x.dict.get(PDFName.of('SMask'))) transparency = true;
                info.images.push({ name: lastName, px: [w, h], ppi: Math.round(ppi), colour });
              } else if (sub === 'Form' && depth < 12) {
                const key = `${lastName}@${ctm.join(',')}`;
                if (seenXo.has(key)) break; seenXo.add(key);
                const fm = look(x.dict.get(PDFName.of('Matrix')))?.asArray?.().map((y: any) => look(y).asNumber()) as M | undefined;
                const grp = look(x.dict.get(PDFName.of('Group')));
                if (grp && nm(grp.get?.(PDFName.of('S'))) === 'Transparency') { /* a group alone is not transparency */ }
                let text = '';
                try { const d = x instanceof PDFRawStream ? decodePDFRawStream(x).decode() : x.getContents(); for (let i = 0; i < d.length; i += 0x8000) text += String.fromCharCode.apply(null, Array.from(d.subarray(i, i + 0x8000))); } catch { /* unreadable form */ }
                walk([text], x.dict.get(PDFName.of('Resources')) || res, mul(fm || [1, 0, 0, 1, 0, 0], ctm), depth + 1);
              }
              break;
            }
          }
          nums.length = 0;
        }
      }
    };
    const contents: string[] = [];
    const c = look(node.get(PDFName.of('Contents')));
    const streams = c instanceof PDFArray ? c.asArray().map(look) : c ? [c] : [];
    for (const s of streams) {
      try { const d = s instanceof PDFRawStream ? decodePDFRawStream(s).decode() : s.getContents(); let t = ''; for (let i = 0; i < d.length; i += 0x8000) t += String.fromCharCode.apply(null, Array.from(d.subarray(i, i + 0x8000))); contents.push(t); } catch { findings.push({ level: 'warn', check: 'Content', message: `Page ${n}: a drawing stream could not be read.`, pages: [n] }); }
    }
    walk(contents.length ? [contents.join('\n')] : [], node.Resources ? node.Resources() : node.get(PDFName.of('Resources')), [1, 0, 0, 1, 0, 0], 0);
    pages.push(info);
  };
  doc.getPages().forEach((p: any, i: number) => doPage(p, i + 1));

  // Output intent
  let outputIntent: string | null = null;
  const oi = look(doc.catalog.get(PDFName.of('OutputIntents')));
  if (oi?.asArray) { const first = look(oi.get(0)); outputIntent = String(look(first?.get?.(PDFName.of('OutputConditionIdentifier')))?.decodeText?.() ?? look(first?.get?.(PDFName.of('OutputConditionIdentifier')))?.toString?.() ?? 'present').replace(/^\(|\)$/g, ''); }

  const press = target !== 'digital';
  const minPpi = press ? 300 : 150, warnPpi = press ? 225 : 100;
  // ── Pages & boxes ──
  const sizes = new Set(pages.map((p) => `${p.trimMm ? p.trimMm.join('×') : p.mediaMm.join('×')}`));
  findings.push({ level: 'ok', check: 'Pages', message: `${pages.length} page${pages.length === 1 ? '' : 's'} · ${[...sizes].map((s) => `${s} mm`).join(', ')}${sizes.size > 1 ? ' (mixed sizes)' : ''}.` });
  if (press) {
    const noTrim = pages.filter((p) => !p.trimMm).map((p) => p.n);
    if (noTrim.length) findings.push({ level: 'warn', check: 'Page boxes', message: `No TrimBox on ${noTrim.length === pages.length ? 'any page' : `pages ${noTrim.join(', ')}`} — the printer cannot tell the finished size from the bleed.`, fix: 'Export with “Use document bleed” / crop marks so TrimBox and BleedBox are written.', pages: noTrim });
    const low = pages.filter((p) => p.trimMm && (p.bleedMm ?? 0) < 2.9);
    if (low.length) findings.push({ level: low.some((p) => (p.bleedMm ?? 0) < 1) ? 'error' : 'warn', check: 'Bleed', message: `Bleed is ${[...new Set(low.map((p) => `${p.bleedMm ?? 0} mm`))].join(' / ')} on ${low.length === pages.length ? 'every page' : `pages ${low.map((p) => p.n).join(', ')}`} — 3 mm is the usual minimum.`, fix: 'Extend backgrounds 3 mm past the trim and export with 3 mm bleed.', pages: low.map((p) => p.n) });
    else if (pages.some((p) => p.trimMm)) findings.push({ level: 'ok', check: 'Bleed', message: `Bleed ${Math.min(...pages.filter((p) => p.bleedMm !== null).map((p) => p.bleedMm!))} mm or more on every page with a TrimBox.` });
  }
  // ── Fonts ──
  const fl = [...fonts.values()];
  const notEmb = fl.filter((f) => !f.embedded);
  if (notEmb.length) findings.push({ level: 'error', check: 'Fonts', message: `Not embedded: ${notEmb.map((f) => f.name).join(', ')}. The printer’s fonts will be substituted.`, fix: 'Re-export with fonts embedded, or convert text to outlines.' });
  else findings.push({ level: 'ok', check: 'Fonts', message: fl.length ? `All ${fl.length} font${fl.length === 1 ? '' : 's'} embedded.` : 'No live text (outlined or images only).' });
  // ── Images ──
  const imgs = pages.flatMap((p) => p.images.filter((im) => im.colour !== 'Mask').map((im) => ({ ...im, page: p.n })));
  const bad = imgs.filter((im) => im.ppi < warnPpi), soft = imgs.filter((im) => im.ppi >= warnPpi && im.ppi < minPpi);
  if (bad.length) findings.push({ level: 'error', check: 'Image resolution', message: `${bad.length} image${bad.length === 1 ? ' is' : 's are'} below ${warnPpi} ppi at placed size (lowest ${Math.min(...bad.map((i) => i.ppi))} ppi).`, fix: `Use larger originals or place them smaller; aim for ${minPpi} ppi.`, pages: [...new Set(bad.map((i) => i.page))] });
  if (soft.length) findings.push({ level: 'warn', check: 'Image resolution', message: `${soft.length} image${soft.length === 1 ? ' is' : 's are'} between ${warnPpi} and ${minPpi} ppi — may look soft.`, fix: `${minPpi} ppi at the printed size is recommended.`, pages: [...new Set(soft.map((i) => i.page))] });
  if (imgs.length && !bad.length && !soft.length) findings.push({ level: 'ok', check: 'Image resolution', message: `${imgs.length} image${imgs.length === 1 ? '' : 's'}, all ${minPpi} ppi or more (lowest ${Math.min(...imgs.map((i) => i.ppi))} ppi).` });
  // ── Colour ──
  const list = [...cs].filter((c) => c && c !== 'unknown' && c !== 'Pattern');
  const rgb = list.filter((c) => c === 'RGB' || c === 'ICC RGB' || c === 'CalRGB' || c === 'Lab');
  if (target === 'press-cmyk') {
    if (rgb.length) findings.push({ level: 'error', check: 'Colour', message: `RGB colour found (${rgb.join(', ')}) — a CMYK press workflow needs CMYK, grey or spot colour only.`, fix: 'Convert to CMYK with the press profile (FOGRA39 / GRACoL) before sending, or export from a CMYK document.' });
    else findings.push({ level: 'ok', check: 'Colour', message: `Colour spaces: ${list.join(', ') || 'none'}.` });
    if (!outputIntent) findings.push({ level: 'warn', check: 'Output intent', message: 'No output intent (press profile) in the file.', fix: 'Export as PDF/X with the printer’s profile, e.g. Coated FOGRA39.' });
    if (transparency) findings.push({ level: 'warn', check: 'Transparency', message: 'Live transparency (opacity, blend modes or soft masks) — not allowed in PDF/X-1a.', fix: 'Flatten transparency on export, or use a PDF/X-4 workflow if the printer accepts it.' });
  } else if (target === 'press-modern') {
    findings.push({ level: rgb.length && !outputIntent ? 'warn' : 'ok', check: 'Colour', message: `Colour spaces: ${list.join(', ') || 'none'}${rgb.length && !outputIntent ? ' — RGB with no output intent: the printer decides the conversion.' : '.'}`, fix: rgb.length && !outputIntent ? 'Add an output intent (export as PDF/X-4) or convert to CMYK.' : undefined });
    if (!outputIntent) findings.push({ level: 'warn', check: 'Output intent', message: 'No output intent (press profile) in the file.', fix: 'Export as PDF/X-4 with the printer’s profile.' });
  } else findings.push({ level: 'ok', check: 'Colour', message: `Colour spaces: ${list.join(', ') || 'none'}.` });
  if (outputIntent) findings.push({ level: 'ok', check: 'Output intent', message: `Output intent: ${outputIntent}.` });
  if (spots.size) findings.push({ level: 'warn', check: 'Spot colours', message: `Spot colours: ${[...spots].join(', ')}. Each prints as its own plate unless converted.`, fix: 'Keep only the spots the job needs (e.g. a dieline or a brand Pantone); convert the rest to CMYK.' });
  if (overprint) findings.push({ level: press ? 'warn' : 'ok', check: 'Overprint', message: 'Overprint is set on some objects — check with overprint preview (normal for dielines, black text and spot lines).' });
  // ── Text & lines ──
  const minText = pages.map((p) => p.minTextPt).filter((v): v is number => v !== null);
  if (minText.length) { const m = Math.min(...minText); findings.push(m < 5 ? { level: 'warn', check: 'Small text', message: `Smallest text is ${m} pt — below 5 pt is hard to read and to print sharply (especially reversed or in 4 colours).`, fix: 'Use 6 pt or more; set very small text in one solid ink.', pages: pages.filter((p) => p.minTextPt !== null && p.minTextPt < 5).map((p) => p.n) } : { level: 'ok', check: 'Small text', message: `Smallest text ${m} pt.` }); }
  const minStroke = pages.map((p) => p.minStrokePt).filter((v): v is number => v !== null);
  if (minStroke.length && press) { const m = Math.min(...minStroke); findings.push(m < 0.25 ? { level: 'warn', check: 'Thin lines', message: m === 0 ? 'Hairlines (0 pt width) found — they print at the thinnest the device can make, often invisible.' : `Thinnest line ${m} pt (${r1(m * MM * 100) / 100} mm) — below 0.25 pt may not print.`, fix: 'Use at least 0.25 pt (0.09 mm) for printed lines; dieline / cut lines in a spot colour are fine.' } : { level: 'ok', check: 'Thin lines', message: `Thinnest line ${m} pt.` }); }

  const status: Level = findings.some((f) => f.level === 'error') ? 'error' : findings.some((f) => f.level === 'warn') ? 'warn' : 'ok';
  const order = { error: 0, warn: 1, ok: 2 };
  findings.sort((a, b) => order[a.level] - order[b.level]);
  return { target, pages, findings, status, fonts: fl, colourSpaces: list, spots: [...spots], outputIntent, overprint, transparency, producer: doc.getProducer() || null, version: (new TextDecoder().decode(bytes.subarray(0, 9)).match(/%PDF-(\d\.\d)/) || [])[1] || null };
}
