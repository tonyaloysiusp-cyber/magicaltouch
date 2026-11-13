'use client';

// "Save before you leave?" — when a tool has unsaved changes, links that go
// to another page ask first: Save & leave, Leave without saving, or Stay.
// Closing or reloading the tab gets the browser's own warning.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';

export function LeaveGuard({ dirty, onSave, what }: { dirty: boolean; onSave: () => Promise<boolean> | boolean; what: string }) {
  const router = useRouter();
  const [href, setHref] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.noGuard !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same tool (tabs, anchors)
      e.preventDefault(); e.stopPropagation();
      setHref(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', click, true); };
  }, [dirty]);

  useEffect(() => {
    if (!href) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setHref(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [href]);

  if (!href) return null;
  const go = (to: string) => { setHref(null); router.push(to); };
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="leave-title">
      <div className="w-full max-w-sm rounded-3xl border border-mt-border bg-mt-surface p-6 shadow-2xl">
        <h2 id="leave-title" className="text-lg font-semibold">Save your {what}?</h2>
        <p className="mt-2 text-[14px] text-mt-muted">You have changes that aren’t saved as a project yet. Save them so you can come back and edit names, sizes and the design later.</p>
        <div className="mt-5 grid gap-2">
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); const ok = await onSave(); setBusy(false); if (ok) go(href); }} className="h-11 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2">{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save & leave</button>
          <button type="button" onClick={() => go(href)} className="h-11 rounded-full border border-mt-border text-[14px] font-semibold">Leave without saving</button>
          <button type="button" onClick={() => setHref(null)} className="h-10 rounded-full text-[13.5px] font-semibold text-mt-muted hover:text-mt-ink">Stay here</button>
        </div>
      </div>
    </div>
  );
}
