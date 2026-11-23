'use client';

// Textile start page: intro, garment sketches, a short guide, the template
// gallery and blank garments. Every "Customise" opens the full design
// editor with the pattern pieces as editable artwork and the cut line,
// stitch line, grain and notches as locked guides; the Textile panel in the
// editor keeps the garment, size, measurements and production files.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileDown, Layers, PenTool, Ruler, Shirt, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { putHandoff, editorUrlForLocal, newLocalKey } from '@/lib/mtd/handoff';
import { PERSIST_PROPS } from '@/lib/editor/persist';
import { GARMENTS, TEXTILE_TEMPLATES, TEX_KEYS, buildTextilePage, defaultTextileSpec, templateSpec, textileFlatSvg, textileSketchSvg, type GarmentId, type TextileTemplate } from '@/lib/textile/editorBridge';
import { PageHero } from '@/components/PageHero';

const FILTERS: { id: string; label: string; test: (t: TextileTemplate) => boolean }[] = [
  { id: 'all', label: 'All designs', test: () => true },
  { id: 'polo', label: 'Polos & T-shirts', test: (t) => t.garment === 'polo' || t.garment === 'tshirt' },
  { id: 'jersey', label: 'Team jerseys', test: (t) => t.garment === 'jersey' },
  { id: 'ethnic', label: 'Kurti, churidar & dupatta', test: (t) => t.garment === 'kurta' || t.garment === 'chudidar' || t.garment === 'dupatta' },
  { id: 'dress', label: 'Frocks & dresses', test: (t) => t.garment === 'frock' },
];

export function TextileHub() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => { setReady(true); }, []);
  const list = useMemo(() => TEXTILE_TEMPLATES.filter(FILTERS.find((f) => f.id === filter)!.test), [filter]);
  const hero = useMemo(() => ['polo-corporate', 'kurti-floral', 'jersey-hoops', 'frock-gathered'].map((id) => TEXTILE_TEMPLATES.find((t) => t.id === id)!).filter(Boolean), []);

  /** Open a template (or a blank garment) in the design editor. */
  const open = async (t: TextileTemplate | null, garment?: GarmentId) => {
    setErr(null); setBusy(t?.id || `blank-${garment}`);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session && process.env.NEXT_PUBLIC_E2E !== '1') { router.push('/login?next=' + encodeURIComponent('/textile-studio')); return; }
      const mod: any = await import('fabric'); const F = mod.fabric;
      const spec = t ? templateSpec(t) : defaultTextileSpec(garment || 'polo');
      const { size, objs } = buildTextilePage(F, spec, t);
      const canvas = { version: '5.1.0', background: '#FFFFFF', objects: objs.map((o: any) => { const j = o.toObject(PERSIST_PROPS); for (const k of TEX_KEYS) if (o[k] !== undefined) j[k] = o[k]; return j; }) };
      const name = t ? t.name : `${GARMENTS.find((g) => g.id === spec.garment)?.name || 'Garment'} — new`;
      const key = newLocalKey();
      putHandoff(key, { opened: { document: { name, width: size.width, height: size.height, editor: 'design' }, canvas, fonts: [], thumbnail: null, template: null, missingAssets: [] } as any, file: { handle: null, fileName: `${name}.mtd` } } as any);
      router.push(`${editorUrlForLocal(key, size.width, size.height)}&panel=textile`);
    } catch (e: any) { setErr(e?.message || 'Could not open the editor.'); setBusy(null); }
  };

  return (
    <div>
      <PageHero align="center" eyebrow="Textile design" title="Design garments on real pattern pieces." accent="pattern pieces"
        subtitle="Polo, T-shirt, jersey, kurti, churidar, frock and dupatta — drafted from a size or your measurements, designed in the full editor.">
        <div className="flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={() => open(null, 'polo')} disabled={!!busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-mt-ink px-5 text-[14px] font-semibold text-mt-bg hover:opacity-90"><Shirt size={16} /> Start a blank garment</button>
          <a href="#templates" className="inline-flex h-11 items-center gap-2 rounded-full border border-mt-border bg-mt-surface px-5 text-[14px] font-semibold hover:bg-mt-surface2">Browse {TEXTILE_TEMPLATES.length} templates <ArrowRight size={15} /></a>
        </div>
        {err && <p role="alert" className="mt-3 text-[13px] text-rose-600">{err}</p>}
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 items-end gap-4 lg:grid-cols-4">
          {hero.map((t) => (
            <figure key={t.id} className="flex flex-col items-center gap-1.5">
              <div className="aspect-[16/10] w-full rounded-xl bg-white/70 p-2 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? textileSketchSvg(t) : '' }} />
              <figcaption className="text-[11.5px] font-medium text-mt-muted">{GARMENTS.find((g) => g.id === t.garment)?.name}</figcaption>
            </figure>
          ))}
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1400px] space-y-10 px-4 pt-8 sm:px-6">
        <section aria-labelledby="tx-how">
          <h2 id="tx-how" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mt-faint">How it works</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Ruler, t: 'Choose size or measure', d: 'Ready sizes XS–3XL, or your own body measurements in cm (bust, waist, hip, shoulder, lengths, armhole). The pieces are drafted from them.' },
              { icon: Sparkles, t: 'Pick a template or garment', d: 'Polo, T-shirt, jersey, kurti, churidar, frock or dupatta — with a ready design, or blank.' },
              { icon: Layers, t: 'Design on the pieces', d: 'Text, fonts, shapes, images, patterns and layers on the front, back, sleeves and collar. Artwork stays on its piece when the size changes.' },
              { icon: FileDown, t: 'Download production files', d: 'Print PDF (CMYK, cut line as a spot colour), full-size and A4 tiled pattern PDFs, DXF, fabric length and the .mtd project.' },
            ].map((s, i) => (
              <li key={s.t} className="rounded-xl border border-mt-border bg-mt-surface p-4">
                <span className="flex items-center gap-2 text-[12px] font-semibold text-mt-faint"><span className="grid h-6 w-6 place-items-center rounded-full bg-mt-ink text-[11px] text-mt-bg">{i + 1}</span><s.icon size={15} /></span>
                <p className="mt-2 text-[14px] font-semibold">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-mt-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="templates" aria-labelledby="tx-tpl" className="scroll-mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="tx-tpl" className="text-xl font-semibold tracking-[-0.01em]">Garment templates</h2>
              <p className="mt-1 text-[13px] text-mt-muted">Each design sits on drafted pattern pieces with seam allowance. Hover to see the pieces.</p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {FILTERS.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`h-8 rounded-full px-3 text-[12.5px] font-semibold ${filter === f.id ? 'bg-mt-ink text-mt-bg' : 'border border-mt-border hover:bg-mt-surface2'}`}>{f.label}</button>)}
            </div>
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((t) => (
              <li key={t.id} onMouseEnter={() => setHover(t.id)} onMouseLeave={() => setHover((h) => (h === t.id ? null : h))} className="group overflow-hidden rounded-xl border border-mt-border bg-mt-surface">
                <div className="relative h-56 bg-mt-surface2/70 p-4">
                  <div className="h-full w-full transition-opacity duration-200 group-hover:opacity-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? textileSketchSvg(t) : '' }} />
                  <div className="absolute inset-0 p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: hover === t.id ? textileFlatSvg(t) : '' }} />
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold">{t.name}</p>
                    <p className="truncate text-[11.5px] text-mt-faint">{GARMENTS.find((g) => g.id === t.garment)?.name} · {t.theme.name}</p>
                  </div>
                  <button type="button" onClick={() => open(t)} disabled={!!busy} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-mt-ink px-3 text-[12px] font-semibold text-mt-bg disabled:opacity-50"><PenTool size={13} /> {busy === t.id ? 'Opening…' : 'Customise'}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tx-blank">
          <h2 id="tx-blank" className="text-xl font-semibold tracking-[-0.01em]">Start from a blank garment</h2>
          <p className="mt-1 text-[13px] text-mt-muted">Opens the editor with plain pattern pieces in size M (or a sample body). Change the size or measurements in the Textile panel.</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {GARMENTS.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => open(null, g.id)} disabled={!!busy} className="h-full w-full rounded-xl border border-mt-border bg-mt-surface p-3 text-left hover:border-mt-ink/40">
                  <span className="block h-20 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: ready ? textileSketchSvg({ id: `blank-${g.id}`, name: g.name, garment: g.id, theme: { id: 'blank', name: 'Blank', body: '#e5e7eb', trim: '#94a3b8', accent: '#94a3b8', motif: 'none', motifColour: '#000' } }) : '' }} />
                  <span className="mt-2 block text-[13px] font-semibold">{busy === `blank-${g.id}` ? 'Opening…' : g.name}</span>
                  <span className="block text-[11.5px] text-mt-faint">{g.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}
