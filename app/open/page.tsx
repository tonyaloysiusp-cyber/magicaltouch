'use client';

// /open — opens a design file straight in the editor or Photo Studio.
//  • Installed app: a .mtd double-clicked on the computer arrives through
//    launchQueue (see app/manifest.ts).
//  • Any browser: a "Name.mtd.html" file double-clicked on a computer or
//    phone posts itself to /api/open-file, which keeps it in this browser and
//    sends the visitor here with ?pending=1. If they aren't logged in they
//    log in first and come back here, then the exact design opens.

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { readMtd, base64ToBytes, type OpenedMtd } from '@/lib/mtd/format';
import { rememberRecent } from '@/lib/mtd/recent';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

const DB = 'mt-open';
const STORE = 'pending';

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => { r.result.close(); resolve(req ? (req.result as T) : undefined); };
      tx.onerror = () => reject(tx.error);
    };
  });
}
const readPending = () => idb<{ data: string; at: number }>('readonly', (s) => s.get('file'));
const clearPending = () => idb('readwrite', (s) => { s.delete('file'); });

function urlFor(opened: OpenedMtd, key: string) {
  return opened.document.editor === 'photo-studio'
    ? `/photo-studio?localDoc=${encodeURIComponent(key)}`
    : editorUrlForLocal(key, opened.document.width, opened.document.height);
}

function OpenFile() {
  const router = useRouter();
  const pending = useSearchParams().get('pending') === '1';
  const [msg, setMsg] = useState('Opening your design…');
  const [ready, setReady] = useState<{ opened: OpenedMtd; fileName: string } | null>(null);

  // A self-opening file waiting in this browser.
  useEffect(() => {
    if (!pending) return;
    let gone = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login?next=' + encodeURIComponent('/open?pending=1'));
        return;
      }
      let rec;
      try { rec = await readPending(); } catch { rec = undefined; }
      if (!rec?.data) {
        if (!gone) setMsg('No design is waiting to open. Open your file again, or use Dashboard → Open file.');
        return;
      }
      try {
        const bytes = base64ToBytes(rec.data);
        const opened = await readMtd(new Blob([bytes], { type: 'application/gzip' }));
        if (!gone) setReady({ opened, fileName: opened.document.name + '.mtd.html' });
      } catch (e: any) {
        if (!gone) setMsg(e?.message || 'This file could not be opened.');
      }
    })();
    return () => { gone = true; };
  }, [pending, router]);

  // Installed app: file handed over by the operating system.
  useEffect(() => {
    if (pending) return;
    const lq = (window as any).launchQueue;
    if (!lq?.setConsumer) {
      setMsg('Open design files from your Dashboard → Open file.');
      const t = setTimeout(() => router.replace('/dashboard'), 1500);
      return () => clearTimeout(t);
    }
    lq.setConsumer(async (params: { files?: any[] }) => {
      const handle = params.files?.[0];
      if (!handle) { router.replace('/dashboard'); return; }
      try {
        const file: File = await handle.getFile();
        const opened = await readMtd(file);
        const key = newLocalKey();
        putHandoff(key, { opened, file: { handle, fileName: file.name } });
        await rememberRecent({ name: opened.document.name, fileName: file.name, width: opened.document.width, height: opened.document.height, thumbnail: opened.thumbnail, handle });
        router.replace(urlFor(opened, key));
      } catch (e: any) {
        setMsg(e?.message || 'This file could not be opened.');
      }
    });
  }, [pending, router]);

  // Open straight away once the design is read.
  useEffect(() => {
    if (!ready) return;
    const { opened, fileName } = ready;
    const key = newLocalKey();
    putHandoff(key, { opened, file: { handle: null, fileName } });
    clearPending().catch(() => {});
    router.replace(urlFor(opened, key));
  }, [ready, router]);

  return (
    <main className="min-h-screen grid place-items-center bg-mt-bg text-mt-ink p-6">
      <div className="text-center max-w-sm">
        {ready?.opened.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ready.opened.thumbnail} alt="" className="mx-auto max-h-48 rounded-lg shadow-md" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/file-icon/mtd-128.png" alt="" width={96} height={96} className="mx-auto" />
        )}
        <p className="mt-4 text-[15px]">{ready ? `Opening “${ready.opened.document.name}”…` : msg}</p>
        {!ready && /Dashboard/.test(msg) && (
          <a href="/dashboard" className="mt-4 inline-block rounded-full bg-mt-ink text-mt-bg px-5 py-2 text-sm">Go to Dashboard</a>
        )}
      </div>
    </main>
  );
}

export default function OpenFilePage() {
  return (
    <Suspense fallback={null}>
      <OpenFile />
    </Suspense>
  );
}
