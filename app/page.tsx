'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Fraunces, Inter } from 'next/font/google';
import {
  Menu,
  X,
  Sparkles,
  LayoutTemplate,
  Share2,
  Layers,
  Palette,
  Printer,
  RefreshCw,
  FolderOpen,
  Star,
  Check,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from 'lucide-react';

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
  { label: 'Create', href: '/create' },
  { label: 'Templates', href: '/templates' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
];

const CATEGORIES = ['Social Media', 'Marketing', 'Branding', 'Print', 'Presentations', 'Events'];

const FEATURES = [
  {
    icon: Layers,
    title: 'Design Studio',
    text: 'Create professional designs with simple, powerful tools built for creators.',
    large: true,
  },
  {
    icon: LayoutTemplate,
    title: 'Ready-to-Use Templates',
    text: 'Start faster with professionally designed templates for every occasion.',
  },
  {
    icon: Share2,
    title: 'Social Media',
    text: 'Create beautiful content for Instagram, Facebook, TikTok and more.',
  },
  {
    icon: Printer,
    title: 'Print Ready',
    text: 'Prepare high-quality artwork for posters, flyers, business cards and professional printing.',
  },
  {
    icon: RefreshCw,
    title: 'Resize & Adapt',
    text: 'Turn one design into multiple formats and sizes without starting over.',
  },
  {
    icon: FolderOpen,
    title: 'Your Designs, Anywhere',
    text: 'Keep your projects organized and continue creating whenever inspiration strikes.',
  },
];

const TEMPLATES = [
  { name: 'Golden Hour Story', category: 'Instagram', colors: ['#F5B942', '#FF6F91'] },
  { name: 'Bloom Festival Poster', category: 'Posters', colors: ['#6C4FD1', '#14121F'] },
  { name: 'Studio Minimal', category: 'Business Cards', colors: ['#14121F', '#FAF9F6'] },
  { name: 'Paper & Ink Invite', category: 'Invitations', colors: ['#FF6F91', '#F5B942'] },
  { name: 'Quarterly Deck', category: 'Presentations', colors: ['#6C4FD1', '#FF6F91'] },
  { name: 'Night Market Flyer', category: 'Flyers', colors: ['#14121F', '#6C4FD1'] },
];

const STEPS = [
  { n: '01', title: 'Choose', text: 'Start from a blank canvas or choose a ready-made template.' },
  { n: '02', title: 'Create', text: 'Customize your design with your own text, images, colors and branding.' },
  { n: '03', title: 'Share', text: 'Download, print or share your finished design wherever you need it.' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Nair',
    role: 'Freelance Illustrator',
    quote:
      'I moved three client projects over in a week. The print preflight checks alone have saved me from two costly reprints.',
    rating: 5,
  },
  {
    name: 'Marcus Webb',
    role: 'Owner, Webb & Co.',
    quote:
      'My whole team designs in the same brand kit now. Nobody has to ask "which logo file" anymore.',
    rating: 5,
  },
  {
    name: 'Selin Kaya',
    role: 'Marketing Lead',
    quote:
      'We resize one campaign into eight formats in the time it used to take for one. It just works.',
    rating: 4,
  },
];

const PRICING = [
  {
    name: 'Free',
    tagline: 'For getting started.',
    price: '$0',
    features: ['Basic designs', 'Selected templates', 'Standard exports'],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Creator',
    tagline: 'For regular creators.',
    price: '$12',
    features: ['Premium templates', 'Advanced design tools', 'More exports', 'Brand tools'],
    cta: 'Start Creating',
    highlighted: true,
  },
  {
    name: 'Business',
    tagline: 'For teams and businesses.',
    price: '$29',
    features: [
      'Brand management',
      'Team collaboration',
      'Premium templates',
      'Advanced tools',
      'Business support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
];

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: ['Design Studio', 'Templates', 'Features', 'Pricing'],
  },
  {
    heading: 'Resources',
    links: ['Design Inspiration', 'Tutorials', 'Help Center', 'Blog'],
  },
  {
    heading: 'Company',
    links: ['About', 'Contact', 'Careers', 'Privacy', 'Terms'],
  },
];

function MockDesignCard({
  colors,
  label,
}: {
  colors: [string, string];
  label: string;
}) {
  return (
    <div
      className="w-full h-full rounded-2xl flex items-end p-4"
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
    >
      <span className="text-white text-xs font-semibold tracking-tight opacity-90">{label}</span>
    </div>
  );
}

function FloatingChip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute rounded-xl bg-white/90 backdrop-blur border border-black/5 shadow-[0_8px_24px_-8px_rgba(20,18,31,0.25)] px-3 py-2 text-xs font-semibold text-[#14121F] motion-safe:animate-[float_6s_ease-in-out_infinite] ${className}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main
      className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] bg-[#FAF9F6] text-[#14121F] overflow-x-hidden`}
    >
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rise-1 { animation: rise 0.6s ease-out 0.05s both; }
        .rise-2 { animation: rise 0.6s ease-out 0.15s both; }
        .rise-3 { animation: rise 0.6s ease-out 0.25s both; }
        .rise-4 { animation: rise 0.6s ease-out 0.35s both; }
        @media (prefers-reduced-motion: reduce) {
          .rise-1, .rise-2, .rise-3, .rise-4 { animation: none; }
        }
      `}</style>

      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'bg-[#FAF9F6]/90 backdrop-blur border-b border-black/5' : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.png" alt="Magical Touch" width={140} height={28} priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm text-[#4B4560] hover:text-[#14121F] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#4B4560] hover:text-[#14121F] px-3 py-2">
              Log In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-full bg-brand-gradient shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Start Designing
            </Link>
          </div>

          <button
            className="md:hidden p-2 -mr-2 text-[#14121F]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="md:hidden border-t border-black/5 bg-[#FAF9F6] px-6 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="py-2.5 text-sm text-[#4B4560]"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 mt-3">
              <Link
                href="/login"
                className="text-center text-sm font-medium border border-black/10 rounded-full py-2.5"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-center text-sm font-semibold text-white rounded-full py-2.5 bg-brand-gradient"
              >
                Start Designing
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(20,18,31,0.10) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          <div>
            <span className="rise-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6C4FD1] bg-[#6C4FD1]/10 rounded-full px-3 py-1.5">
              <Sparkles size={13} /> Your Creative Space Starts Here
            </span>

            <h1 className="rise-2 mt-6 font-[family-name:var(--font-display)] text-5xl sm:text-6xl leading-[1.05] tracking-tight">
              Create. Design.
              <br />
              Make It Magical.
            </h1>

            <p className="rise-3 mt-6 text-lg text-[#4B4560] max-w-md leading-relaxed">
              Bring your ideas to life with a simple, powerful design workspace built for
              creators, businesses and professionals.
            </p>

            <div className="rise-4 mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full bg-brand-gradient shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Start Designing Free →
              </Link>
              <Link
                href="/templates"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#14121F] px-6 py-3.5 rounded-full border border-black/10 hover:bg-black/[0.03] transition-colors"
              >
                Explore Templates
              </Link>
            </div>

            <p className="rise-4 mt-4 text-xs text-[#4B4560]">
              No complicated tools. Just your creativity.
            </p>
          </div>

          <div className="relative rise-4">
            <div className="relative rounded-2xl border border-black/5 bg-white shadow-[0_30px_60px_-25px_rgba(20,18,31,0.35)] overflow-hidden">
              <div className="h-9 flex items-center gap-1.5 px-4 border-b border-black/5 bg-[#FAF9F6]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF6F91]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#6C4FD1]" />
              </div>
              <div className="grid grid-cols-[44px_1fr_120px] h-[340px]">
                <div className="border-r border-black/5 bg-[#FAF9F6] flex flex-col items-center gap-3 py-4">
                  {[Layers, LayoutTemplate, Palette, Share2].map((Icon, i) => (
                    <div key={i} className="w-7 h-7 rounded-md flex items-center justify-center text-[#4B4560]">
                      <Icon size={15} />
                    </div>
                  ))}
                </div>
                <div className="p-4 grid grid-cols-2 gap-3 bg-[#F1EFEA]">
                  <div className="col-span-2 h-24">
                    <MockDesignCard colors={['#6C4FD1', '#FF6F91']} label="Event Flyer" />
                  </div>
                  <div className="h-20">
                    <MockDesignCard colors={['#F5B942', '#FF6F91']} label="Instagram" />
                  </div>
                  <div className="h-20">
                    <MockDesignCard colors={['#14121F', '#6C4FD1']} label="Poster" />
                  </div>
                </div>
                <div className="border-l border-black/5 p-3 flex flex-col gap-2">
                  <div className="text-[10px] font-semibold text-[#4B4560] uppercase tracking-wide">Layers</div>
                  {['Background', 'Photo', 'Headline', 'Logo'].map((l) => (
                    <div key={l} className="text-[11px] text-[#14121F] bg-[#FAF9F6] rounded px-2 py-1.5">
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <FloatingChip className="-top-4 -left-6 hidden sm:block">✨ New Design</FloatingChip>
            <FloatingChip className="top-1/3 -right-6 hidden sm:block">🖨 Print Ready</FloatingChip>
            <FloatingChip className="-bottom-4 left-10 hidden sm:block">⬇ Export</FloatingChip>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
          One workspace. Endless possibilities.
        </h2>
        <p className="mt-4 text-[#4B4560] max-w-xl mx-auto leading-relaxed">
          From quick social posts to professional marketing materials and print designs,
          Magical Touch gives you everything you need to create beautiful content in one place.
        </p>

        <div className="mt-10 flex gap-3 overflow-x-auto pb-2 md:justify-center md:flex-wrap -mx-6 px-6 md:mx-0 md:px-0">
          {CATEGORIES.map((c) => (
            <span
              key={c}
              className="shrink-0 text-sm font-medium text-[#14121F] border border-black/10 rounded-full px-4 py-2 hover:border-[#6C4FD1]/40 hover:text-[#6C4FD1] transition-colors"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Everything you need to create
          </h2>
          <p className="mt-3 text-[#4B4560]">Powerful creative tools without the complicated workflow.</p>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`rounded-2xl border border-black/5 p-6 hover:border-[#6C4FD1]/30 hover:-translate-y-1 transition-all ${
                  f.large ? 'md:col-span-2 md:row-span-2 bg-[#14121F] text-white' : 'bg-white'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    f.large ? 'bg-white/10' : 'bg-[#6C4FD1]/10'
                  }`}
                >
                  <Icon size={18} className={f.large ? 'text-white' : 'text-[#6C4FD1]'} />
                </div>
                <h3 className={`mt-4 font-semibold ${f.large ? 'text-xl' : 'text-base'}`}>{f.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${f.large ? 'text-white/70' : 'text-[#4B4560]'}`}>
                  {f.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Start with inspiration
          </h2>
          <p className="mt-3 text-[#4B4560]">Choose a template, customize it and make it yours.</p>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="group rounded-2xl overflow-hidden border border-black/5 bg-white">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                  <MockDesignCard colors={t.colors as [string, string]} label={t.category} />
                </div>
                <div className="absolute inset-0 bg-[#14121F]/0 group-hover:bg-[#14121F]/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold text-white bg-white/15 backdrop-blur px-4 py-2 rounded-full border border-white/30">
                    Use Template
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-[#4B4560] mt-0.5">{t.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-center">
          From idea to design in minutes.
        </h2>

        <div className="mt-14 relative grid md:grid-cols-3 gap-10">
          <div className="hidden md:block absolute top-5 left-[16.5%] right-[16.5%] h-px bg-black/10" />
          {STEPS.map((s) => (
            <div key={s.n} className="relative text-center md:text-left">
              <div className="relative z-10 inline-flex w-10 h-10 rounded-full bg-[#FAF9F6] border border-black/10 items-center justify-center text-sm font-semibold text-[#6C4FD1] mx-auto md:mx-0">
                {s.n}
              </div>
              <h3 className="mt-4 font-semibold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-[#4B4560] leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#6C4FD1] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
              Your ideas deserve a magical touch.
            </h2>
            <p className="mt-4 text-white/80 leading-relaxed max-w-md">
              Whether you&apos;re a designer, creator, business owner or marketer, Magical Touch
              helps you turn ideas into professional designs faster.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#6C4FD1] bg-white px-6 py-3.5 rounded-full hover:-translate-y-0.5 hover:shadow-lg transition-all"
            >
              Create Your First Design →
            </Link>
          </div>

          <div className="relative h-72">
            <div className="absolute w-40 h-28 top-2 left-4 -rotate-6 shadow-xl rounded-xl overflow-hidden">
              <MockDesignCard colors={['#F5B942', '#FF6F91']} label="Instagram Post" />
            </div>
            <div className="absolute w-40 h-28 top-16 right-6 rotate-3 shadow-xl rounded-xl overflow-hidden">
              <MockDesignCard colors={['#14121F', '#6C4FD1']} label="Poster" />
            </div>
            <div className="absolute w-40 h-28 bottom-2 left-16 rotate-2 shadow-xl rounded-xl overflow-hidden">
              <MockDesignCard colors={['#FAF9F6', '#F5B942']} label="Business Card" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#14121F] text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Design smarter for your business.
          </h2>
          <p className="mt-4 text-white/70 max-w-lg mx-auto leading-relaxed">
            Create consistent marketing materials, social content and print designs while
            keeping your brand looking professional.
          </p>

          <ul className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-3 max-w-md mx-auto text-left">
            {['Brand consistency', 'Professional templates', 'Fast content creation', 'Print-ready output', 'Easy collaboration'].map(
              (item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/85">
                  <Check size={15} className="text-[#F5B942] shrink-0" />
                  {item}
                </li>
              )
            )}
          </ul>

          <Link
            href="/business"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-[#14121F] bg-white px-6 py-3.5 rounded-full hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Explore Business Tools
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl text-center">
          Loved by creators
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-6 items-center">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className={`rounded-2xl border border-black/5 bg-white p-6 ${
                i === 1 ? 'md:scale-105 shadow-[0_20px_40px_-20px_rgba(20,18,31,0.3)]' : ''
              }`}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    size={14}
                    className={si < t.rating ? 'fill-[#F5B942] text-[#F5B942]' : 'text-black/10'}
                  />
                ))}
              </div>
              <p className="mt-4 text-sm text-[#14121F] leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#6C4FD1]/15 flex items-center justify-center text-xs font-semibold text-[#6C4FD1]">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-[#4B4560]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">Create your way</h2>
          <p className="mt-3 text-[#4B4560]">Simple plans for every kind of creator.</p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6 items-start">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 border ${
                p.highlighted
                  ? 'border-transparent bg-[#14121F] text-white md:-translate-y-3 shadow-[0_30px_60px_-25px_rgba(20,18,31,0.5)]'
                  : 'border-black/5 bg-white'
              }`}
            >
              <p className="text-sm font-semibold">{p.name}</p>
              <p className={`text-xs mt-1 ${p.highlighted ? 'text-white/60' : 'text-[#4B4560]'}`}>{p.tagline}</p>
              <p className="mt-5 text-3xl font-semibold">
                {p.price}
                <span className={`text-sm font-normal ${p.highlighted ? 'text-white/50' : 'text-[#4B4560]'}`}>
                  {' '}
                  / month
                </span>
              </p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className={p.highlighted ? 'text-[#F5B942]' : 'text-[#6C4FD1]'} />
                    <span className={p.highlighted ? 'text-white/85' : 'text-[#4B4560]'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-7 block text-center text-sm font-semibold rounded-full py-3 transition-all hover:-translate-y-0.5 ${
                  p.highlighted ? 'bg-white text-[#14121F]' : 'bg-brand-gradient text-white'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-3xl bg-brand-gradient text-white px-8 py-16 sm:py-20 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">
            Ready to make something magical?
          </h2>
          <p className="mt-3 text-white/85">Your next great design is only a few clicks away.</p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#14121F] bg-white px-7 py-3.5 rounded-full hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Start Designing Free →
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-16 grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <Image src="/logo.png" alt="Magical Touch" width={130} height={26} />
            <p className="mt-3 text-sm text-[#4B4560]">Create. Design. Make It Magical.</p>
            <div className="mt-5 flex gap-3 text-[#4B4560]">
              <Instagram size={16} />
              <Twitter size={16} />
              <Facebook size={16} />
              <Youtube size={16} />
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-sm font-semibold">{col.heading}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-[#4B4560] hover:text-[#14121F] transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-black/5">
          <p className="max-w-7xl mx-auto px-6 py-6 text-xs text-[#4B4560]">
            © 2026 Magical Touch. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
