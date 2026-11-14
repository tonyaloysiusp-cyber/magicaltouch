'use client';

// Wall stickers — upload artwork (PNG with transparency, JPG or SVG), set the
// sticker size, and get a cut contour that follows the shape (with a white
// border, or cutting just inside the art for bleed). Lay many on a sheet
// with registration marks for print-and-cut machines and download a vector
// PDF / SVG. Everything happens on this device.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileUp, Loader2 } from 'lucide-react';
import { contourFromRgba, dilate } from '@/lib/sticker';
import { SHEETS, nUpPlan } from '@/lib/imposition';

const CUT = '#EC008C'; // cut line colour (rename to your cutter's spot colour, e.g. CutContour, if it needs one)
function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const r2 = (n: number) => Math.round(n * 100) / 100;

export function StickerDesigner() {
  const [art, setArt] = useState<{ url: string; name: string; w: number; h: number; rgba: Uint8ClampedArray; pw: number; ph: number } | null>(null);
  const [widthMm, setWidthMm] = useState(200);
  const [cut, setCut] = useState<'border' | 'bleed' | 'none'>('border');
  const [offsetMm, setOffsetMm] = useState(3);
  const [sheet, setSheet] = useState('a3');
  const [margin, setMargin] = useState(12);
  const [gap, setGap] = useState(6);
  const [qty, setQty] = useState(0); // 0 = fill the sheet
  const [marks, setMarks] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (f: File) => {
    setErr(null);
    try {
      const url: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
      const img = new Image(); img.src = url; await img.decode();
      const w = img.naturalWidth || 1000, h = img.naturalHeight || 1000;
      const k = Math.min(1, 900 / Math.max(w, h));
      const pw = Math.max(1, Math.round(w * k)), ph = Math.max(1, Math.round(h * k));
      const c = document.createElement('canvas'); c.width = pw; c.height = ph;
      const g = c.getContext('2d')!; g.drawImage(img, 0, 0, pw, ph);
      setArt({ url, name: f.name.replace(/\.[^.]+$/, ''), w, h, rgba: g.getImageData(0, 0, pw, ph).data, pw, ph });
    } catch { setErr('This image could not be read. Use PNG, JPG or SVG.'); }
  };

  const heightMm = art ? (widthMm * art.h) / art.w : 0;
  // Contour in millimetres (sticker-local: 0,0 = artwork top-left).
  const contour = useMemo(() => {
    if (!art || cut === 'none') return null;
    const ppm = art.pw / widthMm; // contour pixels per mm
    let rgba = art.rgba;
    // No transparency (JPG / full rectangle)? The contour follows the rectangle.
    if (cut === 'bleed') {
      // Cut inside the art: shrink the shape (dilate the empty area).
      const n = art.pw * art.ph, inv = new Uint8Array(n);
      for (let i = 0; i < n; i++) inv[i] = rgba[i * 4 + 3] > 40 ? 0 : 1;
      const grown = dilate(inv, art.pw, art.ph, offsetMm * ppm);
      const out = new Uint8ClampedArray(rgba.length);
      for (let i = 0; i < n; i++) out[i * 4 + 3] = grown[i] ? 0 : 255;
      // Edge pixels count as empty, so the image edge also gets cut inside.
      for (let x = 0; x < art.pw; x++) for (const y of [0, art.ph - 1]) out[(y * art.pw + x) * 4 + 3] = 0;
      rgba = out;
      const c = contourFromRgba(rgba, art.pw, art.ph, 0, { smooth: 1 });
      return { d: c.d, s: 1 / ppm, pad: c.pad, loops: c.loops };
    }
    const c = contourFromRgba(rgba, art.pw, art.ph, offsetMm * ppm, { smooth: 1.2 });
    return { d: c.d, s: 1 / ppm, pad: c.pad, loops: c.loops };
  }, [art, widthMm, cut, offsetMm]);
  const ext = cut === 'border' ? offsetMm : 0; // how far the cut reaches outside the art
  const itemW = widthMm + 2 * ext, itemH = heightMm + 2 * ext;
  const S = SHEETS.find((x) => x.id === sheet)!;
  const plan = useMemo(() => nUpPlan({ sheetW: S.w, sheetH: S.h, itemW, itemH, bleed: 0, gap, margin: margin + (marks ? 8 : 0), rotate: 'auto' }), [S, itemW, itemH, gap, margin, marks]);
  const slots = qty > 0 ? plan.slots.slice(0, qty) : plan.slots;

  const one = (x: number, y: number, rotated: boolean) => {
    if (!art) return { art: '', cut: '' };
    // (x, y) = top-left of the item box (artwork + border).
    const t = rotated ? `translate(${r2(x + itemH)} ${r2(y)}) rotate(90)` : `translate(${r2(x)} ${r2(y)})`;
    const a = `<g transform="${t}"><image href="${art.url}" x="${r2(ext)}" y="${r2(ext)}" width="${r2(widthMm)}" height="${r2(heightMm)}" preserveAspectRatio="none"/></g>`;
    const c = contour ? `<g transform="${t}"><path d="${contour.d}" transform="translate(${r2(ext)} ${r2(ext)}) scale(${contour.s}) translate(${-contour.pad} ${-contour.pad})" fill="none" stroke="${CUT}" stroke-width="${r2(0.25 / contour.s)}"/></g>` : '';
    return { art: a, cut: c };
  };
  const regMarks = () => {
    if (!marks) return '';
    const m = margin, L = 6;
    // Three corner marks (top-left, top-right, bottom-left) used by print-and-cut cutters to find the sheet.
    const corner = (x: number, y: number, dx: number, dy: number) => `<path d="M${x} ${y}h${dx * L}M${x} ${y}v${dy * L}" stroke="#000" stroke-width="0.6" fill="none"/>`;
    return `<g id="registration">${corner(m, m, 1, 1)}${corner(S.w - m, m, -1, 1)}${corner(m, S.h - m, 1, -1)}<rect x="${m}" y="${m}" width="4" height="4" fill="#000"/></g>`;
  };
  const sheetSvg = useMemo(() => {
    if (!art) return '';
    const items = slots.map((sl) => one(sl.x, sl.y, sl.rotated));
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${S.w}mm" height="${S.h}mm" viewBox="0 0 ${S.w} ${S.h}"><rect width="${S.w}" height="${S.h}" fill="#fff"/><g id="print">${items.map((i) => i.art).join('')}${regMarks()}</g><g id="CutContour">${items.map((i) => i.cut).join('')}</g></svg>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, slots, contour, S, marks, margin, widthMm, heightMm, ext]);
  const singleSvg = useMemo(() => {
    if (!art) return '';
    const i = one(0, 0, false);
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${r2(itemW)}mm" height="${r2(itemH)}mm" viewBox="0 0 ${r2(itemW)} ${r2(itemH)}"><g id="print">${i.art}</g><g id="CutContour">${i.cut}</g></svg>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art, contour, itemW, itemH, widthMm, heightMm, ext]);

  const pdf = async (svg: string, w: number, h: number, name: string) => {
    setBusy(true); setErr(null);
    try { const { svgToPdfBlob } = await import('@/lib/svgToPdf'); save(await svgToPdfBlob(svg, w, h), name); }
    catch { setErr('The PDF could not be made in this browser.'); }
    setBusy(false);
  };
  useEffect(() => { if (cut === 'bleed' && offsetMm > 5) setOffsetMm(2); }, [cut, offsetMm]);

  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px]';
  const chip = (on: boolean) => `h-9 px-3 rounded-xl border text-[12.5px] font-semibold ${on ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`;
  const num = (label: string, v: number, on: (n: number) => void, min: number, max: number, step = 1) => <label className="block text-[12px] text-mt-muted">{label}<input type="number" min={min} max={max} step={step} value={v} onChange={(e) => on(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} className={field} /></label>;
  const base = art?.name || 'sticker';

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5">
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Artwork</h3>
          <button type="button" onClick={() => fileRef.current?.click()} className="h-10 w-full rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5"><FileUp size={15} /> {art ? 'Change artwork' : 'Choose PNG, JPG or SVG'}</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,.svg" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) load(f); }} />
          <p className="text-[11.5px] text-mt-muted">A PNG with a transparent background gives a contour that follows the shape. Nothing is uploaded.</p>
          {num('Sticker width (mm)', widthMm, setWidthMm, 10, 2000)}
          {art && <p className="text-[12px] text-mt-muted">Height {Math.round(heightMm)} mm (keeps the artwork’s proportions)</p>}
        </section>
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Contour cut</h3>
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Contour cut">
            {([['border', 'White border'], ['bleed', 'Cut inside'], ['none', 'No cut line']] as const).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={cut === v} onClick={() => setCut(v)} className={chip(cut === v)}>{l}</button>)}
          </div>
          {cut !== 'none' && num(cut === 'border' ? 'Border around the art (mm)' : 'Bleed — cut inside the art by (mm)', offsetMm, setOffsetMm, cut === 'border' ? 0 : 0.5, cut === 'border' ? 30 : 5, 0.5)}
        </section>
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Sheet</h3>
          <select value={sheet} onChange={(e) => setSheet(e.target.value)} className={field} aria-label="Sheet size">{SHEETS.map((x) => <option key={x.id} value={x.id}>{x.label} mm</option>)}</select>
          <div className="grid grid-cols-3 gap-2">{num('Margin', margin, setMargin, 0, 50)}{num('Gap', gap, setGap, 0, 50)}{num('How many (0 = fill)', qty, setQty, 0, 500)}</div>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Registration marks (print-and-cut)</label>
        </section>
        <div className="grid gap-2">
          <button type="button" disabled={!art || busy || !slots.length} onClick={() => pdf(sheetSvg, S.w, S.h, `${base}-sticker-sheet-${sheet}.pdf`)} className="h-11 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Sticker sheet · PDF</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!art} onClick={() => save(new Blob([sheetSvg], { type: 'image/svg+xml' }), `${base}-sticker-sheet.svg`)} className="h-10 rounded-full border border-mt-border text-[13px] font-semibold disabled:opacity-50">Sheet · SVG</button>
            <button type="button" disabled={!art || busy} onClick={() => pdf(singleSvg, itemW, itemH, `${base}-sticker.pdf`)} className="h-10 rounded-full border border-mt-border text-[13px] font-semibold disabled:opacity-50">One sticker · PDF</button>
          </div>
        </div>
        {err && <p role="alert" className="text-[13px] text-rose-600">{err}</p>}
        <p className="text-[11.5px] text-mt-faint">The cut line is a 0.25 pt magenta ({CUT}) path in its own “CutContour” layer of the SVG. If your cutter needs a named spot colour, assign it to that line in your RIP.</p>
      </aside>
      <div className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
        {art ? <>
          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(sheetSvg)}`} alt="Sticker sheet preview" className="mx-auto max-h-[680px] w-auto shadow-sm" />
          <p className="mt-2 text-center text-[13px] text-mt-muted" aria-live="polite" aria-label="Sticker summary"><b className="text-mt-ink">{slots.length} stickers</b> on {S.label} · each {Math.round(itemW)} × {Math.round(itemH)} mm{contour ? ` · ${contour.loops} cut path${contour.loops === 1 ? '' : 's'}` : ''}</p>
        </> : <p className="py-24 text-center text-[14px] text-mt-muted">Choose artwork to see your sticker sheet.</p>}
      </div>
    </div>
  );
}
