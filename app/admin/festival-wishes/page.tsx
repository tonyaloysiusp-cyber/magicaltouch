'use client';

// Admin → Festival wishes. On a festival day, every visitor to the home page
// sees a greeting from Magical Touch and a short celebration (crackers for
// Diwali, snow for Christmas, lanterns for Eid…). Only on that day.
// The list comes from the festival calendar; switch each one on or off,
// change the words or the animation, Preview, then Save & publish.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Eye, Loader2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { DEFAULT_WISHES, EFFECTS, WishEffect, WishItem, localDay, parseWishes } from '@/lib/festivalWishes';

const field = 'w-full h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';

export default function FestivalWishesAdmin() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState<WishItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const today = localDay();
    const [occ, set] = await Promise.all([
      supabase.from('occasions').select('name,occasion_date').gte('occasion_date', today).order('occasion_date').limit(400),
      supabase.from('site_settings').select('value').eq('key', 'festival_wishes').maybeSingle(),
    ]);
    const saved = parseWishes((set.data as any)?.value);
    setEnabled(saved.enabled);
    const byKey = new Map(saved.items.map((i) => [`${i.date}|${i.name}`, i]));
    const list: WishItem[] = ((occ.data as any[]) || []).filter((o) => o.name && !/update the festival calendar/i.test(o.name)).map((o) => {
      const k = `${o.occasion_date}|${o.name}`;
      const d = DEFAULT_WISHES[o.name];
      return byKey.get(k) || { date: o.occasion_date, name: o.name, title: d?.title || `Happy ${o.name}!`, message: d?.message || 'From all of us at Magical Touch Design.', effect: d?.effect || 'confetti', emoji: d?.emoji || '✨', enabled: !!d };
    });
    setItems(list);
    setState('ok');
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/festival-wishes');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      await load();
    })();
  }, [router, load]);

  const set = (i: number, patch: Partial<WishItem>) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setBusy(true); setMsg(null);
    const value = JSON.stringify({ enabled, items, updated_at: new Date().toISOString() });
    const { error } = await supabase.from('site_settings').upsert({ key: 'festival_wishes', value, updated_at: new Date().toISOString() });
    setBusy(false);
    setMsg(error ? error.message : 'Saved and published. Visitors see each wish on its festival day only.');
  };

  const shown = useMemo(() => (showAll ? items : items.slice(0, 24)), [items, showAll]);
  if (state === 'loading') return <main className="min-h-screen grid place-items-center text-mt-faint">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen grid place-items-center"><Link href="/dashboard" className="text-mt-accent">Administrators only</Link></main>;
  const today = localDay();

  return (
    <AdminShell active="wishes" title="Festival wishes" accent="Wishes" subtitle="On festival days, every visitor to the home page gets a greeting and a short celebration — only on that day."
      actions={<button onClick={save} disabled={busy} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save &amp; publish</button>}>
      <div className="flex flex-col gap-5">
        {msg && <p role="status" className="rounded-2xl bg-mt-accentsoft text-[#4B2FB0] px-4 py-2.5 text-sm">{msg}</p>}
        <label className="rounded-2xl border border-mt-border bg-mt-surface p-4 flex items-center gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-[#3B82C4]" />
          <span><span className="block font-semibold text-[14px]">Show festival wishes on the home page</span><span className="block text-[12px] text-mt-muted">Uses each visitor’s own date. The animation plays once per visitor per day; the greeting card stays until they close it.</span></span>
        </label>
        <ul className="rounded-3xl border border-mt-border bg-mt-surface divide-y divide-mt-border">
          {shown.map((w, i) => (
            <li key={`${w.date}|${w.name}`} className={`p-4 grid gap-3 md:grid-cols-[150px_1fr_170px_auto] items-start ${w.enabled ? '' : 'opacity-60'}`}>
              <label className="flex items-start gap-2.5">
                <input type="checkbox" checked={w.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} className="mt-1 h-4 w-4 accent-[#3B82C4]" />
                <span>
                  <span className="block text-[13px] font-semibold">{w.name}</span>
                  <span className={`block text-[12px] ${w.date === today ? 'text-emerald-600 font-semibold' : 'text-mt-muted'}`}>{w.date === today ? 'Today' : new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
              </label>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5"><input value={w.emoji} onChange={(e) => set(i, { emoji: e.target.value.slice(0, 4) })} className={`${field} w-14 text-center`} aria-label="Emoji" /><input value={w.title} onChange={(e) => set(i, { title: e.target.value.slice(0, 60) })} className={field} aria-label="Greeting" /></div>
                <input value={w.message} onChange={(e) => set(i, { message: e.target.value.slice(0, 160) })} className={field} aria-label="Message" />
              </div>
              <select value={w.effect} onChange={(e) => set(i, { effect: e.target.value as WishEffect })} className={field} aria-label="Animation">
                {EFFECTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <a href={`/?festivalPreview=${encodeURIComponent(w.name)}`} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-full border border-mt-border text-[12px] font-semibold inline-flex items-center gap-1 justify-center"><Eye size={13} /> Preview</a>
            </li>
          ))}
        </ul>
        {items.length > 24 && !showAll && <button onClick={() => setShowAll(true)} className="self-start h-9 px-4 rounded-full border border-mt-border text-[13px]">Show all {items.length}</button>}
        <p className="text-[12px] text-mt-muted">Preview shows the built-in wording for that festival; your edits appear on the day after you Save &amp; publish. Dates come from the festival calendar (Admin → SEO → Festivals).</p>
      </div>
    </AdminShell>
  );
}
