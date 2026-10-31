'use client';

// Admin → SEO → Social → "Promo video": an animated brand video with text
// you can change. Pick the format (Reel / Story 9:16 or Square 1:1), the
// light or dark brand theme, write the lines, pick up to 5 templates — the
// preview plays live, and "Record video" saves a 10-second video to post on
// Instagram Reels, YouTube Shorts, WhatsApp status, Facebook or LinkedIn.
// Always in the Magical Touch brand: Poppins, logo, the logo's spectrum.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Play, Search, Video, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTemplateCountLabel } from '@/lib/templateCount';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const DURATION = 10;
const SPECTRUM = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B'];
const SPEC_TEXT = ['#EC5F84', '#8E7FD0', '#1FAEE6', '#33B79C', '#6DB33A'];
interface T { slug: string; name: string; preview: string | null; thumbnail: string | null }

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const prog = (t: number, a: number, b: number) => ease((t - a) / (b - a));

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

export function PromoVideoMaker() {
  const count = useTemplateCountLabel();
  const [fmt, setFmt] = useState<'reel' | 'square'>('reel');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [l1, setL1] = useState('Design anything.');
  const [l2, setL2] = useState('Free. Forever.');
  const [sub, setSub] = useState('{count} templates · edit online · no watermark');
  const [ctaText, setCta] = useState('Start free →');
  const [site, setSite] = useState('magicaltouchdesign.com');
  const [picked, setPicked] = useState<T[]>([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<T[]>([]);
  const [rec, setRec] = useState<{ url: string; ext: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const imgs = useRef<{ logo: HTMLImageElement | null; logoW: HTMLImageElement | null; cards: HTMLImageElement[] }>({ logo: null, logoW: null, cards: [] });
  const t0 = useRef(performance.now());

  const W = 1080, H = fmt === 'reel' ? 1920 : 1080;

  useEffect(() => {
    supabase.from('templates').select('slug,name,preview,thumbnail').eq('status', 'published').eq('is_featured', true).eq('width', 1080).eq('height', 1350).order('sort_order').limit(5)
      .then(({ data }) => setPicked((data as T[]) || []));
    Promise.all([loadImg('/logo.png'), loadImg('/logo-white.png')]).then(([a, b]) => { imgs.current.logo = a; imgs.current.logoW = b; });
  }, []);
  useEffect(() => {
    Promise.all(picked.map((p) => loadImg(p.preview || p.thumbnail || ''))).then((list) => { imgs.current.cards = list.filter(Boolean) as HTMLImageElement[]; });
  }, [picked]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setFound([]);
    const h = setTimeout(async () => {
      const { data } = await supabase.from('templates').select('slug,name,preview,thumbnail').eq('status', 'published').ilike('name', `%${term}%`).limit(12);
      setFound((data as T[]) || []);
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  const font = useMemo(() => (typeof window !== 'undefined' ? getComputedStyle(document.body).fontFamily : 'Poppins, sans-serif'), []);
  const text = useMemo(() => ({ l1, l2, sub: sub.replace(/\{count\}/g, count), ctaText, site }), [l1, l2, sub, count, ctaText, site]);

  // draw one frame at time t (seconds)
  const draw = (ctx: CanvasRenderingContext2D, t: number) => {
    const dark = theme === 'dark';
    const ink = dark ? '#FFFFFF' : '#09090B';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = dark ? '#09090B' : '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    const wash = (x: number, y: number, r: number, c: string) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    const drift = Math.sin(t * 0.6) * 40;
    if (dark) {
      wash(W + drift, H * 0.55, H * 0.6, 'rgba(31,174,230,0.32)');
      wash(-drift, H, H * 0.6, 'rgba(124,58,237,0.4)');
      const g = ctx.createLinearGradient(0, 0, W, 0); SPECTRUM.forEach((c, i) => g.addColorStop(i / (SPECTRUM.length - 1), c));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 12);
    } else {
      wash(drift, 0, H * 0.7, 'rgba(243,166,184,0.55)');
      wash(W, -drift, H * 0.6, 'rgba(140,203,255,0.55)');
      wash(W / 2, H * 1.05, H * 0.6, 'rgba(191,232,200,0.6)');
    }
    const m = 90;
    const top = fmt === 'reel' ? 170 : 90;
    // logo
    const lg = dark ? imgs.current.logoW : imgs.current.logo;
    ctx.globalAlpha = prog(t, 0, 0.6);
    if (lg) ctx.drawImage(lg, m, top, 400, 400 * lg.height / lg.width);
    ctx.globalAlpha = 1;
    // headline
    const hs = fmt === 'reel' ? 108 : 96;
    ctx.textBaseline = 'top';
    ctx.font = `700 ${hs}px ${font}`;
    const y1 = top + 110;
    const a1 = prog(t, 0.3, 1.0), a2 = prog(t, 0.6, 1.3);
    ctx.globalAlpha = a1; ctx.fillStyle = ink; ctx.fillText(text.l1, m, y1 + (1 - a1) * 60, W - 2 * m);
    ctx.globalAlpha = a2;
    const tw = Math.min(W - 2 * m, ctx.measureText(text.l2).width);
    const gt = ctx.createLinearGradient(m, 0, m + tw, 0); SPEC_TEXT.forEach((c, i) => gt.addColorStop(i / (SPEC_TEXT.length - 1), c));
    ctx.fillStyle = gt; ctx.fillText(text.l2, m, y1 + hs * 1.08 + (1 - a2) * 60, W - 2 * m);
    // sub
    const a3 = prog(t, 1.2, 1.8);
    ctx.globalAlpha = a3; ctx.font = `400 ${fmt === 'reel' ? 42 : 36}px ${font}`; ctx.fillStyle = dark ? 'rgba(255,255,255,0.82)' : '#52525B';
    ctx.fillText(text.sub, m, y1 + hs * 2.35, W - 2 * m);
    ctx.globalAlpha = 1;
    // cards
    const cards = imgs.current.cards;
    const n = cards.length;
    const cw = fmt === 'reel' ? 330 : 260, ch = cw * 1.25;
    const cy = fmt === 'reel' ? H * 0.62 : H * 0.66;
    const spread = fmt === 'reel' ? 190 : 175;
    cards.forEach((im, i) => {
      const k = i - (n - 1) / 2;
      const a = prog(t, 2 + i * 0.45, 2.9 + i * 0.45);
      if (a <= 0) return;
      const x = W / 2 + k * spread;
      const y = cy + Math.abs(k) * 20 + (1 - a) * H * 0.5 + Math.sin(t * 1.4 + i) * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((k * 8) * Math.PI) / 180);
      ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); (ctx as any).roundRect ? (ctx as any).roundRect(-cw / 2 - 9, -ch / 2 - 9, cw + 18, ch + 18, 20) : ctx.rect(-cw / 2 - 9, -ch / 2 - 9, cw + 18, ch + 18); ctx.fill();
      ctx.shadowColor = 'transparent';
      const s = Math.max(cw / im.width, ch / im.height);
      const sw = cw / s, sh = ch / s;
      ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, -cw / 2, -ch / 2, cw, ch);
      ctx.restore();
    });
    // CTA + website
    const a4 = prog(t, 6.6, 7.3);
    if (a4 > 0) {
      ctx.globalAlpha = a4;
      ctx.font = `600 ${fmt === 'reel' ? 46 : 40}px ${font}`;
      const bw = ctx.measureText(text.ctaText).width + 100, bh = fmt === 'reel' ? 110 : 96;
      const by = H - (fmt === 'reel' ? 260 : 150) + (1 - a4) * 40;
      ctx.fillStyle = dark ? '#FFFFFF' : '#09090B';
      ctx.beginPath(); (ctx as any).roundRect ? (ctx as any).roundRect((W - bw) / 2, by, bw, bh, bh / 2) : ctx.rect((W - bw) / 2, by, bw, bh); ctx.fill();
      ctx.fillStyle = dark ? '#09090B' : '#FFFFFF'; ctx.textAlign = 'center';
      ctx.fillText(text.ctaText, W / 2, by + bh / 2 - (fmt === 'reel' ? 26 : 22));
      ctx.font = `600 ${fmt === 'reel' ? 36 : 30}px ${font}`; ctx.fillStyle = dark ? 'rgba(255,255,255,0.85)' : '#09090B';
      ctx.fillText(text.site, W / 2, by + bh + 30);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  };

  // live preview loop
  useEffect(() => {
    let raf = 0;
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const tick = () => {
      if (!recording) draw(ctx, ((performance.now() - t0.current) / 1000) % (DURATION + 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const record = async () => {
    const c = canvas.current;
    if (!c || typeof MediaRecorder === 'undefined') return alert('This browser can’t record video. Try Chrome or Safari on a computer.');
    setRec(null); setRecording(true);
    const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    const mime = types.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const stream = c.captureStream(30);
    const r = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((res) => (r.onstop = () => res()));
    const ctx = c.getContext('2d')!;
    const start = performance.now();
    r.start();
    await new Promise<void>((res) => {
      const step = () => {
        const t = (performance.now() - start) / 1000;
        draw(ctx, Math.min(t, DURATION));
        if (t < DURATION) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    r.stop();
    await done;
    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    setRec({ url: URL.createObjectURL(blob), ext: (mime || 'video/webm').includes('mp4') ? 'mp4' : 'webm' });
    setRecording(false);
    t0.current = performance.now();
  };

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold inline-flex items-center gap-2"><Video size={18} /> Promo video — change any text</h2>
      <p className="mt-1 text-[13px] text-mt-muted">An animated video in your brand. Edit the words, pick templates and the theme — the preview plays live. <b>Record video</b> saves a 10-second video for Reels, Shorts, WhatsApp status, Facebook or LinkedIn. <b>{'{count}'}</b> = live template count.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-2 content-start">
          <div className="flex flex-wrap gap-2">
            {([['reel', 'Reel / Story 9:16'], ['square', 'Square 1:1']] as const).map(([id, l]) => <button key={id} onClick={() => setFmt(id)} className={`h-8 px-3 rounded-full text-[12px] border ${fmt === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>)}
            {(['dark', 'light'] as const).map((th) => <button key={th} onClick={() => setTheme(th)} className={`h-8 px-3 rounded-full text-[12px] border ${theme === th ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{th === 'dark' ? 'Dark brand' : 'Light brand'}</button>)}
          </div>
          <label className="text-[12px] text-mt-muted">Line 1<input className={field} value={l1} onChange={(e) => setL1(e.target.value)} /></label>
          <label className="text-[12px] text-mt-muted">Line 2 (rainbow)<input className={field} value={l2} onChange={(e) => setL2(e.target.value)} /></label>
          <label className="text-[12px] text-mt-muted">Small text<input className={field} value={sub} onChange={(e) => setSub(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-mt-muted">Button<input className={field} value={ctaText} onChange={(e) => setCta(e.target.value)} /></label>
            <label className="text-[12px] text-mt-muted">Website<input className={field} value={site} onChange={(e) => setSite(e.target.value)} /></label>
          </div>
          <p className="mt-1 text-[12px] text-mt-muted">Templates in the video ({picked.length}/5)</p>
          <div className="flex flex-wrap gap-2">
            {picked.map((p) => (
              <span key={p.slug} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbnail || p.preview || ''} alt={p.name} className="h-16 w-14 rounded-lg object-cover border border-mt-border" />
                <button onClick={() => setPicked(picked.filter((x) => x.slug !== p.slug))} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-mt-ink text-mt-bg grid place-items-center" aria-label={`Remove ${p.name}`}><X size={11} /></button>
              </span>
            ))}
          </div>
          <label className="relative"><Search size={14} className="absolute left-3 top-3 text-mt-faint" /><input className={`${field} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a template (e.g. wedding)" /></label>
          {found.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {found.map((f) => (
                <button key={f.slug} disabled={picked.length >= 5 || picked.some((p) => p.slug === f.slug)} onClick={() => setPicked([...picked, f])} title={f.name} className="disabled:opacity-30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.thumbnail || f.preview || ''} alt={f.name} className="h-16 w-14 rounded-lg object-cover border border-mt-border hover:border-mt-ink" />
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => (t0.current = performance.now())} disabled={recording} className={`${btn} border border-mt-border`}><Play size={14} /> Replay</button>
            <button onClick={record} disabled={recording} className={`${btn} bg-mt-primary text-mt-onprimary`}>{recording ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />} {recording ? 'Recording… 10 s' : 'Record video'}</button>
            {rec && <a href={rec.url} download={`magical-touch-promo-${fmt}.${rec.ext}`} className={`${btn} bg-emerald-600 text-white`}><Download size={14} /> Download video</a>}
          </div>
          {rec?.ext === 'webm' && <p className="text-[11px] text-mt-faint">Saved as WebM. Instagram and WhatsApp accept it from a computer; on iPhone/iPad Safari records MP4 directly.</p>}
        </div>
        <div>
          <canvas ref={canvas} width={W} height={H} className="w-full rounded-2xl border border-mt-border bg-black" style={{ aspectRatio: `${W} / ${H}` }} />
        </div>
      </div>
    </section>
  );
}
