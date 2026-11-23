'use client';

// Separation & Halftone Studio — CMYK process plates or spot-colour plates
// for screen printing, halftone films (LPI, angle, dot shape), white
// underbase, ink-limit check, and film PDF / SVG / PNG exports. On this device.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, ImageUp } from 'lucide-react';
import { cmykPlanes, coverage, dotsPath, filmSvg, halftone, quantize, spotPlates, underbase, type DotShape, type Plate } from '@/lib/print/separate';

const PROCESS_INKS = [{ name: 'Cyan', ink: '#00A0E3', angle: 15 }, { name: 'Magenta', ink: '#E6007E', angle: 75 }, { name: 'Yellow', ink: '#FFED00', angle: 0 }, { name: 'Black', ink: '#1A1A1A', angle: 45 }];
const MAXPX = 1400;

export function SeparationStudio({ initialFile }: { initialFile?: File } = {}) {
  const [img, setImg] = useState<{ name: string; data: ImageData } | null>(null);
  const [mode, setMode] = useState<'process' | 'spot'>('spot');
  const [inks, setInks] = useState(4);
  const [garment, setGarment] = useState<string>('none');
  const [ub, setUb] = useState(false);
  const [choke, setChoke] = useState(2);
  const [widthMm, setWidthMm] = useState(280);
  const [ht, setHt] = useState(true);
  const [lpi, setLpi] = useState(45);
  const [shape, setShape] = useState<DotShape>('round');
  const [angles, setAngles] = useState<Record<string, number>>({});
  const [limit, setLimit] = useState(300);
  const [mirror, setMirror] = useState(false);
  const [view, setView] = useState<number>(-1); // -1 composite
  const [tac, setTac] = useState(false);
  const [lut, setLut] = useState<Uint8Array | null>(null);
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => { if (mode === 'process' && !lut) import('@/lib/color/cmyk').then((m) => m.loadCmykTable()).then(setLut).catch(() => setMsg('The CMYK table could not load.')); }, [mode, lut]);

  // Opened from the design editor: start with the page it handed over.
  const initRef = useRef(false);
  useEffect(() => { if (initialFile && !initRef.current) { initRef.current = true; void open(initialFile); } }); // eslint-disable-line react-hooks/exhaustive-deps
  const open = async (f: File | undefined | null) => {
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      const k = Math.min(1, MAXPX / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      const x = c.getContext('2d')!; x.drawImage(bmp, 0, 0, c.width, c.height);
      setImg({ name: f.name.replace(/\.[^.]+$/, ''), data: x.getImageData(0, 0, c.width, c.height) }); setView(-1); setMsg('');
    } catch { setMsg('This picture could not be opened. Use PNG or JPG.'); }
  };

  const w = img?.data.width || 1, h = img?.data.height || 1, heightMm = Math.round((widthMm * h) / w * 10) / 10, dpi = Math.round(w / (widthMm / 25.4));
  const sep = useMemo(() => {
    if (!img) return null;
    if (mode === 'process') {
      if (!lut) return null;
      // dynamic import resolved above; rgbaToCmyk is pure
      return { kind: 'process' as const };
    }
    const q = quantize(img.data.data, inks + (garment !== 'none' ? 1 : 0));
    return { kind: 'spot' as const, q };
  }, [img, mode, inks, garment, lut]);
  const [cmyk, setCmyk] = useState<Uint8Array | null>(null);
  useEffect(() => { if (img && mode === 'process' && lut) import('@/lib/color/cmyk').then((m) => setCmyk(m.rgbaToCmyk(img.data.data, lut))); }, [img, mode, lut]);

  const plates: Plate[] = useMemo(() => {
    if (!img || !sep) return [];
    if (sep.kind === 'process') {
      if (!cmyk) return [];
      return cmykPlanes(cmyk).map((p, i) => ({ name: PROCESS_INKS[i].name, ink: PROCESS_INKS[i].ink, plane: p, angle: angles[PROCESS_INKS[i].name] ?? PROCESS_INKS[i].angle }));
    }
    // garment colour = the palette entry closest to the chosen garment colour (skipped: no ink there)
    let skip: number | null = null;
    if (garment !== 'none') { const g = parseInt(garment.slice(1), 16), gr = [g >> 16, (g >> 8) & 255, g & 255]; let bd = Infinity; sep.q.palette.forEach((c, i) => { const d = (c[0] - gr[0]) ** 2 + (c[1] - gr[1]) ** 2 + (c[2] - gr[2]) ** 2; if (d < bd) { bd = d; skip = i; } }); }
    const sp = spotPlates(sep.q, skip).map((p, i) => ({ ...p, angle: angles[p.name] ?? [22.5, 52.5, 82.5, 7.5, 37.5, 67.5, 22.5, 52.5][i % 8] }));
    if (ub && garment !== 'none') sp.unshift({ name: 'White underbase', ink: '#FFFFFF', plane: underbase(sp.map((p) => p.plane), w, h, choke), angle: angles['White underbase'] ?? 22.5 });
    return sp;
  }, [img, sep, cmyk, garment, ub, choke, angles, w, h]);
  const cov = useMemo(() => (cmyk && mode === 'process' ? coverage(cmyk, limit) : null), [cmyk, mode, limit]);

  // Preview: composite of the plates in their inks (or one plate as a film), or the ink-limit map.
  useEffect(() => {
    const c = cv.current; if (!c || !img) return;
    c.width = w; c.height = h; const x = c.getContext('2d')!; const out = x.createImageData(w, h); const d = out.data;
    const bg = garment !== 'none' && mode === 'spot' ? parseInt(garment.slice(1), 16) : 0xffffff;
    for (let i = 0; i < w * h; i++) { d[i * 4] = bg >> 16; d[i * 4 + 1] = (bg >> 8) & 255; d[i * 4 + 2] = bg & 255; d[i * 4 + 3] = 255; }
    if (tac && cov) { for (let i = 0; i < w * h; i++) { const g = 255 - Math.round((img.data.data[i * 4] + img.data.data[i * 4 + 1] + img.data.data[i * 4 + 2]) / 3 * 0.5); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g; if (cov.over[i]) { d[i * 4] = 230; d[i * 4 + 1] = 20; d[i * 4 + 2] = 60; } } }
    else if (view >= 0 && plates[view]) { const p = plates[view].plane; for (let i = 0; i < w * h; i++) { const v = 255 - p[i]; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; } }
    else for (const p of plates) {
      const v = parseInt(p.ink.slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
      for (let i = 0; i < w * h; i++) { const a = p.plane[i] / 255; if (!a) continue; if (mode === 'process') { d[i * 4] = d[i * 4] * (1 - a + (a * r) / 255); d[i * 4 + 1] = d[i * 4 + 1] * (1 - a + (a * g) / 255); d[i * 4 + 2] = d[i * 4 + 2] * (1 - a + (a * b) / 255); } else { d[i * 4] = r * a + d[i * 4] * (1 - a); d[i * 4 + 1] = g * a + d[i * 4 + 1] * (1 - a); d[i * 4 + 2] = b * a + d[i * 4 + 2] * (1 - a); } }
    }
    x.putImageData(out, 0, 0);
  }, [img, plates, view, tac, cov, w, h, garment, mode]);

  const htOpts = (p: Plate) => ({ widthMm, heightMm, lpi, angle: p.angle, shape, minDot: 0.02, maxDot: 0.97 });
  const plateBody = (p: Plate) => {
    if (ht) return `<path d="${dotsPath(halftone(p.plane, w, h, htOpts(p)).dots, shape)}" fill="#000"/>`;
    // solid plate as a 1:1 bitmap film (black = ink)
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; const id = x.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 255 - p.plane[i]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    x.putImageData(id, 0, 0);
    return `<image href="${c.toDataURL('image/png')}" width="${widthMm}" height="${heightMm}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`;
  };
  const label = (p: Plate, i: number) => `${img?.name || 'Design'} · ${i + 1}/${plates.length} ${p.name}${ht ? ` · ${lpi} lpi ${p.angle}° ${shape}` : ' · solid'} · ${widthMm}×${heightMm} mm${mirror ? ' · mirrored' : ''}`;
  const save = (b: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };

  const filmsPdf = async () => {
    if (!plates.length) return;
    setMsg('Making films…');
    try {
      const { PDFDocument, PDFName, StandardFonts } = await import('pdf-lib');
      const PT = 72 / 25.4, m = 15, W = widthMm + 2 * m, H = heightMm + 2 * m;
      const doc = await PDFDocument.create(); doc.setProducer(''); doc.setCreator(''); doc.setTitle(`${img?.name} — separation films`);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const n = (v: number) => String(Math.round(v * 1000) / 1000);
      for (let pi = 0; pi < plates.length; pi++) {
        const p = plates[pi], page = doc.addPage([W * PT, H * PT]);
        const X = (x: number) => n((mirror ? W - x : x) * PT), Y = (y: number) => n((H - y) * PT);
        let cs = 'q 0 0 0 1 k 0 0 0 1 K\n';
        if (ht) {
          const { dots } = halftone(p.plane, w, h, htOpts(p));
          const K = 0.5523;
          for (const d of dots) {
            const x = d.x + m, y = d.y + m;
            if (shape === 'round') { const r = d.r; cs += `${X(x + r)} ${Y(y)} m ${X(x + r)} ${Y(y + r * K)} ${X(x + r * K)} ${Y(y + r)} ${X(x)} ${Y(y + r)} c ${X(x - r * K)} ${Y(y + r)} ${X(x - r)} ${Y(y + r * K)} ${X(x - r)} ${Y(y)} c ${X(x - r)} ${Y(y - r * K)} ${X(x - r * K)} ${Y(y - r)} ${X(x)} ${Y(y - r)} c ${X(x + r * K)} ${Y(y - r)} ${X(x + r)} ${Y(y - r * K)} ${X(x + r)} ${Y(y)} c h\n`; }
            else {
              const rx = d.rx ?? d.r, ry = d.r, a = ((d.a || 0) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
              const pts = shape === 'ellipse' ? Array.from({ length: 12 }, (_, k) => { const t = (k / 12) * Math.PI * 2; const u = rx * Math.cos(t), v = ry * Math.sin(t); return [x + u * c - v * s, y + u * s + v * c]; }) : [[-rx, -ry], [rx, -ry], [rx, ry], [-rx, ry]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
              cs += pts.map(([px, py], k) => `${X(px)} ${Y(py)} ${k ? 'l' : 'm'}`).join(' ') + ' h\n';
            }
          }
          cs += 'f\n';
        } else {
          // solid plate: 1-bit style grey image, black = ink
          const gray = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) gray[i] = 255 - p.plane[i];
          const im = doc.context.register(doc.context.flateStream(gray, { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceGray', BitsPerComponent: 8, Interpolate: false }));
          const name = page.node.newXObject('Plate', im);
          cs += mirror ? `q ${n(-widthMm * PT)} 0 0 ${n(heightMm * PT)} ${n((W - m) * PT)} ${n(m * PT)} cm /${name.toString().slice(1)} Do Q\n` : `q ${n(widthMm * PT)} 0 0 ${n(heightMm * PT)} ${n(m * PT)} ${n(m * PT)} cm /${name.toString().slice(1)} Do Q\n`;
        }
        // registration marks
        cs += '0.5 w\n';
        for (const [cx, cy] of [[W / 2, m / 2], [W / 2, H - m / 2], [m / 2, H / 2], [W - m / 2, H / 2]]) {
          const r = 3.5; cs += `${X(cx - r - 2)} ${Y(cy)} m ${X(cx + r + 2)} ${Y(cy)} l ${X(cx)} ${Y(cy - r - 2)} m ${X(cx)} ${Y(cy + r + 2)} l S\n`;
          const K = 0.5523; cs += `${X(cx + r)} ${Y(cy)} m ${X(cx + r)} ${Y(cy + r * K)} ${X(cx + r * K)} ${Y(cy + r)} ${X(cx)} ${Y(cy + r)} c ${X(cx - r * K)} ${Y(cy + r)} ${X(cx - r)} ${Y(cy + r * K)} ${X(cx - r)} ${Y(cy)} c ${X(cx - r)} ${Y(cy - r * K)} ${X(cx - r * K)} ${Y(cy - r)} ${X(cx)} ${Y(cy - r)} c ${X(cx + r * K)} ${Y(cy - r)} ${X(cx + r)} ${Y(cy - r * K)} ${X(cx + r)} ${Y(cy)} c S\n`;
        }
        cs += 'Q\n';
        page.node.set(PDFName.of('Contents'), doc.context.register(doc.context.flateStream(new TextEncoder().encode(cs))));
        page.drawText(label(p, pi), { x: m * PT, y: (H - m * 0.55) * PT, size: 8, font });
      }
      save(new Blob([await doc.save({ useObjectStreams: false }) as unknown as BlobPart], { type: 'application/pdf' }), `${img?.name || 'design'}_FILMS_${plates.length}-plates.pdf`);
      setMsg('');
    } catch (e) { console.error(e); setMsg('The films could not be made — try a lower LPI or a smaller print size.'); }
  };
  const plateSvg = (i: number) => { const p = plates[i]; save(new Blob([filmSvg({ widthMm, heightMm, label: label(p, i), body: plateBody(p), mirror })], { type: 'image/svg+xml' }), `${img?.name}_${i + 1}_${p.name.replace(/[^\w]+/g, '-')}.svg`); };
  const dotCount = plates[0] ? Math.round((widthMm / (25.4 / lpi)) * (heightMm / (25.4 / lpi))) : 0;

  const field = 'h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2.5 text-[13px]';
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_260px]">
      <aside className="space-y-3 self-start rounded-2xl border border-mt-border bg-mt-surface p-4" aria-label="Separation settings">
        <button type="button" onClick={() => input.current?.click()} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-mt-primary text-[13px] font-semibold text-mt-onprimary"><ImageUp size={16} /> {img ? 'Choose another picture' : 'Open a picture'}</button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Picture" onChange={(e) => { open(e.target.files?.[0]); e.target.value = ''; }} />
        <div role="radiogroup" aria-label="Separation type" className="grid grid-cols-2 gap-1.5">
          {([['spot', 'Spot colours', 'Screen printing'], ['process', 'CMYK process', 'Offset / digital']] as const).map(([v, l, s]) => (
            <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => { setMode(v); setView(-1); setHt(v === 'process' ? true : ht); setLpi(v === 'process' ? 150 : 45); }} className={`rounded-xl border px-2.5 py-2 text-left ${mode === v ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:bg-mt-surface2'}`}><span className="block text-[12.5px] font-semibold">{l}</span><span className={`block text-[10.5px] ${mode === v ? 'text-mt-bg/70' : 'text-mt-faint'}`}>{s}</span></button>
          ))}
        </div>
        <label className="block text-[12px] text-mt-muted">Print width (mm)
          <input type="number" min={10} max={3000} value={widthMm} onChange={(e) => setWidthMm(Math.max(10, Number(e.target.value) || 10))} aria-label="Print width" className={`${field} mt-1`} />
          {img && <span className="mt-0.5 block text-[11px] text-mt-faint">{widthMm} × {heightMm} mm · picture {w} × {h} px = {dpi} dpi at this size{dpi < 150 ? ' (low — halftone hides some of it)' : ''}</span>}
        </label>
        {mode === 'spot' && <>
          <label className="block text-[12px] text-mt-muted"><span className="flex justify-between"><span>Number of inks</span><span className="text-mt-ink">{inks}</span></span><input type="range" min={1} max={8} value={inks} onChange={(e) => setInks(Number(e.target.value))} aria-label="Number of inks" className="mt-1 w-full accent-[#3B82C4]" /></label>
          <label className="block text-[12px] text-mt-muted">Garment / paper colour (not printed)
            <span className="mt-1 flex items-center gap-2"><select value={garment === 'none' ? 'none' : 'pick'} onChange={(e) => setGarment(e.target.value === 'none' ? 'none' : '#111111')} className={field}><option value="none">Print every colour</option><option value="pick">Skip the garment colour</option></select>{garment !== 'none' && <input type="color" value={garment} onChange={(e) => setGarment(e.target.value)} aria-label="Garment colour" className="h-9 w-10 rounded border border-mt-border" />}</span>
          </label>
          {garment !== 'none' && <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={ub} onChange={(e) => setUb(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> White underbase (dark garments)</label>}
          {ub && garment !== 'none' && <label className="block text-[12px] text-mt-muted"><span className="flex justify-between"><span>Underbase choke</span><span className="text-mt-ink">{choke} px</span></span><input type="range" min={0} max={8} value={choke} onChange={(e) => setChoke(Number(e.target.value))} aria-label="Underbase choke" className="mt-1 w-full accent-[#3B82C4]" /></label>}
        </>}
        {mode === 'process' && <label className="block text-[12px] text-mt-muted">Ink limit (total area coverage)
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={`${field} mt-1`}>{[240, 260, 280, 300, 320, 330, 340].map((v) => <option key={v} value={v}>{v} %{v === 300 ? ' — coated sheetfed' : v === 260 ? ' — uncoated' : v === 240 ? ' — newsprint' : ''}</option>)}</select>
        </label>}
        <div className="rounded-xl border border-mt-border p-2.5 space-y-2">
          <label className="flex items-center gap-2 text-[12.5px] font-semibold"><input type="checkbox" checked={ht} onChange={(e) => setHt(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Halftone</label>
          {ht && <>
            <label className="block text-[12px] text-mt-muted">Screen (lines per inch)
              <select value={lpi} onChange={(e) => setLpi(Number(e.target.value))} className={`${field} mt-1`}>{[25, 35, 45, 55, 65, 85, 100, 133, 150, 175].map((v) => <option key={v} value={v}>{v} lpi{v === 45 ? ' — screen printing on 230 mesh' : v === 150 ? ' — offset, coated' : v === 85 ? ' — newsprint' : ''}</option>)}</select>
            </label>
            <label className="block text-[12px] text-mt-muted">Dot shape
              <select value={shape} onChange={(e) => setShape(e.target.value as DotShape)} className={`${field} mt-1`}><option value="round">Round</option><option value="ellipse">Elliptical (smoother mid-tones)</option><option value="square">Square</option><option value="line">Line</option></select>
            </label>
          </>}
        </div>
        <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Mirror films (emulsion side down)</label>
        {msg && <p role="status" className="text-[12px] text-mt-muted">{msg}</p>}
      </aside>

      <section aria-label="Separation preview" className="min-w-0 rounded-2xl border border-mt-border bg-mt-surface">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-mt-border px-3 py-2">
          <button type="button" onClick={() => { setView(-1); setTac(false); }} className={`h-8 rounded-full px-3 text-[12px] font-semibold ${view === -1 && !tac ? 'bg-mt-ink text-mt-bg' : 'border border-mt-border'}`}>All inks</button>
          {plates.map((p, i) => <button key={p.name} type="button" onClick={() => { setView(i); setTac(false); }} className={`h-8 inline-flex items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ${view === i && !tac ? 'bg-mt-ink text-mt-bg' : 'border border-mt-border'}`}><span className="h-3 w-3 rounded-full border border-black/20" style={{ background: p.ink }} />{p.name.replace(/^Spot \d+ /, '')}</button>)}
          {cov && <button type="button" onClick={() => setTac((v) => !v)} className={`ml-auto h-8 rounded-full px-3 text-[12px] font-semibold ${tac ? 'bg-red-600 text-white' : 'border border-mt-border'}`}>Ink limit map</button>}
        </div>
        <div className="grid min-h-[420px] place-items-center bg-[repeating-conic-gradient(#e5e5ea_0_25%,#ffffff_0_50%)] bg-[length:18px_18px] p-4">
          {img ? <canvas ref={cv} aria-label="Separation preview" className="max-h-[68vh] max-w-full shadow-lg" /> : <p className="text-[13px] text-mt-muted">Open a picture (PNG with a transparent background works best for garments).</p>}
        </div>
        {cov && <p className="border-t border-mt-border px-3 py-2 text-[12px]">Total ink: max <b>{cov.maxPct} %</b>, average {cov.meanPct} % — {cov.overShare > 0 ? <span className="text-red-600">{(cov.overShare * 100).toFixed(1)} % of the picture is over {limit} %</span> : <span className="text-emerald-700">within {limit} %</span>}.</p>}
      </section>

      <aside className="space-y-3 self-start" aria-label="Films">
        <div className="rounded-2xl border border-mt-border bg-mt-surface p-4 space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Plates · {plates.length}</p>
          {plates.map((p, i) => (
            <div key={p.name} className="flex items-center gap-2 text-[12.5px]">
              <span className="h-4 w-4 shrink-0 rounded border border-black/20" style={{ background: p.ink }} />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {ht && <input type="number" value={p.angle} step={7.5} onChange={(e) => setAngles((a) => ({ ...a, [p.name]: Number(e.target.value) || 0 }))} aria-label={`${p.name} screen angle`} className="h-7 w-14 rounded border border-mt-border bg-mt-bg px-1 text-[12px] tabular-nums" title="Screen angle (°)" />}
              <button type="button" onClick={() => plateSvg(i)} aria-label={`Download ${p.name} SVG`} className="h-7 w-7 rounded border border-mt-border inline-grid place-items-center hover:bg-mt-surface2"><Download size={13} /></button>
            </div>
          ))}
          <button type="button" disabled={!plates.length} onClick={filmsPdf} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-mt-primary text-[13px] font-semibold text-mt-onprimary disabled:opacity-50"><FileDown size={15} /> All films (PDF)</button>
          {ht && plates.length > 0 && <p className="text-[11px] text-mt-faint">About {dotCount.toLocaleString()} dots per plate.{dotCount > 400000 ? ' Large — the PDF may take a while.' : ''}</p>}
          <p className="text-[11px] leading-relaxed text-mt-faint">Films are black on white at 1:1 with registration marks and a label on each. Print on film at 100 % — check the dot gain your screens or plates need.</p>
        </div>
      </aside>
    </div>
  );
}
