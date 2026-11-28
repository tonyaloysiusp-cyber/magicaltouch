'use client';

// Home page: "Follow along" — the site's own promo reel and posts, as
// they appear on Instagram, LinkedIn and Pinterest, with links to the
// site's profiles (set in Admin → SEO → Social; the buttons only show for
// profiles that exist). The reel is loaded only when the section comes
// into view, so it costs nothing on first load.

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BRAND_POSTS } from '@/lib/brandPosts';
import Link from 'next/link';
import { Reveal } from './Reveal';
import { supabase } from '@/lib/supabase';
import { NETWORKS, parseSocial, SocialLinks } from '@/lib/social';

export function SocialShowcase() {
  const [social, setSocial] = useState<SocialLinks>({});
  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'social_links').maybeSingle().then(({ data }) => setSocial(parseSocial((data as any)?.value)));
  }, []);

  const follow = NETWORKS.filter((n) => social[n.id]);

  return (
    <section className="border-t border-mt-border overflow-hidden">
      <div className="mt-container py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] items-center">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-mt-muted">Follow along</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em]">
              Made with <span className="mt-spectrum-text">Magical Touch.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] sm:text-base text-mt-muted leading-relaxed">
              Our own posts are designed here, from the same free templates and tools you get. New designs, tips and festival templates every week.
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {BRAND_POSTS.slice(0, 4).map((p) => (
              <figure key={p.id} className="overflow-hidden rounded-xl border border-mt-border shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/posts/${p.id}.webp`} alt={p.title} width={540} height={540} loading="lazy" className="block aspect-square w-full" />
              </figure>
            ))}
            {BRAND_POSTS.slice(4).map((p) => (
              <figure key={p.id} className="hidden overflow-hidden rounded-xl border border-mt-border shadow-sm sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/posts/${p.id}.webp`} alt={p.title} width={540} height={540} loading="lazy" className="block aspect-square w-full" />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
