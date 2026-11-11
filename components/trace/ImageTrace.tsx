'use client';

// Image Trace — turn a photo, sketch or logo into editable vector shapes
// (1, 3, 4, 6, 8, 16 colours, black & white or a line drawing). Runs in the
// browser; nothing is uploaded.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, ImagePlus, Loader2, Wand2 } from 'lucide-react';
import { DEFAULT_TRACE, PRESETS, TraceOptions, TraceResult, toFabricPath, toSvg, trace } from '@/lib/trace';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

const SAMPLE = '/templates/photos/pro/x_watch.jpg';

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function loadPixels(src: string): Promise<{ data: Uint8ClampedArray; width: number; height: number; url: string }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('load')); img.src = src; });
  const max = 1600;
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const id = g.getImageData(0, 0, c.width, c.height);
  return { data: id.data, width: id.width, height: id.height, url: src };
}

function Slider({ label, value, min, max, step = 1, onChange, fmt }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[12px] text-mt-muted"><span>{label}</span><span className="tabular-nums text-mt-ink">{fmt ? fmt(value) : value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" />
    </label>
  );
}

export function ImageTrace() {
  const router = useRouter();
  const [src, setSrc] = useState(SAMPLE);
  const [px, setPx] = useState<{ data: Uint8ClampedArray; width: number; height: number } | null>(null);
  const [o, setO] = useState<TraceOptions>({ ...DEFAULT_TRACE });
  const [preset, setPreset] = useState('c6');
  const [res, setRes] = useState<TraceResult | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [split, setSplit] = useState(50);
  const [bg, setBg] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<any>(null);

  useEffect(() => { loadPixels(src).then(setPx).catch(() => setMsg('That picture could not be opened.')); }, [src]);

  const run = useCallback(() => {
    if (!px) return;
    setBusy(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const t0 = performance.now();
      const r = trace(px, o);
      setRes(r); setColors(r.layers.map((l) => l.color)); setBusy(false);
      setMsg(`${r.layers.length} colour layer${r.layers.length === 1 ? '' : 's'} · ${Math.round(performance.now() - t0)} ms`);
    }, 60);
  }, [px, o]);
  useEffect(run, [run]);

  const out = useMemo(() => (res ? { ...res, layers: res.layers.map((l, i) => ({ ...l, color: colors[i] || l.color })) } : null), [res, colors]);
  const svg = useMemo(() => (out ? toSvg(out, bg && o.mode !== 'colour' ? '#FFFFFF' : undefined) : ''), [out, bg, o.mode]);
  const svgUrl = useMemo(() => (svg ? URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })) : ''), [svg]);
  useEffect(() => () => { if (svgUrl) URL.revokeObjectURL(svgUrl); }, [svgUrl]);

  const choose = (f?: File | null) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) { setMsg('Choose a picture (JPG, PNG or WebP).'); return; }
    setSrc(URL.createObjectURL(f));
  };
  const pick = (id: string) => { const p = PRESETS.find((x) => x.id === id)!; setPreset(id); setO({ ...DEFAULT_TRACE, ...p.o, detail: o.detail }); };
  const set = (x: Partial<TraceOptions>) => { setPreset('custom'); setO((v) => ({ ...v, ...x })); };

  const png = async () => {
    if (!out) return;
    const img = new Image();
    img.src = svgUrl;
    await img.decode();
    const c = document.createElement('canvas'); c.width = out.width; c.height = out.height;
    c.getContext('2d')!.drawImage(img, 0, 0);
    c.toBlob((b) => b && save(b, 'traced.png'), 'image/png');
  };

  const toEditor = async () => {
    if (!out) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent('/trace')); return; }
    const objects = out.layers.map((l, i) => ({ type: 'path', version: '5.1.0', originX: 'left', originY: 'top', path: toFabricPath(l.d), fill: l.color, fillRule: 'evenodd', stroke: null, strokeWidth: 0, name: `Traced colour ${i + 1}` }));
    const key = newLocalKey();
    putHandoff(key, { opened: { document: { name: 'Traced artwork', width: out.width, height: out.height, editor: 'design' }, canvas: { version: '5.1.0', background: bg && o.mode !== 'colour' ? '#FFFFFF' : '#FFFFFF', objects }, fonts: [], thumbnail: null, template: null, missingAssets: [] } as any, file: { handle: null, fileName: 'Traced artwork.mtd.html' } });
    router.push(editorUrlForLocal(key, out.width, out.height));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-6 lg:sticky lg:top-20">
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2"><ImagePlus size={16} /> Choose a picture</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => choose(e.target.files?.[0])} />
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Preset</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => pick(p.id)} aria-pressed={preset === p.id} className={`h-9 rounded-xl border text-[13px] font-medium ${preset === p.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`}>{p.label}</button>
            ))}
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Adjust</h2>
          {o.mode === 'colour' && <Slider label="Colours" value={o.colors} min={2} max={32} onChange={(v) => set({ colors: v })} />}
          {o.mode !== 'colour' && <Slider label="Threshold" value={o.threshold ?? 128} min={10} max={245} onChange={(v) => set({ threshold: v })} />}
          <Slider label="Detail" value={o.detail} min={200} max={1600} step={50} onChange={(v) => set({ detail: v })} fmt={(v) => `${v}px`} />
          <Slider label="Smoothness" value={o.smooth} min={0.3} max={4} step={0.1} onChange={(v) => set({ smooth: v })} />
          <Slider label="Ignore specks under" value={o.noise} min={0} max={200} onChange={(v) => set({ noise: v })} fmt={(v) => `${v} px²`} />
          <label className="flex items-center justify-between text-[13px]"><span>Smooth curves</span><input type="checkbox" checked={o.curves} onChange={(e) => set({ curves: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /></label>
          {o.mode === 'colour' && <label className="flex items-center justify-between text-[13px]"><span>Remove white background</span><input type="checkbox" checked={o.ignoreWhite} onChange={(e) => set({ ignoreWhite: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /></label>}
          {o.mode !== 'colour' && <label className="flex items-center justify-between text-[13px]"><span>White background</span><input type="checkbox" checked={bg} onChange={(e) => setBg(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /></label>}
        </section>
        {colors.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">Colours</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {colors.map((c, i) => <input key={i} type="color" value={c} onChange={(e) => setColors((v) => v.map((x, k) => (k === i ? e.target.value.toUpperCase() : x)))} className="h-9 w-9 cursor-pointer rounded-lg border border-mt-border bg-transparent" aria-label={`Colour ${i + 1}`} />)}
            </div>
          </section>
        )}
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="relative rounded-3xl border border-mt-border overflow-hidden bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] [background-size:20px_20px] select-none">
          {px && (
            <div className="relative mx-auto" style={{ aspectRatio: `${px.width} / ${px.height}`, maxHeight: 620 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {svgUrl && <img src={svgUrl} alt="Traced vector result" className="absolute inset-0 h-full w-full object-contain" />}
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Original picture" className="absolute inset-0 h-full w-full object-contain" />
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#3B82C4]" style={{ left: `${split}%` }} />
              <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Compare original and traced" className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">Original</span>
              <span className="absolute right-3 top-3 rounded-full bg-[#3B82C4] px-2.5 py-1 text-[11px] font-semibold text-white">Vector</span>
            </div>
          )}
          {busy && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Tracing…</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={toEditor} disabled={!out} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-60"><Wand2 size={15} /> Edit as vectors</button>
          <button type="button" onClick={() => svg && save(new Blob([svg], { type: 'image/svg+xml' }), 'traced.svg')} disabled={!svg} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> SVG</button>
          <button type="button" onClick={png} disabled={!svg} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> PNG</button>
          {msg && <span role="status" className="text-[13px] text-mt-muted">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
