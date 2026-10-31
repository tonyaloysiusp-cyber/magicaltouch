'use client';

// Admin → Templates → File sizes.
// Big templates open slowly for every visitor. The usual cause is a picture
// saved at full camera size, or a background-removed cut-out (a huge PNG).
// This lists the heaviest templates and shrinks their pictures with one
// click — scaled to what the design uses, re-encoded as WebP (cut-outs keep
// their transparency). The design looks the same; only the file gets smaller.
// New saves are shrunk automatically, so this is mainly for older templates.

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Minimize2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { designBytes, kb, shrinkDesignImages, ShrinkLevel } from '@/lib/editor/shrinkImages';

interface Row { id: string; name: string; status: string; thumbnail: string | null; kb: number; pictures: number }
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const LEVELS: [ShrinkLevel, string, string][] = [
  ['print', 'Print quality', 'Sharp in print (up to 3000 px). Recommended.'],
  ['balanced', 'Balanced', 'Up to 2000 px — great on screens and most prints.'],
  ['small', 'Smallest', 'Up to 1400 px — social media and web only.'],
];

export function TemplateSizes() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [level, setLevel] = useState<ShrinkLevel>('print');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc('admin_template_sizes', { p_min_kb: 150 });
    if (error) { setMsg(error.message); setRows([]); return; }
    setRows((data as Row[]) || []);
  };
  useEffect(() => { load(); }, []);

  const shrink = async (r: Row): Promise<number> => {
    const { data, error } = await supabase.from('templates').select('canvas_json').eq('id', r.id).maybeSingle();
    if (error || !data?.canvas_json) { setDone((d) => ({ ...d, [r.id]: 'Could not open' })); return 0; }
    const json = data.canvas_json;
    const before = designBytes(json);
    const res = await shrinkDesignImages(json, level);
    if (!res.count) { setDone((d) => ({ ...d, [r.id]: 'Already as small as it can be' })); return 0; }
    const after = designBytes(json);
    const { error: e2 } = await supabase.from('templates').update({ canvas_json: json, updated_at: new Date().toISOString() }).eq('id', r.id);
    if (e2) { setDone((d) => ({ ...d, [r.id]: e2.message })); return 0; }
    setDone((d) => ({ ...d, [r.id]: `${kb(before)} → ${kb(after)}` }));
    return before - after;
  };

  const one = async (r: Row) => { setBusy(r.id); await shrink(r); setBusy(null); };
  const all = async () => {
    if (!rows) return;
    setBusy('all'); let saved = 0;
    for (const r of rows) { if (done[r.id]) continue; setBusy(`all:${r.id}`); saved += await shrink(r); }
    setBusy(null); setMsg(`Done — ${kb(saved)} smaller in total.`); load();
  };

  const total = (rows || []).reduce((s, r) => s + r.kb, 0);
  return (
    <section className={`${card} mt-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <Minimize2 size={20} className="text-mt-accent" />
        <div className="flex-1 min-w-[240px]">
          <h2 className="text-lg font-semibold">Template file sizes</h2>
          <p className="text-[13px] text-mt-muted">Big templates open slowly. Usually it’s a full-size photo or a background-removed cut-out. Shrinking keeps the design looking the same. <b>New saves are shrunk automatically.</b></p>
        </div>
        <button onClick={load} disabled={!!busy} className={`${btn} border border-mt-border`}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {LEVELS.map(([id, label, help]) => (
          <button key={id} onClick={() => setLevel(id)} className={`text-left rounded-2xl border p-3 ${level === id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}>
            <p className="text-[14px] font-semibold">{label}</p>
            <p className="text-[12px] text-mt-muted">{help}</p>
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="mt-4 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Measuring templates…</p>
      ) : !rows.length ? (
        <p className="mt-4 text-[14px] text-emerald-600 inline-flex items-center gap-2"><CheckCircle2 size={16} /> Every template is under 150 KB — nothing to shrink.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="flex-1 text-[13px] text-mt-muted"><b className="text-mt-ink">{rows.length}</b> templates over 150 KB · {kb(total * 1024)} in total</p>
            <button onClick={all} disabled={!!busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy?.startsWith('all') ? <Loader2 size={14} className="animate-spin" /> : <Minimize2 size={14} />} Shrink all</button>
          </div>
          {msg && <p className="mt-2 text-[13px] text-mt-ink">{msg}</p>}
          <ul className="mt-3 divide-y divide-mt-border">
            {rows.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center gap-3">
                {r.thumbnail ? <img src={r.thumbnail} alt="" className="h-12 w-12 rounded-lg object-cover border border-mt-border" /> : <span className="h-12 w-12 rounded-lg bg-mt-surface2" />}
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium truncate">{r.name}</span>
                  <span className="block text-[12px] text-mt-muted">{kb(r.kb * 1024)} · {r.pictures} picture{r.pictures === 1 ? '' : 's'} inside · {r.status}{done[r.id] ? <b className="text-emerald-600"> · {done[r.id]}</b> : ''}</span>
                </span>
                <button onClick={() => one(r)} disabled={!!busy || !!done[r.id]} className={`${btn} border border-mt-border`}>{busy === r.id || busy === `all:${r.id}` ? <Loader2 size={14} className="animate-spin" /> : <Minimize2 size={14} />} Shrink</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
