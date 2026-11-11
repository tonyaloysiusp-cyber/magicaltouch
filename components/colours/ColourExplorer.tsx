'use client';

// Colour Explorer — pick a colour or a mood, get harmonies with HEX, RGB
// and CMYK, check contrast, save palettes, send a palette to Pattern Studio
// and find templates in similar colours.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Grid3x3, Heart, Search, Trash2 } from 'lucide-react';
import { HARMONIES, Harmony, MOOD_PALETTES, Mood, contrast, harmony, hexToRgb, luminance, normHex, readableOn, rgbToCmyk } from '@/lib/colour';

const SAVED = 'mt:palettes';
const load = (): string[][] => { try { return JSON.parse(localStorage.getItem(SAVED) || '[]'); } catch { return []; } };
const keep = (v: string[][]) => { try { localStorage.setItem(SAVED, JSON.stringify(v)); } catch {} };
const MOODS: Mood[] = ['warm', 'cool', 'pastel', 'earthy', 'neon', 'luxury'];
type Found = { slug: string; name: string; thumbnail: string | null; colors: string[] };

function Swatch({ hex, onCopy, copied }: { hex: string; onCopy: (t: string) => void; copied: string | null }) {
  const rgb = hexToRgb(hex), cmyk = rgbToCmyk(rgb), ink = readableOn(hex);
  return (
    <li className="min-w-0 rounded-2xl overflow-hidden border border-mt-border bg-mt-surface">
      <button type="button" onClick={() => onCopy(hex)} className="block w-full h-28 sm:h-36 text-left p-3 relative" style={{ background: hex, color: ink }} aria-label={`Copy ${hex}`}>
        <span className="absolute right-2 top-2 opacity-70">{copied === hex ? <Check size={15} /> : <Copy size={15} />}</span>
        <span className="absolute left-3 bottom-2 text-[15px] font-semibold tracking-wide">{hex}</span>
      </button>
      <dl className="px-3 py-2.5 text-[11.5px] text-mt-muted space-y-0.5 tabular-nums">
        <div className="flex justify-between"><dt>RGB</dt><dd className="text-mt-ink">{rgb.join(', ')}</dd></div>
        <div className="flex justify-between"><dt>CMYK</dt><dd className="text-mt-ink">{cmyk.join(' ')}</dd></div>
      </dl>
    </li>
  );
}

export function ColourExplorer() {
  const [base, setBase] = useState('#3B82C4');
  const [input, setInput] = useState('#3B82C4');
  const [kind, setKind] = useState<Harmony>('analogous');
  const [mood, setMood] = useState<Mood>('cool');
  const [saved, setSaved] = useState<string[][]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => setSaved(load()), []);
  const palette = useMemo(() => harmony(base, kind), [base, kind]);

  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch {} setCopied(t); setTimeout(() => setCopied(null), 1400); };
  const savePalette = (cols: string[]) => { const next = [cols, ...saved.filter((s) => s.join() !== cols.join())].slice(0, 30); setSaved(next); keep(next); };
  const removePalette = (i: number) => { const next = saved.filter((_, k) => k !== i); setSaved(next); keep(next); };
  const toPattern = (cols: string[]) => {
    try {
      const cur = JSON.parse(localStorage.getItem('mt:pattern-draft') || '{}');
      localStorage.setItem('mt:pattern-draft', JSON.stringify({ ...cur, colors: cols.slice(0, 3), background: cols[cols.length - 1] }));
    } catch {}
    window.location.href = '/patterns';
  };

  const findTemplates = async (cols: string[]) => {
    setSearching(true);
    try {
      const q = cols.slice(0, 2).map((c) => 'hex=' + encodeURIComponent(c.replace('#', ''))).join('&');
      const r = await fetch(`/api/colour-search?${q}&limit=24`);
      const j = await r.json();
      setFound(j.templates || []);
      setTimeout(() => document.getElementById('found')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch { setFound([]); }
    setSearching(false);
  };

  const apply = (v: string) => { setInput(v); const n = normHex(v); if (n) setBase(n); };
  const byLum = [...palette].sort((a, b) => luminance(a) - luminance(b));
  const ratio = contrast(byLum[0], byLum[byLum.length - 1]);

  return (
    <div className="space-y-12">
      {/* Picker + harmony */}
      <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-[12px] text-mt-muted">Your colour</span>
            <span className="mt-1 flex items-center gap-2">
              <input type="color" value={base} onChange={(e) => apply(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-mt-border bg-transparent" aria-label="Pick a colour" />
              <input value={input} onChange={(e) => apply(e.target.value)} className="h-11 w-32 rounded-xl border border-mt-border bg-mt-bg px-3 font-mono text-[14px] uppercase" aria-label="HEX colour" />
            </span>
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Harmony">
            {HARMONIES.map((h) => (
              <button key={h.id} role="radio" aria-checked={kind === h.id} onClick={() => setKind(h.id)} className={`h-11 px-4 rounded-full border text-[13px] font-medium ${kind === h.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`}>{h.label}</button>
            ))}
          </div>
        </div>
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {palette.map((c, i) => <Swatch key={c + i} hex={c} onCopy={copy} copied={copied} />)}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => savePalette(palette)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Heart size={15} /> Save palette</button>
          <button onClick={() => copy(palette.join(', '))} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Copy size={15} /> Copy HEX codes</button>
          <button onClick={() => toPattern(palette)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Grid3x3 size={15} /> Make a pattern</button>
          <button onClick={() => findTemplates([base, palette[2]])} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2"><Search size={15} /> {searching ? 'Searching…' : 'Find templates in these colours'}</button>
          <span className="text-[13px] text-mt-muted">Contrast darkest/lightest: <b className={ratio >= 4.5 ? 'text-emerald-600' : 'text-amber-600'}>{ratio.toFixed(1)}:1</b> {ratio >= 4.5 ? '— fine for text' : '— use for shapes, not small text'}</span>
        </div>
      </section>

      {/* Moods */}
      <section aria-labelledby="moods">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="moods" className="text-2xl font-semibold tracking-tight">Palettes by mood</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mood">
            {MOODS.map((m) => <button key={m} role="radio" aria-checked={mood === m} onClick={() => setMood(m)} className={`h-9 px-4 rounded-full border text-[13px] font-medium capitalize ${mood === m ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{m}</button>)}
          </div>
        </div>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {MOOD_PALETTES.filter((p) => p.mood === mood).map((p) => (
            <li key={p.name} className="rounded-3xl border border-mt-border bg-mt-surface overflow-hidden">
              <div className="flex h-28">{p.colors.map((c) => <button key={c} onClick={() => copy(c)} className="flex-1 relative" style={{ background: c, color: readableOn(c) }} aria-label={`Copy ${c}`}><span className="absolute bottom-2 left-0 right-0 text-center text-[11px] font-semibold">{copied === c ? 'Copied' : c}</span></button>)}</div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <span className="font-semibold">{p.name}</span>
                <span className="flex gap-2">
                  <button onClick={() => savePalette(p.colors)} className="h-9 w-9 rounded-full border border-mt-border grid place-items-center" aria-label={`Save ${p.name}`}><Heart size={14} /></button>
                  <button onClick={() => toPattern(p.colors)} className="h-9 w-9 rounded-full border border-mt-border grid place-items-center" aria-label={`Make a pattern with ${p.name}`}><Grid3x3 size={14} /></button>
                  <button onClick={() => findTemplates(p.colors)} className="h-9 px-3 rounded-full border border-mt-border text-[13px] font-medium inline-flex items-center gap-1.5"><Search size={13} /> Templates</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {saved.length > 0 && (
        <section aria-labelledby="saved">
          <h2 id="saved" className="text-2xl font-semibold tracking-tight">Saved on this device</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((cols, i) => (
              <li key={i} className="flex items-center gap-2 rounded-2xl border border-mt-border bg-mt-surface p-2">
                <button onClick={() => { apply(cols[0]); }} className="flex flex-1 h-12 rounded-xl overflow-hidden" aria-label="Use this palette">{cols.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</button>
                <button onClick={() => findTemplates(cols)} className="h-9 w-9 rounded-full border border-mt-border grid place-items-center" aria-label="Find templates"><Search size={14} /></button>
                <button onClick={() => removePalette(i)} className="h-9 w-9 rounded-full border border-mt-border grid place-items-center" aria-label="Delete palette"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {found && (
        <section id="found" aria-labelledby="found-title" className="scroll-mt-24">
          <h2 id="found-title" className="text-2xl font-semibold tracking-tight">Templates in similar colours</h2>
          {found.length === 0 ? <p className="mt-3 text-mt-muted">No templates found. Try another colour.</p> : (
            <ul className="mt-5 columns-2 sm:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
              {found.map((t) => (
                <li key={t.slug} className="mb-4 break-inside-avoid">
                  <Link href={`/templates/${t.slug}`} className="group block rounded-2xl border border-mt-border bg-mt-surface overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {t.thumbnail && <img src={t.thumbnail} alt={t.name} loading="lazy" className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]" />}
                    <span className="flex items-center gap-2 p-3">
                      <span className="flex -space-x-1">{t.colors.map((c) => <i key={c} className="h-4 w-4 rounded-full ring-2 ring-mt-surface" style={{ background: c }} />)}</span>
                      <span className="truncate text-[13px] font-medium">{t.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
