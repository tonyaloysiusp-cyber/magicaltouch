'use client';

// Size chart for drafted garments: one column per size, one row per
// measurement. Every size is drafted from its own column — real grading,
// never a scaled copy of another size. Import a manufacturer's chart as CSV
// (a row per size: size, measurements…, qty). Δ shows the grade between
// neighbouring sizes so jumps and typing mistakes stand out.

import { useRef, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import type { Field, Measures } from '@/lib/textile/draft';
import { parseChartCsv, type ChartRow } from '@/lib/textile/sizeChart';

export type { ChartRow } from '@/lib/textile/sizeChart';

export function SizeChart({ fields, rows, onChange, unit, styleDefaults, pro }: { fields: Field[]; rows: ChartRow[]; onChange: (rows: ChartRow[]) => void; unit: 'mm' | 'cm' | 'in'; styleDefaults: Record<string, number>; pro: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const k = unit === 'mm' ? 10 : unit === 'in' ? 1 / 2.54 : 1;
  const show = (cm: number | undefined) => (cm == null ? '' : String(Math.round(cm * k * 100) / 100));
  const toCm = (n: number) => n / k;
  const visible = fields.filter((f) => pro || !f.style);
  const setCell = (i: number, key: string, v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    onChange(rows.map((r, j) => { if (j !== i) return r; const m = { ...r.m }; if (v.trim() === '' || !Number.isFinite(n)) delete m[key]; else m[key] = Math.round(toCm(n) * 1000) / 1000; return { ...r, m }; }));
  };
  const add = () => { const last = rows[rows.length - 1]; onChange([...rows, { name: '', qty: 1, m: last ? { ...last.m } : {} }]); };
  const importCsv = async (f?: File | null) => {
    if (!f) return;
    const r = parseChartCsv(await f.text(), fields, toCm);
    if (!r.rows.length) { setNote('No sizes found. Use a header row like: size, bust, waist, hip, …, qty — one row per size.'); return; }
    onChange(r.rows);
    setNote(`${r.rows.length} sizes imported (values read as ${unit === 'in' ? 'inches' : unit}).${r.unknown.length ? ` Ignored columns: ${r.unknown.join(', ')}.` : ''}`);
  };
  const cell = 'h-8 w-20 rounded-md border border-mt-border bg-mt-bg px-1.5 text-[12.5px] tabular-nums';

  return (
    <div role="group" aria-label="Size chart" className="space-y-2">
      <p className="text-[12px] text-mt-muted">Your size chart in {unit === 'in' ? 'inches' : unit}: each size is drafted from its own measurements. Mark charts that are not verified as such in the tech pack notes.</p>
      <div className="overflow-x-auto rounded-xl border border-mt-border">
        <table className="text-[12.5px]">
          <thead>
            <tr className="bg-mt-surface2/60">
              <th className="px-2 py-1.5 text-left font-semibold">Measurement</th>
              {rows.map((r, i) => (
                <th key={i} className="px-1 py-1">
                  <div className="flex items-center gap-1">
                    <input value={r.name} placeholder="Size" onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={`Size name ${i + 1}`} className={`${cell} font-semibold`} />
                    <button type="button" aria-label={`Remove size ${r.name || i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-mt-faint hover:text-rose-600"><Trash2 size={13} /></button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <tr key={f.key} className="border-t border-mt-border">
                <td className="px-2 py-1 whitespace-nowrap">{f.label}{f.style && <span className="text-mt-faint"> · style</span>}</td>
                {rows.map((r, i) => {
                  const prev = i > 0 ? rows[i - 1].m[f.key] : undefined, cur = r.m[f.key];
                  const delta = prev != null && cur != null ? Math.round((cur - prev) * k * 10) / 10 : null;
                  return (
                    <td key={i} className="px-1 py-1">
                      <input inputMode="decimal" value={show(cur)} placeholder={f.style ? show(styleDefaults[f.key]) : ''} onChange={(e) => setCell(i, f.key, e.target.value)} aria-label={`${f.label} — size ${r.name || i + 1}`} className={cell} />
                      {delta != null && <span className={`block text-[10.5px] ${delta < 0 ? 'text-rose-600' : 'text-mt-faint'}`}>Δ {delta > 0 ? '+' : ''}{delta}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-mt-border bg-mt-surface2/40">
              <td className="px-2 py-1 font-semibold">Garments</td>
              {rows.map((r, i) => <td key={i} className="px-1 py-1"><input type="number" min={0} value={r.qty} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, qty: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : x)))} aria-label={`Quantity size ${r.name || i + 1}`} className={cell} /></td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={add} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Plus size={13} /> Add size</button>
        <button type="button" onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Upload size={13} /> Import size chart (CSV)</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {note && <p role="status" className="text-[12px] text-mt-muted">{note}</p>}
    </div>
  );
}
