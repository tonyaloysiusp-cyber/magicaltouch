'use client';

// Admin → Templates: "Template count on the site".
// The number of published templates is shown on the home page, templates
// page, landing pages, page titles and Google descriptions. It updates by
// itself whenever templates are added, published, unpublished or deleted
// (always on). Here the admin sees the live number and picks how it's
// written: rounded down to 50 / 100, or the exact number.

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api/client';
import { COUNT_STYLES, CountStyle, countLabel, parseCountStyle } from '@/lib/templateCountLabel';

export function TemplateCountCard() {
  const [n, setN] = useState<number | null>(null);
  const [style, setStyle] = useState<CountStyle>('rounded50');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const [{ count }, { data }] = await Promise.all([
      supabase.from('templates').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('site_settings').select('value').eq('key', 'template_count_style').maybeSingle(),
    ]);
    setN(count ?? null);
    setStyle(parseCountStyle((data as any)?.value));
  };
  useEffect(() => { load(); }, []);

  const refresh = async (note: string) => {
    setBusy(true);
    try { await apiFetch('/api/count-refresh', { method: 'POST', body: '{}' }); setMsg(note); } catch (e: any) { setMsg(e?.message || 'Could not refresh'); }
    setBusy(false);
  };
  const choose = async (s: CountStyle) => {
    setStyle(s);
    const { error } = await supabase.from('site_settings').upsert({ key: 'template_count_style', value: s, updated_at: new Date().toISOString() });
    if (error) return setMsg(error.message);
    await refresh('Saved — every page now shows the new style.');
  };

  return (
    <section className="mt-4 rounded-3xl border border-mt-border bg-mt-surface p-4 sm:p-5 flex flex-wrap items-center gap-4">
      <div className="min-w-[180px]">
        <p className="text-[12px] text-mt-muted">Template count on the site</p>
        <p className="text-2xl font-semibold tabular-nums">{n === null ? '…' : countLabel(n, style)} <span className="text-[13px] font-normal text-mt-muted">templates</span></p>
        <p className="text-[12px] text-mt-faint">{n === null ? '' : `${n.toLocaleString('en-US')} published right now`}</p>
      </div>
      <div className="flex-1 min-w-[240px] text-[12px] text-mt-muted">
        <p className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold"><CheckCircle2 size={14} /> Auto-update is always on</p>
        <p>Home page, templates page, landing pages, page titles and Google descriptions update by themselves within a minute whenever you add, publish, unpublish or delete templates.</p>
      </div>
      <label className="text-[12px] text-mt-muted">Show it as
        <select value={style} onChange={(e) => choose(e.target.value as CountStyle)} className="mt-1 block h-9 rounded-xl border border-mt-input-border bg-mt-surface px-2 text-[13px] text-mt-ink">
          {COUNT_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <button onClick={() => { load(); refresh('Refreshed — every page shows the latest number.'); }} disabled={busy} className="h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border border-mt-border disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh now</button>
      {msg && <p className="basis-full text-[12px] text-mt-ink">{msg}</p>}
    </section>
  );
}
