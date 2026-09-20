'use client';

import { Suspense, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getOrCreateProfile, updateProfile } from '@/lib/profile';

function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (!data.session) {
      // Email confirmation is required before a session exists.
      setConfirmSent(true);
      setLoading(false);
    } else {
      // Phone is optional contact info on the profile, not an auth
      // credential — this app's login stays email+password only.
      const profile = await getOrCreateProfile(data.user!.id, email.split('@')[0]);
      if (profile && phone.trim()) await updateProfile(data.user!.id, { phone: phone.trim() });
      router.push(next);
    }
  };

  if (confirmSent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <Image src="/logo.png" alt="Magical Touch" width={280} height={56} className="mb-8" />
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-3 text-gray-800">Check your email</h1>
          <p className="text-sm text-gray-500">
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
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Image src="/logo.png" alt="Magical Touch" width={280} height={56} className="mb-8" />
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Create Your Account</h1>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-gradient text-white font-semibold p-3 rounded-full shadow-md"
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <a
            href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-brand-blue font-medium"
          >
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
