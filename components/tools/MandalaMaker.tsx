'use client';

// Rangoli & Mandala Maker — one creative workspace (no steps):
//  · toolbar: Select / Draw, symmetry, mirror, colour, brush, undo/redo,
//    zoom, guides, downloads and "use in a design"
//  · left: starting designs and elements to add
//  · centre: the canvas (click a layer to select it, or draw — every stroke
//    repeats around the centre)
//  · right: palettes, layers and the selected layer's settings.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { putAsset } from '@/lib/assets/library';
import { DEFAULT_PATTERN, type PatternSettings } from '@/lib/patterns';
import { ArrowDown, ArrowUp, Copy, Download, Eraser, Eye, EyeOff, MousePointer2, Paintbrush, Redo2, RotateCw, Shuffle, Trash2, Undo2, Wand2, ZoomIn, ZoomOut } from 'lucide-react';
import { KINDS, MKind, MANDALA_PALETTES, MLayer, Mandala, Pt, RANGOLI_COLOURS, layerLabel, layerSvg, mandalaSvg, preset, recolour, surprise, withSymmetry } from '@/lib/mandala';
import { PATTERN_MOTIFS } from '@/lib/patternMotifs';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

const STORE = 'mt:mandala';
const ELEMENTS: { id: string; label: string; motif?: string; make: (sym: number, color: string, r: number) => MLayer }[] = [
  { id: 'petals', label: 'Petals', motif: 'petal', make: (n, c, r) => ({ kind: 'ring', motif: 'petal', count: n, radius: r, size: 80, rotate: 0, color: c, outline: false }) },
  { id: 'flowers', label: 'Flowers', motif: 'flower6', make: (n, c, r) => ({ kind: 'ring', motif: 'flower6', count: n, radius: r, size: 70, rotate: 0, color: c, outline: false }) },
  { id: 'circles', label: 'Circles', motif: 'dot', make: (n, c, r) => ({ kind: 'ring', motif: 'dot', count: n * 2, radius: r, size: 40, rotate: 0, color: c, outline: true }) },
  { id: 'dots', label: 'Dots', make: (n, c, r) => ({ kind: 'dots', count: n * 3, radius: r, size: 6, color: c }) },
  { id: 'lines', label: 'Lines', make: (n, c, r) => ({ kind: 'spokes', count: n * 2, r1: Math.max(0, r - 60), r2: r + 60, width: 4, color: c }) },
  { id: 'shapes', label: 'Geometric shapes', motif: 'diamond', make: (n, c, r) => ({ kind: 'ring', motif: 'diamond', count: n, radius: r, size: 60, rotate: 0, color: c, outline: false }) },
  { id: 'leaves', label: 'Leaves', motif: 'leaf', make: (n, c, r) => ({ kind: 'ring', motif: 'leaf', count: n, radius: r, size: 75, rotate: 0, color: c, outline: false }) },
  { id: 'border', label: 'Decorative border', make: (n, c, r) => ({ kind: 'border', radius: r, width: 5, color: c, style: 'scallop', count: n * 3 }) },
];
const RING_MOTIFS = ['petal', 'flower6', 'flower8', 'blossom5', 'leaf', 'leaf-slim', 'drop', 'paisley', 'lotus', 'diamond', 'star5', 'heart', 'tulip', 'petal4', 'cherry-blossom', 'moroccan', 'arabesque', 'mandala', 'sun', 'snowflake', 'crescent', 'triangle', 'dot'];

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function svgToImage(svg: string, size: number, type: 'image/png' | 'image/jpeg', bg?: string): Promise<Blob> {
  const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = url; });
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const g = c.getContext('2d')!; if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
    g.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('img'))), type, 0.95));
  } finally { URL.revokeObjectURL(url); }
}

export function MandalaMaker() {
  const router = useRouter();
  const [m, setM] = useState<Mandala>(() => preset('rangoli', 0));
  const [past, setPast] = useState<Mandala[]>([]);
  const [future, setFuture] = useState<Mandala[]>([]);
  const [kind, setKind] = useState<MKind>('rangoli');
  const [sym, setSym] = useState(8);
  const [mirror, setMirror] = useState(true);
  const [color, setColor] = useState(RANGOLI_COLOURS[2]);
  const [width, setWidth] = useState(8);
  const [radius, setRadius] = useState(300);
  const [sel, setSel] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [live, setLive] = useState<Pt[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { try { const v = localStorage.getItem(STORE); if (v) { const j = JSON.parse(v); if (j?.layers) setM(j); } } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(m)); } catch { /* ignore */ } }, [m]);

  // Every change goes through here, so Undo / Redo cover everything.
  const change = (next: Mandala | ((x: Mandala) => Mandala)) => { setPast((p) => [...p.slice(-60), m]); setFuture([]); setM((x) => (typeof next === 'function' ? next(x) : next)); };
  const undo = () => { if (!past.length) return; setFuture((f) => [m, ...f]); setM(past[past.length - 1]); setPast((p) => p.slice(0, -1)); setSel(null); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, m]); setM(future[0]); setFuture((f) => f.slice(1)); };
  const push = (l: MLayer) => { change((x) => ({ ...x, layers: [...x.layers, l] })); setSel(m.layers.length); };
  const editLayer = (i: number, o: Partial<MLayer>) => change((x) => ({ ...x, layers: x.layers.map((l, k) => (k === i ? ({ ...l, ...o } as MLayer) : l)) }));
  const moveLayer = (i: number, d: number) => change((x) => { const ls = [...x.layers]; const j = i + d; if (j < 0 || j >= ls.length) return x; [ls[i], ls[j]] = [ls[j], ls[i]]; setSel(j); return { ...x, layers: ls }; });

  const toLocal = (e: React.PointerEvent): Pt => {
    const b = svgRef.current!.getBoundingClientRect();
    return [(((e.clientX - b.left) / b.width) * 1000 - 500) / zoom, (((e.clientY - b.top) / b.height) * 1000 - 500) / zoom];
  };
  const down = (e: React.PointerEvent) => {
    if (!drawMode) { const g = (e.target as Element).closest('[data-layer]'); setSel(g ? Number(g.getAttribute('data-layer')) : null); return; }
    (e.target as Element).setPointerCapture?.(e.pointerId); setLive([toLocal(e)]);
  };
  const move = (e: React.PointerEvent) => { if (!live) return; const p = toLocal(e); const l = live[live.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 4) setLive([...live, p]); };
  const up = () => { if (live && live.length) push({ kind: 'stroke', pts: live, color, width, sym, mirror }); setLive(null); };

  const svg = useMemo(() => mandalaSvg(m, { transparent }), [m, transparent]);
  const body = useMemo(() => m.layers.map((l, i) => `<g data-layer="${i}"${sel === i ? ' class="mt-sel"' : ''}>${layerSvg(l)}</g>`).join(''), [m.layers, sel]);
  const liveLayer = live ? layerSvg({ kind: 'stroke', pts: live, color, width, sym, mirror }) : '';
  const thumbs = useMemo(() => Array.from({ length: 6 }, (_, i) => preset(kind, i, sym)), [kind, sym]);
  const L = sel !== null ? m.layers[sel] : null;

  const toEditor = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent('/patterns?mode=rangoli')); return; }
    setBusy('editor');
    const size = 1080;
    const mod: any = await import('fabric');
    const F = mod.fabric;
    const group: any = await new Promise((res) => F.loadSVGFromString(mandalaSvg(m, { transparent: true, size }), (objs: any[], opts: any) => res(F.util.groupSVGElements(objs, opts))));
    group.set({ left: 0, top: 0, originX: 'left', originY: 'top', name: 'Rangoli (ungroup to edit)' });
    group.scaleToWidth(size);
    const canvas = { version: '5.1.0', background: transparent ? '#FFFFFF' : m.background, objects: [group.toObject(['name'])] };
    const key = newLocalKey();
    putHandoff(key, { opened: { document: { name: 'Rangoli design', width: size, height: size, editor: 'design' }, canvas, fonts: [], thumbnail: null, template: null, missingAssets: [] } as any, file: { handle: null, fileName: 'Rangoli design.mtd.svg' } });
    router.push(editorUrlForLocal(key, size, size));
  };
  const pdf = async () => {
    setBusy('pdf');
    try {
      // Vector PDF, 200 × 200 mm.
      const { svgToPdfBlob } = await import('@/lib/svgToPdf');
      save(await svgToPdfBlob(mandalaSvg(m, { transparent, size: 200 }), 200, 200), 'rangoli.pdf');
    } finally { setBusy(null); }
  };

  const chip = 'h-9 px-3 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:border-mt-ink/40 disabled:opacity-40';
  const pill = (on: boolean) => `h-9 px-3 rounded-full border text-[13px] font-semibold ${on ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`;
  const slider = (label: string, v: number, min: number, max: number, on: (n: number) => void, step = 1) => <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>{label}</span><span className="text-mt-ink tabular-nums">{v}</span></span><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>;

  // Save this rangoli to the shared on-device library as a repeat pattern
  // (half-drop, the rangoli as the motif), so the Textile and Wallpaper
  // designers can use the exact same design.
  const [libMsg, setLibMsg] = useState<string | null>(null);
  const saveToLibrary = async () => {
    try {
      const art = mandalaSvg({ ...m, background: 'transparent' } as any, { size: 600 });
      const image = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(art)))}`;
      const p = { ...DEFAULT_PATTERN, motif: 'image', image, repeat: 'half-drop', scale: 0.9, background: m.background, colors: [m.layers[0]?.color || '#C2185B'] } as PatternSettings;
      const a = await putAsset({ kind: 'pattern', name: `${KINDS.find((k) => k.id === kind)?.label || 'Rangoli'} pattern`, data: p, thumb: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mandalaSvg(m, { size: 200 }))}`, source: 'rangoli' });
      setLibMsg(`Saved “${a.name}” to My patterns.`);
    } catch (e: any) { setLibMsg(e?.message || 'Could not save on this device.'); }
  };
  const panel = 'rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-4';
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-mt-muted">{children}</h3>;
  const icon = 'h-9 w-9 grid place-items-center rounded-full hover:bg-mt-surface2 disabled:opacity-40';
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-mt-border bg-mt-surface p-1.5">
        <div className="inline-flex rounded-full border border-mt-border p-0.5" role="radiogroup" aria-label="Tool">
          <button type="button" role="radio" aria-checked={!drawMode} onClick={() => setDrawMode(false)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${!drawMode ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}><MousePointer2 size={13} /> Select</button>
          <button type="button" role="radio" aria-checked={drawMode} onClick={() => setDrawMode(true)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${drawMode ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}><Paintbrush size={13} /> Draw</button>
        </div>
        <span className="mx-1 h-6 w-px bg-mt-border" />
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold">Symmetry
          <select value={sym} onChange={(e) => { const n = Number(e.target.value); setSym(n); change((x) => withSymmetry(x, n)); }} className="h-8 rounded-full border border-mt-border bg-mt-bg px-2 text-[12.5px]">{Array.from({ length: 34 }, (_, i) => i + 3).map((n) => <option key={n} value={n}>{n}-fold</option>)}</select>
        </label>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Mirror</label>
        {drawMode && <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold">Brush<input type="range" min={2} max={40} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-20 accent-[#3B82C4]" aria-label="Brush width" /></label>}
        <span className="inline-flex items-center gap-1">{RANGOLI_COLOURS.slice(0, 8).map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => { setColor(c); if (sel !== null) editLayer(sel, { color: c }); }} className={`h-6 w-6 rounded-full ring-1 ring-black/15 ${color === c ? 'ring-2 ring-[#3B82C4] ring-offset-1 ring-offset-mt-surface' : ''}`} style={{ background: c }} />)}
          <label className="h-6 w-6 rounded-full overflow-hidden relative ring-1 ring-black/15 cursor-pointer" style={{ background: 'conic-gradient(#F2708F,#F7C948,#8CC84B,#35C2F1,#A69BD3,#F2708F)' }}><input type="color" value={color} onChange={(e) => { setColor(e.target.value); if (sel !== null) editLayer(sel, { color: e.target.value }); }} className="absolute inset-0 opacity-0" aria-label="Any colour" /></label></span>
        <span className="mx-1 h-6 w-px bg-mt-border" />
        <button type="button" onClick={undo} disabled={!past.length} className={icon} aria-label="Undo" title="Undo"><Undo2 size={15} /></button>
        <button type="button" onClick={redo} disabled={!future.length} className={icon} aria-label="Redo" title="Redo"><Redo2 size={15} /></button>
        <button type="button" onClick={() => change((x) => ({ ...x, layers: x.layers.map((l) => ({ ...l, turn: ((l.turn || 0) + 360 / Math.max(1, sym) / 2) % 360 })) }))} className={icon} aria-label="Rotate the whole design" title="Rotate the whole design"><RotateCw size={15} /></button>
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} className={icon} aria-label="Zoom out"><ZoomOut size={15} /></button>
        <span className="w-10 text-center text-[12px] tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} className={icon} aria-label="Zoom in"><ZoomIn size={15} /></button>
        <label className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Guides</label>
        <span className="ml-auto" />
        <button type="button" onClick={toEditor} disabled={!!busy} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"><Wand2 size={14} /> Use in a design</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[250px_minmax(0,1fr)_280px] lg:items-start">
        {/* Left: start and add */}
        <aside className={`${panel} xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto order-2 lg:order-3 xl:order-none lg:col-span-2 xl:col-span-1 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0 xl:block xl:space-y-4`}>
          <div className="flex flex-wrap gap-1">{KINDS.map((k) => <button key={k.id} type="button" aria-pressed={kind === k.id} title={k.hint} onClick={() => { setKind(k.id); change(preset(k.id, 0, sym)); setSel(null); }} className={pill(kind === k.id) + ' h-8 text-[12px]'}>{k.label}</button>)}</div>
          <section className="space-y-2">
            <H>Start from</H>
            <div className="grid grid-cols-3 gap-1.5">
              {thumbs.map((t, i) => (
                <button key={i} type="button" onClick={() => { change(t); setSel(null); }} className="aspect-square rounded-xl overflow-hidden border border-mt-border hover:ring-2 hover:ring-[#3B82C4]" aria-label={`Starting design ${i + 1}`}>
                  <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(mandalaSvg(t, { size: 200 }))}`} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => { change(surprise(Math.floor(Math.random() * 1e6))); setSel(null); }} className={`${chip} justify-center`}><Shuffle size={13} /> Surprise</button>
              <button type="button" onClick={() => { change({ ...m, layers: [] }); setSel(null); }} className={`${chip} justify-center`}><Eraser size={13} /> Blank</button>
            </div>
          </section>
          <section className="space-y-2">
            <H>Add elements</H>
            {slider('Distance from centre', radius, 0, 470, setRadius, 5)}
            <div className="grid grid-cols-2 gap-1.5">
              {ELEMENTS.map((el) => {
                const mo = el.motif ? PATTERN_MOTIFS.find((x) => x.id === el.motif) : null;
                return (
                  <button key={el.id} type="button" onClick={() => push(el.make(sym, color, radius))} className="flex items-center gap-2 rounded-xl border border-mt-border px-2 py-1.5 text-left text-[12.5px] font-medium hover:border-mt-ink/40">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-mt-surface2">{mo ? <svg viewBox="-55 -55 110 110" className="h-3.5 w-3.5"><path d={mo.d} fill="currentColor" fillRule="evenodd" /></svg> : el.id === 'dots' ? '•' : el.id === 'lines' ? '✳' : '◯'}</span><span className="truncate">{el.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        {/* Canvas */}
        <div className="min-w-0 order-1 xl:order-none">
          <div className="relative mx-auto w-full max-w-[720px] aspect-square rounded-3xl overflow-hidden border border-mt-border touch-none select-none shadow-sm" style={{ background: m.background }}>
            <svg ref={svgRef} viewBox="0 0 1000 1000" className={`absolute inset-0 h-full w-full ${drawMode ? 'cursor-crosshair' : 'cursor-pointer'} [&_.mt-sel]:[filter:drop-shadow(0_0_6px_#3B82C4)]`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} role="img" aria-label="Rangoli canvas">
              <g transform={`translate(500 500) scale(${zoom})`}>
                {guides && <g opacity="0.25" stroke="#94A3B8" fill="none" strokeWidth={1 / zoom} pointerEvents="none">{[100, 200, 300, 400].map((r) => <circle key={r} r={r} />)}{Array.from({ length: Math.max(1, sym) }, (_, k) => <line key={k} x1="0" y1="0" x2={Math.sin((k / sym) * Math.PI * 2) * 480} y2={-Math.cos((k / sym) * Math.PI * 2) * 480} />)}</g>}
                <g dangerouslySetInnerHTML={{ __html: body + liveLayer }} />
              </g>
            </svg>
          </div>
          <p className="mt-2 text-center text-[12px] text-mt-muted">{drawMode ? 'Draw anywhere — every stroke repeats around the centre.' : 'Click a part of the design to select its layer.'} Saved on this device automatically.</p>
        </div>

        {/* Right: colours and layers */}
        <aside className={`${panel} lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto order-3 lg:order-2 xl:order-none`}>
          <section className="space-y-2">
            <H>Palette</H>
            <div className="grid grid-cols-2 gap-1.5">
              {MANDALA_PALETTES.map((p) => (
                <button key={p.name} type="button" title={p.name} onClick={() => change((x) => recolour(x, p))} className="rounded-xl border border-mt-border p-1 hover:border-mt-ink/40">
                  <span className="flex h-6 overflow-hidden rounded-md ring-1 ring-black/5" style={{ background: p.background }}>{p.colors.map((c, i) => <span key={c + i} className="flex-1 m-0.5 rounded-sm" style={{ background: c }} />)}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-medium">{p.name}</span>
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between text-[12.5px]">Floor colour<input type="color" value={m.background} onChange={(e) => change({ ...m, background: e.target.value })} className="h-8 w-10 rounded-md border border-mt-border bg-transparent" /></label>
          </section>
          <section className="space-y-2">
            <H>Download</H>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={pdf} disabled={!!busy} className={`${chip} justify-center`}><Download size={13} /> {busy === 'pdf' ? 'Making…' : 'Vector PDF'}</button>
              <button type="button" onClick={() => save(new Blob([svg], { type: 'image/svg+xml' }), 'rangoli.svg')} className={`${chip} justify-center`}><Download size={13} /> SVG</button>
              <button type="button" onClick={async () => save(await svgToImage(svg, 2400, 'image/png'), 'rangoli.png')} className={`${chip} justify-center`}><Download size={13} /> PNG</button>
              <button type="button" onClick={async () => save(await svgToImage(mandalaSvg(m), 2400, 'image/jpeg', m.background), 'rangoli.jpg')} className={`${chip} justify-center`}><Download size={13} /> JPEG</button>
            </div>
            <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Transparent background</label>
          </section>
          <section className="space-y-2">
            <H>Use it elsewhere</H>
            <button type="button" onClick={saveToLibrary} className={`${chip} w-full justify-center`}>Save to My patterns</button>
            <p className="text-[11.5px] text-mt-muted">Saved as a repeat pattern (this rangoli as the motif) — it appears in the Textile and Wallpaper designers. Stays on this device.</p>
            {libMsg && <p role="status" className="text-[12px] font-medium">{libMsg}</p>}
          </section>
          <section className="space-y-2">
            <H>Layers</H>
            <ul className="space-y-1 max-h-48 overflow-y-auto" aria-label="Layers (top is drawn last)">
              {m.layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => (
                <li key={i} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12.5px] ${sel === i ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}>
                  <span className="h-4 w-4 rounded-full ring-1 ring-black/10 shrink-0" style={{ background: l.color }} />
                  <button type="button" onClick={() => setSel(i)} className="flex-1 text-left truncate">{layerLabel(l)}</button>
                  <button type="button" onClick={() => editLayer(i, { hidden: !l.hidden })} aria-label={l.hidden ? 'Show layer' : 'Hide layer'} className="p-1">{l.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                </li>
              ))}
              {!m.layers.length && <li className="text-[12px] text-mt-muted">No layers yet — add elements or draw.</li>}
            </ul>
          </section>
          {L && sel !== null ? (
            <div className="rounded-xl bg-mt-bg p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => moveLayer(sel, 1)} className={chip} aria-label="Bring forward"><ArrowUp size={13} /></button>
                <button type="button" onClick={() => moveLayer(sel, -1)} className={chip} aria-label="Send back"><ArrowDown size={13} /></button>
                <button type="button" onClick={() => push({ ...L, turn: ((L.turn || 0) + 180 / Math.max(1, sym)) % 360 })} className={chip}><Copy size={13} /> Duplicate</button>
                <button type="button" onClick={() => { change((x) => ({ ...x, layers: x.layers.filter((_, k) => k !== sel) })); setSel(null); }} className={chip}><Trash2 size={13} /> Delete</button>
              </div>
              <label className="flex items-center justify-between text-[12px] text-mt-muted">Colour<input type="color" value={L.color} onChange={(e) => editLayer(sel, { color: e.target.value })} className="h-7 w-9 rounded border border-mt-border bg-transparent" /></label>
              {L.kind !== 'stroke' && (
                <label className="flex items-center justify-between text-[12px] text-mt-muted">Gradient to
                  <span className="flex items-center gap-1.5">{L.gradient && <input type="color" value={L.gradient[1]} onChange={(e) => editLayer(sel, { gradient: [L.color, e.target.value] as [string, string] })} className="h-7 w-9 rounded border border-mt-border bg-transparent" />}<input type="checkbox" checked={!!L.gradient} onChange={(e) => editLayer(sel, { gradient: e.target.checked ? ([L.color, '#FFFFFF'] as [string, string]) : null })} className="h-4 w-4 accent-[#3B82C4]" /></span></label>
              )}
              {slider('Rotate', Math.round(L.turn || 0), 0, 360, (n) => editLayer(sel, { turn: n }), 1)}
              {L.kind === 'ring' && <>{slider('Size', Math.round(L.size), 10, 240, (n) => editLayer(sel, { size: n }))}{L.count > 1 && slider('Distance', Math.round(L.radius), 0, 470, (n) => editLayer(sel, { radius: n }))}{L.count > 1 && slider('Count', L.count, 1, 48, (n) => editLayer(sel, { count: n }))}</>}
              {L.kind === 'dots' && <>{slider('Dot size', Math.round(L.size), 1, 30, (n) => editLayer(sel, { size: n }))}{slider('Distance', Math.round(L.radius), 0, 470, (n) => editLayer(sel, { radius: n }))}{slider('Count', L.count, 3, 120, (n) => editLayer(sel, { count: n }))}</>}
              {L.kind === 'spokes' && <>{slider('From', Math.round(L.r1), 0, 470, (n) => editLayer(sel, { r1: n }))}{slider('To', Math.round(L.r2), 0, 480, (n) => editLayer(sel, { r2: n }))}{slider('Width', L.width, 1, 20, (n) => editLayer(sel, { width: n }))}</>}
              {L.kind === 'border' && <>{slider('Distance', Math.round(L.radius), 20, 480, (n) => editLayer(sel, { radius: n }))}{slider('Width', L.width, 1, 20, (n) => editLayer(sel, { width: n }))}<div className="flex flex-wrap gap-1">{(['line', 'double', 'scallop', 'dots'] as const).map((s) => <button key={s} type="button" aria-pressed={L.style === s} onClick={() => editLayer(sel, { style: s })} className={`${pill(L.style === s)} h-7 text-[12px] capitalize`}>{s}</button>)}</div></>}
              {L.kind === 'stroke' && slider('Line width', L.width, 1, 40, (n) => editLayer(sel, { width: n }))}
              <details className="text-[12px]">
                <summary className="cursor-pointer text-mt-muted">More settings</summary>
                {L.kind === 'ring' && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-6 gap-1.5 max-h-32 overflow-y-auto">{RING_MOTIFS.map((id) => { const mo = PATTERN_MOTIFS.find((x) => x.id === id); if (!mo) return null; return <button key={id} type="button" title={mo.label} aria-label={mo.label} aria-pressed={L.motif === id} onClick={() => editLayer(sel, { motif: id })} className={`aspect-square rounded-lg border grid place-items-center ${L.motif === id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}><svg viewBox="-55 -55 110 110" className="h-5 w-5"><path d={mo.d} fill="currentColor" fillRule="evenodd" /></svg></button>; })}</div>
                    {slider('Turn each shape', L.rotate, 0, 360, (n) => editLayer(sel, { rotate: n }), 5)}
                    <label className="flex items-center justify-between">Outline only<input type="checkbox" checked={L.outline} onChange={(e) => editLayer(sel, { outline: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /></label>
                  </div>
                )}
                {L.kind === 'stroke' && <label className="mt-2 flex items-center justify-between">Mirrored<input type="checkbox" checked={L.mirror} onChange={(e) => editLayer(sel, { mirror: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /></label>}
                {L.kind === 'border' && slider('Scallops / dots', L.count, 6, 120, (n) => editLayer(sel, { count: n }))}
              </details>
            </div>
          ) : <p className="text-[12px] text-mt-muted">Select a layer (here or on the canvas) to change its colour, size, distance and shape.</p>}
        </aside>
      </div>
    </div>
  );
}
