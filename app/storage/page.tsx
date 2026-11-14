'use client';

import { SeoShell } from '@/components/seo/SeoShell';
import { StorageManager } from '@/components/storage/StorageManager';

export default function Page() {
  return (
    <SeoShell>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <header className="max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">Your device</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">On-device storage</h1>
          <p className="mt-3 text-mt-muted leading-relaxed">Your patterns, palettes, logos and work in progress are kept in this browser on this device — never uploaded. Design files are saved wherever you choose on your computer, tablet or phone.</p>
        </header>
        <div className="mt-8"><StorageManager /></div>
      </div>
    </SeoShell>
  );
}
