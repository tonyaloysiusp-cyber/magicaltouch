'use client';

// "Where your projects are saved" (profile page): online account, this
// device, and any cloud drives whose keys are set up. We only ever stored the account e-mail/name -- passwords and
// access tokens never reach our server -- so disconnecting just signs
// this browser out of the drive and marks the link as disconnected.
// Projects already in the drive stay there.

import { useEffect, useState } from 'react';
import { Cloud, Globe, HardDrive } from 'lucide-react';
import { AVAILABLE_CLOUD_PROVIDERS, CloudProvider, CloudProviderId, popupIfNeeded, ensureSession } from '@/lib/storage/providers';
import { clearSession, getSession } from '@/lib/storage/oauth';
import { listConnections, recordConnection, markDisconnected, StorageConnection } from '@/lib/storage/registry';

export function StorageConnections() {
  const [connections, setConnections] = useState<StorageConnection[]>([]);
  const [busy, setBusy] = useState<CloudProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listConnections().then(setConnections);
  }, []);

  const connectionFor = (id: CloudProviderId) => connections.find((c) => c.provider === id && c.status === 'connected');

  const connect = (p: CloudProvider) => {
    setError(null);
    let popup: Window | null;
    try {
      popup = popupIfNeeded(p);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    setBusy(p.id);
    ensureSession(p, popup)
      .then(async (session) => {
        await recordConnection(p.id, session.account);
        setConnections(await listConnections());
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(null));
  };

  const disconnect = async (p: CloudProvider) => {
    if (!window.confirm(`Disconnect ${p.label}? Your projects stay in your ${p.label}.`)) return;
    setBusy(p.id);
    const session = getSession(p.id);
    if (session && p.revoke) await p.revoke(session);
    clearSession(p.id);
    await markDisconnected(p.id);
    setConnections(await listConnections());
    setBusy(null);
  };

  const rowCls = 'flex items-center gap-3 py-3';
  const iconCls = 'text-mt-accent shrink-0';
  const title = 'text-sm font-medium text-mt-ink dark:text-mt-ink';
  const sub = 'text-xs text-mt-muted dark:text-mt-muted';
  const ready = <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Ready</span>;

  return (
    <div className="border dark:border-white/10 rounded-xl p-5 mb-8 bg-mt-surface dark:bg-mt-surface">
      <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-1">Where your projects are saved</h2>
      <p className="text-xs text-mt-muted dark:text-mt-muted mb-4">
        Choose a place each time you save a new design. You can always save a copy somewhere else from the File menu.
      </p>
      <div className="divide-y dark:divide-white/10">
        <div className={rowCls}>
          <Globe size={18} className={iconCls} />
          <div className="flex-1 min-w-0">
            <p className={title}>Online — your Magical Touch account</p>
            <p className={sub}>Saved automatically. Open your designs from any computer, iPad or phone.</p>
          </div>
          {ready}
        </div>
        <div className={rowCls}>
          <HardDrive size={18} className={iconCls} />
          <div className="flex-1 min-w-0">
            <p className={title}>This device — computer, iPad or phone</p>
            <p className={sub}>Saved as a .mtd file in your own files. In the editor: File → Save a Copy to Device.</p>
          </div>
          {ready}
        </div>
        {AVAILABLE_CLOUD_PROVIDERS.map((p) => {
          const c = connectionFor(p.id);
          return (
            <div key={p.id} className={rowCls}>
              <Cloud size={18} className={iconCls} />
              <div className="flex-1 min-w-0">
                <p className={title}>{p.label}</p>
                <p className={`${sub} truncate`}>{c ? `Connected${c.email ? ` as ${c.email}` : ''}` : 'Not connected'}</p>
              </div>
              {c ? (
                <button onClick={() => disconnect(p)} disabled={busy === p.id} className="text-xs text-red-500 hover:underline disabled:opacity-50">
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connect(p)}
                  disabled={busy === p.id}
                  className="text-xs font-semibold text-white bg-brand-gradient rounded-full px-3 py-1.5 disabled:opacity-50"
                >
                  {busy === p.id ? 'Connecting…' : 'Connect'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </div>
  );
}
