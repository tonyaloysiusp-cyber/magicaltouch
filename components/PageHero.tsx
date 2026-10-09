'use client';

// The top of every main page, in the home page's style: a soft glow of the
// brand colours, the flowing brand ribbon, and a headline with one word in
// the brand gradient. Fills wide screens through .mt-container.

import { ReactNode } from 'react';
import { BrandRibbon } from './home/BrandRibbon';

export function PageHero({
  eyebrow,
  title,
  accent,
  subtitle,
  actions,
  children,
  align = 'left',
  compact = false,
}: {
  eyebrow?: ReactNode;
  title: string;
  accent?: string; // part of the title shown in the brand gradient
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  align?: 'left' | 'center';
  compact?: boolean;
}) {
  const i = accent ? title.indexOf(accent) : -1;
  const heading =
    i >= 0 ? (
      <>
        {title.slice(0, i)}
        <span className="mt-spectrum-text">{accent}</span>
        {title.slice(i + accent!.length)}
      </>
    ) : (
      title
    );
  const center = align === 'center';
  return (
    <section className="relative overflow-hidden border-b border-mt-border">
      <div aria-hidden className="pointer-events-none absolute -top-44 left-1/2 -translate-x-1/2 w-[1200px] max-w-[160vw] h-[440px] rounded-full opacity-[0.16] dark:opacity-[0.24] blur-3xl mt-spectrum" />
      {!center && (
        <BrandRibbon className="hidden lg:block pointer-events-none absolute max-w-none opacity-70 dark:opacity-80 right-[-4%] top-1/2 -translate-y-1/2 w-[48%] min-w-[620px] max-w-[1050px]" />
      )}
      <div className={`relative mt-container ${compact ? 'pt-8 pb-8 sm:pt-10 sm:pb-10' : 'pt-10 pb-10 sm:pt-14 sm:pb-12'} ${center ? 'text-center' : ''}`}>
        <div className={center ? 'mx-auto max-w-3xl' : 'max-w-3xl lg:max-w-[50%]'}>
          {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mt-muted">{eyebrow}</p>}
          <h1 className={`mt-2 font-semibold tracking-tight leading-[1.05] text-mt-ink ${compact ? 'text-[30px] sm:text-4xl 2xl:text-5xl' : 'text-[34px] sm:text-5xl 2xl:text-6xl'}`}>{heading}</h1>
          {subtitle && <p className={`mt-3 text-[15px] sm:text-lg text-mt-muted leading-relaxed ${center ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>{subtitle}</p>}
          {actions && <div className={`mt-6 flex flex-wrap items-center gap-2.5 ${center ? 'justify-center' : ''}`}>{actions}</div>}
        </div>
        {children && <div className="relative z-10 mt-7">{children}</div>}
      </div>
      {center && (
        <div aria-hidden className="relative h-6 sm:h-36 -mt-6 pointer-events-none overflow-hidden sm:overflow-visible">
          <BrandRibbon className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 w-[1700px] max-w-none opacity-80" />
        </div>
      )}
    </section>
  );
}
