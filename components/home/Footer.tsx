'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveAuthedPath } from '@/lib/authNav';
import { supabase } from '@/lib/supabase';
import { BrandLogo } from '@/components/BrandLogo';
import { AppTheme } from '@/hooks/useAppTheme';

export function Footer({ theme }: { theme: AppTheme }) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  // Same gap as the homepage/templates headers: this footer's "Account"
  // links always said "Log In / Sign Up" even to an already-signed-in
  // visitor.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };
  const goToDashboard = async () => {
    router.push(await resolveAuthedPath('/dashboard'));
  };
  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <footer className="border-t border-black/10 dark:border-white/10 bg-mt-surface dark:bg-mt-bg">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo theme={theme} width={140} height={28} />
            <p className="mt-4 text-sm text-mt-muted dark:text-mt-faint max-w-[16rem] leading-relaxed">
              Your creative space for turning ideas into designs people
              remember.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-mt-ink dark:text-mt-ink tracking-wide uppercase">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-mt-muted dark:text-mt-muted">
              <li><button onClick={goToCreate} className="hover:text-mt-ink dark:hover:text-white">Create a Design</button></li>
              <li><Link href="/templates" className="hover:text-mt-ink dark:hover:text-white">Templates</Link></li>
              <li><Link href="#features" className="hover:text-mt-ink dark:hover:text-white">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-mt-ink dark:hover:text-white">Pricing</Link></li>
              <li><button onClick={goToDashboard} className="hover:text-mt-ink dark:hover:text-white">Your Dashboard</button></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-mt-ink dark:text-mt-ink tracking-wide uppercase">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm text-mt-muted dark:text-mt-muted">
              {loggedIn ? (
                <>
                  <li><Link href="/profile" className="hover:text-mt-ink dark:hover:text-white">Profile</Link></li>
                  <li><button onClick={logout} className="hover:text-mt-ink dark:hover:text-white">Log Out</button></li>
                </>
              ) : (
                <>
                  <li><Link href="/login" className="hover:text-mt-ink dark:hover:text-white">Log In</Link></li>
                  <li><Link href="/signup" className="hover:text-mt-ink dark:hover:text-white">Sign Up</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-mt-ink dark:text-mt-ink tracking-wide uppercase">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm text-mt-muted dark:text-mt-muted">
              <li className="text-mt-muted/70 dark:text-mt-faint/70">Magical Touch Design</li>
              <li><Link href="/privacy" className="hover:text-mt-ink dark:hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-mt-ink dark:hover:text-white">Terms of Service</Link></li>
              <li><a href="mailto:hellomagicaltouch.design@gmail.com" className="hover:text-mt-ink dark:hover:text-white">Contact us</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-black/10 dark:border-white/10 text-xs text-mt-muted dark:text-mt-faint">
          © {new Date().getFullYear()} Magical Touch. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
