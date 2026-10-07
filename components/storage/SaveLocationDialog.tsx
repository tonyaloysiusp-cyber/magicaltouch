'use client';

// "Save your project — choose where to keep it" (storage spec §43).
// Shown the first time a new design is saved. The parent's onChoose runs
// synchronously in the tap so a cloud sign-in popup is never blocked.

import { HardDrive, Cloud, UserRound, X } from 'lucide-react';
import { CLOUD_PROVIDERS, CloudProviderId } from '@/lib/storage/providers';
import { supportsSaveInPlace } from '@/lib/mtd/fileAccess';

export type SaveLocation = 'computer' | CloudProviderId | 'account';

interface Props {
  busy: string | null; // message while saving / signing in
  error: string | null;
  onChoose: (location: SaveLocation) => void;
  onCancel: () => void;
}

const row =
  'w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-[#3A3A3A] hover:border-[#6C4FD1] hover:bg-purple-50/50 dark:hover:bg-[#333333] disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-transparent transition-colors';

export function SaveLocationDialog({ busy, error, onChoose, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-location-title"
        className="w-full max-w-md bg-white dark:bg-[#242424] text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h2 id="save-location-title" className="text-lg font-semibold">Save your project</h2>
          <button onClick={onCancel} disabled={!!busy} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose where to keep it. You can always save a copy somewhere else later.</p>

        <div className="flex flex-col gap-2">
          <button className={row} disabled={!!busy} onClick={() => onChoose('computer')}>
            <HardDrive size={20} className="text-[#6C4FD1] shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">This computer</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {supportsSaveInPlace() ? 'A .mtd file in a folder you choose' : 'Downloads a .mtd file to your device'}
              </span>
            </span>
          </button>

          {CLOUD_PROVIDERS.map((p) => (
            <button key={p.id} className={row} disabled={!!busy || !p.configured} onClick={() => onChoose(p.id)}>
              <Cloud size={20} className="text-[#6C4FD1] shrink-0" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {p.configured ? `Saved in your ${p.label}: ${p.folderLabel}` : 'Coming soon'}
                </span>
              </span>
            </button>
          ))}

          <button className={row} disabled={!!busy} onClick={() => onChoose('account')}>
            <UserRound size={20} className="text-[#6C4FD1] shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">My Magical Touch account</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Kept on our servers, with automatic version history</span>
            </span>
          </button>
        </div>

        {busy && <p className="mt-4 text-sm text-[#6C4FD1]">{busy}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
