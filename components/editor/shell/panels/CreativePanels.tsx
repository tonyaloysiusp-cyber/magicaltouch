'use client';

// Creative tools built into the editor: Patterns (seamless repeats),
// Colours (harmonies, mood palettes) and Image Trace (photo → vectors).
// The same engines as the standalone pages (/patterns, /colours, /trace).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ImagePlus, PaintBucket, PenTool, Shapes, Wand2 } from 'lucide-react';
import { DEFAULT_PATTERN, MOTIFS, MOTIF_CATEGORIES, PALETTES, PatternSettings, REPEATS, layout, motifPath, sheetSvg, svgDataUrl, tileSvg } from '@/lib/patterns';
import { HARMONIES, Harmony, MOOD_PALETTES, harmony, normHex, readableOn, hexToRgb, rgbToHsl, rgbToCmyk, contrast, contrastGrades, gradientCss, generatePalette, colourName, paletteCss, paletteJson, paletteGpl, paletteAse } from '@/lib/colour';
import type { GradientSpec } from '@/lib/editor/gradients';
import { PRESETS, TraceOptions, DEFAULT_TRACE } from '@/lib/trace';

const sec = 'text-[11px] font-semibold uppercase tracking-wide text-mt-muted';
const btn = 'h-9 rounded-xl border border-mt-border text-[12.5px] font-medium hover:border-mt-ink/40 inline-flex items-center justify-center gap-1.5';
const primary = 'h-10 w-full rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50';

function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11.5px] text-mt-muted"><span>{label}</span><span className="tabular-nums text-mt-ink">{Math.round(value * 100) / 100}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#3B82C4]" />
    </label>
  );
}

// ------------------------------------------------------------------ Patterns
export function PatternsPanel({ onBackground, onFillSelection, onAddImage, onAddVector, hasSelection }: {
  onBackground: (tileUrl: string) => void;
  onFillSelection: (tileUrl: string) => void;
  onAddImage: (svgUrl: string) => void;
  onAddVector?: (p: PatternSettings, mode: 'layer' | 'fill') => void;
  hasSelection: boolean;
}) {
  const [p, setP] = useState<PatternSettings>({ ...DEFAULT_PATTERN, tile: 90 });
  const [cat, setCat] = useState<string>('Basic');
  const set = (o: Partial<PatternSettings>) => setP((x) => ({ ...x, ...o }));
  const tile = useMemo(() => tileSvg(p), [p]);
  const L = useMemo(() => layout(p), [p]);
  const url = useMemo(() => svgDataUrl(tile), [tile]);
  return (
    <div className="space-y-4 p-1">
      <div className="h-36 rounded-xl ring-1 ring-mt-border" style={{ backgroundImage: `url("${url}")`, backgroundSize: `${L.w / 1.5}px ${L.h / 1.5}px`, backgroundColor: p.background }} role="img" aria-label="Pattern preview" />
      <div>
        <p className={sec}>Motif</p>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Shape group" className="mt-2 h-8 w-full rounded-lg border border-mt-border bg-mt-surface px-2 text-[12px]">
          {MOTIF_CATEGORIES.map((c) => <option key={c} value={c}>{c} ({MOTIFS.filter((m) => m.cat === c).length})</option>)}
        </select>
        <div className="mt-2 grid grid-cols-7 gap-1.5 max-h-44 overflow-y-auto">
          {MOTIFS.filter((m) => m.cat === cat).map((m) => (
            <button key={m.id} type="button" title={m.label} aria-label={m.label} aria-pressed={p.motif === m.id} onClick={() => set({ motif: m.id })} className={`aspect-square rounded-lg border grid place-items-center ${p.motif === m.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}>
              <svg viewBox="-55 -55 110 110" className="h-5 w-5"><path d={m.d} fill="currentColor" fillRule="evenodd" /></svg>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className={sec}>Repeat</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {REPEATS.map((r) => <button key={r.id} type="button" title={r.hint} aria-pressed={p.repeat === r.id} onClick={() => set({ repeat: r.id })} className={`${btn} ${p.repeat === r.id ? '!border-mt-ink bg-mt-ink text-mt-bg' : ''}`}>{r.label}</button>)}
        </div>
      </div>
      <div className="space-y-2">
        <Range label="Tile size" value={p.tile} min={30} max={300} onChange={(v) => set({ tile: v })} />
        <Range label="Motif scale" value={p.scale} min={0.1} max={1.5} step={0.01} onChange={(v) => set({ scale: v })} />
        <Range label="Rotation" value={p.rotation} min={0} max={360} onChange={(v) => set({ rotation: v })} />
        <Range label="Spacing" value={p.spacingX} min={0} max={1.5} step={0.01} onChange={(v) => set({ spacingX: v, spacingY: v })} />
        <Range label="Opacity" value={p.opacity} min={0.1} max={1} step={0.01} onChange={(v) => set({ opacity: v })} />
      </div>
      <div>
        <p className={sec}>Colours</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PALETTES.map((pal) => (
            <button key={pal.name} type="button" title={pal.name} onClick={() => set({ colors: pal.colors, background: pal.background })} className="h-7 rounded-full border border-mt-border px-1 inline-flex items-center">
              <i className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: pal.background }} />
              {pal.colors.map((c) => <i key={c} className="h-4 w-4 -ml-1 rounded-full ring-2 ring-mt-surface" style={{ background: c }} />)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          {p.colors.map((c, i) => <input key={i} type="color" value={c} onChange={(e) => set({ colors: p.colors.map((x, k) => (k === i ? e.target.value : x)) })} className="h-8 w-9 rounded-md border border-mt-border bg-transparent" aria-label={`Motif colour ${i + 1}`} />)}
          <input type="color" value={p.background} onChange={(e) => set({ background: e.target.value })} className="h-8 w-9 rounded-md border border-mt-border bg-transparent" aria-label="Background colour" />
        </div>
      </div>
      <div className="space-y-2">
        <button type="button" className={primary} onClick={() => onBackground(url)}><PaintBucket size={15} /> Set as page background</button>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className={btn} disabled={!hasSelection} title={hasSelection ? 'Fill the selected shape with vector motifs' : 'Select a shape first'} onClick={() => (onAddVector && motifPath(p) ? onAddVector(p, 'fill') : onFillSelection(url))}><Shapes size={14} /> Fill selection</button>
          <button type="button" className={btn} title="Add the pattern as an editable vector layer" onClick={() => (onAddVector && motifPath(p) ? onAddVector(p, 'layer') : onAddImage(svgDataUrl(sheetSvg(p, 1000, 1000))))}><ImagePlus size={14} /> Add as layer</button>
        </div>
        <Link href="/patterns" target="_blank" className="flex items-center justify-center gap-1 text-[12px] text-mt-muted hover:text-mt-ink">More in Pattern Studio <ArrowUpRight size={12} /></Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Colours
export function ColoursPanel({ onApply, onFill, onBackground, onGradient, documentColors }: {
  onApply: (colors: string[]) => void;
  onFill: (hex: string) => void;
  onBackground: (hex: string) => void;
  /** gradient to the selection, or to the page when nothing is selected */
  onGradient?: (g: GradientSpec) => void;
  documentColors: string[];
}) {
  const [tab, setTab] = useState<'palettes' | 'values' | 'contrast' | 'gradient'>('palettes');
  const [base, setBase] = useState(documentColors.find((c) => /^#[0-9a-f]{6}$/i.test(c) && c.toUpperCase() !== '#FFFFFF') || '#3B82C4');
  const [kind, setKind] = useState<Harmony>('analogous');
  const pal = useMemo(() => harmony(base, kind), [base, kind]);
  const [mine, setMine] = useState<string[][]>([]);
  const [seed, setSeed] = useState(1);
  const [gen, setGen] = useState<string[]>(() => generatePalette('auto', [null, null, null, null, null], 1));
  const [copied, setCopied] = useState<string | null>(null);
  const [fg, setFg] = useState('#0B2545');
  const [bgc, setBgc] = useState('#F5F7FA');
  const [g1, setG1] = useState('#FF5F6D'); const [g2, setG2] = useState('#FFC371'); const [g3, setG3] = useState<string | null>(null);
  const [angle, setAngle] = useState(135); const [gKind, setGKind] = useState<'linear' | 'radial'>('linear');
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem('mt:palettes') || '[]'); if (Array.isArray(v)) setMine(v.filter((x) => Array.isArray(x)).slice(0, 24)); } catch { /* ignore */ } }, []);
  const keepMine = (v: string[][]) => { setMine(v); try { localStorage.setItem('mt:palettes', JSON.stringify(v)); } catch { /* private mode */ } };
  const savePal = (cols: string[]) => keepMine([cols, ...mine.filter((m) => m.join() !== cols.join())].slice(0, 24));
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch { /* ignore */ } setCopied(t); setTimeout(() => setCopied(null), 1200); };
  const download = (cols: string[], fmt: 'css' | 'json' | 'ase' | 'gpl') => {
    const name = 'magical-touch-palette';
    const blob = fmt === 'css' ? new Blob([paletteCss(cols, name)], { type: 'text/css' }) : fmt === 'json' ? new Blob([paletteJson(cols, 'Palette')], { type: 'application/json' }) : fmt === 'gpl' ? new Blob([paletteGpl(cols, 'Palette')], { type: 'text/plain' }) : new Blob([paletteAse(cols, 'Palette') as BlobPart], { type: 'application/octet-stream' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.${fmt}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };
  const Row = ({ colors, label, savable = true }: { colors: string[]; label: string; savable?: boolean }) => (
    <div className="rounded-xl border border-mt-border overflow-hidden">
      <div className="flex h-10">{colors.map((c, i) => <button key={c + i} type="button" title={`${c} — tap to colour the selection`} onClick={() => onFill(c)} className="flex-1" style={{ background: c }} aria-label={`Use ${c}`} />)}</div>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
        <span className="text-[11.5px] font-medium truncate">{label}</span>
        <span className="flex shrink-0 gap-1">
          {savable && <button type="button" onClick={() => savePal(colors)} className="text-[11px] px-2 h-6 rounded-full border border-mt-border" title="Save to your palettes">Save</button>}
          <button type="button" onClick={() => onBackground(colors[colors.length - 1])} className="text-[11px] px-2 h-6 rounded-full border border-mt-border">Background</button>
          <button type="button" onClick={() => onApply(colors)} className="text-[11px] px-2 h-6 rounded-full bg-mt-ink text-mt-bg">Apply</button>
        </span>
      </div>
    </div>
  );
  const rgb = hexToRgb(base), hslv = rgbToHsl(rgb).map((v) => Math.round(v)), cmyk = rgbToCmyk(rgb).map((v) => Math.round(v));
  const values: [string, string][] = [['HEX', base], ['RGB', `rgb(${rgb.join(', ')})`], ['HSL', `hsl(${hslv[0]}, ${hslv[1]}%, ${hslv[2]}%)`], ['CMYK', `${cmyk[0]} / ${cmyk[1]} / ${cmyk[2]} / ${cmyk[3]}`]];
  const grades = contrastGrades(fg, bgc);
  const ratio = contrast(fg, bgc);
  const spec: GradientSpec = { type: gKind, angle, stops: [g1, ...(g3 ? [g3] : []), g2].map((c, i, arr) => ({ offset: i / (arr.length - 1), color: c, opacity: 1 })) };
  const css = gradientCss(spec.stops.map((s) => ({ color: s.color, at: Math.round(s.offset * 100) })), angle, gKind);
  return (
    <div className="space-y-4 p-1">
      <div role="tablist" aria-label="Colours" className="grid grid-cols-4 rounded-lg border border-mt-border p-0.5">
        {([['palettes', 'Palettes'], ['values', 'Values'], ['contrast', 'Contrast'], ['gradient', 'Gradient']] as const).map(([id, l]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-7 rounded-md text-[11.5px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{l}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={base} onChange={(e) => setBase(e.target.value.toUpperCase())} className="h-9 w-10 rounded-md border border-mt-border bg-transparent" aria-label="Base colour" />
        <input value={base} onChange={(e) => { const n = normHex(e.target.value); if (n) setBase(n); }} className="h-9 flex-1 rounded-lg border border-mt-border bg-mt-bg px-2 font-mono text-[13px] uppercase" aria-label="HEX" />
        <span className="text-[11px] text-mt-muted truncate max-w-[80px]">{colourName(base)}</span>
      </div>

      {tab === 'palettes' && <>
        <p className="text-[12px] text-mt-muted">Tap a swatch to colour what you selected, or <b className="text-mt-ink">Apply</b> to recolour the whole page (text stays readable).</p>
        <div className="flex flex-wrap gap-1">
          {HARMONIES.map((h) => <button key={h.id} type="button" aria-pressed={kind === h.id} onClick={() => setKind(h.id)} className={`h-7 px-2.5 rounded-full border text-[11.5px] ${kind === h.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{h.label}</button>)}
        </div>
        <Row colors={pal} label={HARMONIES.find((h) => h.id === kind)!.label} />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between"><p className={sec}>Generate</p><button type="button" className="text-[11.5px] font-semibold text-mt-accent" onClick={() => { const n = seed + 1; setSeed(n); setGen(generatePalette('auto', [null, null, null, null, null], n)); }}>New palette</button></div>
          <Row colors={gen} label="Generated" />
        </div>
        {documentColors.length > 0 && (
          <div>
            <p className={sec}>In this design</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{documentColors.slice(0, 16).map((c) => <button key={c} type="button" onClick={() => setBase(c.toUpperCase())} className="h-7 w-7 rounded-md ring-1 ring-black/10" style={{ background: c }} title={`Build palettes from ${c}`} aria-label={c} />)}</div>
          </div>
        )}
        {mine.length > 0 && (
          <div className="space-y-2">
            <p className={sec}>Your saved palettes</p>
            {mine.map((m, i) => (
              <div key={i} className="space-y-1">
                <Row colors={m} label={`Palette ${i + 1}`} savable={false} />
                <div className="flex flex-wrap gap-1 text-[10.5px]">
                  {(['css', 'json', 'ase', 'gpl'] as const).map((f) => <button key={f} type="button" onClick={() => download(m, f)} className="h-6 rounded-full border border-mt-border px-2 uppercase">{f}</button>)}
                  <button type="button" onClick={() => keepMine(mine.filter((_, k) => k !== i))} className="h-6 rounded-full border border-mt-border px-2">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <p className={sec}>Palettes by mood</p>
          {MOOD_PALETTES.map((m) => <Row key={m.name} colors={m.colors} label={`${m.name} · ${m.mood}`} />)}
        </div>
      </>}

      {tab === 'values' && <div className="space-y-1.5">
        <div className="h-16 rounded-xl ring-1 ring-black/10" style={{ background: base }} />
        {values.map(([k, v]) => (
          <button key={k} type="button" onClick={() => copy(v)} className="flex w-full items-center justify-between rounded-lg border border-mt-border px-2.5 py-2 text-left hover:bg-mt-surface2">
            <span className="text-[11px] font-semibold text-mt-muted">{k}</span><span className="font-mono text-[12px]">{copied === v ? 'Copied' : v}</span>
          </button>
        ))}
        <p className="text-[11px] text-mt-muted">CMYK here is a quick conversion; print PDFs use the press colour profile for the exact ink values.</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" className={btn} onClick={() => onFill(base)}>Colour the selection</button>
          <button type="button" className={btn} onClick={() => onBackground(base)}>Page background</button>
        </div>
      </div>}

      {tab === 'contrast' && <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11.5px]"><span className="text-mt-muted">Text</span><input type="color" value={fg} onChange={(e) => setFg(e.target.value.toUpperCase())} className="h-9 w-full rounded-md border border-mt-border" aria-label="Text colour" /></label>
          <label className="block text-[11.5px]"><span className="text-mt-muted">Background</span><input type="color" value={bgc} onChange={(e) => setBgc(e.target.value.toUpperCase())} className="h-9 w-full rounded-md border border-mt-border" aria-label="Background colour" /></label>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: bgc, color: fg }}><p className="text-[22px] font-bold">Aa Sample</p><p className="text-[12px]">Small text reads like this</p></div>
        <p className="text-[13px]"><b className="tabular-nums">{ratio.toFixed(2)} : 1</b></p>
        <ul className="grid grid-cols-2 gap-1 text-[11.5px]">
          {([['AA normal text', grades.aaNormal], ['AA large text', grades.aaLarge], ['AAA normal text', grades.aaaNormal], ['AAA large text', grades.aaaLarge]] as [string, boolean][]).map(([k, ok]) => <li key={k} className={`rounded-md px-2 py-1 ${ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>{ok ? '✓' : '✗'} {k}</li>)}
        </ul>
        <button type="button" className={btn + ' w-full'} onClick={() => { setFg(bgc); setBgc(fg); }}>Swap</button>
      </div>}

      {tab === 'gradient' && <div className="space-y-2.5">
        <div className="h-20 rounded-xl ring-1 ring-black/10" style={{ background: css }} />
        <div className="grid grid-cols-3 gap-2">
          <input type="color" value={g1} onChange={(e) => setG1(e.target.value.toUpperCase())} className="h-9 w-full rounded-md border border-mt-border" aria-label="Start colour" />
          {g3 ? <input type="color" value={g3} onChange={(e) => setG3(e.target.value.toUpperCase())} className="h-9 w-full rounded-md border border-mt-border" aria-label="Middle colour" /> : <button type="button" className={btn} onClick={() => setG3('#FFFFFF')}>+ Middle</button>}
          <input type="color" value={g2} onChange={(e) => setG2(e.target.value.toUpperCase())} className="h-9 w-full rounded-md border border-mt-border" aria-label="End colour" />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-mt-border p-0.5">
          {(['linear', 'radial'] as const).map((k) => <button key={k} type="button" onClick={() => setGKind(k)} className={`h-7 rounded-md text-[11.5px] font-semibold capitalize ${gKind === k ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{k}</button>)}
        </div>
        {gKind === 'linear' && <Range label="Angle" value={angle} min={0} max={360} step={5} onChange={setAngle} />}
        {g3 && <button type="button" className="text-[11.5px] text-mt-muted underline" onClick={() => setG3(null)}>Remove middle colour</button>}
        <button type="button" className={primary} disabled={!onGradient} onClick={() => onGradient?.(spec)}>Apply gradient</button>
        <p className="text-[11px] text-mt-muted">Goes on the selected shape or text — or on the page background when nothing is selected.</p>
        <button type="button" onClick={() => copy(`background: ${css};`)} className="w-full truncate rounded-lg border border-mt-border px-2 py-1.5 text-left font-mono text-[11px]">{copied?.startsWith('background') ? 'Copied CSS' : `background: ${css};`}</button>
      </div>}
      <span className="hidden" style={{ color: readableOn(base) }} />
    </div>
  );
}

// ------------------------------------------------------------------ Trace
export function TracePanel({ hasImage, busy, onTrace }: { hasImage: boolean; busy: boolean; onTrace: (o: TraceOptions, replace: boolean) => void }) {
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [o, setO] = useState<TraceOptions>({ ...DEFAULT_TRACE, ...PRESETS[0].o, split: true });
  const pick = (id: string) => { setPreset(id); setO({ ...DEFAULT_TRACE, ...PRESETS.find((x) => x.id === id)!.o, split: o.split }); };
  return (
    <div className="space-y-4 p-1">
      <p className="text-[12px] text-mt-muted">{hasImage ? 'Turn the selected picture into clean, editable vectors — grouped by colour. Ungroup to edit every shape.' : 'Select a picture on the page first.'}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p) => <button key={p.id} type="button" title={p.hint} aria-pressed={preset === p.id} onClick={() => pick(p.id)} className={`${btn} !h-auto min-h-8 py-1 leading-tight ${preset === p.id ? '!border-mt-ink bg-mt-ink text-mt-bg' : ''}`}>{p.label}</button>)}
      </div>
      <div className="space-y-2">
        {(o.mode === 'colour' || o.mode === 'gray') && <Range label={o.mode === 'gray' ? 'Grey tones' : 'Colours'} value={o.colors} min={2} max={o.mode === 'gray' ? 12 : 32} onChange={(v) => { setPreset('custom'); setO({ ...o, colors: v }); }} />}
        <Range label="Detail" value={o.detail} min={200} max={1400} step={50} onChange={(v) => setO({ ...o, detail: v })} />
        <Range label="Smoothness" value={o.smooth} min={0.3} max={4} step={0.1} onChange={(v) => setO({ ...o, smooth: v })} />
        <Range label="Ignore specks" value={o.noise} min={0} max={200} onChange={(v) => setO({ ...o, noise: v })} />
        <Range label="Corner sharpness" value={o.corner ?? 60} min={20} max={150} step={5} onChange={(v) => setO({ ...o, corner: v })} />
        <Range label="Clean-up" value={o.despeckle ?? 1} min={0} max={3} onChange={(v) => setO({ ...o, despeckle: v })} />
        <label className="flex items-center justify-between text-[12.5px]"><span>Separate shapes</span><input type="checkbox" checked={!!o.split} onChange={(e) => setO({ ...o, split: e.target.checked })} className="accent-[#3B82C4]" /></label>
        {o.mode === 'colour' && <label className="flex items-center justify-between text-[12.5px]"><span>Remove white background</span><input type="checkbox" checked={o.ignoreWhite} onChange={(e) => setO({ ...o, ignoreWhite: e.target.checked })} className="accent-[#3B82C4]" /></label>}
      </div>
      <button type="button" className={primary} disabled={!hasImage || busy} onClick={() => onTrace(o, true)}><PenTool size={15} /> {busy ? 'Tracing…' : 'Trace & replace picture'}</button>
      <button type="button" className={`${btn} w-full`} disabled={!hasImage || busy} onClick={() => onTrace(o, false)}><Wand2 size={14} /> Trace as a new layer</button>
      <Link href="/trace" target="_blank" className="flex items-center justify-center gap-1 text-[12px] text-mt-muted hover:text-mt-ink">Open Image Trace <ArrowUpRight size={12} /></Link>
    </div>
  );
}
