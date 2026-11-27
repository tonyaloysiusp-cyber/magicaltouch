'use client';
// Home hero: the whole studio at a glance in the theme gradient — a print
// file with marks, vector tracing, a packaging box, a garment, photo retouch
// (lips and face sculpt) and languages — as clean drawings, not screenshots.
// The same cards appear (as a subset) at the top of the Templates page.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { PACK_TEMPLATES, templateMockupSvg } from '@/lib/packaging/templates';
import { TEXTILE_TEMPLATES, textileSketchSvg } from '@/lib/textile/editorBridge';

const INK = '#16161F', MUTED = '#8A8A9A', LINE = '#E4E4EC';

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/70 bg-white/75 p-3 shadow-[0_18px_40px_-28px_rgba(22,22,31,0.45)] backdrop-blur [&_svg]:h-full [&_svg]:w-full">{children}</div>
      <figcaption className="text-[12px] font-semibold text-mt-muted">{label}</figcaption>
    </figure>
  );
}

/** A print sheet: artwork with bleed, trim, crop marks, registration and a colour bar. */
export const PrintFileArt = () => (
  <svg viewBox="0 0 200 150" aria-hidden>
    <rect x="44" y="20" width="112" height="110" fill="#fff" stroke={LINE} />
    <rect x="50" y="26" width="100" height="98" fill="url(#pf-g)" />
    <defs><linearGradient id="pf-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F2708F" /><stop offset=".5" stopColor="#A69BD3" /><stop offset="1" stopColor="#35C2F1" /></linearGradient></defs>
    <rect x="56" y="32" width="88" height="86" fill="none" stroke="#fff" strokeWidth="0.8" strokeDasharray="3 2" opacity=".9" />
    <text x="100" y="72" textAnchor="middle" fontFamily="Inter, Arial" fontSize="15" fontWeight="800" fill="#fff">SALE</text>
    <text x="100" y="88" textAnchor="middle" fontFamily="Inter, Arial" fontSize="7" fill="#fff" opacity=".9">print-ready</text>
    {[[50, 26], [150, 26], [50, 124], [150, 124]].map(([x, y], i) => (
      <g key={i} stroke={INK} strokeWidth="0.7">
        <path d={`M${x} ${y + (y < 70 ? -6 : 6)}V${y + (y < 70 ? -14 : 14)}M${x + (x < 100 ? -6 : 6)} ${y}H${x + (x < 100 ? -14 : 14)}`} />
      </g>
    ))}
    {[[100, 9], [100, 141]].map(([x, y], i) => <g key={i} stroke={INK} strokeWidth="0.6" fill="none"><circle cx={x} cy={y} r="3.4" /><path d={`M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}`} /></g>)}
    {['#00AEEF', '#EC008C', '#FFF200', INK].map((c, i) => <rect key={c} x={166} y={36 + i * 12} width="10" height="10" fill={c} stroke={LINE} strokeWidth="0.4" />)}
    <text x="171" y="92" textAnchor="middle" fontFamily="Inter, Arial" fontSize="6" fontWeight="700" fill={MUTED}>CMYK</text>
  </svg>
);

/** Vector tracing: a pixel letter beside its clean path with anchors and handles. */
export const TraceArt = () => (
  <svg viewBox="0 0 200 150" aria-hidden>
    {Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = Math.floor(i / 8); const on = (x === 1 || x === 6) ? y > 0 : (y === 1 || y === 4) && x > 0 && x < 7; return on ? <rect key={i} x={22 + x * 8} y={36 + y * 9} width="8" height="9" fill="#8CC84B" /> : null; })}
    <path d="M96 75h14M104 69l6 6-6 6" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M124 116V48C124 38 132 36 146 36C160 36 168 38 168 48V116M124 76H168" stroke="#5DCCB8" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M124 48C124 38 132 36 146 36" stroke="#3B82C4" strokeWidth="0.8" fill="none" />
    <path d="M124 48L124 34M146 36L132 36" stroke="#3B82C4" strokeWidth="0.6" />
    {[[124, 116], [124, 48], [146, 36], [168, 48], [168, 116], [124, 76], [168, 76]].map(([x, y], i) => <rect key={i} x={x - 2.6} y={y - 2.6} width="5.2" height="5.2" fill="#fff" stroke="#3B82C4" strokeWidth="1" />)}
    <circle cx="124" cy="34" r="2" fill="#3B82C4" /><circle cx="132" cy="36" r="2" fill="#3B82C4" />
    <text x="146" y="138" textAnchor="middle" fontFamily="Inter, Arial" fontSize="7" fontWeight="700" fill={MUTED}>SVG · PDF · PNG</text>
  </svg>
);

/** Photo retouch: a line-drawn face with lip colour swatches and sculpt arrows. */
export const RetouchArt = () => (
  <svg viewBox="0 0 200 150" aria-hidden>
    <defs><linearGradient id="rt-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FDE7F0" /><stop offset="1" stopColor="#E3F4FB" /></linearGradient></defs>
    <rect x="30" y="12" width="96" height="126" rx="10" fill="url(#rt-bg)" />
    <path d="M78 30C58 30 50 48 52 68C54 92 64 112 78 116C92 112 102 92 104 68C106 48 98 30 78 30Z" fill="#F6D7C3" stroke={INK} strokeWidth="1" />
    <path d="M62 62q6-4 12 0M84 62q6-4 12 0" stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
    <ellipse cx="68" cy="68" rx="3.4" ry="2" fill={INK} /><ellipse cx="90" cy="68" rx="3.4" ry="2" fill={INK} />
    <path d="M78 72v12q-3 3 0 4" stroke={INK} strokeWidth="0.9" fill="none" strokeLinecap="round" />
    <path d="M69 97q9-5 18 0q-9 7-18 0Z" fill="#D63B6B" />
    <path d="M49 84l-7 2M107 84l7 2M52 100l-6 5M104 100l6 5" stroke="#3B82C4" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M42 86l2-3M42 86l3 2M114 86l-2-3M114 86l-3 2" stroke="#3B82C4" strokeWidth="1.3" strokeLinecap="round" />
    <text x="152" y="34" textAnchor="middle" fontFamily="Inter, Arial" fontSize="7" fontWeight="700" fill={MUTED}>LIPS</text>
    {['#D63B6B', '#B5294E', '#E8798F', '#9C3D54'].map((c, i) => <circle key={c} cx="152" cy={46 + i * 14} r="5.5" fill={c} stroke={i === 0 ? INK : 'none'} strokeWidth="1" />)}
    <text x="152" y="118" textAnchor="middle" fontFamily="Inter, Arial" fontSize="7" fontWeight="700" fill={MUTED}>SCULPT</text>
    <rect x="136" y="124" width="32" height="3" rx="1.5" fill={LINE} /><rect x="136" y="124" width="20" height="3" rx="1.5" fill="#F2708F" /><circle cx="156" cy="125.5" r="3.5" fill="#fff" stroke="#F2708F" strokeWidth="1.2" />
  </svg>
);

/** Languages: greetings in several scripts as live text. */
export const LanguagesArt = () => (
  <svg viewBox="0 0 200 150" aria-hidden>
    <rect x="14" y="14" width="172" height="122" rx="12" fill={INK} />
    <text x="30" y="46" fontSize="20" fontWeight="700" fill="#fff" fontFamily="'Noto Sans Tamil', 'Latha', sans-serif">வணக்கம்</text>
    <text x="170" y="46" textAnchor="end" fontSize="20" fontWeight="700" fill="#A69BD3" fontFamily="'Noto Sans Devanagari', 'Mangal', sans-serif">नमस्ते</text>
    <text x="30" y="80" fontSize="20" fontWeight="700" fill="#35C2F1" fontFamily="'Noto Sans Arabic', 'Tahoma', sans-serif">مرحبا</text>
    <text x="170" y="80" textAnchor="end" fontSize="20" fontWeight="700" fill="#fff" fontFamily="'Noto Sans SC', 'Microsoft YaHei', sans-serif">你好</text>
    <text x="30" y="113" fontSize="18" fontWeight="700" fill="#8CC84B" fontFamily="'Noto Sans Malayalam', 'Kartika', sans-serif">നമസ്കാരം</text>
    <text x="170" y="113" textAnchor="end" fontSize="18" fontWeight="700" fill="#F2708F" fontFamily="Inter, Arial">Hello</text>
  </svg>
);

/** Text styles: three typographic treatments, the way templates use them. */
export const TextStylesArt = () => (
  <svg viewBox="0 0 200 150" aria-hidden>
    <text x="100" y="52" textAnchor="middle" fontFamily="Georgia, serif" fontSize="30" fontStyle="italic" fill={INK}>Aa</text>
    <text x="100" y="84" textAnchor="middle" fontFamily="Inter, Arial" fontSize="20" fontWeight="900" fill="url(#ts-g)">GRAND OPENING</text>
    <defs><linearGradient id="ts-g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F2708F" /><stop offset=".5" stopColor="#A69BD3" /><stop offset="1" stopColor="#35C2F1" /></linearGradient></defs>
    <text x="100" y="112" textAnchor="middle" fontFamily="Inter, Arial" fontSize="15" fontWeight="800" fill="#fff" stroke={INK} strokeWidth="3" paintOrder="stroke">Big Sale</text>
    <text x="100" y="134" textAnchor="middle" fontFamily="Inter, Arial" fontSize="8" letterSpacing="3" fill={MUTED}>FONTS · EFFECTS · CURVES</text>
  </svg>
);

/** A social post card. */
export const SocialArt = () => (
  <svg viewBox="0 0 200 150" aria-hidden>
    <rect x="55" y="8" width="90" height="134" rx="10" fill="#fff" stroke={LINE} />
    <rect x="62" y="16" width="76" height="76" rx="6" fill="#FFE9B8" />
    <circle cx="100" cy="46" r="18" fill="#F2708F" opacity=".85" />
    <text x="100" y="82" textAnchor="middle" fontFamily="Inter, Arial" fontSize="9" fontWeight="800" fill={INK}>NEW MENU</text>
    <rect x="62" y="100" width="54" height="5" rx="2.5" fill={LINE} /><rect x="62" y="110" width="40" height="5" rx="2.5" fill={LINE} />
    <circle cx="70" cy="128" r="4" fill="#F2708F" /><circle cx="82" cy="128" r="4" fill="#A69BD3" /><circle cx="94" cy="128" r="4" fill="#35C2F1" />
  </svg>
);

function useReady() { const [r, setR] = useState(false); useEffect(() => setR(true), []); return r; }

export function PackagingArt() {
  const ready = useReady();
  const t = useMemo(() => PACK_TEMPLATES.find((x) => x.id === 'botanical-tea-rte') || PACK_TEMPLATES[0], []);
  return <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready && t ? templateMockupSvg(t) : '' }} />;
}
export function GarmentArt({ id = 'polo-corporate' }: { id?: string } = {}) {
  const ready = useReady();
  const t = useMemo(() => TEXTILE_TEMPLATES.find((x) => x.id === id) || TEXTILE_TEMPLATES[0], [id]);
  return <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready && t ? textileSketchSvg(t) : '' }} />;
}

export function StudioHero() {
  return (
    <PageHero
      align="center"
      eyebrow="Free design & print studio"
      title="Design it. Print it. Make it real."
      accent="Make it real."
      subtitle="Templates, a design editor, Photo Studio, packaging dielines, textile pattern pieces, vector tracing and print-ready files with marks — type in 17+ scripts and translate into 37 languages. Free for everyone: no sign-up, no login, nothing stored on our servers."
      actions={<>
        <Link href="/create" className="inline-flex h-12 items-center gap-2 rounded-full bg-mt-ink px-6 text-[15px] font-semibold text-mt-bg hover:opacity-90">Start designing <ArrowRight size={16} /></Link>
        <Link href="/templates" className="inline-flex h-12 items-center rounded-full border border-mt-border bg-mt-surface px-6 text-[15px] font-semibold hover:bg-mt-surface2">Explore templates</Link>
      </>}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card label="Print files & marks"><PrintFileArt /></Card>
        <Card label="Packaging"><PackagingArt /></Card>
        <Card label="Textile"><GarmentArt /></Card>
        <Card label="Retouch & sculpt"><RetouchArt /></Card>
        <Card label="Vector & trace"><TraceArt /></Card>
        <Card label="17+ languages"><LanguagesArt /></Card>
      </div>
      <ul className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 text-[13.5px] text-mt-muted">
        {['Free — no sign-up or login', 'Your files stay on your device', 'CMYK, bleed and crop marks', 'No watermark'].map((t) => (
          <li key={t} className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /> {t}</li>
        ))}
      </ul>
    </PageHero>
  );
}

/** Cards for the Templates page hero: social, text styles, print, packaging, textile. */
export function TemplateKinds() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <Card label="Social media"><SocialArt /></Card>
      <Card label="Text styles"><TextStylesArt /></Card>
      <Card label="Print files"><PrintFileArt /></Card>
      <Card label="Packaging boxes"><PackagingArt /></Card>
      <Card label="Garments"><GarmentArt /></Card>
    </div>
  );
}
