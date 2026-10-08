'use client';

import { Unbounded, Inter } from 'next/font/google';
import { useAppTheme } from '@/hooks/useAppTheme';
import { IntroAnimation } from './IntroAnimation';
import { Navbar } from './Navbar';
import { WorkspaceHero } from './WorkspaceHero';
import { StudioTools } from './StudioTools';
import { TemplateShowcase } from './TemplateShowcase';
import { HowItWorks } from './HowItWorks';
import { PricingFree } from './PricingFree';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';

// Unbounded's wide, rounded geometry echoes the Magical Touch wordmark.
const display = Unbounded({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

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
      <main
        className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-mt-bg text-mt-ink transition-colors duration-300`}
      >
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
        <WorkspaceHero />
        <TemplateShowcase />
        <StudioTools />
        <HowItWorks />
        <PricingFree />
        <FinalCTA />
        <Footer theme={theme} />
      </main>
    </div>
  );
}
