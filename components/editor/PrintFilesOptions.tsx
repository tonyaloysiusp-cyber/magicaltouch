'use client';

// Export → Print files: the three files a print job needs, made from the
// design and the job it came with from the Print Size Calculator.
//  · Actual size  — 100 % on a sheet big enough for bleed + marks (A4 → A3)
//  · Fit to print — scaled into the printable area of the paper you print on
//  · Information  — one page: preview, sizes, folds, files, who made it
// The plan (sheet, orientation, scale) updates live as options change.

import { useMemo } from 'react';
import { SHEETS, type MarkType } from '@/lib/print/pressSheet';
import { planSheet, type PackageOptions } from '@/lib/print/printPackage';
import type { PrintJobInfo } from '@/lib/print/printJob';
import type { InfoPeople } from '@/lib/print/infoSheet';
import { cx } from './shell/ui';

export interface PrintFilesSettings {
  options: PackageOptions;
  people: InfoPeople;
  files: { actual: boolean; fit: boolean; info: boolean };
  zip: boolean;
}

const PEOPLE_KEY = 'mt:printPeople';
export function loadPeople(jobName: string): InfoPeople {
  let saved: Partial<InfoPeople> = {};
  try { saved = JSON.parse(localStorage.getItem(PEOPLE_KEY) || '{}') || {}; } catch { /* storage unavailable */ }
  return { jobName, client: '', designer: saved.designer || '', company: saved.company || '', contact: saved.contact || '', notes: '' };
}
export function savePeople(p: InfoPeople) {
  try { localStorage.setItem(PEOPLE_KEY, JSON.stringify({ designer: p.designer, company: p.company, contact: p.contact })); } catch { /* storage unavailable */ }
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function PrintFilesOptions({ job, fromCalculator, value, onChange }: { job: PrintJobInfo; fromCalculator: boolean; value: PrintFilesSettings; onChange: (v: PrintFilesSettings) => void }) {
  const o = value.options;
  const set = (p: Partial<PrintFilesSettings>) => onChange({ ...value, ...p });
  const setO = (p: Partial<PackageOptions>) => set({ options: { ...o, ...p } });
  const setP = (p: Partial<InfoPeople>) => set({ people: { ...value.people, ...p } });
  const actual = useMemo(() => planSheet(job, 'actual', o.actualSheet, o), [job, o]);
  const fit = useMemo(() => planSheet(job, 'fit', o.fitSheet, o), [job, o]);

  const field = 'mt-1 h-9 w-full rounded-xl border border-mt-input-border bg-mt-surface px-2.5 text-sm';
  const lbl = 'block text-[12px] text-mt-muted';

  return (
    <section aria-label="Print files options" className="flex flex-col gap-4">
      <div className="rounded-2xl border border-mt-border bg-mt-surface2/60 p-3 text-[12.5px] leading-snug">
        <p className="font-semibold text-sm">{job.title}</p>
        <p className="text-mt-muted">{job.trimW} × {job.trimH} mm flat{job.folded ? ` → ${r1(job.folded.w)} × ${r1(job.folded.h)} mm folded` : ''} · {job.bleed} mm bleed · {job.sides.length} {job.sides.length === 1 ? 'page' : `pages (${job.sides.join(', ')})`}{job.folds.length ? ` · ${job.folds.length} fold${job.folds.length > 1 ? 's' : ''}` : ''}</p>
        {!fromCalculator && <p className="mt-1 text-mt-faint">This design didn’t come from the Print Size Calculator, so there are no fold marks. For a folded leaflet or a book cover, start it from the calculator.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={lbl}>Actual size — print on
          <select aria-label="Actual size paper" value={o.actualSheet} onChange={(e) => setO({ actualSheet: e.target.value })} className={field}>
            <option value="auto">Smallest that fits</option>
            {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.w} × {s.h})</option>)}
          </select>
        </label>
        <label className={lbl}>Fit to print — paper
          <select aria-label="Fit to print paper" value={o.fitSheet} onChange={(e) => setO({ fitSheet: e.target.value })} className={field}>
            {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.w} × {s.h})</option>)}
          </select>
        </label>
        <label className={lbl}>Printer margin (mm)
          <input type="number" min={0} max={20} step={0.5} value={o.margin} aria-label="Printer no-print margin mm" onChange={(e) => setO({ margin: Math.max(0, Number(e.target.value) || 0) })} className={field} />
        </label>
        <label className={lbl}>Crop marks
          <select aria-label="Crop marks type" value={o.markType} onChange={(e) => setO({ markType: Number(e.target.value) as MarkType })} className={field}>
            <option value={1}>Type 1 · every cut line</option>
            <option value={2}>Type 2 · corner brackets</option>
            <option value={3}>Type 3 · brackets + crosses</option>
            <option value={4}>Type 4 · registration targets</option>
          </select>
        </label>
      </div>

      <ul aria-label="Print plan" data-testid="print-plan" className="rounded-2xl border border-mt-border divide-y divide-mt-border text-[12.5px]">
        <li className="flex items-start gap-2 p-2.5">
          <input type="checkbox" aria-label="Include actual size file" checked={value.files.actual} onChange={(e) => set({ files: { ...value.files, actual: e.target.checked } })} className="mt-0.5" />
          <span><b>1 · Actual size</b> — {actual.fits ? <>{actual.sheet.name} ({actual.sheet.w} × {actual.sheet.h} mm), <b>100 %</b>, cut{job.folds.length ? ' and fold' : ''} marks outside the artwork</> : <span className="text-rose-600">{actual.warnings[0]}</span>}</span>
        </li>
        <li className="flex items-start gap-2 p-2.5">
          <input type="checkbox" aria-label="Include fit to print file" checked={value.files.fit} onChange={(e) => set({ files: { ...value.files, fit: e.target.checked } })} className="mt-0.5" />
          <span><b>2 · Fit to print</b> — {fit.sheet.name} ({fit.sheet.w} × {fit.sheet.h} mm), {fit.scale < 1 ? <b>scaled to {r1(fit.scale * 100)} %</b> : <b>100 % (it already fits)</b>} · printed piece {r1(job.trimW * fit.scale)} × {r1(job.trimH * fit.scale)} mm · artwork, bleed and marks inside the {o.margin} mm no-print edge</span>
        </li>
        <li className="flex items-start gap-2 p-2.5">
          <input type="checkbox" aria-label="Include information sheet" checked={value.files.info} onChange={(e) => set({ files: { ...value.files, info: e.target.checked } })} className="mt-0.5" />
          <span><b>3 · Information sheet</b> — one A4 page: preview of every page, sizes, folds, both print files, the details below</span>
        </li>
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <label className={lbl}>Job name<input value={value.people.jobName} onChange={(e) => setP({ jobName: e.target.value })} aria-label="Job name" className={field} /></label>
        <label className={lbl}>Client<input value={value.people.client} onChange={(e) => setP({ client: e.target.value })} aria-label="Client" className={field} /></label>
        <label className={lbl}>Designer<input value={value.people.designer} onChange={(e) => setP({ designer: e.target.value })} aria-label="Designer" className={field} /></label>
        <label className={lbl}>Company<input value={value.people.company} onChange={(e) => setP({ company: e.target.value })} aria-label="Company" className={field} /></label>
        <label className={cx(lbl, 'col-span-2')}>Contact (phone / email, optional)<input value={value.people.contact} onChange={(e) => setP({ contact: e.target.value })} aria-label="Contact" className={field} /></label>
        <label className={cx(lbl, 'col-span-2')}>Notes for the printer (optional)<textarea value={value.people.notes} onChange={(e) => setP({ notes: e.target.value })} aria-label="Notes for the printer" rows={2} className="mt-1 w-full rounded-xl border border-mt-input-border bg-mt-surface px-2.5 py-1.5 text-sm" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.zip} onChange={(e) => set({ zip: e.target.checked })} aria-label="Download as one zip" /> Download as one .zip (otherwise separate PDFs)</label>
      <p className="text-[11px] text-mt-faint leading-snug">Vector PDFs: text and shapes stay sharp. Designer, company and contact are remembered in this browser only.</p>
    </section>
  );
}
