'use client';

import { Fraunces, Inter } from 'next/font/google';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
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
  return (
    <main
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-[#F7F5F0] text-[#17161B]`}
    >
      <Navbar />
      <Hero />
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
  );
}
