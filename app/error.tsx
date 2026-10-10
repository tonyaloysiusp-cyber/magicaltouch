'use client';

// Any page that hits an unexpected problem shows this instead of a blank
// white screen. Out-of-date code after an update reloads by itself.

import { useEffect } from 'react';
import Link from 'next/link';
import { isChunkError, reloadForNewVersion } from '@/lib/chunkRecovery';

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isChunkError(error);
  useEffect(() => {
    console.error('Page error:', error);
    if (stale) reloadForNewVersion();
  }, [error, stale]);
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 bg-mt-bg text-mt-ink">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">{stale ? 'Updating to the latest version…' : 'Something went wrong on this page'}</h1>
        <p className="mt-3 text-mt-muted text-[15px]">
          {stale
            ? 'Magical Touch was just updated. The page is reloading so you get the newest version.'
            : 'Your designs are safe. Try again, or go back to your dashboard. If it keeps happening, check your internet connection.'}
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={() => (stale ? window.location.reload() : reset())} className="h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary font-semibold">
            {stale ? 'Reload now' : 'Try again'}
          </button>
          <Link href="/dashboard" className="h-11 px-5 rounded-full border border-mt-border font-medium inline-flex items-center">Dashboard</Link>
        </div>
        {error?.digest && <p className="mt-6 text-[12px] text-mt-faint">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
