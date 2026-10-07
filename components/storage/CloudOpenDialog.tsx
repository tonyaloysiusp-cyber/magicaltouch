'use client';

// Browse .mtd projects in a connected cloud drive and open one. Only the
// Magical Touch Design project folder is visible to the app (see
// lib/storage/providers.ts for the permission each drive grants).

import { useRef, useState } from 'react';
import { Cloud, X, ArrowLeft } from 'lucide-react';
import { AVAILABLE_CLOUD_PROVIDERS, CloudFile, CloudProviderId, providerById, popupIfNeeded } from '@/lib/storage/providers';
import { listCloud, openFromCloud } from '@/lib/storage/cloudProject';
import type { OpenedMtd } from '@/lib/mtd/format';

interface Props {
  onOpened: (result: { opened: OpenedMtd; provider: CloudProviderId; file: CloudFile }) => void;
  onClose: () => void;
}

export function CloudOpenDialog({ onOpened, onClose }: Props) {
  const [provider, setProvider] = useState<CloudProviderId | null>(null);
  const [files, setFiles] = useState<CloudFile[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async (label: string, popupNeeded: CloudProviderId, task: (popup: Window | null, signal: AbortSignal) => Promise<void>) => {
    setError(null);
    let popup: Window | null = null;
    try {
      popup = popupIfNeeded(providerById(popupNeeded)); // synchronous, inside the tap
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    abortRef.current = new AbortController();
    setBusy(popup ? `Waiting for you to sign in to ${providerById(popupNeeded).label}…` : label);
    try {
      await task(popup, abortRef.current.signal);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
      abortRef.current = null;
    }
  };

  const browse = (id: CloudProviderId) =>
    run(`Loading your ${providerById(id).label} projects…`, id, async (popup, signal) => {
      const list = await listCloud(id, popup, signal);
      setProvider(id);
      setFiles(list);
    });

  const open = (file: CloudFile) => {
    if (!provider) return;
    const id = provider;
    run(`Opening "${file.name}"…`, id, async (popup, signal) => {
      const opened = await openFromCloud(id, popup, file, signal);
      onOpened({ opened, provider: id, file });
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white dark:bg-[#242424] text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl p-5 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {provider && !busy && (
              <button onClick={() => { setProvider(null); setFiles(null); }} className="p-1 text-gray-500" aria-label="Back">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-semibold">{provider ? `Open from ${providerById(provider).label}` : 'Open from a cloud drive'}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!provider && (
          <div className="flex flex-col gap-2">
            {AVAILABLE_CLOUD_PROVIDERS.map((p) => (
              <button
                key={p.id}
                disabled={!!busy}
                onClick={() => browse(p.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3A3A3A] hover:border-[#6C4FD1] disabled:opacity-50 text-left"
              >
                <Cloud size={20} className="text-[#6C4FD1]" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{p.label}</span>
                  <span className="block text-xs text-gray-500">{p.folderLabel}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {provider && files && (
          <div className="overflow-y-auto -mx-1 px-1">
            {files.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No Magical Touch Design projects here yet.</p>
            ) : (
              <ul className="divide-y dark:divide-[#3A3A3A]">
                {files.map((f) => (
                  <li key={f.id}>
                    <button disabled={!!busy} onClick={() => open(f)} className="w-full text-left py-3 px-1 hover:bg-gray-50 dark:hover:bg-[#2B2B2B] disabled:opacity-50">
                      <span className="block text-sm font-medium truncate">{f.name.replace(/\.mtd$/i, '')}</span>
                      <span className="block text-xs text-gray-500">
                        {f.modifiedAt ? new Date(f.modifiedAt).toLocaleString() : ''} {f.size ? `· ${(f.size / 1024 / 1024).toFixed(1)} MB` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {busy && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-[#6C4FD1]">{busy}</p>
            <button onClick={() => abortRef.current?.abort()} className="text-xs text-gray-500 underline shrink-0">Cancel</button>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
