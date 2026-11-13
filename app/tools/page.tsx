import type { Metadata } from 'next';
import Link from 'next/link';
import { Brush, FileDown, Languages, Layers, Maximize2, PenTool, QrCode, Shapes, Sparkles, SwatchBook, Type, Wand2 } from 'lucide-react';
import { SeoShell, Crumbs } from '@/components/seo/SeoShell';
import { ToolsDirectory } from '@/components/tools/ToolsDirectory';
import { TOOLS } from '@/lib/toolsCatalog';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';

// One place for every creative tool: standalone tools and what the editor
// can do. (Landing pages for “flyer maker” etc. live on /free-design-tools.)
const TITLE = 'Creative Tools — Vector, Photo, Pattern & Colour';
const DESC = 'Free design tools in one place: image to vector, pattern maker, colour palettes, passport photo maker, rangoli maker, gradient backgrounds, print size calculator, photo editor and background remover.';
const URL = `${SITE_URL}/tools`;

export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: URL },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

const EDITOR: { icon: any; title: string; body: string }[] = [
  { icon: PenTool, title: 'Pen & edit points', body: 'Draw Bézier paths, then move anchors and handles.' },
  { icon: Shapes, title: 'Pathfinder & shape builder', body: 'Unite, subtract, intersect and exclude shapes.' },
  { icon: Brush, title: 'Brushes & freehand', body: 'Pressure-style strokes that stay vector.' },
  { icon: Layers, title: 'Layers & clipping masks', body: 'Group, lock, reorder and clip photos into shapes.' },
  { icon: Type, title: 'Typography', body: 'Fonts, spacing, curved text, outlines, shadows and effects.' },
  { icon: SwatchBook, title: 'Brand kit', body: 'Your logo, colours and fonts on every design.' },
  { icon: Languages, title: 'Translate designs', body: 'Translate the words of a design into 37 languages.' },
  { icon: Maximize2, title: 'Magic resize', body: 'Turn one design into a post, story, flyer or banner.' },
  { icon: QrCode, title: 'QR codes', body: 'Branded QR codes for menus, flyers and cards.' },
  { icon: FileDown, title: 'Print-ready export', body: 'CMYK PDF with bleed and crop marks, PNG, JPG, WebP, SVG, MP4.' },
  { icon: Sparkles, title: 'Animation', body: 'Animate pages and export short MP4 videos.' },
  { icon: Wand2, title: 'Self-opening files', body: 'Save a design file; double-click it to reopen in the editor.' },
];

export default function ToolsPage() {
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.title, description: t.body, url: `${SITE_URL}${t.href}` })) };
  return (
    <SeoShell active="tools">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="mt-container py-6 sm:py-10">
        <Crumbs items={[{ href: '/', label: 'Home' }, { label: 'Tools' }]} />
        <header className="mt-4 max-w-3xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">Creative tools</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">Every tool a designer needs</h1>
          <p className="mt-3 text-lg text-mt-muted leading-relaxed">Professional vector, photo, pattern and colour tools — free, in your browser, and connected to the same editor.</p>
        </header>

        <ToolsDirectory />

        <section className="mt-16" aria-labelledby="editor-tools">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#3B82C4]">Inside the editor</p>
              <h2 id="editor-tools" className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-tight">Professional features, ready in every design</h2>
            </div>
            <Link href="/create" className="h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center">Open the editor</Link>
          </div>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-mt-border bg-mt-border sm:grid-cols-2 lg:grid-cols-4">
            {EDITOR.map((f) => (
              <li key={f.title} className="bg-mt-surface p-5">
                <f.icon size={20} className="text-[#3B82C4]" aria-hidden />
                <h3 className="mt-3 text-[15px] font-semibold">{f.title}</h3>
                <p className="mt-1 text-[13px] text-mt-muted leading-relaxed">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-[14px] text-mt-muted">Looking for a ready-made starting point? See the <Link href="/free-design-tools" className="font-semibold text-mt-ink underline underline-offset-2">flyer, poster, invitation and resume makers</Link> or browse <Link href="/templates" className="font-semibold text-mt-ink underline underline-offset-2">all templates</Link>.</p>
      </div>
    </SeoShell>
  );
}
