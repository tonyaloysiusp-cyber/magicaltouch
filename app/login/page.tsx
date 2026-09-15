'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.7 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C40.6 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.417 2.06-1.25 2.85-.85.79-1.885 1.19-3.083 1.1a3.13 3.13 0 0 1-.03-.4c0-1.09.474-2.03 1.31-2.79.42-.4.96-.72 1.6-.98.65-.26 1.26-.4 1.83-.41.02.14.03.28.03.42Zm4.31 15.53c-.4.93-.87 1.79-1.42 2.58-.75 1.08-1.36 1.83-1.83 2.24-.73.68-1.51 1.03-2.35 1.05-.6.02-1.32-.17-2.17-.55-.85-.38-1.63-.57-2.34-.57-.75 0-1.55.19-2.4.57-.85.39-1.53.6-2.05.61-.8.03-1.6-.33-2.4-1.06-.5-.44-1.14-1.22-1.92-2.33-.83-1.19-1.52-2.57-2.06-4.15-.58-1.7-.87-3.35-.87-4.94 0-1.82.4-3.4 1.19-4.72.62-1.06 1.45-1.9 2.48-2.5a6.6 6.6 0 0 1 3.35-.96c.65 0 1.5.21 2.55.62.98.4 1.6.6 1.87.6.2 0 .89-.24 2.05-.71 1.1-.44 2.03-.63 2.79-.56 2.06.17 3.6 1 4.62 2.49-1.84 1.15-2.76 2.75-2.76 4.8 0 1.6.55 2.94 1.66 4.02.5.48 1.06.85 1.68 1.11-.13.4-.27.79-.42 1.16Z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const router = useRouter();

  // --- Forgot password state ---
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
      router.push('/dashboard');
    }
  };

  // signInWithOAuth redirects the whole page to the provider, so there is
  // no "success" branch here to handle — the browser leaves this page.
  // An error only surfaces if Supabase rejects the request before the
  // redirect happens (e.g. the provider isn't enabled in your project).
  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setError('');
    setOauthLoading(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setOauthLoading(null);
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
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Image src="/logo.png" alt="Magical Touch" width={280} height={56} className="mb-8" />
      <div className="w-full max-w-sm">
        {!showForgot ? (
          <>
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Log In</h1>

            <div className="flex flex-col gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleOAuthLogin('google')}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 border border-gray-300 rounded-full p-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <GoogleIcon />
                {oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => handleOAuthLogin('apple')}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2 border border-gray-300 rounded-full p-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <AppleIcon />
                {oauthLoading === 'apple' ? 'Redirecting...' : 'Continue with Apple'}
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">or log in with email</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
            <p className="mt-4 text-center text-sm text-gray-500">
              Don&apos;t have an account? <a href="/signup" className="text-brand-blue font-medium">Sign up</a>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">Reset your password</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {resetSent ? (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm text-gray-700">
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
                  className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Back to log in
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
