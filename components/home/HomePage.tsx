'use client';

import { unboundedDisplay as display, interBody as body } from '@/lib/fonts';
import { useAppTheme } from '@/hooks/useAppTheme';
import { IntroAnimation } from './IntroAnimation';
import { Navbar } from './Navbar';
import { WorkspaceHero } from './WorkspaceHero';
import dynamic from 'next/dynamic';
// Below-the-fold sections are separate chunks: still rendered on the server
// (same HTML for visitors and search), but their JavaScript loads and
// hydrates in smaller pieces after the hero, so the page responds sooner.
const StudioTools = dynamic(() => import('./StudioTools').then((m) => m.StudioTools));
const TemplateShowcase = dynamic(() => import('./TemplateShowcase').then((m) => m.TemplateShowcase));
const StudioTour = dynamic(() => import('./StudioTour').then((m) => m.StudioTour));
const SocialShowcase = dynamic(() => import('./SocialShowcase').then((m) => m.SocialShowcase));
const HowItWorks = dynamic(() => import('./HowItWorks').then((m) => m.HowItWorks));
const PricingFree = dynamic(() => import('./PricingFree').then((m) => m.PricingFree));
const FinalCTA = dynamic(() => import('./FinalCTA').then((m) => m.FinalCTA));
const Footer = dynamic(() => import('./Footer').then((m) => m.Footer));
const FestivalWish = dynamic(() => import('@/components/festival/FestivalWish').then((m) => m.FestivalWish), { ssr: false });

// Unbounded's wide, rounded geometry echoes the Magical Touch wordmark.


export function HomePage() {
  const { theme, toggleTheme } = useAppTheme();

  // Tailwind's class-strategy `dark:` utilities compile to a descendant
  // selector (`.dark .dark\:bg-x`), which never matches an element that
  // carries `dark` and `dark:*` classes itself — so the toggled `dark`
  // class needs a wrapper of its own, one level above every element
  // (including <main>) that actually uses a `dark:` variant.
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <IntroAnimation theme={theme} />
      <FestivalWish />
      <main
        className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-mt-bg text-mt-ink transition-colors duration-300`}
      >
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
        <WorkspaceHero />
        <TemplateShowcase />
        <StudioTour />
        <StudioTools />
        <HowItWorks />
        <PricingFree />
        <SocialShowcase />
        <FinalCTA />
        <Footer theme={theme} />
      </main>
    </div>
  );
}
