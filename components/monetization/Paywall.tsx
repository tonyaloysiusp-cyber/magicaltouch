'use client';

// Paywall pieces — only ever shown when charging is switched on in
// Admin → Pricing & payments. While it's off (today) none of this renders.
//  · PaywallCard     every way to get access, cheapest first: buy this one
//                    template, use a pack credit, 5 / 10 packs, monthly or
//                    yearly plan (or the lifetime editor)
//  · EditorGate      wraps the editor: blocks it for people who must pay —
//                    for the editor itself, or a Premium template opened by link
//  · usePremiumGate  for buttons that open a Premium template

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Loader2, Lock, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Access, Product, PRODUCT_INFO, buyLink, charging, mustPayEditor, mustPayTemplate, priceLabel, useAccess } from '@/lib/monetization';

type Need = { kind: 'editor' } | { kind: 'template'; templateId: string };

export function PaywallCard({ need, access, onClose, onUnlocked }: { need: Need; access: Access & { refresh?: () => void }; onClose?: () => void; onUnlocked?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
  const m = access.settings;
  const options: Product[] = (need.kind === 'editor' ? ['editor', 'monthly', 'yearly'] : ['single', 'pack5', 'pack10', 'monthly', 'yearly']).filter((p) => charging(m, p as Product)) as Product[];
  const templateId = need.kind === 'template' ? need.templateId : undefined;

  const useCredit = async () => {
    if (!templateId) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('unlock_template', { p_template: templateId });
    setBusy(false);
    if (error) return setErr(error.message);
    access.refresh?.(); onUnlocked?.();
  };

  return (
    <div className="relative w-full max-w-md rounded-3xl bg-mt-surface text-mt-ink border border-mt-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
      {onClose && <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 h-9 w-9 rounded-full grid place-items-center text-mt-muted hover:bg-mt-surface2"><X size={18} /></button>}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mt-creative px-3 py-1 text-[12px] font-semibold text-[#09090B]"><Crown size={13} /> {need.kind === 'editor' ? 'Unlock the editor' : 'Premium template'}</span>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight">{need.kind === 'editor' ? 'Choose how to unlock the editor' : 'Choose how to unlock this template'}</h2>

      {need.kind === 'template' && access.credits > 0 && (
        <button onClick={useCredit} disabled={busy} className="mt-4 w-full rounded-2xl border-2 border-emerald-600 p-4 text-left">
          <span className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Use 1 credit — {access.credits} left</span>
          <span className="block text-[13px] text-mt-muted">Unlock this template now with your pack.</span>
        </button>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {options.map((p, i) => (
          <li key={p}>
            {access.user ? (
              <a href={buyLink(m, p, access.user, templateId)} className={`block rounded-2xl border p-4 hover:border-mt-ink ${i === 0 ? 'border-mt-ink' : 'border-mt-border'}`}>
                <span className="flex items-baseline gap-2"><span className="font-semibold flex-1">{PRODUCT_INFO[p].name}</span><span className="text-lg font-semibold tabular-nums">{priceLabel(m, p)}</span></span>
                <span className="block text-[13px] text-mt-muted">{PRODUCT_INFO[p].body}</span>
              </a>
            ) : (
              <div className="rounded-2xl border border-mt-border p-4">
                <span className="flex items-baseline gap-2"><span className="font-semibold flex-1">{PRODUCT_INFO[p].name}</span><span className="text-lg font-semibold tabular-nums">{priceLabel(m, p)}</span></span>
                <span className="block text-[13px] text-mt-muted">{PRODUCT_INFO[p].body}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!access.user && <Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-4 h-12 w-full rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center justify-center gap-2"><Lock size={16} /> Sign in to buy</Link>}
      {err && <p className="mt-3 text-[13px] text-rose-600">{err}</p>}
      <ul className="mt-4 space-y-1 text-[12px] text-mt-muted">
        <li className="flex gap-2"><Check size={14} className="text-emerald-600 shrink-0" /> Secure checkout · prices in {m.currency}</li>
        <li className="flex gap-2"><Check size={14} className="text-emerald-600 shrink-0" /> Free templates always stay free</li>
      </ul>
      <p className="mt-3 text-[12px] text-mt-muted text-center">Already paid? Reload this page — access appears within a minute.</p>
    </div>
  );
}

const Overlay = ({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) => (
  <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md flex flex-col items-center gap-3">{children}</div>
  </div>
);

/** Blocks the editor for people who must pay (never while charging is off). */
export function EditorGate({ children }: { children: React.ReactNode }) {
  const access = useAccess();
  const [premium, setPremium] = useState<string | null>(null);
  useEffect(() => {
    if (access.loading) return;
    const q = new URLSearchParams(window.location.search);
    const id = q.get('templateId');
    if (!id || q.get('editTemplate') === '1') return;
    supabase.from('templates').select('is_free').eq('id', id).maybeSingle().then(({ data }) => setPremium(mustPayTemplate(access, id, (data as any)?.is_free) ? id : null));
  }, [access]);
  const need: Need | null = mustPayEditor(access) ? { kind: 'editor' } : premium ? { kind: 'template', templateId: premium } : null;
  return (
    <>
      {children}
      {need && (
        <Overlay>
          <PaywallCard need={need} access={access} onUnlocked={() => setPremium(null)} />
          <Link href="/dashboard" className="text-[13px] text-white/90 underline underline-offset-4">Back to dashboard</Link>
        </Overlay>
      )}
    </>
  );
}

/** For anything that opens a template: returns a guard and the dialog to render. */
export function usePremiumGate() {
  const access = useAccess();
  const [open, setOpen] = useState<string | null>(null);
  const guard = (isFree: boolean | undefined, templateId?: string) => { if (templateId && mustPayTemplate(access, templateId, isFree)) { setOpen(templateId); return false; } return true; };
  const dialog = open ? <Overlay onClose={() => setOpen(null)}><PaywallCard need={{ kind: 'template', templateId: open }} access={access} onClose={() => setOpen(null)} onUnlocked={() => setOpen(null)} /></Overlay> : null;
  return { guard, dialog, locked: (isFree: boolean | undefined, templateId?: string) => mustPayTemplate(access, templateId, isFree), access };
}
