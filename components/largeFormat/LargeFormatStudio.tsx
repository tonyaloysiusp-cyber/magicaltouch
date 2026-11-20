'use client';

// Large Format Studio: print a poster or banner on smaller sheets or a roll.
// PDFs stay vector (each tile embeds the original page, cropped); pictures
// are placed at full resolution. Overlap, trim marks, labels and an assembly map.

import { useMemo, useRef, useState } from 'react';
import { FileDown, FileUp } from 'lucide-react';
import { PAPERS, planTiles, tiledPdf, type TileOptions } from '@/lib/print/tiling';

const POSTERS = [{ n: 'A0', w: 841, h: 1189 }, { n: 'A1', w: 594, h: 841 }, { n: 'A2', w: 420, h: 594 }, { n: '24 × 36 in', w: 609.6, h: 914.4 }, { n: '1 × 2 m banner', w: 1000, h: 2000 }];

export function LargeFormatStudio() {
  const [src, setSrc] = useState<{ name: string; pdf?: Uint8Array; image?: Uint8Array; mime?: string; preview: string; w: number; h: number; pages?: number } | null>(null);
  const [page, setPage] = useState(1);
  const [posterW, setPosterW] = useState(594);
  const [lockRatio, setLockRatio] = useState(true);
  const [paper, setPaper] = useState('a4');
  const [margin, setMargin] = useState(5);
  const [overlap, setOverlap] = useState(10);
  const [orient, setOrient] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [marks, setMarks] = useState(true);
  const [map, setMap] = useState(true);
  const [posterHManual, setPosterHManual] = useState(841);
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const ratio = src ? src.h / src.w : 841 / 594;
  const posterH = lockRatio ? Math.round(posterW * ratio * 10) / 10 : posterHManual;
  const pp = PAPERS.find((p) => p.id === paper)!;
  const opts: TileOptions = { posterW, posterH, sheetW: pp.w, sheetH: pp.h, margin, overlap, landscape: orient === 'auto' ? 'auto' : orient === 'landscape' };
  const plan = useMemo(() => planTiles(opts), [posterW, posterH, pp.w, pp.h, margin, overlap, orient]); // eslint-disable-line react-hooks/exhaustive-deps
  const dpi = src && !src.pdf ? Math.round(src.w / (posterW / 25.4)) : null;

  const open = async (f: File | undefined | null) => {
    if (!f) return;
    setMsg('Opening…');
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
        const { renderPdfPages, getPdfPageCount } = await import('@/lib/editor/pdfImport');
        const pages = await getPdfPageCount(f);
        const [r] = await renderPdfPages(f, [1], 0.6);
        setSrc({ name: f.name.replace(/\.pdf$/i, ''), pdf: bytes, preview: r.dataUrl, w: r.width, h: r.height, pages }); setPage(1);
        const { PDFDocument } = await import('pdf-lib'); const d = await PDFDocument.load(bytes, { ignoreEncryption: true }); const b = d.getPage(0).getTrimBox(); setPosterW(Math.round((b.width * 25.4) / 72));
      } else {
        const bmp = await createImageBitmap(f);
        const c = document.createElement('canvas'); const k = Math.min(1, 900 / Math.max(bmp.width, bmp.height)); c.width = bmp.width * k; c.height = bmp.height * k; c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
        let img = bytes, mime = f.type;
        if (!/png|jpe?g/i.test(f.type)) { const c2 = document.createElement('canvas'); c2.width = bmp.width; c2.height = bmp.height; c2.getContext('2d')!.drawImage(bmp, 0, 0); img = new Uint8Array(await (await new Promise<Blob>((r) => c2.toBlob((b) => r(b!), 'image/png'))).arrayBuffer()); mime = 'image/png'; }
        setSrc({ name: f.name.replace(/\.[^.]+$/, ''), image: img, mime, preview: c.toDataURL('image/jpeg', 0.85), w: bmp.width, h: bmp.height });
      }
      setMsg('');
    } catch (e) { console.error(e); setMsg('This file could not be opened.'); }
  };
  const make = async () => {
    if (!src) return;
    setMsg('Making the tiles…');
    try {
      const { bytes } = await tiledPdf({ pdf: src.pdf, page: page - 1, image: src.image, mime: src.mime }, opts, { marks, map, name: src.name });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })); a.download = `${src.name}_TILED_${plan.cols}x${plan.rows}_${pp.name.replace(/[^\w]+/g, '')}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      setMsg('');
    } catch (e) { console.error(e); setMsg('The tiles could not be made.'); }
  };
  const field = 'h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2.5 text-[13px]';
  const scale = 100 / Math.max(posterW, posterH);
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3 self-start rounded-2xl border border-mt-border bg-mt-surface p-4" aria-label="Tiling settings">
        <button type="button" onClick={() => input.current?.click()} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-mt-primary text-[13px] font-semibold text-mt-onprimary"><FileUp size={16} /> {src ? 'Choose another file' : 'Open a PDF or picture'}</button>
        <input ref={input} type="file" accept="application/pdf,.pdf,image/png,image/jpeg,image/webp" className="sr-only" aria-label="Poster file" onChange={(e) => { open(e.target.files?.[0]); e.target.value = ''; }} />
        {src?.pages && src.pages > 1 && <label className="block text-[12px] text-mt-muted">Page<input type="number" min={1} max={src.pages} value={page} onChange={(e) => setPage(Math.max(1, Math.min(src.pages!, Number(e.target.value) || 1)))} className={`${field} mt-1`} /></label>}
        <div>
          <p className="text-[12px] text-mt-muted">Poster size</p>
          <div className="mt-1 flex flex-wrap gap-1">{POSTERS.map((p) => <button key={p.n} type="button" onClick={() => { setPosterW(p.w); if (!lockRatio) setPosterHManual(p.h); }} className={`h-7 rounded-full border px-2.5 text-[11.5px] ${posterW === p.w ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{p.n}</button>)}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block text-[11.5px] text-mt-muted">Width (mm)<input type="number" min={50} value={posterW} onChange={(e) => setPosterW(Math.max(50, Number(e.target.value) || 50))} className={`${field} mt-1`} aria-label="Poster width" /></label>
            <label className="block text-[11.5px] text-mt-muted">Height (mm)<input type="number" min={50} value={posterH} disabled={lockRatio} onChange={(e) => setPosterHManual(Math.max(50, Number(e.target.value) || 50))} className={`${field} mt-1 disabled:opacity-60`} aria-label="Poster height" /></label>
          </div>
          <label className="mt-1.5 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Keep the artwork's proportions</label>
          {dpi !== null && <p className={`mt-1 text-[11px] ${dpi < 100 ? 'text-amber-600' : 'text-mt-faint'}`}>Picture is {dpi} ppi at this size{dpi < 100 ? ' — fine from a distance, soft up close' : ''}.</p>}
        </div>
        <label className="block text-[12px] text-mt-muted">Printer paper<select value={paper} onChange={(e) => setPaper(e.target.value)} className={`${field} mt-1`}>{PAPERS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.w} × {p.h} mm)</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[11.5px] text-mt-muted">No-print edge (mm)<input type="number" min={0} max={30} step={0.5} value={margin} onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))} className={`${field} mt-1`} /></label>
          <label className="block text-[11.5px] text-mt-muted">Overlap (mm)<input type="number" min={0} max={50} value={overlap} onChange={(e) => setOverlap(Math.max(0, Number(e.target.value) || 0))} className={`${field} mt-1`} /></label>
        </div>
        <div role="radiogroup" aria-label="Paper orientation" className="inline-flex rounded-full border border-mt-border p-0.5 text-[12px]">{(['auto', 'portrait', 'landscape'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={orient === v} onClick={() => setOrient(v)} className={`h-7 rounded-full px-3 font-semibold capitalize ${orient === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v === 'auto' ? 'Fewest sheets' : v}</button>)}</div>
        <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Trim marks, overlap guides and labels</label>
        <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={map} onChange={(e) => setMap(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Add an assembly map page</label>
        {msg && <p role="status" className="text-[12px] text-mt-muted">{msg}</p>}
      </aside>
      <section aria-label="Tiling preview" className="rounded-2xl border border-mt-border bg-mt-surface p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
          <span><b>{plan.sheets}</b> sheets · {plan.cols} × {plan.rows}</span>
          <span className="text-mt-muted">{pp.name} {plan.sheetW > plan.sheetH ? 'landscape' : 'portrait'} · printable {Math.round(plan.areaW)} × {Math.round(plan.areaH)} mm</span>
          <span className="text-mt-muted">Poster {posterW} × {posterH} mm</span>
        </div>
        <div className="mt-3 grid place-items-center rounded-xl bg-[radial-gradient(circle,rgba(9,9,11,0.07)_1px,transparent_1px)] [background-size:18px_18px] p-6">
          <div className="relative w-full max-w-[560px]" style={{ aspectRatio: `${posterW} / ${posterH}` }}>
            {src ? <img src={src.preview} alt="" className="absolute inset-0 h-full w-full object-fill shadow-lg" /> : <div className="absolute inset-0 grid place-items-center bg-mt-surface2 text-[13px] text-mt-muted">Open a file to place it here</div>}
            <svg viewBox={`0 0 ${posterW * scale} ${posterH * scale}`} className="absolute inset-0 h-full w-full" aria-hidden>
              {plan.tiles.map((t) => <g key={t.label}><rect x={t.x * scale} y={t.y * scale} width={t.w * scale} height={t.h * scale} fill="rgba(59,130,196,0.06)" stroke="#3B82C4" strokeWidth={0.35} /><text x={t.x * scale + 1.2} y={t.y * scale + 3.6} fontSize={Math.min(3.5, t.w * scale * 0.25)} fontFamily="Arial" fontWeight={700} fill="#1E3A8A">{t.label}</text></g>)}
            </svg>
          </div>
        </div>
        <button type="button" disabled={!src} onClick={make} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-mt-primary px-4 text-[13px] font-semibold text-mt-onprimary disabled:opacity-50"><FileDown size={15} /> Download tiled PDF</button>
        <p className="mt-2 text-[11.5px] text-mt-faint">Print every page at 100 % (“Actual size”). Trim on the marks, then overlap each tile with its neighbour by {overlap} mm using the dashed guides. PDFs stay vector — text and shapes are as sharp as the original.</p>
      </section>
    </div>
  );
}
