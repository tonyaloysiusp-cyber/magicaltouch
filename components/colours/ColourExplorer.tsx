'use client';

// Colour Explorer — find colours that work together. A colour wheel with
// HEX, RGB and HSL controls; six harmonies with HEX, RGB and CMYK for every
// swatch; a contrast checker with WCAG grades; a gradient builder; ten
// collections of named palettes; saving and exporting palettes (CSS, JSON,
// Adobe .ase, GIMP/Inkscape .gpl); and one tap to use a palette in the
// editor, in Pattern Studio or to find templates in those colours.
// Every number is calculated, not guessed.

import { PaletteGenerator } from './PaletteGenerator';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Download, Grid3x3, Heart, PenSquare, Plus, Search, Trash2, X } from 'lucide-react';
import {
  COLLECTIONS, Collection, GradientStop, HARMONIES, Harmony, PALETTES, contrastGrades, gradientCss, gradientSvg, harmony, hexToRgb, hsl, hsToWheel,
  normHex, paletteAse, paletteCss, paletteGpl, paletteJson, readableOn, rgbToCmyk, rgbToHex, rgbToHsl, wheelToHs,
} from '@/lib/colour';

const SAVED = 'mt:palettes';
const load = (): string[][] => { try { return JSON.parse(localStorage.getItem(SAVED) || '[]'); } catch { return []; } };
const keep = (v: string[][]) => { try { localStorage.setItem(SAVED, JSON.stringify(v)); } catch {} };
type Found = { slug: string; name: string; thumbnail: string | null; colors: string[] };

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function Swatch({ hex, onCopy, copied }: { hex: string; onCopy: (t: string) => void; copied: string | null }) {
  const rgb = hexToRgb(hex), cmyk = rgbToCmyk(rgb), h = rgbToHsl(rgb).map((v) => Math.round(v)), ink = readableOn(hex);
  const rows: [string, string][] = [['HEX', hex], ['RGB', `rgb(${rgb.join(', ')})`], ['HSL', `hsl(${h[0]}, ${h[1]}%, ${h[2]}%)`], ['CMYK', `${cmyk.join(' ')}`]];
  return (
    <li className="min-w-0 rounded-2xl overflow-hidden border border-mt-border bg-mt-surface">
      <button type="button" onClick={() => onCopy(hex)} className="block w-full h-24 sm:h-28 text-left p-3 relative" style={{ background: hex, color: ink }} aria-label={`Copy ${hex}`}>
        <span className="absolute right-2 top-2 opacity-70">{copied === hex ? <Check size={15} /> : <Copy size={15} />}</span>
        <span className="absolute left-3 bottom-2 text-[15px] font-semibold tracking-wide">{hex}</span>
      </button>
      <div className="px-2.5 py-2 text-[11px] text-mt-muted space-y-0.5 tabular-nums">
        {rows.slice(1).map(([k, v]) => (
          <button key={k} type="button" onClick={() => onCopy(v)} className="flex w-full justify-between gap-2 rounded px-0.5 hover:bg-mt-surface2" title={`Copy ${k}`}>
            <span>{k}</span><span className="text-mt-ink truncate">{copied === v ? 'Copied' : v.replace(/^rgb\(|^hsl\(|\)$/g, '')}</span>
          </button>
        ))}
      </div>
    </li>
  );
}

function Wheel({ base, onPick, dots }: { base: string; onPick: (hex: string) => void; dots: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h0, s0, l0] = rgbToHsl(hexToRgb(base));
  const pick = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = ((e.clientY - r.top) / r.height) * 2 - 1;
    const { h, s } = wheelToHs(x, y);
    onPick(hsl(h, s, Math.min(70, Math.max(30, l0))));
  };
  return (
    <div ref={ref} role="slider" aria-label="Colour wheel" aria-valuetext={base} tabIndex={0}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); pick(e); }} onPointerMove={(e) => { if (e.buttons) pick(e); }}
      onKeyDown={(e) => { const d = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0; if (d) { e.preventDefault(); onPick(hsl((h0 + d + 360) % 360, s0, l0)); } }}
      className="relative aspect-square w-full max-w-[220px] rounded-full touch-none cursor-crosshair shadow-inner"
      style={{ background: 'radial-gradient(circle closest-side, #fff, rgba(255,255,255,0)), conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
      {dots.map((c, i) => {
        const [h, s] = rgbToHsl(hexToRgb(c));
        const p = hsToWheel(h, s);
        return <span key={c + i} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow ${i === 0 ? 'h-5 w-5' : 'h-3.5 w-3.5'}`} style={{ left: `${50 + p.x * 50}%`, top: `${50 + p.y * 50}%`, background: c }} />;
      })}
    </div>
  );
}

export function ColourExplorer() {
  const [base, setBase] = useState('#3B82C4');
  const [input, setInput] = useState('#3B82C4');
  const [kind, setKind] = useState<Harmony>('analogous');
  const [coll, setColl] = useState<Collection>('corporate');
  const [saved, setSaved] = useState<string[][]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [fg, setFg] = useState('#0B2545');
  const [bg, setBg] = useState('#F5F7FA');
  const [stops, setStops] = useState<GradientStop[]>([{ color: '#FF5F6D', at: 0 }, { color: '#FFC371', at: 100 }]);
  const [angle, setAngle] = useState(135);
  const [gKind, setGKind] = useState<'linear' | 'radial'>('linear');

  useEffect(() => setSaved(load()), []);
  const palette = useMemo(() => harmony(base, kind), [base, kind]);
  const rgb = hexToRgb(base);
  const [hh, ss, ll] = rgbToHsl(rgb).map((v) => Math.round(v));

  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch {} setCopied(t); setTimeout(() => setCopied(null), 1400); };
  const savePalette = (cols: string[]) => { const next = [cols, ...saved.filter((s) => s.join() !== cols.join())].slice(0, 40); setSaved(next); keep(next); };
  const removePalette = (i: number) => { const next = saved.filter((_, k) => k !== i); setSaved(next); keep(next); };
  const toPattern = (cols: string[]) => {
    try { const cur = JSON.parse(localStorage.getItem('mt:pattern-draft') || '{}'); localStorage.setItem('mt:pattern-draft', JSON.stringify({ ...cur, colors: cols.slice(0, 3), background: cols[cols.length - 1] })); } catch {}
    window.location.href = '/patterns';
  };
  // The editor's Colours panel lists saved palettes; save it there and open a new design.
  const toEditor = (cols: string[]) => { savePalette(cols); window.location.href = '/editor?w=1080&h=1080&panel=colours'; };
  const exportAs = (cols: string[], fmt: 'css' | 'json' | 'ase' | 'gpl', name = 'Magical Touch palette') => {
    const file = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (fmt === 'css') save(new Blob([paletteCss(cols, file)], { type: 'text/css' }), `${file}.css`);
    if (fmt === 'json') save(new Blob([paletteJson(cols, name)], { type: 'application/json' }), `${file}.json`);
    if (fmt === 'gpl') save(new Blob([paletteGpl(cols, name)], { type: 'text/plain' }), `${file}.gpl`);
    if (fmt === 'ase') save(new Blob([paletteAse(cols, name) as BlobPart], { type: 'application/octet-stream' }), `${file}.ase`);
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
  const setRgb = (i: number, v: number) => { const c = [...rgb] as [number, number, number]; c[i] = Math.max(0, Math.min(255, v || 0)); apply(rgbToHex(c)); };
  const setHsl = (i: number, v: number) => { const c = [hh, ss, ll]; c[i] = v; apply(hsl(c[0], c[1], c[2])); };
  const grades = contrastGrades(fg, bg);
  const css = gradientCss(stops, angle, gKind);
  const ExportMenu = ({ cols, name }: { cols: string[]; name?: string }) => (
    <details className="relative">
      <summary className="list-none h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2 cursor-pointer"><Download size={15} /> Export</summary>
      <div className="absolute z-20 mt-1 w-56 rounded-2xl border border-mt-border bg-mt-surface p-1.5 shadow-lg">
        {([['css', 'CSS variables'], ['json', 'JSON (HEX, RGB, CMYK, HSL)'], ['ase', 'Adobe swatches (.ase)'], ['gpl', 'GIMP / Inkscape (.gpl)']] as const).map(([f, l]) => <button key={f} type="button" onClick={() => exportAs(cols, f, name)} className="block w-full text-left rounded-xl px-3 py-2 text-[13px] hover:bg-mt-surface2">{l}</button>)}
      </div>
    </details>
  );
  const numIn = 'h-9 w-16 rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px] tabular-nums';

  return (
    <div className="space-y-12">
      <PaletteGenerator onSave={savePalette} onEditor={toEditor} onPattern={toPattern} onTemplates={findTemplates} exportMenu={(c) => <ExportMenu cols={c} />} />
      {/* Picker + harmony */}
      <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-7">
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <Wheel base={base} onPick={apply} dots={palette} />
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block"><span className="text-[12px] text-mt-muted">Your colour</span>
                <span className="mt-1 flex items-center gap-2">
                  <input type="color" value={base} onChange={(e) => apply(e.target.value)} className="h-10 w-12 cursor-pointer rounded-xl border border-mt-border bg-transparent" aria-label="Pick a colour" />
                  <input value={input} onChange={(e) => apply(e.target.value)} className="h-10 w-28 rounded-xl border border-mt-border bg-mt-bg px-3 font-mono text-[14px] uppercase" aria-label="HEX colour" />
                </span>
              </label>
              <div className="flex gap-1.5 items-end">{(['R', 'G', 'B'] as const).map((k, i) => <label key={k} className="text-[11px] text-mt-muted">{k}<input type="number" min={0} max={255} value={rgb[i]} onChange={(e) => setRgb(i, Number(e.target.value))} className={`${numIn} block mt-1`} aria-label={`${k} value`} /></label>)}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {([['Hue', 0, 359, '°'], ['Saturation', 1, 100, '%'], ['Lightness', 2, 100, '%']] as const).map(([l, i, max, u]) => (
                <label key={l} className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>{l}</span><span className="text-mt-ink tabular-nums">{[hh, ss, ll][i]}{u}</span></span>
                  <input type="range" min={0} max={max} value={[hh, ss, ll][i]} onChange={(e) => setHsl(i, Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Harmony">
              {HARMONIES.map((h) => <button key={h.id} role="radio" aria-checked={kind === h.id} onClick={() => setKind(h.id)} className={`h-9 px-3.5 rounded-full border text-[13px] font-medium ${kind === h.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`}>{h.label}</button>)}
            </div>
          </div>
        </div>
        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">{palette.map((c, i) => <Swatch key={c + i} hex={c} onCopy={copy} copied={copied} />)}</ul>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button onClick={() => savePalette(palette)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Heart size={15} /> Save</button>
          <button onClick={() => copy(palette.join(', '))} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Copy size={15} /> Copy HEX</button>
          <ExportMenu cols={palette} name={`${HARMONIES.find((h) => h.id === kind)!.label} ${base}`} />
          <button onClick={() => toEditor(palette)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><PenSquare size={15} /> Use in the editor</button>
          <button onClick={() => toPattern(palette)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Grid3x3 size={15} /> Make a pattern</button>
          <button onClick={() => findTemplates([base, palette[2]])} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2"><Search size={15} /> {searching ? 'Searching…' : 'Templates in these colours'}</button>
        </div>
      </section>

      {/* Contrast checker */}
      <section aria-labelledby="contrast" className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-7">
        <h2 id="contrast" className="text-2xl font-semibold tracking-tight">Contrast checker</h2>
        <p className="mt-1 text-[14px] text-mt-muted">Will the text be readable? Ratios follow the WCAG 2 accessibility guidelines.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-3">
            {([['Text colour', fg, setFg], ['Background', bg, setBg]] as const).map(([l, v, fn]) => (
              <label key={l} className="block text-[12px] text-mt-muted">{l}<span className="mt-1 flex gap-2"><input type="color" value={v} onChange={(e) => fn(e.target.value.toUpperCase())} className="h-10 w-12 rounded-xl border border-mt-border bg-transparent" /><input value={v} onChange={(e) => { const n = normHex(e.target.value); if (n) fn(n); }} className="h-10 flex-1 rounded-xl border border-mt-border bg-mt-bg px-3 font-mono text-[14px] uppercase" /></span></label>
            ))}
            <button type="button" onClick={() => { setFg(bg); setBg(fg); }} className="text-[13px] font-semibold underline underline-offset-2">Swap colours</button>
          </div>
          <div className="rounded-2xl border border-mt-border p-5" style={{ background: bg, color: fg }}>
            <p className="text-[28px] font-bold leading-tight">Large heading text</p>
            <p className="mt-2 text-[15px] leading-relaxed">Normal body text for paragraphs, captions and buttons. The quick brown fox jumps over the lazy dog.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold">
              <span className="rounded-full px-3 py-1" style={{ background: fg, color: bg }}>{grades.ratio.toFixed(2)} : 1</span>
              {([['AA normal text', grades.aaNormal], ['AA large text', grades.aaLarge], ['AAA normal text', grades.aaaNormal], ['AAA large text', grades.aaaLarge]] as const).map(([l, ok]) => <span key={l} className={`rounded-full px-3 py-1 ${ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{ok ? '✓' : '✗'} {l}</span>)}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-mt-muted">{grades.aaNormal ? 'Good for all text sizes.' : grades.aaLarge ? 'Fine for large headings (24 px+ or 19 px bold), too low for small text.' : 'Too low for text — darken the text or lighten the background.'}</p>
      </section>

      {/* Gradient builder */}
      <section aria-labelledby="grad" className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-7">
        <h2 id="grad" className="text-2xl font-semibold tracking-tight">Gradient builder</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="h-48 sm:h-64 rounded-2xl border border-mt-border" style={{ background: css }} role="img" aria-label="Gradient preview" />
          <div className="space-y-3">
            <div className="flex gap-1.5">{(['linear', 'radial'] as const).map((k) => <button key={k} type="button" aria-pressed={gKind === k} onClick={() => setGKind(k)} className={`h-8 px-3 rounded-full border text-[12.5px] font-medium capitalize ${gKind === k ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{k}</button>)}</div>
            {gKind === 'linear' && <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Angle</span><span className="text-mt-ink">{angle}°</span></span><input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>}
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={s.color} onChange={(e) => setStops(stops.map((x, k) => (k === i ? { ...x, color: e.target.value.toUpperCase() } : x)))} className="h-8 w-10 rounded-md border border-mt-border bg-transparent" aria-label={`Stop ${i + 1} colour`} />
                <input type="range" min={0} max={100} value={s.at} onChange={(e) => setStops(stops.map((x, k) => (k === i ? { ...x, at: Number(e.target.value) } : x)))} className="flex-1 accent-[#3B82C4]" aria-label={`Stop ${i + 1} position`} />
                <span className="w-9 text-right text-[12px] tabular-nums">{s.at}%</span>
                <button type="button" disabled={stops.length <= 2} onClick={() => setStops(stops.filter((_, k) => k !== i))} aria-label="Remove stop" className="h-7 w-7 grid place-items-center rounded-full hover:bg-mt-surface2 disabled:opacity-30"><X size={13} /></button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={stops.length >= 6} onClick={() => setStops([...stops, { color: palette[stops.length % palette.length], at: 50 }])} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1 disabled:opacity-40"><Plus size={13} /> Add stop</button>
              <button type="button" onClick={() => setStops(palette.slice(0, 3).map((c, i) => ({ color: c, at: i * 50 })))} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold">From palette</button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 truncate rounded-xl bg-mt-bg px-3 py-2 text-[12.5px]">background: {css};</code>
          <button type="button" onClick={() => copy(`background: ${css};`)} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2">{copied === `background: ${css};` ? <Check size={15} /> : <Copy size={15} />} Copy CSS</button>
          <button type="button" onClick={() => save(new Blob([gradientSvg(stops, angle, 3840, 2160, gKind)], { type: 'image/svg+xml' }), 'gradient-3840x2160.svg')} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> SVG (4K)</button>
          <Link href="/gradient-background-generator" className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center">Mesh gradients →</Link>
        </div>
      </section>

      {/* Collections */}
      <section aria-labelledby="collections">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="collections" className="text-2xl font-semibold tracking-tight">Palette collections</h2>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Collection">
            {COLLECTIONS.map((c) => <button key={c.id} role="radio" aria-checked={coll === c.id} onClick={() => setColl(c.id)} className={`h-9 px-3.5 rounded-full border text-[13px] font-medium ${coll === c.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{c.label}</button>)}
          </div>
        </div>
        {coll === 'skin' && <p className="mt-2 text-[13px] text-mt-muted">Shades for drawing people in illustrations and portraits.</p>}
        <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PALETTES.filter((p) => p.c === coll).map((p) => (
            <li key={p.name} className="rounded-3xl border border-mt-border bg-mt-surface overflow-hidden">
              {coll === 'gradient'
                ? <button type="button" onClick={() => setStops(p.colors.map((c, i) => ({ color: c, at: Math.round((i / (p.colors.length - 1)) * 100) })))} className="block h-24 w-full" style={{ background: gradientCss(p.colors.map((c, i) => ({ color: c, at: (i / (p.colors.length - 1)) * 100 })), 135) }} aria-label={`Use ${p.name} in the gradient builder`} />
                : <div className="flex h-24">{p.colors.map((c) => <button key={c} onClick={() => copy(c)} className="flex-1 relative" style={{ background: c, color: readableOn(c) }} aria-label={`Copy ${c}`}><span className="absolute bottom-2 left-0 right-0 text-center text-[10.5px] font-semibold">{copied === c ? 'Copied' : c}</span></button>)}</div>}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5">
                <span className="font-semibold text-[14px]">{p.name}</span>
                <span className="flex gap-1.5">
                  <button onClick={() => savePalette(p.colors)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label={`Save ${p.name}`} title="Save"><Heart size={13} /></button>
                  <button onClick={() => toEditor(p.colors)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label={`Use ${p.name} in the editor`} title="Use in the editor"><PenSquare size={13} /></button>
                  <button onClick={() => toPattern(p.colors)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label={`Make a pattern with ${p.name}`} title="Make a pattern"><Grid3x3 size={13} /></button>
                  <button onClick={() => findTemplates(p.colors)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label={`Templates in ${p.name}`} title="Find templates"><Search size={13} /></button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {saved.length > 0 && (
        <section aria-labelledby="saved">
          <h2 id="saved" className="text-2xl font-semibold tracking-tight">Your saved palettes</h2>
          <p className="mt-1 text-[13px] text-mt-muted">Saved on this device — they also appear in the editor’s Colours panel.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((cols, i) => (
              <li key={i} className="flex items-center gap-1.5 rounded-2xl border border-mt-border bg-mt-surface p-2">
                <button onClick={() => apply(cols[0])} className="flex flex-1 h-11 rounded-xl overflow-hidden" aria-label="Use this palette">{cols.map((c, k) => <span key={c + k} className="flex-1" style={{ background: c }} />)}</button>
                <button onClick={() => exportAs(cols, 'ase', `Palette ${i + 1}`)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label="Download for Adobe (.ase)" title="Adobe .ase"><Download size={13} /></button>
                <button onClick={() => findTemplates(cols)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label="Find templates"><Search size={13} /></button>
                <button onClick={() => removePalette(i)} className="h-8 w-8 rounded-full border border-mt-border grid place-items-center" aria-label="Delete palette"><Trash2 size={13} /></button>
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
