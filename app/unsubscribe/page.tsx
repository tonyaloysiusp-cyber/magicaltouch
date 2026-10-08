'use client';

// Unsubscribe page linked from every marketing e-mail. It asks for one
// tap (rather than unsubscribing on page load) because e-mail security
// scanners open links automatically and would otherwise unsubscribe
// people who never asked. Account e-mails (password, security) continue.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BrandLogo } from '@/components/BrandLogo';

const REASONS = ['Too many e-mails', 'Not relevant to me', 'I never signed up', 'Other'];

export default function UnsubscribePage() {
  const [token, setToken] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'ready' | 'working' | 'done' | 'invalid'>('ready');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get('t');
    setToken(t);
    setCampaign(p.get('c'));
    if (!t || !/^[0-9a-f-]{36}$/i.test(t)) setState('invalid');
  }, []);

  const unsubscribe = async () => {
    if (!token) return;
    setState('working');
    const { data, error } = await supabase.rpc('unsubscribe_marketing', {
      p_token: token,
      p_reason: reason || null,
      p_campaign: campaign && /^[0-9a-f-]{36}$/i.test(campaign) ? campaign : null,
    });
    setState(!error && data ? 'done' : 'invalid');
  };

  return (
    <main className="min-h-screen bg-mt-bg flex flex-col items-center justify-center p-6 text-center text-mt-ink">
      <BrandLogo theme="light" width={220} height={44} className="mb-8" />
      <div className="w-full max-w-md bg-mt-surface rounded-2xl border border-black/5 shadow-sm p-7">
        {state === 'done' ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">You&apos;re unsubscribed</h1>
            <p className="text-sm text-mt-muted">
              You won&apos;t receive offers or news from Magical Touch Design any more. Important account e-mails, like password resets, will still arrive.
            </p>
            <p className="text-xs text-mt-muted mt-4">Changed your mind? You can turn offers back on from your Profile page.</p>
          </>
        ) : state === 'invalid' ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">This link isn&apos;t valid</h1>
            <p className="text-sm text-mt-muted">
              Please use the Unsubscribe link from a recent e-mail, or turn off offers from your Profile page. You can also write to us at hellomagicaltouch.design@gmail.com.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">Unsubscribe from offers and news?</h1>
            <p className="text-sm text-mt-muted mb-5">You&apos;ll still get important account e-mails.</p>
            <label className="block text-left text-xs text-mt-muted mb-1">Reason (optional)</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-5">
              <option value="">Prefer not to say</option>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={unsubscribe}
              disabled={state === 'working'}
              className="w-full bg-[#14121F] text-white font-semibold rounded-full py-3 text-sm disabled:opacity-50"
            >
              {state === 'working' ? 'Unsubscribing…' : 'Unsubscribe'}
            </button>
          </>
        )}
        <Link href="/" className="inline-block mt-6 text-sm text-mt-accent">Go to Magical Touch Design</Link>
      </div>
    </main>
  );
}
