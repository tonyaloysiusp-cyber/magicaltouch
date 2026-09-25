'use client';

import { Fraunces, Inter } from 'next/font/google';
import { useHomeTheme } from '@/hooks/useHomeTheme';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { CreativeShowcase } from './CreativeShowcase';
import { CategoryStrip } from './CategoryStrip';
import { Intro } from './Intro';
import { Features } from './Features';
import { DesignGallery } from './DesignGallery';
import { TemplateShowcase } from './TemplateShowcase';
import { HowItWorks } from './HowItWorks';
import { CreatorSection } from './CreatorSection';
import { BusinessSection } from './BusinessSection';
import { Testimonials } from './Testimonials';
import { PricingFree } from './PricingFree';
import { FinalCTA } from './FinalCTA';
import { Footer } from './Footer';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export function HomePage() {
  const { theme, toggleTheme } = useHomeTheme();

  // Tailwind's class-strategy `dark:` utilities compile to a descendant
  // selector (`.dark .dark\:bg-x`), which never matches an element that
  // carries `dark` and `dark:*` classes itself — so the toggled `dark`
  // class needs a wrapper of its own, one level above every element
  // (including <main>) that actually uses a `dark:` variant.
  return (
    <div className={theme === 'night' ? 'dark' : ''}>
      <main
        className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-[#F7F5F0] dark:bg-[#111015] text-[#17161B] dark:text-[#F3F1F7] transition-colors duration-300`}
      >
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
        <Hero />
        <CreativeShowcase theme={theme} />
        <CategoryStrip />
        <Intro />
        <Features />
        <DesignGallery />
        <TemplateShowcase />
        <HowItWorks />
        <CreatorSection />
        <BusinessSection />
        <Testimonials />
        <PricingFree />
        <FinalCTA />
        <Footer />
      </main>
    </div>
  );
}
