'use client';

// Verified certificates (admins only). Issue a certificate: it gets a
// unique code, is recorded here, and opens in the editor with the name,
// title, date, code and QR code filled in and locked. Anyone can check it
// at /verify. Withdraw a certificate if it was issued by mistake, and see
// codes people tried that don't exist — a sign of fakes going round.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, Copy, Check, ExternalLink, ShieldX, Search, Loader2, QrCode, Ban, Users, Download, Pencil, X, Plus, Trash2 } from 'lucide-react';
import { parseBulkNames, packageCertificates, BulkRow } from '@/lib/certificatesBulk';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { newCertificateCode, verifyUrl, fillCertificateJson } from '@/lib/certificates';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { qrMatrix } from '@/lib/qr';

interface Issue { id: string; code: string; recipient: string; title: string; description: string | null; issued_on: string; status: 'valid' | 'revoked'; revoked_reason: string | null; verify_count: number; last_verified_at: string | null; template_id: string | null; created_at: string }
interface Check { code_tried: string; found: boolean; checked_at: string }
interface Master { id: string; name: string; width: number; height: number; tags?: string[]; canvas_json?: any }

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink focus:outline-none focus:border-[#3B82C4] focus:ring-2 focus:ring-[#8CCBFF]/40';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-40';
const fmt = (iso: string) => new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function QrSvg({ text, size = 140 }: { text: string; size?: number }) {
  const m = useMemo(() => qrMatrix(text, 'M'), [text]);
  const n = m.length + 4;
  let d = '';
  m.forEach((row, y) => row.forEach((v, x) => { if (v) d += `M${x + 2} ${y + 2}h1v1h-1z`; }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" className="rounded-lg bg-white">
      <path d={d} fill="#111" />
    </svg>
  );
}

// Renders the chosen certificate design with the form's values filled in,
// so the name, title, details and date can be checked before issuing.
function CertificatePreview({ master, values }: { master: Master | null; values: { recipient: string; title: string; description: string; issued_on: string } }) {
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!master?.canvas_json) return;
    let alive = true;
    setBusy(true);
    const t = setTimeout(() => {
      const json = fillCertificateJson(master.canvas_json, {
        recipient: values.recipient.trim() || 'Recipient Name',
        title: values.title.trim() || 'Certificate title',
        description: values.description.trim(),
        issued_on: values.issued_on || new Date().toISOString().slice(0, 10),
        code: 'MTD-XXXXX-XXXXX',
      });
      renderTemplatePages(json, 1100)
        .then((p) => { if (alive && p[0]) setImg(p[0].url); })
        .catch(() => {})
        .finally(() => alive && setBusy(false));
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [master, values.recipient, values.title, values.description, values.issued_on]);
  if (!master) return <p className="text-[13px] text-mt-muted">No certificate designs found.</p>;
  return (
    <div className="relative rounded-2xl border border-mt-border bg-mt-surface2 p-3 flex items-center justify-center min-h-[220px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img ? <img src={img} alt="Certificate preview" className="max-h-[460px] w-auto max-w-full rounded shadow-lg" /> : <Loader2 size={20} className="animate-spin text-mt-faint" />}
      {busy && img && <Loader2 size={16} className="absolute top-3 right-3 animate-spin text-mt-faint" />}
      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 text-white text-[11px] px-2.5 py-1">The QR code and certificate number are added when you issue it</span>
    </div>
  );
}

// ---------------------------------------------------------------- bulk issue
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function BulkIssue({ masters, onIssued }: { masters: Master[]; onIssued: () => void }) {
  const [shared, setShared] = useState({ title: '', description: '', issued_on: new Date().toISOString().slice(0, 10), template_id: '' });
  const [pasted, setPasted] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issue[]>([]);
  const masterId = shared.template_id || masters[0]?.id || '';
  const master = masters.find((m) => m.id === masterId) || null;

  const addFromText = () => {
    const add = parseBulkNames(pasted, { title: shared.title, description: shared.description });
    if (!add.length) return setErr('Paste at least one name — one per line.');
    setErr(null);
    setRows((r) => [...r, ...add]);
    setPasted('');
  };
  const setRow = (i: number, patch: Partial<BulkRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const applyShared = () => setRows((r) => r.map((x) => ({ ...x, title: shared.title || x.title, description: shared.description || x.description })));

  const issueAll = async () => {
    setErr(null);
    const clean = rows.map((r) => ({ ...r, recipient: r.recipient.trim(), title: (r.title || shared.title).trim(), description: (r.description || '').trim() }));
    const missing = clean.findIndex((r) => !r.recipient || !r.title);
    if (missing >= 0) return setErr(`Row ${missing + 1} needs a name and a certificate title.`);
    if (!window.confirm(`Issue ${clean.length} certificates? Each gets its own code and QR check.`)) return;
    const { data: { user } } = await supabase.auth.getUser();
    const out: Issue[] = [];
    for (let i = 0; i < clean.length; i += 50) {
      setBusy(`Issuing ${Math.min(i + 50, clean.length)} of ${clean.length}…`);
      const chunk = clean.slice(i, i + 50).map((r) => ({ code: newCertificateCode(), recipient: r.recipient, title: r.title, description: r.description || null, issued_on: shared.issued_on, template_id: masterId || null, created_by: user?.id }));
      const { data, error } = await supabase.from('certificate_issues').insert(chunk).select('*');
      if (error) {
        // A code clash is astronomically rare; retry those one by one.
        for (const one of chunk) {
          const { data: d } = await supabase.from('certificate_issues').insert({ ...one, code: newCertificateCode() }).select('*').single();
          if (d) out.push(d as Issue);
        }
      } else out.push(...((data as Issue[]) || []));
    }
    setIssued(out);
    setRows([]);
    setBusy(null);
    onIssued();
  };

  const download = async (mode: 'pdf' | 'zip') => {
    if (!master?.canvas_json || !issued.length) return;
    setBusy(`Preparing 0 of ${issued.length}…`);
    try {
      const { blob, fileName } = await packageCertificates(master.canvas_json, issued as any, mode, (d, t) => setBusy(`Preparing ${d} of ${t}…`));
      downloadBlob(blob, fileName);
    } catch (e: any) {
      setErr(`Download failed: ${e?.message || e}`);
    }
    setBusy(null);
  };

  const preview = rows[previewIdx] || rows[0];
  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-[12px] text-mt-muted">Certificate title (for everyone)<input className={field} value={shared.title} onChange={(e) => setShared({ ...shared, title: e.target.value })} placeholder="e.g. Brand Design Workshop" /></label>
        <label className="text-[12px] text-mt-muted">Details (for everyone, optional)<input className={field} value={shared.description} onChange={(e) => setShared({ ...shared, description: e.target.value })} placeholder="e.g. 12-hour course · Dubai · November 2026" /></label>
        <label className="text-[12px] text-mt-muted">Date<input type="date" className={field} value={shared.issued_on} onChange={(e) => setShared({ ...shared, issued_on: e.target.value })} /></label>
        <label className="text-[12px] text-mt-muted">Design<select className={field} value={masterId} onChange={(e) => setShared({ ...shared, template_id: e.target.value })}>{masters.map((m) => <option key={m.id} value={m.id}>{m.name.replace(/^MT Brand · /, '')}</option>)}</select></label>
      </div>

      <div>
        <label className="text-[12px] text-mt-muted block">
          Names — one per line. You can also paste from Excel or Google Sheets (Name, Title, Details).
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} placeholder={'Aisha Rahman\nOmar Haddad\nPriya Sharma, Advanced Photo Editing\n…'} className="mt-1 w-full rounded-xl border border-mt-input-border bg-mt-surface px-3 py-2 text-sm text-mt-ink font-mono" />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={addFromText} className={`${btn} bg-mt-primary text-mt-onprimary`}><Users size={14} /> Add names to the list</button>
          <button type="button" onClick={() => setRows((r) => [...r, { recipient: '', title: shared.title, description: shared.description }])} className={`${btn} border border-mt-border text-mt-ink`}><Plus size={14} /> Add one row</button>
          {rows.length > 0 && <button type="button" onClick={applyShared} className={`${btn} border border-mt-border text-mt-ink`}>Use the title & details above for every row</button>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid xl:grid-cols-[1.2fr_1fr] gap-5">
          <div>
            <p className="text-[13px] font-semibold text-mt-ink">{rows.length} certificate{rows.length > 1 ? 's' : ''} ready — check and correct anything before issuing</p>
            <div className="mt-2 max-h-[420px] overflow-auto rounded-xl border border-mt-border">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-mt-surface2 text-left text-mt-muted"><tr><th className="px-2 py-2 w-8">#</th><th className="px-2">Name</th><th className="px-2">Title</th><th className="px-2">Details</th><th className="w-8" /></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} onClick={() => setPreviewIdx(i)} className={`border-t border-mt-border ${i === previewIdx ? 'bg-[#3B82C4]/10' : ''}`}>
                      <td className="px-2 text-mt-faint">{i + 1}</td>
                      <td className="px-1 py-1"><input aria-label={`Name ${i + 1}`} className="w-full h-8 rounded-lg border border-transparent hover:border-mt-border focus:border-[#3B82C4] bg-transparent px-2" value={r.recipient} onChange={(e) => setRow(i, { recipient: e.target.value })} /></td>
                      <td className="px-1"><input aria-label={`Title ${i + 1}`} className="w-full h-8 rounded-lg border border-transparent hover:border-mt-border focus:border-[#3B82C4] bg-transparent px-2" value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} /></td>
                      <td className="px-1"><input aria-label={`Details ${i + 1}`} className="w-full h-8 rounded-lg border border-transparent hover:border-mt-border focus:border-[#3B82C4] bg-transparent px-2" value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} /></td>
                      <td className="px-1"><button type="button" aria-label={`Remove row ${i + 1}`} onClick={(e) => { e.stopPropagation(); setRows((x) => x.filter((_, j) => j !== i)); }} className="p-1.5 rounded-lg text-mt-faint hover:text-rose-600"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled={!!busy} onClick={issueAll} className={`${btn} bg-emerald-600 text-white`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />} Issue {rows.length} certificate{rows.length > 1 ? 's' : ''}</button>
              <button type="button" onClick={() => setRows([])} className="text-[13px] text-mt-muted hover:text-mt-ink">Clear list</button>
              {busy && <span className="text-[13px] text-mt-muted">{busy}</span>}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-mt-muted mb-2">Preview of row {Math.min(previewIdx, rows.length - 1) + 1} — click a row to preview it</p>
            {preview && <CertificatePreview master={master} values={{ recipient: preview.recipient, title: preview.title || shared.title, description: preview.description, issued_on: shared.issued_on }} />}
          </div>
        </div>
      )}
      {err && <p className="text-[13px] text-rose-600">{err}</p>}

      {issued.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
          <p className="text-[14px] font-semibold text-mt-ink">{issued.length} certificates issued — each has its own code and QR check.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!busy} onClick={() => download('pdf')} className={`${btn} bg-mt-primary text-mt-onprimary`}><Download size={14} /> Download all — one PDF</button>
            <button type="button" disabled={!!busy} onClick={() => download('zip')} className={`${btn} border border-mt-border text-mt-ink`}><Download size={14} /> Download ZIP — one PDF per person</button>
            {busy && <span className="text-[13px] text-mt-muted inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> {busy}</span>}
          </div>
          <p className="mt-2 text-[12px] text-mt-muted">Need to change one? Use <b>Edit</b> or <b>Open</b> in the list below — every certificate can still be corrected by hand.</p>
        </div>
      )}
    </div>
  );
}

export default function CertificatesAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ recipient: '', title: '', description: '', issued_on: new Date().toISOString().slice(0, 10), template_id: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Issue | null>(null);
  const [mode, setMode] = useState<'one' | 'bulk'>('one');
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ recipient: '', title: '', description: '' });
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: i }, { data: c }, { data: m }] = await Promise.all([
      supabase.from('certificate_issues').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('certificate_checks').select('code_tried, found, checked_at').eq('found', false).order('checked_at', { ascending: false }).limit(200),
      supabase.from('templates').select('id, name, width, height, category, tags, canvas_json').contains('tags', ['mt-internal']).order('name'),
    ]);
    setIssues((i as Issue[]) || []);
    setChecks((c as Check[]) || []);
    // Secure masters (guilloche, microtext, QR slot) first.
    const ms = ((m as any[]) || [])
      .filter((t) => /certificate/i.test(t.name) || (t.tags || []).includes('certificate-master'))
      .sort((a, b) => Number((b.tags || []).includes('secure')) - Number((a.tags || []).includes('secure')) || a.name.localeCompare(b.name));
    setMasters(ms);
    setForm((f) => (f.template_id || !ms.length ? f : { ...f, template_id: ms[0].id }));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login?next=/admin/certificates');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      await load();
      setState('ok');
    })();
  }, [router, load]);

  const issue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.recipient.trim() || !form.title.trim()) return setErr('Add the name and the certificate title.');
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let row: Issue | null = null;
    for (let tries = 0; tries < 4 && !row; tries++) {
      const { data, error } = await supabase
        .from('certificate_issues')
        .insert({ code: newCertificateCode(), recipient: form.recipient.trim(), title: form.title.trim(), description: form.description.trim() || null, issued_on: form.issued_on, template_id: form.template_id || null, created_by: user?.id })
        .select('*')
        .single();
      if (data) row = data as Issue;
      else if (error && !/duplicate|unique/i.test(error.message)) { setErr(error.message); break; }
    }
    setBusy(false);
    if (row) {
      setMade(row);
      setForm((f) => ({ ...f, recipient: '', description: '' }));
      load();
    }
  };

  const revoke = async (r: Issue) => {
    const reason = window.prompt(`Withdraw the certificate for ${r.recipient}? It will show as withdrawn when checked.\n\nReason (shown on the check page):`, 'Issued in error');
    if (reason === null) return;
    await supabase.from('certificate_issues').update({ status: 'revoked', revoked_reason: reason || null, revoked_at: new Date().toISOString() }).eq('id', r.id);
    load();
  };
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(t); setTimeout(() => setCopied(null), 1200); });
  // Correct a certificate by hand (name, title, details). The code stays the
  // same, so the QR check shows the corrected details.
  const saveEdit = async (r: Issue) => {
    if (!editForm.recipient.trim() || !editForm.title.trim()) return;
    await supabase.from('certificate_issues').update({ recipient: editForm.recipient.trim(), title: editForm.title.trim(), description: editForm.description.trim() || null }).eq('id', r.id);
    setEditId(null);
    load();
  };
  const downloadOne = async (r: Issue) => {
    const m = masters.find((x) => x.id === r.template_id) || masters[0];
    if (!m?.canvas_json) return;
    setRowBusy(r.id);
    try {
      const { blob } = await packageCertificates(m.canvas_json, [r as any], 'pdf');
      downloadBlob(blob, `${r.recipient} — ${r.code}.pdf`);
    } finally {
      setRowBusy(null);
    }
  };
  const editorHref = (r: Issue) => {
    const m = masters.find((x) => x.id === r.template_id) || masters[0];
    return m ? `/editor?w=${m.width}&h=${m.height}&templateId=${m.id}&from=brand&cert=${encodeURIComponent(r.code)}` : null;
  };
  const list = issues.filter((r) => !q || `${r.recipient} ${r.title} ${r.code}`.toLowerCase().includes(q.toLowerCase()));
  const fakeCodes = useMemo(() => {
    const m = new Map<string, { n: number; last: string }>();
    checks.forEach((c) => { const v = m.get(c.code_tried); m.set(c.code_tried, { n: (v?.n || 0) + 1, last: v?.last || c.checked_at }); });
    return [...m.entries()].slice(0, 30);
  }, [checks]);

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link></main>;

  return (
    <AdminShell active="certificates" title="Verified certificates" accent="certificates" subtitle="Issue certificates that can be checked by anyone — a unique code and QR code on every one, so copies and fakes are easy to spot.">
      <div className="flex flex-col gap-6">
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-mt-ink inline-flex items-center gap-2"><Award size={19} /> Issue certificates</h2>
            <div role="tablist" className="inline-flex rounded-full border border-mt-border p-0.5 text-[13px] font-medium">
              {(['one', 'bulk'] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-8 px-4 rounded-full ${mode === m ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted hover:text-mt-ink'}`}>{m === 'one' ? 'One certificate' : 'Many at once (bulk)'}</button>
              ))}
            </div>
          </div>
          {mode === 'bulk' ? <BulkIssue masters={masters} onIssued={load} /> : (<>
          <form onSubmit={issue} className="mt-4 grid md:grid-cols-2 gap-3">
            <label className="text-[12px] text-mt-muted">Awarded to<input className={field} value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Full name, as it should appear" /></label>
            <label className="text-[12px] text-mt-muted">Certificate title<input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Certificate of Completion — Brand Design Workshop" /></label>
            <label className="text-[12px] text-mt-muted md:col-span-2">Details (optional)<input className={field} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 12-hour course, Dubai, November 2026" /></label>
            <label className="text-[12px] text-mt-muted">Date<input type="date" className={field} value={form.issued_on} onChange={(e) => setForm({ ...form, issued_on: e.target.value })} /></label>
            <label className="text-[12px] text-mt-muted">Design<select className={field} value={form.template_id} onChange={(e) => setForm({ ...form, template_id: e.target.value })}>{masters.map((m) => <option key={m.id} value={m.id}>{m.name.replace(/^MT Brand · /, '')}</option>)}</select></label>
            <div className="md:col-span-2">
              <p className="text-[12px] text-mt-muted mb-2">Live preview — updates as you type</p>
              <CertificatePreview master={masters.find((m) => m.id === form.template_id) || null} values={form} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button type="submit" disabled={busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />} Issue certificate</button>
              <span className="text-[12px] text-mt-muted">Then open it in the editor to change any wording, download or print.</span>
              {err && <p className="text-[13px] text-rose-600">{err}</p>}
            </div>
          </form>
          {made && (
            <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 flex flex-wrap items-center gap-5">
              <QrSvg text={verifyUrl(made.code)} size={120} />
              <div className="flex-1 min-w-[220px]">
                <p className="text-[13px] text-mt-muted">Issued to <b className="text-mt-ink">{made.recipient}</b></p>
                <p className="font-mono text-lg tracking-wider text-mt-ink">{made.code}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editorHref(made) && <Link href={editorHref(made)!} className={`${btn} bg-mt-primary text-mt-onprimary`}><ExternalLink size={14} /> Open certificate in editor</Link>}
                  <button onClick={() => copy(verifyUrl(made.code))} className={`${btn} border border-mt-border text-mt-ink`}>{copied === verifyUrl(made.code) ? <Check size={14} /> : <Copy size={14} />} Copy check link</button>
                </div>
              </div>
            </div>
          )}
          </>)}
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-mt-ink">Issued certificates <span className="text-mt-muted font-normal">({issues.length})</span></h2>
            <label className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" /><input className={`${field} pl-8 w-64`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, title or code" /></label>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-left text-mt-muted"><tr><th className="py-2 pr-3">Code</th><th className="pr-3">Awarded to</th><th className="pr-3">Certificate</th><th className="pr-3">Date</th><th className="pr-3">Checked</th><th className="pr-3">Status</th><th /></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-t border-mt-border align-top">
                    <td className="py-2.5 pr-3 font-mono whitespace-nowrap">{r.code}</td>
                    {editId === r.id ? (
                      <>
                        <td className="pr-2 py-1"><input aria-label="Edit name" className={`${field} h-8`} value={editForm.recipient} onChange={(e) => setEditForm({ ...editForm, recipient: e.target.value })} /></td>
                        <td className="pr-2 py-1"><input aria-label="Edit title" className={`${field} h-8`} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /><input aria-label="Edit details" placeholder="Details" className={`${field} h-8 mt-1`} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></td>
                      </>
                    ) : (
                      <>
                        <td className="pr-3 font-semibold text-mt-ink">{r.recipient}</td>
                        <td className="pr-3">{r.title}{r.description ? <span className="block text-[12px] text-mt-muted">{r.description}</span> : null}</td>
                      </>
                    )}
                    <td className="pr-3 whitespace-nowrap">{fmt(r.issued_on)}</td>
                    <td className="pr-3 whitespace-nowrap">{r.verify_count}×{r.last_verified_at ? ` · ${fmt(r.last_verified_at)}` : ''}</td>
                    <td className="pr-3">{r.status === 'valid' ? <span className="text-emerald-600 font-semibold">Valid</span> : <span className="text-amber-600 font-semibold" title={r.revoked_reason || ''}>Withdrawn</span>}</td>
                    <td className="py-2 whitespace-nowrap text-right">
                      {editId === r.id ? (
                        <>
                          <button onClick={() => saveEdit(r)} className="inline-flex items-center gap-1 text-emerald-600 font-semibold mr-3"><Check size={13} /> Save</button>
                          <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 text-mt-muted mr-3"><X size={13} /> Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => { setEditId(r.id); setEditForm({ recipient: r.recipient, title: r.title, description: r.description || '' }); }} className="inline-flex items-center gap-1 text-mt-muted hover:text-mt-ink mr-3"><Pencil size={13} /> Edit</button>
                      )}
                      <button onClick={() => downloadOne(r)} disabled={rowBusy === r.id} className="inline-flex items-center gap-1 text-mt-muted hover:text-mt-ink mr-3">{rowBusy === r.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} PDF</button>
                      {editorHref(r) && <Link href={editorHref(r)!} className="inline-flex items-center gap-1 text-[#3B82C4] font-semibold mr-3"><ExternalLink size={13} /> Open</Link>}
                      <button onClick={() => copy(verifyUrl(r.code))} className="inline-flex items-center gap-1 text-mt-muted hover:text-mt-ink mr-3"><QrCode size={13} /> {copied === verifyUrl(r.code) ? 'Copied' : 'Link'}</button>
                      {r.status === 'valid' && <button onClick={() => revoke(r)} className="inline-flex items-center gap-1 text-rose-600"><Ban size={13} /> Withdraw</button>}
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={7} className="py-6 text-center text-mt-muted">No certificates yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold text-mt-ink inline-flex items-center gap-2"><ShieldX size={19} className="text-rose-600" /> Codes that didn’t match</h2>
          <p className="mt-1 text-[13px] text-mt-muted">Someone checked these codes at /verify and no certificate exists. Repeated codes usually mean a fake certificate is being shown around.</p>
          <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {fakeCodes.map(([c, v]) => (
              <li key={c} className="rounded-xl border border-mt-border px-3 py-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] truncate">{c}</span>
                <span className="text-[12px] text-mt-muted whitespace-nowrap">{v.n}× · {fmt(v.last)}</span>
              </li>
            ))}
            {!fakeCodes.length && <li className="text-[13px] text-mt-muted">None so far.</li>}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}
