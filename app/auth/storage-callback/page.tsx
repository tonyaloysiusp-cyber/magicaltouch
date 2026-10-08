'use client';

// Landing page for Google / Microsoft / Dropbox sign-in popups. It only
// passes the result back to the Magical Touch Design window that opened
// it (see lib/storage/oauth.ts) and closes; nothing is stored here.

import { useEffect, useState } from 'react';
import { postAuthResultToOpener } from '@/lib/storage/oauth';

export default function StorageCallbackPage() {
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    const delivered = postAuthResultToOpener();
    // Remove the code/token from the address bar and history right away.
    window.history.replaceState(null, '', window.location.pathname);
    if (delivered) {
      setMessage('Connected. You can close this window.');
      setTimeout(() => window.close(), 300);
    } else {
      setMessage('Please return to the Magical Touch Design window and try again.');
    }
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center bg-transparent text-mt-ink">
      <p className="text-sm">{message}</p>
    </main>
  );
}
