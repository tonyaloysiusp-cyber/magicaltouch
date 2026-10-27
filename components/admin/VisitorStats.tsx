'use client';

// Visitors & users for Admin → Overview (admins only — the numbers come
// from admin_site_stats(), which refuses anyone else).

import { useEffect, useState } from 'react';
import { Eye, UserCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Day { day: string; views: number; visitors: number; signups: number }
interface Stats {
  users_total: number; users_new: number; users_active: number;
  today_views: number; today_visitors: number; today_signed_in: number;
  views: number; visitors: number;
  daily: Day[]; top_pages: { path: string; views: number }[];
  referrers: { referrer: string; visitors: number }[]; devices: { device: string; visitors: number }[];
}

const nf = (n: number | undefined) => (n ?? 0).toLocaleString('en-US');

function Tile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-mt-border p-4">
      <p className="text-[12px] text-mt-muted inline-flex items-center gap-1.5">{icon} {label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-mt-ink">{value}</p>
      {sub && <p className="text-[12px] text-mt-faint">{sub}</p>}
    </div>
  );
}

export function VisitorStats() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<Day | null>(null);

  useEffect(() => {
    let off = false;
    setErr(null);
    supabase.rpc('admin_site_stats', { p_days: days }).then(({ data, error }) => {
      if (off) return;
      if (error) setErr(/function|schema cache/i.test(error.message) ? 'Visitor counting is being set up — numbers appear here once the database update is applied.' : error.message);
      else setS(data as Stats);
    });
    return () => { off = true; };
  }, [days]);

  const daily = s?.daily || [];
  const max = Math.max(1, ...daily.map((d) => d.views));
  const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-mt-ink flex-1">Visitors &amp; users</h2>
        <div className="flex gap-1">
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)} className={`h-8 px-3 rounded-full text-[12px] border ${days === n ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{n} days</button>
          ))}
        </div>
      </div>
      {err && <p className="mt-3 text-[13px] text-mt-muted">{err}</p>}
      {!err && (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile icon={<Eye size={14} />} label="Page views" value={s ? nf(s.views) : '…'} sub={s ? `${nf(s.today_views)} today` : undefined} />
            <Tile icon={<Users size={14} />} label="Visitors" value={s ? nf(s.visitors) : '…'} sub={s ? `${nf(s.today_visitors)} today · ${nf(s.today_signed_in)} signed in` : undefined} />
            <Tile icon={<UserPlus size={14} />} label="New sign-ups" value={s ? nf(s.users_new) : '…'} sub={s ? `${nf(s.users_total)} accounts in total` : undefined} />
            <Tile icon={<UserCheck size={14} />} label="Users who logged in" value={s ? nf(s.users_active) : '…'} sub={`in the last ${days} days`} />
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-[12px] text-mt-muted">
              <span>Daily page views</span>
              <span className="tabular-nums">{hover ? `${fmtDay(hover.day)}: ${nf(hover.views)} views · ${nf(hover.visitors)} visitors · ${nf(hover.signups)} sign-ups` : 'Point at a day for details'}</span>
            </div>
            <div className="mt-2 h-36 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
              {daily.map((d) => (
                <button key={d.day} type="button" aria-label={`${fmtDay(d.day)}: ${d.views} views`} onMouseEnter={() => setHover(d)} onFocus={() => setHover(d)} className="flex-1 h-full flex items-end group">
                  <span className="w-full rounded-t-[3px] bg-[#3B82C4] group-hover:bg-[#2563A8]" style={{ height: `${Math.max(d.views ? 3 : 1, (d.views / max) * 100)}%`, opacity: d.views ? 1 : 0.25 }} />
                </button>
              ))}
            </div>
            {daily.length > 1 && <div className="mt-1 flex justify-between text-[11px] text-mt-faint"><span>{fmtDay(daily[0].day)}</span><span>{fmtDay(daily[daily.length - 1].day)}</span></div>}
          </div>
          <div className="mt-5 grid md:grid-cols-3 gap-5 text-[13px]">
            <div>
              <p className="font-semibold text-mt-ink mb-2">Most viewed pages</p>
              <ul className="flex flex-col gap-1">{(s?.top_pages || []).map((p) => <li key={p.path} className="flex justify-between gap-3"><a href={p.path} target="_blank" className="truncate text-mt-muted hover:text-mt-ink">{p.path}</a><span className="tabular-nums">{nf(p.views)}</span></li>)}{s && !s.top_pages.length && <li className="text-mt-faint">No visits yet.</li>}</ul>
            </div>
            <div>
              <p className="font-semibold text-mt-ink mb-2">Where visitors come from</p>
              <ul className="flex flex-col gap-1">{(s?.referrers || []).map((r) => <li key={r.referrer} className="flex justify-between gap-3"><span className="truncate text-mt-muted">{r.referrer}</span><span className="tabular-nums">{nf(r.visitors)}</span></li>)}</ul>
            </div>
            <div>
              <p className="font-semibold text-mt-ink mb-2">Devices</p>
              <ul className="flex flex-col gap-1">{(s?.devices || []).map((r) => <li key={r.device} className="flex justify-between gap-3"><span className="capitalize text-mt-muted">{r.device}</span><span className="tabular-nums">{nf(r.visitors)}</span></li>)}</ul>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-mt-faint">Counted without cookies or outside trackers. Admin pages and search-engine robots are not counted.</p>
        </>
      )}
    </section>
  );
}
