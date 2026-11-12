'use client';

// Passport, visa, ID and exam photo maker — pick the country and purpose,
// upload a photo, the background is replaced on your device (edge-aware
// cut-out with a restore / erase brush for touch-ups), the head is sized to
// the official range, then download:
//  · the file an online portal accepts (exact pixels, file size in KB,
//    JPEG with the DPI written in) with a pass / fail checklist,
//  · a 300 DPI print photo, or a 4×6 / A4 sheet as JPG or PDF.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Eraser, ExternalLink, ImagePlus, Loader2, Paintbrush, RotateCcw, ScanFace, XCircle } from 'lucide-react';
import { COUNTRIES, PHOTO_SPECS, PURPOSES, Purpose, SHEETS, PhotoSpec, autoFit, checkFile, customSpec, fitFileSize, mmToPx, outputSize, sheetLayout } from '@/lib/passportPhoto';
import type { Matte } from '@/lib/portraitMatte';
import { jpegWithDpi } from '@/lib/pngDpi';

const BGS = [['#FFFFFF', 'White'], ['#F2F2F2', 'Light grey'], ['#DCEBFA', 'Light blue'], ['#FFF8E7', 'Cream']] as const;
const DPI = 300;

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const toBlob = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('jpeg'))), 'image/jpeg', q));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Check = { label: string; ok: boolean; detail: string };

export function PassportPhoto() {
  const [country, setCountry] = useState('India');
  const [purpose, setPurpose] = useState<Purpose | 'all'>('all');
  const [specId, setSpecId] = useState('in-35x45');
  const [custom, setCustom] = useState({ w: 35, h: 45, unit: 'mm' as 'mm' | 'px', dpi: 300, minKB: 0, maxKB: 0, bg: '#FFFFFF' });
  const spec: PhotoSpec = specId === 'custom' ? customSpec(custom) : PHOTO_SPECS.find((s) => s.id === specId) || PHOTO_SPECS[0];
  const [bg, setBg] = useState<string>(spec.bg);
  const [src, setSrc] = useState<HTMLImageElement | null>(null);
  const [cut, setCut] = useState<HTMLCanvasElement | null>(null);
  const matteRef = useRef<Matte | null>(null);
  const [keepBg, setKeepBg] = useState(false);
  const [base, setBase] = useState<{ scale: number; dx: number; dy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [guides, setGuides] = useState(true);
  const [brush, setBrush] = useState<'off' | 'restore' | 'erase'>('off');
  const [brushSize, setBrushSize] = useState(18);
  const [sheetId, setSheetId] = useState('4x6');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const xf = useRef<{ x: number; y: number; s: number; rot: number; px: number; py: number } | null>(null);

  const list = PHOTO_SPECS.filter((s) => s.country === country && (purpose === 'all' || s.purpose === purpose));
  const W = mmToPx(spec.w, DPI), H = mmToPx(spec.h, DPI);
  useEffect(() => { setBg(spec.bg); setChecks(null); }, [spec.id, spec.bg]);

  const fit = useCallback((img: HTMLImageElement) => {
    const mt = matteRef.current;
    const s = mt?.bounds || { x: 0.15, y: 0.08, w: 0.7, h: 0.92 };
    setBase(autoFit(s, { w: img.naturalWidth, h: img.naturalHeight }, spec, W, H, mt?.head || null));
    setZoom(1); setOx(0); setOy(0); setTilt(0);
  }, [spec, W, H]);
  useEffect(() => { if (src) fit(src); }, [spec.id, spec.w, spec.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (f?: File | null) => {
    if (!f || !/^image\//.test(f.type)) { setStatus('Choose a photo (JPG, PNG, WebP or HEIC saved as JPG).'); return; }
    setBusy('open'); setStatus('Opening the photo…'); setCut(null); setChecks(null); matteRef.current = null; setBrush('off');
    const img = new Image(); img.src = URL.createObjectURL(f);
    const ok = await img.decode().then(() => true).catch(() => false);
    if (!ok) { setStatus('This photo could not be opened. Save it as JPG and try again.'); setBusy(null); return; }
    setSrc(img); setKeepBg(false);
    try {
      const pm = await import('@/lib/portraitMatte');
      const mt = await pm.portraitMatte(img, (s) => setStatus(s));
      matteRef.current = mt;
      setCut(pm.matteCanvas(mt));
      fit(img);
      setStatus(mt.head ? 'Background replaced and head sized automatically. Check the guides, touch up edges with the brush if needed, then download.' : 'Background replaced. Line the head up with the guides, then download.');
    } catch {
      fit(img); setKeepBg(true);
      setStatus('The background could not be removed in this browser — your original background is kept. A plain wall behind you works best.');
    }
    setBusy(null);
  };

  /** Draws the photo at w × h; the composition is defined on the W × H print frame. */
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, record = false) => {
    const k = h / H, offX = (w - W * k) / 2;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const pic = keepBg || !cut ? src : cut;
    if (!pic || !base || !src) return;
    const iw = (pic as any).naturalWidth || pic.width, ih = (pic as any).naturalHeight || pic.height;
    const s = base.scale * zoom * (src.naturalWidth / iw) * k;
    const px = W / 2, py = H * 0.3; // zoom and tilt around the face
    const x = offX + (px + (base.dx - px) * zoom + ox) * k, y = (py + (base.dy - py) * zoom + oy) * k;
    const pvx = offX + (px + ox) * k, pvy = (py + oy) * k, rot = (tilt * Math.PI) / 180;
    ctx.save();
    const f = [bright !== 100 ? `brightness(${bright}%)` : '', contrast !== 100 ? `contrast(${contrast}%)` : ''].filter(Boolean).join(' ');
    ctx.filter = f || 'none';
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.translate(pvx, pvy); ctx.rotate(rot); ctx.translate(-pvx, -pvy);
    ctx.drawImage(pic, x, y, iw * s, ih * s);
    ctx.restore();
    if (record) xf.current = { x, y, s, rot, px: pvx, py: pvy };
  }, [W, H, bg, keepBg, cut, src, base, zoom, ox, oy, tilt, bright, contrast]);

  // Preview with guides.
  const paint = useCallback(() => {
    const c = view.current; if (!c) return;
    const scale = Math.min(1, 380 / H);
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const ctx = c.getContext('2d')!;
    draw(ctx, c.width, c.height, true);
    if (guides) {
      const headMm = (spec.head[0] + spec.head[1]) / 2;
      const top = Math.max(0.06, ((spec.h - headMm) * 0.32) / spec.h);
      const hmin = spec.head[0] / spec.h, hmax = spec.head[1] / spec.h;
      ctx.strokeStyle = 'rgba(59,130,196,.95)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      const line = (y: number, col?: string) => { ctx.strokeStyle = col || 'rgba(59,130,196,.95)'; ctx.beginPath(); ctx.moveTo(0, y * c.height); ctx.lineTo(c.width, y * c.height); ctx.stroke(); };
      line(top);
      ctx.fillStyle = 'rgba(46,160,90,.14)'; ctx.fillRect(0, (top + hmin) * c.height, c.width, (hmax - hmin) * c.height);
      line(top + hmin, 'rgba(46,160,90,.9)'); line(top + hmax, 'rgba(46,160,90,.9)');
      ctx.strokeStyle = 'rgba(59,130,196,.6)'; ctx.beginPath(); ctx.moveTo(c.width / 2, 0); ctx.lineTo(c.width / 2, c.height); ctx.stroke();
      ctx.setLineDash([]); ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = 'rgba(30,58,95,.9)';
      ctx.fillText('top of head', 4, top * c.height - 3); ctx.fillText('chin between green lines', 4, (top + hmax) * c.height + 11);
    }
  }, [draw, guides, W, H, spec]);
  useEffect(() => { paint(); }, [paint]);

  // Restore / erase brush on the preview.
  const painting = useRef(false);
  const raf = useRef(0);
  const brushAt = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    const mt = matteRef.current, t = xf.current, c = view.current;
    if (brush === 'off' || !mt || !t || !c || keepBg) return;
    const rect = c.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * c.width, cy = ((e.clientY - rect.top) / rect.height) * c.height;
    const dx = cx - t.px, dy = cy - t.py, cos = Math.cos(-t.rot), sin = Math.sin(-t.rot);
    const ux = t.px + dx * cos - dy * sin, uy = t.py + dx * sin + dy * cos;
    const pm = await import('@/lib/portraitMatte');
    pm.brushAlpha(mt, (ux - t.x) / t.s, (uy - t.y) / t.s, brushSize / t.s, brush === 'restore');
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setCut(pm.matteCanvas(mt)));
  };

  const photoCanvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, w, h); return c; };
  const sheet = SHEETS.find((s) => s.id === sheetId)!;
  const layout = useMemo(() => sheetLayout({ w: spec.w, h: spec.h }, sheet), [spec.w, spec.h, sheet]);
  const name = slug(`${spec.country}-${spec.purpose}-photo`);

  // The file for an online upload: exact pixels, inside the KB limits, DPI written in.
  const dlDigital = async () => {
    setBusy('digital');
    try {
      const out = outputSize(spec);
      const d = spec.digital || { w: out.w, h: out.h, format: 'jpeg' as const, maxKB: undefined };
      const cache = new Map<string, Blob>();
      const enc = async (w: number, h: number, q: number) => {
        const key = `${w}x${h}@${q.toFixed(3)}`;
        if (!cache.has(key)) cache.set(key, await toBlob(photoCanvas(w, h), q));
        return cache.get(key)!.size;
      };
      const r = spec.digital ? await fitFileSize(d, enc) : { w: out.w, h: out.h, q: 0.95, bytes: await enc(out.w, out.h, 0.95), ok: true };
      const blob = cache.get(`${r.w}x${r.h}@${r.q.toFixed(3)}`) || await toBlob(photoCanvas(r.w, r.h), r.q);
      const bytes = jpegWithDpi(new Uint8Array(await blob.arrayBuffer()), out.dpi);
      save(new Blob([bytes as BlobPart], { type: 'image/jpeg' }), `${name}-${r.w}x${r.h}.jpg`);
      const cs: Check[] = checkFile(spec, { w: r.w, h: r.h, bytes: bytes.length, format: 'jpeg', dpi: out.dpi });
      cs.push({ label: 'Plain background', ok: !keepBg, detail: keepBg ? 'Original background kept — make sure it is plain and light' : `Replaced with ${bg.toUpperCase()}` });
      setChecks(cs);
    } catch { setStatus('The file could not be made in this browser.'); }
    setBusy(null);
  };
  const dlPhoto = async () => {
    const b = await toBlob(photoCanvas(), 0.95);
    save(new Blob([jpegWithDpi(new Uint8Array(await b.arrayBuffer()), DPI) as BlobPart], { type: 'image/jpeg' }), `${name}-${spec.w}x${spec.h}mm-300dpi.jpg`);
  };
  const sheetCanvas = () => {
    const one = photoCanvas();
    const c = document.createElement('canvas'); c.width = mmToPx(sheet.w); c.height = mmToPx(sheet.h);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    for (const p of layout.spots) { ctx.drawImage(one, mmToPx(p.x), mmToPx(p.y), W, H); ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 2; ctx.strokeRect(mmToPx(p.x), mmToPx(p.y), W, H); }
    return c;
  };
  const dlSheet = async () => { const b = await toBlob(sheetCanvas(), 0.95); save(new Blob([jpegWithDpi(new Uint8Array(await b.arrayBuffer()), DPI) as BlobPart], { type: 'image/jpeg' }), `${name}-sheet-${sheet.id}.jpg`); };
  const dlPdf = async () => {
    const one = photoCanvas().toDataURL('image/jpeg', 0.95);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [sheet.w, sheet.h], orientation: sheet.w > sheet.h ? 'landscape' : 'portrait' });
    pdf.setDrawColor(200); pdf.setLineWidth(0.1);
    for (const p of layout.spots) { pdf.addImage(one, 'JPEG', p.x, p.y, spec.w, spec.h); pdf.rect(p.x, p.y, spec.w, spec.h); }
    save(pdf.output('blob'), `${name}-sheet-${sheet.id}.pdf`);
  };

  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px] text-mt-ink';
  const out = outputSize(spec);
  const d = spec.digital;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">1 · Country and purpose</h2>
          <label className="block text-[12px] text-mt-muted">Country
            <select value={specId === 'custom' ? '__custom' : country} onChange={(e) => { if (e.target.value === '__custom') { setSpecId('custom'); return; } setCountry(e.target.value); const first = PHOTO_SPECS.find((s) => s.country === e.target.value && (purpose === 'all' || s.purpose === purpose)) || PHOTO_SPECS.find((s) => s.country === e.target.value)!; setSpecId(first.id); }} className={field}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">Custom size (any form)…</option>
            </select>
          </label>
          {specId !== 'custom' && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {[{ id: 'all' as const, label: 'All' }, ...PURPOSES].filter((p) => p.id === 'all' || PHOTO_SPECS.some((s) => s.country === country && s.purpose === p.id)).map((p) => (
                  <button key={p.id} type="button" onClick={() => { setPurpose(p.id); const first = PHOTO_SPECS.find((s) => s.country === country && (p.id === 'all' || s.purpose === p.id)); if (first) setSpecId(first.id); }} aria-pressed={purpose === p.id} className={`h-7 px-2.5 rounded-full border text-[12px] font-medium ${purpose === p.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{p.label}</button>
                ))}
              </div>
              <div className="space-y-1.5" role="radiogroup" aria-label="Photo type">
                {list.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={specId === s.id} onClick={() => setSpecId(s.id)} className={`w-full text-left rounded-xl border px-3 py-2 text-[13px] ${specId === s.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border hover:border-mt-ink/40'}`}>
                    <span className="font-semibold">{s.label.split(' · ')[0]}</span>
                    <span className="block text-[11.5px] text-mt-muted">{s.label.split(' · ')[1] || `${s.w} × ${s.h} mm`}{s.digital ? ' · online upload' : ''}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {specId === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px] text-mt-muted">Width<input type="number" min={1} value={custom.w} onChange={(e) => setCustom({ ...custom, w: Number(e.target.value) || 1 })} className={field} /></label>
              <label className="text-[12px] text-mt-muted">Height<input type="number" min={1} value={custom.h} onChange={(e) => setCustom({ ...custom, h: Number(e.target.value) || 1 })} className={field} /></label>
              <label className="text-[12px] text-mt-muted">Unit<select value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value as 'mm' | 'px' })} className={field}><option value="mm">mm</option><option value="px">pixels</option></select></label>
              <label className="text-[12px] text-mt-muted">DPI<input type="number" min={72} max={1200} value={custom.dpi} onChange={(e) => setCustom({ ...custom, dpi: Number(e.target.value) || 300 })} className={field} /></label>
              <label className="text-[12px] text-mt-muted">Min KB<input type="number" min={0} value={custom.minKB} onChange={(e) => setCustom({ ...custom, minKB: Number(e.target.value) || 0 })} className={field} /></label>
              <label className="text-[12px] text-mt-muted">Max KB<input type="number" min={0} value={custom.maxKB} onChange={(e) => setCustom({ ...custom, maxKB: Number(e.target.value) || 0 })} className={field} /></label>
            </div>
          )}
          <div className="rounded-xl bg-mt-bg p-3 text-[12px] text-mt-muted space-y-1">
            <p><b className="text-mt-ink">Print:</b> {spec.w} × {spec.h} mm · head {spec.head[0]}–{spec.head[1]} mm</p>
            {d && <p><b className="text-mt-ink">Upload:</b> {d.format.toUpperCase()} {d.minW && d.maxW && d.minW !== d.maxW ? `${d.minW}–${d.maxW}` : d.w} × {d.minH && d.maxH && d.minH !== d.maxH ? `${d.minH}–${d.maxH}` : d.h} px{d.minKB || d.maxKB ? ` · ${d.minKB ?? 0}–${d.maxKB ?? '∞'} KB` : ''}</p>}
            <p>{spec.note}</p>
            {spec.source && <a href={spec.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-mt-ink underline underline-offset-2">Official rules <ExternalLink size={11} /></a>}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">2 · Photo</h2>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy} className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">{busy === 'open' ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} {src ? 'Choose another photo' : 'Upload your photo'}</button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ''; }} />
          <div>
            <p className="text-[12px] text-mt-muted">Background</p>
            <div className="mt-1.5 flex gap-2">
              {BGS.map(([c, l]) => <button key={c} type="button" title={l} aria-label={l} aria-pressed={bg === c} onClick={() => setBg(c)} className={`h-9 w-9 rounded-xl border ${bg === c ? 'ring-2 ring-[#3B82C4] ring-offset-2 ring-offset-mt-surface' : 'border-mt-border'}`} style={{ background: c }} />)}
              <label className="h-9 w-9 rounded-xl border border-mt-border overflow-hidden relative cursor-pointer" style={{ background: 'conic-gradient(#F2708F,#F7C948,#8CC84B,#35C2F1,#A69BD3,#F2708F)' }} title="Any colour"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Any background colour" /></label>
            </div>
            {bg.toUpperCase() !== spec.bg.toUpperCase() && <p className="mt-1.5 text-[11.5px] text-amber-700 dark:text-amber-400">This document asks for {spec.bg.toUpperCase() === '#FFFFFF' ? 'white' : 'a light grey'} background.</p>}
            {cut && <label className="mt-2 flex items-center justify-between text-[13px]"><span>Keep original background</span><input type="checkbox" checked={keepBg} onChange={(e) => setKeepBg(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /></label>}
          </div>
        </section>

        {src && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mt-muted">3 · Adjust</h2>
            {([['Size of head', zoom, 0.6, 1.8, 0.005, setZoom, (v: number) => `${Math.round(v * 100)}%`], ['Left / right', ox, -W / 2, W / 2, 1, setOx, (v: number) => `${Math.round(v)}`], ['Up / down', oy, -H / 2, H / 2, 1, setOy, (v: number) => `${Math.round(v)}`], ['Straighten', tilt, -12, 12, 0.5, setTilt, (v: number) => `${v}°`], ['Brightness', bright, 70, 140, 1, setBright, (v: number) => `${v}%`], ['Contrast', contrast, 80, 130, 1, setContrast, (v: number) => `${v}%`]] as const).map(([l, v, mn, mx, st, fn, fmt]) => (
              <label key={l} className="block">
                <span className="flex justify-between text-[12px] text-mt-muted"><span>{l}</span><span className="tabular-nums text-mt-ink">{fmt(v as number)}</span></span>
                <input type="range" min={mn} max={mx} step={st} value={v as number} onChange={(e) => (fn as any)(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" />
              </label>
            ))}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Head guides</label>
              <button type="button" onClick={() => src && fit(src)} className="text-[12.5px] text-mt-muted inline-flex items-center gap-1 hover:text-mt-ink"><RotateCcw size={12} /> Auto fit</button>
            </div>
            {cut && !keepBg && (
              <div className="rounded-xl bg-mt-bg p-3 space-y-2">
                <p className="text-[12px] text-mt-muted">Touch up the edge — paint on the photo</p>
                <div className="flex gap-1.5">
                  {([['off', 'Off', null], ['restore', 'Restore', Paintbrush], ['erase', 'Erase', Eraser]] as const).map(([id, l, Icon]) => (
                    <button key={id} type="button" onClick={() => setBrush(id)} aria-pressed={brush === id} className={`h-8 px-3 rounded-full border text-[12.5px] font-medium inline-flex items-center gap-1 ${brush === id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{Icon && <Icon size={13} />} {l}</button>
                  ))}
                </div>
                {brush !== 'off' && <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Brush size</span><span className="text-mt-ink">{brushSize}</span></span><input type="range" min={4} max={60} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" /></label>}
              </div>
            )}
          </section>
        )}
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="rounded-3xl border border-mt-border bg-mt-surface2/60 p-6 grid place-items-center min-h-[440px]">
          {src ? (
            <canvas ref={view} className={`rounded shadow-lg max-w-full touch-none ${brush !== 'off' ? 'cursor-crosshair' : ''}`} aria-label="Photo preview"
              onPointerDown={(e) => { if (brush === 'off') return; painting.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); brushAt(e); }}
              onPointerMove={(e) => { if (painting.current) brushAt(e); }}
              onPointerUp={() => { painting.current = false; }} onPointerCancel={() => { painting.current = false; }} />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="text-center text-mt-muted">
              <ScanFace size={42} className="mx-auto" />
              <p className="mt-3 text-[15px] font-semibold text-mt-ink">Upload a front-facing photo</p>
              <p className="mt-1 text-[13px]">Even light, no shadows, looking straight at the camera, shoulders visible. It never leaves your device.</p>
            </button>
          )}
        </div>
        {status && <p role="status" className="text-[13px] text-mt-muted">{status}</p>}
        {src && (
          <div className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={dlDigital} disabled={!!busy} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-60">{busy === 'digital' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {d ? 'File for online upload' : 'Digital photo (JPG)'}</button>
              <span className="text-[12px] text-mt-muted">{out.w} × {out.h} px · {out.dpi} DPI{d?.maxKB ? ` · under ${d.maxKB >= 1024 ? `${Math.round(d.maxKB / 1024)} MB` : `${d.maxKB} KB`}` : ''}{d?.minKB ? ` · over ${d.minKB} KB` : ''}</span>
            </div>
            {checks && (
              <ul className="rounded-2xl bg-mt-bg p-3 grid gap-1.5 sm:grid-cols-2 text-[13px]" aria-label="File check">
                {checks.map((c) => <li key={c.label} className="flex items-start gap-2">{c.ok ? <CheckCircle2 size={16} className="mt-0.5 text-emerald-600 shrink-0" /> : <XCircle size={16} className="mt-0.5 text-rose-600 shrink-0" />}<span><b>{c.label}</b> · <span className="text-mt-muted">{c.detail}</span></span></li>)}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-mt-border pt-4">
              <button type="button" onClick={dlPhoto} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Print photo (300 DPI)</button>
              <span className="text-[12px] text-mt-muted">{spec.w} × {spec.h} mm · {W} × {H} px</span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 min-w-[220px] text-[12px] text-mt-muted">Print sheet
                <select value={sheetId} onChange={(e) => setSheetId(e.target.value)} className={field}>
                  {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={dlSheet} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Sheet JPG</button>
              <button type="button" onClick={dlPdf} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Sheet PDF</button>
            </div>
            <p className="text-[12.5px] text-mt-muted">{layout.spots.length} photos fit on {sheet.label.split(' (')[0]}, with light cut lines. Print at 100% (actual size).</p>
            <p className="text-[11.5px] text-mt-faint">Officials also check expression, glasses, shadows and how recent the photo is. Rules change — check the official page for your application before you submit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
