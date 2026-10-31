import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

// POST /api/payments/stripe — Stripe calls this when someone pays through a
// Payment Link (Admin → Pricing & payments). It checks Stripe's signature,
// reads which product and which person (client_reference_id =
// "<product>_<userId>" or "single_<templateId>_<userId>", set by the Buy
// button) and records the purchase, so access unlocks automatically.
// Monthly / yearly plans: renewals (invoice.paid) extend the end date. Inactive until both are set in Vercel:
//   STRIPE_WEBHOOK_SECRET      (Stripe → Developers → Webhooks → signing secret)
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Project settings → API)
export const runtime = 'nodejs';

const SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const SB = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function verify(raw: string, header: string | null) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const expected = crypto.createHmac('sha256', SECRET).update(`${t}.${raw}`).digest('hex');
  const given = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  return given.some((g) => g.length === expected.length && crypto.timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
}

const rest = (path: string, init: RequestInit) =>
  fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const DAY = 86400000;

export async function POST(request: NextRequest) {
  if (!SECRET || !SERVICE || !SB) return NextResponse.json({ error: 'Payments are not set up' }, { status: 501 });
  const raw = await request.text();
  if (!verify(raw, request.headers.get('stripe-signature'))) return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }); }
  const o = event?.data?.object || {};

  // Monthly / yearly renewals: push the plan's end date forward.
  if (event?.type === 'invoice.paid' && o.subscription && o.billing_reason !== 'subscription_create') {
    const end = o.lines?.data?.[0]?.period?.end ? new Date(o.lines.data[0].period.end * 1000 + 2 * DAY).toISOString() : null;
    if (!end) return NextResponse.json({ ignored: 'no period' });
    const r = await rest(`purchases?subscription_ref=eq.${encodeURIComponent(o.subscription)}`, { method: 'PATCH', body: JSON.stringify({ expires_at: end }) });
    return NextResponse.json({ renewed: r.ok });
  }

  if (event?.type !== 'checkout.session.completed') return NextResponse.json({ ignored: event?.type || 'unknown' });
  if (o.payment_status && o.payment_status !== 'paid') return NextResponse.json({ ignored: 'not paid' });
  // "<product>_<userId>", or "single_<templateId>_<userId>" for one template.
  const ref = String(o.client_reference_id || '');
  const single = ref.match(/^single_([0-9a-f-]{36})_([0-9a-f-]{36})$/i);
  const plain = ref.match(/^(editor|templates|pack5|pack10|monthly|yearly)_([0-9a-f-]{36})$/i);
  if (!single && !plain) return NextResponse.json({ ignored: 'no reference' });
  const product = single ? 'single' : plain![1].toLowerCase();
  const months = product === 'monthly' ? 1 : product === 'yearly' ? 12 : 0;
  const expires = months ? new Date(Date.now() + months * 31 * DAY + 2 * DAY).toISOString() : null;
  const r = await rest('purchases?on_conflict=provider_ref', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      user_id: single ? single[2] : plain![2], product, template_id: single ? single[1] : null,
      amount_cents: o.amount_total ?? null, currency: o.currency ? String(o.currency).toUpperCase() : null,
      provider: 'stripe', provider_ref: o.id, subscription_ref: o.subscription || null, expires_at: expires,
    }),
  });
  if (!r.ok) return NextResponse.json({ error: `Could not record (${r.status})` }, { status: 500 });
  return NextResponse.json({ recorded: true });
}
