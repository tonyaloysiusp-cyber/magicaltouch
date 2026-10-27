'use client';

// The site footer — the same on every page that has the site menu.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUp, Mail } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { supabase, getSessionUser } from '@/lib/supabase';
import { BrandLogo } from '@/components/BrandLogo';
import { AppTheme } from '@/hooks/useAppTheme';

const EMAIL = 'hellomagicaltouch.design@gmail.com';

const CATEGORIES = ['Social Media', 'Marketing', 'Birthday', 'Business', 'Events', 'Wedding', 'Festivals', 'Menus', 'Cards', 'Certificates', 'Resume'];
const TOOLS: [string, string][] = [
  ['free-flyer-maker', 'Flyer maker'],
  ['free-poster-maker', 'Poster maker'],
  ['free-invitation-maker', 'Invitation maker'],
  ['free-resume-maker', 'Resume maker'],
  ['free-business-card-maker', 'Business card maker'],
  ['free-menu-maker', 'Menu maker'],
  ['free-certificate-maker', 'Certificate maker'],
  ['free-instagram-post-maker', 'Instagram post maker'],
];

const link = 'text-mt-muted hover:text-mt-ink transition-colors';
const head = 'text-[12px] font-semibold uppercase tracking-[0.14em] text-mt-ink';

export function Footer({ theme }: { theme: AppTheme }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getSessionUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(!!session?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  const go = async (path: string) => router.push(await resolveAuthedPath(path));
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <footer className="relative mt-8 border-t border-mt-border bg-mt-surface">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[3px] mt-spectrum" />
      <div className="mt-container pt-14 pb-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2.2fr)]">
          {/* Brand */}
          <div>
            <Link href="/" aria-label="Magical Touch Design — home" className="inline-block">
              <BrandLogo theme={theme} width={150} height={30} />
            </Link>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-mt-muted">
              A free online design studio: templates, an editor and Photo Studio, right in your browser. No watermark.
            </p>
            <a href={`mailto:${EMAIL}`} className="mt-5 inline-flex items-center gap-2 rounded-full border border-mt-border px-4 py-2 text-[13px] font-medium text-mt-ink hover:bg-mt-surface2 break-all">
              <Mail size={15} aria-hidden className="shrink-0" /> {EMAIL}
            </a>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <nav aria-label="Product">
              <p className={head}>Product</p>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                <li><button onClick={() => go('/create')} className={link}>Create a design</button></li>
                <li><Link href="/templates" className={link}>Templates</Link></li>
                <li><Link href="/photo-studio" className={link}>Photo Studio</Link></li>
                <li><Link href="/tutorials" className={link}>Tutorials &amp; courses</Link></li>
                <li><Link href="/free-design-tools" className={link}>Free design tools</Link></li>
                <li><Link href="/#features" className={link}>Features</Link></li>
              </ul>
            </nav>
            <nav aria-label="Account">
              <p className={head}>Account</p>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {loggedIn ? (
                  <>
                    <li><Link href="/dashboard" className={link}>Dashboard</Link></li>
                    <li><Link href="/profile" className={link}>Profile</Link></li>
                    <li><button onClick={logout} className={link}>Log out</button></li>
                  </>
                ) : (
                  <>
                    <li><Link href="/login" className={link}>Log in</Link></li>
                    <li><Link href="/signup" className={link}>Create a free account</Link></li>
                    <li><button onClick={() => go('/dashboard')} className={link}>Dashboard</button></li>
                  </>
                )}
                <li><Link href="/verify" className={link}>Check a certificate</Link></li>
              </ul>
            </nav>
            <nav aria-label="Company" className="col-span-2 sm:col-span-1">
              <p className={head}>Company</p>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                <li><Link href="/about" className={link}>About us</Link></li>
                <li><Link href="/contact" className={link}>Contact us</Link></li>
                <li><Link href="/privacy" className={link}>Privacy Policy</Link></li>
                <li><Link href="/terms" className={link}>Terms of Service</Link></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 grid gap-8 border-t border-mt-border pt-8 md:grid-cols-2">
          <nav aria-label="Popular template categories">
            <p className={head}>Popular templates</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <Link href={`/templates/category/${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="inline-flex rounded-full border border-mt-border px-3 py-1.5 text-[13px] text-mt-muted hover:text-mt-ink hover:border-mt-ink/30 transition-colors">
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Free design tools">
            <p className={head}>Free design tools</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {TOOLS.map(([slug, label]) => (
                <li key={slug}>
                  <Link href={`/${slug}`} className="inline-flex rounded-full border border-mt-border px-3 py-1.5 text-[13px] text-mt-muted hover:text-mt-ink hover:border-mt-ink/30 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
              <li><Link href="/free-design-tools" className="inline-flex rounded-full px-3 py-1.5 text-[13px] font-semibold text-mt-ink underline underline-offset-2">All tools →</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col-reverse gap-4 border-t border-mt-border pt-6 text-[13px] text-mt-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Magical Touch Design. All rights reserved.</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-1.5 self-start rounded-full border border-mt-border px-3 py-1.5 font-medium text-mt-ink hover:bg-mt-surface2 sm:self-auto">
            <ArrowUp size={14} aria-hidden /> Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
