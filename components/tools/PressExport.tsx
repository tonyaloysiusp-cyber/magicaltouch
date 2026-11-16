'use client';

// Print-file export, the way a print shop sets up a job: choose the paper it
// is printed on (finished size, A4, A3, SRA3, 33 × 48 cm, custom), actual size
// or Fit to print (scaled into the printer's printable area), the printer's
// no-print margin, step & repeat, crop-mark type 1–4, red cut / green fold
// marks and the info line. Two outputs: the working template (guides and an
// instruction box — not for print) and the print-ready PDF with your artwork
// placed into the bleed. Everything happens in this browser; nothing is uploaded.

import { useMemo, useState } from 'react';
import { Download, Loader2, Printer, Upload } from 'lucide-react';
import { DEFAULT_PRESS, SHEETS, layoutPress, maxUp, pressPdf, suggestSheet, templateSvg, verifyPressPdf, type Artwork, type MarkType, type PressJob, type PressOptions } from '@/lib/print/pressSheet';

const MARK_TYPES: [MarkType, string][] = [[1, 'Type 1 · every cut line (default)'], [2, 'Type 2 · corner brackets + centre cross'], [3, 'Type 3 · brackets + crosses at every column'], [4, 'Type 4 · registration targets']];

export function PressExport({ job, fileBase, allowRepeat = false }: { job: PressJob; fileBase: string; allowRepeat?: boolean }) {
  const [sheetId, setSheetId] = useState<string>('auto');
  const [custom, setCustom] = useState({ w: 330, h: 480 });
  const [landscape, setLandscape] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [o, setO] = useState<PressOptions>({ ...DEFAULT_PRESS });
  const [art, setArt] = useState<{ name: string; a: Artwork } | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<PressOptions>) => setO((x) => ({ ...x, ...p }));

  const suggested = useMemo(() => suggestSheet(job, { ...o, cols: 1, rows: 1 }), [job, o]);
  const base = sheetId === 'auto' ? (suggested || SHEETS[SHEETS.length - 1]) : sheetId === 'custom' ? { id: 'custom', name: `${custom.w} × ${custom.h} mm`, w: custom.w, h: custom.h } : SHEETS.find((s) => s.id === sheetId);
  const sheetFor = (land: boolean) => base ? { name: `${base.name}${land ? ' landscape' : ''}`, w: land ? base.h : base.w, h: land ? base.w : base.h } : null;
  const layout = useMemo(() => {
    const mk = (land: boolean) => layoutPress(job, { ...o, sheet: sheetId === 'finished' ? 'finished' : sheetFor(land)! });
    if (sheetId === 'finished') return mk(false);
    if (landscape !== 'auto') return mk(landscape === 'landscape');
    // Auto orientation: the one that fits (or scales least).
    const a = mk(false), b = mk(true);
    if (a.fits !== b.fits) return a.fits ? a : b;
    return b.scale > a.scale ? b : a;
  }, [job, o, sheetId, custom, landscape, suggested]); // eslint-disable-line react-hooks/exhaustive-deps
  const tpl = useMemo(() => templateSvg(job, layout, o), [job, layout, o]);

  const save = (b: Blob, n: string) => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = n; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  const sheetTag = `${layout.sheet.name.replace(/[^\w]+/g, '-')}${o.mode === 'fit' && layout.scale < 1 ? `-fit-${Math.round(layout.scale * 100)}pc` : ''}`;

  const pickArt = async (f: File | undefined) => {
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    const kind = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name) ? 'pdf' : /png$/i.test(f.type) || /\.png$/i.test(f.name) ? 'png' : /jpe?g$/i.test(f.type) || /\.jpe?g$/i.test(f.name) ? 'jpg' : null;
    if (!kind) { setErr('Use a PDF, PNG or JPG for the artwork.'); return; }
    setErr(null); setArt({ name: f.name, a: { kind, bytes } as Artwork });
  };

  const dlTemplate = async (fmt: 'svg' | 'pdf') => {
    setErr(null);
    if (fmt === 'svg') { save(new Blob([tpl], { type: 'image/svg+xml' }), `${fileBase}_WORKING_TEMPLATE_${sheetTag}.svg`); return; }
    setBusy(true);
    try { const { svgToPdfBlob } = await import('@/lib/svgToPdf'); save(await svgToPdfBlob(tpl, layout.sheet.w, layout.sheet.h), `${fileBase}_WORKING_TEMPLATE_${sheetTag}.pdf`); }
    catch { setErr('The template PDF could not be made in this browser — download the SVG instead.'); }
    setBusy(false);
  };
  const dlPrint = async () => {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const bytes = await pressPdf(job, layout, art?.a || null);
      const v = await verifyPressPdf(bytes, layout);
      if (!v.ok) { setErr(`Not downloaded — the check found: ${v.issues.join(' ')}`); setBusy(false); return; }
      save(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), `${fileBase}_PRINT_READY_${sheetTag}.pdf`);
      setMsg(`Checked: ${layout.sheet.w} × ${layout.sheet.h} mm sheet, TrimBox and BleedBox set, marks outside the artwork${art ? '' : ' — no artwork placed, marks only'}.`);
    } catch (e: any) { setErr(`The print file could not be made: ${e?.message || 'unknown error'}. If your PDF is protected, export an unprotected copy.`); }
    setBusy(false);
  };

  const field = 'mt-1 h-9 w-full rounded-xl border border-mt-border bg-mt-bg px-2.5 text-[13px]';
  const lbl = 'block text-[12px] text-mt-muted';
  const chip = (on: boolean) => `h-8 px-3 rounded-full border text-[12.5px] font-semibold ${on ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`;

  return (
    <section aria-label="Print file export" className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
      <h3 className="text-[15px] font-semibold flex items-center gap-2"><Printer size={16} /> Print file export</h3>
      <p className="mt-1 text-[12.5px] text-mt-muted">Choose the paper this is printed on. At <b>actual size</b> the job is centred on the sheet with marks around it; <b>Fit to print</b> scales it (and every mark) into the area your printer can print. Nothing is uploaded.</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-2.5">
          <label className={lbl}>Print on paper
            <select aria-label="Print on paper" value={sheetId} onChange={(e) => setSheetId(e.target.value)} className={field}>
              <option value="auto">Smallest that fits{suggested ? ` (${suggested.name})` : ''}</option>
              <option value="finished">Finished size + marks (no larger sheet)</option>
              {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.w} × {s.h} mm</option>)}
              <option value="custom">Custom…</option>
            </select>
          </label>
          {sheetId === 'custom' && <div className="grid grid-cols-2 gap-2">
            <label className={lbl}>Sheet width (mm)<input type="number" min={50} value={custom.w} onChange={(e) => setCustom((c) => ({ ...c, w: Math.max(50, Number(e.target.value) || 0) }))} aria-label="Sheet width mm" className={field} /></label>
            <label className={lbl}>Sheet height (mm)<input type="number" min={50} value={custom.h} onChange={(e) => setCustom((c) => ({ ...c, h: Math.max(50, Number(e.target.value) || 0) }))} aria-label="Sheet height mm" className={field} /></label>
          </div>}
          {sheetId !== 'finished' && <div role="radiogroup" aria-label="Sheet orientation" className="flex flex-wrap gap-1.5">{(['auto', 'portrait', 'landscape'] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={landscape === k} onClick={() => setLandscape(k)} className={chip(landscape === k)}>{k === 'auto' ? 'Best orientation' : k[0].toUpperCase() + k.slice(1)}</button>)}</div>}
          {sheetId !== 'finished' && <div role="radiogroup" aria-label="Print scale" className="flex flex-wrap gap-1.5">
            <button type="button" role="radio" aria-checked={o.mode === 'actual'} onClick={() => set({ mode: 'actual' })} className={chip(o.mode === 'actual')}>Actual size (100 %)</button>
            <button type="button" role="radio" aria-checked={o.mode === 'fit'} onClick={() => set({ mode: 'fit' })} className={chip(o.mode === 'fit')}>Fit to print</button>
          </div>}
          <div className="grid grid-cols-2 gap-2">
            <label className={lbl}>Printer margin (mm)<input type="number" min={0} max={20} step={0.5} value={o.margin} onChange={(e) => set({ margin: Math.max(0, Number(e.target.value) || 0) })} aria-label="Printer margin mm" className={field} /></label>
            <label className={lbl}>Crop marks<select aria-label="Crop mark type" value={o.markType} onChange={(e) => set({ markType: Number(e.target.value) as MarkType })} className={field}>{MARK_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label className={lbl}>Mark length (mm)<input type="number" min={2} max={15} step={0.5} value={o.markLen} onChange={(e) => set({ markLen: Math.max(2, Number(e.target.value) || 0) })} aria-label="Mark length mm" className={field} /></label>
            <label className={lbl}>Mark offset (mm)<input type="number" min={0} max={10} step={0.5} value={o.markOffset} onChange={(e) => set({ markOffset: Math.max(0, Number(e.target.value) || 0) })} aria-label="Mark offset mm" className={field} /></label>
            <label className={lbl}>Mark weight (mm)<input type="number" min={0.05} max={1} step={0.05} value={o.markWeight} onChange={(e) => set({ markWeight: Math.max(0.05, Number(e.target.value) || 0) })} aria-label="Mark weight mm" className={field} /></label>
            <label className={lbl}>Cut mark colour<input type="color" value={o.cutColour} onChange={(e) => set({ cutColour: e.target.value })} aria-label="Cut mark colour" className="mt-1 h-9 w-full rounded-xl border border-mt-border bg-mt-bg" /></label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={o.foldMarks} onChange={(e) => set({ foldMarks: e.target.checked })} /> Fold marks (green)</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={o.info} onChange={(e) => set({ info: e.target.checked })} /> Info line</label>
          </div>
          {allowRepeat && <div className="grid grid-cols-3 gap-2">
            <label className={lbl}>Across<input type="number" min={1} max={20} value={o.cols} onChange={(e) => set({ cols: Math.max(1, Number(e.target.value) || 1) })} aria-label="Items across" className={field} /></label>
            <label className={lbl}>Down<input type="number" min={1} max={20} value={o.rows} onChange={(e) => set({ rows: Math.max(1, Number(e.target.value) || 1) })} aria-label="Items down" className={field} /></label>
            <label className={lbl}>Gap (mm)<input type="number" min={0} max={30} step={0.5} value={o.gap} onChange={(e) => set({ gap: Math.max(0, Number(e.target.value) || 0) })} aria-label="Gap between items mm" className={field} /></label>
            {sheetId !== 'finished' && <button type="button" onClick={() => { const s = sheetFor(landscape === 'landscape'); if (!s) return; const m = maxUp(job, { ...o, sheet: s }); set({ cols: m.cols, rows: m.rows, rotate: m.rotate }); }} className="col-span-3 h-8 rounded-full border border-mt-border text-[12.5px] font-semibold">Fill the sheet (most copies)</button>}
          </div>}
          <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-dashed border-mt-border text-[13px] cursor-pointer">
            <Upload size={15} /><span className="truncate">{art ? art.name : 'Your artwork for the print file (PDF, PNG or JPG)'}</span>
            <input type="file" accept="application/pdf,image/png,image/jpeg" className="sr-only" aria-label="Artwork for print file" onChange={(e) => pickArt(e.target.files?.[0])} />
          </label>
          <p className="text-[11.5px] text-mt-muted">A PDF with a TrimBox is placed by its own bleed box; a PDF without one, or an image, should be the full size including bleed ({job.trimW + 2 * job.bleed} × {job.trimH + 2 * job.bleed} mm). Images cover the area keeping their proportions.</p>
        </div>
        <div>
          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(tpl)}`} alt={`Press sheet preview: ${layout.sheet.name} ${layout.sheet.w} × ${layout.sheet.h} mm, ${o.mode === 'fit' ? `fit to print ${Math.round(layout.scale * 1000) / 10} %` : 'actual size'}`} className="mx-auto w-full max-h-[460px] object-contain bg-white rounded-xl border border-mt-border" />
          <p className="mt-2 text-[12.5px] tabular-nums" aria-live="polite" data-testid="press-summary">
            Sheet {layout.sheet.name} · {layout.sheet.w} × {layout.sheet.h} mm · {o.mode === 'fit' && layout.scale < 1 ? <b>scaled to {Math.round(layout.scale * 1000) / 10} %</b> : <b>actual size</b>} · printed piece {Math.round(job.trimW * layout.scale * 10) / 10} × {Math.round(job.trimH * layout.scale * 10) / 10} mm{layout.items.length > 1 ? ` · ${layout.items.length} up` : ''}
          </p>
          {layout.warnings.map((w) => <p key={w} role="alert" className={`mt-1 text-[12.5px] ${layout.fits ? 'text-amber-700 dark:text-amber-300' : 'text-rose-600'}`}>{w}</p>)}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => dlTemplate('pdf')} disabled={busy} className="h-10 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Working template · PDF</button>
            <button type="button" onClick={() => dlTemplate('svg')} className="h-10 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Working template · SVG</button>
            <button type="button" onClick={dlPrint} disabled={busy || !layout.fits} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Print-ready PDF</button>
          </div>
          {msg && <p className="mt-2 text-[12.5px] text-emerald-700 dark:text-emerald-300" role="status">{msg}</p>}
          {err && <p role="alert" className="mt-2 text-[12.5px] text-rose-600">{err}</p>}
          <p className="mt-2 text-[11.5px] text-mt-muted">Print the PDF at 100 % / “Actual size” in the print dialog (not “Fit”) — any scaling is already done here. Check the first copy with a ruler; your printer’s own margin may differ from {o.margin} mm.</p>
        </div>
      </div>
    </section>
  );
}
