'use client';

// Visitors & users for Admin → Overview (admins only — the numbers come
// from admin_site_stats(), which refuses anyone else).

import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, Gauge, MousePointerClick, Repeat, UserCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Day { day: string; views: number; visitors: number; signups: number }
type Row = Record<string, any>;
interface Stats {
  users_total: number; users_new: number; users_new_prev?: number; users_active: number;
  today_views: number; today_visitors: number; today_signed_in: number;
  views: number; views_prev?: number; visitors: number; visitors_prev?: number;
  returning?: number; bounce?: number; pages_per_visit?: number; avg_load_ms?: number; designs_new?: number;
  daily: Day[]; top_pages: Row[]; slow_pages?: Row[]; entry_pages?: Row[];
  referrers: Row[]; campaigns?: Row[]; countries?: Row[]; cities?: Row[];
  devices: Row[]; browsers?: Row[]; systems?: Row[]; recent_signups?: Row[]; errors?: Row[];
}

const nf = (n: number | undefined) => (n ?? 0).toLocaleString('en-US');
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : '🌐');
const countryName = (cc: string) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; } catch { return cc; } };

function Change({ now, before }: { now: number; before?: number }) {
  if (before === undefined) return null;
  if (!before) return now ? <span className="text-emerald-600">new</span> : null;
  const p = Math.round(((now - before) / before) * 100);
  return <span className={p >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{p >= 0 ? '▲' : '▼'} {Math.abs(p)}%</span>;
}

function Tile({ icon, label, value, sub, change }: { icon: React.ReactNode; label: string; value: string; sub?: React.ReactNode; change?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-mt-border p-4">
      <p className="text-[12px] text-mt-muted inline-flex items-center gap-1.5">{icon} {label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-mt-ink">{value}</p>
      <p className="text-[12px] text-mt-faint flex gap-2">{change}{sub && <span>{sub}</span>}</p>
    </div>
  );
}

function Bars({ title, rows, label, value = 'visitors', render }: { title: string; rows?: Row[]; label: string; value?: string; render?: (r: Row) => React.ReactNode }) {
  const max = Math.max(1, ...(rows || []).map((r) => r[value] || 0));
  return (
    <div>
      <p className="font-semibold text-mt-ink mb-2 text-[13px]">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {(rows || []).map((r, i) => (
          <li key={i} className="relative text-[13px]">
            <span className="absolute inset-y-0 left-0 rounded bg-[#3B82C4]/10" style={{ width: `${(100 * (r[value] || 0)) / max}%` }} />
            <span className="relative flex justify-between gap-3 px-1.5 py-0.5">
              <span className="truncate text-mt-ink">{render ? render(r) : r[label]}</span>
              <span className="tabular-nums text-mt-muted">{nf(r[value])}</span>
            </span>
          </li>
        ))}
        {rows && !rows.length && <li className="text-[13px] text-mt-faint">No data yet.</li>}
      </ul>
    </div>
  );
}

export function VisitorStats() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hover, setHover] = useState<Day | null>(null);
  const [metric, setMetric] = useState<'views' | 'visitors' | 'signups'>('visitors');

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
  const max = Math.max(1, ...daily.map((d) => d[metric]));
  const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const newVisitors = s ? Math.max(0, s.visitors - (s.returning || 0)) : 0;
  const csv = useMemo(() => (s ? ['date,page views,visitors,sign-ups', ...daily.map((d) => `${d.day},${d.views},${d.visitors},${d.signups}`)].join('\n') : ''), [s, daily]);

  return (
    <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-mt-ink flex-1">Visitors &amp; users</h2>
        <div className="flex gap-1">
          {[[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days'], [365, 'Year']].map(([n, l]) => (
            <button key={n} onClick={() => setDays(n as number)} className={`h-8 px-3 rounded-full text-[12px] border ${days === n ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>
          ))}
        </div>
        {s && <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`visitors-${days}d.csv`} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1 text-mt-muted hover:text-mt-ink"><Download size={13} /> CSV</a>}
      </div>
      {err && <p className="mt-3 text-[13px] text-mt-muted">{err}</p>}
      {!err && (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile icon={<Users size={14} />} label="Visitors" value={s ? nf(s.visitors) : '…'} change={s && <Change now={s.visitors} before={s.visitors_prev} />} sub={s ? `${nf(s.today_visitors)} today` : undefined} />
            <Tile icon={<Eye size={14} />} label="Page views" value={s ? nf(s.views) : '…'} change={s && <Change now={s.views} before={s.views_prev} />} sub={s ? `${nf(s.today_views)} today` : undefined} />
            <Tile icon={<UserPlus size={14} />} label="New sign-ups" value={s ? nf(s.users_new) : '…'} change={s && <Change now={s.users_new} before={s.users_new_prev} />} sub={s ? `${nf(s.users_total)} accounts` : undefined} />
            <Tile icon={<UserCheck size={14} />} label="Users who logged in" value={s ? nf(s.users_active) : '…'} sub={s ? `${nf(s.today_signed_in)} signed in today` : undefined} />
            <Tile icon={<Repeat size={14} />} label="Returning visitors" value={s ? nf(s.returning) : '…'} sub={s ? `${nf(newVisitors)} new` : undefined} />
            <Tile icon={<MousePointerClick size={14} />} label="Pages per visit" value={s ? String(s.pages_per_visit ?? 0) : '…'} sub={s ? `${s.bounce ?? 0}% left after one page` : undefined} />
            <Tile icon={<Gauge size={14} />} label="Average load time" value={s ? (s.avg_load_ms ? `${(s.avg_load_ms / 1000).toFixed(1)} s` : '—') : '…'} sub={s?.avg_load_ms ? (s.avg_load_ms < 2500 ? 'Fast' : s.avg_load_ms < 4500 ? 'Could be faster' : 'Slow — see Health') : undefined} />
            <Tile icon={<Users size={14} />} label="Designs started" value={s ? nf(s.designs_new) : '…'} sub="saved online" />
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[12px] text-mt-muted">
              <span className="flex gap-1">
                {(['visitors', 'views', 'signups'] as const).map((m) => <button key={m} onClick={() => setMetric(m)} className={`px-2 py-0.5 rounded-full border ${metric === m ? 'border-mt-ink text-mt-ink' : 'border-mt-border'}`}>{m === 'views' ? 'Page views' : m === 'visitors' ? 'Visitors' : 'Sign-ups'}</button>)}
              </span>
              <span className="tabular-nums">{hover ? `${fmtDay(hover.day)}: ${nf(hover.visitors)} visitors · ${nf(hover.views)} views · ${nf(hover.signups)} sign-ups` : 'Point at a day for details'}</span>
            </div>
            <div className="mt-2 h-40 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
              {daily.map((d) => (
                <button key={d.day} type="button" aria-label={`${fmtDay(d.day)}: ${d[metric]}`} onMouseEnter={() => setHover(d)} onFocus={() => setHover(d)} className="flex-1 h-full flex items-end group">
                  <span className="w-full rounded-t-[3px] bg-[#3B82C4] group-hover:bg-[#2563A8]" style={{ height: `${Math.max(d[metric] ? 3 : 1, (d[metric] / max) * 100)}%`, opacity: d[metric] ? 1 : 0.25 }} />
                </button>
              ))}
            </div>
            {daily.length > 1 && <div className="mt-1 flex justify-between text-[11px] text-mt-faint"><span>{fmtDay(daily[0].day)}</span><span>{fmtDay(daily[daily.length - 1].day)}</span></div>}
          </div>
          <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Bars title="Most viewed pages" rows={s?.top_pages} label="path" value="views" render={(r) => <a href={r.path} target="_blank" className="hover:underline">{r.path}</a>} />
            <Bars title="Where people arrive" rows={s?.entry_pages} label="path" />
            <Bars title="Where visitors come from" rows={s?.referrers} label="referrer" />
            <Bars title="Countries" rows={s?.countries} label="country" render={(r) => <>{flag(r.country)} {r.country === '??' ? 'Unknown' : countryName(r.country)}</>} />
            <Bars title="Cities" rows={s?.cities} label="city" render={(r) => <>{r.city}{r.country ? `, ${r.country}` : ''}</>} />
            <Bars title="Campaign links" rows={s?.campaigns} label="utm" />
            <Bars title="Devices" rows={s?.devices} label="device" render={(r) => <span className="capitalize">{r.device}</span>} />
            <Bars title="Browsers" rows={s?.browsers} label="browser" />
            <Bars title="Systems" rows={s?.systems} label="os" />
          </div>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div>
              <p className="font-semibold text-mt-ink mb-2 text-[13px]">Newest members</p>
              <ul className="flex flex-col divide-y divide-mt-border text-[13px]">
                {(s?.recent_signups || []).map((u, i) => (
                  <li key={i} className="py-1.5 flex justify-between gap-3"><span className="truncate">{u.name}</span><span className="text-mt-faint whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{u.last_sign_in_at ? ` · last in ${new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-mt-ink mb-2 text-[13px]">Slowest pages <span className="font-normal text-mt-muted">(average load)</span></p>
              <ul className="flex flex-col divide-y divide-mt-border text-[13px]">
                {(s?.slow_pages || []).map((p, i) => <li key={i} className="py-1.5 flex justify-between gap-3"><span className="truncate">{p.path}</span><span className={`tabular-nums ${p.load_ms > 4500 ? 'text-rose-600' : p.load_ms > 2500 ? 'text-amber-600' : 'text-emerald-600'}`}>{(p.load_ms / 1000).toFixed(1)} s</span></li>)}
                {s && !(s.slow_pages || []).length && <li className="py-1.5 text-mt-faint">Not enough data yet.</li>}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-mt-faint">Counted without cookies or outside trackers; country comes from the connection. Admin pages and search-engine robots are not counted.</p>
        </>
      )}
    </section>
  );
}
