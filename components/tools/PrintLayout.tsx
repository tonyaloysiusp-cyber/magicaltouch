'use client';

// Print Layout — real imposition for print shops and home printing:
//  • Many-up sheet: business cards, stickers, labels, photos or postcards
//    repeated on A4 / A3 / SRA3… with bleed, gaps, crop marks and an
//    optional back side lined up for double-sided printing.
//  • Booklet: a multi-page PDF re-ordered and paired for saddle-stitch
//    (fold and staple) printing, blank pages added to make a multiple of 4.
// The customer's own PDF pages are placed as vectors with pdf-lib — text
// stays text and vectors stay vectors. Images (JPG/PNG) work for many-up.
// Everything happens in the browser; nothing is uploaded.

import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Download, FileUp, Grid3x3, Loader2, RotateCw } from 'lucide-react';
import { ITEM_PRESETS, MM_TO_PT, SHEETS, backSlots, bookletOrder, cropMarks, nUpPlan } from '@/lib/imposition';

type Mode = 'nup' | 'booklet';
interface Src { name: string; kind: 'pdf' | 'image'; bytes: Uint8Array; pages: { w: number; h: number }[]; mime?: string }

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const r1 = (n: number) => Math.round(n * 10) / 10;

export function PrintLayout() {
  const [mode, setMode] = useState<Mode>('nup');
  const [src, setSrc] = useState<Src | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // many-up
  const [sheet, setSheet] = useState('a4');
  const [landscape, setLandscape] = useState(false);
  const [preset, setPreset] = useState('card-eu');
  const [itemW, setItemW] = useState(85);
  const [itemH, setItemH] = useState(55);
  const [bleed, setBleed] = useState(3);
  const [fileBleed, setFileBleed] = useState(true);
  const [gap, setGap] = useState(0);
  const [margin, setMargin] = useState(8);
  const [marks, setMarks] = useState(true);
  const [duplex, setDuplex] = useState(true);
  const [rotate, setRotate] = useState<'auto' | 'no' | 'yes'>('auto');
  // booklet
  const [bSheet, setBSheet] = useState<'spread' | 'a4' | 'a3' | 'sra3'>('spread');
  const fileRef = useRef<HTMLInputElement>(null);

  const S = SHEETS.find((x) => x.id === sheet)!;
  const sheetW = landscape ? S.h : S.w, sheetH = landscape ? S.w : S.h;
  const plan = useMemo(() => nUpPlan({ sheetW, sheetH, itemW, itemH, bleed, gap, margin, rotate }), [sheetW, sheetH, itemW, itemH, bleed, gap, margin, rotate]);
  const pageCount = src?.pages.length || 0;
  const order = useMemo(() => bookletOrder(Math.max(1, pageCount)), [pageCount]);

  const load = async (f: File) => {
    setErr(null); setMsg(null);
    const bytes = new Uint8Array(await f.arrayBuffer());
    try {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        const { PDFDocument } = await import('pdf-lib');
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = doc.getPages().map((p) => { const { width, height } = p.getSize(); return { w: width / MM_TO_PT, h: height / MM_TO_PT }; });
        setSrc({ name: f.name, kind: 'pdf', bytes, pages });
        // Many-up: take the item size from the first page (minus the bleed it carries).
        const p0 = pages[0];
        if (p0) { const b = fileBleed ? bleed : 0; setItemW(r1(p0.w - 2 * b)); setItemH(r1(p0.h - 2 * b)); setPreset('file'); }
        if (pages.length > 2) setMode('booklet');
      } else if (/^image\/(png|jpeg)$/.test(f.type)) {
        const img = new Image(); const url = URL.createObjectURL(f); img.src = url; await img.decode(); URL.revokeObjectURL(url);
        setSrc({ name: f.name, kind: 'image', bytes, mime: f.type, pages: [{ w: img.naturalWidth, h: img.naturalHeight }] });
        setMode('nup');
      } else throw new Error('Choose a PDF, JPG or PNG file.');
    } catch (e: any) { setErr(e?.message?.includes('encrypt') ? 'This PDF is password-protected.' : e?.message || 'This file could not be read.'); setSrc(null); }
  };
  useEffect(() => {
    if (preset === 'file' || preset === 'custom') return;
    const p = ITEM_PRESETS.find((x) => x.id === preset); if (p) { setItemW(p.w); setItemH(p.h); }
  }, [preset]);

  // ---------- PDF output ----------
  const makeNup = async () => {
    if (!src) return;
    if (!plan.slots.length) { setErr('Nothing fits on this sheet — use a bigger sheet or a smaller margin.'); return; }
    setBusy(true); setErr(null);
    try {
      const { PDFDocument, degrees, rgb } = await import('pdf-lib');
      const out = await PDFDocument.create();
      out.setTitle(`${src.name} — ${plan.slots.length}-up`); out.setCreator('Magical Touch Design — Print Layout'); out.setProducer('magicaltouchdesign.com');
      const W = sheetW * MM_TO_PT, H = sheetH * MM_TO_PT;
      const boxW = (itemW + 2 * bleed), boxH = (itemH + 2 * bleed); // mm, unrotated
      let front: any, back: any = null;
      if (src.kind === 'pdf') {
        const doc = await PDFDocument.load(src.bytes, { ignoreEncryption: true });
        const pages = doc.getPages();
        [front] = await out.embedPages([pages[0]]);
        if (duplex && pages[1]) [back] = await out.embedPages([pages[1]]);
      } else {
        front = src.mime === 'image/png' ? await out.embedPng(src.bytes) : await out.embedJpg(src.bytes);
      }
      const draw = (page: any, art: any, slots: typeof plan.slots) => {
        for (const s of slots) {
          // The artwork fills trim + bleed (or only the trim if the file has no bleed).
          const bw = fileBleed || src.kind === 'image' ? boxW : itemW, bh = fileBleed || src.kind === 'image' ? boxH : itemH;
          const ox = fileBleed || src.kind === 'image' ? bleed : 0;
          const left = s.x - ox, top = s.y - ox; // mm from top-left
          const wPt = bw * MM_TO_PT, hPt = bh * MM_TO_PT;
          const opts = (o: any) => (src.kind === 'pdf' ? page.drawPage(art, o) : page.drawImage(art, o));
          if (!s.rotated) opts({ x: left * MM_TO_PT, y: H - (top + bh) * MM_TO_PT, width: wPt, height: hPt });
          else opts({ x: (left + bh) * MM_TO_PT, y: H - (top + bw) * MM_TO_PT, width: wPt, height: hPt, rotate: degrees(90) });
        }
        if (marks) for (const [x1, y1, x2, y2] of cropMarks(slots, bleed)) page.drawLine({ start: { x: x1 * MM_TO_PT, y: H - y1 * MM_TO_PT }, end: { x: x2 * MM_TO_PT, y: H - y2 * MM_TO_PT }, thickness: 0.25, color: rgb(0, 0, 0) });
      };
      draw(out.addPage([W, H]), front, plan.slots);
      if (back) draw(out.addPage([W, H]), back, backSlots(plan, sheetW));
      save(new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' }), `${src.name.replace(/\.[^.]+$/, '')}-${plan.slots.length}-up-${sheet}.pdf`);
      setMsg(`${plan.slots.length} per sheet${back ? ', front and back (back mirrored to line up)' : ''}. Print at 100% / “actual size”.`);
    } catch (e: any) { setErr(e?.message || 'The PDF could not be made.'); }
    setBusy(false);
  };

  const makeBooklet = async () => {
    if (!src || src.kind !== 'pdf') return;
    setBusy(true); setErr(null);
    try {
      const { PDFDocument, rgb } = await import('pdf-lib');
      const doc = await PDFDocument.load(src.bytes, { ignoreEncryption: true });
      const out = await PDFDocument.create();
      out.setTitle(`${src.name} — booklet`); out.setCreator('Magical Touch Design — Print Layout'); out.setProducer('magicaltouchdesign.com');
      const emb = await out.embedPages(doc.getPages());
      const pw = src.pages[0].w, ph = src.pages[0].h; // mm
      const fix = bSheet === 'spread' ? null : SHEETS.find((x) => x.id === bSheet)!;
      // Spread sheet = two pages side by side; a fixed sheet is used landscape and the spread scaled to fit.
      const SW = fix ? Math.max(fix.w, fix.h) : pw * 2, SH = fix ? Math.min(fix.w, fix.h) : ph;
      const k = Math.min(SW / (pw * 2), SH / ph);
      const x0 = (SW - pw * 2 * k) / 2, y0 = (SH - ph * k) / 2;
      const side = (pair: [number, number]) => {
        const page = out.addPage([SW * MM_TO_PT, SH * MM_TO_PT]);
        pair.forEach((pi, i) => {
          if (pi < 0) return; // blank
          page.drawPage(emb[pi], { x: (x0 + i * pw * k) * MM_TO_PT, y: y0 * MM_TO_PT, width: pw * k * MM_TO_PT, height: ph * k * MM_TO_PT });
        });
        // Fold marks at the spine, outside the page area.
        const fx = (x0 + pw * k) * MM_TO_PT;
        if (y0 > 2) { page.drawLine({ start: { x: fx, y: 0 }, end: { x: fx, y: (y0 - 1) * MM_TO_PT }, thickness: 0.25, color: rgb(0, 0, 0) }); page.drawLine({ start: { x: fx, y: (SH - y0 + 1) * MM_TO_PT }, end: { x: fx, y: SH * MM_TO_PT }, thickness: 0.25, color: rgb(0, 0, 0) }); }
      };
      for (const sh of order.sheets) { side(sh.front); side(sh.back); }
      save(new Blob([(await out.save()) as BlobPart], { type: 'application/pdf' }), `${src.name.replace(/\.[^.]+$/, '')}-booklet.pdf`);
      setMsg(`${order.sheets.length} sheet${order.sheets.length > 1 ? 's' : ''} (${order.total} pages${order.total > pageCount ? `, ${order.total - pageCount} blank added at the end` : ''}). Print double-sided, flip on the short edge, then fold and staple.`);
    } catch (e: any) { setErr(e?.message || 'The booklet could not be made.'); }
    setBusy(false);
  };

  // ---------- preview ----------
  const nupSvg = useMemo(() => {
    const m = cropMarks(plan.slots, bleed);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 ${sheetW + 12} ${sheetH + 12}"><rect width="${sheetW}" height="${sheetH}" fill="#fff" stroke="#CBD5E1" stroke-width="0.6"/><rect x="${margin}" y="${margin}" width="${sheetW - 2 * margin}" height="${sheetH - 2 * margin}" fill="none" stroke="#94A3B8" stroke-dasharray="2 2" stroke-width="0.3"/>${plan.slots.map((s, i) => `<rect x="${s.x - bleed}" y="${s.y - bleed}" width="${s.w + 2 * bleed}" height="${s.h + 2 * bleed}" fill="#FDE68A" fill-opacity="0.45"/><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#DBEAFE" stroke="#3B82C4" stroke-width="0.4"/><text x="${s.x + s.w / 2}" y="${s.y + s.h / 2}" font-size="${Math.min(s.w, s.h) / 4}" text-anchor="middle" dominant-baseline="central" fill="#1E3A5F" font-family="Arial">${i + 1}</text>`).join('')}${marks ? m.map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#111" stroke-width="0.25"/>`).join('') : ''}</svg>`;
  }, [plan, bleed, sheetW, sheetH, margin, marks]);

  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px]';
  const num = (label: string, v: number, on: (n: number) => void, min = 0, max = 2000, step = 0.5) => <label className="block text-[12px] text-mt-muted">{label}<input type="number" min={min} max={max} step={step} value={v} onChange={(e) => on(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} className={field} /></label>;
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">{children}</h3>;
  const chip = (on: boolean) => `h-10 px-4 rounded-xl border text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 ${on ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-mt-border bg-mt-surface p-2">
        <button type="button" aria-pressed={mode === 'nup'} onClick={() => setMode('nup')} className={chip(mode === 'nup')}><Grid3x3 size={15} /> Many-up sheet</button>
        <button type="button" aria-pressed={mode === 'booklet'} onClick={() => setMode('booklet')} className={chip(mode === 'booklet')}><BookOpen size={15} /> Booklet</button>
        <span className="ml-auto" />
        <span className="text-[12.5px] text-mt-muted truncate max-w-[40%]">{src ? `${src.name} · ${src.kind === 'pdf' ? `${pageCount} page${pageCount > 1 ? 's' : ''} · ${r1(src.pages[0].w)} × ${r1(src.pages[0].h)} mm` : `${src.pages[0].w} × ${src.pages[0].h} px`}` : 'No file yet'}</span>
        <button type="button" onClick={() => fileRef.current?.click()} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center gap-1.5"><FileUp size={15} /> {src ? 'Change file' : 'Choose PDF or image'}</button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf,image/png,image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) load(f); }} />
      </div>
      {err && <p role="alert" className="text-[13.5px] font-medium text-rose-600">{err}</p>}

      {mode === 'nup' ? (
        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5">
            <section className="space-y-2">
              <H>Item</H>
              <select value={preset} onChange={(e) => setPreset(e.target.value)} className={field} aria-label="Item size">
                {src?.kind === 'pdf' && <option value="file">From my PDF page</option>}
                {ITEM_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                <option value="custom">Custom size</option>
              </select>
              <div className="grid grid-cols-2 gap-2">{num('Width (mm)', itemW, (n) => { setItemW(n); setPreset('custom'); }, 5)}{num('Height (mm)', itemH, (n) => { setItemH(n); setPreset('custom'); }, 5)}</div>
              <div className="grid grid-cols-2 gap-2">{num('Bleed (mm)', bleed, setBleed, 0, 10)}{num('Gap (mm)', gap, setGap, 0, 30)}</div>
              {src?.kind === 'pdf' && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={fileBleed} onChange={(e) => setFileBleed(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> My PDF already includes the bleed</label>}
            </section>
            <section className="space-y-2">
              <H>Sheet</H>
              <select value={sheet} onChange={(e) => setSheet(e.target.value)} className={field} aria-label="Sheet size">{SHEETS.map((x) => <option key={x.id} value={x.id}>{x.label} mm</option>)}</select>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={!landscape} onClick={() => setLandscape(false)} className={chip(!landscape)}>Portrait</button>
                <button type="button" aria-pressed={landscape} onClick={() => setLandscape(true)} className={chip(landscape)}>Landscape</button>
              </div>
              {num('Printer margin (mm)', margin, setMargin, 0, 40)}
              <div className="grid grid-cols-3 gap-1.5">{(['auto', 'no', 'yes'] as const).map((v) => <button key={v} type="button" aria-pressed={rotate === v} onClick={() => setRotate(v)} className={chip(rotate === v) + ' h-9 px-2 text-[12.5px]'}>{v === 'auto' ? 'Best fit' : v === 'no' ? 'Upright' : <><RotateCw size={13} /> Turned</>}</button>)}</div>
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Crop marks</label>
              {src?.kind === 'pdf' && pageCount > 1 && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={duplex} onChange={(e) => setDuplex(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Page 2 is the back (double-sided)</label>}
            </section>
            <button type="button" onClick={makeNup} disabled={!src || busy || !plan.slots.length} className="h-11 w-full rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download print PDF</button>
            {!src && <p className="text-[12px] text-mt-muted">Choose a PDF (e.g. your business card exported from the editor with bleed) or a JPG/PNG.</p>}
            {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}
          </aside>
          <div className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
            <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(nupSvg)}`} alt={`Sheet layout: ${plan.slots.length} per sheet`} className="mx-auto max-h-[640px] w-auto" />
            <p className="mt-2 text-center text-[13px] text-mt-muted" aria-live="polite"><b className="text-mt-ink">{plan.slots.length} per sheet</b> ({plan.cols} × {plan.rows}{plan.rotated ? ', turned' : ''}) · trim {itemW} × {itemH} mm · {bleed} mm bleed (yellow) · {sheetW} × {sheetH} mm sheet</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5">
            <section className="space-y-2">
              <H>Booklet (saddle-stitch)</H>
              <p className="text-[13px] text-mt-muted">Upload your pages in reading order as one PDF (cover first). They are paired on sheets so that, printed double-sided and folded, they read in order.</p>
              <select value={bSheet} onChange={(e) => setBSheet(e.target.value as typeof bSheet)} className={field} aria-label="Sheet">
                <option value="spread">Exact spread (two pages wide)</option>
                <option value="a4">A4 landscape (A5 booklet)</option>
                <option value="a3">A3 landscape (A4 booklet)</option>
                <option value="sra3">SRA3 landscape</option>
              </select>
            </section>
            <button type="button" onClick={makeBooklet} disabled={!src || src.kind !== 'pdf' || busy} className="h-11 w-full rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download booklet PDF</button>
            {src && src.kind !== 'pdf' && <p className="text-[12px] text-rose-600">Booklets need a multi-page PDF.</p>}
            {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}
          </aside>
          <div className="rounded-3xl border border-mt-border bg-mt-surface p-4">
            <h3 className="text-[15px] font-semibold">Sheet order {pageCount ? `· ${pageCount} pages → ${order.total}` : ''}</h3>
            {pageCount ? (
              <ol className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Booklet sheets">
                {order.sheets.map((s, i) => (
                  <li key={i} className="rounded-2xl border border-mt-border p-3">
                    <p className="text-[12px] font-semibold text-mt-muted">Sheet {i + 1}</p>
                    {(['front', 'back'] as const).map((side) => (
                      <div key={side} className="mt-2 flex items-center gap-2">
                        <span className="w-12 text-[12px] text-mt-muted capitalize">{side}</span>
                        {s[side].map((p, k) => <span key={k} className={`grid h-14 w-11 place-items-center rounded-md border text-[13px] font-semibold ${p < 0 ? 'border-dashed border-mt-border text-mt-faint' : 'border-[#3B82C4] bg-[#3B82C4]/10'}`}>{p < 0 ? 'blank' : p + 1}</span>)}
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            ) : <p className="mt-2 text-[13px] text-mt-muted">Choose a multi-page PDF to see how the pages are paired.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
