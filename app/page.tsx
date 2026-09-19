'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { Menu, X, ArrowRight, Check } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';

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

const NAV_LINKS = [
  { label: 'Templates', href: '/templates' },
  { label: 'Pricing', href: '#pricing' },
];

const COLOR_BAR = ['#EC1E79', '#8B6FC4', '#3FA9E8', '#4FC8C0', '#7ED33E', '#C4DA3B'];

const TOOLSETS = [
  {
    plate: 'Vector',
    title: 'Draw and build shapes',
    text: 'Pen tool, shape builder, path operations. Real editable vector objects, not flattened pixels.',
  },
  {
    plate: 'Raster',
    title: 'Edit and retouch photos',
    text: 'Crop, adjust, mask, and retouch images without leaving the same canvas as your vector work.',
  },
  {
    plate: 'Print',
    title: 'Prepare for production',
    text: 'Bleed, crop marks, slug, and imposition — the marks a real print shop expects on a file.',
  },
];

const WORKFLOW = [
  { step: 'Design', text: 'Start from a blank canvas or a template.' },
  { step: 'Retouch', text: 'Adjust, mask, and clean up your images.' },
  { step: 'Prepare', text: 'Add bleed, crop marks, and print settings.' },
  { step: 'Export', text: 'Ship a file a printer or platform can use.' },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    features: ['Basic design tools', 'Selected templates', 'Standard exports'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Creator',
    price: '$12',
    features: ['Full vector + photo toolset', 'Print-ready exports', 'Premium templates'],
    cta: 'Start Creating',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$29',
    features: ['Imposition & step-and-repeat', 'Team collaboration', 'Priority support'],
    cta: 'Get Started',
    highlighted: false,
  },
];

function CropMark({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos: Record<string, string> = {
    tl: 'top-0 left-0',
    tr: 'top-0 right-0 -scale-x-100',
    bl: 'bottom-0 left-0 -scale-y-100',
    br: 'bottom-0 right-0 -scale-x-100 -scale-y-100',
  };
  return (
    <svg
      className={`absolute w-6 h-6 ${pos[corner]}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#17161B"
      strokeWidth="1"
    >
      <line x1="0" y1="8" x2="0" y2="0" />
      <line x1="0" y1="0" x2="8" y2="0" />
    </svg>
  );
}

function RegistrationMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#17161B" strokeWidth="1">
      <circle cx="14" cy="14" r="10" />
      <line x1="14" y1="0" x2="14" y2="28" />
      <line x1="0" y1="14" x2="28" y2="14" />
    </svg>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goToWorkspace = async () => {
    setMenuOpen(false);
    router.push(await resolveAuthedPath('/dashboard'));
  };

  return (
    <main
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-[#F7F5F0] text-[#17161B]`}
    >
      {/* ---------------------------------------------------------- NAV */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'bg-[#F7F5F0]/95 backdrop-blur border-b border-black/10' : 'bg-transparent'
        }`}
      >
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.png" alt="Magical Touch" width={140} height={28} priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={goToWorkspace} className="text-sm text-[#4A4750] hover:text-[#17161B] transition-colors">
              Workspace
            </button>
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-sm text-[#4A4750] hover:text-[#17161B] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#4A4750] hover:text-[#17161B] px-3 py-2">
              Log In
            </Link>
            <button
              onClick={goToWorkspace}
              className="text-sm font-semibold text-white px-5 py-2.5 bg-[#17161B] hover:bg-[#6C4FD1] transition-colors"
            >
              Start Designing
            </button>
          </div>

          <button className="md:hidden p-2 -mr-2" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-black/10 bg-[#F7F5F0] px-6 py-4 flex flex-col gap-1">
            <button onClick={goToWorkspace} className="py-2.5 text-sm text-left">
              Workspace
            </button>
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="py-2.5 text-sm" onClick={() => setMenuOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-3">
              <Link href="/login" className="text-center text-sm font-medium border border-black/15 py-2.5">
                Log In
              </Link>
              <button onClick={goToWorkspace} className="text-center text-sm font-semibold text-white bg-[#17161B] py-2.5">
                Start Designing
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ---------------------------------------------------------- HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-20 md:pt-20">
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-14 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#4A4750]">
              <RegistrationMark />
              <span>Vector · Raster · Print — one document</span>
            </div>

            <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl sm:text-6xl leading-[1.05] tracking-tight">
              Design it. Retouch it.
              <br />
              <span className="italic">Send it to press.</span>
            </h1>

            <p className="mt-6 text-lg text-[#4A4750] max-w-md leading-relaxed">
              Magical Touch is a single workspace for drawing, photo editing, and
              print preparation — no exporting between three different apps to
              get a file a printer will actually accept.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={goToWorkspace}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3.5 bg-[#17161B] hover:bg-[#6C4FD1] transition-colors"
              >
                Open the Workspace <ArrowRight size={15} />
              </button>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 border border-black/15 hover:border-black/40 transition-colors"
              >
                Browse Templates
              </Link>
            </div>
          </div>

          {/* Proof sheet mockup */}
          <div className="relative">
            <div className="relative bg-white border border-black/10 shadow-[0_40px_80px_-40px_rgba(23,22,27,0.35)] p-8 pb-6">
              <CropMark corner="tl" />
              <CropMark corner="tr" />
              <CropMark corner="bl" />
              <CropMark corner="br" />

              <div className="aspect-[4/3] bg-[#F1EFEA] border border-black/5 flex items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, #6C4FD1 0%, #EC1E79 100%)', opacity: 0.9 }}
                />
                <span className="relative text-white font-[family-name:var(--font-display)] italic text-2xl">
                  Your artwork here
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#4A4750]">PROOF · 300 DPI · CMYK-ready</span>
                <span className="text-[11px] font-mono text-[#4A4750]">216 × 303 mm</span>
              </div>

              <div className="mt-3 flex h-3">
                {COLOR_BAR.map((c) => (
                  <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- THREE PLATES */}
      <section className="border-y border-black/10 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl max-w-lg">
            Three tools that share one canvas
          </h2>
          <p className="mt-3 text-[#4A4750] max-w-xl">
            Most tools make you choose: illustration software, or photo software,
            or print software. Magical Touch keeps them on the same page.
          </p>

          <div className="mt-12 grid md:grid-cols-3 gap-px bg-black/10">
            {TOOLSETS.map((t) => (
              <div key={t.plate} className="bg-white p-8">
                <span className="text-xs font-mono text-[#4A4750]">{t.plate}</span>
                <h3 className="mt-3 text-xl font-[family-name:var(--font-display)]">{t.title}</h3>
                <p className="mt-3 text-sm text-[#4A4750] leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- WORKFLOW */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-center">
          The path from idea to printed sheet
        </h2>

        <div className="mt-14 grid md:grid-cols-4 gap-8">
          {WORKFLOW.map((w, i) => (
            <div key={w.step} className="relative">
              {i < WORKFLOW.length - 1 && (
                <div className="hidden md:block absolute top-3 left-[calc(100%_-_8px)] w-8 border-t border-dashed border-black/20" />
              )}
              <div className="text-xs font-mono text-[#4A4750]">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="mt-2 font-semibold">{w.step}</h3>
              <p className="mt-1.5 text-sm text-[#4A4750] leading-relaxed">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- PRICING */}
      <section id="pricing" className="border-t border-black/10 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Pick your setup</h2>
            <p className="mt-3 text-[#4A4750]">From a first design to production-ready sheets.</p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`p-7 border ${
                  p.highlighted ? 'border-[#17161B] bg-[#17161B] text-white' : 'border-black/10'
                }`}
              >
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="mt-5 text-3xl font-semibold">
                  {p.price}
                  <span className={`text-sm font-normal ${p.highlighted ? 'text-white/50' : 'text-[#4A4750]'}`}>
                    {' '}
                    / month
                  </span>
                </p>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check size={14} className={p.highlighted ? 'text-[#EC1E79]' : 'text-[#6C4FD1]'} />
                      <span className={p.highlighted ? 'text-white/85' : 'text-[#4A4750]'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={goToWorkspace}
                  className={`mt-7 block w-full text-center text-sm font-semibold py-3 transition-colors ${
                    p.highlighted ? 'bg-white text-[#17161B] hover:bg-[#F7F5F0]' : 'bg-[#17161B] text-white hover:bg-[#6C4FD1]'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- FOOTER */}
      <footer>
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Magical Touch" width={120} height={24} />
            <span className="text-xs text-[#4A4750]">© 2026 Magical Touch</span>
          </div>
          <div className="flex gap-6 text-sm text-[#4A4750]">
            <button onClick={goToWorkspace} className="hover:text-[#17161B]">Workspace</button>
            <Link href="/templates" className="hover:text-[#17161B]">Templates</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
