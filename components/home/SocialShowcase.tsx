'use client';

// Home page: "Follow along" — the site's own promo reel and posts, as
// they appear on Instagram, LinkedIn and Pinterest, with links to the
// site's profiles (set in Admin → SEO → Social; the buttons only show for
// profiles that exist). The reel is loaded only when the section comes
// into view, so it costs nothing on first load.

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';
import { supabase } from '@/lib/supabase';
import { NETWORKS, parseSocial, SocialLinks } from '@/lib/social';

const POSTS: { src: string; alt: string; w: number; h: number; tag: string }[] = [
  { src: '/home/promo/promo-instagram-post.webp', alt: 'Design anything. Free. Forever. — Instagram post', w: 720, h: 900, tag: 'Instagram' },
  { src: '/home/promo/promo-ai-studio.webp', alt: 'Paste any design. Edit it in a minute. — AI Template Studio post', w: 720, h: 900, tag: 'New feature' },
  { src: '/home/promo/promo-linkedin.webp', alt: 'Professional design. Zero cost. — LinkedIn post', w: 720, h: 376, tag: 'LinkedIn' },
  { src: '/home/promo/promo-square.webp', alt: 'Every design tool. Every feature free. — square post', w: 720, h: 720, tag: 'Facebook' },
  { src: '/home/promo/promo-pinterest.webp', alt: 'Free design templates — Pinterest pin', w: 720, h: 1080, tag: 'Pinterest' },
];

export function SocialShowcase() {
  const [social, setSocial] = useState<SocialLinks>({});
  const [play, setPlay] = useState(false);
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle().then(({ data }) => setSocial(parseSocial((data as any)?.value)));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !box.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPlay(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(box.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => { if (play) vid.current?.play().catch(() => {}); }, [play]);

  const follow = NETWORKS.filter((n) => social[n.id]);

  return (
    <section className="border-t border-mt-border overflow-hidden">
      <div ref={box} className="mt-container py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] items-center">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mt-muted">Follow along</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em]">
              Made with <span className="mt-spectrum-text">Magical Touch.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] sm:text-base text-mt-muted leading-relaxed">
              Our own reels and posts are designed here, from the same free templates and tools you get. New designs, tips and festival templates every week.
            </p>
            {follow.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {follow.map((n) => (
                  <li key={n.id}><a href={social[n.id]} target="_blank" rel="noopener me" className="inline-flex h-10 items-center gap-2 rounded-full border border-mt-border px-4 text-[14px] font-medium hover:bg-mt-surface2"><span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: n.color }} />{n.name}</a></li>
                ))}
              </ul>
            ) : null}
            <Link href="/templates" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-mt-primary px-5 text-[14px] font-semibold text-mt-onprimary">Make yours free <ArrowRight size={16} /></Link>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] gap-5 sm:gap-4 items-start">
            {/* the reel, in a phone */}
            <div className="relative w-[72%] mx-auto sm:w-auto rounded-[28px] bg-[#09090B] p-1.5 sm:p-2 shadow-[0_40px_80px_-40px_rgba(9,9,11,0.55)] ring-1 ring-white/10">
              <div className="relative overflow-hidden rounded-[22px] aspect-[9/16] bg-black">
                {/* the cover stays underneath, so there is always a picture */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/home/promo/reel-cover.webp" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                {play ? (
                  <video ref={vid} src="/promo/promo-reel-9x16.mp4" poster="/home/promo/reel-cover.webp" muted loop playsInline autoPlay preload="auto" onPlaying={() => setPlaying(true)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`} aria-label="Magical Touch Design promo reel" />
                ) : (
                  <button onClick={() => setPlay(true)} className="absolute inset-0 group" aria-label="Play the promo reel">
                    <span className="absolute inset-0 grid place-items-center"><span className="h-14 w-14 rounded-full bg-white/90 text-black grid place-items-center shadow-lg group-hover:scale-105 transition-transform"><Play size={22} className="ml-0.5" /></span></span>
                  </button>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Reel</span>
              </div>
            </div>
            {/* the posts */}
            <div className="columns-2 gap-3 sm:gap-4 [&>figure]:mb-3 sm:[&>figure]:mb-4">
              {POSTS.map((p) => (
                <figure key={p.src} className="relative break-inside-avoid overflow-hidden rounded-xl border border-mt-border shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" className="block w-full h-auto" />
                  <figcaption className="absolute left-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">{p.tag}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
