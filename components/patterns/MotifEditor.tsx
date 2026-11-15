'use client';

// Edit single motifs inside the repeat tile: click a motif, then move, turn,
// resize, recolour or hide just that one. Copies across the tile edges follow
// automatically, so the pattern stays seamless.

import { useMemo, useState } from 'react';
import { MotifEdit, PatternSettings, layout, svgDataUrl, tileSvg } from '@/lib/patterns';

export function MotifEditor({ p, onChange }: { p: PatternSettings; onChange: (edits: Record<string, MotifEdit> | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const L = useMemo(() => layout({ ...p, edits: undefined }), [p]);
  const url = useMemo(() => svgDataUrl(tileSvg(p)), [p]);
  const edits = p.edits || {};
  const count = Object.keys(edits).length;
  // One clickable spot per motif (its copy that lies inside the tile).
  const spots = useMemo(() => {
    const seen = new Set<string>();
    return L.places.filter((q) => q.x >= 0 && q.y >= 0 && q.x < L.w && q.y < L.h && !seen.has(q.key) && !!seen.add(q.key));
  }, [L]);
  const cell = Math.max(24, p.tile);
  const view = 340, k = view / Math.max(L.w, L.h);
  const e: MotifEdit = (sel && edits[sel]) || {};
  const put = (patch: Partial<MotifEdit>) => {
    if (!sel) return;
    const next = { ...e, ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([key, v]) => v !== undefined && !(key === 's' && v === 1) && !(['dx', 'dy', 'r'].includes(key) && v === 0) && !(key === 'hide' && !v))) as MotifEdit;
    const all = { ...edits };
    if (Object.keys(clean).length) all[sel] = clean; else delete all[sel];
    onChange(Object.keys(all).length ? all : undefined);
  };
  const base = sel ? spots.find((q) => q.key === sel) : null;
  const colors = p.colors.length ? p.colors : ['#111111'];

  return (
    <div className="rounded-3xl border border-mt-border bg-mt-surface p-5" role="group" aria-label="Edit single motifs">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Edit single motifs</p>
          <p className="text-[12px] text-mt-muted">Click a motif in the tile to move, turn, resize, recolour or hide just that one. The repeat stays seamless.{count ? ` ${count} motif${count === 1 ? '' : 's'} edited.` : ''}</p>
        </div>
        <button type="button" className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Edit motifs'}</button>
      </div>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
          <div className="relative rounded-xl border border-mt-border overflow-hidden" style={{ width: L.w * k, height: L.h * k, backgroundImage: `url("${url}")`, backgroundSize: '100% 100%' }} aria-label="Tile motifs">
            <svg width={L.w * k} height={L.h * k} className="absolute inset-0">
              {spots.map((q, i) => {
                const edited = !!edits[q.key];
                const r = Math.max(8, cell * p.scale * q.s * 0.5 * k);
                return (
                  <circle key={q.key} cx={q.x * k} cy={q.y * k} r={r} role="button" aria-label={`Motif ${i + 1}${edited ? ' (edited)' : ''}`} tabIndex={0}
                    fill={sel === q.key ? 'rgba(59,130,196,.18)' : 'transparent'} stroke={sel === q.key ? '#3B82C4' : edited ? '#C9A86A' : 'rgba(15,23,42,.25)'} strokeWidth={sel === q.key ? 2 : 1} strokeDasharray={sel === q.key ? undefined : '3 3'}
                    style={{ cursor: 'pointer' }} onClick={() => setSel(q.key)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSel(q.key); } }} />
                );
              })}
            </svg>
          </div>
          <div className="space-y-2 text-[12.5px]">
            {!base ? <p className="text-mt-muted">Pick a motif in the tile.</p> : (
              <>
                <p className="font-semibold">Motif {spots.indexOf(base) + 1}</p>
                {([['dx', 'Move across', -0.5, 0.5, 0.01, 0], ['dy', 'Move down', -0.5, 0.5, 0.01, 0], ['r', 'Turn (°)', -180, 180, 1, 0], ['s', 'Size (×)', 0.3, 2.5, 0.05, 1]] as const).map(([key, label, min, max, step, def]) => (
                  <label key={key} className="block">
                    <span className="flex justify-between"><span>{label}</span><span className="tabular-nums text-mt-faint">{key === 'dx' || key === 'dy' ? `${Math.round(((e[key] as number) ?? def) * cell)} px` : (e[key] as number) ?? def}</span></span>
                    <input type="range" className="w-full" aria-label={label} min={min} max={max} step={step} value={(e[key] as number) ?? def} onChange={(ev) => put({ [key]: +ev.target.value } as Partial<MotifEdit>)} />
                  </label>
                ))}
                <div role="radiogroup" aria-label="Motif colour" className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1">Colour</span>
                  <button type="button" role="radio" aria-checked={e.c == null} onClick={() => put({ c: undefined })} className={`h-7 px-2 rounded-full border text-[11.5px] ${e.c == null ? 'border-[#3B82C4]' : 'border-mt-border'}`}>As pattern</button>
                  {colors.map((c, i) => <button key={i} type="button" role="radio" aria-checked={e.c === i} aria-label={`Colour ${i + 1}`} onClick={() => put({ c: i })} className={`h-7 w-7 rounded-full border-2 ${e.c === i ? 'border-[#3B82C4]' : 'border-white'}`} style={{ background: c, boxShadow: '0 0 0 1px rgba(0,0,0,.15)' }} />)}
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!e.hide} onChange={(ev) => put({ hide: ev.target.checked || undefined })} /> Hide this motif</label>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="h-8 px-3 rounded-full border border-mt-border text-[12px] font-semibold" onClick={() => { const all = { ...edits }; delete all[sel!]; onChange(Object.keys(all).length ? all : undefined); }}>Reset this motif</button>
                  {count > 0 && <button type="button" className="h-8 px-3 rounded-full border border-mt-border text-[12px] font-semibold" onClick={() => onChange(undefined)}>Reset all motifs</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
