// ---------------------------------------------------------------------
// app/api/translate/route.ts
// Translates the words of a design. POST { texts: string[], target,
// keep?: string[] } → { texts: string[], failed: number[] } in the same
// order. Line breaks are kept. Addresses, numbers, @handles and the
// "keep" words are never sent for translation. A text that can't be
// translated comes back unchanged (and is listed in `failed`), so one
// problem never stops the rest. Free services, no key needed: Google's
// public endpoints first, then MyMemory.
// ---------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { splitProtected } from '@/lib/i18n/protect';

export const runtime = 'nodejs';

const MAX_TEXTS = 60;
const MAX_CHARS = 4500;
const HAS_LETTER = /\p{L}/u;

async function timed(url: string, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' }, cache: 'no-store', signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function googleGtx(text: string, target: string): Promise<string> {
  const res = await timed(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`);
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.[0])) throw new Error('gtx: bad response');
  return data[0].map((seg: any) => (Array.isArray(seg) ? seg[0] || '' : '')).join('');
}

async function googleDict(text: string, target: string): Promise<string> {
  const res = await timed(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`);
  if (!res.ok) throw new Error(`dict ${res.status}`);
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : data?.sentences?.map((s: any) => s.trans).join('');
  const out = Array.isArray(first) ? first[0] : first;
  if (typeof out !== 'string' || !out) throw new Error('dict: bad response');
  return out;
}

async function myMemory(text: string, target: string): Promise<string> {
  const t = target.split('-')[0];
  const res = await timed(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${encodeURIComponent(t)}&de=hello@magicaltouchdesign.com`);
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (typeof out !== 'string' || data?.quotaFinished || /MYMEMORY WARNING|INVALID/i.test(out)) throw new Error('mymemory: no result');
  return out;
}

async function translateCore(core: string, target: string): Promise<string> {
  const services = [googleGtx, googleDict, myMemory];
  let lastErr: unknown;
  for (const s of services) {
    try {
      return await s(core, target);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// One piece of plain language (between kept parts), whitespace preserved.
async function translatePiece(text: string, target: string): Promise<string> {
  if (!text.trim() || !HAS_LETTER.test(text)) return text;
  const lead = text.match(/^\s*/)![0], trail = text.match(/\s*$/)![0];
  const out = await translateCore(text.trim(), target);
  return lead + out.replace(/ *\n */g, '\n') + trail;
}

async function translateOne(text: string, target: string, keep: string[]): Promise<string> {
  if (!text.trim() || !HAS_LETTER.test(text)) return text;
  const pieces = splitProtected(text, keep);
  const parts = await Promise.all(pieces.map((p) => (p.keep ? p.text : translatePiece(p.text, target))));
  return parts.join('');
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
  const keep: string[] = Array.isArray(body?.keep) ? body.keep.filter((w: unknown) => typeof w === 'string').slice(0, 50) : [];
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(target) || !Array.isArray(texts) || texts.length > MAX_TEXTS || texts.some((t) => typeof t !== 'string' || t.length > MAX_CHARS)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const out: string[] = new Array(texts.length);
  const failed: number[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < texts.length) {
        const i = next++;
        const src = texts[i] as string;
        try {
          out[i] = await translateOne(src, target, keep);
        } catch (e) {
          console.error('translate failed for one text', e);
          out[i] = src;
          failed.push(i);
        }
      }
    })
  );
  if (failed.length === texts.length && texts.some((t) => HAS_LETTER.test(t as string))) {
    return NextResponse.json({ error: 'Translation is not available right now. Please try again in a minute.', texts: out, failed }, { status: 502 });
  }
  return NextResponse.json({ texts: out, failed });
}
