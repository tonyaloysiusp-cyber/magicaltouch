'use client';

// Last-resort screen if the whole app shell fails (never a blank page).

import { useEffect } from 'react';
import { isChunkError, reloadForNewVersion } from '@/lib/chunkRecovery';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (isChunkError(error)) reloadForNewVersion();
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', margin: 0, background: '#fff', color: '#111' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
          <p style={{ color: '#555' }}>Your designs are safe. Please reload the page.</p>
          <button onClick={() => (isChunkError(error) ? window.location.reload() : reset())} style={{ marginTop: 16, height: 44, padding: '0 20px', borderRadius: 999, border: 0, background: '#111', color: '#fff', fontWeight: 600 }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
