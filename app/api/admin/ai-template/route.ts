import { NextRequest, NextResponse } from 'next/server';
import { ApiAuthError } from '@/lib/api/auth';
import { requireAdmin } from '@/lib/api/admin';

// One-click AI template (Admin → Templates → AI Studio).
// Uses Google's free Gemini API tier when GEMINI_API_KEY is set in Vercel
// (free key: aistudio.google.com → Get API key). Sends the instructions and,
// if given, the reference image; returns the AI's reply, which the studio
// turns into an editable template exactly like a pasted reply.
// Without a key, GET says so and the studio uses the free chat apps instead.
export const runtime = 'nodejs';
export const maxDuration = 60;

const KEY = process.env.GEMINI_API_KEY || '';
// Model names change over time; try the configured one, then current free ones.
const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'].filter(Boolean) as string[];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json({ auto: !!KEY, provider: KEY ? 'Gemini (free tier)' : null });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    if (!KEY) return NextResponse.json({ error: 'One-click AI isn’t set up. Add a free GEMINI_API_KEY in Vercel → Settings → Environment variables, or use a free chat app below.' }, { status: 501 });
    const body = await request.json().catch(() => ({}));
    const prompt = String(body?.prompt || '').slice(0, 20000);
    const image = typeof body?.image === 'string' ? body.image : '';
    if (!prompt) return NextResponse.json({ error: 'No instructions' }, { status: 400 });
    const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (image && !m) return NextResponse.json({ error: 'Unsupported image' }, { status: 400 });
    if (m && m[2].length > 6_000_000) return NextResponse.json({ error: 'Image too large — use one under 4 MB.' }, { status: 413 });

    const parts: any[] = [{ text: prompt }];
    if (m) parts.unshift({ inlineData: { mimeType: m[1], data: m[2] } });
    let lastErr = '';
    for (const model of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.6, responseMimeType: 'application/json' } }),
      }).catch((e) => { lastErr = String(e?.message || e); return null; });
      if (!r) continue;
      if (r.status === 404 || r.status === 400) { lastErr = `${model}: ${r.status}`; continue; } // model not available — try the next
      if (r.status === 429) return NextResponse.json({ error: 'The free Gemini limit for now is used up. Try again in a minute, or use a free chat app below.' }, { status: 429 });
      const j = await r.json().catch(() => null);
      if (!r.ok) { lastErr = j?.error?.message || `status ${r.status}`; continue; }
      const text = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
      if (text) return NextResponse.json({ reply: text, model });
      lastErr = j?.promptFeedback?.blockReason ? `blocked (${j.promptFeedback.blockReason})` : 'empty reply';
    }
    return NextResponse.json({ error: `Gemini didn’t return a design (${lastErr}). Try again or use a free chat app below.` }, { status: 502 });
  } catch (err) {
    if (err instanceof ApiAuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Could not reach the AI' }, { status: 500 });
  }
}
