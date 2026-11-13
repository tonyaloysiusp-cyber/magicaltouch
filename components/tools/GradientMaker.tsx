'use client';

// Gradient Background Generator — drag colour spots, pick a preset or
// shuffle, add grain, then download PNG at wallpaper / social sizes, a
// vector SVG, copy the CSS, or open it in the editor as a background.

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, Plus, Shuffle, Trash2, Wand2 } from 'lucide-react';
import { BG_SIZES, GRADIENT_PRESETS, GradientBg, gradientCss, gradientStyle, gradientSvg, randomGradient } from '@/lib/gradientBg';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  const img = new Image(); const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('img')); img.src = url; });
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

export function GradientMaker() {
  const router = useRouter();
  const [g, setG] = useState<GradientBg>(GRADIENT_PRESETS[2].g);
  const [sel, setSel] = useState(0);
  const [size, setSize] = useState(0);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const S = BG_SIZES[size];
  const css = useMemo(() => gradientCss(g), [g]);
  const grainUrl = useMemo(() => `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="200" height="200" filter="url(#n)"/></svg>')}")`, []);
  const spot = g.spots[sel];
  const setSpot = (p: Partial<GradientBg['spots'][number]>) => setG({ ...g, spots: g.spots.map((s, i) => (i === sel ? { ...s, ...p } : s)) });

  const onMove = (e: React.PointerEvent) => {
    if (drag.current === null || !box.current) return;
    const b = box.current.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - b.left) / b.width) * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - b.top) / b.height) * 100)));
    const i = drag.current;
    setG((v) => ({ ...v, spots: v.spots.map((s, k) => (k === i ? { ...s, x, y } : s)) }));
  };
  const png = async () => { setBusy(true); try { save(await svgToPng(gradientSvg(g, S.w, S.h), S.w, S.h), `gradient-${S.w}x${S.h}.png`); } finally { setBusy(false); } };
  const toEditor = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent('/gradient-background-generator')); return; }
    setBusy(true);
    const blob = await svgToPng(gradientSvg(g, S.w, S.h), S.w, S.h);
    const src: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
    const canvas = { version: '5.1.0', background: g.base, objects: [{ type: 'image', version: '5.1.0', originX: 'left', originY: 'top', left: 0, top: 0, width: S.w, height: S.h, src, name: 'Gradient background', lockMovementX: true, lockMovementY: true }] };
    const key = newLocalKey();
    putHandoff(key, { opened: { document: { name: 'Gradient design', width: S.w, height: S.h, editor: 'design' }, canvas, fonts: [], thumbnail: null, template: null, missingAssets: [] } as any, file: { handle: null, fileName: 'Gradient design.mtd.svg' } });
    router.push(editorUrlForLocal(key, S.w, S.h));
  };
  const chip = 'h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:border-mt-ink/40 disabled:opacity-50';

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5 lg:sticky lg:top-20">
        <button type="button" onClick={() => { setG(randomGradient()); setSel(0); }} className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2"><Shuffle size={16} /> Shuffle colours</button>
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Presets</h2>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {GRADIENT_PRESETS.map((p) => <button key={p.id} type="button" title={p.label} aria-label={p.label} onClick={() => { setG(p.g); setSel(0); }} className="aspect-square rounded-xl ring-1 ring-black/10 hover:scale-105 transition-transform" style={gradientStyle(p.g)} />)}
          </div>
        </section>
        <section className="space-y-3 border-t border-mt-border pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Colour spots</h2>
            <div className="flex gap-1">
              <button type="button" disabled={g.spots.length >= 7} onClick={() => { setG({ ...g, spots: [...g.spots, { x: 50, y: 50, r: 45, color: '#F2708F' }] }); setSel(g.spots.length); }} className="h-7 w-7 grid place-items-center rounded-md border border-mt-border disabled:opacity-40" aria-label="Add a spot"><Plus size={13} /></button>
              <button type="button" disabled={g.spots.length <= 1} onClick={() => { setG({ ...g, spots: g.spots.filter((_, i) => i !== sel) }); setSel(0); }} className="h-7 w-7 grid place-items-center rounded-md border border-mt-border disabled:opacity-40" aria-label="Remove this spot"><Trash2 size={13} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {g.spots.map((s, i) => <button key={i} type="button" aria-pressed={sel === i} onClick={() => setSel(i)} className={`h-8 w-8 rounded-full ring-1 ring-black/10 ${sel === i ? 'ring-2 ring-[#3B82C4] ring-offset-2 ring-offset-mt-surface' : ''}`} style={{ background: s.color }} aria-label={`Spot ${i + 1}`} />)}
          </div>
          {spot && <>
            <label className="flex items-center gap-3 text-[12px] text-mt-muted">Colour <input type="color" value={spot.color} onChange={(e) => setSpot({ color: e.target.value })} className="h-9 flex-1 rounded-lg border border-mt-border bg-transparent cursor-pointer" /></label>
            <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Spread</span><span className="text-mt-ink">{spot.r}%</span></span><input type="range" min={10} max={100} value={spot.r} onChange={(e) => setSpot({ r: Number(e.target.value) })} className="mt-1 w-full accent-[#3B82C4]" /></label>
          </>}
          <label className="flex items-center gap-3 text-[12px] text-mt-muted">Base <input type="color" value={g.base} onChange={(e) => setG({ ...g, base: e.target.value })} className="h-9 flex-1 rounded-lg border border-mt-border bg-transparent cursor-pointer" /></label>
          <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Grain</span><span className="text-mt-ink">{g.grain}</span></span><input type="range" min={0} max={40} value={g.grain} onChange={(e) => setG({ ...g, grain: Number(e.target.value) })} className="mt-1 w-full accent-[#3B82C4]" /></label>
        </section>
      </aside>

      <div className="min-w-0 space-y-4">
        <div ref={box} className="relative w-full rounded-3xl overflow-hidden border border-mt-border touch-none select-none" style={{ aspectRatio: `${S.w} / ${S.h}`, maxHeight: 560, ...gradientStyle(g) }}
          onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
          {g.grain > 0 && <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: grainUrl, opacity: (g.grain / 100) * 0.6 }} />}
          {g.spots.map((s, i) => (
            <button key={i} type="button" aria-label={`Move spot ${i + 1}`} onPointerDown={(e) => { drag.current = i; setSel(i); (e.target as Element).setPointerCapture?.(e.pointerId); }}
              className={`absolute h-6 w-6 -ml-3 -mt-3 rounded-full border-2 border-white shadow-lg cursor-grab ${sel === i ? 'ring-2 ring-black/40' : ''}`} style={{ left: `${s.x}%`, top: `${s.y}%`, background: s.color }} />
          ))}
        </div>
        <div className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[220px] text-[12px] text-mt-muted">Size
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px] text-mt-ink">{BG_SIZES.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}</select>
            </label>
            <button type="button" onClick={toEditor} disabled={busy} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"><Wand2 size={15} /> Use in a design</button>
            <button type="button" onClick={png} disabled={busy} className={chip}><Download size={14} /> PNG</button>
            <button type="button" onClick={() => save(new Blob([gradientSvg(g, S.w, S.h)], { type: 'image/svg+xml' }), `gradient-${S.w}x${S.h}.svg`)} className={chip}><Download size={14} /> SVG</button>
            <button type="button" onClick={() => navigator.clipboard?.writeText(css).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className={chip}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy CSS'}</button>
          </div>
          <details className="text-[12.5px]"><summary className="cursor-pointer text-mt-muted font-semibold">Show the CSS code (for websites)</summary><pre className="mt-2 text-[11.5px] leading-relaxed bg-mt-bg rounded-xl p-3 overflow-x-auto text-mt-muted"><code>{css}</code></pre></details>
        </div>
      </div>
    </div>
  );
}
