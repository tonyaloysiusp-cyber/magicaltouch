'use client';

// Paywall pieces — only ever shown when charging is switched on in
// Admin → Pricing & payments. While it's off (today) none of this renders.
//  · PaywallCard   what you get, the one-time price, Buy (or sign in first)
//  · EditorGate    wraps the editor: blocks it for people who must pay —
//                  for the editor itself, or a Premium template opened by link
//  · usePremiumGate  for buttons that open a Premium template

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Lock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Access, Product, buyLink, mustPay, priceLabel, useAccess } from '@/lib/monetization';

const COPY: Record<Product, { title: string; points: string[] }> = {
  editor: { title: 'Unlock the editor — pay once, use forever', points: ['Every editor tool, Photo Studio and AI Studio', 'Print-ready PDF, CMYK, PNG and JPG downloads', 'No subscription — one payment'] },
  templates: { title: 'Unlock every Premium template', points: ['All current and future Premium designs', 'Fully editable, no watermark', 'One payment — no subscription'] },
};

export function PaywallCard({ product, access, onClose }: { product: Product; access: Access; onClose?: () => void }) {
  const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
  return (
    <div className="relative w-full max-w-md rounded-3xl bg-mt-surface text-mt-ink border border-mt-border shadow-2xl p-6">
      {onClose && <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 h-9 w-9 rounded-full grid place-items-center text-mt-muted hover:bg-mt-surface2"><X size={18} /></button>}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mt-creative px-3 py-1 text-[12px] font-semibold text-[#09090B]"><Crown size={13} /> One-time purchase</span>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight">{COPY[product].title}</h2>
      <ul className="mt-4 space-y-2 text-[14px]">{COPY[product].points.map((p) => <li key={p} className="flex gap-2"><Check size={17} className="text-emerald-600 shrink-0 mt-0.5" />{p}</li>)}</ul>
      <p className="mt-5 text-3xl font-semibold">{priceLabel(access.settings, product)} <span className="text-[14px] font-normal text-mt-muted">once</span></p>
      {access.user ? (
        <a href={buyLink(access.settings, product, access.user)} className="mt-5 h-12 w-full rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center justify-center gap-2"><Lock size={16} /> Buy securely</a>
      ) : (
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-5 h-12 w-full rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center justify-center">Sign in to buy</Link>
      )}
      <p className="mt-3 text-[12px] text-mt-muted text-center">Already bought it? Reload this page — access appears within a minute.</p>
    </div>
  );
}

/** Blocks the editor for people who must pay (never while charging is off). */
export function EditorGate({ children }: { children: React.ReactNode }) {
  const access = useAccess();
  const [premiumOpen, setPremiumOpen] = useState(false);
  useEffect(() => {
    if (!mustPay(access, 'templates')) return;
    const id = new URLSearchParams(window.location.search).get('templateId');
    if (!id || new URLSearchParams(window.location.search).get('editTemplate') === '1') return;
    supabase.from('templates').select('is_free').eq('id', id).maybeSingle().then(({ data }) => setPremiumOpen((data as any)?.is_free === false));
  }, [access]);
  const product: Product | null = mustPay(access, 'editor') ? 'editor' : premiumOpen ? 'templates' : null;
  return (
    <>
      {children}
      {product && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="flex flex-col items-center gap-3 w-full max-w-md">
            <PaywallCard product={product} access={access} />
            <Link href="/dashboard" className="text-[13px] text-white/90 underline underline-offset-4">Back to dashboard</Link>
          </div>
        </div>
      )}
    </>
  );
}

/** For anything that opens a template: returns a guard and the dialog to render. */
export function usePremiumGate() {
  const access = useAccess();
  const [open, setOpen] = useState(false);
  const guard = (isFree: boolean | undefined) => { if (isFree === false && mustPay(access, 'templates')) { setOpen(true); return false; } return true; };
  const dialog = open ? (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md"><PaywallCard product="templates" access={access} onClose={() => setOpen(false)} /></div>
    </div>
  ) : null;
  return { guard, dialog, locked: (isFree: boolean | undefined) => isFree === false && mustPay(access, 'templates'), access };
}
