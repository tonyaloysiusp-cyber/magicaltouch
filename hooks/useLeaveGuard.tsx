'use client';

// Asks before leaving a page with unsaved work: closing or reloading the
// tab (browser prompt), clicking any link on the page (home logo, menu,
// "Templates"…), the browser Back button, and the page's own Back/Close
// buttons (call `confirmLeave(action)`). The dialog offers Save, Don't save
// and Cancel.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LeaveGuardOptions {
  /** True while there are changes that would be lost. */
  dirty: boolean;
  /** Saves the work; resolve true when it worked. Omit to only offer Leave / Stay. */
  onSave?: () => Promise<boolean>;
  /** What is being left, for the dialog text ("this photo", "“Poster”"). */
  what?: string;
}

export function useLeaveGuard({ dirty, onSave, what = 'this design' }: LeaveGuardOptions) {
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const bypass = useRef(false);

  // Tab close / reload: only the browser's own prompt is allowed here.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || bypass.current) return;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Any link on the page (logo, menus, footer…).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || bypass.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // opens a new tab: nothing is lost
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => {
        bypass.current = true;
        window.location.assign(url.href);
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Browser Back button: keep one extra history entry while there are
  // changes, so Back first lands here and we can ask.
  const armed = useRef(false);
  useEffect(() => {
    if (dirty && !armed.current) {
      armed.current = true;
      try {
        window.history.pushState({ ...(window.history.state || {}), __mtGuard: true }, '', window.location.href);
      } catch {
        armed.current = false;
      }
    }
  }, [dirty]);
  useEffect(() => {
    const onPop = () => {
      if (!armed.current || bypass.current) return;
      if (!dirtyRef.current) {
        armed.current = false;
        window.history.back();
        return;
      }
      // Stay on the page and ask.
      window.history.pushState({ ...(window.history.state || {}), __mtGuard: true }, '', window.location.href);
      setPending(() => () => {
        bypass.current = true;
        window.history.go(-2);
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /** For the page's own Back / Close buttons. */
  const confirmLeave = useCallback((action: () => void) => {
    if (!dirtyRef.current) return action();
    setPending(() => () => {
      bypass.current = true;
      action();
      setTimeout(() => { bypass.current = false; }, 500);
    });
  }, []);

  const run = (go: () => void) => {
    setPending(null);
    go();
  };

  const dialog = pending ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="mt-leave-title" onClick={() => !saving && setPending(null)}>
      <div className="w-full max-w-[420px] rounded-2xl bg-mt-surface text-mt-ink shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="mt-leave-title" className="text-[17px] font-semibold mb-2">Save changes before leaving?</h2>
        <p className="text-[14px] text-mt-muted mb-6">You have unsaved changes in {what}. If you leave without saving, they will be lost.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button autoFocus disabled={saving} onClick={() => setPending(null)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-medium hover:bg-mt-surface2 disabled:opacity-50">
            Cancel
          </button>
          <button disabled={saving} onClick={() => run(pending)} className="h-10 px-4 rounded-full border border-red-300 text-red-600 text-[14px] font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50">
            {onSave ? 'Don’t save' : 'Leave'}
          </button>
          {onSave && (
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const ok = await onSave();
                  if (ok) run(pending);
                } finally {
                  setSaving(false);
                }
              }}
              className="h-10 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return { confirmLeave, dialog };
}
