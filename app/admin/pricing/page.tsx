'use client';

// Admin → Pricing & payments. Ready for later, OFF today: everything on the
// site stays free until an admin switches charging on here.
//  · Master switch (with a confirmation), currency and "free until" date
//  · Templates: one template (one-time), 5-pack and 10-pack (credits)
//  · Plans: monthly and yearly — every template and the editor
//  · Editor: lifetime, one-time (optional)
//    Each has its own price, payment link and on/off
//  · Premium templates: marked with the "Free" box in Admin → Templates
//  · Purchases: list, and "Grant access" by e-mail (UPI, bank transfer, gift)
//  · Setup steps for payment links (worldwide)

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, Check, CheckCircle2, Crown, ExternalLink, Gift, Layers, Loader2, Lock, PenTool, ShieldCheck, UserPlus } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { Monetization, OFF, PRODUCTS as ALL, PRODUCT_INFO, Product, anyCharging, charging, money, parseMonetization } from '@/lib/monetization';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'SAR', 'AUD', 'CAD'];
const GROUPS: { title: string; help: string; icon: JSX.Element; items: Product[] }[] = [
  { title: 'Templates — pay per template', help: 'One-time payments. Only templates marked Premium are locked; all others stay free.', icon: <Crown size={18} />, items: ['single', 'pack5', 'pack10'] },
  { title: 'Plans — everything included', help: 'Monthly or yearly subscription: every template and the full editor while active.', icon: <CalendarClock size={18} />, items: ['monthly', 'yearly'] },
  { title: 'Editor — lifetime (optional)', help: 'Only if you want to charge for the editor itself. Leave off to keep the editor free.', icon: <PenTool size={18} />, items: ['editor'] },
];
const LABEL: Record<string, string> = { ...Object.fromEntries(ALL.map((p) => [p, PRODUCT_INFO[p].name])), templates: 'All Premium templates (old)' };

interface Purchase { id: string; product: string; amount_cents: number | null; currency: string | null; provider: string; note: string | null; created_at: string; expires_at: string | null; email: string; template: string | null }

export default function PricingAdminPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [m, setM] = useState<Monetization>(OFF);
  const [saved, setSaved] = useState<Monetization>(OFF);
  const [premium, setPremium] = useState<number | null>(null);
  const [buys, setBuys] = useState<Purchase[]>([]);
  const [grant, setGrant] = useState({ email: '', product: 'yearly' as Product, note: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data: s }, { count }, { data: p }] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', 'monetization').maybeSingle(),
      supabase.from('templates').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('is_free', false),
      supabase.rpc('admin_purchases'),
    ]);
    const v = parseMonetization((s as any)?.value);
    setM(v); setSaved(v); setPremium(count ?? 0); setBuys(((p as Purchase[]) || []));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/pricing');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      await load();
      setState('ok');
    })();
  }, [router, load]);

  const flash = (tone: 'ok' | 'err', text: string) => { setMsg({ tone, text }); setTimeout(() => setMsg((x) => (x?.text === text ? null : x)), 7000); };
  const save = async (next: Monetization, note = 'Saved.') => {
    setBusy('save');
    const { error } = await supabase.from('site_settings').upsert({ key: 'monetization', value: JSON.stringify(next), updated_at: new Date().toISOString() });
    setBusy(null);
    if (error) return flash('err', error.message);
    setM(next); setSaved(next); flash('ok', note);
  };
  const setP = (id: Product, patch: Partial<Monetization['editor']>) => setM((x) => ({ ...x, [id]: { ...x[id], ...patch } }));
  const toggleMaster = () => {
    if (!m.enabled) {
      const live = ALL.filter((p) => m[p].on && m[p].link);
      if (!live.length) return flash('err', 'Switch on at least one product and add its payment link first.');
      if (!window.confirm(`Start charging now?\n\n${live.map((p) => `• ${PRODUCT_INFO[p].name}: ${money(m, m[p].price)}`).join('\n')}${m.freeUntil ? `\n\nEverything stays free until ${m.freeUntil}.` : ''}\n\nAdmins are never charged. You can switch it off again at any time.`)) return;
    }
    save({ ...m, enabled: !m.enabled }, !m.enabled ? 'Charging is on.' : 'Charging is off — everything is free again.');
  };
  const doGrant = async () => {
    if (!grant.email.trim()) return;
    setBusy('grant');
    const { error } = await supabase.rpc('admin_grant_purchase', { p_email: grant.email.trim(), p_product: grant.product, p_note: grant.note.trim() || null });
    setBusy(null);
    if (error) return flash('err', error.message);
    flash('ok', `${grant.email} now has: ${PRODUCT_INFO[grant.product].name}.`);
    setGrant({ ...grant, email: '', note: '' });
    load();
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied') return <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg"><p className="text-lg font-semibold text-mt-ink">Administrators only</p><Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link></main>;

  const dirty = JSON.stringify(m) !== JSON.stringify(saved);
  const isCharging = anyCharging(saved);

  return (
    <AdminShell active="pricing" title="Pricing & payments" accent="Pricing" subtitle="Ready for later. Everything on the site is free until you switch charging on here. Worldwide: per template, packs, monthly and yearly plans.">
      <div className="flex flex-col gap-6">
        {msg && <p className={`rounded-2xl px-4 py-2.5 text-sm ${msg.tone === 'ok' ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-600/10 text-rose-700 dark:text-rose-400'}`} role="status">{msg.text}</p>}

        <section className={card}>
          <div className="flex flex-wrap items-center gap-4">
            {isCharging ? <Lock size={26} className="text-amber-600" /> : <Gift size={26} className="text-emerald-600" />}
            <div className="flex-1 min-w-[240px]">
              <h2 className="text-xl font-semibold">{isCharging ? 'Charging is on' : 'Everything is free'}</h2>
              <p className="text-[13px] text-mt-muted">{isCharging ? `On sale: ${ALL.filter((p) => charging(saved, p)).map((p) => PRODUCT_INFO[p].name).join(', ')}. Admins are never charged.` : saved.enabled && saved.freeUntil ? `Charging is set up and starts after ${saved.freeUntil}.` : 'No one is charged and nothing is locked. Set prices and payment links below now or later, then switch charging on.'}</p>
            </div>
            <button onClick={toggleMaster} disabled={!!busy} className={`${btn} h-11 px-5 ${saved.enabled ? 'border border-mt-border' : 'bg-mt-primary text-mt-onprimary'}`}>{saved.enabled ? 'Switch charging off' : 'Switch charging on…'}</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="text-[12px] text-mt-muted">Currency<select className={field} value={m.currency} onChange={(e) => setM({ ...m, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-[12px] text-mt-muted sm:col-span-2">Free for everyone until (optional)<input type="date" className={field} value={m.freeUntil || ''} onChange={(e) => setM({ ...m, freeUntil: e.target.value || null })} /><span className="block mt-1 text-[11px] text-mt-faint">E.g. one year from launch. Even with charging on, nobody pays before this date.</span></label>
          </div>
        </section>

        {GROUPS.map((g) => (
          <section key={g.title} className={card}>
            <div className="flex items-start gap-3">
              <span className="h-10 w-10 rounded-xl bg-mt-surface2 grid place-items-center shrink-0">{g.icon}</span>
              <div className="flex-1"><h3 className="text-[16px] font-semibold">{g.title}</h3><p className="text-[13px] text-mt-muted">{g.help}</p></div>
            </div>
            <div className={`mt-4 grid gap-3 ${g.items.length === 3 ? 'lg:grid-cols-3' : g.items.length === 2 ? 'lg:grid-cols-2' : ''}`}>
              {g.items.map((p) => (
                <div key={p} className={`rounded-2xl border p-4 ${m[p].on ? 'border-mt-ink' : 'border-mt-border'}`}>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 font-semibold text-[14px]">{PRODUCT_INFO[p].name}</p>
                    <label className="inline-flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={m[p].on} onChange={(e) => setP(p, { on: e.target.checked })} /> Sell</label>
                  </div>
                  <p className="text-[12px] text-mt-muted">{PRODUCT_INFO[p].body}</p>
                  <label className="mt-3 block text-[12px] text-mt-muted">Price ({m.currency}){PRODUCT_INFO[p].per ? ` ${PRODUCT_INFO[p].per}` : ''}<input type="number" min={0} step={0.5} className={field} value={m[p].price} onChange={(e) => setP(p, { price: Math.max(0, Number(e.target.value) || 0) })} /></label>
                  <label className="mt-2 block text-[12px] text-mt-muted">Payment link<input className={field} value={m[p].link} onChange={(e) => setP(p, { link: e.target.value.trim() })} placeholder="https://buy.stripe.com/…" inputMode="url" /></label>
                  {(p === 'pack5' || p === 'pack10') && m[p].price > 0 && m.single.price > 0 && <p className="mt-2 text-[11px] text-mt-faint">{money(m, Math.round((m[p].price / (p === 'pack5' ? 5 : 10)) * 100) / 100)} per template · saves {Math.max(0, Math.round(100 - (100 * m[p].price) / ((p === 'pack5' ? 5 : 10) * m.single.price)))}%</p>}
                  {p === 'yearly' && m.monthly.price > 0 && m.yearly.price > 0 && <p className="mt-2 text-[11px] text-mt-faint">Same as {money(m, Math.round((m.yearly.price / 12) * 100) / 100)}/month · saves {Math.max(0, Math.round(100 - (100 * m.yearly.price) / (12 * m.monthly.price)))}% vs monthly</p>}
                  {m[p].on && !m[p].link && <p className="mt-2 text-[12px] text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5"><AlertTriangle size={13} /> Add the payment link — without it this is never charged.</p>}
                </div>
              ))}
            </div>
            {g.items.includes('single') && <p className="mt-3 text-[13px] text-mt-muted inline-flex items-center gap-1.5"><Layers size={14} /> {premium === null ? '…' : premium} Premium template{premium === 1 ? '' : 's'} today. Mark a template Premium by unticking <b>Free</b> in <Link href="/admin/templates" className="underline">Templates</Link>.</p>}
          </section>
        ))}
        <div className="flex gap-2"><button onClick={() => save(m)} disabled={!dirty || !!busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save prices & links</button>{dirty && <span className="text-[12px] text-mt-muted self-center">Unsaved changes</span>}</div>

        <section className={card}>
          <h2 className="text-lg font-semibold inline-flex items-center gap-2"><ShieldCheck size={19} /> How to set up payments (about 20 minutes, when you’re ready)</h2>
          <ol className="mt-3 list-decimal pl-5 space-y-2 text-[14px] text-mt-muted">
            <li>Create a <a className="underline" href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer">Stripe</a> account for your business and finish verification (it takes cards from every country). For an Indian business check that Stripe accepts your account; if not, Razorpay can be connected instead — and UPI or bank payments can always be added by hand with <b>Grant access</b> below.</li>
            <li>Stripe → <b>Payment Links</b> → New: one link per product you sell — <i>One template</i>, <i>5-template pack</i>, <i>10-template pack</i> as one-time prices; <i>Monthly</i> and <i>Yearly</i> as recurring prices. Under <i>After payment</i>, send people to <code className="text-[12px]">https://www.magicaltouchdesign.com/dashboard</code>. Paste each link above.</li>
            <li>Stripe → Developers → <b>Webhooks</b> → Add endpoint <code className="text-[12px]">https://www.magicaltouchdesign.com/api/payments/stripe</code>, events <code className="text-[12px]">checkout.session.completed</code> and <code className="text-[12px]">invoice.paid</code> (renews plans). Copy the signing secret.</li>
            <li>Vercel → Settings → Environment variables: add <code className="text-[12px]">STRIPE_WEBHOOK_SECRET</code> (from step 3) and <code className="text-[12px]">SUPABASE_SERVICE_ROLE_KEY</code> (Supabase → Project settings → API), then redeploy. Purchases now unlock access automatically.</li>
            <li>Test with Stripe’s test mode first, then switch charging on above. Update your <Link href="/terms" className="underline">Terms</Link> with the refund policy.</li>
          </ol>
        </section>

        <section className={card}>
          <h2 className="text-lg font-semibold inline-flex items-center gap-2"><UserPlus size={19} /> Purchases {buys.length > 0 && <span className="text-mt-muted font-normal text-[14px]">({buys.length})</span>}</h2>
          <p className="text-[13px] text-mt-muted">Paid by bank transfer, a gift or a refund fix? Give access by e-mail — they must have an account.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_1fr_auto]">
            <input className={field} value={grant.email} onChange={(e) => setGrant({ ...grant, email: e.target.value })} placeholder="customer@email.com" inputMode="email" />
            <select className={field} value={grant.product} onChange={(e) => setGrant({ ...grant, product: e.target.value as Product })}>{(['yearly', 'monthly', 'pack10', 'pack5', 'editor'] as Product[]).map((p) => <option key={p} value={p}>{PRODUCT_INFO[p].name}</option>)}</select>
            <input className={field} value={grant.note} onChange={(e) => setGrant({ ...grant, note: e.target.value })} placeholder="Note (optional)" />
            <button onClick={doGrant} disabled={!grant.email.trim() || !!busy} className={`${btn} h-10 bg-mt-primary text-mt-onprimary`}>{busy === 'grant' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Grant access</button>
          </div>
          <ul className="mt-4 divide-y divide-mt-border text-[13px]">
            {buys.map((b) => (
              <li key={b.id} className="py-2 flex flex-wrap gap-3">
                <span className="flex-1 min-w-[180px] text-mt-ink">{b.email}</span>
                <span className="text-mt-muted">{LABEL[b.product] || b.product}{b.template ? ` · ${b.template}` : ''}{b.expires_at ? ` · until ${new Date(b.expires_at).toLocaleDateString('en-GB')}` : ''}</span>
                <span className="text-mt-muted tabular-nums">{b.amount_cents != null ? `${b.currency} ${(b.amount_cents / 100).toFixed(2)}` : b.provider === 'manual' ? 'Granted' : '—'}</span>
                <span className="text-mt-faint">{new Date(b.created_at).toLocaleDateString('en-GB')}</span>
              </li>
            ))}
            {!buys.length && <li className="py-3 text-mt-muted">No purchases yet.</li>}
          </ul>
        </section>
        <p className="text-[12px] text-mt-faint inline-flex items-center gap-1.5"><ExternalLink size={12} /> While charging is off, none of this is visible to visitors.</p>
      </div>
    </AdminShell>
  );
}
