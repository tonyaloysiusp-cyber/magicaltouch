'use client';

// A brand-recolourable social post: background, text and button take the
// brand colours; the photo keeps its natural colours.

export type BrandColours = { bg: string; accent: string; ink: string };

export function BrandPost({ c, className = '' }: { c: BrandColours; className?: string }) {
  const t = 'transition-colors duration-700';
  return (
    <div className={`relative aspect-square overflow-hidden rounded-xl shadow-xl ${className}`} style={{ containerType: 'inline-size' }}>
      {/* photo side: the template's own photo, never recoloured */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/templates/collection/pro-northline-consulting-free-consultation-post.webp" alt="" className="absolute inset-y-0 right-0 h-full w-[42%] object-cover object-right" />
      <div className={`absolute inset-y-0 left-0 w-[58%] ${t}`} style={{ background: c.bg }} />
      <div className={`absolute inset-y-0 left-[58%] w-[0.8%] ${t}`} style={{ background: c.accent }} />
      <div className="absolute inset-y-0 left-0 w-[58%] flex flex-col p-[7cqw]">
        <p className={`flex items-center gap-[1.5cqw] font-bold tracking-[0.25em] text-[2.4cqw] ${t}`} style={{ color: c.ink }}>
          <span className={`inline-block h-0 w-0 border-x-[1.4cqw] border-b-[2.4cqw] border-x-transparent ${t}`} style={{ borderBottomColor: c.accent }} />
          NORTHLINE
        </p>
        <p className={`mt-auto font-bold tracking-[0.2em] text-[2cqw] ${t}`} style={{ color: c.accent }}>FREE CONSULTATION</p>
        <p className={`mt-[2cqw] font-bold leading-[1.1] text-[6.6cqw] ${t}`} style={{ color: c.ink }}>Ready to grow with a clear plan?</p>
        <p className={`mt-[2.5cqw] text-[2.3cqw] leading-snug opacity-80 ${t}`} style={{ color: c.ink }}>Book a 30-minute strategy call with our senior advisors.</p>
        <span className={`mt-[4cqw] self-start rounded-full px-[3.5cqw] py-[1.6cqw] text-[2cqw] font-bold tracking-[0.12em] ${t}`} style={{ background: c.accent, color: c.bg }}>BOOK A CALL</span>
        <p className={`mt-auto text-[2cqw] opacity-70 ${t}`} style={{ color: c.ink }}>northline.ae</p>
      </div>
    </div>
  );
}

export const BRAND_SETS: { name: string; c: BrandColours }[] = [
  { name: 'Navy & gold', c: { bg: '#14233B', accent: '#E3A72F', ink: '#FFFFFF' } },
  { name: 'Emerald', c: { bg: '#0F3B33', accent: '#4FC08D', ink: '#FFFFFF' } },
  { name: 'Plum', c: { bg: '#2B1640', accent: '#C17BE0', ink: '#FFFFFF' } },
  { name: 'Terracotta', c: { bg: '#F6EBDD', accent: '#C2572E', ink: '#3B1E14' } },
  { name: 'Graphite', c: { bg: '#1F1F1F', accent: '#D9D9D9', ink: '#FFFFFF' } },
];
