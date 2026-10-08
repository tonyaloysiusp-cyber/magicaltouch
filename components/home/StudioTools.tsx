'use client';

import { HardDrive, Cloud, UserRound, Check } from 'lucide-react';
import { Reveal } from './Reveal';

const RECOLOURS = [
  { filter: 'none', dots: ['#F2708F', '#35C2F1', '#09090B'] },
  { filter: 'hue-rotate(150deg) saturate(1.1)', dots: ['#5DCCB8', '#A69BD3', '#09090B'] },
  { filter: 'hue-rotate(260deg)', dots: ['#8CC84B', '#F2708F', '#09090B'] },
];

const ADJUST = [
  { label: 'Exposure', value: 62 },
  { label: 'Contrast', value: 48 },
  { label: 'Saturation', value: 74 },
  { label: 'Warmth', value: 55 },
];

const SAVE = [
  { icon: HardDrive, title: 'This device', body: 'A file on your computer, iPad or phone' },
  { icon: Cloud, title: 'Your cloud drive', body: 'Kept in a folder you choose' },
  { icon: UserRound, title: 'Your account', body: 'Open it anywhere, saved automatically' },
];

const FORMATS = ['PNG', 'JPG', 'PDF', 'Print-ready PDF'];
const SIZES = [
  { label: 'Instagram post', size: '1080 × 1080' },
  { label: 'Story', size: '1080 × 1920' },
  { label: 'A5 flyer', size: '148 × 210 mm' },
];

// The studio, shown with real templates and real tools rather than
// abstract gradient cards.
export function StudioTools() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 sm:px-6 py-24 sm:py-32">
      <Reveal>
        <h2 className="font-[family-name:var(--font-display)] font-medium text-3xl sm:text-5xl leading-[1.08] tracking-[-0.03em] max-w-2xl">
          One studio for every idea.
        </h2>
        <p className="mt-5 text-mt-muted text-lg max-w-xl leading-relaxed">
          Everything you need to go from template to finished design, without switching apps.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {/* Recolour */}
        <Reveal className="lg:col-span-2">
          <article className="h-full rounded-3xl border border-mt-border bg-mt-surface p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-mt-ink">Change every colour</h3>
            <p className="mt-2 text-sm text-mt-muted max-w-md leading-relaxed">
              Tap any element and give it a new colour: your brand, the season, the mood of the party.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-5">
              {RECOLOURS.map((r, i) => (
                <figure key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/templates/collection/eighteen-neon-night.jpg"
                    alt={i === 0 ? 'A party invitation in three colourways' : ''}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-xl ring-1 ring-mt-border"
                    style={{ filter: r.filter }}
                  />
                  <figcaption className="mt-3 flex gap-1.5">
                    {r.dots.map((c) => (
                      <span key={c} className="w-4 h-4 rounded-full ring-1 ring-black/10 dark:ring-white/20" style={{ background: c }} />
                    ))}
                  </figcaption>
                </figure>
              ))}
            </div>
          </article>
        </Reveal>

        {/* Photo Studio */}
        <Reveal className="lg:row-span-2">
          <article className="h-full rounded-3xl border border-mt-border bg-mt-surface p-6 sm:p-8 flex flex-col">
            <h3 className="text-lg font-semibold text-mt-ink">Photo Studio</h3>
            <p className="mt-2 text-sm text-mt-muted leading-relaxed">
              Crop, adjust and retouch photos, then drop them straight into your design.
            </p>
            <div className="relative mt-8 rounded-xl overflow-hidden ring-1 ring-mt-border aspect-[4/5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/templates/collection/summer-music-festival.jpg" alt="A festival poster being adjusted in Photo Studio" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/templates/collection/summer-music-festival.jpg"
                  alt=""
                  loading="lazy"
                  className="absolute inset-y-0 left-0 h-full max-w-none object-cover"
                  style={{ width: '200%', filter: 'saturate(0.35) brightness(0.8) contrast(0.9)' }}
                />
              </div>
              <div className="absolute inset-y-0 left-1/2 w-0.5 -ml-px bg-white" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg ring-1 ring-black/10" />
            </div>
            <ul className="mt-6 space-y-4">
              {ADJUST.map((a) => (
                <li key={a.label}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-mt-ink">{a.label}</span>
                    <span className="tabular-nums text-mt-faint">{a.value}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-mt-border relative">
                    <span className="absolute inset-y-0 left-0 rounded-full mt-spectrum" style={{ width: `${a.value}%` }} />
                    <span
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white ring-1 ring-black/15 shadow"
                      style={{ left: `${a.value}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        {/* Save anywhere */}
        <Reveal>
          <article className="h-full rounded-3xl border border-mt-border bg-mt-surface p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-mt-ink">Save it where you like</h3>
            <p className="mt-2 text-sm text-mt-muted leading-relaxed">Your designs stay yours, wherever you keep them.</p>
            <ul className="mt-6 space-y-2">
              {SAVE.map((s, i) => (
                <li
                  key={s.title}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${i === 2 ? 'mt-active-blue' : 'border-mt-border'}`}
                >
                  <s.icon size={18} className="text-mt-accent shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-mt-ink">{s.title}</span>
                    <span className="block text-xs text-mt-muted truncate">{s.body}</span>
                  </span>
                  {i === 2 && <Check size={16} className="ml-auto text-mt-accent shrink-0" />}
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        {/* Export */}
        <Reveal>
          <article className="h-full rounded-3xl border border-mt-border bg-mt-surface p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-mt-ink">Ready for print and social</h3>
            <p className="mt-2 text-sm text-mt-muted leading-relaxed">Download in the format you need, at the right size.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <span key={f} className="text-xs font-semibold text-mt-ink border border-mt-border rounded-full px-3 py-1.5">
                  {f}
                </span>
              ))}
            </div>
            <dl className="mt-5 divide-y divide-mt-border border-y border-mt-border">
              {SIZES.map((s) => (
                <div key={s.label} className="flex justify-between py-2.5 text-sm">
                  <dt className="text-mt-ink">{s.label}</dt>
                  <dd className="tabular-nums text-mt-faint">{s.size}</dd>
                </div>
              ))}
            </dl>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
