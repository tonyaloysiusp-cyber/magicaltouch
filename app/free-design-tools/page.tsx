import type { Metadata } from 'next';
import Link from 'next/link';
import type { ComponentType } from 'react';
import {
  Award, Baby, BookOpen, Briefcase, Cake, CalendarHeart, CreditCard, Dumbbell, Eraser, FileText, Flag, Flame, MapPin, Gift, Ghost,
  Globe, GraduationCap, Heart, Image as ImageIcon, LayoutTemplate, Mail, Megaphone, Moon, Palette, PartyPopper, Percent, Play, Printer,
  QrCode, Quote, Scissors, SlidersHorizontal, Smartphone, Sparkles, Tag, TreePine, User, UtensilsCrossed, Wand2, Home, Languages,
} from 'lucide-react';
import { SeoShell } from '@/components/seo/SeoShell';
import { SITE_URL, SITE_NAME, getHiddenLandings, getPublishedSeoPages } from '@/lib/seo';
import { ALL_LANDINGS } from '@/lib/landings';
import { getTemplateCountLabel, withCount } from '@/lib/templateCountServer';

// Free tools hub: icon tiles with a short name (the long text stays on each
// tool's own page). Links every keyword landing page for users and crawlers.
export const metadata: Metadata = {
  title: { absolute: `Free Design Tools — Flyer, Poster, Invitation & Resume Makers | ${SITE_NAME}` },
  description: 'All of Magical Touch’s free online design makers in one place: flyers, posters, invitations, resumes, business cards, menus, certificates, social posts and seasonal templates.',
  alternates: { canonical: `${SITE_URL}/free-design-tools` },
};

export const revalidate = 3600;

type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
const ICONS: [RegExp, Icon][] = [
  [/qr/, QrCode], [/print/, Printer], [/youtube/, Play], [/resume|cv/, User], [/business-card/, CreditCard], [/menu/, UtensilsCrossed],
  [/certificate/, Award], [/instagram|story/, Smartphone], [/linkedin|hiring/, Briefcase], [/quote/, Quote], [/sale|black-friday/, Percent],
  [/banner/, Flag], [/save-the-date|anniversary|valentine/, Heart], [/nikah|wedding/, Sparkles], [/birthday/, Cake], [/baby/, Baby],
  [/thank-you|greeting|mothers|fathers/, Gift], [/salon/, Scissors], [/gym/, Dumbbell], [/graduation/, GraduationCap], [/real-estate/, Home],
  [/brand/, Palette], [/christmas/, TreePine], [/new-year/, PartyPopper], [/halloween/, Ghost], [/diwali/, Flame], [/eid|ramadan/, Moon],
  [/holi/, Palette], [/national-day|uae|country/, Flag], [/invitation/, Mail], [/brochure|letterhead/, FileText], [/poster/, Megaphone],
  [/flyer/, ImageIcon], [/^ar-/, Languages], [/templates/, LayoutTemplate], [/software|tool/, Wand2],
];
const iconFor = (slug: string): Icon => ICONS.find(([r]) => r.test(slug))?.[1] || Tag;

// "free-wedding-invitation-maker" → "Wedding invitation"
const shortName = (slug: string) => {
  const s = slug.replace(/^free-|^ar-/, '').replace(/-(maker|templates?|generator)$/, '').replace(/-/g, ' ').trim();
  const t = s.replace(/\buae\b/g, 'UAE').replace(/\bcv\b/g, 'CV').replace(/\bpdf\b/gi, 'PDF').replace(/\bqr\b/g, 'QR');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const kindOf = (slug: string) => (/maker$/.test(slug) ? 'Maker' : /generator$/.test(slug) ? 'Generator' : /templates?$/.test(slug) ? 'Templates' : 'Tool');

const STUDIO: { href: string; name: string; note: string; icon: Icon; tint: string }[] = [
  { href: '/templates', name: 'Templates', note: 'Start from a design', icon: LayoutTemplate, tint: '#8E7FD0' },
  { href: '/create', name: 'Design editor', note: 'Blank canvas', icon: Wand2, tint: '#1FAEE6' },
  { href: '/remove-background', name: 'Remove background', note: 'One or many photos', icon: Eraser, tint: '#EC5F84' },
  { href: '/photo-studio', name: 'Photo Studio', note: 'Layers & retouch', icon: SlidersHorizontal, tint: '#33B79C' },
  { href: '/free-qr-code-generator', name: 'QR code', note: 'In your design', icon: QrCode, tint: '#6DB33A' },
  { href: '/free-print-ready-pdf', name: 'Print-ready PDF', note: 'Bleed & CMYK', icon: Printer, tint: '#E7A23A' },
  { href: '/tutorials', name: 'Tutorials', note: 'Guides & PDFs', icon: BookOpen, tint: '#5B6BD6' },
];

export default async function FreeToolsPage() {
  const [hidden, custom, label] = await Promise.all([getHiddenLandings(), getPublishedSeoPages(), getTemplateCountLabel()]);
  const edits = new Map(custom.map((p) => [p.slug, p]));
  const all = ALL_LANDINGS().filter((l) => !hidden.has(l.slug)).map((l) => (edits.has(l.slug) ? { ...l, h1: edits.get(l.slug)!.h1, description: edits.get(l.slug)!.description } : l));
  const builtSlugs = new Set(all.map((l) => l.slug));
  const extra = custom.filter((p) => !builtSlugs.has(p.slug) && !hidden.has(p.slug));
  const studioHrefs = new Set(STUDIO.map((s) => s.href.slice(1)));
  const makers = [...all.filter((l) => !l.seasonal && !l.lang && !l.country && !studioHrefs.has(l.slug)), ...extra.map((p) => ({ slug: p.slug, h1: p.h1, description: p.description }))];
  const countries = all.filter((l) => l.country);
  const seasonal = all.filter((l) => l.seasonal);
  const arabic = all.filter((l) => l.lang === 'ar');

  const Tile = ({ slug, h1, description }: { slug: string; h1: string; description: string }) => {
    const I = iconFor(slug);
    return (
      <li>
        <Link href={`/${slug}`} title={withCount(description, label)} className="group flex flex-col items-center text-center gap-2 rounded-2xl border border-mt-border bg-mt-surface p-4 h-full hover:border-mt-ink/30 hover:-translate-y-0.5 transition-all">
          <span className="grid place-items-center h-11 w-11 rounded-xl bg-mt-surface2 text-mt-ink group-hover:bg-mt-primary group-hover:text-mt-onprimary transition-colors"><I size={20} strokeWidth={1.8} /></span>
          <span className="text-[13px] font-semibold leading-tight">{shortName(slug)}</span>
          <span className="text-[11px] text-mt-faint -mt-1">{kindOf(slug)}</span>
          <span className="sr-only">{withCount(h1, label)}</span>
        </Link>
      </li>
    );
  };
  const grid = 'mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3';

  return (
    <SeoShell active="tools">
      <div className="mt-container py-6 sm:py-10">
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Free design tools</h1>
        <p className="mt-3 max-w-xl text-mt-muted">Pick a tool and start. Every feature is free, with print-ready downloads.</p>

        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STUDIO.map(({ href, name, note, icon: I, tint }) => (
            <li key={href}>
              <Link href={href} className="flex sm:flex-col items-center sm:items-start gap-3 rounded-2xl border border-mt-border bg-mt-surface p-4 h-full hover:-translate-y-0.5 transition-transform">
                <span className="grid place-items-center h-11 w-11 shrink-0 rounded-xl text-white" style={{ background: tint }}><I size={20} strokeWidth={1.9} /></span>
                <span><span className="block text-[14px] font-semibold leading-tight">{name}</span><span className="block text-[11.5px] text-mt-muted mt-0.5">{note}</span></span>
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-lg font-semibold">Makers</h2>
        <ul className={grid}>{makers.map((l) => <Tile key={l.slug} {...l} />)}</ul>

        <h2 className="mt-12 text-lg font-semibold inline-flex items-center gap-2"><CalendarHeart size={18} /> Seasonal & festivals</h2>
        <ul className={grid}>{seasonal.map((l) => <Tile key={l.slug} {...l} />)}</ul>

        <h2 className="mt-12 text-lg font-semibold inline-flex items-center gap-2"><Globe size={18} /> By country</h2>
        <ul className="mt-4 flex flex-wrap gap-2">{countries.map((l) => <li key={l.slug}><Link href={`/${l.slug}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-mt-border text-[13px] hover:bg-mt-surface2"><MapPin size={13} className="text-mt-faint" />{l.country}</Link></li>)}</ul>

        <h2 className="mt-12 text-lg font-semibold" lang="ar" dir="rtl">بالعربي</h2>
        <ul className={grid} lang="ar" dir="rtl">{arabic.map((l) => (
          <li key={l.slug}>
            <Link href={`/${l.slug}`} title={withCount(l.description, label)} className="flex flex-col items-center text-center gap-2 rounded-2xl border border-mt-border bg-mt-surface p-4 h-full hover:-translate-y-0.5 transition-transform">
              <span className="grid place-items-center h-11 w-11 rounded-xl bg-mt-surface2"><Languages size={20} strokeWidth={1.8} /></span>
              <span className="text-[13px] font-semibold leading-tight line-clamp-2">{withCount(l.h1, label)}</span>
            </Link>
          </li>
        ))}</ul>
      </div>
    </SeoShell>
  );
}
