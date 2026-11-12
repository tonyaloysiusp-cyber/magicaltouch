'use client';

// Print Size & Bleed Calculator — paper and card sizes in mm, inches,
// pixels and points at any DPI, with bleed and safe area drawn to scale,
// plus "what size can my photo print?" and a one-click start in the editor.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, RotateCw } from 'lucide-react';
import { DPIS, PAPER_SIZES, maxPrintMm, printCalc } from '@/lib/printSizes';

export function PrintCalculator() {
  const [id, setId] = useState('a4');
  const [custom, setCustom] = useState({ w: 210, h: 297 });
  const [land, setLand] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [bleed, setBleed] = useState(3);
  const [safe, setSafe] = useState(5);
  const [photo, setPhoto] = useState({ w: 4000, h: 3000 });
  const base = id === 'custom' ? custom : PAPER_SIZES.find((p) => p.id === id)!;
  const [w, h] = land ? [Math.max(base.w, base.h), Math.min(base.w, base.h)] : [base.w, base.h];
  const c = useMemo(() => printCalc(w, h, dpi, bleed, safe), [w, h, dpi, bleed, safe]);
  const groups = [...new Set(PAPER_SIZES.map((p) => p.group))];
  const k = 260 / Math.max(c.bleedMm[0], c.bleedMm[1]);
  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px] text-mt-ink';
  const Row = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between gap-4 py-2 border-b border-mt-border last:border-0"><dt className="text-mt-muted">{l}</dt><dd className="font-semibold tabular-nums text-right">{v}</dd></div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-4 lg:sticky lg:top-20">
        <label className="block text-[12px] text-mt-muted">Size
          <select value={id} onChange={(e) => setId(e.target.value)} className={field}>
            {groups.map((g) => <optgroup key={g} label={g}>{PAPER_SIZES.filter((p) => p.group === g).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</optgroup>)}
            <option value="custom">Custom size…</option>
          </select>
        </label>
        {id === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-mt-muted">Width (mm)<input type="number" min={10} value={custom.w} onChange={(e) => setCustom({ ...custom, w: Number(e.target.value) || 0 })} className={field} /></label>
            <label className="text-[12px] text-mt-muted">Height (mm)<input type="number" min={10} value={custom.h} onChange={(e) => setCustom({ ...custom, h: Number(e.target.value) || 0 })} className={field} /></label>
          </div>
        )}
        <button type="button" onClick={() => setLand((v) => !v)} className="h-9 px-3 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5"><RotateCw size={14} /> {land ? 'Landscape' : 'Portrait'}</button>
        <div>
          <p className="text-[12px] text-mt-muted">Resolution (DPI)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{DPIS.map((d) => <button key={d} type="button" aria-pressed={dpi === d} onClick={() => setDpi(d)} className={`h-8 px-3 rounded-full border text-[13px] font-semibold ${dpi === d ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{d}</button>)}</div>
          <p className="mt-1.5 text-[11.5px] text-mt-muted">300 DPI for print, 150 for large posters seen from afar, 72–96 for screens.</p>
        </div>
        <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Bleed on each side</span><span className="text-mt-ink">{bleed} mm</span></span><input type="range" min={0} max={10} step={0.5} value={bleed} onChange={(e) => setBleed(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>
        <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Safe margin</span><span className="text-mt-ink">{safe} mm</span></span><input type="range" min={0} max={20} step={0.5} value={safe} onChange={(e) => setSafe(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="grid gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-mt-border bg-mt-surface2/60 p-5 grid place-items-center">
            <svg width={c.bleedMm[0] * k + 2} height={c.bleedMm[1] * k + 2} role="img" aria-label="Trim, bleed and safe area to scale">
              <rect x="1" y="1" width={c.bleedMm[0] * k} height={c.bleedMm[1] * k} fill="#FDE2E8" stroke="#F2708F" strokeDasharray="4 3" />
              <rect x={1 + bleed * k} y={1 + bleed * k} width={w * k} height={h * k} fill="#fff" stroke="#111" />
              <rect x={1 + (bleed + safe) * k} y={1 + (bleed + safe) * k} width={Math.max(0, (w - 2 * safe) * k)} height={Math.max(0, (h - 2 * safe) * k)} fill="none" stroke="#3B82C4" strokeDasharray="3 3" />
            </svg>
            <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] text-mt-muted">
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 bg-[#FDE2E8] ring-1 ring-[#F2708F]" /> Bleed</span>
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 bg-white ring-1 ring-black" /> Trim</span>
              <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 ring-1 ring-[#3B82C4]" /> Safe area</span>
            </div>
          </div>
          <dl className="rounded-3xl border border-mt-border bg-mt-surface p-5 text-[14px]">
            <Row l="Finished (trim) size" v={`${c.trimMm[0]} × ${c.trimMm[1]} mm`} />
            <Row l="In inches" v={`${c.inches[0]} × ${c.inches[1]} in`} />
            <Row l={`Pixels at ${dpi} DPI`} v={`${c.trimPx[0].toLocaleString()} × ${c.trimPx[1].toLocaleString()} px`} />
            <Row l="With bleed" v={`${c.bleedMm[0]} × ${c.bleedMm[1]} mm · ${c.bleedPx[0].toLocaleString()} × ${c.bleedPx[1].toLocaleString()} px`} />
            <Row l="Safe area (keep text inside)" v={`${c.safeMm[0]} × ${c.safeMm[1]} mm`} />
            <Row l="In points (PDF)" v={`${c.points[0]} × ${c.points[1]} pt`} />
            <Row l="Image size needed" v={`${c.megapixels} megapixels`} />
            <Link href={`/editor?w=${c.editorPx[0]}&h=${c.editorPx[1]}`} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-mt-primary px-4 text-[14px] font-semibold text-mt-onprimary">Design at this size <ArrowUpRight size={15} /></Link>
            <p className="mt-2 text-[12px] text-mt-muted">The editor adds bleed and crop marks when you download a print PDF.</p>
          </dl>
        </div>
        <section className="rounded-3xl border border-mt-border bg-mt-surface p-5">
          <h2 className="text-lg font-semibold">How big can my photo print?</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-[12px] text-mt-muted">Photo width (px)<input type="number" min={1} value={photo.w} onChange={(e) => setPhoto({ ...photo, w: Number(e.target.value) || 0 })} className={`${field} w-36`} /></label>
            <label className="text-[12px] text-mt-muted">Photo height (px)<input type="number" min={1} value={photo.h} onChange={(e) => setPhoto({ ...photo, h: Number(e.target.value) || 0 })} className={`${field} w-36`} /></label>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3 text-[14px]">
            {[300, 200, 150].map((d) => <li key={d} className="rounded-xl bg-mt-bg px-3 py-2"><span className="text-mt-muted">{d === 300 ? 'Sharp print' : d === 200 ? 'Good print' : 'Poster / far away'} ({d} DPI)</span><br /><b className="tabular-nums">{maxPrintMm(photo.w, d)} × {maxPrintMm(photo.h, d)} mm</b></li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
