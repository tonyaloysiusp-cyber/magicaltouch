// Home: what makes the studio different — languages, packaging, photo
// retouching and face shaping, textile — with real screens of the tools and
// a live multilingual design card (real text, rendered by the browser).
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

const SCRIPTS: { text: string; lang: string; dir?: 'rtl'; label: string }[] = [
  { text: 'வணக்கம்', lang: 'ta', label: 'Tamil' },
  { text: 'नमस्ते', lang: 'hi', label: 'Hindi' },
  { text: 'നമസ്കാരം', lang: 'ml', label: 'Malayalam' },
  { text: 'مرحبا', lang: 'ar', dir: 'rtl', label: 'Arabic' },
  { text: 'ನಮಸ್ಕಾರ', lang: 'kn', label: 'Kannada' },
  { text: '你好', lang: 'zh', label: 'Chinese' },
];

function LanguageCard() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-6 rounded-[40px] bg-[conic-gradient(from_200deg,#F2708F33,#A69BD333,#35C2F133,#5DCCB833,#8CC84B33,#DDE23B33,#F2708F33)] blur-2xl" aria-hidden />
      <div className="relative rounded-[28px] border border-mt-border bg-mt-surface p-3 shadow-[0_30px_70px_-35px_rgba(22,22,31,0.45)]">
        <div className="rounded-[20px] bg-[linear-gradient(160deg,#16161F,#2A2440)] p-7 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Festival greetings</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {SCRIPTS.map((s) => (
              <li key={s.lang} className="min-w-0">
                <span lang={s.lang} dir={s.dir} className="block truncate text-[30px] font-semibold leading-tight">{s.text}</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-white/45">{s.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 h-1 rounded-full bg-[linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B)]" />
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  {
    id: 'lang', eyebrow: 'Write in your language', title: 'Tamil, Hindi, Arabic — and 14 more.',
    text: 'Type in Tamil, Malayalam, Hindi, Telugu, Kannada, Bengali, Gujarati, Punjabi, Arabic, Urdu, Sinhala, Thai, Hebrew, Chinese, Japanese, Korean or English. The right fonts load only when you use them, right-to-left scripts flow the right way, and the text stays real vector type in your print PDF.',
    points: ['17+ languages & scripts', 'Right-to-left for Arabic, Urdu, Hebrew', 'Vector text in PDF — sharp at any size'],
    href: '/editor', cta: 'Open the design editor', visual: 'lang',
  },
  {
    id: 'pack', eyebrow: 'Packaging design', title: 'Design the box on its real dieline.',
    text: 'Choose a box style, enter your product size and board, and design straight on the flat blank in the full editor. Cut and crease lines stay on a locked layer; download a CMYK print PDF, the dieline for the die maker and a packaging specification.',
    points: ['Tuck end, crash lock, gable, pillow, mailer, trays', 'Top and bottom end types, glue flap options', 'Print PDF, DXF and specification sheet'],
    href: '/packaging-dieline', cta: 'Design a box', img: '/tour/packaging.webp', w: 2000, h: 1250,
  },
  {
    id: 'photo', eyebrow: 'Photo retouching', title: 'Retouch, shape faces, then compare.',
    text: 'Light, colour, filters and looks with layers and a clone brush — plus skin retouching and face shaping for eyes, brows, nose, lips and face shape. Filters and face edits open a big side-by-side before and after. The face finder runs on your device; your photo is never uploaded.',
    points: ['Skin smoothing that keeps texture', 'Face shaping with natural limits', 'Export JPG, PNG, WebP or CMYK for print'],
    href: '/photo-studio', cta: 'Open Photo Studio', img: '/tour/photo-studio.webp', w: 2000, h: 1250,
  },
  {
    id: 'tex', eyebrow: 'Textile design', title: 'Garments as real pattern pieces.',
    text: 'Polos, T-shirts, jerseys, kurtis, churidars and frocks drafted from sizes XS–XXXL or your own measurements. Design on every piece, add team names and numbers, see how much fabric you need, and download full-size patterns and DXF.',
    points: ['Seam allowance and grain lines on every piece', 'Team roster: one PDF page per player', 'Pattern PDF (full size or A4 tiles) and DXF'],
    href: '/textile-studio', cta: 'Design a garment', img: '/tour/textile.webp', w: 2000, h: 1250,
  },
] as const;

export default function FeatureShowcase() {
  return (
    <section aria-labelledby="showcase" className="mt-container py-16 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-mt-faint">Inside the studio</p>
        <h2 id="showcase" className="mt-2 font-[family-name:var(--font-display)] text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-[1.05]">More than templates.</h2>
        <p className="mt-4 text-lg text-mt-muted">A design editor, Photo Studio, packaging and textile tools — the work of a print shop, in your browser, free and without an account.</p>
      </div>
      <div className="mt-14 space-y-20 sm:space-y-28">
        {ROWS.map((r, i) => (
          <article key={r.id} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
            <div>
              {'img' in r ? (
                <div className="overflow-hidden rounded-[24px] border border-mt-border bg-mt-surface shadow-[0_30px_70px_-35px_rgba(22,22,31,0.45)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt={`${r.eyebrow} on Magical Touch Design`} width={r.w} height={r.h} loading="lazy" decoding="async" className="w-full h-auto" />
                </div>
              ) : <LanguageCard />}
            </div>
            <div className="max-w-xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-mt-faint">{r.eyebrow}</p>
              <h3 className="mt-2 text-2xl sm:text-4xl font-semibold tracking-[-0.02em] leading-tight">{r.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-mt-muted">{r.text}</p>
              <ul className="mt-5 space-y-2">
                {r.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[15px]"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-mt-ink text-mt-bg"><Check size={12} /></span>{p}</li>
                ))}
              </ul>
              <Link href={r.href} className="mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-mt-primary px-6 text-[15px] font-semibold text-mt-onprimary">{r.cta} <ArrowRight size={16} /></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
