'use client';

// ---------------------------------------------------------------------
// app/admin/email/page.tsx -- Email Center (admin only)
// Dashboard · Campaigns · Offers · Users · Email templates · Email log
//
// Admin rights are enforced by the database (RLS + is_admin() checks in
// every admin function) and by the send routes, not just by this page.
// Campaigns go only to people who opted in, carry an unsubscribe link,
// are sent in small batches, and can never reach the same person twice.
// ---------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { apiFetch } from '@/lib/api/client';
import {
  welcomeEmail,
  passwordChangedEmail,
  supabaseConfirmTemplate,
  supabaseResetTemplate,
  campaignEmail,
  RenderedEmail,
} from '@/lib/email/templates';

type Tab = 'dashboard' | 'campaigns' | 'offers' | 'users' | 'templates' | 'log';
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'offers', label: 'Offers' },
  { id: 'users', label: 'Users' },
  { id: 'templates', label: 'Email templates' },
  { id: 'log', label: 'Email log' },
];

const CAMPAIGN_TYPES = [
  ['offer', 'Offer'],
  ['promotion', 'Promotion'],
  ['announcement', 'Announcement'],
  ['newsletter', 'Newsletter'],
  ['new_template', 'New templates'],
  ['special', 'Special campaign'],
] as const;

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  subject: string;
  preheader: string | null;
  content: string;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  audience: string;
  status: string;
  scheduled_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
  offer_id: string | null;
}

interface Offer {
  id: string;
  name: string;
  description: string | null;
  discount: string | null;
  start_date: string | null;
  end_date: string | null;
  target_audience: string;
  landing_page: string | null;
  status: string;
}

const EMPTY_CAMPAIGN: Partial<Campaign> = {
  name: '',
  campaign_type: 'announcement',
  subject: '',
  preheader: '',
  content: '',
  image_url: '',
  cta_label: 'Start creating',
  cta_url: 'https://www.magicaltouchdesign.com/templates',
  audience: 'all_subscribers',
  scheduled_at: null,
};

const input = 'mt-1 w-full border rounded-lg px-2.5 py-2 text-sm text-mt-ink bg-mt-surface';
const label = 'text-xs text-mt-muted';
const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-mt-surface2 text-mt-muted',
  scheduled: 'bg-sky-100 text-sky-700',
  sending: 'bg-amber-100 text-amber-700',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-200 text-slate-600',
  active: 'bg-emerald-100 text-emerald-700',
  ended: 'bg-slate-200 text-slate-600',
};

export default function EmailCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [notice, setNotice] = useState<string | null>(null);

  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [log, setLog] = useState<any[]>([]);

  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'text'>('desktop');
  const [busy, setBusy] = useState<string | null>(null);
  const [sendCheck, setSendCheck] = useState<{ campaign: Campaign; eligible: number; invalid: number } | null>(null);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string>('welcome');
  const [sheets, setSheets] = useState<{ configured: boolean; serviceAccount: string | null } | null>(null);
  const [lastSync, setLastSync] = useState<{ sheetUrl: string; syncedAt: string; written: Record<string, number> } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/admin/email');
        return;
      }
      setUserId(user.id);
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      setIsAdmin(!!profile?.is_admin);
      if (profile?.is_admin) {
        await Promise.all([loadStats(), loadCampaigns(), loadOffers()]);
        // ?newCampaign=<templateId> from Template Manager's "announce" prompt
        const fromTemplate = new URLSearchParams(window.location.search).get('announce');
        if (fromTemplate) {
          const { data: t } = await supabase.from('templates').select('id, name, thumbnail').eq('id', fromTemplate).maybeSingle();
          if (t) {
            setTab('campaigns');
            setEditing({
              ...EMPTY_CAMPAIGN,
              name: `New template: ${t.name}`,
              campaign_type: 'new_template',
              subject: `New template: ${t.name}`,
              preheader: 'A fresh design is ready for you to make your own.',
              content: `We've just added "${t.name}" to Magical Touch Design.\n\nOpen it, make it yours, and save it wherever you like.`,
              image_url: t.thumbnail && /^https:/.test(t.thumbnail) ? t.thumbnail : '',
              cta_label: 'Use this template',
              cta_url: `https://www.magicaltouchdesign.com/templates?template=${t.id}`,
            });
          }
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice((n) => (n === m ? null : n)), 5000);
  };

  const loadStats = async () => {
    const { data } = await supabase.rpc('admin_email_stats');
    if (data) setStats(data as Record<string, number>);
  };
  const loadCampaigns = async () => {
    const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns((data as Campaign[]) || []);
  };
  const loadOffers = async () => {
    const { data } = await supabase.from('email_offers').select('*').order('created_at', { ascending: false });
    setOffers((data as Offer[]) || []);
  };
  const loadUsers = async (q = userSearch) => {
    const { data } = await supabase.rpc('admin_list_users', { p_search: q || null });
    setUsers(data || []);
  };
  const loadLog = async () => {
    const { data } = await supabase.from('email_log').select('*').order('created_at', { ascending: false }).limit(200);
    setLog(data || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'users') loadUsers();
    if (tab === 'log') loadLog();
    if (tab === 'dashboard') {
      loadStats();
      apiFetch('/api/admin/sheets-sync').then((r: any) => setSheets(r)).catch(() => setSheets({ configured: false, serviceAccount: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  const dueCampaigns = campaigns.filter((c) => c.status === 'scheduled' && c.scheduled_at && new Date(c.scheduled_at) <= new Date());

  // ---------- campaigns ----------
  const saveCampaign = async (andThen?: 'test' | 'send') => {
    if (!editing) return null;
    if (!editing.name?.trim()) {
      flash('Give the campaign a name.');
      return null;
    }
    const row = {
      name: editing.name.trim(),
      campaign_type: editing.campaign_type,
      subject: editing.subject || '',
      preheader: editing.preheader || null,
      content: editing.content || '',
      image_url: editing.image_url || null,
      cta_label: editing.cta_label || null,
      cta_url: editing.cta_url || null,
      audience: editing.audience,
      scheduled_at: editing.scheduled_at || null,
      status: editing.scheduled_at ? 'scheduled' : 'draft',
      offer_id: editing.offer_id || null,
      updated_at: new Date().toISOString(),
    };
    setBusy('Saving…');
    const res = editing.id
      ? await supabase.from('email_campaigns').update(row).eq('id', editing.id).select('*').single()
      : await supabase.from('email_campaigns').insert({ ...row, created_by: userId }).select('*').single();
    setBusy(null);
    if (res.error || !res.data) {
      flash('Could not save the campaign.');
      return null;
    }
    const saved = res.data as Campaign;
    setEditing(saved);
    await loadCampaigns();
    if (andThen === 'test') await sendTest(saved);
    if (andThen === 'send') await prepareSend(saved);
    if (!andThen) flash(saved.status === 'scheduled' ? 'Scheduled.' : 'Draft saved.');
    return saved;
  };

  const sendTest = async (c: Campaign) => {
    setBusy('Sending a test to your own e-mail…');
    try {
      const r: any = await apiFetch(`/api/admin/campaigns/${c.id}/test`, { method: 'POST' });
      flash(`Test sent to ${r.to}.`);
    } catch (err: any) {
      flash(err.message || 'Test failed.');
    }
    setBusy(null);
  };

  const prepareSend = async (c: Campaign) => {
    if (!c.subject.trim() || !c.content.trim()) return flash('Add a subject and content first.');
    const { data } = await supabase.rpc('admin_campaign_recipients', { p_verified_only: c.audience === 'verified_subscribers' });
    const list = (data as any[]) || [];
    const invalid = list.filter((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)).length;
    await loadStats();
    setSendCheck({ campaign: c, eligible: list.length - invalid, invalid });
  };

  const sendNow = async () => {
    if (!sendCheck) return;
    const c = sendCheck.campaign;
    setSendCheck(null);
    setEditing(null);
    let total = 0;
    try {
      for (let round = 0; round < 200; round++) {
        const r: any = await apiFetch(`/api/admin/campaigns/${c.id}/send`, { method: 'POST' });
        total = r.total ?? total;
        setBusy(`Sending "${c.name}"… ${Math.max(0, (r.total || 0) - (r.remaining || 0))} of ${r.total || 0}`);
        if (r.done) {
          flash(`"${c.name}" finished sending.`);
          break;
        }
        if (r.paused) {
          flash(r.paused);
          break;
        }
      }
    } catch (err: any) {
      flash(err.message || 'Sending stopped. Press Send again to continue — nobody will get it twice.');
    }
    setBusy(null);
    await Promise.all([loadCampaigns(), loadStats()]);
  };

  const removeCampaign = async (c: Campaign) => {
    if (!window.confirm(`Delete the campaign "${c.name}"?`)) return;
    await supabase.from('email_campaigns').delete().eq('id', c.id);
    loadCampaigns();
  };

  const preview: RenderedEmail | null = useMemo(() => {
    if (!editing) return null;
    try {
      return campaignEmail(
        {
          subject: editing.subject || '(no subject)',
          preheader: editing.preheader,
          content: editing.content || '',
          imageUrl: editing.image_url,
          ctaLabel: editing.cta_label,
          ctaUrl: editing.cta_url,
        },
        { firstName: 'John', unsubscribeUrl: 'https://www.magicaltouchdesign.com/unsubscribe?t=preview' },
      );
    } catch {
      return null;
    }
  }, [editing]);

  // ---------- offers ----------
  const saveOffer = async () => {
    if (!editingOffer?.name?.trim()) return flash('Give the offer a name.');
    const row = {
      name: editingOffer.name.trim(),
      description: editingOffer.description || null,
      discount: editingOffer.discount || null,
      start_date: editingOffer.start_date || null,
      end_date: editingOffer.end_date || null,
      target_audience: editingOffer.target_audience || 'all_subscribers',
      landing_page: editingOffer.landing_page || null,
      status: editingOffer.status || 'draft',
      updated_at: new Date().toISOString(),
    };
    const res = editingOffer.id
      ? await supabase.from('email_offers').update(row).eq('id', editingOffer.id)
      : await supabase.from('email_offers').insert(row);
    if (res.error) return flash('Could not save the offer.');
    setEditingOffer(null);
    loadOffers();
  };

  const campaignFromOffer = (o: Offer) => {
    setTab('campaigns');
    setEditing({
      ...EMPTY_CAMPAIGN,
      name: `Offer: ${o.name}`,
      campaign_type: 'offer',
      subject: o.discount ? `${o.discount} — ${o.name}` : o.name,
      content: [o.description, o.end_date ? `Offer ends ${new Date(o.end_date).toLocaleDateString()}.` : ''].filter(Boolean).join('\n\n'),
      cta_label: 'See the offer',
      cta_url: o.landing_page || 'https://www.magicaltouchdesign.com/',
      offer_id: o.id,
    });
  };

  // ---------- Google Sheets ----------
  const syncSheets = async () => {
    setBusy('Updating Google Sheets…');
    try {
      const r: any = await apiFetch('/api/admin/sheets-sync', { method: 'POST' });
      setLastSync({ sheetUrl: r.sheetUrl, syncedAt: r.syncedAt, written: r.written });
      flash('Google Sheets updated.');
    } catch (err: any) {
      flash(err.message || 'Google Sheets sync failed.');
    }
    setBusy(null);
  };

  // ---------- users export ----------
  const exportUsers = () => {
    const header = ['Email', 'Name', 'Email verified', 'Joined', 'Last login', 'Marketing'];
    const rows = users.map((u) => [u.email, u.name || '', u.email_verified ? 'yes' : 'no', u.created_at, u.last_sign_in_at || '', u.marketing_status]);
    const csv = [header, ...rows].map((r) => r.map((v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `magical-touch-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ---------- template previews ----------
  const templateHtml = useMemo(() => {
    const sample = { firstName: 'John' };
    const map: Record<string, () => string> = {
      welcome: () => welcomeEmail(sample).html,
      verify: () => supabaseConfirmTemplate('https://www.magicaltouchdesign.com/#verify-preview'),
      reset: () => supabaseResetTemplate('https://www.magicaltouchdesign.com/#reset-preview'),
      changed: () => passwordChangedEmail({ ...sample, changedAt: new Date().toUTCString() }).html,
    };
    try {
      return map[templatePreview]();
    } catch {
      return '';
    }
  }, [templatePreview]);

  // ---------- render ----------
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-mt-faint">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-mt-ink">Not authorized</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const stat = (k: string) => (stats ? stats[k] ?? 0 : '…');

  return (
    <div className="min-h-screen bg-transparent">
      <header className="bg-mt-surface border-b px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-mt-ink">Email Center</h1>
          <p className="text-xs text-mt-muted mt-0.5">Sent from hellomagicaltouch.design@gmail.com · marketing goes only to people who opted in.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/templates" className="text-mt-accent hover:underline">Template Manager</Link>
          <Link href="/dashboard" className="text-mt-muted hover:underline">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === t.id ? 'border-mt-accent text-mt-accent' : 'border-transparent text-mt-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {notice && <div className="mt-3 text-sm bg-mt-accentsoft text-[#4B2FB0] rounded-lg px-4 py-2.5">{notice}</div>}
        {busy && <div className="mt-3 text-sm bg-amber-50 text-amber-800 rounded-lg px-4 py-2.5">{busy}</div>}
        {dueCampaigns.length > 0 && (
          <div className="mt-3 text-sm bg-sky-50 text-sky-800 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-2">
            Scheduled campaign due: {dueCampaigns.map((c) => (
              <button key={c.id} onClick={() => prepareSend(c)} className="underline font-semibold">{c.name} — send now</button>
            ))}
          </div>
        )}
      </div>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {tab === 'dashboard' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              ['Total users', 'total_users'],
              ['Verified users', 'verified_users'],
              ['Marketing subscribers', 'subscribers'],
              ['Unsubscribed', 'unsubscribed'],
              ['Welcome e-mails', 'welcome_emails'],
              ['Campaign e-mails sent', 'emails_sent'],
              ['Failed', 'emails_failed'],
              ['Sent in last 24h', 'sent_last_24h'],
              ['Campaigns', 'campaigns'],
              ['Scheduled', 'scheduled_campaigns'],
            ].map(([l, k]) => (
              <div key={k} className="bg-mt-surface border rounded-xl p-4">
                <p className="text-xs text-mt-muted">{l}</p>
                <p className="text-2xl font-semibold text-mt-ink mt-1">{stat(k)}</p>
              </div>
            ))}
            <div className="col-span-full bg-mt-surface border rounded-xl p-4 mt-2 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-semibold text-mt-ink">Google Sheets</p>
                <p className="text-xs text-mt-muted">
                  {sheets === null
                    ? 'Checking…'
                    : sheets.configured
                    ? `Copies Users, Marketing list, Campaigns, Offers and Email logs to your spreadsheet. Shared with ${sheets.serviceAccount}.`
                    : 'Not set up yet. Add GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT in Vercel to turn this on.'}
                  {' '}Passwords and sign-in tokens are never copied.
                </p>
                {lastSync && (
                  <p className="text-xs text-emerald-700 mt-1">
                    Synced {new Date(lastSync.syncedAt).toLocaleString()} ·{' '}
                    {Object.entries(lastSync.written).map(([k, v]) => `${k}: ${v}`).join(' · ')} ·{' '}
                    <a href={lastSync.sheetUrl} target="_blank" rel="noreferrer" className="underline">Open sheet</a>
                  </p>
                )}
              </div>
              <button onClick={syncSheets} disabled={!sheets?.configured || !!busy} className="text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2 disabled:opacity-40">
                Sync to Google Sheets
              </button>
            </div>
            <p className="col-span-full text-xs text-mt-muted mt-2">
              Gmail allows about 500 e-mails a day. Campaigns stop at 400 a day so account e-mails always get through, and continue when you press Send again.
            </p>
          </div>
        )}

        {tab === 'campaigns' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => setEditing({ ...EMPTY_CAMPAIGN })} className="text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2">
                + New campaign
              </button>
            </div>
            <div className="bg-mt-surface border rounded-xl divide-y">
              {campaigns.map((c) => (
                <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-mt-ink">{c.name}</p>
                    <p className="text-xs text-mt-muted">
                      {c.subject || 'No subject yet'} · {CAMPAIGN_TYPES.find((t) => t[0] === c.campaign_type)?.[1]}
                      {c.status === 'scheduled' && c.scheduled_at ? ` · scheduled ${new Date(c.scheduled_at).toLocaleString()}` : ''}
                      {c.total_recipients ? ` · ${c.sent_count}/${c.total_recipients} sent${c.failed_count ? `, ${c.failed_count} failed` : ''}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status] || ''}`}>{c.status}</span>
                  <div className="flex gap-3 text-xs">
                    {c.status !== 'sent' && <button onClick={() => setEditing(c)} className="text-mt-accent">Edit</button>}
                    {c.status !== 'sent' && <button onClick={() => sendTest(c)} disabled={!!busy} className="text-mt-muted">Send test</button>}
                    {(c.status === 'draft' || c.status === 'scheduled' || c.status === 'sending' || c.status === 'failed') && (
                      <button onClick={() => prepareSend(c)} disabled={!!busy} className="text-emerald-700 font-semibold">
                        {c.status === 'sending' ? 'Continue sending' : 'Send'}
                      </button>
                    )}
                    {c.status !== 'sending' && <button onClick={() => removeCampaign(c)} className="text-red-500">Delete</button>}
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <p className="p-8 text-center text-sm text-mt-faint">No campaigns yet.</p>}
            </div>
          </>
        )}

        {tab === 'offers' && (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={() => setEditingOffer({ status: 'draft', target_audience: 'all_subscribers' })} className="text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2">
                + New offer
              </button>
            </div>
            <div className="bg-mt-surface border rounded-xl divide-y">
              {offers.map((o) => (
                <div key={o.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-mt-ink">{o.name} {o.discount && <span className="text-mt-accent">· {o.discount}</span>}</p>
                    <p className="text-xs text-mt-muted">
                      {o.start_date || '—'} → {o.end_date || '—'} {o.landing_page ? `· ${o.landing_page}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => setEditingOffer(o)} className="text-mt-accent">Edit</button>
                    <button onClick={() => campaignFromOffer(o)} className="text-emerald-700 font-semibold">Create campaign</button>
                  </div>
                </div>
              ))}
              {offers.length === 0 && <p className="p-8 text-center text-sm text-mt-faint">No offers yet.</p>}
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="Search e-mail or name, then press Enter"
                className="flex-1 min-w-[220px] border rounded-full px-4 py-2 text-sm bg-mt-surface"
              />
              <button onClick={exportUsers} className="text-sm border rounded-full px-4 py-2 bg-mt-surface">Export CSV</button>
            </div>
            <div className="bg-mt-surface border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-mt-surface2 text-left text-[11px] uppercase tracking-wide text-mt-muted">
                  <tr>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Verified</th>
                    <th className="px-4 py-2">Joined</th>
                    <th className="px-4 py-2">Last login</th>
                    <th className="px-4 py-2">Marketing</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-t">
                      <td className="px-4 py-2">
                        <p className="text-mt-ink">{u.name || '—'} {u.is_admin && <span className="text-[10px] text-mt-accent font-semibold">ADMIN</span>}</p>
                        <p className="text-xs text-mt-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-2 text-xs">{u.email_verified ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-2 text-xs capitalize">{u.marketing_status === 'none' ? 'Not opted in' : u.marketing_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="p-8 text-center text-sm text-mt-faint">No users found.</p>}
            </div>
            <p className="text-xs text-mt-muted mt-2">Passwords, password hashes and sign-in tokens are never shown or exported.</p>
          </>
        )}

        {tab === 'templates' && (
          <div className="grid md:grid-cols-[220px_1fr] gap-4">
            <div className="flex md:flex-col gap-2 flex-wrap">
              {[
                ['welcome', 'CEO welcome'],
                ['verify', 'Verify e-mail'],
                ['reset', 'Reset password'],
                ['changed', 'Password changed'],
              ].map(([id, l]) => (
                <button
                  key={id}
                  onClick={() => setTemplatePreview(id)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border ${templatePreview === id ? 'border-mt-accent bg-mt-accentsoft' : 'bg-mt-surface'}`}
                >
                  {l}
                </button>
              ))}
              <p className="text-xs text-mt-muted md:mt-2">
                Preview uses sample data (John). Verify and Reset are sent by Supabase — their wording is pasted in Supabase → Authentication → Email Templates.
              </p>
            </div>
            <iframe title="Email preview" srcDoc={templateHtml} sandbox="" className="w-full h-[75vh] bg-mt-surface border rounded-xl" />
          </div>
        )}

        {tab === 'log' && (
          <div className="bg-mt-surface border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-mt-surface2 text-left text-[11px] uppercase tracking-wide text-mt-muted">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">To</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <tr key={l.id} className="border-t align-top">
                    <td className="px-4 py-2 text-xs whitespace-nowrap">{new Date(l.sent_at || l.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs">{l.email}</td>
                    <td className="px-4 py-2 text-xs">{l.email_type}</td>
                    <td className="px-4 py-2 text-xs">{l.subject}</td>
                    <td className="px-4 py-2 text-xs">
                      {l.status}
                      {l.failure_reason && <span className="block text-red-500">{l.failure_reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {log.length === 0 && <p className="p-8 text-center text-sm text-mt-faint">No campaign e-mails sent yet.</p>}
            <p className="text-xs text-mt-muted px-4 py-2 border-t">
              &quot;Sent&quot; means Gmail accepted the message; Gmail doesn&apos;t report final delivery.
            </p>
          </div>
        )}
      </main>

      {/* ---------- Campaign editor ---------- */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto" onClick={() => !busy && setEditing(null)}>
          <div className="bg-mt-surface rounded-2xl w-full max-w-5xl p-5 grid lg:grid-cols-2 gap-5" onClick={(e) => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-mt-ink">{editing.id ? 'Edit campaign' : 'New campaign'}</h2>
                <button onClick={() => setEditing(null)} className="p-1 text-mt-faint" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className={`${label} col-span-2`}>Campaign name (internal)<input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={input} /></label>
                <label className={label}>
                  Type
                  <select value={editing.campaign_type} onChange={(e) => setEditing({ ...editing, campaign_type: e.target.value })} className={input}>
                    {CAMPAIGN_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label className={label}>
                  Audience
                  <select value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })} className={input}>
                    <option value="all_subscribers">All subscribers</option>
                    <option value="verified_subscribers">Subscribers with verified e-mail</option>
                  </select>
                </label>
                <label className={`${label} col-span-2`}>Subject<input value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className={input} /></label>
                <label className={`${label} col-span-2`}>Preheader (preview line)<input value={editing.preheader || ''} onChange={(e) => setEditing({ ...editing, preheader: e.target.value })} className={input} /></label>
                <label className={`${label} col-span-2`}>
                  Message (leave a blank line between paragraphs)
                  <textarea rows={7} value={editing.content || ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className={input} />
                </label>
                <label className={`${label} col-span-2`}>Image URL (https, optional)<input value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} className={input} /></label>
                <label className={label}>Button text<input value={editing.cta_label || ''} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} className={input} /></label>
                <label className={label}>Button link (https)<input value={editing.cta_url || ''} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} className={input} /></label>
                <label className={`${label} col-span-2`}>
                  Schedule (optional)
                  <input
                    type="datetime-local"
                    value={editing.scheduled_at ? new Date(editing.scheduled_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditing({ ...editing, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className={input}
                  />
                  <span className="block mt-1 text-[11px] text-mt-faint">When it&apos;s due, the Email Center shows a &quot;send now&quot; reminder.</span>
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2 mt-5">
                <button onClick={() => saveCampaign()} disabled={!!busy} className="text-sm px-4 py-2 rounded-full border text-mt-ink">Save {editing.scheduled_at ? '& schedule' : 'draft'}</button>
                <button onClick={() => saveCampaign('test')} disabled={!!busy} className="text-sm px-4 py-2 rounded-full border text-mt-ink">Send test to me</button>
                <button onClick={() => saveCampaign('send')} disabled={!!busy} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white">Review &amp; send</button>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex gap-1 mb-2 text-xs">
                {(['desktop', 'mobile', 'text'] as const).map((m) => (
                  <button key={m} onClick={() => setPreviewMode(m)} className={`px-3 py-1 rounded-full border ${previewMode === m ? 'bg-[#14121F] text-white' : ''}`}>
                    {m === 'text' ? 'Plain text' : m[0].toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              {preview &&
                (previewMode === 'text' ? (
                  <pre className="whitespace-pre-wrap text-xs bg-mt-surface2 border rounded-xl p-4 h-[65vh] overflow-auto">{preview.text}</pre>
                ) : (
                  <div className="bg-mt-surface2 border rounded-xl p-2 flex justify-center">
                    <iframe title="Campaign preview" srcDoc={preview.html} sandbox="" className="bg-mt-surface h-[65vh] rounded-lg" style={{ width: previewMode === 'mobile' ? 375 : '100%' }} />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Pre-send check ---------- */}
      {sendCheck && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setSendCheck(null)}>
          <div className="bg-mt-surface rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-mt-ink mb-3">Send &quot;{sendCheck.campaign.name}&quot;?</h2>
            <dl className="grid grid-cols-2 gap-y-1.5 text-sm mb-4">
              <dt className="text-mt-muted">Eligible recipients</dt><dd className="font-semibold">{sendCheck.eligible}</dd>
              <dt className="text-mt-muted">Excluded (not opted in)</dt>
              <dd>{Math.max(0, Number(stat('total_users')) - sendCheck.eligible - Number(stat('unsubscribed')) - sendCheck.invalid)}</dd>
              <dt className="text-mt-muted">Unsubscribed</dt><dd>{stat('unsubscribed')}</dd>
              <dt className="text-mt-muted">Invalid addresses</dt><dd>{sendCheck.invalid}</dd>
            </dl>
            <p className="text-xs text-mt-muted mb-4">Sent in small batches with an unsubscribe link. Keep this page open until it finishes; if it stops, press Send again — nobody gets it twice.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSendCheck(null)} className="text-sm px-4 py-2 rounded-full border text-mt-muted">Cancel</button>
              <button onClick={sendNow} disabled={sendCheck.eligible === 0} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white disabled:opacity-40">
                Send to {sendCheck.eligible}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Offer editor ---------- */}
      {editingOffer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditingOffer(null)}>
          <div className="bg-mt-surface rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-mt-ink mb-3">{editingOffer.id ? 'Edit offer' : 'New offer'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={`${label} col-span-2`}>Offer name<input value={editingOffer.name || ''} onChange={(e) => setEditingOffer({ ...editingOffer, name: e.target.value })} className={input} /></label>
              <label className={`${label} col-span-2`}>Description<textarea rows={3} value={editingOffer.description || ''} onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })} className={input} /></label>
              <label className={label}>Discount<input value={editingOffer.discount || ''} onChange={(e) => setEditingOffer({ ...editingOffer, discount: e.target.value })} placeholder="20% off" className={input} /></label>
              <label className={label}>
                Status
                <select value={editingOffer.status || 'draft'} onChange={(e) => setEditingOffer({ ...editingOffer, status: e.target.value })} className={input}>
                  <option value="draft">Draft</option><option value="active">Active</option><option value="ended">Ended</option>
                </select>
              </label>
              <label className={label}>Start<input type="date" value={editingOffer.start_date || ''} onChange={(e) => setEditingOffer({ ...editingOffer, start_date: e.target.value })} className={input} /></label>
              <label className={label}>End<input type="date" value={editingOffer.end_date || ''} onChange={(e) => setEditingOffer({ ...editingOffer, end_date: e.target.value })} className={input} /></label>
              <label className={`${label} col-span-2`}>Landing page (https)<input value={editingOffer.landing_page || ''} onChange={(e) => setEditingOffer({ ...editingOffer, landing_page: e.target.value })} className={input} /></label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditingOffer(null)} className="text-sm px-4 py-2 rounded-full border text-mt-muted">Cancel</button>
              <button onClick={saveOffer} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
