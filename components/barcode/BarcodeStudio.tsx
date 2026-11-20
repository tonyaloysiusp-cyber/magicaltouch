'use client';

// Barcode Studio: EAN-13, UPC-A, EAN-8 and ITF-14 with the GS1 check digit,
// magnification, bar width reduction and vector exports — all on this device.

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileDown, XCircle } from 'lucide-react';
import { BARCODE_TYPES, DEFAULT_BARCODE, barcodeGeom, barcodePdf, barcodeSvg, normalise, type BarcodeOptions, type BarcodeType } from '@/lib/barcode';

const SAMPLE: Record<BarcodeType, string> = { ean13: '400638133393', upca: '03600029145', ean8: '9638507', itf14: '1001234567890' };
const r2 = (v: number) => Math.round(v * 100) / 100;

export function BarcodeStudio() {
  const [type, setType] = useState<BarcodeType>('ean13');
  const [input, setInput] = useState(SAMPLE.ean13);
  const [o, setO] = useState<Omit<BarcodeOptions, 'type' | 'code'>>({ magnification: 100, bwrMm: 0, text: true, ink: '#000000', bg: '#FFFFFF' });
  const [dpi, setDpi] = useState(600);
  const n = normalise(type, input);
  const opts: BarcodeOptions | null = n.error ? null : { ...DEFAULT_BARCODE, ...o, type, code: n.code };
  const svg = useMemo(() => (opts ? barcodeSvg(opts) : ''), [JSON.stringify(opts)]); // eslint-disable-line react-hooks/exhaustive-deps
  const g = opts ? barcodeGeom(opts) : null;
  const save = (data: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
  const base = opts ? `${BARCODE_TYPES.find((t) => t.id === type)!.name}_${opts.code}` : 'barcode';
  const png = async () => {
    if (!opts || !g) return;
    const w = Math.round((g.w / 25.4) * dpi), h = Math.round((g.h / 25.4) * dpi);
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${w}" height="${h}" `)); await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, w, h);
    c.toBlob((b) => b && save(b, `${base}_${dpi}dpi.png`), 'image/png');
  };
  const field = 'h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2.5 text-[13px]';
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-4 self-start rounded-2xl border border-mt-border bg-mt-surface p-4" aria-label="Barcode settings">
        <div role="radiogroup" aria-label="Barcode type" className="grid grid-cols-2 gap-1.5">
          {BARCODE_TYPES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={type === t.id} title={t.hint} onClick={() => { setType(t.id); setInput(SAMPLE[t.id]); }}
              className={`rounded-xl border px-2.5 py-2 text-left ${type === t.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:bg-mt-surface2'}`}>
              <span className="block text-[13px] font-semibold">{t.name}</span><span className={`block text-[10.5px] ${type === t.id ? 'text-mt-bg/70' : 'text-mt-faint'}`}>{t.digits} digits</span>
            </button>
          ))}
        </div>
        <label className="block text-[12px] text-mt-muted">Number (GTIN)
          <input value={input} onChange={(e) => setInput(e.target.value)} inputMode="numeric" aria-label="Barcode number" className={`${field} mt-1 font-mono tracking-wider`} />
        </label>
        <p className={`flex items-start gap-1.5 text-[12px] ${n.error ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`} role="status">
          {n.error ? <XCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
          {n.error || (n.added ? `Check digit ${n.code.slice(-1)} added: ${n.code}` : `Check digit correct: ${n.code}`)}
        </p>
        <label className="block text-[12px] text-mt-muted"><span className="flex justify-between"><span>Size (magnification)</span><span className="text-mt-ink tabular-nums">{o.magnification}%</span></span>
          <input type="range" min={80} max={200} step={5} value={o.magnification} onChange={(e) => setO({ ...o, magnification: Number(e.target.value) })} aria-label="Magnification" className="mt-1 w-full accent-[#3B82C4]" />
        </label>
        <label className="block text-[12px] text-mt-muted">Bar width reduction (mm)
          <input type="number" min={0} max={0.08} step={0.005} value={o.bwrMm} onChange={(e) => setO({ ...o, bwrMm: Math.max(0, Math.min(0.08, Number(e.target.value) || 0)) })} aria-label="Bar width reduction" className={`${field} mt-1`} />
          <span className="mt-0.5 block text-[11px] text-mt-faint">Ask your printer: offset is often 0.02–0.04 mm to make up for ink spread.</span>
        </label>
        <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={o.text} onChange={(e) => setO({ ...o, text: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Show the numbers</label>
        <div className="flex items-center gap-3 text-[12px] text-mt-muted">
          <label className="flex items-center gap-1.5">Bars <input type="color" value={o.ink} onChange={(e) => setO({ ...o, ink: e.target.value })} aria-label="Bar colour" className="h-8 w-9 rounded border border-mt-border" /></label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={o.bg !== null} onChange={(e) => setO({ ...o, bg: e.target.checked ? '#FFFFFF' : null })} /> White background</label>
        </div>
        <p className="text-[11px] leading-relaxed text-mt-faint">Dark bars on a light background scan best — black on white is safest. Red, orange and yellow bars do not scan.</p>
      </aside>
      <section aria-label="Barcode preview" className="rounded-2xl border border-mt-border bg-mt-surface p-4">
        <div className="grid min-h-[260px] place-items-center rounded-xl bg-[radial-gradient(circle,rgba(9,9,11,0.07)_1px,transparent_1px)] [background-size:18px_18px] p-6">
          {svg ? <div role="img" aria-label={`${base} barcode`} className="w-full max-w-[520px] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-[13px] text-mt-muted">Enter a valid number to see the barcode.</p>}
        </div>
        {g && <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-4">
          <div><dt className="text-mt-faint">Size incl. quiet zones</dt><dd className="font-semibold tabular-nums">{r2(g.w)} × {r2(g.h)} mm</dd></div>
          <div><dt className="text-mt-faint">Module (X)</dt><dd className="font-semibold tabular-nums">{r2(g.x * 1000) / 1000} mm</dd></div>
          <div><dt className="text-mt-faint">Bars</dt><dd className="font-semibold">{o.ink.toUpperCase() === '#000000' ? '100 % K (vector)' : o.ink}</dd></div>
          <div><dt className="text-mt-faint">Scan check</dt><dd className="font-semibold">{o.magnification < 80 ? 'too small' : 'within GS1 range'}</dd></div>
        </dl>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!opts} onClick={async () => opts && save(new Blob([await barcodePdf(opts) as unknown as BlobPart], { type: 'application/pdf' }), `${base}.pdf`)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-mt-primary px-4 text-[13px] font-semibold text-mt-onprimary disabled:opacity-50"><FileDown size={15} /> PDF (vector, 1:1)</button>
          <button type="button" disabled={!opts} onClick={() => save(new Blob([svg], { type: 'image/svg+xml' }), `${base}.svg`)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-mt-border px-4 text-[13px] font-semibold hover:bg-mt-surface2 disabled:opacity-50"><Download size={15} /> SVG</button>
          <span className="inline-flex items-center gap-1.5">
            <button type="button" disabled={!opts} onClick={png} className="inline-flex h-10 items-center gap-2 rounded-xl border border-mt-border px-4 text-[13px] font-semibold hover:bg-mt-surface2 disabled:opacity-50"><Download size={15} /> PNG</button>
            <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))} aria-label="PNG resolution" className="h-10 rounded-xl border border-mt-border bg-mt-bg px-2 text-[12.5px]">{[300, 600, 1200].map((d) => <option key={d} value={d}>{d} dpi</option>)}</select>
          </span>
        </div>
        <p className="mt-3 text-[11.5px] text-mt-faint">Get your GTIN numbers from GS1 in your country — a barcode only works in shops when the number is registered to you.</p>
      </section>
    </div>
  );
}
