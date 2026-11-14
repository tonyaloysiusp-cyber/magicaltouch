'use client';

// Storage management: how much this site keeps on the device, what it is,
// backups of the shared library, and deleting with confirmation. Nothing
// here talks to a server.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, HardDrive, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { deleteAsset, exportLibrary, importLibrary, listAssets, onAssetsChanged, requestPersistence, storageInfo, type Asset, type StorageInfo } from '@/lib/assets/library';
import { forgetRecent, listRecent, type RecentLocalFile } from '@/lib/mtd/recent';

const KIND_LABEL: Record<string, string> = { pattern: 'Patterns', palette: 'Palettes', gradient: 'Gradients', logo: 'Logos', image: 'Images', svg: 'SVG artwork', 'text-style': 'Text styles' };
export function fmtBytes(n: number | null | undefined) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
// Work in progress kept in localStorage by each tool.
const WORK_KEYS: [string, string][] = [['mt:textile', 'Textile Designer'], ['mt:pattern-draft', 'Pattern Design'], ['mt:wall', 'Wallpaper Designer'], ['mt:mandala', 'Rangoli & Mandala'], ['mt:print-layout', 'Print Layout']];

export function StorageManager() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [recent, setRecent] = useState<RecentLocalFile[]>([]);
  const [work, setWork] = useState<{ key: string; label: string; bytes: number }[]>([]);
  const [ask, setAsk] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try { setInfo(await storageInfo()); } catch { setErr('This browser does not report storage space.'); }
    try { setAssets(await listAssets()); } catch (e: any) { setErr(e?.message || 'On-device storage is not available in this browser (private mode?). Saving to files still works.'); }
    setRecent(await listRecent());
    const w: { key: string; label: string; bytes: number }[] = [];
    try { for (const [key, label] of WORK_KEYS) { const v = localStorage.getItem(key); if (v) w.push({ key, label, bytes: v.length * 2 }); } } catch { /* blocked */ }
    setWork(w);
  }, []);
  useEffect(() => { refresh(); return onAssetsChanged(refresh); }, [refresh]);

  const pct = info?.usage != null && info.quota ? Math.min(100, (info.usage / info.quota) * 100) : null;
  const low = pct != null && pct > 85;
  const kinds = Array.from(new Set(assets.map((a) => a.kind)));

  const del = async (id: string) => {
    try { await deleteAsset(id); setAsk(null); setMsg('Deleted from this device.'); refresh(); } catch { setErr('Could not delete it.'); }
  };
  const backup = async () => {
    try {
      const b = await exportLibrary();
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `magical-touch-library-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setMsg('Backup file downloaded — keep it with your design files.');
    } catch (e: any) { setErr(e?.message || 'Could not make the backup.'); }
  };
  const restore = async (f: File) => {
    try { const n = await importLibrary(f); setMsg(`Restored ${n} item${n === 1 ? '' : 's'} (items with the same id were replaced by the backup copy).`); refresh(); }
    catch (e: any) { setErr(e?.message || 'Could not read that backup.'); }
  };
  const persist = async () => { const ok = await requestPersistence(); setMsg(ok ? 'This browser will keep your library even when space runs low.' : 'The browser did not allow it — keep a backup file to be safe.'); refresh(); };

  const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5';
  const btn = 'h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center gap-2 hover:border-mt-ink/40';
  const DelBtn = ({ id, label, onYes }: { id: string; label: string; onYes: () => void }) => ask === id
    ? <span className="inline-flex items-center gap-1.5"><button type="button" onClick={onYes} className="h-8 px-3 rounded-full bg-rose-600 text-white text-[12px] font-semibold">Delete for good</button><button type="button" onClick={() => setAsk(null)} className="h-8 px-3 rounded-full border border-mt-border text-[12px]">Keep</button></span>
    : <button type="button" onClick={() => setAsk(id)} aria-label={`Delete ${label}`} className="h-8 w-8 rounded-full border border-mt-border inline-flex items-center justify-center hover:border-rose-400"><Trash2 size={14} /></button>;

  return (
    <div className="space-y-5">
      <section className={card} aria-labelledby="space-h">
        <h2 id="space-h" className="text-lg font-semibold inline-flex items-center gap-2"><HardDrive size={18} /> Space on this device</h2>
        {pct != null ? <>
          <div className="mt-3 h-3 rounded-full bg-mt-surface2 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Storage used"><div className={`h-full ${low ? 'bg-rose-500' : 'bg-[#3B82C4]'}`} style={{ width: `${Math.max(1, pct)}%` }} /></div>
          <p className="mt-2 text-[13.5px] text-mt-muted">{fmtBytes(info?.usage)} used of {fmtBytes(info?.quota)} this browser allows for the site.</p>
        </> : <p className="mt-2 text-[13.5px] text-mt-muted">This browser does not say how much space is available.</p>}
        {low && <p role="alert" className="mt-2 text-[13.5px] text-rose-600">Storage is nearly full. Download a backup and delete things you no longer need, or saves may fail.</p>}
        <p className="mt-1 text-[13.5px] text-mt-muted">Library: {info?.assets ?? 0} item{info?.assets === 1 ? '' : 's'}, {fmtBytes(info?.assetBytes)}.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {info?.persisted ? <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-700 dark:text-emerald-400"><ShieldCheck size={15} /> Protected — the browser won’t clear it to free space</span>
            : <button type="button" onClick={persist} className={btn}><ShieldCheck size={15} /> Keep my library safe</button>}
          <button type="button" onClick={backup} className={btn}><Download size={15} /> Download backup</button>
          <button type="button" onClick={() => fileRef.current?.click()} className={btn}><Upload size={15} /> Restore from backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) restore(f); }} />
        </div>
        {msg && <p role="status" className="mt-3 text-[13.5px]">{msg}</p>}
        {err && <p role="alert" className="mt-3 text-[13.5px] text-rose-600">{err}</p>}
      </section>

      <section className={card} aria-labelledby="lib-h">
        <h2 id="lib-h" className="text-lg font-semibold">My library</h2>
        <p className="mt-1 text-[13.5px] text-mt-muted">Shared by every tool. Projects keep their own copy, so deleting an item here never breaks a saved design file.</p>
        {!assets.length && <p className="mt-4 text-[14px] text-mt-muted">Nothing saved yet. Save a pattern in Pattern Design or a rangoli with “Use it elsewhere”.</p>}
        {kinds.map((k) => (
          <div key={k} className="mt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">{KIND_LABEL[k] || k}</h3>
            <ul className="mt-2 divide-y divide-mt-border rounded-2xl border border-mt-border">
              {assets.filter((a) => a.kind === k).map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-3">
                  {a.thumb ? <img src={a.thumb} alt="" className="h-10 w-10 rounded-lg object-cover bg-mt-bg" /> : <span className="h-10 w-10 rounded-lg bg-mt-surface2" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-medium">{a.name}</p><p className="text-[12px] text-mt-muted">{fmtBytes(a.bytes)} · changed {new Date(a.updatedAt).toLocaleString()}{a.source ? ` · from ${a.source}` : ''}</p></div>
                  {a.kind === 'pattern' && <a href={`/patterns?asset=${a.id}`} className="text-[13px] underline">Edit</a>}
                  <DelBtn id={a.id} label={a.name} onYes={() => del(a.id)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className={card} aria-labelledby="work-h">
        <h2 id="work-h" className="text-lg font-semibold">Work in progress</h2>
        <p className="mt-1 text-[13.5px] text-mt-muted">Each tool remembers where you left off. Clearing it starts that tool fresh — save a file first if you want to keep the design.</p>
        {!work.length ? <p className="mt-3 text-[14px] text-mt-muted">None.</p> : <ul className="mt-3 divide-y divide-mt-border rounded-2xl border border-mt-border">
          {work.map((w) => <li key={w.key} className="flex items-center gap-3 p-3"><p className="flex-1 text-[14px]">{w.label} <span className="text-[12px] text-mt-muted">· {fmtBytes(w.bytes)}</span></p><DelBtn id={'w:' + w.key} label={w.label} onYes={() => { try { localStorage.removeItem(w.key); } catch { /* ignore */ } setAsk(null); refresh(); }} /></li>)}
        </ul>}
      </section>

      <section className={card} aria-labelledby="rec-h">
        <h2 id="rec-h" className="text-lg font-semibold">Recent files</h2>
        <p className="mt-1 text-[13.5px] text-mt-muted">Shortcuts to design files saved on this device. Removing one here does not delete the file itself.</p>
        {!recent.length ? <p className="mt-3 text-[14px] text-mt-muted">None.</p> : <ul className="mt-3 divide-y divide-mt-border rounded-2xl border border-mt-border">
          {recent.map((r) => <li key={r.id} className="flex items-center gap-3 p-3"><p className="flex-1 min-w-0 truncate text-[14px]">{r.fileName}</p><button type="button" onClick={async () => { await forgetRecent(r.id); refresh(); }} className="text-[13px] underline">Remove from list</button></li>)}
        </ul>}
      </section>
    </div>
  );
}
