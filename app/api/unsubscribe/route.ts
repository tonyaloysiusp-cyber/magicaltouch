import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// One-click unsubscribe (RFC 8058): mail apps POST here directly from
// the "Unsubscribe" button they show next to the sender. No login; the
// random per-person token in the link is what authorises it.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('t');
  const campaign = url.searchParams.get('c');
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await supabase.rpc('unsubscribe_marketing', {
    p_token: token,
    p_reason: 'One-click unsubscribe from mail app',
    p_campaign: campaign && /^[0-9a-f-]{36}$/i.test(campaign) ? campaign : null,
  });
  return NextResponse.json({ ok: !error });
}
