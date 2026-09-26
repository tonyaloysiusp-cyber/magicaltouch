'use client';

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
      setError(error.message);
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
      setResetError(error.message);
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main className="min-h-screen lg:grid lg:grid-cols-2 bg-white dark:bg-[#111015] transition-colors duration-300">
      <div className="hidden lg:block h-screen sticky top-0">
        <ArtworkPanel variant={theme === 'dark' ? 'night' : 'day'} />
      </div>
      <div className="relative flex flex-col items-center justify-center p-6 min-h-screen">
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className="absolute top-6 right-6 p-2 rounded-full border border-black/10 dark:border-white/15 text-gray-500 dark:text-[#B7B2C6] hover:border-black/25 dark:hover:border-white/30 transition-colors"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <BrandLogo theme={theme} width={280} height={56} className="mb-8" />
      <div className="w-full max-w-sm">
        {!showForgot ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-[#F3F1F7]">Log In</h1>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 dark:border-white/15 dark:bg-[#1B1926] dark:text-[#F3F1F7] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 dark:border-white/15 dark:bg-[#1B1926] dark:text-[#F3F1F7] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
            <p className="mt-4 text-center text-sm text-gray-500 dark:text-[#B7B2C6]">
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
            <h1 className="text-2xl font-bold mb-2 text-center text-gray-800 dark:text-[#F3F1F7]">Reset your password</h1>
            <p className="text-sm text-gray-500 dark:text-[#B7B2C6] text-center mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {resetSent ? (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm text-gray-700 dark:text-[#B7B2C6]">
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
                  className="border border-gray-300 dark:border-white/15 dark:bg-[#1B1926] dark:text-[#F3F1F7] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
                  className="text-sm text-gray-500 dark:text-[#B7B2C6] hover:text-gray-700 dark:hover:text-white"
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
