'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveAuthedPath } from '@/lib/authNav';
import { supabase } from '@/lib/supabase';

export function Footer() {
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
    <footer className="border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#111015]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Image src="/logo.png" alt="Magical Touch" width={140} height={28} />
            <p className="mt-4 text-sm text-[#4A4750] dark:text-[#8A8496] max-w-[16rem] leading-relaxed">
              A simple, powerful design workspace for creators, businesses and
              professionals.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#17161B] dark:text-[#F3F1F7] tracking-wide uppercase">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4A4750] dark:text-[#B7B2C6]">
              <li><button onClick={goToCreate} className="hover:text-[#17161B] dark:hover:text-white">Create a Design</button></li>
              <li><Link href="/templates" className="hover:text-[#17161B] dark:hover:text-white">Templates</Link></li>
              <li><Link href="#features" className="hover:text-[#17161B] dark:hover:text-white">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-[#17161B] dark:hover:text-white">Pricing</Link></li>
              <li><button onClick={goToDashboard} className="hover:text-[#17161B] dark:hover:text-white">Your Dashboard</button></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#17161B] dark:text-[#F3F1F7] tracking-wide uppercase">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4A4750] dark:text-[#B7B2C6]">
              {loggedIn ? (
                <>
                  <li><Link href="/profile" className="hover:text-[#17161B] dark:hover:text-white">Profile</Link></li>
                  <li><button onClick={logout} className="hover:text-[#17161B] dark:hover:text-white">Log Out</button></li>
                </>
              ) : (
                <>
                  <li><Link href="/login" className="hover:text-[#17161B] dark:hover:text-white">Log In</Link></li>
                  <li><Link href="/signup" className="hover:text-[#17161B] dark:hover:text-white">Sign Up</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#17161B] dark:text-[#F3F1F7] tracking-wide uppercase">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4A4750] dark:text-[#B7B2C6]">
              <li className="text-[#4A4750]/70 dark:text-[#8A8496]/70">Magical Touch Design</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-black/10 dark:border-white/10 text-xs text-[#4A4750] dark:text-[#8A8496]">
          © {new Date().getFullYear()} Magical Touch. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
