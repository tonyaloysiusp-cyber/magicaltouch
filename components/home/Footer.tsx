'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveAuthedPath } from '@/lib/authNav';

export function Footer() {
  const router = useRouter();

  const goToCreate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };
  const goToDashboard = async () => {
    router.push(await resolveAuthedPath('/dashboard'));
  };

  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Image src="/logo.png" alt="Magical Touch" width={140} height={28} />
            <p className="mt-4 text-sm text-[#4A4750] max-w-[16rem] leading-relaxed">
              A simple, powerful design workspace for creators, businesses and
              professionals.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#17161B] tracking-wide uppercase">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4A4750]">
              <li><button onClick={goToCreate} className="hover:text-[#17161B]">Create a Design</button></li>
              <li><Link href="/templates" className="hover:text-[#17161B]">Templates</Link></li>
              <li><Link href="#features" className="hover:text-[#17161B]">Features</Link></li>
              <li><Link href="#pricing" className="hover:text-[#17161B]">Pricing</Link></li>
              <li><button onClick={goToDashboard} className="hover:text-[#17161B]">Your Dashboard</button></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#17161B] tracking-wide uppercase">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4A4750]">
              <li><Link href="/login" className="hover:text-[#17161B]">Log In</Link></li>
              <li><Link href="/signup" className="hover:text-[#17161B]">Sign Up</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#17161B] tracking-wide uppercase">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm text-[#4A4750]">
              <li className="text-[#4A4750]/70">Magical Touch Design</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-black/10 text-xs text-[#4A4750]">
          © {new Date().getFullYear()} Magical Touch. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
