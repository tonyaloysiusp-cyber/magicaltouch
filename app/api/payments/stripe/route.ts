import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

// POST /api/payments/stripe — Stripe calls this when someone pays through a
// Payment Link (Admin → Pricing & payments). It checks Stripe's signature,
// reads which product and which person (client_reference_id =
// "<product>_<userId>", set by the Buy button) and records the purchase, so
// access unlocks automatically. Inactive until both are set in Vercel:
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

export async function POST(request: NextRequest) {
  if (!SECRET || !SERVICE || !SB) return NextResponse.json({ error: 'Payments are not set up' }, { status: 501 });
  const raw = await request.text();
  if (!verify(raw, request.headers.get('stripe-signature'))) return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }); }
  if (event?.type !== 'checkout.session.completed') return NextResponse.json({ ignored: event?.type || 'unknown' });
  const s = event.data?.object || {};
  if (s.payment_status && s.payment_status !== 'paid') return NextResponse.json({ ignored: 'not paid' });
  const m = String(s.client_reference_id || '').match(/^(editor|templates)_([0-9a-f-]{36})$/i);
  if (!m) return NextResponse.json({ ignored: 'no reference' });
  const r = await fetch(`${SB}/rest/v1/purchases?on_conflict=provider_ref`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ user_id: m[2], product: m[1].toLowerCase(), amount_cents: s.amount_total ?? null, currency: s.currency ? String(s.currency).toUpperCase() : null, provider: 'stripe', provider_ref: s.id }),
  });
  if (!r.ok) return NextResponse.json({ error: `Could not record (${r.status})` }, { status: 500 });
  return NextResponse.json({ recorded: true });
}
