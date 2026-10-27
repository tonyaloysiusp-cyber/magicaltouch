'use client';

// "Your projects" on the dashboard: every .mtd project in the person's own
// Google Drive / Dropbox (/ OneDrive), on any device they sign in from.
// Designs are never kept on our servers — only a small list of names and
// previews (project_references) so the list shows before the drive answers.
// Drives this tab is already signed in to are listed straight away; others
// show a Connect button (the sign-in window must open from a tap).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cloud, Loader2, RefreshCw, X } from 'lucide-react';
import { AVAILABLE_CLOUD_PROVIDERS, providerById, popupIfNeeded, CloudProviderId, CloudFile } from '@/lib/storage/providers';
import { getSession } from '@/lib/storage/oauth';
import { listCloud } from '@/lib/storage/cloudProject';
import { forgetProject, ProjectReference } from '@/lib/storage/registry';

interface Item { key: string; provider: CloudProviderId; file: CloudFile; name: string; thumbnail: string | null; modifiedAt: string | null; ref?: ProjectReference }

const nameOf = (f: string) => f.replace(/\.mtd$/i, '');

export function DriveProjects({ refs, setRefs, busy, onOpen }: { refs: ProjectReference[]; setRefs: (fn: (r: ProjectReference[]) => ProjectReference[]) => void; busy: boolean; onOpen: (provider: CloudProviderId, file: CloudFile, popup: Window | null) => void }) {
  const [files, setFiles] = useState<Partial<Record<CloudProviderId, CloudFile[]>>>({});
  const [loading, setLoading] = useState<Partial<Record<CloudProviderId, boolean>>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (id: CloudProviderId, popup: Window | null) => {
    setLoading((l) => ({ ...l, [id]: true }));
    setErr(null);
    try {
      const list = await listCloud(id, popup);
      setFiles((f) => ({ ...f, [id]: list }));
    } catch (e: any) {
      setErr(e?.message || `Could not list your ${providerById(id).label}.`);
    } finally {
      setLoading((l) => ({ ...l, [id]: false }));
    }
  }, []);

  // Drives already signed in during this visit: list them now.
  useEffect(() => {
    AVAILABLE_CLOUD_PROVIDERS.forEach((p) => { if (getSession(p.id)) load(p.id, null); });
  }, [load]);

  const connect = (id: CloudProviderId) => {
    let popup: Window | null = null;
    try {
      popup = popupIfNeeded(providerById(id));
    } catch (e: any) {
      setErr(e?.message || 'Could not open the sign-in window.');
      return;
    }
    load(id, popup);
  };

  const items: Item[] = useMemo(() => {
    const out = new Map<string, Item>();
    refs.forEach((r) => {
      if (!providerById(r.provider).configured) return;
      // Once the drive has answered, show only files that are really there.
      const live = files[r.provider];
      if (live && !live.some((f) => f.id === r.fileId)) return;
      out.set(`${r.provider}:${r.fileId}`, { key: `${r.provider}:${r.fileId}`, provider: r.provider, file: { id: r.fileId, name: r.projectName, modifiedAt: r.modifiedAt, size: null, path: r.location }, name: r.projectName, thumbnail: r.thumbnail, modifiedAt: r.modifiedAt || r.updatedAt, ref: r });
    });
    (Object.keys(files) as CloudProviderId[]).forEach((pid) => {
      (files[pid] || []).forEach((f) => {
        const k = `${pid}:${f.id}`;
        const have = out.get(k);
        if (have) out.set(k, { ...have, file: { ...have.file, ...f }, modifiedAt: f.modifiedAt || have.modifiedAt });
        else out.set(k, { key: k, provider: pid, file: f, name: nameOf(f.name), thumbnail: null, modifiedAt: f.modifiedAt });
      });
    });
    return Array.from(out.values()).sort((a, b) => (b.modifiedAt || '').localeCompare(a.modifiedAt || ''));
  }, [refs, files]);

  if (!AVAILABLE_CLOUD_PROVIDERS.length) return null;

  const forget = async (it: Item) => {
    if (!it.ref) return;
    if (!window.confirm(`Remove "${it.name}" from this list? The file stays in your ${providerById(it.provider).label}.`)) return;
    await forgetProject(it.ref.id);
    setRefs((list) => list.filter((p) => p.id !== it.ref!.id));
  };
  const open = (it: Item) => {
    let popup: Window | null = null;
    try {
      popup = popupIfNeeded(providerById(it.provider));
    } catch (e: any) {
      setErr(e?.message || 'Could not open the sign-in window.');
      return;
    }
    onOpen(it.provider, it.file, popup);
  };

  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h2 className="text-xs font-semibold text-mt-muted tracking-wide uppercase flex items-center gap-1.5 flex-1"><Cloud size={13} /> Your projects in the cloud</h2>
        {AVAILABLE_CLOUD_PROVIDERS.map((p) => {
          const on = !!files[p.id];
          return (
            <button key={p.id} onClick={() => (on ? load(p.id, null) : connect(p.id))} disabled={!!loading[p.id]} className="h-8 px-3 rounded-full border border-black/15 dark:border-white/15 text-[12px] font-semibold inline-flex items-center gap-1.5 hover:border-black/30 dark:hover:border-white/30 disabled:opacity-60">
              {loading[p.id] ? <Loader2 size={13} className="animate-spin" /> : on ? <RefreshCw size={13} /> : <Cloud size={13} />}
              {on ? `${p.label} · ${files[p.id]!.length}` : `Show my ${p.label} files`}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-mt-muted/70 mb-4">Your .mtd projects live in your own drive, not on our servers — sign in on any computer, iPad or phone to open them.</p>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-mt-muted">No projects yet. When you save a design, choose your Google Drive or Dropbox and it will appear here on every device.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {items.map((it) => (
            <div key={it.key} className="group relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-mt-surface">
              <button onClick={() => open(it)} disabled={busy} className="block w-full text-left">
                <div className="aspect-[4/3] bg-mt-accentsoft dark:bg-mt-bg flex items-center justify-center overflow-hidden">
                  {it.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbnail} alt="" loading="lazy" className="w-full h-full object-contain" />
                  ) : (
                    <Cloud size={28} className="text-mt-accent/40" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">{it.name}</p>
                  <p className="text-[10px] font-semibold tracking-wide text-mt-accent mt-1">{providerById(it.provider).label.toUpperCase()}</p>
                  {it.modifiedAt && <p className="text-[11px] text-mt-muted">Last saved {new Date(it.modifiedAt).toLocaleDateString()}</p>}
                </div>
              </button>
              {it.ref && (
                <button onClick={() => forget(it)} title="Remove from this list (the file stays in your drive)" aria-label={`Remove ${it.name} from this list`} className="absolute top-2 right-2 p-1 rounded-full bg-mt-surface/90 dark:bg-black/60 text-mt-muted opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
