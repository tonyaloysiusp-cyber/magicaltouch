'use client';

// Sublimation print — puts the current pattern on real garment pieces
// (jersey, polo, shorts, socks, cap, flag) at true size with bleed, for one
// size or a whole size run, and downloads what a print shop needs:
// a vector print file (SVG, mm), a PNG with the DPI written in, a PDF with
// one page per piece, a markup / tech sheet (SVG or PDF) and a job file
// (JSON) that reopens everything later.

import { useMemo, useState } from 'react';
import { Download, FileJson, Ruler, Shirt } from 'lucide-react';
import { PatternSettings, layout, tileSvg, svgDataUrl } from '@/lib/patterns';
import { PRODUCTS, SIZES as GSIZES, ROLLS, RunLine, markupSvg, pieceSvg, printLayoutSvg } from '@/lib/garments';
import { pngWithDpi } from '@/lib/pngDpi';

export interface SublimationJob { product: string; size: string; rollW: number; bleed: number; repeatMm: number; cutLines: boolean; mirror: boolean; useRun: boolean; run: Record<string, number>; name: string }
export const DEFAULT_JOB: SublimationJob = { product: 'jersey', size: 'm', rollW: 1600, bleed: 10, repeatMm: 60, cutLines: true, mirror: false, useRun: false, run: {}, name: 'Team kit' };

const MAX_PX = 120_000_000; // keep one canvas under what desktop browsers allow
const SIDE = 32_000;

function save(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function svgCanvas(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('render')); img.src = url; });
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';
const mmPx = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi);

export function SublimationPanel({ p, job, setJob }: { p: PatternSettings; job: SublimationJob; setJob: (j: SublimationJob) => void }) {
  const [dpi, setDpi] = useState(150);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (o: Partial<SublimationJob>) => setJob({ ...job, ...o });
  const product = PRODUCTS.find((x) => x.id === job.product) || PRODUCTS[0];
  const size = GSIZES.find((x) => x.id === job.size) || GSIZES[3];
  const run: RunLine[] = GSIZES.map((s) => ({ label: s.label, k: s.k, qty: job.run[s.id] || 0 }));
  const runTotal = run.reduce((n, r) => n + r.qty, 0);
  const useRun = job.useRun && runTotal > 0 && product.id !== 'flag';

  const tile = useMemo(() => {
    const { w, h } = layout(p);
    return { w, h, inner: tileSvg(p, { background: false }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') };
  }, [p]);
  const common = { tileInner: tile.inner, tileW: tile.w, tileH: tile.h, repeatMm: job.repeatMm, background: p.background };
  const print = useMemo(() => printLayoutSvg({ ...common, product, sizeK: size.k, sizeLabel: size.label, rollW: job.rollW, bleed: job.bleed, cutLines: job.cutLines, name: job.name, run: useRun ? run : undefined, mirror: job.mirror }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tile, job, product, size, useRun]);
  const sizeRun: Record<string, number> = useRun ? Object.fromEntries(run.filter((r) => r.qty).map((r) => [r.label, r.qty])) : { [size.label]: 1 };
  const markup = useMemo(() => markupSvg({ ...common, product, sizeLabel: useRun ? 'Size run' : size.label, sizeK: size.k, name: job.name, colors: p.colors, bleed: job.bleed, rollW: job.rollW, sizeRun, date: new Date().toISOString().slice(0, 10) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tile, job, product, size, useRun, p.colors]);
  const base = `${slug(job.name)}-${product.id}-${useRun ? 'size-run' : size.id}`;
  const area = print.placed.reduce((n, pl) => n + (pl.w + 2 * job.bleed) * (pl.h + 2 * job.bleed), 0) / 1e6;
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 5000); };

  const dlSvg = (svg: string, name: string) => save(new Blob([svg], { type: 'image/svg+xml' }), name);

  const dlPng = async () => {
    setBusy('png');
    try {
      let d = dpi;
      let w = mmPx(job.rollW, d), h = mmPx(print.height, d);
      while ((w * h > MAX_PX || w > SIDE || h > SIDE) && d > 30) { d = Math.floor(d * 0.85); w = mmPx(job.rollW, d); h = mmPx(print.height, d); }
      const c = await svgCanvas(print.svg, w, h);
      const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('png'))), 'image/png'));
      const bytes = pngWithDpi(new Uint8Array(await blob.arrayBuffer()), d);
      save(new Blob([bytes as BlobPart], { type: 'image/png' }), `${base}-print-${d}dpi.png`);
      if (d !== dpi) flash(`This print is too large for one picture at ${dpi} DPI in a browser, so it was made at ${d} DPI. For full resolution use the SVG print file or the PDF with one page per piece.`);
    } catch { flash('The PNG could not be made in this browser. Use the SVG print file instead.'); }
    setBusy(null);
  };

  const dlPiecesPdf = async () => {
    setBusy('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      // One page per different piece (and size); the label says how many to print.
      const seen = new Map<string, { pl: (typeof print.placed)[number]; n: number }>();
      for (const pl of print.placed) {
        const key = `${pl.piece.id}|${pl.size || size.label}`;
        const s = seen.get(key);
        if (s) s.n++; else seen.set(key, { pl, n: 1 });
      }
      let pdf: any = null;
      let lowest = dpi;
      for (const { pl, n } of seen.values()) {
        const ps = pieceSvg(pl, { ...common, bleed: job.bleed, cutLines: job.cutLines });
        let d = dpi;
        while (mmPx(ps.w, d) * mmPx(ps.h, d) > 16_000_000 && d > 60) d -= 10;
        lowest = Math.min(lowest, d);
        const c = await svgCanvas(ps.svg, mmPx(ps.w, d), mmPx(ps.h, d));
        const fmt: [number, number] = [ps.w, ps.h + 12];
        const orient = fmt[0] > fmt[1] ? 'landscape' : 'portrait';
        if (!pdf) pdf = new jsPDF({ unit: 'mm', format: fmt, orientation: orient, compress: true });
        else pdf.addPage(fmt, orient);
        pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, ps.w, ps.h, undefined, 'FAST');
        pdf.setFontSize(9); pdf.setTextColor(60);
        pdf.text(`${job.name} · ${product.label} · ${pl.piece.label} · size ${pl.size || size.label} · print ${n}× · ${Math.round(pl.w)}×${Math.round(pl.h)} mm + ${job.bleed} mm bleed · ${d} DPI`, 4, ps.h + 7);
        c.width = c.height = 0;
      }
      if (pdf) save(pdf.output('blob'), `${base}-pieces.pdf`);
      if (lowest < dpi) flash(`Large pieces were made at ${lowest} DPI to fit browser limits. The SVG print file has no resolution limit.`);
    } catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };

  const dlMarkupPdf = async () => {
    setBusy('markup');
    try {
      const { jsPDF } = await import('jspdf');
      const c = await svgCanvas(markup, mmPx(420, 200), mmPx(297, 200));
      const pdf = new jsPDF({ unit: 'mm', format: 'a3', orientation: 'landscape', compress: true });
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, 420, 297, undefined, 'FAST');
      save(pdf.output('blob'), `${base}-markup.pdf`);
    } catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };

  const dlJson = () => save(new Blob([JSON.stringify({ format: 'mt-sublimation-job', version: 1, pattern: { ...p, image: p.motif === 'image' ? p.image : undefined }, job,
    pieces: print.placed.map((pl) => ({ piece: pl.piece.id, label: pl.piece.label, size: pl.size || size.label, x: Math.round(pl.x), y: Math.round(pl.y), w: Math.round(pl.w), h: Math.round(pl.h) })),
    roll: { widthMm: job.rollW, lengthMm: print.height } }, null, 1)], { type: 'application/json' }), `${base}-job.json`);

  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px]';
  const btn = 'h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60';

  return (
    <section aria-labelledby="sub-title" className="rounded-3xl border border-mt-border bg-mt-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="sub-title" className="text-lg font-semibold mr-auto inline-flex items-center gap-2"><Shirt size={18} /> Sublimation print</h2>
        <span className="text-[12px] text-mt-muted">Garment pieces at real size, ready for the printer</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {PRODUCTS.map((x) => (
          <button key={x.id} type="button" onClick={() => set({ product: x.id })} aria-pressed={job.product === x.id} className={`h-8 px-3 rounded-full border text-[13px] font-medium ${job.product === x.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`}>{x.label}</button>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-mt-muted">{product.note}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[12px] text-mt-muted">Design name<input value={job.name} maxLength={60} onChange={(e) => set({ name: e.target.value })} className={field} /></label>
        {product.id !== 'flag' && (
          <label className="text-[12px] text-mt-muted">Size<select value={job.size} disabled={useRun} onChange={(e) => set({ size: e.target.value })} className={field}>{GSIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        )}
        <label className="text-[12px] text-mt-muted">Paper roll width<select value={job.rollW} onChange={(e) => set({ rollW: Number(e.target.value) })} className={field}>{ROLLS.map((r) => <option key={r} value={r}>{r} mm ({Math.round(r / 25.4)} in)</option>)}</select></label>
        <label className="text-[12px] text-mt-muted">Pattern repeat (mm)<input type="number" min={10} max={600} value={job.repeatMm} onChange={(e) => set({ repeatMm: Math.max(10, Math.min(600, Number(e.target.value) || 60)) })} className={field} /></label>
        <label className="text-[12px] text-mt-muted">Bleed past the cut line (mm)<input type="number" min={0} max={30} value={job.bleed} onChange={(e) => set({ bleed: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} className={field} /></label>
        <label className="flex items-center gap-2 text-[13px] sm:mt-6"><input type="checkbox" checked={job.cutLines} onChange={(e) => set({ cutLines: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Cut lines (magenta)</label>
        <label className="flex items-center gap-2 text-[13px] sm:mt-6"><input type="checkbox" checked={job.mirror} onChange={(e) => set({ mirror: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Mirror for transfer paper</label>
      </div>

      {product.id !== 'flag' && (
        <div className="mt-4 rounded-2xl bg-mt-bg p-3">
          <label className="flex items-center gap-2 text-[13px] font-medium"><input type="checkbox" checked={job.useRun} onChange={(e) => set({ useRun: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Lay out a whole order (size run)</label>
          {job.useRun && (
            <div className="mt-2 grid grid-cols-4 sm:grid-cols-8 gap-2">
              {GSIZES.map((s) => (
                <label key={s.id} className="text-center text-[11.5px] text-mt-muted">{s.label.replace(/ \(.*/, '')}
                  <input type="number" min={0} max={200} value={job.run[s.id] || 0} onChange={(e) => set({ run: { ...job.run, [s.id]: Math.max(0, Math.min(200, Number(e.target.value) || 0)) } })} className="mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-surface px-1 text-center text-[13px]" aria-label={`Quantity ${s.label}`} />
                </label>
              ))}
            </div>
          )}
          {job.useRun && <p className="mt-2 text-[12px] text-mt-muted">{runTotal ? `${runTotal} garments · ${print.placed.length} pieces in one print file.` : 'Enter how many of each size.'}</p>}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-mt-border bg-[repeating-conic-gradient(#f3f3f3_0_25%,#fff_0_50%)] bg-[length:16px_16px] max-h-[460px] overflow-auto">
        <img src={svgDataUrl(print.svg)} alt={`Print layout: ${product.label}`} className="block w-full h-auto" />
      </div>
      <p className="mt-2 text-[12px] text-mt-muted inline-flex flex-wrap items-center gap-x-3 gap-y-1"><Ruler size={13} /> Roll {job.rollW} × {print.height} mm · {(print.height / 1000).toFixed(2)} m of paper · printed area {area.toFixed(2)} m² · {print.placed.length} pieces</p>

      {print.placed.some((x) => x.tooWide) && <p role="alert" className="mt-2 text-[12.5px] font-medium text-rose-600">Some pieces are wider than a {job.rollW} mm roll. Choose a wider roll.</p>}
      {print.placed.some((x) => x.rot) && <p className="mt-1 text-[12px] text-mt-muted">Pieces too wide for the roll were turned 90° — check the pattern direction suits this.</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-mt-muted mr-1">Print file</span>
        <button type="button" onClick={() => dlSvg(print.svg, `${base}-print.svg`)} title="Vector, real size in millimetres — opens in Illustrator, CorelDRAW, Inkscape and most RIP software" className={btn}><Download size={14} /> SVG vector</button>
        <button type="button" onClick={dlPiecesPdf} disabled={!!busy} title="One page per piece at real size with bleed" className={btn}><Download size={14} /> {busy === 'pdf' ? 'Making…' : 'PDF per piece'}</button>
        <button type="button" onClick={dlPng} disabled={!!busy} className={btn}><Download size={14} /> {busy === 'png' ? 'Making…' : `PNG ${dpi} DPI`}</button>
        <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))} aria-label="PNG and PDF resolution" className="h-9 rounded-full border border-mt-border bg-mt-bg px-2 text-[13px]">{[100, 150, 200, 300].map((d) => <option key={d} value={d}>{d} DPI</option>)}</select>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-mt-muted mr-1">Markup</span>
        <button type="button" onClick={() => dlSvg(markup, `${base}-markup.svg`)} className={btn}><Download size={14} /> Tech sheet SVG</button>
        <button type="button" onClick={dlMarkupPdf} disabled={!!busy} className={btn}><Download size={14} /> {busy === 'markup' ? 'Making…' : 'Tech sheet PDF'}</button>
        <button type="button" onClick={dlJson} className={btn}><FileJson size={14} /> Save job file</button>
      </div>
      <details className="mt-3 text-[12.5px] text-mt-muted">
        <summary className="cursor-pointer font-medium text-mt-ink">See the markup sheet</summary>
        <img src={svgDataUrl(markup)} alt="Markup sheet" className="mt-2 w-full rounded-xl border border-mt-border bg-white" />
      </details>
      {msg && <p role="status" className="mt-3 text-[13px] text-mt-muted">{msg}</p>}
      <p className="mt-3 text-[11.5px] text-mt-faint">Piece shapes are standard block patterns. Check them against your own patterns and your printer’s mirror setting before a full run.</p>
    </section>
  );
}
