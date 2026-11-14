'use client';

// Book & binding calculator: perfect binding, saddle stitch and hardcover.
// Spine from the paper's caliper (entered, or estimated and labelled as
// such), cover spread with bleed, safe area, folds, scores and crop marks,
// a downloadable spec and template, and "Open cover in Design Editor".

import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { PAPER_PROFILES, calculateBook, coverEditorUrl, coverTemplateSvg, specText, type BookSpec } from '@/lib/binding';
import { PAPER_SIZES } from '@/lib/printSizes';

const KEY = 'mt:binding';
const DEFAULT: BookSpec = { trimW: 210, trimH: 297, pages: 120, sides: 'double', paperGsm: 100, paperProfile: 'uncoated', paperCaliperUm: null, coverGsm: 300, coverProfile: 'board', coverCaliperUm: null, coverMaterial: 'Gloss laminated board', finish: 'matt', binding: 'perfect', bleed: 3, safe: 5, insertLeaves: 0, insertCaliperUm: null, hingeScore: 6, glueAllowance: 0, selfCover: true, boardMm: 2.5, squareMm: 3, jointMm: 7, turnInMm: 15, endpaperGsm: 140, endpaperCaliperUm: null };
const SIZE_GROUPS = ['A sizes', 'B sizes', 'Book sizes', 'US sizes'];
function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function BindingCalculator() {
  const [s, setS] = useState<BookSpec>(DEFAULT);
  const [sizeId, setSizeId] = useState('a4');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v?.s) { setS({ ...DEFAULT, ...v.s }); setSizeId(v.sizeId || 'custom'); } } catch { /* none */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ s, sizeId })); } catch { /* full */ } }, [s, sizeId]);
  const set = (o: Partial<BookSpec>) => setS((x) => ({ ...x, ...o }));
  const r = useMemo(() => calculateBook(s), [s]);
  const svg = useMemo(() => coverTemplateSvg(r), [r]);
  const name = `${s.binding}-${s.trimW}x${s.trimH}-${r.pagesUsed}pp`;

  const pdf = async () => {
    setBusy(true); setErr(null);
    try {
      const { svgToPdfBlob } = await import('@/lib/svgToPdf');
      const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
      save(await svgToPdfBlob(svg, Number(m[1]), Number(m[2])), `${name}-cover-template.pdf`);
    } catch { setErr('The PDF could not be made in this browser — download the SVG instead.'); }
    setBusy(false);
  };

  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px]';
  const chip = (on: boolean) => `h-9 px-3 rounded-xl border text-[12.5px] font-semibold ${on ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`;
  const num = (label: string, v: number | null | undefined, on: (n: number | null) => void, o: { min?: number; step?: number; placeholder?: string; optional?: boolean } = {}) => (
    <label className="block text-[12px] text-mt-muted">{label}
      <input type="number" min={o.min ?? 0} step={o.step ?? 'any'} value={v ?? ''} placeholder={o.placeholder} aria-label={label}
        onChange={(e) => { const t = e.target.value; on(t === '' && o.optional ? null : Math.max(o.min ?? 0, Number(t) || 0)); }} className={field} />
    </label>
  );
  const sel = (label: string, v: string, on: (x: string) => void, opts: [string, string][]) => (
    <label className="block text-[12px] text-mt-muted">{label}<select aria-label={label} value={v} onChange={(e) => on(e.target.value)} className={field}>{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
  );
  const h3 = 'text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted';
  const paperOpts = PAPER_PROFILES.filter((p) => p.id !== 'board').map((p) => [p.id, p.label] as [string, string]);

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5" aria-label="Book details">
        <section className="space-y-2">
          <h3 className={h3}>Binding</h3>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Binding">
            {([['perfect', 'Perfect bound'], ['saddle', 'Saddle stitch'], ['hardcover', 'Hardcover']] as const).map(([b, l]) => <button key={b} type="button" role="radio" aria-checked={s.binding === b} onClick={() => set({ binding: b })} className={chip(s.binding === b)}>{l}</button>)}
          </div>
        </section>
        <section className="space-y-2">
          <h3 className={h3}>Finished size</h3>
          <select aria-label="Finished size" value={sizeId} onChange={(e) => { const id = e.target.value; setSizeId(id); const p = PAPER_SIZES.find((x) => x.id === id); if (p) set({ trimW: p.w, trimH: p.h }); }} className={field}>
            {SIZE_GROUPS.map((g) => <optgroup key={g} label={g}>{PAPER_SIZES.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.label} — {p.w} × {p.h} mm</option>)}</optgroup>)}
            <option value="custom">Custom size</option>
          </select>
          <div className="grid grid-cols-2 gap-2">{num('Width (mm)', s.trimW, (n) => { setSizeId('custom'); set({ trimW: n || 1 }); }, { min: 1 })}{num('Height (mm)', s.trimH, (n) => { setSizeId('custom'); set({ trimH: n || 1 }); }, { min: 1 })}</div>
        </section>
        <section className="space-y-2">
          <h3 className={h3}>Inside pages</h3>
          <div className="grid grid-cols-2 gap-2">
            {num('Number of pages', s.pages, (n) => set({ pages: Math.round(n || 1) }), { min: 1, step: 1 })}
            {sel('Printed', s.sides, (v) => set({ sides: v as BookSpec['sides'] }), [['double', 'Both sides'], ['single', 'One side']])}
            {num('Paper weight (gsm)', s.paperGsm, (n) => set({ paperGsm: n || 1 }), { min: 1 })}
            {sel('Paper type', s.paperProfile, (v) => set({ paperProfile: v }), paperOpts)}
            {sel('Finish', s.finish || 'matt', (v) => set({ finish: v as BookSpec['finish'] }), [['matt', 'Matt'], ['gloss', 'Gloss'], ['silk', 'Silk'], ['uncoated', 'Uncoated']])}
            {num('Caliper (µm) — from data sheet', s.paperCaliperUm, (n) => set({ paperCaliperUm: n }), { optional: true, placeholder: `≈ ${r.caliperSource.text === 'estimated' ? r.textCaliperUm : ''} est.` })}
          </div>
          <div className="grid grid-cols-2 gap-2">{num('Inserts (extra leaves)', s.insertLeaves, (n) => set({ insertLeaves: Math.round(n || 0) }), { step: 1 })}{num('Insert caliper (µm)', s.insertCaliperUm, (n) => set({ insertCaliperUm: n }), { optional: true, placeholder: 'same as text' })}</div>
        </section>
        <section className="space-y-2">
          <h3 className={h3}>{s.binding === 'hardcover' ? 'Case wrap' : 'Cover'}</h3>
          {s.binding === 'saddle' && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={s.selfCover !== false} onChange={(e) => set({ selfCover: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Self cover (cover printed on the same paper, part of the page count)</label>}
          {!(s.binding === 'saddle' && s.selfCover !== false) && <div className="grid grid-cols-2 gap-2">
            {num('Cover weight (gsm)', s.coverGsm, (n) => set({ coverGsm: n || 1 }), { min: 1 })}
            {num('Cover caliper (µm)', s.coverCaliperUm, (n) => set({ coverCaliperUm: n }), { optional: true, placeholder: `≈ ${r.coverCaliperUm} est.` })}
            {sel('Cover stock', s.coverProfile, (v) => set({ coverProfile: v }), PAPER_PROFILES.map((p) => [p.id, p.label]))}
            <label className="block text-[12px] text-mt-muted">Cover material<input value={s.coverMaterial || ''} onChange={(e) => set({ coverMaterial: e.target.value })} aria-label="Cover material" className={field} placeholder="e.g. matt laminated board" /></label>
          </div>}
          {s.binding === 'perfect' && <div className="grid grid-cols-2 gap-2">{num('Hinge score from spine (mm)', s.hingeScore, (n) => set({ hingeScore: n ?? 0 }))}{num('Spine / glue allowance (mm)', s.glueAllowance, (n) => set({ glueAllowance: n ?? 0 }))}</div>}
          {s.binding === 'hardcover' && <div className="grid grid-cols-2 gap-2">
            {num('Board thickness (mm)', s.boardMm, (n) => set({ boardMm: n ?? 0 }))}
            {num('Squares / overhang (mm)', s.squareMm, (n) => set({ squareMm: n ?? 0 }))}
            {num('Joint / hinge gap (mm)', s.jointMm, (n) => set({ jointMm: n ?? 0 }))}
            {num('Turn-in (mm)', s.turnInMm, (n) => set({ turnInMm: n ?? 0 }))}
            {num('Endpaper weight (gsm)', s.endpaperGsm, (n) => set({ endpaperGsm: n || 1 }), { min: 1 })}
            {num('Endpaper caliper (µm)', s.endpaperCaliperUm, (n) => set({ endpaperCaliperUm: n }), { optional: true, placeholder: 'estimated' })}
          </div>}
          {s.binding !== 'hardcover' && <div className="grid grid-cols-2 gap-2">{num('Bleed (mm)', s.bleed, (n) => set({ bleed: n ?? 0 }))}{num('Safe area (mm)', s.safe, (n) => set({ safe: n ?? 0 }))}</div>}
        </section>
      </aside>

      <div className="space-y-4">
        <section className="rounded-3xl border border-mt-border bg-mt-surface p-5" aria-label="Binding summary">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[[`${r.spineMm} mm`, s.binding === 'saddle' ? 'Folded thickness' : s.binding === 'hardcover' ? 'Spine (case)' : 'Spine width'], [`${r.cover.widthMm} × ${r.cover.heightMm}`, s.binding === 'hardcover' ? 'Case wrap (mm)' : 'Cover flat, with bleed (mm)'], [String(r.pagesUsed), `Pages${r.blanksAdded ? ` (+${r.blanksAdded} blank)` : ''}`], [r.sheets ? `${r.sheets} sheets` : `${r.leaves} leaves`, `Book block ${r.blockMm} mm`]].map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-mt-surface2/60 p-3"><p className="text-xl font-semibold tabular-nums">{v}</p><p className="text-[12px] text-mt-muted">{l}</p></div>
            ))}
          </div>
          <p className={`mt-3 text-[13px] ${r.caliperSource.text === 'estimated' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {r.caliperSource.text === 'estimated' ? `Estimate: paper caliper ${r.textCaliperUm} µm worked out from ${s.paperGsm} gsm. Enter the caliper from your paper’s data sheet (or ask your printer) for an exact spine.` : `Exact: spine from your paper caliper of ${r.textCaliperUm} µm.`}
          </p>
          {r.warnings.map((w) => <p key={w} role="alert" className="mt-1 text-[13px] text-rose-600">{w}</p>)}
        </section>

        <section className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`Cover template: ${r.cover.panels.map((p) => `${p.name} ${p.w} mm`).join(', ')}`} className="mx-auto w-full max-h-[520px] object-contain bg-white rounded-xl" />
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            <a href={coverEditorUrl(r)} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center gap-2">Open cover in Design Editor <ExternalLink size={15} /></a>
            <button type="button" onClick={pdf} disabled={busy} className="h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Template · PDF</button>
            <button type="button" onClick={() => save(new Blob([svg], { type: 'image/svg+xml' }), `${name}-cover-template.svg`)} className="h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Template · SVG</button>
            <button type="button" onClick={() => save(new Blob([specText(s, r)], { type: 'text/plain' }), `${name}-print-spec.txt`)} className="h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center gap-2"><FileText size={15} /> Print spec</button>
          </div>
          {err && <p role="alert" className="mt-2 text-center text-[13px] text-rose-600">{err}</p>}
        </section>

        <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className={h3}>Panels (from the left edge)</h3>
            <table className="mt-2 w-full text-[13px] tabular-nums"><tbody>{r.cover.panels.map((p, i) => <tr key={i} className="border-t border-mt-border"><td className="py-1.5">{p.name}</td><td className="py-1.5 text-right">{p.x} mm</td><td className="py-1.5 text-right">{p.w} mm</td></tr>)}</tbody></table>
            {r.hardcover && <p className="mt-2 text-[13px] text-mt-muted">Boards {r.hardcover.boardW} × {r.hardcover.boardH} mm (×2) · spine board {r.hardcover.spineBoardW} mm · endpapers 2 × {r.hardcover.endpaper.w} × {r.hardcover.endpaper.h} mm</p>}
          </div>
          <div>
            <h3 className={h3}>Folds, scores &amp; creases</h3>
            <table className="mt-2 w-full text-[13px] tabular-nums"><tbody>{r.cover.folds.map((f, i) => <tr key={i} className="border-t border-mt-border"><td className="py-1.5">{f.label}</td><td className="py-1.5 text-right">{f.x} mm</td></tr>)}</tbody></table>
            {r.creep && <><h3 className={`${h3} mt-4`}>Creep per sheet</h3><p className="mt-1 text-[13px] text-mt-muted">Shift page content toward the spine: {r.creep.shiftsMm.map((v, i) => `sheet ${i + 1}: ${v} mm`).join(' · ')}. Apply it in your imposition software, and check on a folded dummy.</p></>}
          </div>
          <div className="md:col-span-2"><h3 className={h3}>Assumptions</h3><ul className="mt-1 list-disc pl-5 text-[12.5px] text-mt-muted space-y-0.5">{r.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
        </section>
      </div>
    </div>
  );
}
