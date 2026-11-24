'use client';

// Print & cut tools inside the design editor (barcodes live in the QR code panel)
// (replacing the separate Barcode Studio, Label & Sticker Studio, Laser & CNC Prep, Large Format Studio and
// Separation & Halftone Studio pages):
//  · Barcode — EAN-13, UPC-A, EAN-8, UPC-E, ITF-14, ITF, Code 128, Code 39
//    as vector bars on the page, with quiet zones and print checks.
//  · Cut & sticker — a cut line traced around the selected picture or shape
//    (transparent PNGs follow their outline), offset, white border, cut type
//    (kiss, die, through, laser, engrave, perforation, crease), sticker
//    sheets, path checks and SVG / DXF / print-and-cut PDF.
//  · Large format — page size, picture resolution at print size, roll widths,
//    tiling and panel splitting with overlap.
//  · Separations — CMYK or spot plates and halftone films from this page.

import { useMemo, useState } from 'react';
import { AlertTriangle, Barcode, CheckCircle2, Download, Layers, Maximize2, Scissors, Sparkles } from 'lucide-react';
import { CODE_KINDS, barcodeWarnings, linearBarcode, type CodeKind } from '@/lib/barcodeLinear';
import type { PackagingApi } from './PackagingPanel';
import { DataMergePanel } from './DataMergePanel';

export type StudioKind = 'separation' | 'tiling' | 'layout' | 'vdp' | 'size';
export interface ProductionApi extends PackagingApi {
  pagePdf: () => Promise<Uint8Array>;
  pagePng: (dpi: number) => Promise<Blob>;
  openStudio: (kind: StudioKind, file: File | null) => void;
  recordsPdf: (count: number, apply: (i: number) => Promise<void>) => Promise<Uint8Array>;
}

const PX = 96 / 25.4;
export const CUT_TYPES = [
  { id: 'kiss', name: 'Kiss cut', die: 'cut', colour: '#EC008C', layer: 'KISS_CUT', dxf: 6, hint: 'Cuts the sticker, not the backing sheet.' },
  { id: 'die', name: 'Die cut', die: 'cut', colour: '#EC008C', layer: 'DIE_CUT', dxf: 6, hint: 'Cuts through sticker and backing.' },
  { id: 'through', name: 'Through cut', die: 'cut', colour: '#FF0000', layer: 'THROUGH_CUT', dxf: 1, hint: 'Separates pieces from the sheet.' },
  { id: 'laser', name: 'Laser cut', die: 'cut', colour: '#FF0000', layer: 'LASER_CUT', dxf: 1, hint: 'Red hairline: the laser cuts on it.' },
  { id: 'engrave', name: 'Engrave / score', die: null, colour: '#0000FF', layer: 'ENGRAVE', dxf: 5, hint: 'Blue line: the laser marks it, does not cut.' },
  { id: 'perf', name: 'Perforation', die: 'perf', colour: '#F7A600', layer: 'PERF', dxf: 30, hint: 'Tear line.' },
  { id: 'crease', name: 'Crease / fold', die: 'crease', colour: '#00A0E3', layer: 'CREASE', dxf: 5, hint: 'Fold line, not cut.' },
] as const;
type CutTypeId = (typeof CUT_TYPES)[number]['id'];
const ROLLS = [610, 914, 1067, 1270, 1370, 1600];

const btn = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-mt-border px-2 text-[11.5px] font-semibold hover:bg-mt-surface2 disabled:opacity-50';
const primary = 'inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-mt-ink text-[12.5px] font-semibold text-mt-bg hover:opacity-90 disabled:opacity-50';
const sel = 'h-8 w-full rounded-md border border-mt-border bg-mt-bg px-2 text-[12.5px]';
const label = 'mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint';

function Num({ name, value, onChange, unit = 'mm', step = 0.5, min = 0, max = 10000 }: { name: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number; max?: number }) {
  return (
    <label className="block text-[11.5px]"><span className="text-mt-muted">{name}</span>
      <span className="mt-0.5 flex h-8 items-center rounded-md border border-mt-border bg-mt-bg">
        <input type="number" value={value} step={step} min={min} max={max} aria-label={name} onChange={(e) => { const v = Number(e.target.value); if (isFinite(v)) onChange(Math.min(max, Math.max(min, v))); }} className="h-full w-full min-w-0 bg-transparent px-2 text-[12.5px] tabular-nums outline-none" />
        <span className="pr-2 text-[10.5px] text-mt-faint">{unit}</span>
      </span>
    </label>
  );
}

export function ProductionPanel({ api, initialTab }: { api: ProductionApi; initialTab?: string }) {
  const [tab, setTab] = useState<'cut' | 'large' | 'sep' | 'layout' | 'data' | 'size'>(() => (['cut', 'large', 'sep', 'layout', 'data', 'size'].includes(initialTab || '') ? (initialTab as any) : 'cut'));
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (what: string, f: () => Promise<void>) => { setBusy(what); try { await f(); } catch (e: any) { api.notice(e?.message || 'That did not work.'); } finally { setBusy(null); } };
  const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const pageObjs = () => { const c = api.canvas(); const page = api.page(); return c ? c.getObjects().filter((o: any) => !o.__isArtboard && (!page.id || !o.__artboardId || o.__artboardId === page.id)) : []; };
  const page = api.page();
  const pageMm = { w: Math.round((page.width / PX) * 10) / 10, h: Math.round((page.height / PX) * 10) / 10 };

  // ── Cut & sticker ──
  const [offset, setOffset] = useState(2);
  const [border, setBorder] = useState(true);
  const [borderW, setBorderW] = useState(3);
  const [smooth, setSmooth] = useState(1.5);
  const [cutType, setCutType] = useState<CutTypeId>('kiss');
  const [copies, setCopies] = useState(0);
  const [gap, setGap] = useState(4);
  const [, bump] = useState(0);
  const ct = CUT_TYPES.find((t) => t.id === cutType)!;
  const uid = (o: any) => (o.__uid ||= `u${Math.random().toString(36).slice(2, 10)}`);
  const styleCut = (p: any, t: (typeof CUT_TYPES)[number]) => {
    p.set({ fill: '', stroke: t.colour, strokeWidth: 1, strokeUniform: true, strokeDashArray: t.id === 'perf' ? [6, 4] : t.id === 'crease' ? [8, 4] : null, objectCaching: false, name: `Cut line · ${t.name}` });
    p.__die = t.die || undefined; p.__cutType = t.id;
  };
  /** Outline of an object (alpha > threshold) offset by `mm`, as a fabric Path in page coordinates. */
  const outline = async (o: any, mm: number) => {
    const F = api.fabric();
    const { contourFromRgba } = await import('@/lib/sticker');
    const br = o.getBoundingRect(true, true);
    const k = Math.min(6, 1100 / Math.max(br.width, br.height, 1));
    const el: HTMLCanvasElement = o.toCanvasElement({ multiplier: k });
    const data = el.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, el.width, el.height);
    const s = br.width / el.width;
    const c = contourFromRgba(data.data, el.width, el.height, (mm * PX) / s, { threshold: 24, smooth });
    if (!c.d) return null;
    const p = new F.Path(c.d, { fill: '', stroke: '#000', strokeWidth: 1, strokeUniform: true });
    p.set({ scaleX: s, scaleY: s, left: br.left + (p.left - c.pad) * s, top: br.top + (p.top - c.pad) * s });
    p.setCoords();
    return { path: p, loops: c.loops };
  };
  const makeCut = () => run('Tracing the outline…', async () => {
    const c = api.canvas(); const sel = api.selection().filter((o: any) => !o.__cutType && !o.__die);
    if (!c || sel.length !== 1) throw new Error('Select one picture, text or shape first. Transparent PNGs follow their outline.');
    const o = sel[0], id = uid(o);
    // replace an earlier cut line / border made for this object
    c.getObjects().filter((x: any) => x.__cutFor === id).forEach((x: any) => c.remove(x));
    const cutAt = border ? borderW : offset;
    const cut = await outline(o, cutAt);
    if (!cut) throw new Error('No outline found — the object may be fully transparent.');
    styleCut(cut.path, ct); cut.path.__cutFor = id;
    if (border) {
      const b = await outline(o, borderW);
      if (b) { b.path.set({ fill: '#FFFFFF', stroke: '', strokeWidth: 0, name: 'Sticker border (white)' }); b.path.__cutFor = id; c.insertAt(b.path, Math.max(0, c.getObjects().indexOf(o))); }
    }
    c.add(cut.path); c.bringToFront(cut.path); c.setActiveObject(cut.path); api.commit(); bump((n) => n + 1);
    api.notice(`${ct.name} line made${cut.loops > 1 ? ` (${cut.loops} separate shapes)` : ''}. It is an editable path: double-click it to move points.`);
  });
  const retype = () => {
    const c = api.canvas(); const cuts = api.selection().filter((o: any) => o.__cutType || o.__die);
    if (!cuts.length) { api.notice('Select a cut line (or any shape to mark it as a cut line).'); }
    const targets = cuts.length ? cuts : api.selection();
    targets.forEach((p: any) => styleCut(p, ct));
    c?.requestRenderAll(); api.commit(); bump((n) => n + 1);
  };
  const cutObjs = () => pageObjs().filter((o: any) => o.__cutType || (o.__die && !o.__dieGen));
  const pathMm = async () => {
    const { objectPathPx } = await import('@/lib/packaging/editorBridge');
    const p = api.page();
    return cutObjs().map((o: any) => {
      const d = objectPathPx(o) || '';
      let i = 0; const mm = d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (v) => String(Math.round(((i++ % 2 === 0 ? Number(v) - p.x : Number(v) - p.y) / PX) * 100) / 100));
      return { o, d: mm, type: CUT_TYPES.find((t) => t.id === o.__cutType) || CUT_TYPES.find((t) => t.die === o.__die) || CUT_TYPES[1] };
    }).filter((l: any) => l.d);
  };
  const report = useMemo(() => {
    const cs = cutObjs();
    const open: string[] = [], tiny: string[] = [], dup: string[] = [];
    const seen = new Map<string, string>();
    for (const o of cs) {
      const d: string = Array.isArray(o.path) ? o.path.map((s: any[]) => s[0]).join('') : '';
      const subs = (d.match(/M/gi) || []).length, closes = (d.match(/Z/gi) || []).length;
      if (o.type === 'path' && subs > closes && o.__cutType !== 'perf' && o.__cutType !== 'crease' && o.__cutType !== 'engrave') open.push(o.name || 'Cut line');
      const w = o.getScaledWidth() / PX, h = o.getScaledHeight() / PX;
      if (w < 2 && h < 2) tiny.push(o.name || 'Cut line');
      const key = `${Math.round(o.left)}|${Math.round(o.top)}|${Math.round(w)}|${Math.round(h)}|${o.__cutType}`;
      if (seen.has(key)) dup.push(o.name || 'Cut line'); else seen.set(key, o.name);
    }
    return { count: cs.length, open, tiny, dup };
  }, [busy, tab, cutType]); // eslint-disable-line react-hooks/exhaustive-deps
  const exportSvg = () => run('Building SVG…', async () => {
    const ls = await pathMm(); if (!ls.length) throw new Error('No cut lines on this page yet.');
    const body = CUT_TYPES.map((t) => { const g = ls.filter((l: any) => l.type.id === t.id); return g.length ? `<g id="${t.layer}" fill="none" stroke="${t.colour}" stroke-width="0.1">${g.map((l: any) => `<path d="${l.d}"/>`).join('')}</g>` : ''; }).join('');
    save(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${pageMm.w}mm" height="${pageMm.h}mm" viewBox="0 0 ${pageMm.w} ${pageMm.h}">${body}</svg>`], { type: 'image/svg+xml' }), 'cut-lines.svg');
  });
  const exportDxf = () => run('Building DXF…', async () => {
    const ls = await pathMm(); if (!ls.length) throw new Error('No cut lines on this page yet.');
    const { pathToPolylines, writeDxf } = await import('@/lib/dxf');
    const layers = CUT_TYPES.map((t) => ({ name: t.layer, color: t.dxf, polylines: ls.filter((l: any) => l.type.id === t.id).flatMap((l: any) => pathToPolylines(l.d)) })).filter((l) => l.polylines.length);
    save(new Blob([writeDxf(layers as any, pageMm.h)], { type: 'application/dxf' }), 'cut-lines.dxf');
  });
  const sheet = () => run('Filling the sheet…', async () => {
    const c = api.canvas(); const sel = api.selection(); if (!c || !sel.length) throw new Error('Select the sticker (picture or its cut line) first.');
    const base = sel[0].__cutFor ? c.getObjects().find((o: any) => o.__uid === sel[0].__cutFor) : sel[0];
    if (!base) throw new Error('Select the sticker first.');
    const set = [base, ...c.getObjects().filter((o: any) => o.__cutFor && o.__cutFor === base.__uid)];
    const rects = set.map((o: any) => o.getBoundingRect(true, true));
    const x0 = Math.min(...rects.map((r: any) => r.left)), y0 = Math.min(...rects.map((r: any) => r.top));
    const x1 = Math.max(...rects.map((r: any) => r.left + r.width)), y1 = Math.max(...rects.map((r: any) => r.top + r.height));
    const p = api.page(), g = gap * PX, m = 5 * PX;
    const cols = Math.max(1, Math.floor((p.width - 2 * m + g) / (x1 - x0 + g))), rows = Math.max(1, Math.floor((p.height - 2 * m + g) / (y1 - y0 + g)));
    const total = copies > 0 ? Math.min(copies, cols * rows) : cols * rows;
    const clone = (o: any) => new Promise<any>((res) => o.clone((cl: any) => res(cl), ['__die', '__cutType', '__cutFor', 'name']));
    let n = 0;
    for (let r = 0; r < rows && n < total; r++) for (let col = 0; col < cols && n < total; col++, n++) {
      const tx = p.x + m + col * (x1 - x0 + g), ty = p.y + m + r * (y1 - y0 + g);
      if (n === 0) { set.forEach((o: any) => { o.set({ left: o.left + (tx - x0), top: o.top + (ty - y0) }); o.setCoords(); }); continue; }
      const nid = `u${Math.random().toString(36).slice(2, 10)}`;
      for (const o of set) { const cl = await clone(o); cl.set({ left: o.left + (tx - (p.x + m)), top: o.top + (ty - (p.y + m)) }); if (o === base) cl.__uid = nid; else { cl.__cutFor = nid; cl.__die = o.__die; cl.__cutType = o.__cutType; } c.add(cl); }
    }
    c.requestRenderAll(); api.commit();
    api.notice(`${n} stickers on the page (${cols} × ${rows} fit, ${gap} mm apart).`);
  });

  // ── Large format ──
  const images = pageObjs().filter((o: any) => o.type === 'image');
  const dpiList = images.map((o: any) => { const px = (o._element?.naturalWidth || o.width || 1) * ((o.width || 1) / (o._element?.naturalWidth || o.width || 1)); const mm = o.getScaledWidth() / PX; return { name: o.name || 'Picture', dpi: Math.round(px / (mm / 25.4)) }; }).sort((a: any, b: any) => a.dpi - b.dpi);
  const [roll, setRoll] = useState(1370);
  const [overlap, setOverlap] = useState(20);
  const panels = Math.max(1, Math.ceil((Math.min(pageMm.w, pageMm.h) - overlap) / (roll - overlap)));
  const fitsRoll = Math.min(pageMm.w, pageMm.h) <= roll;

  // ── Separations ──
  const [sepDpi, setSepDpi] = useState(200);

  return (
    <div className="space-y-4 text-[12px]">
      <div role="tablist" aria-label="Print and cut" className="grid grid-cols-3 gap-0.5 rounded-lg border border-mt-border p-0.5">
        {([['cut', 'Cut & sticker'], ['large', 'Large format'], ['sep', 'Separations'], ['layout', 'Imposition'], ['data', 'Data merge'], ['size', 'Print sizes']] as const).map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-[30px] rounded-md px-1 text-[11px] font-semibold leading-tight ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{l}</button>
        ))}
      </div>


      {tab === 'cut' && <section className="space-y-2.5">
        <p className="text-[11px] text-mt-faint">Select a picture, text or shape. Transparent PNGs get a cut line that follows their outline.</p>
        <label className="block text-[11.5px]"><span className="text-mt-muted">Cut type</span>
          <select value={cutType} onChange={(e) => setCutType(e.target.value as CutTypeId)} className={sel} aria-label="Cut type">{CUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </label>
        <p className="text-[11px] text-mt-faint"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: ct.colour }} />{ct.hint}</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={border} onChange={(e) => setBorder(e.target.checked)} /> White sticker border</label>
        <div className="grid grid-cols-2 gap-2">
          {border ? <Num name="Border width" value={borderW} step={0.5} min={0.5} max={20} onChange={setBorderW} /> : <Num name="Offset from edge" value={offset} step={0.5} min={0} max={20} onChange={setOffset} />}
          <Num name="Smoothing" value={smooth} unit="px" step={0.5} min={0.5} max={6} onChange={setSmooth} />
        </div>
        <button type="button" className={primary} onClick={makeCut} disabled={!!busy}><Scissors size={14} /> Make cut line</button>
        <button type="button" className={`${btn} w-full`} onClick={retype}>Mark selected line as {ct.name.toLowerCase()}</button>
        <div>
          <p className={label}>Sticker sheet</p>
          <div className="grid grid-cols-2 gap-2">
            <Num name="Copies (0 = fill page)" value={copies} unit="" step={1} min={0} max={500} onChange={(v) => setCopies(Math.round(v))} />
            <Num name="Gap" value={gap} step={0.5} min={0} max={50} onChange={setGap} />
          </div>
          <button type="button" className={`${btn} mt-2 w-full`} onClick={sheet} disabled={!!busy}><Layers size={13} /> Arrange copies on the page</button>
        </div>
        <div className="rounded-md border border-mt-border p-2">
          <p className={label}>Cut line check</p>
          {report.count === 0 ? <p className="text-[11px] text-mt-faint">No cut lines on this page yet.</p> : <ul className="space-y-1 text-[11.5px]">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600" /> {report.count} cut line{report.count === 1 ? '' : 's'}</li>
            {report.open.length > 0 && <li className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><AlertTriangle size={13} /> {report.open.length} open path{report.open.length === 1 ? '' : 's'} — cutters need closed shapes</li>}
            {report.dup.length > 0 && <li className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><AlertTriangle size={13} /> {report.dup.length} duplicate{report.dup.length === 1 ? '' : 's'} on top of another line (cuts twice)</li>}
            {report.tiny.length > 0 && <li className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><AlertTriangle size={13} /> {report.tiny.length} under 2 mm — too small to cut cleanly</li>}
          </ul>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btn} onClick={exportSvg} disabled={!!busy}><Download size={13} /> SVG</button>
          <button type="button" className={btn} onClick={exportDxf} disabled={!!busy}><Download size={13} /> DXF</button>
        </div>
        <button type="button" className={`${btn} w-full`} onClick={() => run('Building the print-and-cut PDF…', api.pressPdf)} disabled={!!busy}><Download size={13} /> Print-and-cut PDF (CMYK + cut spot colour)</button>
        <p className="text-[11px] text-mt-faint">Laser: red = cut, blue = engrave / score. DXF layers are named by operation.</p>
      </section>}

      {tab === 'large' && <section className="space-y-2.5">
        <div className="rounded-md border border-mt-border p-2 tabular-nums"><p className="text-[10.5px] text-mt-faint">Page</p><p className="text-[15px] font-semibold">{pageMm.w} × {pageMm.h} mm</p><p className="text-[11px] text-mt-faint">{(pageMm.w / 1000).toFixed(2)} × {(pageMm.h / 1000).toFixed(2)} m · {(pageMm.w / 25.4).toFixed(1)} × {(pageMm.h / 25.4).toFixed(1)} in</p></div>
        <div>
          <p className={label}>Picture resolution at print size</p>
          {dpiList.length === 0 ? <p className="text-[11px] text-mt-faint">No pictures on this page — vectors and text print sharp at any size.</p> : <ul className="space-y-1">
            {dpiList.slice(0, 6).map((d: any, i: number) => <li key={i} className="flex items-center justify-between gap-2"><span className="truncate">{d.name}</span><span className={`shrink-0 tabular-nums font-semibold ${d.dpi < 72 ? 'text-rose-600' : d.dpi < 150 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.dpi} dpi</span></li>)}
          </ul>}
          <p className="mt-1 text-[11px] text-mt-faint">Banners seen from 2 m+ look fine at 72–100 dpi; posters read up close need 150 dpi or more.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11.5px]"><span className="text-mt-muted">Roll width</span>
            <select value={roll} onChange={(e) => setRoll(Number(e.target.value))} className={sel} aria-label="Roll width">{ROLLS.map((r) => <option key={r} value={r}>{r} mm ({Math.round(r / 25.4)}″)</option>)}</select>
          </label>
          <Num name="Panel overlap" value={overlap} step={5} min={0} max={200} onChange={setOverlap} />
        </div>
        <p className={`rounded-md px-2 py-1.5 text-[11.5px] ${fitsRoll ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{fitsRoll ? `Fits a ${roll} mm roll in one piece.` : `Needs ${panels} panels on a ${roll} mm roll with ${overlap} mm overlap.`}</p>
        <button type="button" className={primary} disabled={!!busy} onClick={() => run('Preparing the page…', async () => { const b = await api.pagePdf(); api.openStudio('tiling', new File([b as BlobPart], 'page.pdf', { type: 'application/pdf' })); })}><Maximize2 size={14} /> Tile or split into panels…</button>
        <p className="text-[11px] text-mt-faint">Opens tiling with this page as a vector PDF: sheet or roll size, overlap, crop marks and an assembly map.</p>
      </section>}

      {tab === 'sep' && <section className="space-y-2.5">
        <p className="text-[11px] text-mt-faint">Colour separations for screen printing (spot inks, white underbase) or CMYK process, with halftone frequency, angle and dot shape, and one film per ink.</p>
        <label className="block text-[11.5px]"><span className="text-mt-muted">Resolution of the page picture</span>
          <select value={sepDpi} onChange={(e) => setSepDpi(Number(e.target.value))} className={sel} aria-label="Separation resolution">{[150, 200, 300].map((d) => <option key={d} value={d}>{d} dpi</option>)}</select>
        </label>
        <button type="button" className={primary} disabled={!!busy} onClick={() => run('Rendering the page…', async () => { const b = await api.pagePng(sepDpi); api.openStudio('separation', new File([b], 'page.png', { type: 'image/png' })); })}><Sparkles size={14} /> Separate this page…</button>
      </section>}
      {tab === 'layout' && <section className="space-y-2.5">
        <p className="text-[11px] text-mt-faint">Put this page many times on a sheet (business cards, flyers, stickers), or arrange pages as a booklet: sheet size A4–A1 or custom, spacing, bleed, crop and registration marks, colour bars, front and back, duplex.</p>
        <button type="button" className={primary} disabled={!!busy} onClick={() => run('Preparing the page…', async () => { const b = await api.pagePdf(); api.openStudio('layout', new File([b as BlobPart], 'page.pdf', { type: 'application/pdf' })); })}><Layers size={14} /> Lay out this page on sheets…</button>
        <p className="text-[11px] text-mt-faint">The page goes in as a vector PDF; the layout downloads as a production PDF with marks.</p>
      </section>}

      {tab === 'data' && <DataMergePanel api={{ canvas: api.canvas, fabric: api.fabric, page: api.page, commit: api.commit, notice: api.notice, recordsPdf: api.recordsPdf, openStudio: (k, f) => api.openStudio(k, f) }} />}

      {tab === 'size' && <section className="space-y-2.5">
        <div className="rounded-md border border-mt-border p-2 tabular-nums">
          <p className="text-[10.5px] text-mt-faint">This page</p>
          <p className="text-[15px] font-semibold">{pageMm.w} × {pageMm.h} mm</p>
          <p className="text-[11px] text-mt-faint">{(pageMm.w / 25.4).toFixed(2)} × {(pageMm.h / 25.4).toFixed(2)} in · {Math.round((pageMm.w / 25.4) * 300)} × {Math.round((pageMm.h / 25.4) * 300)} px at 300 dpi</p>
          <p className="text-[11px] text-mt-faint">With 3 mm bleed: {(pageMm.w + 6).toFixed(1)} × {(pageMm.h + 6).toFixed(1)} mm · safe area {(pageMm.w - 10).toFixed(1)} × {(pageMm.h - 10).toFixed(1)} mm (5 mm margin)</p>
        </div>
        <button type="button" className={primary} onClick={() => api.openStudio('size', null)}><Maximize2 size={14} /> Print size & binding calculator…</button>
        <p className="text-[11px] text-mt-faint">A and B paper sizes, units and DPI, bleed and margins, book spine width from page count and paper, cover spread, creep, folding — with CSV and a printable sheet.</p>
      </section>}
      {busy && <p className="text-[11px] text-mt-muted">{busy}</p>}
    </div>
  );
}

/** Barcodes, in the QR code panel of the editor. */
export function BarcodeTool({ api }: { api: Pick<PackagingApi, 'canvas' | 'fabric' | 'page' | 'commit' | 'notice'> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (what: string, f: () => Promise<void>) => { setBusy(what); try { await f(); } catch (e: any) { api.notice(e?.message || 'That did not work.'); } finally { setBusy(null); } };
  // ── Barcode ──
  const [kind, setKind] = useState<CodeKind>('ean13');
  const [value, setValue] = useState('');
  const [x, setX] = useState(0.33);
  const [height, setHeight] = useState(22.85);
  const [showText, setShowText] = useState(true);
  const [ink, setInk] = useState('#000000');
  const [bg, setBg] = useState<string | null>('#FFFFFF');
  const def = CODE_KINDS.find((k) => k.id === kind)!;
  const bopts = { kind, value: value || def.placeholder, x, heightMm: height, text: showText, ink, bg };
  const warn = useMemo(() => barcodeWarnings(bopts), [kind, x, height, ink, bg]); // eslint-disable-line react-hooks/exhaustive-deps
  const setKindDefaults = (k: CodeKind) => { setKind(k); setValue(''); setX(k === 'itf14' ? 0.495 : k === 'code128' || k === 'code39' || k === 'itf' ? 0.25 : 0.33); setHeight(k === 'ean8' ? 18.23 : k === 'itf14' ? 32 : k === 'ean13' || k === 'upca' || k === 'upce' ? 22.85 : 15); };
  const addBarcode = () => run('Making the barcode…', async () => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F) return;
    const r = await linearBarcode(bopts);
    if (r.error) throw new Error(r.error);
    const group: any = await new Promise((res) => F.loadSVGFromString(r.svg, (objs: any[], o: any) => res(F.util.groupSVGElements(objs, o))));
    const sx = (r.wMm * PX) / (group.width || 1);
    group.set({ scaleX: sx, scaleY: sx, name: `${def.name} ${r.value}` });
    const p = api.page();
    group.set({ left: p.x + (p.width - r.wMm * PX) / 2, top: p.y + (p.height - r.hMm * PX) / 2 });
    group.__barcode = JSON.stringify({ ...bopts, value: r.value });
    c.add(group); c.setActiveObject(group); api.commit();
    api.notice(`${def.name} added at ${r.wMm.toFixed(1)} × ${r.hMm.toFixed(1)} mm${r.note ? ` — ${r.note}` : ''}. Test-scan a print before production.`);
  });

  return (
    <section className="space-y-2.5">
        <label className="block text-[11.5px]"><span className="text-mt-muted">Type</span>
          <select value={kind} onChange={(e) => setKindDefaults(e.target.value as CodeKind)} className={sel} aria-label="Barcode type">{CODE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
        </label>
        <p className="text-[11px] text-mt-faint">{def.hint}</p>
        <label className="block text-[11.5px]"><span className="text-mt-muted">Data</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={def.placeholder} aria-label="Barcode data" className={`${sel} font-mono`} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Num name="Bar width (X)" value={x} step={0.01} min={0.1} max={2} onChange={setX} />
          <Num name="Bar height" value={height} step={0.5} min={4} max={200} onChange={setHeight} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11.5px]"><span className="text-mt-muted">Bars</span><input type="color" value={ink} onChange={(e) => setInk(e.target.value)} aria-label="Bar colour" className="h-8 w-full rounded-md border border-mt-border" /></label>
          <label className="block text-[11.5px]"><span className="text-mt-muted">Background</span>
            <span className="flex gap-1"><input type="color" value={bg || '#FFFFFF'} onChange={(e) => setBg(e.target.value)} aria-label="Background colour" className="h-8 w-full rounded-md border border-mt-border" disabled={!bg} />
              <button type="button" className={btn} onClick={() => setBg(bg ? null : '#FFFFFF')} title="Transparent background">{bg ? 'Clear' : 'Fill'}</button></span>
          </label>
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> Human-readable text</label>
        {warn.length > 0 && <ul className="space-y-1 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">{warn.map((w) => <li key={w} className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</li>)}</ul>}
        <button type="button" className={primary} onClick={addBarcode} disabled={!!busy}><Barcode size={14} /> Add barcode to the page</button>
        <p className="text-[11px] text-mt-faint">Quiet zones (blank margins) are included — keep them clear of other artwork.</p>
    </section>
  );
}
