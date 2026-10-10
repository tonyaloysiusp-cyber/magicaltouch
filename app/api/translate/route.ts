// ---------------------------------------------------------------------
// app/api/translate/route.ts
// Translates the words of a design. POST { texts: string[], target }
// → { texts: string[] } in the same order. Line breaks are kept, so a
// two-line heading stays two lines. Uses Google Translate's public web
// endpoint, with MyMemory as a fallback; no key needed.
// ---------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_TEXTS = 60;
const MAX_CHARS = 4500;
const HAS_LETTER = new RegExp('\\p{L}', 'u');

async function google(text: string, target: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.[0])) throw new Error('google: bad response');
  return data[0].map((seg: any) => (Array.isArray(seg) ? seg[0] || '' : '')).join('');
}

async function myMemory(text: string, target: string): Promise<string> {
  const t = target.split('-')[0];
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=Autodetect|${encodeURIComponent(t)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (typeof out !== 'string') throw new Error('mymemory: bad response');
  return out;
}

// Whole text at once (line breaks are kept by the service), so a heading
// split over two lines is still translated as one phrase.
async function translateOne(text: string, target: string): Promise<string> {
  if (!text.trim() || !HAS_LETTER.test(text)) return text; // blank, numbers, symbols
  const lead = text.match(/^\s*/)![0], trail = text.match(/\s*$/)![0];
  const core = text.trim();
  let out: string;
  try {
    out = await google(core, target);
  } catch {
    out = await myMemory(core, target);
  }
  return lead + out.replace(/ *\n */g, '\n') + trail;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const target = String(body?.target || '').trim();
  const texts: unknown = body?.texts;
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(target) || !Array.isArray(texts) || texts.length > MAX_TEXTS || texts.some((t) => typeof t !== 'string' || t.length > MAX_CHARS)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  try {
    // A few at a time, to stay friendly with the translation service.
    const out: string[] = new Array(texts.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < texts.length) {
          const i = next++;
          out[i] = await translateOne(texts[i] as string, target);
        }
      })
    );
    return NextResponse.json({ texts: out });
  } catch (e) {
    console.error('translate failed', e);
    return NextResponse.json({ error: 'Translation is not available right now. Please try again in a minute.' }, { status: 502 });
  }
}
