'use client';

// Packaging start page: mockups, a short guide, the template gallery and a
// blank box. Every "Customise" opens the full design editor with the
// artwork as editable layers and the dieline as locked line layers; the
// Packaging panel in the editor keeps the box, line types and press files.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Box, FileDown, Layers, PenTool, Ruler, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { putHandoff, editorUrlForLocal, newLocalKey } from '@/lib/mtd/handoff';
import { PERSIST_PROPS } from '@/lib/editor/persist';
import { BOX_STYLES, type BoxStyleId } from '@/lib/packaging/dieline';
import { PACK_TEMPLATES, templateDieline, templateFlatSvg, templateMockupSvg, templateScene, type PackTemplate } from '@/lib/packaging/templates';
import { PAGE_MARGIN, PX, dieToFabric, pageSizePx, sceneToFabric, specDieline, type PackSpec } from '@/lib/packaging/editorBridge';
import { defaultSpec } from '@/components/editor/shell/panels/PackagingPanel';
import { gradeById } from '@/lib/packaging/board';
import { StyleThumb } from './StyleThumb';
import { BrandRibbon } from '@/components/home/BrandRibbon';

const FILTERS: { id: string; label: string; test: (t: PackTemplate) => boolean }[] = [
  { id: 'all', label: 'All designs', test: () => true },
  { id: 'carton', label: 'Folding cartons', test: (t) => ['rte', 'ste', 'seal'].includes(t.style) },
  { id: 'gift', label: 'Gift boxes & trays', test: (t) => t.style === 'traylid' || t.style === 'tray' || t.style === 'matchbox' },
  { id: 'sleeve', label: 'Sleeves', test: (t) => t.style === 'sleeve' },
  { id: 'ship', label: 'Shipping boxes', test: (t) => t.style === 'rsc' || t.style === 'hsc' || t.style === 'fol' },
];

function specFor(t: PackTemplate): PackSpec {
  const grade = t.t >= 3 ? 'bflute' : t.t >= 1.5 ? 'rigid' : 'sbs';
  const g = gradeById(grade);
  return { style: t.style, product: { L: t.L - 2, W: t.W - 2, H: t.D - 2 }, clearance: { L: 2, W: 2, H: 2 }, grade, gsm: grade === 'sbs' ? 400 : 0, t: t.t, glue: g.glue, tuck: 15, lidDepth: Math.min(t.D, 30) };
}

export function PackagingHub() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Previews are drawn in the browser (keeps the page light for visitors and search engines).
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { setReady(true); }, []);
  const list = useMemo(() => PACK_TEMPLATES.filter(FILTERS.find((f) => f.id === filter)!.test), [filter]);
  const showcase = useMemo(() => ['kids-toys-seal', 'tech-gadget-traylid', 'spice-sleeve', 'eco-reusable-hsc', 'wine-gift-rte', 'sweet-bakery-tray', 'candle-traylid', 'chocolate-sleeve'].map((id) => PACK_TEMPLATES.find((t) => t.id === id)!).filter(Boolean), []);
  const hero = useMemo(() => ['botanical-tea-rte', 'kraft-coffee-sleeve', 'luxe-cosmetics-rte'].map((id) => PACK_TEMPLATES.find((t) => t.id === id)!).filter(Boolean), []);

  /** Open a template (or a blank box) in the design editor. */
  const open = async (t: PackTemplate | null, style?: BoxStyleId) => {
    setErr(null); setBusy(t?.id || `blank-${style}`);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.push('/login?next=' + encodeURIComponent('/packaging-dieline')); return; }
      const mod: any = await import('fabric'); const F = mod.fabric;
      const spec = t ? specFor(t) : { ...defaultSpec(), style: style || 'rte' };
      if (!t && style && (style === 'rsc' || style === 'hsc' || style === 'fol')) Object.assign(spec, { grade: 'bflute', gsm: 0, t: 3, glue: 30, clearance: { L: 4, W: 4, H: 4 }, product: { L: 300, W: 200, H: 150 } });
      if (!t && style && (style === 'tray' || style === 'traylid' || style === 'matchbox')) Object.assign(spec, { grade: 'rigid', gsm: 0, t: 1.5, glue: 18, clearance: { L: 3, W: 3, H: 2 }, product: { L: 150, W: 100, H: 50 } });
      const die = t ? templateDieline(t) : specDieline(spec);
      const size = pageSizePx(die), origin = { x: PAGE_MARGIN * PX, y: PAGE_MARGIN * PX };
      const art = t ? sceneToFabric(F, templateScene(t), origin) : [];
      const objs = [...art, ...dieToFabric(F, die, origin, spec)];
      const canvas = { version: '5.1.0', background: '#FFFFFF', objects: objs.map((o) => { const j = o.toObject(PERSIST_PROPS); for (const k of ['__die', '__dieGen', '__pack']) if (o[k] !== undefined) j[k] = o[k]; return j; }) };
      const name = t ? t.name : `${BOX_STYLES.find((s) => s.id === spec.style)?.name || 'Box'} — new`;
      const key = newLocalKey();
      putHandoff(key, { opened: { document: { name, width: size.width, height: size.height, editor: 'design' }, canvas, fonts: [], thumbnail: null, template: null, missingAssets: [] } as any, file: { handle: null, fileName: `${name}.mtd` } } as any);
      router.push(`${editorUrlForLocal(key, size.width, size.height)}&panel=packaging`);
    } catch (e: any) { setErr(e?.message || 'Could not open the editor.'); setBusy(null); }
  };

  return (
    <div className="space-y-10">
      {/* Hero — the site's brand glow, gradient word and ribbon */}
      <section className="relative overflow-hidden rounded-2xl border border-mt-border bg-mt-surface">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[1100px] max-w-[160vw] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl mt-spectrum dark:opacity-[0.26]" />
        <BrandRibbon className="pointer-events-none absolute -bottom-10 left-1/2 hidden w-[1500px] max-w-none -translate-x-1/2 opacity-60 sm:block" />
        <div className="relative grid items-center gap-8 p-6 lg:grid-cols-[1fr_1.15fr] lg:p-10">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mt-muted">Packaging design studio</p>
            <h2 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-5xl">Design the box and its <span className="mt-spectrum-text">dieline</span> in one editor.</h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-mt-muted sm:text-lg">Start from a template or your product size. The full design editor opens on the real flat blank with text, shapes, images, patterns and layers, and the cut and crease lines locked on top.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" onClick={() => open(null, 'rte')} disabled={!!busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-mt-ink px-5 text-[14px] font-semibold text-mt-bg hover:opacity-90"><Box size={16} /> Start a blank box</button>
              <a href="#templates" className="inline-flex h-11 items-center gap-2 rounded-full border border-mt-border bg-mt-surface/80 px-5 text-[14px] font-semibold backdrop-blur hover:bg-mt-surface2">Browse {PACK_TEMPLATES.length} templates <ArrowRight size={15} /></a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-mt-muted">
              <li>✓ {BOX_STYLES.length} box structures</li><li>✓ mm · cm · inches</li><li>✓ Closure and crease checks</li><li>✓ Print PDF with spot die lines</li>
            </ul>
            {err && <p role="alert" className="mt-3 text-[13px] text-rose-600">{err}</p>}
          </div>
          <div className="grid grid-cols-3 items-end gap-3 rounded-xl border border-mt-border/70 bg-mt-bg/60 p-4 backdrop-blur">
            {hero.map((t) => (
              <figure key={t.id} className="flex flex-col items-center gap-2">
                <div className="aspect-[4/5] w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? templateMockupSvg(t) : '' }} />
                <div className="h-16 w-full opacity-90 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? templateFlatSvg(t) : '' }} />
                <figcaption className="text-center text-[11px] font-medium text-mt-muted">{BOX_STYLES.find((s) => s.id === t.style)?.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase: mockup and its dieline side by side */}
      <section aria-labelledby="pk-show">
        <div className="flex items-end justify-between gap-3">
          <h2 id="pk-show" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mt-faint">From dieline to finished box</h2>
          <a href="#templates" className="text-[12.5px] font-semibold text-mt-muted hover:text-mt-ink">All templates →</a>
        </div>
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {showcase.map((t) => (
            <li key={t.id} className="w-[300px] shrink-0 snap-start overflow-hidden rounded-xl border border-mt-border bg-mt-surface">
              <div className="grid h-40 grid-cols-2 gap-2 bg-mt-surface2/60 p-3">
                <div className="[&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? templateFlatSvg(t) : '' }} />
                <div className="[&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? templateMockupSvg(t) : '' }} />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{t.name}</p><p className="truncate text-[11px] text-mt-faint">{BOX_STYLES.find((s) => s.id === t.style)?.code}</p></div>
                <button type="button" onClick={() => open(t)} disabled={!!busy} className="h-8 shrink-0 rounded-full border border-mt-border px-3 text-[12px] font-semibold hover:bg-mt-surface2">Customise</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="pk-how">
        <h2 id="pk-how" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mt-faint">How it works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Ruler, t: 'Enter the product size', d: 'Length, width and height of what goes inside, and the board. A 2 mm fitting gap and the board thickness at every fold are added for you.' },
            { icon: Sparkles, t: 'Pick a template or style', d: 'Tuck end, seal end, sleeve, tray, gift box or shipping box — with a ready design, or blank.' },
            { icon: Layers, t: 'Design in the full editor', d: 'Text, fonts, shapes, images, patterns and layers on the flat blank. Draw windows or a unique outline and mark them as cut or crease.' },
            { icon: FileDown, t: 'Download press files', d: 'Print PDF (vector, CMYK, CutContour and Crease spot colours), a branded dieline template, DXF, and the .mtd project.' },
          ].map((s, i) => (
            <li key={s.t} className="rounded-xl border border-mt-border bg-mt-surface p-4">
              <span className="flex items-center gap-2 text-[12px] font-semibold text-mt-faint"><span className="grid h-6 w-6 place-items-center rounded-full bg-mt-ink text-[11px] text-mt-bg">{i + 1}</span><s.icon size={15} /></span>
              <p className="mt-2 text-[14px] font-semibold">{s.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-mt-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Templates */}
      <section id="templates" aria-labelledby="pk-tpl" className="scroll-mt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pk-tpl" className="text-xl font-semibold tracking-[-0.01em]">Packaging templates</h2>
            <p className="mt-1 text-[13px] text-mt-muted">Every design sits on a real dieline at its true size. Change the size later in the editor — the dieline follows.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {FILTERS.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`h-8 rounded-full px-3 text-[12.5px] font-semibold ${filter === f.id ? 'bg-mt-ink text-mt-bg' : 'border border-mt-border hover:bg-mt-surface2'}`}>{f.label}</button>)}
          </div>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t) => (
            <li key={t.id} onMouseEnter={() => setHover(t.id)} onMouseLeave={() => setHover((h) => (h === t.id ? null : h))} className="group overflow-hidden rounded-xl border border-mt-border bg-mt-surface">
              <div className="relative h-52 bg-mt-surface2/70 p-4">
                <div className="h-full w-full transition-opacity duration-200 group-hover:opacity-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? templateMockupSvg(t) : '' }} />
                <div className="absolute inset-0 p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: hover === t.id ? templateFlatSvg(t) : '' }} />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{t.name}</p>
                  <p className="truncate text-[11.5px] text-mt-faint">{BOX_STYLES.find((s) => s.id === t.style)?.name} · {t.L} × {t.W} × {t.D} mm</p>
                </div>
                <button type="button" onClick={() => open(t)} disabled={!!busy} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-mt-ink px-3 text-[12px] font-semibold text-mt-bg disabled:opacity-50"><PenTool size={13} /> {busy === t.id ? 'Opening…' : 'Customise'}</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Blank styles */}
      <section aria-labelledby="pk-blank">
        <h2 id="pk-blank" className="text-xl font-semibold tracking-[-0.01em]">Start from a blank style</h2>
        <p className="mt-1 text-[13px] text-mt-muted">Opens the editor with just the dieline. Set your product size in the Packaging panel.</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BOX_STYLES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => open(null, s.id)} disabled={!!busy} className="w-full rounded-xl border border-mt-border bg-mt-surface p-3 text-left hover:border-mt-ink/40">
                <span className="block text-mt-ink/80"><StyleThumb id={s.id} className="h-20 w-full" /></span>
                <span className="mt-2 block text-[13px] font-semibold">{s.name}</span>
                <span className="block text-[11.5px] text-mt-faint">{s.code} · {s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
