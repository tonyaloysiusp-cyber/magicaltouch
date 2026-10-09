'use client';

// Admin home: overview, inbox (festival reminders, renewals, customer
// messages), festival & occasion calendar, hosting/domain renewals and
// the wording of the site's own e-mails. Every table here is admin-only
// in the database (RLS + is_admin()); this page just checks first so a
// non-admin sees a clear message instead of empty lists.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, Check, Archive, Mail, ExternalLink, CalendarHeart, Server, Inbox, Users, Brush, LayoutTemplate, Send, X, RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminShell, AdminCard, AdminSection } from '@/components/admin/AdminShell';
import { welcomeEmail, passwordChangedEmail, EmailCopy } from '@/lib/email/templates';

type Tab = 'overview' | 'messages' | 'occasions' | 'services' | 'wording';
const TABS: Tab[] = ['overview', 'messages', 'occasions', 'services', 'wording'];

interface Message { id: string; kind: string; title: string; body: string | null; link: string | null; priority: string; due_on: string | null; meta: any; read_at: string | null; archived: boolean; created_at: string }
interface Occasion { id: string; name: string; occasion_date: string; region: string; template_category: string | null; ideas: string | null; lead_days: number; active: boolean; built_in: boolean }
interface Service { id: string; name: string; kind: string; provider: string | null; plan: string | null; account_url: string | null; cost: number | null; currency: string; billing_cycle: string; renews_on: string | null; auto_renew: boolean; status: string; notes: string | null }

const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const daysUntil = (iso: string) => Math.round((new Date(iso + 'T00:00:00').getTime() - today().getTime()) / 86400000);
const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', opts);
const when = (n: number) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 0 ? `${-n} days ago` : `In ${n} days`);
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink focus:outline-none focus:border-[#3B82C4] focus:ring-2 focus:ring-[#8CCBFF]/40';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40';
const btnPrimary = `${btn} bg-mt-primary text-mt-onprimary hover:opacity-90`;
const btnGhost = `${btn} border border-mt-border text-mt-ink hover:bg-mt-surface2`;

const KIND_LABEL: Record<string, string> = { occasion: 'Festival', renewal: 'Renewal', contact: 'Customer', system: 'Notice' };
const KIND_COLOR: Record<string, string> = { occasion: '#35C2F1', renewal: '#F59E0B', contact: '#8CC84B', system: '#A69BD3' };

export default function AdminHome() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [tab, setTabState] = useState<Tab>('overview');
  const [notice, setNotice] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [templates, setTemplates] = useState<{ name: string; category: string; tags: string[] | null }[]>([]);

  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      const u = new URL(window.location.href);
      if (t === 'overview') u.searchParams.delete('tab');
      else u.searchParams.set('tab', t);
      window.history.replaceState(null, '', u.toString());
    } catch {
      // ignore
    }
  };

  const loadAll = useCallback(async () => {
    const from = new Date(today().getTime() - 2 * 86400000).toISOString().slice(0, 10);
    const [ov, msg, occ, svc, tpl] = await Promise.all([
      supabase.rpc('admin_overview'),
      supabase.from('admin_messages').select('*').eq('archived', false).order('created_at', { ascending: false }).limit(200),
      supabase.from('occasions').select('*').gte('occasion_date', from).order('occasion_date', { ascending: true }).limit(400),
      supabase.from('admin_services').select('*').order('renews_on', { ascending: true, nullsFirst: false }),
      supabase.from('templates').select('name, category, tags, occasion').eq('status', 'published').limit(1000),
    ]);
    if (ov.data) setStats(ov.data as any);
    setMessages((msg.data as any) || []);
    setOccasions((occ.data as any) || []);
    setServices((svc.data as any) || []);
    setTemplates((tpl.data as any) || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login?next=/admin');
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!profile?.is_admin) return setState('denied');
      setState('ok');
      const t = new URLSearchParams(window.location.search).get('tab') as Tab | null;
      if (t && TABS.includes(t)) setTabState(t);
      loadAll();
    })();
  }, [router, loadAll]);

  const flash = (t: string) => {
    setNotice(t);
    setTimeout(() => setNotice(null), 4000);
  };

  const runCheck = async () => {
    const { data, error } = await supabase.rpc('admin_daily_check');
    if (error) return flash(error.message);
    await loadAll();
    flash(data ? `${data} new reminder${data === 1 ? '' : 's'} added.` : 'All checked — nothing new is due yet.');
  };

  const unread = messages.filter((m) => !m.read_at).length;

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied')
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg">
        <p className="text-lg font-semibold text-mt-ink">Administrators only</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link>
      </main>
    );

  const heads: Record<Tab, { title: string; accent: string; subtitle: string }> = {
    overview: { title: 'Your studio at a glance', accent: 'at a glance', subtitle: 'Customers, designs, templates, festivals coming up and anything that needs renewing.' },
    messages: { title: 'Messages & reminders', accent: 'reminders', subtitle: 'Festival reminders 10 days ahead, renewal alerts and messages from customers. A summary is also e-mailed to you every morning.' },
    occasions: { title: 'Festivals & occasions', accent: 'Festivals', subtitle: 'Every festival and special day you design for. You get a reminder 10 days before each one, with template ideas.' },
    services: { title: 'Hosting & renewals', accent: 'renewals', subtitle: 'Hosting, domain, e-mail and other services. Reminders arrive 30, 14, 7 and 1 day before anything expires.' },
    wording: { title: 'Email wording', accent: 'wording', subtitle: 'Change what the site’s own e-mails say. Changes are used for the next e-mail sent.' },
  };
  const h = heads[tab];

  return (
    <AdminShell
      active={tab as AdminSection}
      title={h.title}
      accent={h.accent}
      subtitle={h.subtitle}
      badges={{ messages: unread }}
      onNavigate={(id) => {
        if ((TABS as string[]).includes(id)) {
          setTab(id as Tab);
          return true;
        }
        return false;
      }}
      actions={
        <>
          <button type="button" onClick={runCheck} className={btnGhost} title="Look for festivals and renewals due now (this also runs by itself every morning)">
            <RefreshCw size={14} /> Check now
          </button>
          <Link href="/admin/templates" className={btnPrimary}>
            <LayoutTemplate size={14} /> Templates
          </Link>
        </>
      }
    >
      {notice && <div role="status" className="mb-4 rounded-2xl border border-mt-border bg-mt-surface px-4 py-3 text-sm text-mt-ink shadow-sm">{notice}</div>}
      {tab === 'overview' && <Overview stats={stats} messages={messages} occasions={occasions} services={services} templates={templates} go={setTab} />}
      {tab === 'messages' && <Messages messages={messages} reload={loadAll} flash={flash} />}
      {tab === 'occasions' && <Occasions occasions={occasions} templates={templates} reload={loadAll} flash={flash} />}
      {tab === 'services' && <Services services={services} reload={loadAll} flash={flash} />}
      {tab === 'wording' && <Wording flash={flash} />}
    </AdminShell>
  );
}

// ------------------------------------------------------------- overview

function Stat({ icon, label, value, sub, tint }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; tint: string }) {
  return (
    <div className="rounded-3xl border border-mt-border bg-mt-surface p-5 relative overflow-hidden">
      <div aria-hidden className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-[0.12]" style={{ background: tint }} />
      <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center" style={{ background: `${tint}26`, color: tint }}>
        {icon}
      </span>
      <p className="mt-4 text-3xl font-semibold tabular-nums text-mt-ink">{value}</p>
      <p className="text-[13px] text-mt-muted">{label}</p>
      {sub && <p className="mt-1 text-[12px] text-mt-faint">{sub}</p>}
    </div>
  );
}

function matchCount(o: Occasion, templates: { name: string; category: string; tags: string[] | null; occasion?: string | null }[]) {
  const full = o.name.toLowerCase().replace(/\(.*?\)/g, '').trim();
  const words = full
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3 && !['day', 'begins', 'national', 'international'].includes(w));
  return templates.filter((t) => {
    // Templates made for a festival carry its name ("New Year" also covers New Year's Eve and Day).
    const occ = (t.occasion || '').toLowerCase();
    if (occ && (full === occ || full.startsWith(occ))) return true;
    const tags = (t.tags || []).map((x) => x.toLowerCase());
    if (tags.includes(full)) return true;
    if (!words.length) return false;
    const hay = `${t.name} ${tags.join(' ')}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  }).length;
}

function Overview({ stats, messages, occasions, services, templates, go }: { stats: Record<string, number> | null; messages: Message[]; occasions: Occasion[]; services: Service[]; templates: any[]; go: (t: Tab) => void }) {
  const s = (k: string) => (stats ? stats[k] ?? 0 : '…');
  const upcoming = occasions.filter((o) => o.active && daysUntil(o.occasion_date) >= 0).slice(0, 6);
  const due = services.filter((x) => x.status === 'active').slice(0, 5);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        <Stat icon={<Users size={17} />} label="Customers" value={s('users')} sub={`+${s('users_7d')} this week`} tint="#35C2F1" />
        <Stat icon={<Brush size={17} />} label="Designs made" value={s('designs')} sub={`+${s('designs_7d')} this week`} tint="#F2708F" />
        <Stat icon={<LayoutTemplate size={17} />} label="Live templates" value={s('templates_published')} sub={`${s('templates_draft')} in draft`} tint="#A69BD3" />
        <Stat icon={<Mail size={17} />} label="Subscribers" value={s('subscribers')} sub={`${s('emails_24h')} e-mails sent today`} tint="#5DCCB8" />
        <Stat icon={<Inbox size={17} />} label="Unread messages" value={s('unread')} tint="#8CC84B" />
        <Stat icon={<Server size={17} />} label="Renewals in 30 days" value={s('renewals_30d')} tint="#F59E0B" />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
        <AdminCard title="Festivals coming up" action={<button className="text-xs font-medium text-[#3B82C4] hover:underline" onClick={() => go('occasions')}>See all</button>}>
          <ul className="flex flex-col divide-y divide-mt-border">
            {upcoming.map((o) => {
              const n = daysUntil(o.occasion_date);
              const have = matchCount(o, templates);
              return (
                <li key={o.id} className="py-3 flex items-start gap-4">
                  <span className={`shrink-0 w-14 text-center rounded-2xl py-2 ${n <= 10 ? 'bg-mt-primary text-mt-onprimary' : 'bg-mt-surface2 text-mt-ink'}`}>
                    <span className="block text-lg font-semibold leading-none tabular-nums">{new Date(o.occasion_date + 'T00:00:00').getDate()}</span>
                    <span className="block text-[10px] uppercase tracking-wide mt-1 opacity-80">{fmtDate(o.occasion_date, { month: 'short' })}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-mt-ink">
                      {o.name} <span className="font-normal text-mt-faint">· {o.region}</span>
                    </p>
                    <p className="text-[12px] text-mt-muted mt-0.5 line-clamp-2">{o.ideas}</p>
                    <p className="text-[12px] mt-1 text-mt-faint">{have ? `${have} matching template${have === 1 ? '' : 's'} live` : 'No matching templates yet'}</p>
                  </div>
                  <span className={`shrink-0 text-[12px] font-semibold ${n <= 10 ? 'text-rose-600' : 'text-mt-muted'}`}>{when(n)}</span>
                </li>
              );
            })}
            {!upcoming.length && <li className="py-6 text-sm text-mt-faint">No upcoming occasions.</li>}
          </ul>
        </AdminCard>

        <div className="flex flex-col gap-6">
          <AdminCard title="Hosting & renewals" action={<button className="text-xs font-medium text-[#3B82C4] hover:underline" onClick={() => go('services')}>Manage</button>}>
            <ul className="flex flex-col gap-2.5">
              {due.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-mt-ink truncate">{x.name}</span>
                    <span className="block text-[12px] text-mt-faint truncate">{[x.provider, x.plan].filter(Boolean).join(' · ') || '—'}</span>
                  </span>
                  <RenewPill s={x} />
                </li>
              ))}
              {!due.length && <li className="text-sm text-mt-faint">Nothing added yet.</li>}
            </ul>
          </AdminCard>
          <AdminCard title="Latest messages" action={<button className="text-xs font-medium text-[#3B82C4] hover:underline" onClick={() => go('messages')}>Open inbox</button>}>
            <ul className="flex flex-col gap-3">
              {messages.slice(0, 5).map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: m.read_at ? 'transparent' : KIND_COLOR[m.kind], boxShadow: `inset 0 0 0 1.5px ${KIND_COLOR[m.kind]}` }} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-mt-ink line-clamp-2">{m.title}</span>
                    <span className="block text-[11px] text-mt-faint">{KIND_LABEL[m.kind]} · {new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </span>
                </li>
              ))}
              {!messages.length && <li className="text-sm text-mt-faint">All quiet.</li>}
            </ul>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

function RenewPill({ s }: { s: Service }) {
  if (!s.renews_on)
    return <span className="shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Add date</span>;
  const n = daysUntil(s.renews_on);
  const cls = n < 0 ? 'bg-rose-600 text-white' : n <= 7 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : n <= 30 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  return <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 tabular-nums ${cls}`}>{n < 0 ? `Expired ${-n}d ago` : n === 0 ? 'Today' : `${n} days`}</span>;
}

// ------------------------------------------------------------- messages

function Messages({ messages, reload, flash }: { messages: Message[]; reload: () => void; flash: (t: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'occasion' | 'renewal' | 'contact'>('all');
  const list = messages.filter((m) => (filter === 'all' ? true : filter === 'unread' ? !m.read_at : m.kind === filter));
  const update = async (id: string, patch: Partial<Message>) => {
    const { error } = await supabase.from('admin_messages').update(patch).eq('id', id);
    if (error) flash(error.message);
    reload();
  };
  const markAll = async () => {
    const ids = messages.filter((m) => !m.read_at).map((m) => m.id);
    if (!ids.length) return;
    await supabase.from('admin_messages').update({ read_at: new Date().toISOString() }).in('id', ids);
    reload();
  };
  const chips: [typeof filter, string][] = [['all', 'All'], ['unread', 'Unread'], ['occasion', 'Festivals'], ['renewal', 'Renewals'], ['contact', 'Customers']];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {chips.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`h-9 px-4 rounded-full text-[13px] font-medium border ${filter === id ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={markAll} className={btnGhost}>
          <Check size={14} /> Mark all as read
        </button>
      </div>
      <div className="grid 2xl:grid-cols-2 gap-3">
        {list.map((m) => (
          <article key={m.id} className={`rounded-3xl border bg-mt-surface p-5 flex gap-4 ${m.read_at ? 'border-mt-border' : 'border-mt-border shadow-[0_14px_34px_-24px_rgba(9,9,11,0.6)]'}`}>
            <span className="w-1.5 rounded-full shrink-0" style={{ background: KIND_COLOR[m.kind] }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-semibold uppercase tracking-wide" style={{ color: KIND_COLOR[m.kind] }}>{KIND_LABEL[m.kind]}</span>
                {m.priority === 'high' && <span className="rounded-full bg-rose-600 text-white px-2 py-0.5 font-semibold">Urgent</span>}
                {!m.read_at && <span className="rounded-full bg-mt-surface2 px-2 py-0.5 font-semibold text-mt-ink">New</span>}
                <span className="text-mt-faint">{new Date(m.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <h3 className="mt-1.5 text-[15px] font-semibold text-mt-ink">{m.title}</h3>
              {m.body && <p className="mt-1 text-[13px] text-mt-muted whitespace-pre-line leading-relaxed">{m.body}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {m.kind === 'contact' && m.meta?.email && (
                  <a href={`mailto:${m.meta.email}?subject=${encodeURIComponent('Re: ' + m.title)}`} className={btnPrimary}>
                    <Send size={13} /> Reply
                  </a>
                )}
                {m.kind === 'occasion' && (
                  <Link href="/admin/templates" className={btnPrimary}>
                    <Sparkles size={13} /> Make templates
                  </Link>
                )}
                {m.kind === 'renewal' && (
                  <Link href="/admin?tab=services" className={btnPrimary}>
                    <Server size={13} /> Open renewals
                  </Link>
                )}
                <button type="button" onClick={() => update(m.id, { read_at: m.read_at ? null : new Date().toISOString() } as any)} className={btnGhost}>
                  <Check size={13} /> {m.read_at ? 'Mark unread' : 'Mark read'}
                </button>
                <button type="button" onClick={() => update(m.id, { archived: true, read_at: m.read_at || new Date().toISOString() } as any)} className={btnGhost}>
                  <Archive size={13} /> Archive
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <AdminCard>
          <p className="text-sm text-mt-muted text-center py-8">Nothing here. Festival reminders appear 10 days before each occasion; renewal alerts 30 days before expiry.</p>
        </AdminCard>
      )}
    </div>
  );
}

// ------------------------------------------------------------- occasions

function Occasions({ occasions, templates, reload, flash }: { occasions: Occasion[]; templates: any[]; reload: () => void; flash: (t: string) => void }) {
  const regions = useMemo(() => ['All', ...Array.from(new Set(occasions.map((o) => o.region))).sort()], [occasions]);
  const [region, setRegion] = useState('All');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', occasion_date: '', region: 'UAE / Gulf', ideas: '', lead_days: 10 });
  const list = occasions.filter((o) => daysUntil(o.occasion_date) >= 0 && (region === 'All' || o.region === region));
  const byMonth = list.reduce<Record<string, Occasion[]>>((acc, o) => {
    const k = fmtDate(o.occasion_date, { month: 'long', year: 'numeric' });
    (acc[k] ||= []).push(o);
    return acc;
  }, {});
  const save = async () => {
    if (!draft.name.trim() || !draft.occasion_date) return flash('Add a name and a date.');
    const { error } = await supabase.from('occasions').insert({ ...draft, name: draft.name.trim() });
    if (error) return flash(error.message);
    setAdding(false);
    setDraft({ name: '', occasion_date: '', region: 'UAE / Gulf', ideas: '', lead_days: 10 });
    flash('Occasion added. You’ll get a reminder before it.');
    reload();
  };
  const toggle = async (o: Occasion) => {
    await supabase.from('occasions').update({ active: !o.active }).eq('id', o.id);
    reload();
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto mt-scroll pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {regions.map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-medium border ${region === r ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
              {r}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
          <Plus size={14} /> Add occasion
        </button>
      </div>

      {adding && (
        <AdminCard title="New occasion" action={<button type="button" aria-label="Close" onClick={() => setAdding(false)} className="text-mt-muted hover:text-mt-ink"><X size={18} /></button>}>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="text-xs text-mt-muted flex flex-col gap-1">Name<input className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Shop anniversary sale" /></label>
            <label className="text-xs text-mt-muted flex flex-col gap-1">Date<input type="date" className={field} value={draft.occasion_date} onChange={(e) => setDraft({ ...draft, occasion_date: e.target.value })} /></label>
            <label className="text-xs text-mt-muted flex flex-col gap-1">Region<input className={field} value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} /></label>
            <label className="text-xs text-mt-muted flex flex-col gap-1">Remind me (days before)<input type="number" min={1} max={90} className={field} value={draft.lead_days} onChange={(e) => setDraft({ ...draft, lead_days: Math.max(1, Math.min(90, Number(e.target.value) || 10)) })} /></label>
            <label className="text-xs text-mt-muted flex flex-col gap-1 sm:col-span-2 xl:col-span-4">Template ideas<input className={field} value={draft.ideas} onChange={(e) => setDraft({ ...draft, ideas: e.target.value })} placeholder="Greeting post, offer flyer, story…" /></label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={save} className={btnPrimary}>Save occasion</button>
            <button type="button" onClick={() => setAdding(false)} className={btnGhost}>Cancel</button>
          </div>
        </AdminCard>
      )}

      {Object.entries(byMonth).map(([month, items]) => (
        <section key={month}>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mt-muted mb-2.5">{month}</h2>
          <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {items.map((o) => {
              const n = daysUntil(o.occasion_date);
              const have = matchCount(o, templates);
              const soon = n <= o.lead_days;
              return (
                <article key={o.id} className={`rounded-3xl border bg-mt-surface p-5 ${soon ? 'mt-spectrum-border' : 'border-mt-border'} ${o.active ? '' : 'opacity-55'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] text-mt-faint">{fmtDate(o.occasion_date)} · {o.region}</p>
                      <h3 className="mt-0.5 text-[16px] font-semibold text-mt-ink">{o.name}</h3>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${soon ? 'bg-rose-600 text-white' : 'bg-mt-surface2 text-mt-ink'}`}>{when(n)}</span>
                  </div>
                  {o.ideas && <p className="mt-2 text-[13px] text-mt-muted leading-relaxed">{o.ideas}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`text-[12px] ${have ? 'text-emerald-700 dark:text-emerald-400' : 'text-mt-faint'}`}>{have ? `${have} matching template${have === 1 ? '' : 's'} live` : 'No templates yet'}</span>
                    <span className="flex-1" />
                    <Link href="/admin/templates" className="text-[12px] font-semibold text-[#3B82C4] hover:underline">Make templates</Link>
                    <button type="button" onClick={() => toggle(o)} className="text-[12px] text-mt-muted hover:text-mt-ink">
                      {o.active ? 'Mute' : 'Unmute'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {!list.length && <AdminCard><p className="text-sm text-mt-muted text-center py-8">No upcoming occasions for this region.</p></AdminCard>}
    </div>
  );
}

// ------------------------------------------------------------- services

const KINDS = ['hosting', 'domain', 'email', 'database', 'ssl', 'software', 'storage', 'other'];
const KIND_NAMES: Record<string, string> = { hosting: 'Hosting', domain: 'Domain', email: 'E-mail', database: 'Database', ssl: 'SSL certificate', software: 'Software', storage: 'Storage', other: 'Other' };

function Services({ services, reload, flash }: { services: Service[]; reload: () => void; flash: (t: string) => void }) {
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const save = async () => {
    if (!editing?.name?.trim()) return flash('Give the service a name.');
    const row: any = {
      name: editing.name.trim(),
      kind: editing.kind || 'other',
      provider: editing.provider || null,
      plan: editing.plan || null,
      account_url: editing.account_url || null,
      cost: editing.cost === null || editing.cost === undefined || (editing.cost as any) === '' ? null : Number(editing.cost),
      currency: editing.currency || 'AED',
      billing_cycle: editing.billing_cycle || 'yearly',
      renews_on: editing.renews_on || null,
      auto_renew: !!editing.auto_renew,
      status: editing.status || 'active',
      notes: editing.notes || null,
      updated_at: new Date().toISOString(),
    };
    const q = editing.id ? supabase.from('admin_services').update(row).eq('id', editing.id) : supabase.from('admin_services').insert(row);
    const { error } = await q;
    if (error) return flash(error.message);
    setEditing(null);
    flash('Saved.');
    reload();
  };
  const renewed = async (s: Service) => {
    if (!s.renews_on) return setEditing(s);
    const d = new Date(s.renews_on + 'T00:00:00');
    if (s.billing_cycle === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await supabase.from('admin_services').update({ renews_on: next, status: 'active', updated_at: new Date().toISOString() }).eq('id', s.id);
    flash(`Marked as renewed — next date ${fmtDate(next)}.`);
    reload();
  };
  const remove = async (s: Service) => {
    if (!window.confirm(`Remove “${s.name}” from the list?`)) return;
    await supabase.from('admin_services').delete().eq('id', s.id);
    reload();
  };
  const total = services.filter((s) => s.status === 'active' && s.cost).reduce((sum, s) => sum + (s.billing_cycle === 'monthly' ? Number(s.cost) * 12 : s.billing_cycle === 'yearly' ? Number(s.cost) : 0), 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mt-muted">{total ? `About ${total.toLocaleString('en-GB', { maximumFractionDigits: 0 })} a year in running costs (mixed currencies are added as-is).` : 'Add costs to see your yearly running total.'}</p>
        <button type="button" onClick={() => setEditing({ kind: 'hosting', billing_cycle: 'yearly', currency: 'AED', status: 'active' })} className={btnPrimary}>
          <Plus size={14} /> Add service
        </button>
      </div>
      <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {services.map((s) => (
          <article key={s.id} className="rounded-3xl border border-mt-border bg-mt-surface p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-mt-faint">{KIND_NAMES[s.kind] || s.kind}</p>
                <h3 className="mt-0.5 text-[16px] font-semibold text-mt-ink">{s.name}</h3>
                <p className="text-[13px] text-mt-muted">{[s.provider, s.plan].filter(Boolean).join(' · ') || 'Provider not set'}</p>
              </div>
              <RenewPill s={s} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12px]">
              <dt className="text-mt-faint">Renews / expires</dt>
              <dd className="text-mt-ink text-right">{s.renews_on ? fmtDate(s.renews_on) : '—'}</dd>
              <dt className="text-mt-faint">Cost</dt>
              <dd className="text-mt-ink text-right">{s.cost !== null && s.cost !== undefined ? `${s.currency} ${Number(s.cost).toLocaleString('en-GB')} / ${s.billing_cycle === 'monthly' ? 'month' : s.billing_cycle === 'yearly' ? 'year' : s.billing_cycle}` : s.billing_cycle === 'free' ? 'Free' : '—'}</dd>
              <dt className="text-mt-faint">Auto-renew</dt>
              <dd className={`text-right ${s.auto_renew ? 'text-emerald-700 dark:text-emerald-400' : 'text-mt-ink'}`}>{s.auto_renew ? 'On' : 'Off'}</dd>
              <dt className="text-mt-faint">Status</dt>
              <dd className="text-mt-ink text-right capitalize">{s.status}</dd>
            </dl>
            {s.notes && <p className="mt-3 text-[12px] text-mt-muted leading-relaxed">{s.notes}</p>}
            <div className="mt-auto pt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => renewed(s)} className={btnPrimary} title="Moves the date on by one month or year">
                <RotateCcw size={13} /> Renewed
              </button>
              <button type="button" onClick={() => setEditing(s)} className={btnGhost}>Edit</button>
              {s.account_url && (
                <a href={s.account_url} target="_blank" rel="noreferrer" className={btnGhost}>
                  <ExternalLink size={13} /> Open
                </a>
              )}
              <button type="button" onClick={() => remove(s)} className="ml-auto text-[12px] text-mt-faint hover:text-rose-600">Remove</button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div role="dialog" aria-modal="true" aria-label="Service" className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-mt-surface border border-mt-border p-6">
            <div className="h-1 -mx-6 -mt-6 mb-5 mt-spectrum" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? 'Edit service' : 'Add a service'}</h2>
              <button type="button" aria-label="Close" onClick={() => setEditing(null)} className="text-mt-muted hover:text-mt-ink"><X size={18} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs text-mt-muted flex flex-col gap-1 sm:col-span-2">Name<input className={field} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Domain magicaltouchdesign.com" /></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Type<select className={field} value={editing.kind || 'other'} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>{KINDS.map((k) => <option key={k} value={k}>{KIND_NAMES[k]}</option>)}</select></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Provider<input className={field} value={editing.provider || ''} onChange={(e) => setEditing({ ...editing, provider: e.target.value })} placeholder="e.g. GoDaddy, Vercel, Hostinger" /></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Plan<input className={field} value={editing.plan || ''} onChange={(e) => setEditing({ ...editing, plan: e.target.value })} placeholder="e.g. Pro, Business, VPS 2" /></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Renews / expires on<input type="date" className={field} value={editing.renews_on || ''} onChange={(e) => setEditing({ ...editing, renews_on: e.target.value })} /></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Cost<input inputMode="decimal" className={field} value={editing.cost ?? ''} onChange={(e) => setEditing({ ...editing, cost: e.target.value as any })} placeholder="0.00" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-mt-muted flex flex-col gap-1">Currency<input className={field} value={editing.currency || 'AED'} onChange={(e) => setEditing({ ...editing, currency: e.target.value.toUpperCase().slice(0, 3) })} /></label>
                <label className="text-xs text-mt-muted flex flex-col gap-1">Billed<select className={field} value={editing.billing_cycle || 'yearly'} onChange={(e) => setEditing({ ...editing, billing_cycle: e.target.value })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="one-time">One time</option><option value="free">Free</option></select></label>
              </div>
              <label className="text-xs text-mt-muted flex flex-col gap-1 sm:col-span-2">Account link<input className={field} value={editing.account_url || ''} onChange={(e) => setEditing({ ...editing, account_url: e.target.value })} placeholder="https://…" /></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1 sm:col-span-2">Notes<textarea className={`${field} h-20 py-2`} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm text-mt-ink"><input type="checkbox" className="w-4 h-4 accent-[#3B82C4]" checked={!!editing.auto_renew} onChange={(e) => setEditing({ ...editing, auto_renew: e.target.checked })} /> Renews automatically</label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Status<select className={field} value={editing.status || 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}><option value="active">Active</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></label>
            </div>
            <p className="mt-3 text-[11px] text-mt-faint">Never store passwords here — just the details you need to renew on time.</p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={save} className={btnPrimary}>Save</button>
              <button type="button" onClick={() => setEditing(null)} className={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- email wording

const SAMPLE = { firstName: 'Sara', changedAt: 'Fri, 09 Oct 2026 10:30 UTC' };

function Wording({ flash }: { flash: (t: string) => void }) {
  const [key, setKey] = useState<'welcome' | 'password_changed'>('welcome');
  const [copy, setCopy] = useState<Record<string, EmailCopy>>({ welcome: {}, password_changed: {} });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase
      .from('email_copy')
      .select('*')
      .then(({ data }) => {
        const next: Record<string, EmailCopy> = { welcome: {}, password_changed: {} };
        (data || []).forEach((r: any) => (next[r.key] = { subject: r.subject, heading: r.heading, intro: r.intro, body: r.body }));
        setCopy(next);
      });
  }, []);
  const cur = copy[key] || {};
  const set = (patch: EmailCopy) => setCopy({ ...copy, [key]: { ...cur, ...patch } });
  const preview = useMemo(() => {
    try {
      return key === 'welcome' ? welcomeEmail(SAMPLE, cur) : passwordChangedEmail(SAMPLE, cur);
    } catch (e: any) {
      return { subject: 'Preview error', html: `<p style="font-family:sans-serif;padding:24px">${String(e?.message || e)}</p>`, text: '' };
    }
  }, [key, cur]);
  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const blank = (v?: string | null) => (v && v.trim() ? v : null);
    const { error } = await supabase.from('email_copy').upsert({ key, subject: blank(cur.subject), heading: blank(cur.heading), intro: blank(cur.intro), body: blank(cur.body), updated_at: new Date().toISOString(), updated_by: user?.id || null });
    setSaving(false);
    flash(error ? error.message : 'Saved — the next e-mail uses this wording.');
  };
  const reset = () => setCopy({ ...copy, [key]: {} });
  return (
    <div className="grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
      <AdminCard title="Wording">
        <div className="flex gap-2 mb-4">
          {(
            [
              ['welcome', 'Welcome e-mail'],
              ['password_changed', 'Password changed'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setKey(k)} className={`h-9 px-4 rounded-full text-[13px] font-medium border ${key === k ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-mt-muted flex flex-col gap-1">Subject line<input className={field} value={cur.subject || ''} onChange={(e) => set({ subject: e.target.value })} placeholder={key === 'welcome' ? 'Welcome to Magical Touch Design, {first_name}' : 'Your Magical Touch Design password was changed'} /></label>
          {key === 'welcome' && (
            <>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Headline<input className={field} value={cur.heading || ''} onChange={(e) => set({ heading: e.target.value })} placeholder="Welcome to Magical Touch Design, {first_name}" /></label>
              <label className="text-xs text-mt-muted flex flex-col gap-1">Line under the headline<input className={field} value={cur.intro || ''} onChange={(e) => set({ intro: e.target.value })} placeholder="Your creative journey with Magical Touch Design starts here." /></label>
            </>
          )}
          <label className="text-xs text-mt-muted flex flex-col gap-1">
            Message (leave empty to keep the original; a blank line starts a new paragraph)
            <textarea className={`${field} h-56 py-2 leading-relaxed`} value={cur.body || ''} onChange={(e) => set({ body: e.target.value })} placeholder={key === 'welcome' ? 'I am delighted to welcome you…' : 'If you did not make this change, contact us right away…'} />
          </label>
          <p className="text-[11px] text-mt-faint">Write <code className="px-1 rounded bg-mt-surface2">{'{first_name}'}</code> where the person’s first name should go. The greeting, buttons, safety note and footer are added for you.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving} onClick={save} className={btnPrimary}>{saving ? 'Saving…' : 'Save wording'}</button>
            <button type="button" onClick={reset} className={btnGhost}><RotateCcw size={13} /> Back to original</button>
          </div>
        </div>
      </AdminCard>
      <AdminCard title={<span>Preview <span className="font-normal text-mt-faint">· {preview.subject}</span></span>}>
        <iframe title="E-mail preview" srcDoc={preview.html} sandbox="" className="w-full h-[70vh] rounded-2xl border border-mt-border bg-white" />
      </AdminCard>
    </div>
  );
}
