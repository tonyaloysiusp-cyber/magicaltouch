'use client';

// Public certificate check. Shows exactly what our records say — the name,
// title, date and status — so a copied or edited certificate is obvious.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldX, ShieldAlert, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppHeader } from '@/components/AppHeader';
import { PageHero } from '@/components/PageHero';
import { useAppTheme } from '@/hooks/useAppTheme';
import { IssuedCertificate, normaliseCode } from '@/lib/certificates';

const field = 'w-full h-12 rounded-2xl border border-mt-input-border bg-mt-surface px-4 text-[16px] font-mono tracking-wider text-mt-ink placeholder:text-mt-faint focus:outline-none focus:border-[#3B82C4] focus:ring-4 focus:ring-[#8CCBFF]/30';

export function VerifyView({ initialCode = '' }: { initialCode?: string }) {
  const { theme, toggleTheme } = useAppTheme();
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [state, setState] = useState<'idle' | 'checking' | 'done' | 'error'>(initialCode ? 'checking' : 'idle');
  const [cert, setCert] = useState<IssuedCertificate | null>(null);

  useEffect(() => {
    if (!initialCode) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc('verify_certificate', { p_code: normaliseCode(initialCode) });
      if (!alive) return;
      if (error) return setState('error');
      setCert(((data as IssuedCertificate[]) || [])[0] || null);
      setState('done');
    })();
    return () => { alive = false; };
  }, [initialCode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normaliseCode(code);
    if (c.length >= 6) router.push(`/verify/${encodeURIComponent(c)}`);
  };
  const date = cert ? new Date(cert.issued_on + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} />
        <PageHero eyebrow="Certificate check" title="Is this certificate real?" accent="real" subtitle="Every certificate we issue carries a code and a QR code. Enter the code to see what our records say." />
        <div className="mt-container py-10 max-w-2xl">
          <form onSubmit={submit} className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Certificate code</span>
              <input className={field} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MTD-XXXXX-XXXXX" autoCapitalize="characters" spellCheck={false} />
            </label>
            <button type="submit" className="h-12 px-6 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center gap-2"><Search size={17} /> Check</button>
          </form>

          {state === 'checking' && <p className="mt-8 inline-flex items-center gap-2 text-mt-muted"><Loader2 size={17} className="animate-spin" /> Checking our records…</p>}
          {state === 'error' && <p className="mt-8 text-rose-600">The check couldn’t be completed. Please try again in a moment.</p>}

          {state === 'done' && cert && cert.status === 'valid' && (
            <section className="mt-8 rounded-3xl border-2 border-emerald-500/60 bg-emerald-500/5 p-6 sm:p-8">
              <p className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold"><ShieldCheck size={22} /> Genuine certificate</p>
              <dl className="mt-5 grid gap-4 text-[15px]">
                <div><dt className="text-mt-muted text-[13px]">Awarded to</dt><dd className="text-2xl font-semibold">{cert.recipient}</dd></div>
                <div><dt className="text-mt-muted text-[13px]">Certificate</dt><dd className="font-semibold">{cert.title}</dd>{cert.description && <dd className="text-mt-muted mt-1">{cert.description}</dd>}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><dt className="text-mt-muted text-[13px]">Issued on</dt><dd className="font-semibold">{date}</dd></div>
                  <div><dt className="text-mt-muted text-[13px]">Issued by</dt><dd className="font-semibold">{cert.issuer}</dd></div>
                </div>
                <div><dt className="text-mt-muted text-[13px]">Code</dt><dd className="font-mono tracking-wider">{cert.code}</dd></div>
              </dl>
              <p className="mt-6 text-[13px] text-mt-muted">Make sure the name, title and date printed on the certificate are exactly the same as above. If anything is different, the certificate has been altered.</p>
            </section>
          )}
          {state === 'done' && cert && cert.status === 'revoked' && (
            <section className="mt-8 rounded-3xl border-2 border-amber-500/60 bg-amber-500/5 p-6 sm:p-8">
              <p className="inline-flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold"><ShieldAlert size={22} /> This certificate has been withdrawn</p>
              <p className="mt-3">It was issued to <b>{cert.recipient}</b> for <b>{cert.title}</b> on {date}, but is no longer valid{cert.revoked_reason ? `: ${cert.revoked_reason}` : '.'}</p>
            </section>
          )}
          {state === 'done' && !cert && (
            <section className="mt-8 rounded-3xl border-2 border-rose-500/60 bg-rose-500/5 p-6 sm:p-8">
              <p className="inline-flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold"><ShieldX size={22} /> No certificate found with this code</p>
              <p className="mt-3 text-[15px]">Check the code was typed exactly as printed. If it was, this certificate was not issued by Magical Touch Design and should not be trusted. You can <Link href="/contact" className="text-mt-accent underline">tell us about it</Link>.</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
