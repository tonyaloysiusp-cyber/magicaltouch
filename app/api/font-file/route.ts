// ---------------------------------------------------------------------
// app/api/font-file/route.ts
// Resolves and proxies a single Google Font's real TTF file, so the PDF
// exporter (lib/editor/pdfExport.ts) can embed the actual glyphs a
// design uses instead of silently substituting one of jsPDF's three
// built-in fonts (helvetica/times/courier) for everything.
//
// Google's CSS2 API hands back woff2 to modern browsers, which jsPDF
// can't embed. Requesting it with an old desktop user agent is the
// standard, documented way to get a plain-TTF @font-face URL back
// instead — a trick that only works server-side, since browsers refuse
// to let page JS override the User-Agent header. Running it here (a
// Next.js route handler) keeps that server-only step out of the client
// bundle entirely.
// ---------------------------------------------------------------------

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const LEGACY_UA = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/534.34 (KHTML, like Gecko) FontForge';
const TTF_URL_RE = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.ttf)\)/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const family = searchParams.get('family');
  const weight = searchParams.get('weight') || '400';
  const italic = searchParams.get('italic') === '1';

  if (!family) {
    return new Response('Missing family', { status: 400 });
  }

  try {
    const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axis}&display=swap`;
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': LEGACY_UA } });
    if (!cssRes.ok) return new Response('Font not found', { status: 404 });

    const css = await cssRes.text();
    const match = css.match(TTF_URL_RE);
    if (!match) return new Response('Font file URL not found', { status: 404 });

    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return new Response('Font file fetch failed', { status: 502 });
    const buf = await fontRes.arrayBuffer();

    return new Response(buf, {
      headers: {
        'Content-Type': 'font/ttf',
        // The resolved gstatic URL is content-addressed/versioned, so the
        // bytes behind it never change — safe to cache indefinitely.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Font proxy error', { status: 500 });
  }
}
