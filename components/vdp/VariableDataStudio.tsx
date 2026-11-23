'use client';

// Variable Data Studio: one personalised design per spreadsheet row — badges,
// certificates, numbered tickets, cards. Text is drawn as outlines from the
// real font, so the PDF needs no font on the printer. On this device.

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, FileUp, Plus, Trash2 } from 'lucide-react';
import { fillTemplate, nUp, parseTable, unknownFields, type DataSet } from '@/lib/print/vdp';

interface Field { id: string; tpl: string; font: string; weight: number; size: number; color: string; align: 'left' | 'center' | 'right'; x: number; y: number; maxW: number }
const FONTS = ['Inter', 'Montserrat', 'Poppins', 'Roboto', 'Open Sans', 'Oswald', 'Bebas Neue', 'Playfair Display', 'Lora', 'Great Vibes', 'Dancing Script', 'Noto Sans'];
const SIZES = [{ n: 'Business card 85 × 55', w: 85, h: 55 }, { n: 'Name badge 90 × 60', w: 90, h: 60 }, { n: 'Ticket 210 × 74', w: 210, h: 74 }, { n: 'A6 card', w: 105, h: 148 }, { n: 'A5', w: 148, h: 210 }, { n: 'Certificate A4 landscape', w: 297, h: 210 }];
const SHEETS = [{ n: 'A4', w: 210, h: 297 }, { n: 'A3', w: 297, h: 420 }, { n: 'SRA3', w: 320, h: 450 }, { n: 'Letter', w: 215.9, h: 279.4 }];
const SAMPLE = 'Name,Role,Company\nArun Kumar,Head of Design,Magical Touch\nPriya Nair,Production Manager,Magical Touch\nRavi Shankar,Print Specialist,Magical Touch';
let nid = 1;

export function VariableDataStudio({ initialFile }: { initialFile?: File } = {}) {
  const [csv, setCsv] = useState(SAMPLE);
  const ds: DataSet = useMemo(() => parseTable(csv), [csv]);
  const [rec, setRec] = useState(0);
  const [size, setSize] = useState({ w: 90, h: 60 });
  const [bleed, setBleed] = useState(3);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [bg, setBg] = useState<{ kind: 'pdf' | 'image'; bytes: Uint8Array; url: string; mime?: string } | null>(null);
  const [fields, setFields] = useState<Field[]>([
    { id: 'f1', tpl: '{Name}', font: 'Montserrat', weight: 700, size: 16, color: '#111111', align: 'center', x: 45, y: 28, maxW: 80 },
    { id: 'f2', tpl: '{Role}', font: 'Inter', weight: 400, size: 9, color: '#3B82C4', align: 'center', x: 45, y: 36, maxW: 80 },
    { id: 'f3', tpl: 'No. {#0001}', font: 'Inter', weight: 600, size: 7, color: '#6B7280', align: 'center', x: 45, y: 52, maxW: 80 },
  ]);
  const [sel, setSel] = useState<string>('f1');
  const [layout, setLayout] = useState<'single' | 'nup'>('single');
  const [sheet, setSheet] = useState('SRA3');
  const [gap, setGap] = useState(4);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const csvRef = useRef<HTMLInputElement>(null), bgRef = useRef<HTMLInputElement>(null);
  const f = fields.find((x) => x.id === sel);
  const setF = (p: Partial<Field>) => setFields((v) => v.map((x) => (x.id === sel ? { ...x, ...p } : x)));

  // Live web fonts for the preview (the PDF uses exact outlines).
  useEffect(() => { import('@/lib/fontOutline').then((m) => fields.forEach((x) => m.registerPageFont(x.font, x.weight).catch(() => {}))); }, [fields]);

  // Opened from the design editor with the current page.
  const initRef = useRef(false);
  useEffect(() => { if (initialFile && !initRef.current) { initRef.current = true; void openBg(initialFile); } }); // eslint-disable-line react-hooks/exhaustive-deps
  const openBg = async (file: File | undefined | null) => {
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      const { renderPdfPages } = await import('@/lib/editor/pdfImport');
      const [r] = await renderPdfPages(file, [1], 2);
      const { PDFDocument } = await import('pdf-lib'); const d = await PDFDocument.load(bytes, { ignoreEncryption: true }); const b = d.getPage(0).getTrimBox();
      setSize({ w: Math.round((b.width * 25.4) / 72 * 10) / 10, h: Math.round((b.height * 25.4) / 72 * 10) / 10 });
      setBg({ kind: 'pdf', bytes, url: r.dataUrl });
    } else setBg({ kind: 'image', bytes, url: URL.createObjectURL(file), mime: file.type });
  };
  const drag = (id: string, e: React.PointerEvent) => {
    setSel(id);
    const svg = svgRef.current; if (!svg) return;
    const pt = (ev: PointerEvent | React.PointerEvent) => { const r = svg.getBoundingClientRect(); return { x: ((ev.clientX - r.left) / r.width) * (size.w + 2 * bleed) - bleed, y: ((ev.clientY - r.top) / r.height) * (size.h + 2 * bleed) - bleed }; };
    const start = pt(e), f0 = fields.find((x) => x.id === id)!;
    const move = (ev: PointerEvent) => { const p = pt(ev); setFields((v) => v.map((x) => (x.id === id ? { ...x, x: Math.round((f0.x + p.x - start.x) * 2) / 2, y: Math.round((f0.y + p.y - start.y) * 2) / 2 } : x))); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true });
  };
  const PT_MM = 25.4 / 72;
  const unknown = [...new Set(fields.flatMap((x) => unknownFields(x.tpl, ds)))];

  const exportPdf = async () => {
    if (!ds.rows.length) { setMsg('Add some rows first.'); return; }
    setMsg('Making the PDF…');
    try {
      const [{ PDFDocument, PDFName }, { loadFont, textShape }, { svgPathToPdf }, cm] = await Promise.all([import('pdf-lib'), import('@/lib/fontOutline'), import('@/lib/print/pathPdf'), import('@/lib/color/cmyk')]);
      const toK = cm.makeCmykMapper(await cm.loadCmykTable());
      const PT = 72 / 25.4, W = size.w + 2 * bleed, H = size.h + 2 * bleed;
      const doc = await PDFDocument.create(); doc.setProducer(''); doc.setCreator(''); doc.setTitle(`Variable data — ${ds.rows.length} records`);
      const fonts = new Map<string, any>();
      for (const x of fields) { const k = `${x.font}|${x.weight}`; if (!fonts.has(k)) fonts.set(k, await loadFont(x.font, x.weight)); }
      let bgForm: any = null, bgImg: any = null;
      if (bg?.kind === 'pdf') { const s = await PDFDocument.load(bg.bytes, { ignoreEncryption: true }); bgForm = await doc.embedPage(s.getPage(0)); }
      else if (bg?.kind === 'image') bgImg = /png/i.test(bg.mime || '') ? await doc.embedPng(bg.bytes) : await doc.embedJpg(bg.bytes);
      const sh = SHEETS.find((s) => s.n === sheet)!;
      const grid = layout === 'nup' ? nUp(sh.w, sh.h, size.w, size.h, gap, 8) : null;
      if (grid && grid.per === 0) { setMsg('The design does not fit on this sheet.'); return; }
      const hexK = (hex: string) => { const v = parseInt(hex.slice(1), 16); const [c, m, y, k] = toK((v >> 16) & 255, (v >> 8) & 255, v & 255); return `${c.toFixed(4)} ${m.toFixed(4)} ${y.toFixed(4)} ${k.toFixed(4)} k`; };
      const bgK = hexK(bgColor);
      // Draws record `r` with its trim box at (ox, oy) mm from the page's top-left.
      const drawRecord = (page: any, r: number, ox: number, oy: number, pageH: number, withBleed: boolean) => {
        const b = withBleed ? bleed : 0;
        const X = (x: number) => (ox + x) * PT, Y = (y: number) => (pageH - (oy + y)) * PT;
        let cs = `q ${bgK} ${X(-b).toFixed(3)} ${Y(size.h + b).toFixed(3)} ${((size.w + 2 * b) * PT).toFixed(3)} ${((size.h + 2 * b) * PT).toFixed(3)} re f Q\n`;
        let txt = '';
        for (const fl of fields) {
          const s = fillTemplate(fl.tpl, ds, r); if (!s.trim()) continue;
          const font = fonts.get(`${fl.font}|${fl.weight}`);
          let sizeMm = fl.size * PT_MM; let shp = textShape(font, s, sizeMm);
          if (fl.maxW > 0 && shp.width > fl.maxW) { sizeMm *= fl.maxW / shp.width; shp = textShape(font, s, sizeMm); }
          const x0 = fl.align === 'center' ? fl.x - shp.width / 2 : fl.align === 'right' ? fl.x - shp.width : fl.x;
          txt += svgPathToPdf(shp.d, (px, py) => [X(x0 + px), Y(fl.y + py)]) + `${hexK(fl.color)} f\n`;
        }
        return { cs, txt };
      };
      const addPage = (w: number, h: number) => doc.addPage([w * PT, h * PT]);
      const flush = (page: any, parts: string[], draws: (() => void)[]) => {
        draws.forEach((d) => d());
        const ref = doc.context.register(doc.context.flateStream(new TextEncoder().encode('q\n' + parts.join('') + 'Q\n')));
        const c = page.node.get(PDFName.of('Contents'));
        if (c) { const arr = doc.context.obj([]) as any; if (c.asArray) c.asArray().forEach((x: any) => arr.push(x)); else arr.push(c); arr.push(ref); page.node.set(PDFName.of('Contents'), arr); }
        else page.node.set(PDFName.of('Contents'), ref);
      };
      if (!grid) {
        for (let r = 0; r < ds.rows.length; r++) {
          const page = addPage(W, H);
          page.setTrimBox(bleed * PT, bleed * PT, size.w * PT, size.h * PT); page.setBleedBox(0, 0, W * PT, H * PT);
          const { cs, txt } = drawRecord(page, r, bleed, bleed, H, true);
          // background colour first, then the background art, then the text on top
          flush(page, [cs], []);
          if (bgForm) page.drawPage(bgForm, { x: 0, y: 0, width: W * PT, height: H * PT });
          if (bgImg) page.drawImage(bgImg, { x: 0, y: 0, width: W * PT, height: H * PT });
          flush(page, [txt], []);
        }
      } else {
        for (let start = 0; start < ds.rows.length; start += grid.per) {
          const page = addPage(sh.w, sh.h);
          const bgs: string[] = [], txts: string[] = [], marks: string[] = [];
          const cells: [number, number][] = [];
          for (let k = 0; k < grid.per && start + k < ds.rows.length; k++) {
            const cx = grid.x0 + (k % grid.cols) * (size.w + gap), cy = grid.y0 + Math.floor(k / grid.cols) * (size.h + gap);
            const { cs, txt } = drawRecord(page, start + k, cx, cy, sh.h, gap >= 2 * bleed);
            bgs.push(cs); txts.push(txt); cells.push([cx, cy]);
            // crop marks outside each design
            const X = (x: number) => (x * PT).toFixed(3), Y = (y: number) => ((sh.h - y) * PT).toFixed(3), L = Math.min(4, gap / 2 + 3), o = Math.min(1.5, gap / 2);
            for (const [mx, my, dx, dy] of [[cx, cy, -1, -1], [cx + size.w, cy, 1, -1], [cx, cy + size.h, -1, 1], [cx + size.w, cy + size.h, 1, 1]] as const) marks.push(`${X(mx + dx * o)} ${Y(my)} m ${X(mx + dx * L)} ${Y(my)} l ${X(mx)} ${Y(my + dy * o)} m ${X(mx)} ${Y(my + dy * L)} l S\n`);
          }
          flush(page, bgs, []);
          for (const [cx, cy] of cells) {
            const b = gap >= 2 * bleed ? bleed : 0;
            if (bgForm) page.drawPage(bgForm, { x: (cx - b) * PT, y: (sh.h - cy - size.h - b) * PT, width: (size.w + 2 * b) * PT, height: (size.h + 2 * b) * PT });
            if (bgImg) page.drawImage(bgImg, { x: (cx - b) * PT, y: (sh.h - cy - size.h - b) * PT, width: (size.w + 2 * b) * PT, height: (size.h + 2 * b) * PT });
          }
          flush(page, [...txts, `0 0 0 1 K 0.25 w\n${marks.join('')}`], []);
        }
      }
      const bytes = await doc.save({ useObjectStreams: false });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })); a.download = `variable-data_${ds.rows.length}-records${grid ? `_${grid.per}up-${sheet}` : ''}.pdf`; document.body.appendChild(a); a.click(); a.remove();
      setMsg('');
    } catch (e) { console.error(e); setMsg('The PDF could not be made — check that the fonts could load (needs an internet connection the first time).'); }
  };

  const field = 'h-8 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px]';
  const W = size.w + 2 * bleed, H = size.h + 2 * bleed;
  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3 self-start rounded-2xl border border-mt-border bg-mt-surface p-4" aria-label="Data">
        <div className="flex items-center justify-between"><p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Data · {ds.rows.length} rows</p><button type="button" onClick={() => csvRef.current?.click()} className="inline-flex h-7 items-center gap-1 rounded-full border border-mt-border px-2.5 text-[11.5px]"><FileUp size={12} /> CSV</button></div>
        <input ref={csvRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" aria-label="CSV file" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) setCsv(await fl.text()); e.target.value = ''; }} />
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={7} spellCheck={false} aria-label="Spreadsheet data" className="w-full rounded-lg border border-mt-border bg-mt-bg p-2 font-mono text-[11.5px]" placeholder="Paste from Excel or Google Sheets (first row = column names)" />
        <p className="text-[11px] text-mt-faint">Paste from Excel / Google Sheets or open a CSV. Columns: {ds.headers.map((h) => `{${h}}`).join(' ')} · serial numbers: {'{#0001}'}</p>
        {unknown.length > 0 && <p className="text-[11.5px] text-amber-600">No column called: {unknown.join(', ')}</p>}
        <div className="max-h-[200px] overflow-auto rounded-lg border border-mt-border">
          <table className="w-full text-[11.5px]"><thead className="sticky top-0 bg-mt-surface2"><tr>{ds.headers.map((h) => <th key={h} className="px-2 py-1 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody>{ds.rows.slice(0, 200).map((r, i) => <tr key={i} onClick={() => setRec(i)} className={`cursor-pointer ${i === rec ? 'bg-[#3B82C4]/10' : 'hover:bg-mt-surface2'}`}>{r.map((c, j) => <td key={j} className="truncate px-2 py-1">{c}</td>)}</tr>)}</tbody></table>
        </div>
      </aside>

      <section aria-label="Design preview" className="min-w-0 rounded-2xl border border-mt-border bg-mt-surface p-4">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <span className="font-semibold">Record {rec + 1} of {ds.rows.length}</span>
          <button type="button" onClick={() => setRec((r) => Math.max(0, r - 1))} className="h-7 w-7 rounded-full border border-mt-border">‹</button>
          <button type="button" onClick={() => setRec((r) => Math.min(ds.rows.length - 1, r + 1))} className="h-7 w-7 rounded-full border border-mt-border">›</button>
          <span className="ml-auto text-mt-muted">{size.w} × {size.h} mm · bleed {bleed} mm · drag text to move</span>
        </div>
        <div className="mt-3 grid place-items-center rounded-xl bg-[radial-gradient(circle,rgba(9,9,11,0.07)_1px,transparent_1px)] [background-size:18px_18px] p-6">
          <svg ref={svgRef} viewBox={`${-bleed} ${-bleed} ${W} ${H}`} className="w-full max-w-[640px] shadow-lg touch-none" role="img" aria-label="Design preview">
            <rect x={-bleed} y={-bleed} width={W} height={H} fill={bgColor} />
            {bg && <image href={bg.url} x={-bleed} y={-bleed} width={W} height={H} preserveAspectRatio="none" />}
            <rect x={0} y={0} width={size.w} height={size.h} fill="none" stroke="#EC008C" strokeWidth={0.25} strokeDasharray="1.5 1" />
            {fields.map((x) => { const s = fillTemplate(x.tpl, ds, rec); return (
              <text key={x.id} x={x.x} y={x.y} fontFamily={x.font} fontWeight={x.weight} fontSize={x.size * PT_MM} fill={x.color} textAnchor={x.align === 'center' ? 'middle' : x.align === 'right' ? 'end' : 'start'}
                textLength={undefined} onPointerDown={(e) => drag(x.id, e)} style={{ cursor: 'move', outline: 'none' }} className={x.id === sel ? 'drop-shadow-[0_0_0.6px_#3B82C4]' : ''}>{s}</text>
            ); })}
          </svg>
        </div>
      </section>

      <aside className="space-y-3 self-start lg:col-span-2 xl:col-span-1" aria-label="Design and output">
        <div className="space-y-2 rounded-2xl border border-mt-border bg-mt-surface p-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Design</p>
          <select value={`${size.w}x${size.h}`} onChange={(e) => { const s = SIZES.find((z) => `${z.w}x${z.h}` === e.target.value); if (s) setSize({ w: s.w, h: s.h }); }} className={field} aria-label="Design size"><option value={`${size.w}x${size.h}`}>{size.w} × {size.h} mm</option>{SIZES.map((s) => <option key={s.n} value={`${s.w}x${s.h}`}>{s.n}</option>)}</select>
          <div className="grid grid-cols-3 gap-1.5">
            <label className="text-[11px] text-mt-muted">W mm<input type="number" value={size.w} onChange={(e) => setSize({ ...size, w: Math.max(10, Number(e.target.value) || 10) })} className={field} /></label>
            <label className="text-[11px] text-mt-muted">H mm<input type="number" value={size.h} onChange={(e) => setSize({ ...size, h: Math.max(10, Number(e.target.value) || 10) })} className={field} /></label>
            <label className="text-[11px] text-mt-muted">Bleed<input type="number" value={bleed} min={0} max={10} step={0.5} onChange={(e) => setBleed(Math.max(0, Number(e.target.value) || 0))} className={field} /></label>
          </div>
          <div className="flex items-center gap-2 text-[12px]"><label className="flex items-center gap-1.5 text-mt-muted">Background <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-8 w-9 rounded border border-mt-border" /></label>
            <button type="button" onClick={() => bgRef.current?.click()} className="h-8 rounded-full border border-mt-border px-2.5 text-[11.5px]">{bg ? 'Change artwork' : 'Artwork (PDF / image)'}</button>{bg && <button type="button" onClick={() => setBg(null)} className="text-[11.5px] text-mt-muted underline">Remove</button>}</div>
          <input ref={bgRef} type="file" accept="application/pdf,.pdf,image/png,image/jpeg" className="sr-only" aria-label="Background artwork" onChange={(e) => { openBg(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div className="space-y-2 rounded-2xl border border-mt-border bg-mt-surface p-4">
          <div className="flex items-center justify-between"><p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Text fields</p><button type="button" onClick={() => { const id = `n${nid++}`; setFields((v) => [...v, { id, tpl: `{${ds.headers[0] || 'Name'}}`, font: 'Inter', weight: 400, size: 10, color: '#111111', align: 'center', x: size.w / 2, y: size.h / 2, maxW: size.w - 10 }]); setSel(id); }} className="inline-flex h-7 items-center gap-1 rounded-full border border-mt-border px-2.5 text-[11.5px]"><Plus size={12} /> Add</button></div>
          <div className="flex flex-wrap gap-1">{fields.map((x) => <button key={x.id} type="button" onClick={() => setSel(x.id)} className={`h-7 max-w-[140px] truncate rounded-full border px-2.5 text-[11.5px] ${x.id === sel ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{x.tpl}</button>)}</div>
          {f && <div className="space-y-1.5">
            <input value={f.tpl} onChange={(e) => setF({ tpl: e.target.value })} aria-label="Field text" className={field} />
            <div className="grid grid-cols-[1fr_70px] gap-1.5">
              <select value={f.font} onChange={(e) => setF({ font: e.target.value })} aria-label="Font" className={field}>{FONTS.map((x) => <option key={x}>{x}</option>)}</select>
              <select value={f.weight} onChange={(e) => setF({ weight: Number(e.target.value) })} aria-label="Weight" className={field}>{[300, 400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}</select>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <label className="text-[11px] text-mt-muted">Size pt<input type="number" value={f.size} min={4} max={200} onChange={(e) => setF({ size: Math.max(4, Number(e.target.value) || 4) })} className={field} /></label>
              <label className="text-[11px] text-mt-muted">X mm<input type="number" step={0.5} value={f.x} onChange={(e) => setF({ x: Number(e.target.value) || 0 })} className={field} /></label>
              <label className="text-[11px] text-mt-muted">Y mm<input type="number" step={0.5} value={f.y} onChange={(e) => setF({ y: Number(e.target.value) || 0 })} className={field} /></label>
              <label className="text-[11px] text-mt-muted">Max W<input type="number" value={f.maxW} min={0} onChange={(e) => setF({ maxW: Math.max(0, Number(e.target.value) || 0) })} className={field} title="Long text shrinks to fit this width (0 = off)" /></label>
            </div>
            <div className="flex items-center gap-1.5">
              <input type="color" value={f.color} onChange={(e) => setF({ color: e.target.value })} aria-label="Text colour" className="h-8 w-9 rounded border border-mt-border" />
              {(['left', 'center', 'right'] as const).map((a) => <button key={a} type="button" aria-pressed={f.align === a} onClick={() => setF({ align: a })} className={`h-8 flex-1 rounded-lg border text-[11.5px] capitalize ${f.align === a ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{a}</button>)}
              <button type="button" aria-label="Delete field" onClick={() => { setFields((v) => v.filter((x) => x.id !== sel)); setSel(fields.find((x) => x.id !== sel)?.id || ''); }} className="h-8 w-8 rounded-lg border border-mt-border inline-grid place-items-center hover:text-red-600"><Trash2 size={13} /></button>
            </div>
          </div>}
        </div>
        <div className="space-y-2 rounded-2xl border border-mt-border bg-mt-surface p-4">
          <div role="radiogroup" aria-label="Output layout" className="grid grid-cols-2 gap-1.5">{([['single', 'One per page'], ['nup', 'Many per sheet']] as const).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={layout === v} onClick={() => setLayout(v)} className={`h-8 rounded-lg border text-[12px] font-semibold ${layout === v ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{l}</button>)}</div>
          {layout === 'nup' && (() => { const sh = SHEETS.find((s) => s.n === sheet)!; const g = nUp(sh.w, sh.h, size.w, size.h, gap, 8); return <div className="grid grid-cols-2 gap-1.5"><select value={sheet} onChange={(e) => setSheet(e.target.value)} className={field} aria-label="Sheet">{SHEETS.map((s) => <option key={s.n}>{s.n}</option>)}</select><label className="text-[11px] text-mt-muted">Gap mm<input type="number" min={0} value={gap} onChange={(e) => setGap(Math.max(0, Number(e.target.value) || 0))} className={field} /></label><p className="col-span-2 text-[11.5px] text-mt-muted">{g.per} per sheet ({g.cols} × {g.rows}) · {Math.ceil(ds.rows.length / Math.max(1, g.per))} sheets{gap < 2 * bleed ? ' · gap smaller than 2× bleed: designs are cut flush (no bleed)' : ''}</p></div>; })()}
          <button type="button" onClick={exportPdf} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-mt-primary text-[13px] font-semibold text-mt-onprimary"><FileDown size={15} /> PDF · {ds.rows.length} records</button>
          <p className="text-[11px] text-mt-faint">Text becomes outlines from the real font (prints the same everywhere); colours are converted to CMYK (FOGRA39). One page per record has TrimBox and BleedBox set.</p>
          {msg && <p role="status" className="text-[12px] text-mt-muted">{msg}</p>}
        </div>
      </aside>
    </div>
  );
}
