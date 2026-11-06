// Serves the home page film with byte-range support. iPhone / iPad Safari
// only play MP4 video when the server answers Range requests with 206
// Partial Content; Cloudflare's static file serving answers them with the
// whole file, so the film goes through here.

import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = /^\/home\/ad\/[\w.-]+\.(mp4|webm)$/;

async function load(req: NextRequest, path: string): Promise<ArrayBuffer | null> {
  try {
    const { env } = getCloudflareContext();
    const assets = (env as any).ASSETS;
    if (assets?.fetch) {
      const r = await assets.fetch(new URL(path, req.url));
      if (r.ok) return await r.arrayBuffer();
    }
  } catch {
    // not on Cloudflare (local / test builds): fall through
  }
  const r = await fetch(new URL(path, req.url));
  return r.ok ? await r.arrayBuffer() : null;
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = '/' + (params.path || []).join('/');
  if (!ALLOWED.test(path)) return new Response('Not found', { status: 404 });
  const buf = await load(req, path);
  if (!buf) return new Response('Not found', { status: 404 });
  const size = buf.byteLength;
  const type = path.endsWith('.webm') ? 'video/webm' : 'video/mp4';
  const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (!m) return new Response(buf, { status: 200, headers: { ...base, 'Content-Length': String(size) } });
  let start = m[1] ? parseInt(m[1], 10) : size - parseInt(m[2] || '0', 10);
  let end = m[1] && m[2] ? parseInt(m[2], 10) : size - 1;
  if (!m[1]) end = size - 1;
  start = Math.max(0, start);
  end = Math.min(size - 1, end);
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${size}` } });
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
}

export async function HEAD(req: NextRequest, ctx: { params: { path: string[] } }) {
  const r = await GET(req, ctx);
  return new Response(null, { status: r.status, headers: r.headers });
}
