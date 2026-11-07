'use client';

// /open — a .mtd project double-clicked on the computer (installed app,
// see app/manifest.ts) arrives here and opens in the editor or Photo Studio.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readMtd } from '@/lib/mtd/format';
import { rememberRecent } from '@/lib/mtd/recent';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';

export default function OpenFilePage() {
  const router = useRouter();
  const [msg, setMsg] = useState('Opening your design…');

  useEffect(() => {
    const lq = (window as any).launchQueue;
    if (!lq?.setConsumer) {
      setMsg('Open .mtd files from your Dashboard → Open file.');
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
        router.replace(opened.document.editor === 'photo-studio' ? `/photo-studio?localDoc=${encodeURIComponent(key)}` : editorUrlForLocal(key, opened.document.width, opened.document.height));
      } catch (e: any) {
        setMsg(e?.message || 'This file could not be opened.');
      }
    });
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center bg-mt-bg text-mt-ink p-6">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/file-icon/mtd-128.png" alt="" width={96} height={96} className="mx-auto" />
        <p className="mt-4 text-[15px]">{msg}</p>
      </div>
    </main>
  );
}
