'use client';

// The few settings a print set needs, shared by the Print Size Calculator and
// Export → Print files in the editor. Simple shows paper + job name + client;
// Pro adds the printer margin, crop-mark style and the full job details.
// The plan (sheet, orientation, scale) updates live.

import { useMemo } from 'react';
import { SHEETS, type MarkType } from '@/lib/print/pressSheet';
import { DEFAULT_PACKAGE, planSheet, type PackageOptions, type PrintSelection } from '@/lib/print/printPackage';
import { EMPTY_DETAILS, type JobDetails } from '@/lib/print/jobReport';
import type { PrintJobInfo } from '@/lib/print/printJob';

export interface PrintOutput { options: PackageOptions; details: JobDetails; files: PrintSelection; zip: boolean }

const KEY = 'mt:printPeople';
export function initialOutput(jobName: string): PrintOutput {
  let saved: Partial<JobDetails> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { /* storage unavailable */ }
  return {
    options: { ...DEFAULT_PACKAGE },
    details: { ...EMPTY_DETAILS, jobName, designer: saved.designer || '', company: saved.company || '', contact: saved.contact || '' },
    files: { actual: true, fit: true, normal: true, report: true }, zip: true,
  };
}
export function rememberOutput(o: PrintOutput) {
  try { localStorage.setItem(KEY, JSON.stringify({ designer: o.details.designer, company: o.details.company, contact: o.details.contact })); } catch { /* storage unavailable */ }
}

const r1 = (n: number) => Math.round(n * 10) / 10;
export const pfField = 'mt-1 h-9 w-full rounded-xl border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';
export const pfLabel = 'block text-[12px] text-mt-muted';

export function PrintOutputSettings({ job, value, onChange, pro, showFiles = false }: { job: PrintJobInfo; value: PrintOutput; onChange: (v: PrintOutput) => void; pro: boolean; showFiles?: boolean }) {
  const o = value.options;
  const setO = (p: Partial<PackageOptions>) => onChange({ ...value, options: { ...o, ...p } });
  const setD = (p: Partial<JobDetails>) => onChange({ ...value, details: { ...value.details, ...p } });
  const setF = (p: Partial<PrintSelection>) => onChange({ ...value, files: { ...value.files, ...p } });
  const actual = useMemo(() => planSheet(job, 'actual', o.actualSheet, o), [job, o]);
  const fit = useMemo(() => planSheet(job, 'fit', o.fitSheet, o), [job, o]);
  const txt = (k: keyof JobDetails, label: string, wide = false) => (
    <label className={`${pfLabel}${wide ? ' col-span-2' : ''}`}>{label}<input value={value.details[k]} onChange={(e) => setD({ [k]: e.target.value } as Partial<JobDetails>)} aria-label={label} className={pfField} /></label>
  );
  const line = (on: boolean | null, key: keyof PrintSelection | null, title: string, body: React.ReactNode) => (
    <li className="flex items-start gap-2 px-3 py-2">
      {showFiles && key && <input type="checkbox" aria-label={`Include ${title}`} checked={!!on} onChange={(e) => setF({ [key]: e.target.checked } as Partial<PrintSelection>)} className="mt-0.5 accent-[rgb(var(--mt-accent))]" />}
      <span><b>{title}</b> <span className="text-mt-muted">— {body}</span></span>
    </li>
  );

  return (
    <div className="space-y-3" role="group" aria-label="Print settings">
      <div className="grid grid-cols-2 gap-2.5">
        <label className={pfLabel}>Actual size on
          <select aria-label="Actual size paper" value={o.actualSheet} onChange={(e) => setO({ actualSheet: e.target.value })} className={pfField}>
            <option value="auto">Smallest that fits</option>
            {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className={pfLabel}>Fit to print on
          <select aria-label="Fit to print paper" value={o.fitSheet} onChange={(e) => setO({ fitSheet: e.target.value })} className={pfField}>
            {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {pro && <>
          <label className={pfLabel}>Printer margin (mm)<input type="number" min={0} max={20} step={0.5} value={o.margin} aria-label="Printer no-print margin mm" onChange={(e) => setO({ margin: Math.max(0, Number(e.target.value) || 0) })} className={pfField} /></label>
          <label className={pfLabel}>Crop marks<select aria-label="Crop marks type" value={o.markType} onChange={(e) => setO({ markType: Number(e.target.value) as MarkType })} className={pfField}>
            <option value={1}>Type 1 · every cut line</option><option value={2}>Type 2 · corner brackets</option><option value={3}>Type 3 · brackets + crosses</option><option value={4}>Type 4 · registration targets</option>
          </select></label>
        </>}
      </div>

      <ul aria-label="Print plan" data-testid="print-plan" className="rounded-2xl border border-mt-border divide-y divide-mt-border text-[12.5px] bg-mt-surface">
        {line(value.files.actual, 'actual', 'Actual size', actual.fits ? <>{actual.sheet.name}, 100 %, cut{job.folds.length ? ' + fold' : ''} marks</> : <span className="text-rose-600">{actual.warnings[0]}</span>)}
        {line(value.files.fit, 'fit', 'Fit to print', <>{fit.sheet.name}, {fit.scale < 1 ? <b className="text-mt-ink">scaled to {r1(fit.scale * 100)} %</b> : '100 % (already fits)'}, inside the {o.margin} mm no-print edge</>)}
        {line(value.files.normal, 'normal', 'Normal', <>{job.trimW + 2 * job.bleed} × {job.trimH + 2 * job.bleed} mm, bleed only, no marks</>)}
        {line(value.files.report, 'report', 'Job report', <>one branded PDF: preview, sizes, folds, how to print, approval</>)}
      </ul>

      <div className="grid grid-cols-2 gap-2.5">
        {txt('jobName', 'Job name')}{txt('client', 'Client')}
        {pro && <>{txt('designer', 'Designer')}{txt('company', 'Company')}{txt('contact', 'Contact (phone / email)')}{txt('quantity', 'Quantity')}{txt('stock', 'Paper stock')}{txt('colours', 'Colours')}
          <label className={`${pfLabel} col-span-2`}>Notes for the printer<textarea value={value.details.notes} onChange={(e) => setD({ notes: e.target.value })} aria-label="Notes for the printer" rows={2} className="mt-1 w-full rounded-xl border border-mt-input-border bg-mt-surface px-2.5 py-1.5 text-[13px]" /></label>
        </>}
      </div>
      {showFiles && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={value.zip} onChange={(e) => onChange({ ...value, zip: e.target.checked })} aria-label="Download as one zip" className="accent-[rgb(var(--mt-accent))]" /> One .zip (otherwise separate PDFs)</label>}
    </div>
  );
}
