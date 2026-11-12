'use client';

// Passport Photo Maker — upload a photo, the background is replaced with a
// plain colour (on your device), the head is sized for the chosen country,
// then download one photo or a print sheet (4×6 in or A4) as JPG or PDF.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, RotateCcw, ScanFace } from 'lucide-react';
import { PHOTO_SPECS, SHEETS, autoFit, mmToPx, sheetLayout } from '@/lib/passportPhoto';

const BGS = [['#FFFFFF', 'White'], ['#F2F2F2', 'Light grey'], ['#DCEBFA', 'Light blue'], ['#FFF8E7', 'Cream']] as const;
const DPI = 300;

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function PassportPhoto() {
  const [specId, setSpecId] = useState(PHOTO_SPECS[0].id);
  const spec = PHOTO_SPECS.find((s) => s.id === specId)!;
  const [bg, setBg] = useState<string>(spec.bg);
  const [src, setSrc] = useState<HTMLImageElement | null>(null);
  const [cut, setCut] = useState<HTMLCanvasElement | null>(null);
  const [keepBg, setKeepBg] = useState(false);
  const [base, setBase] = useState<{ scale: number; dx: number; dy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [bright, setBright] = useState(100);
  const [guides, setGuides] = useState(true);
  const [sheetId, setSheetId] = useState('4x6');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const view = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const W = mmToPx(spec.w, DPI), H = mmToPx(spec.h, DPI);
  useEffect(() => { setBg(spec.bg); }, [spec.bg]);

  const fit = useCallback((img: HTMLImageElement, subj: { x: number; y: number; w: number; h: number } | null) => {
    const s = subj || { x: 0.15, y: 0.08, w: 0.7, h: 0.92 };
    setBase(autoFit(s, { w: img.naturalWidth, h: img.naturalHeight }, spec, W, H));
    setZoom(1); setOx(0); setOy(0);
  }, [spec, W, H]);
  useEffect(() => { if (src) fit(src, subjectRef.current); }, [specId]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = async (f?: File | null) => {
    if (!f || !/^image\//.test(f.type)) { setStatus('Choose a photo (JPG, PNG or WebP).'); return; }
    setBusy(true); setStatus('Opening the photo…'); setCut(null);
    const img = new Image(); img.src = URL.createObjectURL(f);
    await img.decode().catch(() => null);
    setSrc(img);
    try {
      const bgr = await import('@/lib/editor/bgRemove');
      const mask = await bgr.detectSubject(img, (s) => setStatus(s));
      const m = bgr.refinedMaskCanvas(mask, { ...bgr.DEFAULT_REFINE, softness: 0.25 });
      setCut(bgr.composeCutout(img, m));
      subjectRef.current = bgr.subjectBounds(mask, 0.5);
      fit(img, subjectRef.current);
      setStatus('Background replaced. Line the head up with the guides, then download.');
    } catch {
      subjectRef.current = null; fit(img, null); setKeepBg(true);
      setStatus('The background could not be removed in this browser — your original background is kept.');
    }
    setBusy(false);
  };

  /** Draws the finished photo at w × h (scale k of the 300-dpi size). */
  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const k = w / W;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const pic = keepBg || !cut ? src : cut;
    if (!pic || !base) return;
    const iw = (pic as any).naturalWidth || pic.width, ih = (pic as any).naturalHeight || pic.height;
    const sw = src ? src.naturalWidth : iw; // cut-out may be smaller than the source
    const s = base.scale * zoom * (sw / iw) * k;
    // Zoom around the head point (top centre of the photo, 30% down).
    const px = W / 2, py = H * 0.3;
    const x = (px + (base.dx - px) * zoom + ox) * k, y = (py + (base.dy - py) * zoom + oy) * k;
    ctx.save();
    ctx.filter = bright !== 100 ? `brightness(${bright}%)` : 'none';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(pic, x, y, iw * s, ih * s);
    ctx.restore();
  }, [W, H, bg, keepBg, cut, src, base, zoom, ox, oy, bright]);

  // Preview with guides.
  useEffect(() => {
    const c = view.current; if (!c) return;
    const scale = Math.min(1, 360 / H);
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const ctx = c.getContext('2d')!;
    draw(ctx, c.width, c.height);
    if (guides) {
      const hmin = spec.head[0] / spec.h, hmax = spec.head[1] / spec.h, top = 0.1;
      ctx.strokeStyle = 'rgba(59,130,196,.9)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
      const line = (y: number) => { ctx.beginPath(); ctx.moveTo(0, y * c.height); ctx.lineTo(c.width, y * c.height); ctx.stroke(); };
      line(top); line(top + hmin); line(top + hmax);
      ctx.beginPath(); ctx.moveTo(c.width / 2, 0); ctx.lineTo(c.width / 2, c.height); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(59,130,196,.55)';
      ctx.beginPath(); ctx.ellipse(c.width / 2, (top + (hmin + hmax) / 4) * c.height, c.width * 0.27, ((hmin + hmax) / 4) * c.height, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }, [draw, guides, W, H, spec]);

  const photoCanvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d')!, W, H); return c; };
  const sheet = SHEETS.find((s) => s.id === sheetId)!;
  const layout = useMemo(() => sheetLayout({ w: spec.w, h: spec.h }, sheet), [spec, sheet]);

  const dlPhoto = () => photoCanvas().toBlob((b) => b && save(b, `photo-${spec.w}x${spec.h}mm.jpg`), 'image/jpeg', 0.95);
  const sheetCanvas = () => {
    const one = photoCanvas();
    const c = document.createElement('canvas'); c.width = mmToPx(sheet.w); c.height = mmToPx(sheet.h);
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    for (const p of layout.spots) {
      ctx.drawImage(one, mmToPx(p.x), mmToPx(p.y), W, H);
      ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 2; ctx.strokeRect(mmToPx(p.x), mmToPx(p.y), W, H);
    }
    return { c, one };
  };
  const dlSheet = () => sheetCanvas().c.toBlob((b) => b && save(b, `photos-${sheet.id}.jpg`), 'image/jpeg', 0.95);
  const dlPdf = async () => {
    const one = photoCanvas().toDataURL('image/jpeg', 0.95);
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: [sheet.w, sheet.h], orientation: sheet.w > sheet.h ? 'landscape' : 'portrait' });
    pdf.setDrawColor(200); pdf.setLineWidth(0.1);
    for (const p of layout.spots) { pdf.addImage(one, 'JPEG', p.x, p.y, spec.w, spec.h); pdf.rect(p.x, p.y, spec.w, spec.h); }
    save(pdf.output('blob'), `photos-${sheet.id}.pdf`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5 lg:sticky lg:top-20">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">{busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} {src ? 'Choose another photo' : 'Upload your photo'}</button>
        <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => choose(e.target.files?.[0])} />
        <label className="block text-[12px] text-mt-muted">Photo size
          <select value={specId} onChange={(e) => setSpecId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px] text-mt-ink">
            {PHOTO_SPECS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <p className="text-[12px] text-mt-muted -mt-2">{spec.note}</p>
        <div>
          <p className="text-[12px] text-mt-muted">Background</p>
          <div className="mt-1.5 flex gap-2">
            {BGS.map(([c, l]) => <button key={c} type="button" title={l} aria-label={l} aria-pressed={bg === c} onClick={() => setBg(c)} className={`h-9 w-9 rounded-xl border ${bg === c ? 'ring-2 ring-[#3B82C4] ring-offset-2 ring-offset-mt-surface' : 'border-mt-border'}`} style={{ background: c }} />)}
            <label className="h-9 w-9 rounded-xl border border-mt-border overflow-hidden relative cursor-pointer" style={{ background: 'conic-gradient(#F2708F,#F7C948,#8CC84B,#35C2F1,#A69BD3,#F2708F)' }} title="Any colour"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Any background colour" /></label>
          </div>
          {cut && <label className="mt-2 flex items-center justify-between text-[13px]"><span>Keep original background</span><input type="checkbox" checked={keepBg} onChange={(e) => setKeepBg(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /></label>}
        </div>
        {src && (
          <div className="space-y-3">
            {([['Size of head', zoom, 0.6, 1.8, 0.01, setZoom, (v: number) => `${Math.round(v * 100)}%`], ['Left / right', ox, -W / 2, W / 2, 1, setOx, (v: number) => `${Math.round(v)}`], ['Up / down', oy, -H / 2, H / 2, 1, setOy, (v: number) => `${Math.round(v)}`], ['Brightness', bright, 70, 140, 1, setBright, (v: number) => `${v}%`]] as const).map(([l, v, mn, mx, st, fn, fmt]) => (
              <label key={l} className="block">
                <span className="flex justify-between text-[12px] text-mt-muted"><span>{l}</span><span className="tabular-nums text-mt-ink">{fmt(v as number)}</span></span>
                <input type="range" min={mn} max={mx} step={st} value={v as number} onChange={(e) => (fn as any)(Number(e.target.value))} className="mt-1 w-full accent-[#3B82C4]" />
              </label>
            ))}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Show head guides</label>
              <button type="button" onClick={() => src && fit(src, subjectRef.current)} className="text-[12.5px] text-mt-muted inline-flex items-center gap-1 hover:text-mt-ink"><RotateCcw size={12} /> Auto fit</button>
            </div>
          </div>
        )}
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="rounded-3xl border border-mt-border bg-mt-surface2/60 p-6 grid place-items-center min-h-[420px]">
          {src ? <canvas ref={view} className="rounded shadow-lg max-w-full" aria-label="Passport photo preview" /> : (
            <button type="button" onClick={() => fileRef.current?.click()} className="text-center text-mt-muted">
              <ScanFace size={42} className="mx-auto" />
              <p className="mt-3 text-[15px] font-semibold text-mt-ink">Upload a front-facing photo</p>
              <p className="mt-1 text-[13px]">Good light, plain face, shoulders visible. It never leaves your device.</p>
            </button>
          )}
        </div>
        {status && <p role="status" className="text-[13px] text-mt-muted">{status}</p>}
        {src && (
          <div className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={dlPhoto} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> One photo (JPG, 300 dpi)</button>
              <span className="text-[12px] text-mt-muted">{spec.w} × {spec.h} mm · {W} × {H} px</span>
            </div>
            <div className="flex flex-wrap items-end gap-2 border-t border-mt-border pt-4">
              <label className="flex-1 min-w-[220px] text-[12px] text-mt-muted">Print sheet
                <select value={sheetId} onChange={(e) => setSheetId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px] text-mt-ink">
                  {SHEETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <button type="button" onClick={dlSheet} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Sheet JPG</button>
              <button type="button" onClick={dlPdf} className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-2"><Download size={15} /> Sheet PDF</button>
            </div>
            <p className="text-[12.5px] text-mt-muted">{layout.spots.length} photos fit on {sheet.label.split(' (')[0]}, with light cut lines. Print at 100% (actual size).</p>
          </div>
        )}
      </div>
    </div>
  );
}
