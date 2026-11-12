'use client';

// Pattern Studio — build a seamless repeat from 130+ original vector motifs,
// preview it on products, download real vectors (SVG with one path per
// motif, vector PDF, seamless tile) or PNG, with or without a background,
// open it in the editor as editable shapes, and keep a library of patterns.
// All work happens in the browser.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Download, FileUp, Grid3x3, ImagePlus, Pencil, RotateCcw, Save, Search, Shuffle, Sparkles, Trash2, Type, Wand2 } from 'lucide-react';
import { DEFAULT_PATTERN, MOTIFS, MOTIF_CATEGORIES, PALETTES, PatternSettings, REPEATS, layout, sheetSvg, expandedSvg, svgDataUrl, tileSvg } from '@/lib/patterns';
import { patternFabricJson, patternPdf } from '@/lib/patternVector';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

const STORE = 'mt:patterns';
const DRAFT = 'mt:pattern-draft';
type Saved = { id: string; name: string; at: number; p: PatternSettings };

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const keep = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const SIZES = [
  { label: 'Square post · 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Story · 1080 × 1920', w: 1080, h: 1920 },
  { label: 'A4 print · 2480 × 3508', w: 2480, h: 3508 },
  { label: 'Wide banner · 1920 × 1080', w: 1920, h: 1080 },
  { label: 'Wallpaper tile · 2000 × 2000', w: 2000, h: 2000 },
];

async function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  const img = new Image();
  img.decoding = 'async';
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('render')); img.src = url; });
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function Slider({ label, value, min, max, step = 1, onChange, fmt }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[12px] text-mt-muted"><span>{label}</span><span className="tabular-nums text-mt-ink">{fmt ? fmt(value) : value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" />
    </label>
  );
}

export function PatternStudio() {
  const router = useRouter();
  const [p, setP] = useState<PatternSettings>(DEFAULT_PATTERN);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [showTile, setShowTile] = useState(false);
  const [size, setSize] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const [cat, setCat] = useState<string>('Basic');
  const [mq, setMq] = useState('');
  const [transparent, setTransparent] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  useEffect(() => { setP({ ...DEFAULT_PATTERN, ...load<Partial<PatternSettings>>(DRAFT, {}) }); setSaved(load<Saved[]>(STORE, [])); }, []);
  useEffect(() => { keep(DRAFT, p.motif === 'image' ? { ...p, image: undefined, motif: 'sparkle' } : p); }, [p]);

  const set = (o: Partial<PatternSettings>) => setP((x) => ({ ...x, ...o }));
  const tile = useMemo(() => tileSvg(p), [p]);
  const { w: tw, h: th } = useMemo(() => layout(p), [p]);
  const tileUrl = useMemo(() => svgDataUrl(tile), [tile]);
  const bg = { backgroundImage: `url("${tileUrl}")`, backgroundSize: `${tw}px ${th}px`, backgroundColor: p.background };
  const radial = p.repeat === 'radial' || p.repeat === 'kaleidoscope';
  const scattered = p.repeat === 'random' || p.repeat === 'organic';

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2600); };

  const exportSvg = (kind: 'tile' | 'sheet' | 'paths', q: PatternSettings = p) => {
    const s = SIZES[size];
    const svg = kind === 'tile' ? tileSvg(q, { background: !transparent }) : kind === 'paths' ? expandedSvg(q, s.w, s.h, { transparent }) : sheetSvg(q, s.w, s.h, { transparent });
    save(new Blob([svg], { type: 'image/svg+xml' }), kind === 'tile' ? 'pattern-tile.svg' : `pattern-${s.w}x${s.h}${kind === 'paths' ? '-editable' : ''}.svg`);
  };
  const exportPdf = async (q: PatternSettings = p) => {
    const s = SIZES[size];
    setBusy('pdf');
    try { save(await patternPdf(q, s.w, s.h, { transparent }), `pattern-${s.w}x${s.h}.pdf`); } catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };
  const exportPng = async () => {
    const s = SIZES[size];
    setBusy('png');
    try { save(await svgToPng(sheetSvg(p, s.w, s.h, { transparent }), s.w, s.h), `pattern-${s.w}x${s.h}.png`); } catch { flash('This image could not be made in your browser.'); }
    setBusy(null);
  };

  const store = (next: Saved[]) => { setSaved(next); keep(STORE, next); };
  const savePattern = () => {
    const name = `${MOTIFS.find((m) => m.id === p.motif)?.label || 'Custom'} · ${REPEATS.find((r) => r.id === p.repeat)?.label}`;
    store([{ id: String(Date.now()), name, at: Date.now(), p: { ...p } }, ...saved].slice(0, 60));
    flash('Saved to My patterns (on this device).');
  };
  const removeSaved = (id: string) => store(saved.filter((s) => s.id !== id));
  const duplicateSaved = (s: Saved) => store([{ ...s, id: String(Date.now()), name: `${s.name} (copy)`, at: Date.now() }, ...saved].slice(0, 60));
  const renameSaved = (id: string, name: string) => { store(saved.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s))); setRenaming(null); };
  const exportLibrary = () => save(new Blob([JSON.stringify({ format: 'mt-patterns', version: 1, patterns: saved }, null, 1)], { type: 'application/json' }), 'my-patterns.json');
  const importLibrary = (f?: File | null) => {
    if (!f) return;
    f.text().then((t) => {
      try {
        const j = JSON.parse(t);
        const list: Saved[] = (j.patterns || []).filter((x: any) => x && x.p && typeof x.p.motif === 'string');
        const ids = new Set(saved.map((x) => x.id));
        store([...list.filter((x) => !ids.has(x.id)), ...saved].slice(0, 60));
        flash(`Added ${list.length} pattern${list.length === 1 ? '' : 's'}.`);
      } catch { flash('That file is not a My patterns backup.'); }
    });
  };

  // Opens the editor with the pattern as real vector shapes (one path per
  // motif, grouped): ungroup it there to recolour, move or delete motifs.
  const openInEditor = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent('/patterns')); return; }
    const s = SIZES[size];
    setBusy('editor');
    try {
      const doc = await patternFabricJson(p, s.w, s.h, { transparent });
      const tw = 400, th = Math.round((400 * s.h) / s.w);
      const thumbBlob = await svgToPng(sheetSvg(p, tw, th, { transparent }), tw, th);
      const thumbnail: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(thumbBlob); });
      const canvas = { version: '5.1.0', background: doc.background || '#ffffff', objects: doc.objects };
      const key = newLocalKey();
      putHandoff(key, { opened: { document: { name: 'Pattern design', width: s.w, height: s.h, editor: 'design' }, canvas, fonts: [], thumbnail, template: null, missingAssets: [] } as any, file: { handle: null, fileName: 'Pattern design.mtd.svg' } });
      router.push(editorUrlForLocal(key, s.w, s.h));
    } catch { flash('Could not open the editor. Please try again.'); setBusy(null); }
  };

  const shown = MOTIFS.filter((m) => (mq.trim() ? m.label.toLowerCase().includes(mq.trim().toLowerCase()) || m.id.includes(mq.trim().toLowerCase()) : m.cat === cat));

  const onImage = (f?: File | null) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type) || f.size > 2_000_000) { flash('Choose a PNG, JPG, WebP or SVG under 2 MB.'); return; }
    const r = new FileReader();
    r.onload = () => set({ motif: 'image', image: String(r.result) });
    r.readAsDataURL(f);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      {/* Controls */}
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">1 · Motif</h2>
          <div className="mt-3 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-muted" />
            <input value={mq} onChange={(e) => setMq(e.target.value)} placeholder={`Search ${MOTIFS.length} shapes`} aria-label="Search shapes" className="w-full h-9 rounded-xl border border-mt-border bg-mt-bg pl-8 pr-3 text-[13px]" />
          </div>
          {!mq.trim() && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MOTIF_CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-7 px-2.5 rounded-full text-[12px] font-medium border ${cat === c ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{c}</button>
              ))}
            </div>
          )}
          <div className="mt-3 grid grid-cols-5 gap-2 max-h-[260px] overflow-y-auto pr-0.5">
            {shown.map((m) => (
              <button key={m.id} type="button" onClick={() => set({ motif: m.id })} aria-label={m.label} title={m.label} aria-pressed={p.motif === m.id}
                className={`aspect-square rounded-xl border grid place-items-center transition-colors ${p.motif === m.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border hover:border-mt-ink/40'}`}>
                <svg viewBox="-55 -55 110 110" className="h-7 w-7"><path d={m.d} fill="currentColor" fillRule="evenodd" /></svg>
              </button>
            ))}
            {!mq.trim() && cat === 'Basic' && <button type="button" onClick={() => set({ motif: 'text', text: p.text || 'M' })} aria-pressed={p.motif === 'text'} title="Letter" className={`aspect-square rounded-xl border grid place-items-center ${p.motif === 'text' ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}><Type size={18} /></button>}
            {!shown.length && <p className="col-span-5 text-[12px] text-mt-muted py-2">No shape called “{mq}”.</p>}
          </div>
          {p.motif === 'text' && (
            <input value={p.text || ''} maxLength={3} onChange={(e) => set({ text: e.target.value })} aria-label="Letters for the motif" className="mt-3 w-full h-10 rounded-xl border border-mt-border bg-mt-bg px-3 text-[14px]" placeholder="Up to 3 letters" />
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 w-full h-10 rounded-xl border border-dashed border-mt-border text-[13px] font-medium inline-flex items-center justify-center gap-2 hover:border-mt-ink/40">
            <ImagePlus size={15} /> {p.motif === 'image' ? 'Change your image' : 'Use your own drawing or logo'}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => onImage(e.target.files?.[0])} />
        </section>

        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">2 · Repeat</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {REPEATS.map((r) => (
              <button key={r.id} type="button" onClick={() => set({ repeat: r.id })} aria-pressed={p.repeat === r.id} title={r.hint}
                className={`h-9 rounded-xl border text-[13px] font-medium ${p.repeat === r.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`}>{r.label}</button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-mt-muted">{REPEATS.find((r) => r.id === p.repeat)?.hint}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">3 · Adjust</h2>
          <Slider label="Tile size" value={p.tile} min={40} max={320} onChange={(v) => set({ tile: v })} fmt={(v) => `${v}px`} />
          <Slider label="Motif scale" value={p.scale} min={0.1} max={1.5} step={0.01} onChange={(v) => set({ scale: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
          <Slider label="Rotation" value={p.rotation} min={0} max={360} onChange={(v) => set({ rotation: v })} fmt={(v) => `${v}°`} />
          {!radial && !scattered && <>
            <Slider label="Horizontal spacing" value={p.spacingX} min={0} max={1.5} step={0.01} onChange={(v) => set({ spacingX: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Vertical spacing" value={p.spacingY} min={0} max={1.5} step={0.01} onChange={(v) => set({ spacingY: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
          </>}
          {(p.repeat === 'brick' || p.repeat === 'half-drop') && <Slider label="Offset" value={p.offset} min={0} max={1} step={0.01} onChange={(v) => set({ offset: v })} fmt={(v) => `${Math.round(v * 100)}%`} />}
          {radial && <Slider label="Symmetry" value={p.symmetry} min={3} max={16} onChange={(v) => set({ symmetry: v })} fmt={(v) => `${v} copies`} />}
          {scattered && <>
            <Slider label="Density" value={p.density} min={3} max={60} onChange={(v) => set({ density: v })} fmt={(v) => `${v} per tile`} />
            <button type="button" onClick={() => set({ seed: Math.floor(Math.random() * 1e6) })} className="h-9 w-full rounded-xl border border-mt-border text-[13px] font-medium inline-flex items-center justify-center gap-2"><Shuffle size={14} /> Shuffle</button>
          </>}
          <Slider label="Opacity" value={p.opacity} min={0.1} max={1} step={0.01} onChange={(v) => set({ opacity: v })} fmt={(v) => `${Math.round(v * 100)}%`} />
          <label className="flex items-center justify-between text-[13px]"><span>Outline only</span><input type="checkbox" checked={p.stroke} onChange={(e) => set({ stroke: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /></label>
          {p.stroke && <Slider label="Line width" value={p.strokeWidth} min={1} max={10} step={0.5} onChange={(v) => set({ strokeWidth: v })} fmt={(v) => `${v}px`} />}
        </section>

        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">4 · Colour</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PALETTES.map((pal) => (
              <button key={pal.name} type="button" title={pal.name} aria-label={`Palette ${pal.name}`} onClick={() => set({ colors: pal.colors, background: pal.background })}
                className="h-8 rounded-full border border-mt-border px-1.5 inline-flex items-center gap-0.5 hover:border-mt-ink/40">
                <i className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: pal.background }} />
                {pal.colors.map((c) => <i key={c} className="h-5 w-5 rounded-full -ml-1.5 ring-2 ring-mt-surface" style={{ background: c }} />)}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {p.colors.map((c, i) => (
              <label key={i} className="text-center text-[11px] text-mt-muted">
                <input type="color" value={c} onChange={(e) => set({ colors: p.colors.map((x, k) => (k === i ? e.target.value : x)) })} className="h-10 w-full cursor-pointer rounded-lg border border-mt-border bg-transparent" aria-label={`Motif colour ${i + 1}`} />
                {c.toUpperCase()}
              </label>
            ))}
            <label className="text-center text-[11px] text-mt-muted">
              <input type="color" value={p.background} onChange={(e) => set({ background: e.target.value })} className="h-10 w-full cursor-pointer rounded-lg border border-mt-border bg-transparent" aria-label="Background colour" />
              Background
            </label>
          </div>
        </section>

        <button type="button" onClick={() => setP(DEFAULT_PATTERN)} className="text-[13px] text-mt-muted inline-flex items-center gap-1.5 hover:text-mt-ink"><RotateCcw size={13} /> Start again</button>
      </aside>

      {/* Preview, export, mockups */}
      <div className="min-w-0 space-y-6">
        <div className="relative rounded-3xl border border-mt-border overflow-hidden">
          <div className="h-[380px] sm:h-[520px]" style={bg} role="img" aria-label="Pattern preview" />
          {showTile && (
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(59,130,196,.9) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,196,.9) 1px, transparent 1px)', backgroundSize: `${tw}px ${th}px` }} />
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <button type="button" onClick={() => setShowTile((v) => !v)} aria-pressed={showTile} className="h-9 px-3 rounded-full bg-white/90 text-[#0B0B0F] text-[12px] font-semibold inline-flex items-center gap-1.5 shadow backdrop-blur"><Grid3x3 size={14} /> {showTile ? 'Hide tile edges' : 'Show tile edges'}</button>
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">Tile {Math.round(tw)} × {Math.round(th)} px · seamless</span>
        </div>

        <div className="rounded-3xl border border-mt-border bg-mt-surface p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[220px]">
              <span className="text-[12px] text-mt-muted">Size</span>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[14px]">
                {SIZES.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={openInEditor} disabled={!!busy} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"><Wand2 size={15} /> {busy === 'editor' ? 'Opening…' : 'Edit in a design'}</button>
            <button type="button" onClick={savePattern} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Save size={15} /> Save</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-mt-muted mr-1">Download</span>
            <button type="button" onClick={() => exportSvg('paths')} title="One editable path per motif — opens in Illustrator, Figma or Inkscape" className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5"><Download size={14} /> SVG vector</button>
            <button type="button" onClick={() => exportPdf()} disabled={!!busy} title="Vector PDF, ready for print" className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"><Download size={14} /> {busy === 'pdf' ? 'Making…' : 'PDF vector'}</button>
            <button type="button" onClick={() => exportSvg('tile')} title="One seamless tile, for fills and swatches" className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5"><Download size={14} /> Seamless tile SVG</button>
            <button type="button" onClick={exportPng} disabled={!!busy} className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"><Download size={14} /> {busy === 'png' ? 'Making…' : 'PNG'}</button>
            <label className="ml-auto inline-flex items-center gap-2 text-[13px] cursor-pointer select-none"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Transparent background</label>
          </div>
          {msg && <p role="status" className="mt-3 text-[13px] text-mt-muted">{msg}</p>}
        </div>

        <section aria-labelledby="mock-title">
          <h2 id="mock-title" className="text-lg font-semibold">On products</h2>
          <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {MOCKUPS.map((m) => (
              <li key={m.name} className="rounded-2xl border border-mt-border bg-mt-surface2/60 p-3">
                <svg viewBox="0 0 200 200" className="w-full h-auto" role="img" aria-label={`${m.name} with this pattern`}>
                  <defs>
                    <pattern id={`pp-${m.id}`} width={tw * m.k} height={th * m.k} patternUnits="userSpaceOnUse"><image href={tileUrl} width={tw * m.k} height={th * m.k} /></pattern>
                    <clipPath id={`cp-${m.id}`}><path d={m.clip} /></clipPath>
                    <linearGradient id={`sh-${m.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".25" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".22" /></linearGradient>
                  </defs>
                  {m.under && <path d={m.under} fill="#d9d6cf" />}
                  <g clipPath={`url(#cp-${m.id})`}><rect width="200" height="200" fill={`url(#pp-${m.id})`} /><rect width="200" height="200" fill={`url(#sh-${m.id})`} /></g>
                  {m.over && <path d={m.over} fill="none" stroke="#0b0b0f" strokeOpacity=".35" strokeWidth="1.5" />}
                </svg>
                <p className="mt-2 text-center text-[13px] font-medium">{m.name}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="saved-title" className="rounded-3xl border border-mt-border bg-mt-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="saved-title" className="text-lg font-semibold mr-auto">My patterns <span className="text-[13px] font-medium text-mt-faint">{saved.length}</span></h2>
            <button type="button" onClick={savePattern} className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5"><Save size={14} /> Save current</button>
            <button type="button" onClick={exportLibrary} disabled={!saved.length} className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"><Download size={14} /> Back up</button>
            <button type="button" onClick={() => libRef.current?.click()} className="h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5"><FileUp size={14} /> Restore</button>
            <input ref={libRef} type="file" accept="application/json,.json" hidden onChange={(e) => { importLibrary(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {saved.length === 0 ? (
            <p className="mt-3 text-[13px] text-mt-muted">Press Save to keep a pattern here. Saved patterns stay on this device; use Back up to move them to another one.</p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {saved.map((s) => {
                const L = layout(s.p);
                return (
                  <li key={s.id} className="rounded-2xl border border-mt-border overflow-hidden bg-mt-bg">
                    <button type="button" onClick={() => { setP(s.p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="block w-full aspect-[4/3]" title={`Open ${s.name}`} aria-label={`Open ${s.name}`}
                      style={{ backgroundImage: `url("${svgDataUrl(tileSvg(s.p))}")`, backgroundSize: `${L.w / 2}px ${L.h / 2}px`, backgroundColor: s.p.background }} />
                    <div className="p-2.5">
                      {renaming === s.id ? (
                        <input autoFocus defaultValue={s.name} onBlur={(e) => renameSaved(s.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }} aria-label="Pattern name" className="w-full h-8 rounded-lg border border-mt-border bg-mt-surface px-2 text-[13px]" />
                      ) : (
                        <p className="text-[13px] font-semibold truncate" title={s.name}>{s.name}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-1 text-mt-muted">
                        <button type="button" onClick={() => setRenaming(s.id)} title="Rename" aria-label={`Rename ${s.name}`} className="h-7 w-7 grid place-items-center rounded-md hover:bg-mt-surface2"><Pencil size={13} /></button>
                        <button type="button" onClick={() => duplicateSaved(s)} title="Duplicate" aria-label={`Duplicate ${s.name}`} className="h-7 w-7 grid place-items-center rounded-md hover:bg-mt-surface2"><Copy size={13} /></button>
                        <button type="button" onClick={() => exportSvg('paths', s.p)} title="Download SVG" className="h-7 px-1.5 rounded-md text-[11px] font-semibold hover:bg-mt-surface2">SVG</button>
                        <button type="button" onClick={() => exportPdf(s.p)} title="Download PDF" className="h-7 px-1.5 rounded-md text-[11px] font-semibold hover:bg-mt-surface2">PDF</button>
                        <button type="button" onClick={() => removeSaved(s.id)} title="Delete" aria-label={`Delete ${s.name}`} className="ml-auto h-7 w-7 grid place-items-center rounded-md hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <p className="text-[12px] text-mt-faint inline-flex items-center gap-1.5"><Sparkles size={12} /> Every motif here is original to Magical Touch Design — free to use in your own work.</p>
      </div>
    </div>
  );
}

// Product silhouettes (original, simple vector shapes).
const MOCKUPS = [
  { id: 'cushion', name: 'Cushion · fabric', k: 0.35, clip: 'M30 40Q100 25 170 40Q182 100 170 160Q100 175 30 160Q18 100 30 40Z', over: 'M30 40Q100 25 170 40Q182 100 170 160Q100 175 30 160Q18 100 30 40Z' },
  { id: 'wall', name: 'Wallpaper', k: 0.3, clip: 'M0 0H200V150H0Z', under: 'M0 150H200V200H0Z', over: 'M0 150H200M120 150V110H175V150' },
  { id: 'gift', name: 'Gift wrap', k: 0.3, clip: 'M35 75H165V175H35ZM30 55H170V78H30Z', over: 'M35 75H165V175H35ZM30 55H170V78H30ZM92 55V175M108 55V175M100 55C80 30 60 40 75 55M100 55C120 30 140 40 125 55' },
  { id: 'tote', name: 'Tote bag · clothing', k: 0.3, clip: 'M45 70H155L165 180H35Z', over: 'M45 70H155L165 180H35ZM70 70C70 30 130 30 130 70M80 70C80 42 120 42 120 70' },
  { id: 'notebook', name: 'Notebook · stationery', k: 0.28, clip: 'M55 25H160V180H55Z', under: 'M50 28H58V182H50Z', over: 'M55 25H160V180H55ZM70 120H145V150H70Z' },
  { id: 'label', name: 'Jar label · packaging', k: 0.25, clip: 'M50 85H150V150H50Z', under: 'M60 40H140V55H60ZM50 55Q50 50 55 50H145Q150 50 150 55V175Q150 185 140 185H60Q50 185 50 175Z', over: 'M50 85H150V150H50Z' },
];
