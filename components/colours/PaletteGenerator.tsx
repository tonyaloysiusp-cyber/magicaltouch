'use client';

// Palette generator — the working heart of the Colour Explorer:
// five big swatches you can lock, edit, reorder and copy; Generate (or the
// space bar) fills the unlocked ones in the chosen style; pull colours from a
// photo; and see the palette live on a poster, a website, a social post and
// a jersey before you use it in a design.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ImagePlus, Lock, Plus, RefreshCw, Save, Shirt, Unlock, Wand2, X } from 'lucide-react';
import { GEN_MODES, GenMode, colourName, contrast, extractPalette, generatePalette, normHex, paletteRoles, readableOn } from '@/lib/colour';
import { DEFAULT_KIT, kitMockupSvg } from '@/lib/teamKit';
import { DEFAULT_PATTERN, svgDataUrl } from '@/lib/patterns';

type Preview = 'poster' | 'web' | 'social' | 'jersey';

export function PaletteGenerator({ onSave, onEditor, onPattern, onTemplates, exportMenu }: {
  onSave: (c: string[]) => void; onEditor: (c: string[]) => void; onPattern: (c: string[]) => void; onTemplates: (c: string[]) => void;
  exportMenu: (c: string[]) => React.ReactNode;
}) {
  const [cols, setCols] = useState<string[]>(['#0B2545', '#13315C', '#3B82C4', '#F4A259', '#F5F7FA']);
  const [locks, setLocks] = useState<boolean[]>([false, false, false, false, false]);
  const [mode, setMode] = useState<GenMode>('auto');
  const [hist, setHist] = useState<string[][]>([]);
  const [fut, setFut] = useState<string[][]>([]);
  const [preview, setPreview] = useState<Preview>('poster');
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const push = (next: string[]) => { setHist((h) => [...h.slice(-40), cols]); setFut([]); setCols(next); setSaved(false); };
  const generate = () => push(generatePalette(mode, cols.map((c, i) => (locks[i] ? c : null)), Date.now() % 1e9, cols.length));
  const undo = () => { if (!hist.length) return; setFut((f) => [cols, ...f]); setCols(hist[hist.length - 1]); setHist((h) => h.slice(0, -1)); };
  const redo = () => { if (!fut.length) return; setHist((h) => [...h, cols]); setCols(fut[0]); setFut((f) => f.slice(1)); };
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch { /* ignore */ } setCopied(t); setTimeout(() => setCopied(null), 1300); };
  const edit = (i: number, v: string) => { const n = normHex(v); if (n) push(cols.map((c, k) => (k === i ? n : c))); };
  const remove = (i: number) => { if (cols.length <= 2) return; push(cols.filter((_, k) => k !== i)); setLocks((l) => l.filter((_, k) => k !== i)); };
  const add = () => { if (cols.length >= 8) return; const g = generatePalette(mode, [...cols.map(() => null), null], Date.now() % 1e9, cols.length + 1); push([...cols, g[g.length - 1]]); setLocks((l) => [...l, false]); };
  const move = (from: number, to: number) => { if (from === to) return; const c = [...cols]; const [x] = c.splice(from, 1); c.splice(to, 0, x); const l = [...locks]; const [y] = l.splice(from, 1); l.splice(to, 0, y); push(c); setLocks(l); };

  // Space bar = generate (not while typing).
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== 'Space' || /INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName) || t.isContentEditable) return;
      const box = document.getElementById('palette-generator')?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > window.innerHeight) return;
      e.preventDefault(); generate();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const fromImage = async (f: File) => {
    const url = URL.createObjectURL(f);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const c = document.createElement('canvas'); const s = 80 / Math.max(img.naturalWidth, img.naturalHeight);
      c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
      const g = c.getContext('2d')!; g.drawImage(img, 0, 0, c.width, c.height);
      const out = extractPalette(g.getImageData(0, 0, c.width, c.height).data, cols.length);
      if (out.length) { push(out); setLocks(out.map(() => false)); }
    } finally { URL.revokeObjectURL(url); }
  };

  const r = useMemo(() => paletteRoles(cols), [cols]);
  const art = useMemo(() => {
    const t = readableOn(r.primary);
    if (preview === 'poster') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><rect width="600" height="800" fill="${r.light}"/><circle cx="430" cy="250" r="210" fill="${r.primary}"/><circle cx="170" cy="560" r="120" fill="${r.accent}"/><rect x="0" y="690" width="600" height="110" fill="${r.dark}"/><text x="60" y="210" font-family="Arial Black, Arial" font-weight="900" font-size="92" fill="${r.dark}">SUMMER</text><text x="60" y="300" font-family="Arial Black, Arial" font-weight="900" font-size="92" fill="${r.dark}">MARKET</text><text x="60" y="360" font-family="Arial" font-size="28" fill="${r.mid}">Food · Music · Makers</text><rect x="60" y="400" width="230" height="64" rx="32" fill="${r.accent}"/><text x="175" y="441" text-anchor="middle" font-family="Arial" font-weight="700" font-size="24" fill="${readableOn(r.accent)}">12–14 JULY</text><text x="60" y="755" font-family="Arial" font-weight="700" font-size="26" fill="${r.light}">CITY PARK · FREE ENTRY</text></svg>`;
    if (preview === 'web') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${r.light}"/><rect width="800" height="64" fill="${r.dark}"/><circle cx="44" cy="32" r="14" fill="${r.primary}"/><text x="70" y="40" font-family="Arial" font-weight="700" font-size="20" fill="${r.light}">Brand</text>${['Home', 'Shop', 'About'].map((x, i) => `<text x="${520 + i * 90}" y="40" font-family="Arial" font-size="17" fill="${r.light}" opacity="0.8">${x}</text>`).join('')}<text x="60" y="170" font-family="Arial Black, Arial" font-weight="900" font-size="50" fill="${r.dark}">Make it yours.</text><text x="60" y="215" font-family="Arial" font-size="20" fill="${r.mid}">A short line that explains what you do.</text><rect x="60" y="250" width="180" height="54" rx="27" fill="${r.primary}"/><text x="150" y="284" text-anchor="middle" font-family="Arial" font-weight="700" font-size="19" fill="${t}">Get started</text><rect x="256" y="250" width="150" height="54" rx="27" fill="none" stroke="${r.dark}" stroke-width="2"/><text x="331" y="284" text-anchor="middle" font-family="Arial" font-weight="700" font-size="19" fill="${r.dark}">Learn more</text><rect x="470" y="110" width="280" height="200" rx="22" fill="${r.accent}"/><circle cx="610" cy="210" r="60" fill="${r.light}" opacity="0.5"/>${[0, 1, 2].map((i) => `<rect x="${60 + i * 235}" y="360" width="210" height="190" rx="18" fill="#FFFFFF" stroke="${r.mid}" stroke-opacity="0.25"/><rect x="${80 + i * 235}" y="380" width="44" height="44" rx="12" fill="${[r.primary, r.accent, r.mid][i]}"/><text x="${80 + i * 235}" y="460" font-family="Arial" font-weight="700" font-size="19" fill="${r.dark}">Feature ${i + 1}</text><rect x="${80 + i * 235}" y="478" width="150" height="9" rx="4" fill="${r.mid}" opacity="0.35"/><rect x="${80 + i * 235}" y="498" width="120" height="9" rx="4" fill="${r.mid}" opacity="0.35"/>`).join('')}</svg>`;
    if (preview === 'social') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${r.primary}"/><stop offset="1" stop-color="${r.accent}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="520" cy="80" r="150" fill="${r.light}" opacity="0.18"/><rect x="50" y="50" width="120" height="40" rx="20" fill="${r.dark}"/><text x="110" y="77" text-anchor="middle" font-family="Arial" font-weight="700" font-size="18" fill="${r.light}">NEW</text><text x="50" y="330" font-family="Arial Black, Arial" font-weight="900" font-size="76" fill="${readableOn(r.primary)}">50% OFF</text><text x="50" y="385" font-family="Arial" font-size="28" fill="${readableOn(r.primary)}">This weekend only</text><rect x="50" y="470" width="220" height="64" rx="32" fill="${r.light}"/><text x="160" y="511" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="${r.dark}">Shop now</text></svg>`;
    return kitMockupSvg({ ...DEFAULT_KIT, body: r.primary, sleeve: r.dark, collar: r.accent, accent: r.accent, accent2: r.light, graphic: 'sash', nameColor: readableOn(r.primary), numberColor: readableOn(r.primary), outlineColor: r.dark, font: 'Arial Black', patternOn: 'none', frontText: '' }, DEFAULT_PATTERN, { name: 'COLOUR', number: '10', size: 'M' }, {});
  }, [preview, r]);

  const btn = 'h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center gap-1.5 hover:border-mt-ink/40 disabled:opacity-40';
  return (
    <section id="palette-generator" aria-labelledby="gen-title" className="rounded-3xl border border-mt-border bg-mt-surface p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="gen-title" className="text-2xl font-semibold tracking-tight mr-auto">Palette generator</h2>
        <select value={mode} onChange={(e) => setMode(e.target.value as GenMode)} aria-label="Palette style" className="h-10 rounded-full border border-mt-border bg-mt-bg px-3 text-[13.5px] font-semibold">{GEN_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select>
        <button type="button" onClick={undo} disabled={!hist.length} aria-label="Previous palette" className="h-10 w-10 grid place-items-center rounded-full border border-mt-border disabled:opacity-40"><ArrowLeft size={15} /></button>
        <button type="button" onClick={redo} disabled={!fut.length} aria-label="Next palette" className="h-10 w-10 grid place-items-center rounded-full border border-mt-border disabled:opacity-40"><ArrowRight size={15} /></button>
        <button type="button" onClick={() => imgRef.current?.click()} className={btn}><ImagePlus size={15} /> From a photo</button>
        <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) fromImage(f); }} />
        <button type="button" onClick={generate} className="h-10 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2"><RefreshCw size={15} /> Generate</button>
      </div>
      <p className="text-[12.5px] text-mt-muted">Press <kbd className="rounded border border-mt-border px-1.5 py-0.5 text-[11px]">Space</kbd> for a new palette. Lock the colours you like — they stay. Drag to reorder.</p>

      {/* Swatches */}
      <div className="flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-mt-border sm:h-72">
        {cols.map((c, i) => {
          const on = readableOn(c);
          const best = Math.max(contrast(c, '#FFFFFF'), contrast(c, '#000000'));
          return (
            <div key={i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); }}
              className="group relative flex-1 min-h-[76px] sm:min-h-0 flex sm:flex-col items-center sm:justify-end justify-between gap-2 px-4 py-3 sm:pb-5 transition-[flex] duration-300 sm:hover:flex-[1.35]" style={{ background: c, color: on }}>
              <div className="flex sm:flex-col items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity order-2 sm:order-none">
                <button type="button" onClick={() => setLocks((l) => l.map((x, k) => (k === i ? !x : x)))} aria-label={locks[i] ? `Unlock ${c}` : `Lock ${c}`} aria-pressed={locks[i]} className={`h-9 w-9 grid place-items-center rounded-full hover:bg-black/10 ${locks[i] ? 'opacity-100' : ''}`} style={{ opacity: locks[i] ? 1 : undefined }}>{locks[i] ? <Lock size={16} /> : <Unlock size={16} />}</button>
                <label className="h-9 w-9 grid place-items-center rounded-full hover:bg-black/10 cursor-pointer relative" title="Edit colour"><Wand2 size={16} /><input type="color" value={c} onChange={(e) => edit(i, e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label={`Edit ${c}`} /></label>
                <button type="button" onClick={() => copy(c)} aria-label={`Copy ${c}`} className="h-9 w-9 grid place-items-center rounded-full hover:bg-black/10">{copied === c ? <Check size={16} /> : <Copy size={16} />}</button>
                {cols.length > 2 && <button type="button" onClick={() => remove(i)} aria-label={`Remove ${c}`} className="h-9 w-9 grid place-items-center rounded-full hover:bg-black/10"><X size={16} /></button>}
              </div>
              <div className="sm:text-center order-1 sm:order-none">
                <button type="button" onClick={() => copy(c)} className="font-mono text-[17px] sm:text-[19px] font-bold tracking-wide">{c.replace('#', '')}</button>
                <p className="text-[12px] opacity-80">{colourName(c)}{locks[i] && <Lock size={10} className="inline ml-1 -mt-0.5" />}</p>
                <p className="text-[10.5px] opacity-70">{best >= 7 ? 'AAA' : best >= 4.5 ? 'AA' : 'Large text'} · {best.toFixed(1)}:1</p>
              </div>
            </div>
          );
        })}
        {cols.length < 8 && <button type="button" onClick={add} aria-label="Add a colour" className="sm:w-12 h-12 sm:h-auto grid place-items-center bg-mt-bg text-mt-muted hover:text-mt-ink"><Plus size={18} /></button>}
      </div>

      {/* Live preview + actions */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-2xl border border-mt-border bg-mt-bg p-3">
          <div role="tablist" aria-label="Preview" className="mb-3 inline-flex rounded-full border border-mt-border bg-mt-surface p-0.5">
            {([['poster', 'Poster'], ['web', 'Website'], ['social', 'Social post'], ['jersey', 'Jersey']] as const).map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={preview === id} onClick={() => setPreview(id)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold ${preview === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{l}</button>)}
          </div>
          <img src={svgDataUrl(art)} alt={`Palette preview: ${preview}`} className="mx-auto max-h-[420px] w-full object-contain" />
        </div>
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Use this palette</p>
          <button type="button" onClick={() => { onSave(cols); setSaved(true); }} className={`${btn} w-full justify-center`}>{saved ? <Check size={15} /> : <Save size={15} />} {saved ? 'Saved' : 'Save palette'}</button>
          <button type="button" onClick={() => onEditor(cols)} className="h-10 w-full rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5"><Wand2 size={15} /> Use in a design</button>
          <a href={`/custom-jersey-designer?colors=${cols.map((c) => c.slice(1)).join(',')}`} className={`${btn} w-full justify-center`}><Shirt size={15} /> Use on a jersey</a>
          <button type="button" onClick={() => onPattern(cols)} className={`${btn} w-full justify-center`}>Use in a pattern</button>
          <button type="button" onClick={() => onTemplates(cols)} className={`${btn} w-full justify-center`}>Templates in these colours</button>
          <button type="button" onClick={() => copy(cols.join(', '))} className={`${btn} w-full justify-center`}>{copied === cols.join(', ') ? <Check size={15} /> : <Copy size={15} />} Copy all HEX</button>
          <div className="[&_summary]:w-full [&_summary]:justify-center">{exportMenu(cols)}</div>
        </div>
      </div>
    </section>
  );
}
