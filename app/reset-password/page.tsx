'use client';

// ---------------------------------------------------------------------
// app/reset-password/page.tsx
// Landing page for the "Reset password" link Supabase emails out (the
// login page's Forgot Password flow redirects here). Supabase's client
// reads the recovery token from the link and opens a short-lived
// session; this page then lets the user choose a new password, saves it
// with auth.updateUser, and sends the "password changed" security email.
// ---------------------------------------------------------------------

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api/client';
import { ArtworkPanel } from '@/components/ArtworkPanel';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

type Status = 'checking' | 'ready' | 'invalid' | 'saving' | 'done';

export default function ResetPasswordPage() {
  const { theme, toggleTheme } = useAppTheme();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let settled = false;
    const markReady = () => { settled = true; setStatus((s) => (s === 'checking' ? 'ready' : s)); };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) markReady();
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) markReady(); });

    // Expired, already-used, or hand-typed links never produce a session.
    const timer = setTimeout(() => { if (!settled) setStatus('invalid'); }, 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Please use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');

    setStatus('saving');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus('ready');
      return;
    }
    // The security notice is best-effort: the password is already changed.
    apiFetch('/api/email/password-changed', { method: 'POST' }).catch(() => {});
    setStatus('done');
    setTimeout(() => router.push('/dashboard'), 2500);
  };

  const input =
    'border border-mt-border dark:border-white/15 dark:bg-mt-surface dark:text-mt-ink p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue';

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen lg:grid lg:grid-cols-2 bg-transparent transition-colors duration-300">
        <div className="hidden lg:block h-screen sticky top-0">
          <ArtworkPanel variant={theme === 'dark' ? 'night' : 'day'} />
        </div>
        <div className="relative flex flex-col items-center justify-center p-6 min-h-screen">
          <ThemeSwitch theme={theme} onToggle={toggleTheme} className="absolute top-6 right-6" />
          <BrandLogo theme={theme} width={280} height={56} className="mb-8" />
          <div className="w-full max-w-sm">
            {status === 'checking' && (
              <p className="text-center text-sm text-mt-muted dark:text-mt-muted">Checking your reset link…</p>
            )}

            {status === 'invalid' && (
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-3 text-mt-ink dark:text-mt-ink">This link has expired</h1>
                <p className="text-sm text-mt-muted dark:text-mt-muted">
                  Password reset links can only be used once and expire after a short time. Please request a new one.
                </p>
                <a href="/login" className="mt-6 inline-block text-brand-blue font-medium hover:underline">
                  Back to log in
                </a>
              </div>
            )}

            {(status === 'ready' || status === 'saving') && (
              <>
                <h1 className="text-2xl font-bold mb-2 text-center text-mt-ink dark:text-mt-ink">Choose a new password</h1>
                <p className="text-sm text-mt-muted dark:text-mt-muted text-center mb-6">
                  Enter a new password for your Magical Touch Design account.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <input
                    type="password"
                    placeholder="New password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={input}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={input}
                    required
                  />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button
                    type="submit"
                    disabled={status === 'saving'}
                    className="bg-brand-gradient text-white font-semibold p-3 rounded-full shadow-md disabled:opacity-50"
                  >
                    {status === 'saving' ? 'Saving…' : 'Save new password'}
                  </button>
                </form>
              </>
            )}

            {status === 'done' && (
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-3 text-mt-ink dark:text-mt-ink">Password updated</h1>
                <p className="text-sm text-mt-muted dark:text-mt-muted">
                  Your password has been changed. Taking you to your dashboard…
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
