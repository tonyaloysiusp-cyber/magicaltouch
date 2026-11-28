'use client';
// Admin → Storage. Where the free plan's space goes (database tables and
// file buckets), what can be cleaned safely, and buttons that clean it.
// Users' own designs, profiles, purchases, unlocks and certificates are never
// touched; templates someone bought or unlocked are always kept.
// Every clean-up counts first and asks before deleting.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, HardDrive, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';

// Supabase free plan (public pricing page).
const LIMIT = { db: 500, files: 1024, egress: 5 * 1024 };
const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 md:p-6';
const btn = 'inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-[13px] font-semibold disabled:opacity-50';

const withTimeout = <T,>(p: PromiseLike<T>, ms = 12000) =>
  Promise.race([Promise.resolve(p), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('The database did not answer in time.')), ms))]);

function Bar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="mt-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-mt-surface2"><div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
      <p className="mt-1 text-[12px] text-mt-muted tabular-nums">{used.toLocaleString()} MB of {limit.toLocaleString()} MB ({pct}%)</p>
    </div>
  );
}

const CLEANS: { kind: 'versions' | 'logs' | 'archived' | 'backup'; title: string; detail: string }[] = [
  { kind: 'versions', title: 'Old template versions', detail: 'Backups made each time a template is saved. Keeps the newest 3 of each template.' },
  { kind: 'archived', title: 'Archived and unpublished templates', detail: 'Templates you took off the site. Deleted for good with their versions — except any that someone bought or unlocked.' },
  { kind: 'logs', title: 'Visit, search and error counts older than 90 days', detail: 'Daily counters used by the statistics page. Recent 90 days stay.' },
  { kind: 'backup', title: 'Template copy backup', detail: 'A one-off safety copy made while template wording was rewritten.' },
];

const GUIDE: [string, string[]][] = [
  ['Where the space goes', [
    'Database (500 MB on the free plan): templates are the biggest — each one holds its whole design. Old versions, archived templates and statistics add up too.',
    'File storage (1 GB): template pictures (thumbnails and previews) in “template-media”, profile photos in “avatars”, issued certificates in “certificates”, and old uploads in “design-assets”.',
    'Egress (5 GB a month): every picture or row sent to a visitor. Template pictures and the catalogue are now served from Cloudflare instead, so this stays low.',
  ]],
  ['How to clean', [
    'Use the buttons on this page: each one counts first, shows the number and asks before deleting.',
    '“Unused template pictures” are files no template mentions any more — left behind when templates were deleted. Removing them frees file storage straight away.',
    'Deleted database rows free their space for new rows at once; the database size figure itself shrinks only after Supabase’s automatic clean-up runs.',
    'Users’ designs are saved on their own devices, so there is nothing of theirs here to clean. Profiles, purchases and certificates are never touched.',
  ]],
  ['By hand in Supabase (if ever needed)', [
    'supabase.com/dashboard → your project → Storage → pick a bucket → select files → Delete.',
    'Organization → Usage shows database size, storage, egress and the billing cycle reset date.',
    'Don’t delete the “avatars” or “certificates” buckets — they belong to people.',
  ]],
];

export default function AdminStoragePage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'down'>('loading');
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [catalog, setCatalog] = useState<{ count: number; built: string } | null>(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      const { data, error } = await withTimeout(supabase.rpc('admin_storage_report'), 25000);
      if (error) throw new Error(error.message);
      setR(data);
    } catch (e: any) { setErr(e?.message || 'Could not read storage.'); }
  }, []);

  useEffect(() => {
    fetch('/catalog/count.json').then((x) => (x.ok ? x.json() : null)).then(setCatalog).catch(() => {});
    (async () => {
      try {
        const { data: { user } } = await withTimeout(getSessionUser());
        if (!user) { router.push('/login?next=/admin/storage'); return; }
        const profile = await withTimeout(getOrCreateProfile(user.id, user.email?.split('@')[0]));
        if (!profile?.is_admin) { setState('denied'); return; }
        setState('ok');
        load();
      } catch { setState('down'); }
    })();
  }, [router, load]);

  const clean = async (kind: string, title: string) => {
    setBusy(kind); setMsg('');
    try {
      const { data: dry, error } = await supabase.rpc('admin_storage_clean', { p_kind: kind, p_dry: true });
      if (error) throw new Error(error.message);
      const n = Number((dry as any)?.rows || 0);
      if (!n) { setMsg(`${title}: nothing to clean.`); return; }
      if (!window.confirm(`${title}: ${n.toLocaleString()} row(s) will be deleted permanently. This can’t be undone. Continue?`)) { setMsg('Nothing changed.'); return; }
      const { data: done, error: e2 } = await supabase.rpc('admin_storage_clean', { p_kind: kind, p_dry: false });
      if (e2) throw new Error(e2.message);
      setMsg(`${title}: deleted ${Number((done as any)?.rows || 0).toLocaleString()} row(s).`);
      load();
    } catch (e: any) { setMsg(e?.message || 'That didn’t work.'); } finally { setBusy(null); }
  };

  const cleanFiles = async () => {
    const total = Number(r?.orphan_files || 0);
    if (!total) { setMsg('No unused template pictures.'); return; }
    if (!window.confirm(`Delete ${total.toLocaleString()} unused template picture(s) (${r?.orphan_mb} MB)? No template uses them. This can’t be undone.`)) { setMsg('Nothing changed.'); return; }
    setBusy('files'); setMsg('');
    let removed = 0;
    try {
      for (let round = 0; round < 200; round++) {
        const { data, error } = await supabase.rpc('admin_storage_orphans', { p_limit: 500 });
        if (error) throw new Error(error.message);
        const rows = ((data as any[]) || []) as { bucket: string; name: string }[];
        if (!rows.length) break;
        for (const bucket of ['template-media', 'template-thumbs']) {
          const names = rows.filter((x) => x.bucket === bucket).map((x) => x.name);
          for (let i = 0; i < names.length; i += 100) {
            const { data: gone, error: e2 } = await supabase.storage.from(bucket).remove(names.slice(i, i + 100));
            if (e2) throw new Error(e2.message);
            removed += gone?.length || 0;
            setMsg(`Deleting… ${removed.toLocaleString()} of ${total.toLocaleString()}`);
          }
        }
        if (rows.length < 500) break;
      }
      setMsg(`Deleted ${removed.toLocaleString()} unused picture(s).`);
      load();
    } catch (e: any) { setMsg(`Stopped after ${removed.toLocaleString()} file(s): ${e?.message || 'error'}`); } finally { setBusy(null); }
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/" className="text-sm text-mt-accent hover:underline">Back to the site</Link></main>;

  const filesMb = (r?.buckets || []).reduce((a: number, b: any) => a + Number(b.mb || 0), 0);
  const tCounts = r?.templates || {};
  const tTotal = Object.values(tCounts).reduce((a: number, n: any) => a + Number(n), 0);

  return (
    <AdminShell active="storage" title="Storage" accent="Storage" subtitle="Where the space goes on the free plan, and safe clean-ups. People’s own designs, profiles, purchases and certificates are never touched.">
      <div className="flex flex-col gap-6">
        {(state === 'down' || err) && (
          <section className={`${card} border-amber-300`}>
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} className="text-amber-600" /> The database isn’t answering right now</p>
            <p className="mt-1 text-[13px] text-mt-muted">{err || 'Sign-in could not be checked.'} On the free plan the database is limited until the billing cycle resets. The site and every tool keep working; this page fills in once the database is back. The guide below still applies.</p>
            {state === 'ok' && <button onClick={load} className={`${btn} mt-3 border border-mt-border`}><RefreshCw size={13} /> Try again</button>}
          </section>
        )}

        {r && (
          <>
            <section className={card}>
              <div className="flex items-center gap-3">
                <h2 className="flex-1 text-lg font-semibold">Space used</h2>
                <button onClick={load} disabled={!!busy} className={`${btn} border border-mt-border`}><RefreshCw size={13} /> Refresh</button>
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div><p className="text-[13px] font-semibold">Database</p><Bar used={Number(r.db_size_mb)} limit={LIMIT.db} /></div>
                <div><p className="text-[13px] font-semibold">File storage</p><Bar used={Math.round(filesMb * 10) / 10} limit={LIMIT.files} /></div>
              </div>
              <p className="mt-3 text-[12px] text-mt-faint">Egress (data sent, {LIMIT.egress / 1024} GB a month) is shown in Supabase → Organization → Usage.</p>
              {msg && <p className="mt-3 rounded-2xl bg-mt-accentsoft px-4 py-2.5 text-sm text-[#4B2FB0]" role="status">{msg}</p>}
            </section>

            <section className={card}>
              <h2 className="text-lg font-semibold">Clean up</h2>
              <ul className="mt-3 divide-y divide-mt-border">
                <li className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[14px] font-semibold">Unused template pictures — {Number(r.orphan_files).toLocaleString()} files, {r.orphan_mb} MB</p>
                    <p className="text-[12.5px] text-mt-muted">Thumbnails and previews no template uses any more (left behind by deleted templates).</p>
                  </div>
                  <button onClick={cleanFiles} disabled={!!busy || !Number(r.orphan_files)} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy === 'files' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete</button>
                </li>
                {CLEANS.map((c) => {
                  const hint = c.kind === 'versions' ? `${Number(r.versions_extra).toLocaleString()} beyond the newest 3 (${r.versions_mb} MB table)` : c.kind === 'logs' ? `${Number(r.logs_old).toLocaleString()} rows` : c.kind === 'archived' ? `${(Number(tCounts.archived || 0) + Number(tCounts.unpublished || 0)).toLocaleString()} templates` : `${Number(r.backup_rows).toLocaleString()} rows`;
                  return (
                    <li key={c.kind} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-[220px] flex-1">
                        <p className="text-[14px] font-semibold">{c.title} — {hint}</p>
                        <p className="text-[12.5px] text-mt-muted">{c.detail}</p>
                      </div>
                      <button onClick={() => clean(c.kind, c.title)} disabled={!!busy} className={`${btn} border border-mt-border`}>{busy === c.kind ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Count & clean</button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[12px] text-mt-faint">{Number(r.templates_protected).toLocaleString()} template(s) were bought or unlocked by someone and are always kept.</p>
            </section>

            <FileBrowser buckets={(r.buckets || []).map((b: any) => b.bucket_id)} onChanged={load} />

            <section className={card}>
              <h2 className="text-lg font-semibold">Details</h2>
              <div className="mt-3 grid gap-6 text-[13px] md:grid-cols-3">
                <div>
                  <p className="mb-1 font-semibold">Biggest tables</p>
                  <ul className="divide-y divide-mt-border">{(r.tables || []).map((t: any) => <li key={t.name} className="flex justify-between gap-2 py-1"><span className="truncate">{t.name}</span><span className="shrink-0 tabular-nums text-mt-muted">{t.mb} MB · {Number(t.rows).toLocaleString()}</span></li>)}</ul>
                </div>
                <div>
                  <p className="mb-1 font-semibold">File buckets</p>
                  <ul className="divide-y divide-mt-border">{(r.buckets || []).map((b: any) => <li key={b.bucket_id} className="flex justify-between gap-2 py-1"><span>{b.bucket_id}</span><span className="tabular-nums text-mt-muted">{b.mb} MB · {Number(b.files).toLocaleString()} files</span></li>)}</ul>
                </div>
                <div>
                  <p className="mb-1 font-semibold">Templates ({tTotal.toLocaleString()})</p>
                  <ul className="divide-y divide-mt-border">{Object.entries(tCounts).map(([s, n]) => <li key={s} className="flex justify-between py-1"><span className="capitalize">{s}</span><span className="tabular-nums text-mt-muted">{Number(n).toLocaleString()}</span></li>)}</ul>
                </div>
              </div>
            </section>
          </>
        )}

        <section className={card}>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><HardDrive size={17} /> Site files on Cloudflare</h2>
          <p className="mt-1 text-[13px] text-mt-muted">
            The template catalogue ships with the site as static files, so browsing templates doesn’t use the database.
            {catalog ? ` It holds ${catalog.count.toLocaleString()} templates (updated ${new Date(catalog.built).toLocaleString('en-GB')}).` : ''} It refreshes twice a day from the database; deleted templates drop out on the next refresh.
          </p>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold">Guide</h2>
          <div className="mt-3 grid gap-5 md:grid-cols-3">
            {GUIDE.map(([h, items]) => (
              <div key={h}>
                <p className="text-[13.5px] font-semibold">{h}</p>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-[12.5px] text-mt-muted">{items.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}


// Browse every file in a bucket: preview, size, date, whether a template
// still uses it, and delete the ones you pick. People's own buckets
// (avatars, certificates, design-assets) are view-only.
const PROTECTED = ['avatars', 'certificates', 'design-assets'];
function FileBrowser({ buckets, onChanged }: { buckets: string[]; onChanged: () => void }) {
  const [bucket, setBucket] = useState(buckets[0] || 'template-thumbs');
  const [q, setQ] = useState('');
  const [unused, setUnused] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<{ name: string; kb: number; created_at: string; used: boolean; total: number }[]>([]);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const per = 60;
  const ro = PROTECTED.includes(bucket);

  const list = useCallback(async () => {
    setBusy(true); setNote('');
    const { data, error } = await supabase.rpc('admin_storage_files', { p_bucket: bucket, p_search: q, p_only_unused: unused, p_limit: per, p_offset: page * per });
    setBusy(false);
    if (error) { setNote(error.message); setRows([]); return; }
    setRows((data as any[]) || []); setPick(new Set());
  }, [bucket, q, unused, page]);
  useEffect(() => { list(); }, [list]);

  const total = rows[0]?.total || 0;
  const url = (n: string) => supabase.storage.from(bucket).getPublicUrl(n).data.publicUrl;
  const del = async () => {
    const names = [...pick];
    if (!names.length || ro) return;
    const inUse = rows.filter((x) => pick.has(x.name) && x.used).length;
    if (!window.confirm(`Delete ${names.length} file(s) from “${bucket}” permanently?${inUse ? ` ${inUse} of them are still used by a template — that template will lose its picture.` : ''} This can’t be undone.`)) return;
    setBusy(true);
    for (let i = 0; i < names.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(names.slice(i, i + 100));
      if (error) { setNote(error.message); break; }
    }
    setBusy(false); setNote(`Deleted ${names.length} file(s).`); list(); onChanged();
  };

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Files</h2>
      <p className="mt-1 text-[13px] text-mt-muted">Everything stored, newest first. Pick files and delete them, or show only the ones no template uses.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {buckets.map((b) => <button key={b} onClick={() => { setBucket(b); setPage(0); }} className={`${btn} ${b === bucket ? 'bg-mt-ink text-mt-bg' : 'border border-mt-border'}`}>{b}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search file names" className="h-9 min-w-[200px] flex-1 rounded-full border border-mt-border bg-mt-surface px-3.5 text-[13px]" />
        {!ro && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={unused} onChange={(e) => { setUnused(e.target.checked); setPage(0); }} /> Only unused</label>}
        {!ro && <button onClick={() => setPick(new Set(rows.map((x) => x.name)))} disabled={!rows.length} className={`${btn} border border-mt-border`}>Select page</button>}
        {!ro && <button onClick={del} disabled={!pick.size || busy} className={`${btn} bg-mt-primary text-mt-onprimary`}><Trash2 size={13} /> Delete {pick.size || ''}</button>}
      </div>
      {ro && <p className="mt-2 text-[12px] text-mt-faint">This bucket holds people’s own files — view only.</p>}
      {note && <p className="mt-2 text-[13px] text-mt-muted" role="status">{note}</p>}
      <p className="mt-3 text-[12px] text-mt-faint">{busy ? 'Loading…' : `${total.toLocaleString()} file(s)`}</p>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {rows.map((x) => (
          <li key={x.name} className={`overflow-hidden rounded-xl border ${pick.has(x.name) ? 'border-mt-ink ring-2 ring-mt-ink' : 'border-mt-border'}`}>
            <button type="button" disabled={ro} onClick={() => { const n = new Set(pick); n.has(x.name) ? n.delete(x.name) : n.add(x.name); setPick(n); }} className="block w-full text-left">
              {/\.(png|jpe?g|webp|gif|svg)$/i.test(x.name)
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url(x.name)} alt="" loading="lazy" className="aspect-square w-full bg-mt-surface2 object-cover" />
                : <div className="grid aspect-square w-full place-items-center bg-mt-surface2 text-[11px] text-mt-faint">{x.name.split('.').pop()}</div>}
              <div className="p-2 text-[11px]">
                <p className="truncate font-medium text-mt-ink" title={x.name}>{x.name.split('/').pop()}</p>
                <p className="text-mt-muted">{x.kb >= 1024 ? `${(x.kb / 1024).toFixed(1)} MB` : `${x.kb} KB`} · {new Date(x.created_at).toLocaleDateString('en-GB')}</p>
                {!ro && <p className={x.used ? 'text-emerald-600' : 'text-amber-600'}>{x.used ? 'In use' : 'Not used'}</p>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      {total > per && (
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className={`${btn} border border-mt-border`}>Previous</button>
          <span className="text-[12px] text-mt-muted">Page {page + 1} of {Math.ceil(total / per)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * per >= total} className={`${btn} border border-mt-border`}>Next</button>
        </div>
      )}
    </section>
  );
}
