'use client';

import { PageHero } from '@/components/PageHero';
import { SeoShell } from '@/components/seo/SeoShell';
import { StorageManager } from '@/components/storage/StorageManager';

export default function Page() {
  return (
    <SeoShell>
      <PageHero
        align="center"
        compact
        eyebrow="Your device"
        title="On-device storage"
        accent="storage"
        subtitle="Your patterns, palettes, logos and work in progress are kept in this browser on this device — never uploaded. Design files are saved wherever you choose on your computer, tablet or phone."
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <StorageManager />
      </div>
    </SeoShell>
  );
}
