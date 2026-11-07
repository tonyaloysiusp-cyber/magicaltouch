'use client';

// Admin → Business documents (admins only). The company's official papers in
// one private place: business registration / trade licence, tax, trademark,
// domain, bank and payment accounts, website policies, contracts and IDs.
// Each entry keeps the official website, number, dates, the account email,
// notes and the scanned file.
// Storage (no extra tables needed): each document is a row in the admin-only
// admin_services table with plan = 'Business document' (its own fields in
// `details` as JSON); files go to the private "certificates" bucket under
// business-docs/ — only admins can open them, through a 1-hour link.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, ExternalLink, FileText, Loader2, Paperclip, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';

type Cat = 'registration' | 'tax' | 'trademark' | 'domain' | 'bank' | 'policy' | 'identity' | 'contract' | 'insurance' | 'other';
type Status = 'todo' | 'active' | 'renew' | 'expired' | 'not_needed';
interface Doc {
  id: string; title: string; category: Cat; issuer: string | null; doc_number: string | null; issued_on: string | null; expires_on: string | null;
  official_url: string | null; account_email: string | null; notes: string | null; file_path: string | null; file_name: string | null; status: Status; sort: number | null; updated_at: string;
  live?: string | null; // built-in document that is always up to date
}

const CATS: [Cat, string][] = [
  ['registration', 'Registration & licence'], ['tax', 'Tax'], ['trademark', 'Trademark'], ['domain', 'Domain & website'], ['bank', 'Bank & payments'],
  ['policy', 'Policies'], ['contract', 'Contracts'], ['insurance', 'Insurance'], ['identity', 'Founder ID'], ['other', 'Other'],
];
const CAT_LABEL = Object.fromEntries(CATS) as Record<Cat, string>;
const STATUS: Record<Status, [string, string]> = {
  todo: ['To add', 'bg-mt-surface2 text-mt-muted'],
  active: ['Valid', 'bg-emerald-100 text-emerald-700'],
  renew: ['Renew soon', 'bg-amber-100 text-amber-700'],
  expired: ['Expired', 'bg-rose-100 text-rose-700'],
  not_needed: ['Not needed', 'bg-slate-100 text-slate-500'],
};
const BUCKET = 'certificates';
const FOLDER = 'business-docs';
const MARK = 'Business document';

// admin_services row <-> document
const svcStatus = (st: Status) => (st === 'expired' ? 'expired' : st === 'not_needed' ? 'cancelled' : st === 'todo' ? 'standby' : 'active');
function fromRow(r: any): Doc {
  let d: any = {};
  try { d = JSON.parse(r.details || '{}'); } catch { d = {}; }
  return { id: r.id, title: r.name, category: d.category || 'other', issuer: r.provider || null, doc_number: d.doc_number || null, issued_on: d.issued_on || null, expires_on: r.renews_on || null, official_url: r.account_url || null, account_email: r.account_email || null, notes: r.notes || null, file_path: d.file_path || null, file_name: d.file_name || null, status: d.status || 'todo', sort: r.sort ?? null, updated_at: r.updated_at, live: d.live || null };
}
function toRow(x: Omit<Doc, 'id' | 'updated_at'>) {
  return { name: x.title, kind: 'other', plan: MARK, provider: x.issuer || 'Magical Touch Design', billing_cycle: 'free', cost: null, renews_on: x.expires_on || null, auto_renew: false, status: svcStatus(x.status), account_url: x.official_url || null, account_email: x.account_email || null, notes: x.notes || null, sort: x.sort, details: JSON.stringify({ category: x.category, doc_number: x.doc_number || null, issued_on: x.issued_on || null, file_path: x.file_path || null, file_name: x.file_name || null, status: x.status, live: x.live || null }) };
}

// Built-in documents, made from the site's current data every time.
const LIVE: Record<string, { open: string; pdf: string }> = {
  'company-profile': { open: '/admin/documents/print/company-profile', pdf: '/admin/documents/print/company-profile' },
  'brand-guidelines': { open: '/admin/documents/print/brand-guidelines', pdf: '/admin/documents/print/brand-guidelines' },
  'ownership-record': { open: '/admin/documents/print/ownership-record', pdf: '/admin/documents/print/ownership-record' },
  privacy: { open: '/privacy', pdf: '/privacy?print=1' },
  terms: { open: '/terms', pdf: '/terms?print=1' },
};
const LIVE_BY_TITLE: Record<string, string> = { 'Company profile': 'company-profile', 'Brand guidelines': 'brand-guidelines', 'Website ownership record': 'ownership-record', 'Privacy policy': 'privacy', 'Terms of use': 'terms' };

const STARTERS: [string, Cat, string | null, string | null, string, Status][] = [
  ['Business registration / trade licence', 'registration', 'Government business registry', null, 'Udyam (India MSME), a GST-registered business, or a trade licence where the company is based. Add the number, dates and the certificate.', 'todo'],
  ['Tax registration (GST / VAT)', 'tax', 'Tax authority', 'https://www.gst.gov.in', 'Needed once sales pass the local limit or for paid plans. Keep the certificate and login email here.', 'todo'],
  ['Trademark — "Magical Touch Design" name and logo', 'trademark', 'Trademark office', 'https://ipindia.gov.in', 'Protects the name and logo. Class 42 covers online design software. Keep the application number and status.', 'todo'],
  ['Domain — magicaltouchdesign.com', 'domain', 'Cloudflare Registrar', 'https://dash.cloudflare.com/fddad344660309ea4130ec9e9655a51a/domains/registrations', 'Proof of ownership of the website address. Renews 11 Sep 2027.', 'active'],
  ['Google Business Profile', 'registration', 'Google', 'https://business.google.com', 'The verified business listing on Google Search and Maps.', 'active'],
  ['Business bank account', 'bank', 'Bank', null, 'Account holder name, bank and branch. Never store card numbers or passwords here.', 'todo'],
  ['Payment provider account (Stripe)', 'bank', 'Stripe', 'https://dashboard.stripe.com', 'Business verification documents for receiving payments.', 'todo'],
  ['Privacy policy', 'policy', 'Magical Touch Design', 'https://www.magicaltouchdesign.com/privacy', 'Public page. Review once a year. Built in and always up to date.', 'active'],
  ['Terms of use', 'policy', 'Magical Touch Design', 'https://www.magicaltouchdesign.com/terms', 'Public page. Review once a year. Built in and always up to date.', 'active'],
  ['Company profile', 'other', 'Magical Touch Design', 'https://www.magicaltouchdesign.com/about', 'Two-page company profile. Built in and always up to date.', 'active'],
  ['Brand guidelines', 'other', 'Magical Touch Design', null, 'Logo, colours and type rules. Built in and always up to date.', 'active'],
  ['Website ownership record', 'domain', 'Magical Touch Design', null, 'Internal record of domain, hosting and services. Keep private. Built in and always up to date.', 'active'],
  ['Founder ID and address proof', 'identity', null, null, 'For registrations and bank / payment checks. Private to admins.', 'todo'],
];
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const EMPTY: Omit<Doc, 'id' | 'updated_at'> = { title: '', category: 'registration', issuer: '', doc_number: '', issued_on: null, expires_on: null, official_url: '', account_email: '', notes: '', file_path: null, file_name: null, status: 'todo', sort: null };

const daysLeft = (d: string | null) => (d ? Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000) : null);
// What the list shows: dates win over the saved status.
const liveStatus = (d: Doc): Status => {
  const n = daysLeft(d.expires_on);
  if (n !== null && d.status !== 'not_needed') { if (n < 0) return 'expired'; if (n <= 60) return 'renew'; if (d.status === 'todo' && (d.doc_number || d.file_path)) return 'active'; }
  return d.status;
};
const fmt = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function BusinessDocumentsPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'missing' | 'ok'>('loading');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [cat, setCat] = useState<Cat | 'all'>('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<(Omit<Doc, 'id' | 'updated_at'> & { id?: string }) | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg((x) => (x === m ? null : x)), 5000); };

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('admin_services').select('*').eq('plan', MARK).order('sort', { ascending: true, nullsFirst: false }).order('name');
    if (error) { flash(error.message); setState('ok'); return; }
    let rows = (data as any[]) || [];
    // First visit: add the starting checklist (once).
    if (!rows.length && !sessionStorage.getItem('mt:docs-seeded')) {
      try { sessionStorage.setItem('mt:docs-seeded', '1'); } catch { /* private mode */ }
      const seed = STARTERS.map(([title, category, issuer, official_url, notes, status], i) => toRow({ ...EMPTY, title, category, issuer, official_url, notes, status, sort: (i + 1) * 10, live: LIVE_BY_TITLE[title] || null }));
      const ins = await supabase.from('admin_services').insert(seed).select('*');
      if (!ins.error) rows = (ins.data as any[]) || [];
    }
    setDocs(rows.map(fromRow));
    setState('ok');
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/documents');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      await load();
    })();
  }, [router, load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return docs.filter((d) => (cat === 'all' || d.category === cat) && (!s || [d.title, d.issuer, d.doc_number, d.notes].some((v) => v?.toLowerCase().includes(s))));
  }, [docs, cat, q]);
  const counts = useMemo(() => {
    const c = { todo: 0, active: 0, renew: 0, expired: 0 } as Record<string, number>;
    docs.forEach((d) => { const s = liveStatus(d); if (s in c) c[s]++; });
    return c;
  }, [docs]);

  const openFile = async (d: Doc) => {
    if (!d.file_path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 3600);
    if (error || !data) return flash(error?.message || 'Could not open the file');
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.title.trim()) return flash('Give the document a name.');
    if (edit.official_url && !/^https:\/\/\S+$/.test(edit.official_url)) return flash('The official website must start with https://');
    setBusy(true);
    try {
      let file_path = edit.file_path, file_name = edit.file_name;
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error('The file is larger than 20 MB.');
        const safe = file.name.replace(/[^\w.-]+/g, '-').slice(-80);
        const path = `${FOLDER}/${edit.category}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (error) throw error;
        file_path = path; file_name = file.name;
      }
      const row = { ...toRow({
        title: edit.title.trim(), category: edit.category, issuer: edit.issuer?.trim() || null, doc_number: edit.doc_number?.trim() || null,
        issued_on: edit.issued_on || null, expires_on: edit.expires_on || null, official_url: edit.official_url?.trim() || null,
        account_email: edit.account_email?.trim() || null, notes: edit.notes?.trim() || null, file_path, file_name,
        status: edit.status === 'todo' && (file_path || edit.doc_number) ? 'active' : edit.status, sort: edit.sort ?? (docs.length + 1) * 10, live: edit.live || null,
      }), updated_at: new Date().toISOString() };
      const { error } = edit.id ? await supabase.from('admin_services').update(row).eq('id', edit.id) : await supabase.from('admin_services').insert(row);
      if (error) throw error;
      setEdit(null); setFile(null);
      await load();
      flash('Saved.');
    } catch (e: any) {
      flash(e?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Doc) => {
    if (!window.confirm(`Delete “${d.title}” from the list? This cannot be undone.`)) return;
    const { error } = await supabase.from('admin_services').delete().eq('id', d.id);
    if (error) return flash(error.message);
    setEdit(null);
    await load();
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied')
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg">
        <p className="text-lg font-semibold text-mt-ink">Administrators only</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link>
      </main>
    );

  return (
    <AdminShell active="documents" title="Business documents" accent="Documents" subtitle="Registration, tax, trademark, domain, bank and policy papers — with official links, numbers, expiry dates and the files. Private to admins."
      actions={state === 'ok' ? <button onClick={() => { setEdit({ ...EMPTY }); setFile(null); }} className={`${btn} bg-mt-primary text-mt-onprimary`}><Plus size={14} /> Add document</button> : undefined}>
      <div className="flex flex-col gap-6">
        {msg && <p role="status" className="rounded-2xl bg-mt-accentsoft text-[#4B2FB0] px-4 py-2.5 text-sm">{msg}</p>}
        {state === 'missing' && (
          <div className="rounded-3xl border border-amber-300 bg-amber-50 text-amber-800 p-5 text-[14px]">
            <p className="font-semibold inline-flex items-center gap-2"><AlertTriangle size={16} /> Almost ready</p>
            <p className="mt-1">The private storage for this section is being set up. Refresh in a little while.</p>
          </div>
        )}

        {state === 'ok' && <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([['active', 'Valid'], ['renew', 'Renew within 60 days'], ['expired', 'Expired'], ['todo', 'Still to add']] as const).map(([k, l]) => (
              <div key={k} className="rounded-2xl border border-mt-border bg-mt-surface p-4">
                <p className={`text-2xl font-semibold ${k === 'expired' && counts[k] ? 'text-rose-600' : k === 'renew' && counts[k] ? 'text-amber-600' : ''}`}>{counts[k]}</p>
                <p className="text-[12px] text-mt-muted">{l}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-mt-border bg-mt-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setCat('all')} className={`h-8 px-3 rounded-full text-[12px] border ${cat === 'all' ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>All ({docs.length})</button>
              {CATS.filter(([c]) => docs.some((d) => d.category === c)).map(([c, l]) => (
                <button key={c} onClick={() => setCat(c)} className={`h-8 px-3 rounded-full text-[12px] border ${cat === c ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>
              ))}
              <label className="ml-auto relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-8 w-44 rounded-full border border-mt-input-border bg-mt-surface pl-8 pr-3 text-[12px]" /></label>
            </div>

            <ul className="mt-4 divide-y divide-mt-border">
              {shown.map((d) => {
                const st = liveStatus(d); const n = daysLeft(d.expires_on);
                return (
                  <li key={d.id} className="py-3.5 flex flex-wrap items-start gap-3">
                    <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-mt-surface2"><FileText size={18} /></span>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[14px] font-semibold flex flex-wrap items-center gap-2">{d.title}<span className={`text-[10.5px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS[st][1]}`}>{STATUS[st][0]}</span></p>
                      <p className="mt-0.5 text-[12px] text-mt-muted">
                        {CAT_LABEL[d.category]}{d.issuer ? ` · ${d.issuer}` : ''}{d.doc_number ? ` · No. ${d.doc_number}` : ''}
                        {d.expires_on ? ` · Expires ${fmt(d.expires_on)}${n !== null && n >= 0 ? ` (${n} days)` : ''}` : ''}
                      </p>
                      {d.notes && <p className="mt-1 text-[12px] text-mt-faint line-clamp-2">{d.notes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.live && LIVE[d.live] && <>
                        <a href={LIVE[d.live].open} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-full border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[12px] font-semibold inline-flex items-center gap-1"><FileText size={12} /> Open · always up to date</a>
                        <a href={LIVE[d.live].pdf} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1"><Paperclip size={12} /> Save PDF</a>
                      </>}
                      {d.file_path && <button onClick={() => openFile(d)} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1"><Paperclip size={12} /> File</button>}
                      {d.official_url && <a href={d.official_url} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1"><ExternalLink size={12} /> Official site</a>}
                      <button onClick={() => { setEdit({ ...d }); setFile(null); }} className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold inline-flex items-center gap-1"><Pencil size={12} /> Edit</button>
                    </div>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="py-6 text-[13px] text-mt-muted">Nothing here yet.</li>}
            </ul>
          </section>

          <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 text-[13px] text-mt-muted leading-relaxed">
            <p className="font-semibold text-mt-ink inline-flex items-center gap-2"><ShieldCheck size={16} /> How to use this section</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Add</b> each official paper once: its name, who issued it, the number, the dates and the official website where you renew or log in. Attach the scan or PDF.</li>
              <li><b>Expiry</b>: when a date is within 60 days the document turns <b>Renew soon</b>; after it passes it shows <b>Expired</b>.</li>
              <li><b>Private</b>: files are stored in a private space only admins can open, through a link that expires after one hour.</li>
              <li><b>Never</b> store passwords, card numbers or one-time codes here — keep those in a password manager.</li>
              <li>Hosting, domain and service bills stay in <Link href="/admin?tab=services" className="underline">Hosting & renewals</Link>.</li>
            </ul>
          </section>
        </>}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => !busy && setEdit(null)}>
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-mt-surface p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{edit.id ? 'Edit document' : 'Add document'}</h2><button onClick={() => setEdit(null)} aria-label="Close" className="p-1.5 rounded-full hover:bg-mt-surface2"><X size={18} /></button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 text-[12px] text-mt-muted">Name<input className={field} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Trade licence" /></label>
              <label className="text-[12px] text-mt-muted">Type<select className={field} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as Cat })}>{CATS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
              <label className="text-[12px] text-mt-muted">Status<select className={field} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })}>{(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s][0]}</option>)}</select></label>
              <label className="text-[12px] text-mt-muted">Issued by<input className={field} value={edit.issuer || ''} onChange={(e) => setEdit({ ...edit, issuer: e.target.value })} placeholder="Office or company" /></label>
              <label className="text-[12px] text-mt-muted">Number / reference<input className={field} value={edit.doc_number || ''} onChange={(e) => setEdit({ ...edit, doc_number: e.target.value })} /></label>
              <label className="text-[12px] text-mt-muted">Issued on<input type="date" className={field} value={edit.issued_on || ''} onChange={(e) => setEdit({ ...edit, issued_on: e.target.value || null })} /></label>
              <label className="text-[12px] text-mt-muted">Expires / renew by<input type="date" className={field} value={edit.expires_on || ''} onChange={(e) => setEdit({ ...edit, expires_on: e.target.value || null })} /></label>
              <label className="text-[12px] text-mt-muted">Official website<input className={field} value={edit.official_url || ''} onChange={(e) => setEdit({ ...edit, official_url: e.target.value })} placeholder="https://" inputMode="url" /></label>
              <label className="text-[12px] text-mt-muted">Account email used<input className={field} value={edit.account_email || ''} onChange={(e) => setEdit({ ...edit, account_email: e.target.value })} inputMode="email" /></label>
              <label className="sm:col-span-2 text-[12px] text-mt-muted">Notes<textarea rows={3} className="w-full rounded-xl border border-mt-input-border bg-mt-surface px-3 py-2 text-sm text-mt-ink" value={edit.notes || ''} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="What it is for, how to renew, who to contact" /></label>
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-mt-border p-4 flex flex-wrap items-center gap-3">
                <Paperclip size={16} className="text-mt-faint" />
                <span className="text-[13px] flex-1 min-w-0 truncate">{file ? file.name : edit.file_name ? `Current file: ${edit.file_name}` : 'No file attached (PDF or photo, up to 20 MB)'}</span>
                <button onClick={() => fileRef.current?.click()} className={`${btn} border border-mt-border`}>{edit.file_name || file ? 'Replace file' : 'Attach file'}</button>
                <input ref={fileRef} type="file" accept="application/pdf,image/*,.doc,.docx" hidden onChange={(e) => { setFile(e.target.files?.[0] || null); e.target.value = ''; }} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={save} disabled={busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
              <button onClick={() => setEdit(null)} disabled={busy} className={`${btn} border border-mt-border`}>Cancel</button>
              {edit.id && <button onClick={() => remove(edit as Doc)} disabled={busy} className={`${btn} ml-auto text-rose-600`}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
