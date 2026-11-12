'use client';

// Rangoli & Mandala Maker — draw once and it repeats around the centre
// (4 to 24 times, mirrored if you like), add rings of flowers, petals and
// dots, or press "Surprise me" for a ready rangoli. Download SVG, PNG or
// PDF, or open it in the editor as editable vector shapes.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eraser, Paintbrush, Plus, Redo2, Shuffle, Undo2, Wand2 } from 'lucide-react';
import { BACKGROUNDS, MLayer, Mandala, Pt, RANGOLI_COLOURS, layerSvg, mandalaSvg, surprise } from '@/lib/mandala';
import { PATTERN_MOTIFS } from '@/lib/patternMotifs';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

const RING_MOTIFS = ['petal', 'flower6', 'flower8', 'blossom5', 'leaf', 'leaf-slim', 'drop', 'paisley', 'lotus', 'diamond', 'star5', 'heart', 'tulip', 'petal4', 'cherry-blossom', 'moroccan', 'arabesque', 'mandala', 'sun', 'snowflake', 'crescent', 'triangle', 'dot'];
const STORE = 'mt:mandala';

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function svgToPng(svg: string, size: number): Promise<Blob> {
  const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = url; });
    const c = document.createElement('canvas'); c.width = size; c.height = size; c.getContext('2d')!.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export function MandalaMaker() {
  const router = useRouter();
  const [m, setM] = useState<Mandala>(() => surprise(11));
  const [redo, setRedo] = useState<MLayer[]>([]);
  const [color, setColor] = useState(RANGOLI_COLOURS[2]);
  const [width, setWidth] = useState(8);
  const [sym, setSym] = useState(8);
  const [mirror, setMirror] = useState(true);
  const [guides, setGuides] = useState(true);
  const [transparent, setTransparent] = useState(false);
  const [ring, setRing] = useState({ motif: 'petal', count: 8, radius: 220, size: 80, rotate: 0, outline: false });
  const [live, setLive] = useState<Pt[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => { try { const v = localStorage.getItem(STORE); if (v) setM(JSON.parse(v)); } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(m)); } catch { /* ignore */ } }, [m]);

  const push = (l: MLayer) => { setM((x) => ({ ...x, layers: [...x.layers, l] })); setRedo([]); };
  const undo = () => setM((x) => { if (!x.layers.length) return x; setRedo((r) => [...r, x.layers[x.layers.length - 1]]); return { ...x, layers: x.layers.slice(0, -1) }; });
  const redoOne = () => setRedo((r) => { if (!r.length) return r; const l = r[r.length - 1]; setM((x) => ({ ...x, layers: [...x.layers, l] })); return r.slice(0, -1); });

  const toLocal = (e: React.PointerEvent): Pt => {
    const b = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - b.left) / b.width) * 1000 - 500, ((e.clientY - b.top) / b.height) * 1000 - 500];
  };
  const down = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); setLive([toLocal(e)]); };
  const move = (e: React.PointerEvent) => { if (!live) return; const p = toLocal(e); const l = live[live.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 4) setLive([...live, p]); };
  const up = () => { if (live && live.length) push({ kind: 'stroke', pts: live, color, width, sym, mirror }); setLive(null); };

  const svg = useMemo(() => mandalaSvg(m, { transparent }), [m, transparent]);
  const liveLayer = live ? layerSvg({ kind: 'stroke', pts: live, color, width, sym, mirror }) : '';
  const body = useMemo(() => m.layers.map(layerSvg).join(''), [m.layers]);

  const toEditor = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent('/rangoli-mandala-maker')); return; }
    const size = 1080;
    // Real vector shapes: the SVG is parsed into Fabric paths and grouped (Ungroup to edit each piece).
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
    const { jsPDF } = await import('jspdf');
    const png = await svgToPng(svg, 2400);
    const url: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(png); });
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.addImage(url, 'PNG', 15, 48, 180, 180);
    save(doc.output('blob'), 'rangoli.pdf');
  };

  const chip = 'h-9 px-3 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:border-mt-ink/40';
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <button type="button" onClick={() => { setM(surprise(Math.floor(Math.random() * 1e6))); setRedo([]); }} className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2"><Shuffle size={16} /> Surprise me</button>
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted inline-flex items-center gap-1.5"><Paintbrush size={13} /> Draw</h2>
          <div className="flex flex-wrap gap-1.5">{RANGOLI_COLOURS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ring-1 ring-black/15 ${color === c ? 'ring-2 ring-[#3B82C4] ring-offset-2 ring-offset-mt-surface' : ''}`} style={{ background: c }} />)}
            <label className="h-7 w-7 rounded-full overflow-hidden relative ring-1 ring-black/15 cursor-pointer" style={{ background: 'conic-gradient(#F2708F,#F7C948,#8CC84B,#35C2F1,#A69BD3,#F2708F)' }}><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0" aria-label="Any colour" /></label>
          </div>
          <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Repeats around the centre</span><span className="text-mt-ink tabular-nums">{sym}</span></span><input type="range" min={1} max={24} value={sym} onChange={(e) => setSym(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>
          <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Line width</span><span className="text-mt-ink tabular-nums">{width}</span></span><input type="range" min={2} max={40} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>
          <label className="flex items-center justify-between text-[13px]"><span>Mirror each stroke</span><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /></label>
          <label className="flex items-center justify-between text-[13px]"><span>Show guides</span><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /></label>
        </section>
        <section className="space-y-3 border-t border-mt-border pt-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Add a ring</h2>
          <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto">
            {RING_MOTIFS.map((id) => { const mo = PATTERN_MOTIFS.find((x) => x.id === id); if (!mo) return null; return (
              <button key={id} type="button" title={mo.label} aria-label={mo.label} aria-pressed={ring.motif === id} onClick={() => setRing({ ...ring, motif: id })} className={`aspect-square rounded-lg border grid place-items-center ${ring.motif === id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}><svg viewBox="-55 -55 110 110" className="h-5 w-5"><path d={mo.d} fill="currentColor" fillRule="evenodd" /></svg></button>
            ); })}
          </div>
          {([['Count', 'count', 1, 36, 1], ['Distance from centre', 'radius', 0, 460, 2], ['Size', 'size', 10, 220, 1], ['Turn', 'rotate', 0, 360, 5]] as const).map(([l, k, mn, mx, st]) => (
            <label key={k} className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>{l}</span><span className="text-mt-ink tabular-nums">{(ring as any)[k]}</span></span><input type="range" min={mn} max={mx} step={st} value={(ring as any)[k]} onChange={(e) => setRing({ ...ring, [k]: Number(e.target.value) })} className="mt-1 w-full accent-[#3B82C4]" /></label>
          ))}
          <label className="flex items-center justify-between text-[13px]"><span>Outline only</span><input type="checkbox" checked={ring.outline} onChange={(e) => setRing({ ...ring, outline: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /></label>
          <div className="flex gap-2">
            <button type="button" onClick={() => push({ kind: 'ring', ...ring, color })} className={`${chip} flex-1 justify-center`}><Plus size={14} /> Add ring</button>
            <button type="button" onClick={() => push({ kind: 'dots', count: ring.count * 2, radius: ring.radius, size: Math.max(3, ring.size / 12), color })} className={`${chip} flex-1 justify-center`}><Plus size={14} /> Dots</button>
          </div>
        </section>
        <section className="border-t border-mt-border pt-4">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Floor colour</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">{BACKGROUNDS.map((c) => <button key={c} type="button" aria-label={`Background ${c}`} aria-pressed={m.background === c} onClick={() => setM({ ...m, background: c })} className={`h-7 w-7 rounded-lg ring-1 ring-black/15 ${m.background === c ? 'ring-2 ring-[#3B82C4] ring-offset-2 ring-offset-mt-surface' : ''}`} style={{ background: c }} />)}</div>
        </section>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="relative mx-auto w-full max-w-[640px] aspect-square rounded-3xl overflow-hidden border border-mt-border touch-none select-none" style={{ background: m.background }}>
          <svg ref={svgRef} viewBox="0 0 1000 1000" className="absolute inset-0 h-full w-full cursor-crosshair" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} role="img" aria-label="Rangoli canvas — draw here">
            <g transform="translate(500 500)">
              {guides && <g opacity="0.25" stroke="#94A3B8" fill="none" strokeWidth="1">{[100, 200, 300, 400].map((r) => <circle key={r} r={r} />)}{Array.from({ length: Math.max(1, sym) }, (_, k) => <line key={k} x1="0" y1="0" x2={Math.sin((k / sym) * Math.PI * 2) * 480} y2={-Math.cos((k / sym) * Math.PI * 2) * 480} />)}</g>}
              <g dangerouslySetInnerHTML={{ __html: body + liveLayer }} />
            </g>
          </svg>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <button type="button" onClick={undo} disabled={!m.layers.length} className={`${chip} disabled:opacity-40`}><Undo2 size={14} /> Undo</button>
          <button type="button" onClick={redoOne} disabled={!redo.length} className={`${chip} disabled:opacity-40`}><Redo2 size={14} /> Redo</button>
          <button type="button" onClick={() => { setM({ ...m, layers: [] }); setRedo([]); }} className={chip}><Eraser size={14} /> Clear</button>
          <span className="mx-1 h-6 w-px bg-mt-border" />
          <button type="button" onClick={toEditor} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5"><Wand2 size={14} /> Use in a design</button>
          <button type="button" onClick={() => save(new Blob([svg], { type: 'image/svg+xml' }), 'rangoli.svg')} className={chip}><Download size={14} /> SVG</button>
          <button type="button" onClick={async () => save(await svgToPng(svg, 2400), 'rangoli.png')} className={chip}><Download size={14} /> PNG</button>
          <button type="button" onClick={pdf} className={chip}><Download size={14} /> PDF</button>
          <label className="inline-flex items-center gap-2 text-[13px] ml-1"><input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Transparent</label>
        </div>
        <p className="text-center text-[12.5px] text-mt-muted">Draw on the canvas with your mouse, finger or stylus — every stroke repeats around the centre. Your design is kept on this device.</p>
      </div>
    </div>
  );
}
