'use client';

// Profile page: marketing e-mail preference and account deletion.
//
// Deleting an account removes everything Magical Touch Design holds for
// it (profile, photo, designs saved in the account, storage-connection and
// project-reference records). It never touches .mtd files on the
// customer's computer or in their own Google Drive / OneDrive / Dropbox
// (storage spec §38).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

async function removeFolder(bucket: string, folder: string) {
  // Lists two levels deep (avatar variants live in <user>/<random>/...).
  const { data: entries } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
  const paths: string[] = [];
  for (const e of entries || []) {
    const full = `${folder}/${e.name}`;
    if (e.id) paths.push(full);
    else {
      const { data: inner } = await supabase.storage.from(bucket).list(full, { limit: 1000 });
      inner?.forEach((f) => paths.push(`${full}/${f.name}`));
    }
  }
  if (paths.length) await supabase.storage.from(bucket).remove(paths);
}

export function AccountSettings({ userId }: { userId: string }) {
  const router = useRouter();
  const [marketing, setMarketing] = useState<boolean | null>(null);
  const [savingPref, setSavingPref] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('marketing_status')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setMarketing(data?.marketing_status === 'subscribed'));
  }, [userId]);

  const toggleMarketing = async (on: boolean) => {
    setSavingPref(true);
    const now = new Date().toISOString();
    const { error: e } = await supabase
      .from('profiles')
      .update(on ? { marketing_status: 'subscribed', marketing_consent_at: now } : { marketing_status: 'unsubscribed', unsubscribed_at: now, unsubscribe_reason: 'Turned off in profile' })
      .eq('id', userId);
    setSavingPref(false);
    if (!e) setMarketing(on);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await removeFolder('avatars', userId).catch(() => {});
      await removeFolder('design-assets', userId).catch(() => {});
      const { error: e } = await supabase.rpc('delete_my_account');
      if (e) throw e;
      try {
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut().catch(() => {});
      router.replace('/?accountDeleted=1');
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      setError('Your account could not be deleted right now. Please try again, or write to hellomagicaltouch.design@gmail.com.');
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="border dark:border-white/10 rounded-xl p-5 mb-8 bg-mt-surface dark:bg-mt-surface">
        <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-3">E-mail preferences</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 accent-[#3B82C4]"
            checked={!!marketing}
            disabled={marketing === null || savingPref}
            onChange={(e) => toggleMarketing(e.target.checked)}
          />
          <span>
            <span className="block text-sm text-mt-ink dark:text-mt-ink">E-mail me new templates, offers and news</span>
            <span className="block text-xs text-mt-muted dark:text-mt-muted">Account e-mails (password resets, security notices) are always sent.</span>
          </span>
        </label>
      </div>

      <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-5 mb-8 bg-mt-surface dark:bg-mt-surface">
        <h2 className="text-sm font-semibold text-red-600 mb-1">Delete my account</h2>
        <p className="text-xs text-mt-muted dark:text-mt-muted mb-3">
          Permanently deletes your Magical Touch Design account, profile photo and the designs saved in your account. Projects you saved on your own computer, iPad, phone or cloud drive are yours and are not touched — save copies of any account designs first (File → Save a Copy to Device).
        </p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-sm font-semibold text-red-600 border border-red-200 rounded-full px-4 py-2 hover:bg-red-50">
            Delete my account…
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-sm dark:bg-mt-surface2 dark:text-mt-ink"
              autoFocus
            />
            <button
              onClick={deleteAccount}
              disabled={typed.trim() !== 'DELETE' || deleting}
              className="text-sm font-semibold text-white bg-red-600 rounded-full px-4 py-2 disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
            <button onClick={() => { setConfirming(false); setTyped(''); }} disabled={deleting} className="text-sm text-mt-muted px-3">
              Cancel
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </div>
    </>
  );
}
