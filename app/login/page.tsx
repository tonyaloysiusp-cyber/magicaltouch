'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { friendlyAuthError } from '@/lib/authErrors';
import { Suspense, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { ArtworkPanel } from '@/components/ArtworkPanel';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

function LoginForm() {
  const { theme, toggleTheme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  const justConfirmed = searchParams.get('confirmed') === '1';

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(false);
    } else {
      router.push(next);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResetLoading(false);

    if (error) {
      setResetError(friendlyAuthError(error.message));
    } else {
      setResetSent(true);
    }
  };

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
        {!showForgot ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-mt-ink dark:text-mt-ink">Log In</h1>

            {justConfirmed && (
              <p className="mb-4 text-sm text-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-2">
                Your email is confirmed. Log in to start designing.
              </p>
            )}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-mt-border dark:border-white/15 dark:bg-mt-surface dark:text-mt-ink p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-mt-border dark:border-white/15 dark:bg-mt-surface dark:text-mt-ink p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />

              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setResetEmail(email);
                    setResetSent(false);
                    setResetError('');
                  }}
                  className="text-xs text-brand-blue font-medium hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-brand-gradient text-white font-semibold p-3 rounded-full shadow-md disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-mt-muted dark:text-mt-muted">
              Don&apos;t have an account?{' '}
              <a
                href={`/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
                className="text-brand-blue font-medium"
              >
                Sign up
              </a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center text-mt-ink dark:text-mt-ink">Reset your password</h1>
            <p className="text-sm text-mt-muted dark:text-mt-muted text-center mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {resetSent ? (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm text-mt-ink dark:text-mt-muted">
                  If an account exists for <span className="font-medium">{resetEmail}</span>, a reset
                  link is on its way. Check your inbox (and spam folder).
                </p>
                <button
                  onClick={() => setShowForgot(false)}
                  className="text-sm text-brand-blue font-medium hover:underline"
                >
                  Back to log in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="border border-mt-border dark:border-white/15 dark:bg-mt-surface dark:text-mt-ink p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  required
                />
                {resetError && <p className="text-red-500 text-sm">{resetError}</p>}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="bg-brand-gradient text-white font-semibold p-3 rounded-full shadow-md disabled:opacity-50"
                >
                  {resetLoading ? 'Sending link...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="text-sm text-mt-muted dark:text-mt-muted hover:text-mt-ink dark:hover:text-white"
                >
                  Back to log in
                </button>
              </form>
            )}
          </>
        )}
      </div>
      </div>
    </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
