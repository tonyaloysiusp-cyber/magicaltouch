// Paid features — ready, switched OFF (Admin → Pricing & payments).
//
// Worldwide pricing, each product optional and switched on separately:
//   single    one Premium template, bought once
//   pack5     5 template credits — unlock any 5 Premium templates
//   pack10    10 template credits
//   monthly   everything (all templates + the editor) for a month
//   yearly    everything for a year
//   editor    the editor, bought once
// Only templates marked Premium (templates.is_free = false) are ever locked;
// all others stay free. The public site setting `monetization` holds the
// settings. While it is missing or `enabled` is false, nothing is charged or
// locked anywhere. Admins are never charged; "free until" keeps everything
// free to a date.

import { useEffect, useState } from 'react';
import { supabase, getSessionUser } from '@/lib/supabase';

export type Product = 'single' | 'pack5' | 'pack10' | 'monthly' | 'yearly' | 'editor';
export const PRODUCTS: Product[] = ['single', 'pack5', 'pack10', 'monthly', 'yearly', 'editor'];
export const TEMPLATE_PRODUCTS: Product[] = ['single', 'pack5', 'pack10', 'monthly', 'yearly'];
export interface ProductSettings { on: boolean; price: number; link: string }
export type Monetization = { enabled: boolean; currency: string; freeUntil: string | null } & Record<Product, ProductSettings>;

export const PRODUCT_INFO: Record<Product, { name: string; short: string; per?: string; body: string }> = {
  single: { name: 'One template', short: 'this template', body: 'Buy one Premium template once — yours to edit and download forever.' },
  pack5: { name: '5-template pack', short: '5 templates', body: 'Unlock any 5 Premium templates, whenever you like.' },
  pack10: { name: '10-template pack', short: '10 templates', body: 'Unlock any 10 Premium templates — the best value per template.' },
  monthly: { name: 'Monthly plan', short: 'everything for a month', per: '/month', body: 'Every template and the full editor while your plan is active. Cancel any time.' },
  yearly: { name: 'Yearly plan', short: 'everything for a year', per: '/year', body: 'Every template and the full editor for a year — about 4 months free.' },
  editor: { name: 'Editor — lifetime', short: 'the editor', body: 'One payment unlocks the full editor for good.' },
};

const DEFAULTS: Record<Product, number> = { single: 2, pack5: 7, pack10: 12, monthly: 5, yearly: 39, editor: 19 };
export const OFF: Monetization = {
  enabled: false, currency: 'USD', freeUntil: null,
  ...(Object.fromEntries(PRODUCTS.map((p) => [p, { on: false, price: DEFAULTS[p], link: '' }])) as Record<Product, ProductSettings>),
};

export function parseMonetization(v: unknown): Monetization {
  try {
    const o: any = typeof v === 'string' ? JSON.parse(v) : v;
    if (!o || typeof o !== 'object') return OFF;
    const p = (x: any, d: number): ProductSettings => ({ on: !!x?.on, price: Math.max(0, Number(x?.price) || d), link: typeof x?.link === 'string' && /^https:\/\//.test(x.link) ? x.link : '' });
    return {
      enabled: !!o.enabled,
      currency: /^[A-Z]{3}$/.test(o.currency) ? o.currency : 'USD',
      freeUntil: /^\d{4}-\d{2}-\d{2}$/.test(o.freeUntil || '') ? o.freeUntil : null,
      ...(Object.fromEntries(PRODUCTS.map((k) => [k, p(o[k], DEFAULTS[k])])) as Record<Product, ProductSettings>),
    };
  } catch { return OFF; }
}

/** Is this product being sold right now (for anyone)? */
export function charging(m: Monetization, product: Product, today = new Date()): boolean {
  if (!m.enabled || !m[product].on || !m[product].link) return false;
  if (m.freeUntil && today.toISOString().slice(0, 10) <= m.freeUntil) return false;
  return true;
}
export const anyCharging = (m: Monetization) => PRODUCTS.some((p) => charging(m, p));
export const templatesLocked = (m: Monetization) => TEMPLATE_PRODUCTS.some((p) => charging(m, p));

const SYMBOL: Record<string, string> = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
export const money = (m: Monetization, n: number) => (SYMBOL[m.currency] ? `${SYMBOL[m.currency]}${n}` : `${m.currency} ${n}`);
export const priceLabel = (m: Monetization, product: Product) => `${money(m, m[product].price)}${PRODUCT_INFO[product].per || ''}`;

/** Payment page for a product, tied to this user (and template) so the purchase is recorded automatically. */
export function buyLink(m: Monetization, product: Product, user: { id: string; email?: string | null }, templateId?: string) {
  const u = new URL(m[product].link);
  u.searchParams.set('client_reference_id', product === 'single' && templateId ? `single_${templateId}_${user.id}` : `${product}_${user.id}`);
  if (user.email) u.searchParams.set('prefilled_email', user.email);
  return u.toString();
}

export interface Access {
  loading: boolean; settings: Monetization; user: { id: string; email?: string | null } | null; admin: boolean;
  planUntil: string | null; editor: boolean; allTemplates: boolean; credits: number; templates: Set<string>;
}
const EMPTY: Omit<Access, 'loading' | 'settings'> = { user: null, admin: false, planUntil: null, editor: false, allTemplates: false, credits: 0, templates: new Set() };

/** Settings + what the signed-in person owns. One small read while charging is off. */
export function useAccess(): Access & { refresh: () => void } {
  const [a, setA] = useState<Access>({ loading: true, settings: OFF, ...EMPTY });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', 'monetization').maybeSingle();
      const settings = parseMonetization((data as any)?.value);
      if (!anyCharging(settings)) { if (live) setA({ loading: false, settings, ...EMPTY }); return; }
      const { data: { user } } = await getSessionUser();
      if (!user) { if (live) setA({ loading: false, settings, ...EMPTY }); return; }
      const [{ data: prof }, { data: acc }] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
        supabase.rpc('my_access'),
      ]);
      const x: any = acc || {};
      if (live) setA({
        loading: false, settings, user: { id: user.id, email: user.email }, admin: !!(prof as any)?.is_admin,
        planUntil: x.plan_until || null, editor: !!x.editor, allTemplates: !!x.all_templates, credits: Number(x.credits) || 0,
        templates: new Set<string>((x.templates as string[]) || []),
      });
    })().catch(() => live && setA((y) => ({ ...y, loading: false })));
    return () => { live = false; };
  }, [tick]);
  return { ...a, refresh: () => setTick((t) => t + 1) };
}

export const planActive = (a: Access) => !!a.planUntil && new Date(a.planUntil).getTime() > Date.now();

/** Must this person pay before opening the editor? */
export const mustPayEditor = (a: Access) => !a.loading && charging(a.settings, 'editor') && !a.admin && !a.editor && !planActive(a);

/** Must this person pay before using this Premium template? (Free templates never.) */
export const mustPayTemplate = (a: Access, templateId: string | null | undefined, isFree: boolean | undefined) =>
  isFree === false && !a.loading && templatesLocked(a.settings) && !a.admin && !planActive(a) && !a.allTemplates && !(templateId && a.templates.has(templateId));
