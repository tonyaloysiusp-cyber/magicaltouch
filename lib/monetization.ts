// Paid features — ready, switched OFF (Admin → Pricing & payments).
//
// Two one-time purchases that can be switched on independently later:
//   editor     one payment unlocks the editor for good
//   templates  one payment unlocks every Premium template (is_free = false)
// The public site setting `monetization` holds the settings. While it is
// missing or `enabled` is false, nothing is charged or locked anywhere.
// Admins are never charged; "free until" keeps everything free to a date.

import { useEffect, useState } from 'react';
import { supabase, getSessionUser } from '@/lib/supabase';

export type Product = 'editor' | 'templates';
export interface ProductSettings { on: boolean; price: number; link: string }
export interface Monetization { enabled: boolean; currency: string; freeUntil: string | null; editor: ProductSettings; templates: ProductSettings }

export const OFF: Monetization = { enabled: false, currency: 'AED', freeUntil: null, editor: { on: false, price: 49, link: '' }, templates: { on: false, price: 29, link: '' } };

export function parseMonetization(v: unknown): Monetization {
  try {
    const o: any = typeof v === 'string' ? JSON.parse(v) : v;
    if (!o || typeof o !== 'object') return OFF;
    const p = (x: any, d: ProductSettings): ProductSettings => ({ on: !!x?.on, price: Math.max(0, Number(x?.price) || d.price), link: typeof x?.link === 'string' && /^https:\/\//.test(x.link) ? x.link : '' });
    return { enabled: !!o.enabled, currency: /^[A-Z]{3}$/.test(o.currency) ? o.currency : 'AED', freeUntil: /^\d{4}-\d{2}-\d{2}$/.test(o.freeUntil || '') ? o.freeUntil : null, editor: p(o.editor, OFF.editor), templates: p(o.templates, OFF.templates) };
  } catch { return OFF; }
}

/** Is this product being charged for right now (for anyone)? */
export function charging(m: Monetization, product: Product, today = new Date()): boolean {
  if (!m.enabled || !m[product].on || !m[product].link) return false;
  if (m.freeUntil && today.toISOString().slice(0, 10) <= m.freeUntil) return false;
  return true;
}

export const priceLabel = (m: Monetization, product: Product) => `${m.currency} ${m[product].price}`;

/** Payment page for a product, tied to this user so the purchase is recorded automatically. */
export function buyLink(m: Monetization, product: Product, user: { id: string; email?: string | null }) {
  const u = new URL(m[product].link);
  u.searchParams.set('client_reference_id', `${product}_${user.id}`);
  if (user.email) u.searchParams.set('prefilled_email', user.email);
  return u.toString();
}

export interface Access { loading: boolean; settings: Monetization; user: { id: string; email?: string | null } | null; admin: boolean; owns: Set<Product> }

/** Settings + what the signed-in person owns. Cheap: one small read while charging is off. */
export function useAccess(): Access {
  const [a, setA] = useState<Access>({ loading: true, settings: OFF, user: null, admin: false, owns: new Set() });
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'monetization').maybeSingle();
      const settings = parseMonetization((data as any)?.value);
      if (!charging(settings, 'editor') && !charging(settings, 'templates')) { if (live) setA({ loading: false, settings, user: null, admin: false, owns: new Set() }); return; }
      const { data: { user } } = await getSessionUser();
      let admin = false; const owns = new Set<Product>();
      if (user) {
        const [{ data: prof }, { data: buys }] = await Promise.all([
          supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
          supabase.from('purchases').select('product').eq('user_id', user.id),
        ]);
        admin = !!(prof as any)?.is_admin;
        ((buys as any[]) || []).forEach((b) => owns.add(b.product));
      }
      if (live) setA({ loading: false, settings, user: user ? { id: user.id, email: user.email } : null, admin, owns });
    })().catch(() => live && setA((x) => ({ ...x, loading: false })));
    return () => { live = false; };
  }, []);
  return a;
}

/** Must this person pay before using `product`? */
export const mustPay = (a: Access, product: Product) => !a.loading && charging(a.settings, product) && !a.admin && !a.owns.has(product);
