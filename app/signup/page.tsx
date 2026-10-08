'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { friendlyAuthError } from '@/lib/authErrors';
import { Eye, EyeOff } from 'lucide-react';
import { Suspense, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { getOrCreateProfile, updateProfile } from '@/lib/profile';
import { ArtworkPanel } from '@/components/ArtworkPanel';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

function SignupForm() {
  const { theme, toggleTheme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  // Marketing is opt-in only and off by default (never pre-ticked).
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      setError('Please use at least 8 characters for your password.');
      return;
    }
    setLoading(true);

    // The choice travels with the account until the e-mail is verified,
    // then the welcome step records it on the profile.
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { marketing_consent: marketingOptIn },
        // The confirmation link brings people back to this site.
        emailRedirectTo: `${window.location.origin}/login?confirmed=1${next !== '/dashboard' ? `&next=${encodeURIComponent(next)}` : ''}`,
      },
    });

    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(false);
    } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      // Supabase answers "success" for an email that is already
      // registered (so addresses can't be probed); tell the person.
      setError('An account with this email already exists. Please log in instead.');
      setLoading(false);
    } else if (!data.session) {
      // Email confirmation is required before a session exists.
      setConfirmSent(true);
      setLoading(false);
    } else {
      // Phone is optional contact info on the profile, not an auth
      // credential — this app's login stays email+password only.
      const profile = await getOrCreateProfile(data.user!.id, cleanEmail.split('@')[0]);
      if (profile && phone.trim()) await updateProfile(data.user!.id, { phone: phone.trim() });
      if (profile && marketingOptIn) {
        await supabase
          .from('profiles')
          .update({ marketing_status: 'subscribed', marketing_consent_at: new Date().toISOString() })
          .eq('id', data.user!.id);
      }
      router.push(next);
    }
  };

  const ThemeToggle = () => (
    <ThemeSwitch theme={theme} onToggle={toggleTheme} className="absolute top-6 right-6" />
  );

  if (confirmSent) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen lg:grid lg:grid-cols-2 bg-transparent transition-colors duration-300">
        <div className="hidden lg:block h-screen sticky top-0">
          <ArtworkPanel variant={theme === 'dark' ? 'night' : 'day'} />
        </div>
        <div className="relative flex flex-col items-center justify-center p-6 min-h-screen">
        <ThemeToggle />
        <BrandLogo theme={theme} width={280} height={56} className="mb-8" />
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-3 text-mt-ink dark:text-mt-ink">Check your email</h1>
          <p className="text-sm text-mt-muted dark:text-mt-muted">
            We sent a confirmation link to <span className="font-medium">{email}</span>. Confirm your
            address, then log in to continue.
          </p>
          <a
            href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="mt-6 inline-block text-brand-blue font-medium hover:underline"
          >
            Back to log in
          </a>
        </div>
        </div>
      </main>
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main className="min-h-screen lg:grid lg:grid-cols-2 bg-transparent transition-colors duration-300">
      <div className="hidden lg:block h-screen sticky top-0">
        <ArtworkPanel variant={theme === 'dark' ? 'night' : 'day'} />
      </div>
      <div className="relative flex flex-col items-center justify-center p-6 min-h-screen">
      <ThemeToggle />
      <BrandLogo theme={theme} width={280} height={56} className="mb-8" />
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-mt-ink dark:text-mt-ink">Create Your Account</h1>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-mt-border bg-mt-surface text-mt-ink p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
            required
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password (at least 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full border border-mt-border bg-mt-surface text-mt-ink p-3 pr-11 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mt-muted hover:text-mt-ink"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-mt-border bg-mt-surface text-mt-ink p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          <label className="flex items-start gap-2 text-sm text-mt-muted dark:text-mt-muted cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 accent-[#6C4FD1]"
            />
            <span>Send me new templates, offers and news by e-mail (optional — unsubscribe any time).</span>
          </label>
          <p className="text-xs text-mt-faint dark:text-mt-faint -mt-1">
            By creating an account you agree to our{' '}
            <a href="/terms" className="underline">Terms of Service</a> and{' '}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-gradient text-white font-semibold p-3 rounded-full shadow-md disabled:opacity-60"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-mt-muted dark:text-mt-muted">
          Already have an account?{' '}
          <a
            href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-brand-blue font-medium"
          >
            Log in
          </a>
        </p>
      </div>
      </div>
    </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
