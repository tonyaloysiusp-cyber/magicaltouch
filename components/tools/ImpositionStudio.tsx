'use client';

// Imposition studio — a professional print-layout workspace in the browser.
// Open one or more PDFs; the file is analysed (boxes, bleed, fonts, images,
// colour spaces, rotation, mixed sizes, blank pages, marks). Every command
// works on the document, has its own settings and a live preview, and can be
// undone, redone, repeated or saved into an automation sequence. Export as a
// print-ready vector PDF, an editable PDF with layers, front or back sides
// only, or flattened. Nothing is uploaded.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FilePlus2, FileUp, Info, Loader2, Play, Redo2, RotateCw, Save, Trash2, Undo2, Wand2, ZoomIn, ZoomOut } from 'lucide-react';
import { COMMAND_LABEL, clipLocal, docFromSources, groupBounds, mul, parseRange, run, runAll, selIndices, tr, type Anchor, type Command, type Doc, type Item, type MarkOpts, type Sel, type Sheet, type Source } from '@/lib/impose/model';
import type { PdfReport, Variant } from '@/lib/impose/pdf';
import type { Thumb } from '@/lib/impose/raster';
import { PAPER_SIZES } from '@/lib/printSizes';

interface Src { name: string; bytes: Uint8Array; report: PdfReport; thumbs: Thumb[] }
type Tool = Command['type'] | 'info' | 'sample' | 'sequences';
const SEQ_KEY = 'mt:impose-sequences', PARAM_KEY = 'mt:impose-params', LAST_KEY = 'mt:impose-last';

const GROUPS: { label: string; tools: Tool[] }[] = [
  { label: 'Imposition', tools: ['booklet', 'nUp', 'stepRepeat', 'joinPages', 'tile', 'newSheet', 'placePage'] },
  { label: 'Pages', tools: ['reverse', 'shuffleEvenOdd', 'shuffleForImposing', 'insertBlank', 'insertPages', 'deletePages', 'duplicatePages', 'movePages', 'rotatePages'] },
  { label: 'Size & bleed', tools: ['defineBleeds', 'adjustSize', 'trimShift', 'creep', 'setTrimBox'] },
  { label: 'Stick on & peel off', tools: ['stickText', 'stickPdf', 'maskTape', 'peelOff'] },
  { label: 'Automation & info', tools: ['sequences', 'info', 'sample'] },
];
const TOOL_LABEL: Record<string, string> = { ...COMMAND_LABEL, info: 'Info or modify', sample: 'Create sample document', sequences: 'Automation sequences' };
const HELP: Partial<Record<Tool, string>> = {
  booklet: 'Saddle-stitch: pages paired so the folded, stacked sheets read in order. Blank pages are added to make a multiple of 4. Creep shifts inner pages toward the spine.',
  nUp: 'Consecutive pages placed many-up on a press sheet, with bleed, gaps, crop and registration marks. Duplex lines the backs up for long- or short-edge flipping.',
  stepRepeat: 'Each page repeated to fill its own sheet — business cards, labels, stickers. Page 2 can be the back.',
  joinPages: 'Pages 1+2, 3+4… joined into one sheet (spreads, or a front and back stacked).',
  tile: 'Large pages split into printable tiles with an overlap for posters and banners.',
  newSheet: 'Manual imposition: add an empty sheet, then place pages on it and drag them where you want.',
  placePage: 'Manual imposition: put any page of an open PDF on a sheet at an exact position. Drag placed pages in the preview, or nudge them with the arrows.',
  shuffleForImposing: 'Cut & stack: reorders pages so that after n-up printing and cutting, the stacks are already in order.',
  shuffleEvenOdd: 'Separate or merge odd and even pages — e.g. merge fronts and backs scanned separately.',
  defineBleeds: 'How much bleed each page keeps on every side. Only artwork that exists in the PDF beyond the trim can be shown.',
  adjustSize: 'Change the page size, fitting, filling or stretching the content, anchored where you choose.',
  trimShift: 'Move the artwork on its page (mirrored on even pages for binding) and cut edges off.',
  creep: 'Saddle-stitch creep: inner pages shifted toward the spine, up to the amount set for the innermost sheet.',
  setTrimBox: 'Set the trim box (finished size) of pages when the PDF has none or a wrong one.',
  stickText: 'Page numbers, job names or dates on pages. Use {n} for a running number, {N} for the total, {page} for the page position, {date}.',
  stickPdf: 'Place a page from another PDF (a logo, stamp or slug) on every selected page, as a vector.',
  maskTape: 'Cover part of a page with a white (or coloured) rectangle — hide old marks, prices or codes.',
  peelOff: 'Remove stick-ons, masking tape or printer marks again.',
};

const DEFAULTS: Record<string, any> = {
  booklet: { sheet: 'spread', creepMm: 0, crop: true, fold: true },
  nUp: { sheet: 'sra3', landscape: false, w: 320, h: 450, cols: 2, rows: 2, gap: 0, margin: 10, order: 'rows', duplex: 'none', bleed: 3, crop: true, registration: false, info: true, fit: 'none' },
  stepRepeat: { sheet: 'sra3', landscape: false, w: 320, h: 450, cols: 3, rows: 7, gap: 0, bleed: 3, crop: true, registration: false, info: true, duplex: 'none' },
  joinPages: { layout: 'side', gap: 0 },
  tile: { tileW: 297, tileH: 420, overlap: 10, crop: true },
  newSheet: { sheet: 'sra3', landscape: false, w: 320, h: 450 },
  placePage: { src: 0, page: 1, x: 10, y: 10, deg: 0, scale: 1, bleed: 3 },
  shuffleEvenOdd: { mode: 'odds-then-evens' },
  shuffleForImposing: { perSheet: 4 },
  insertBlank: { at: 1, count: 1 },
  insertPages: { src: 0, range: '1', at: 1 },
  duplicatePages: { times: 1 },
  movePages: { to: 1 },
  rotatePages: { deg: 90 },
  defineBleeds: { t: 3, r: 3, b: 3, l: 3 },
  adjustSize: { sheet: 'a4', landscape: false, w: 210, h: 297, fit: 'fit', anchor: 'c' },
  trimShift: { dx: 0, dy: 0, mirrorEven: true, t: 0, r: 0, b: 0, l: 0 },
  creep: { totalMm: 0.5 },
  setTrimBox: { x: 0, y: 0, w: 210, h: 297 },
  stickText: { text: '{n}', anchor: 'b', dx: 0, dy: 8, size: 9, color: '#000000', start: 1 },
  stickPdf: { src: 0, page: 1, anchor: 'br', dx: -5, dy: 5, scale: 0.2 },
  maskTape: { x: 0, y: 0, w: 30, h: 15, color: '#FFFFFF' },
  peelOff: { what: 'stuck' },
  sample: { pages: 8, w: 148, h: 210, bleed: 3 },
};
const SEL_TOOLS = new Set<Tool>(['deletePages', 'duplicatePages', 'movePages', 'rotatePages', 'defineBleeds', 'adjustSize', 'trimShift', 'stickText', 'stickPdf', 'maskTape', 'peelOff', 'setTrimBox']);
const SHEET_CHOICES = PAPER_SIZES.filter((p) => ['A sizes', 'B sizes', 'SRA press sheets', 'US sizes'].includes(p.group));
const sheetDims = (p: any) => { const z = SHEET_CHOICES.find((x) => x.id === p.sheet); const w = z ? z.w : p.w, h = z ? z.h : p.h; return p.landscape ? { w: h, h: w } : { w, h }; };
const marksOf = (p: any): MarkOpts => ({ crop: !!p.crop, registration: !!p.registration, fold: !!p.fold, info: !!p.info });

function save(bytes: Uint8Array | Blob, name: string, type = 'application/pdf') {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const r1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (b: { w: number; h: number } | null | undefined) => (b ? `${r1(b.w)} × ${r1(b.h)}` : '—');

function toCommand(t: Tool, p: any, sel: Sel, docLen: number): Command | null {
  switch (t) {
    case 'booklet': { const z = p.sheet === 'spread' ? 'spread' : sheetDims({ sheet: p.sheet, landscape: true }); return { type: 'booklet', sheet: z as any, marks: marksOf(p), creepMm: Number(p.creepMm) || 0 }; }
    case 'nUp': { const d = sheetDims(p); return { type: 'nUp', sheetW: d.w, sheetH: d.h, cols: p.cols, rows: p.rows, gap: p.gap, margin: p.margin, order: p.order, duplex: p.duplex, bleed: p.bleed, marks: marksOf(p), fit: p.fit }; }
    case 'stepRepeat': { const d = sheetDims(p); return { type: 'stepRepeat', sheetW: d.w, sheetH: d.h, cols: p.cols, rows: p.rows, gap: p.gap, bleed: p.bleed, marks: marksOf(p), duplex: p.duplex }; }
    case 'joinPages': return { type: 'joinPages', layout: p.layout, gap: p.gap };
    case 'tile': return { type: 'tile', tileW: p.tileW, tileH: p.tileH, overlap: p.overlap, marks: { crop: !!p.crop } };
    case 'newSheet': { const d = sheetDims(p); return { type: 'newSheet', at: docLen, w: d.w, h: d.h }; }
    case 'reverse': return { type: 'reverse' };
    case 'shuffleEvenOdd': return { type: 'shuffleEvenOdd', mode: p.mode };
    case 'shuffleForImposing': return { type: 'shuffleForImposing', perSheet: p.perSheet };
    case 'insertBlank': return { type: 'insertBlank', at: Math.max(0, p.at - 1), count: p.count };
    case 'insertPages': return null; // needs source page count — built in the component
    case 'deletePages': return { type: 'deletePages', sel };
    case 'duplicatePages': return { type: 'duplicatePages', sel, times: p.times };
    case 'movePages': return { type: 'movePages', sel: selIndices(sel, docLen), to: Math.max(0, p.to - 1) };
    case 'rotatePages': return { type: 'rotatePages', sel, deg: Number(p.deg) as 90 | 180 | 270 };
    case 'defineBleeds': return { type: 'defineBleeds', sel, bleed: { t: p.t, r: p.r, b: p.b, l: p.l } };
    case 'adjustSize': { const d = sheetDims(p); return { type: 'adjustSize', sel, w: d.w, h: d.h, fit: p.fit, anchor: p.anchor }; }
    case 'trimShift': return { type: 'trimShift', sel, dx: p.dx, dy: p.dy, mirrorEven: !!p.mirrorEven, cut: { t: p.t, r: p.r, b: p.b, l: p.l } };
    case 'creep': return { type: 'creep', totalMm: p.totalMm };
    case 'setTrimBox': return { type: 'setTrimBox', sel, trim: { x: p.x, y: p.y, w: p.w, h: p.h } };
    case 'stickText': return { type: 'stickText', sel, text: p.text, anchor: p.anchor, dx: p.dx, dy: p.dy, size: p.size, color: p.color, start: p.start };
    case 'stickPdf': return { type: 'stickPdf', sel, src: Number(p.src), page: Math.max(0, p.page - 1), anchor: p.anchor, dx: p.dx, dy: p.dy, scale: p.scale };
    case 'maskTape': return { type: 'maskTape', sel, box: { x: p.x, y: p.y, w: p.w, h: p.h }, color: p.color };
    case 'peelOff': return { type: 'peelOff', sel, what: p.what };
    default: return null;
  }
}

// ------------------------------------------------------------------ preview
function sheetSvg(s: Sheet, thumbs: Thumb[][], o: { sel?: string | null; drag?: { grp: string; dx: number; dy: number } | null; showBoxes: boolean }): string {
  const pad = 12;
  const H = s.h;
  let k = 0;
  const parts: string[] = [];
  const mat = (it: Item) => { const m = o.drag && it.grp === o.drag.grp ? mul(tr(o.drag.dx, o.drag.dy), it.m) : it.m; return `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`; };
  for (const it of s.items) {
    const g = `data-grp="${it.grp}"`;
    if (it.k === 'page') {
      const q = clipLocal(it); const t = thumbs[it.src]?.[it.page]; const id = `c${k++}`;
      const img = t ? `<image href="${t.url}" x="0" y="0" width="${t.view.w}" height="${t.view.h}" preserveAspectRatio="none" transform="matrix(1 0 0 -1 ${t.view.x - it.srcTrim.x} ${t.view.y - it.srcTrim.y + t.view.h})"/>` : `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#E2E8F0"/>`;
      const box = o.showBoxes ? `<rect x="0" y="0" width="${it.srcTrim.w}" height="${it.srcTrim.h}" fill="none" stroke="#2563EB" stroke-width="0.3" stroke-dasharray="1.5 1" vector-effect="non-scaling-stroke"/>` : '';
      const selBox = o.sel === it.grp ? `<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="#3B82C4" fill-opacity="0.12" stroke="#3B82C4" stroke-width="0.8"/>` : '';
      parts.push(`<g ${g} transform="${mat(it)}" style="cursor:move"><clipPath id="${id}"><rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}"/></clipPath><g clip-path="url(#${id})">${img}</g>${box}${selBox}</g>`);
    } else if (it.k === 'text') {
      const anchor = it.align === 'l' ? 'start' : it.align === 'r' ? 'end' : 'middle';
      parts.push(`<g ${g} transform="${mat(it)}"><text transform="matrix(1 0 0 -1 0 0)" font-family="Helvetica, Arial, sans-serif" font-size="${it.size * 0.3528}" fill="${it.color}" text-anchor="${anchor}">${it.text.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</text></g>`);
    } else if (it.k === 'rect') {
      parts.push(`<g ${g} transform="${mat(it)}"><rect width="${it.w}" height="${it.h}" fill="${it.color}" ${it.tag === 'tape' ? 'stroke="#F59E0B" stroke-width="0.4" stroke-dasharray="1.5 1"' : ''}/></g>`);
    } else if (it.k === 'line') {
      parts.push(`<line ${g} x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" transform="${mat(it)}" stroke="${it.color}" stroke-width="${Math.max(0.2, it.width * 0.3528)}"/>`);
    }
  }
  const b = s.bleed;
  const bleedRect = o.showBoxes && (b.t || b.r || b.b || b.l) ? `<rect x="${-b.l}" y="${-b.b}" width="${s.w + b.l + b.r}" height="${s.h + b.t + b.b}" fill="none" stroke="#EF4444" stroke-width="0.3" stroke-dasharray="1.5 1"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${s.w + 2 * pad} ${s.h + 2 * pad}" style="width:100%;height:auto;display:block"><rect x="0" y="0" width="${s.w}" height="${s.h}" fill="#fff" stroke="#94A3B8" stroke-width="0.3"/><g transform="matrix(1 0 0 -1 0 ${H})">${parts.join('')}${bleedRect}</g></svg>`;
}

export function ImpositionStudio() {
  const [sources, setSources] = useState<Src[]>([]);
  const [doc, setDoc] = useState<Doc>({ sheets: [] });
  const [past, setPast] = useState<{ doc: Doc; steps: Command[] }[]>([]);
  const [future, setFuture] = useState<{ doc: Doc; steps: Command[] }[]>([]);
  const [steps, setSteps] = useState<Command[]>([]);
  const [tool, setTool] = useState<Tool>('nUp');
  const [params, setParams] = useState<Record<string, any>>(DEFAULTS);
  const [selStr, setSelStr] = useState('all');
  const [cur, setCur] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showBoxes, setShowBoxes] = useState(true);
  const [selGrp, setSelGrp] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ grp: string; dx: number; dy: number; sx: number; sy: number; k: number } | null>(null);
  const [preview, setPreview] = useState(true);
  const [last, setLast] = useState<Command | null>(null);
  const [seqs, setSeqs] = useState<{ name: string; cmds: Command[] }[]>([]);
  const [seqName, setSeqName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const svgBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const p = JSON.parse(localStorage.getItem(PARAM_KEY) || 'null'); if (p) setParams((x) => ({ ...x, ...p })); } catch { /* none */ }
    try { setSeqs(JSON.parse(localStorage.getItem(SEQ_KEY) || '[]')); } catch { /* none */ }
    try { setLast(JSON.parse(localStorage.getItem(LAST_KEY) || 'null')); } catch { /* none */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(PARAM_KEY, JSON.stringify(params)); } catch { /* full */ } }, [params]);
  const srcInfos: Source[] = useMemo(() => sources.map((s) => s.report.source), [sources]);
  const P = params[tool] || {};
  const setP = (o: any) => setParams((x) => ({ ...x, [tool]: { ...(x[tool] || {}), ...o } }));
  const sel: Sel = selStr === 'all' || selStr === 'odd' || selStr === 'even' ? selStr : parseRange(selStr, doc.sheets.length);

  const buildCmd = (): Command | null => {
    if (tool === 'insertPages') { const s = sources[Number(P.src)]; if (!s) return null; return { type: 'insertPages', at: Math.max(0, (P.at || 1) - 1), src: Number(P.src), pages: parseRange(P.range || '1', s.report.pageCount) }; }
    if (tool === 'placePage') return { type: 'placePage', sheet: cur, src: Number(P.src), page: Math.max(0, P.page - 1), x: P.x, y: P.y, deg: Number(P.deg) as 0, scale: P.scale, bleed: P.bleed };
    return toCommand(tool, P, sel, doc.sheets.length);
  };
  // Live preview of the command being set up (not yet applied).
  const draft = useMemo(() => {
    if (!preview || !doc.sheets.length || tool === 'placePage' || tool === 'newSheet') return null;
    const c = buildCmd(); if (!c) return null;
    try { return run(doc, c, srcInfos); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, doc, tool, params, selStr, srcInfos, cur]);
  const shown = draft || doc;
  const sheet = shown.sheets[Math.min(cur, shown.sheets.length - 1)];

  const commit = (next: Doc, add: Command[]) => { setPast((p) => [...p.slice(-80), { doc, steps }]); setFuture([]); setDoc(next); setSteps([...steps, ...add]); setCur((c) => Math.min(c, Math.max(0, next.sheets.length - 1))); };
  const apply = (c?: Command | null) => {
    const cmd = c ?? buildCmd(); if (!cmd || !doc.sheets.length) return;
    try {
      const next = run(doc, cmd, srcInfos);
      commit(next, [cmd]);
      setLast(cmd); try { localStorage.setItem(LAST_KEY, JSON.stringify(cmd)); } catch { /* full */ }
      setMsg(`${COMMAND_LABEL[cmd.type]} — done. ${next.sheets.length} sheet${next.sheets.length === 1 ? '' : 's'}.`); setErr(null);
    } catch (e: any) { setErr(e?.message || 'That command could not be applied.'); }
  };
  const undo = () => { const p = past[past.length - 1]; if (!p) return; setFuture((f) => [...f, { doc, steps }]); setDoc(p.doc); setSteps(p.steps); setPast((x) => x.slice(0, -1)); setSelGrp(null); };
  const redo = () => { const f = future[future.length - 1]; if (!f) return; setPast((x) => [...x, { doc, steps }]); setDoc(f.doc); setSteps(f.steps); setFuture((x) => x.slice(0, -1)); setSelGrp(null); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if (selGrp && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault(); const d = e.shiftKey ? 10 : 1;
        apply({ type: 'moveGroup', sheet: cur, grp: selGrp, dx: e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy: e.key === 'ArrowDown' ? -d : e.key === 'ArrowUp' ? d : 0 });
      }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  });

  const loadFile = async (f: File, add: boolean) => {
    setErr(null); setMsg(null); setBusy('open');
    try {
      if (!(/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name))) throw new Error('Choose a PDF file.');
      const bytes = new Uint8Array(await f.arrayBuffer());
      const { analyzePdf } = await import('@/lib/impose/pdf');
      const report = await analyzePdf(bytes, f.name);
      const { pdfThumbs } = await import('@/lib/impose/raster');
      const thumbs = await pdfThumbs(bytes).catch(() => [] as Thumb[]);
      const s: Src = { name: f.name, bytes, report, thumbs };
      if (add && sources.length) { setSources((x) => [...x, s]); setMsg(`${f.name} added — use it with Insert pages, Stick on PDF pages or Place page.`); }
      else {
        setSources([s]); const d = docFromSources([report.source]); setDoc(d); setPast([]); setFuture([]); setSteps([]); setCur(0); setSelGrp(null);
        setTool('info');
        setMsg(`${report.pageCount} page${report.pageCount === 1 ? '' : 's'} analysed.`);
      }
    } catch (e: any) { setErr(/encrypt/i.test(e?.message || '') ? 'This PDF is password-protected.' : e?.message || 'This PDF could not be read.'); }
    setBusy(null);
  };
  const makeSample = async () => {
    setBusy('sample');
    try {
      const { samplePdf } = await import('@/lib/impose/pdf');
      const p = params.sample;
      const bytes = await samplePdf({ pages: Math.max(1, Math.min(200, p.pages)), w: p.w, h: p.h, bleed: p.bleed });
      await loadFile(new File([bytes as BlobPart], `sample-${p.pages}pp-${p.w}x${p.h}.pdf`, { type: 'application/pdf' }), false);
    } catch (e: any) { setErr(e?.message || 'Could not make the sample.'); }
    setBusy(null);
  };
  const exportPdf = async (v: Variant | 'flat') => {
    if (!doc.sheets.length) return;
    setBusy(v); setErr(null);
    try {
      const { buildPdf } = await import('@/lib/impose/pdf');
      const base = (sources[0]?.name || 'layout').replace(/\.pdf$/i, '');
      const out = await buildPdf(doc, sources.map((s) => s.bytes), { variant: v === 'flat' ? 'print' : v, title: `${base} — imposed` });
      if (v === 'flat') {
        const { flattenPdf } = await import('@/lib/impose/raster');
        save(await flattenPdf(out.bytes, Number(params.flatDpi?.dpi || 300), (i, n) => setMsg(`Flattening sheet ${i} of ${n}…`)), `${base}-imposed-flattened.pdf`);
        setMsg('Flattened PDF saved — every sheet is now one picture; text can no longer be edited.');
      } else {
        save(out.bytes, `${base}-imposed${v === 'print' ? '' : `-${v}`}.pdf`);
        setMsg(v === 'editable' ? (out.layers ? 'Editable PDF saved — artwork, stick-ons, masking tape and printer marks are on separate layers.' : 'Saved, but layers could not be added in this browser.') : 'Print-ready PDF saved — pages stay vectors, fonts untouched. Print at 100 %.');
      }
    } catch (e: any) { setErr(e?.message || 'The PDF could not be made.'); }
    setBusy(null);
  };
  const saveSeq = () => { if (!steps.length) return; const name = seqName.trim() || `Sequence ${seqs.length + 1}`; const next = [...seqs.filter((s) => s.name !== name), { name, cmds: steps }]; setSeqs(next); try { localStorage.setItem(SEQ_KEY, JSON.stringify(next)); } catch { /* full */ } setSeqName(''); setMsg(`Saved “${name}” (${steps.length} steps).`); };
  const runSeq = (cmds: Command[]) => { try { const next = runAll(doc, cmds, srcInfos); commit(next, cmds); setMsg(`Played ${cmds.length} step${cmds.length === 1 ? '' : 's'}.`); } catch (e: any) { setErr(e?.message || 'The sequence could not run on this document.'); } };
  const delSeq = (name: string) => { const next = seqs.filter((s) => s.name !== name); setSeqs(next); try { localStorage.setItem(SEQ_KEY, JSON.stringify(next)); } catch { /* full */ } };

  // Manual placement: drag a placed page in the preview.
  const onDown = (e: React.PointerEvent) => {
    const g = (e.target as Element).closest('[data-grp]') as Element | null;
    if (!g) { setSelGrp(null); return; }
    if (draft) { setMsg('This is a preview of the command — apply it, or switch off “Preview”, to move pages by hand.'); return; }
    const grp = g.getAttribute('data-grp')!; setSelGrp(grp);
    const svg = svgBox.current?.querySelector('svg'); if (!svg || !sheet) return;
    const k = (sheet.w + 24) / svg.getBoundingClientRect().width; // mm per screen pixel
    setDrag({ grp, dx: 0, dy: 0, sx: e.clientX, sy: e.clientY, k });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => { if (!drag) return; setDrag({ ...drag, dx: (e.clientX - drag.sx) * drag.k, dy: -(e.clientY - drag.sy) * drag.k }); };
  const onUp = () => { if (!drag) return; const d = drag; setDrag(null); if (Math.abs(d.dx) + Math.abs(d.dy) > 0.2) apply({ type: 'moveGroup', sheet: cur, grp: d.grp, dx: Math.round(d.dx * 10) / 10, dy: Math.round(d.dy * 10) / 10 }); };

  const svg = useMemo(() => (sheet ? sheetSvg(sheet, sources.map((s) => s.thumbs), { sel: selGrp, drag: drag ? { grp: drag.grp, dx: drag.dx, dy: drag.dy } : null, showBoxes }) : ''), [sheet, sources, selGrp, drag, showBoxes]);
  const selBounds = useMemo(() => (sheet && selGrp ? (() => { const its = sheet.items.filter((i) => i.grp === selGrp); return its.length ? groupBounds(its) : null; })() : null), [sheet, selGrp]);

  // ---------- UI helpers
  const field = 'mt-1 h-9 w-full rounded-xl border border-mt-border bg-mt-bg px-2.5 text-[13px]';
  const num = (label: string, k: string, o: { min?: number; max?: number; step?: number } = {}) => <label className="block text-[11.5px] text-mt-muted">{label}<input type="number" aria-label={label} min={o.min} max={o.max} step={o.step ?? 'any'} value={P[k] ?? ''} onChange={(e) => setP({ [k]: e.target.value === '' ? 0 : Number(e.target.value) })} className={field} /></label>;
  const selF = (label: string, k: string, opts: [string, string][]) => <label className="block text-[11.5px] text-mt-muted">{label}<select aria-label={label} value={String(P[k] ?? '')} onChange={(e) => setP({ [k]: isNaN(Number(e.target.value)) || e.target.value === '' ? e.target.value : Number(e.target.value) })} className={field}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
  const check = (label: string, k: string) => <label className="flex items-center gap-2 text-[12.5px]"><input type="checkbox" checked={!!P[k]} onChange={(e) => setP({ [k]: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> {label}</label>;
  const sheetPick = (allowSpread = false) => <>
    <label className="block text-[11.5px] text-mt-muted">Sheet<select aria-label="Sheet" value={P.sheet} onChange={(e) => setP({ sheet: e.target.value })} className={field}>{allowSpread && <option value="spread">Exact spread (two pages wide)</option>}{SHEET_CHOICES.map((z) => <option key={z.id} value={z.id}>{z.label} · {z.w} × {z.h}</option>)}<option value="custom">Custom</option></select></label>
    {P.sheet === 'custom' && <div className="grid grid-cols-2 gap-2">{num('Width (mm)', 'w', { min: 10 })}{num('Height (mm)', 'h', { min: 10 })}</div>}
    {P.sheet !== 'spread' && tool !== 'booklet' && check('Landscape', 'landscape')}
  </>;
  const anchors: [Anchor, string][] = [['tl', 'Top left'], ['t', 'Top centre'], ['tr', 'Top right'], ['l', 'Left'], ['c', 'Centre'], ['r', 'Right'], ['bl', 'Bottom left'], ['b', 'Bottom centre'], ['br', 'Bottom right']];
  const marksF = (fold = false) => <div className="flex flex-wrap gap-x-4 gap-y-1">{check('Crop marks', 'crop')}{fold ? check('Fold marks', 'fold') : check('Registration marks', 'registration')}{check('Sheet info', 'info')}</div>;
  const edgesF = (title: string) => <><p className="text-[11.5px] text-mt-muted">{title}</p><div className="grid grid-cols-4 gap-1.5">{num('Top', 't', { min: 0 })}{num('Right', 'r', { min: 0 })}{num('Bottom', 'b', { min: 0 })}{num('Left', 'l', { min: 0 })}</div></>;
  const srcOpts = sources.map((s, i) => [String(i), s.name] as [string, string]);
  const fitAuto = () => {
    const first = doc.sheets[0]; if (!first) return;
    const d = sheetDims(P); const b = P.bleed || 0, g = P.gap || 0, m = P.margin ?? 0;
    const cols = Math.max(1, Math.floor((d.w - 2 * m + g) / (first.w + 2 * b + g))), rows = Math.max(1, Math.floor((d.h - 2 * m + g) / (first.h + 2 * b + g)));
    setP({ cols, rows });
  };

  const form = () => {
    switch (tool) {
      case 'booklet': return <>{sheetPick(true)}{num('Creep for the innermost sheet (mm)', 'creepMm', { min: 0, step: 0.05 })}{marksF(true)}</>;
      case 'nUp': return <>{sheetPick()}<div className="grid grid-cols-3 gap-2">{num('Across', 'cols', { min: 1 })}{num('Down', 'rows', { min: 1 })}<button type="button" onClick={fitAuto} className="mt-5 h-9 rounded-xl border border-mt-border text-[12px] font-semibold">Most that fit</button></div>
        <div className="flex flex-wrap gap-1.5">{[2, 4, 6, 8, 9, 16].map((n) => { const c = n === 2 ? [2, 1] : n === 4 ? [2, 2] : n === 6 ? [2, 3] : n === 8 ? [2, 4] : n === 9 ? [3, 3] : [4, 4]; return <button key={n} type="button" onClick={() => setP({ cols: c[0], rows: c[1] })} className={`h-8 px-3 rounded-full border text-[12px] font-semibold ${P.cols * P.rows === n ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{n}-up</button>; })}</div>
        <div className="grid grid-cols-3 gap-2">{num('Bleed (mm)', 'bleed', { min: 0 })}{num('Gap (mm)', 'gap', { min: 0 })}{num('Margin (mm)', 'margin', { min: 0 })}</div>
        <div className="grid grid-cols-3 gap-2">{selF('Order', 'order', [['rows', 'Across rows'], ['columns', 'Down columns']])}{selF('Duplex', 'duplex', [['none', 'One-sided'], ['long', 'Flip long edge'], ['short', 'Flip short edge']])}{selF('Scale', 'fit', [['none', '100 %'], ['fit', 'Fit cell']])}</div>{marksF()}</>;
      case 'stepRepeat': return <>{sheetPick()}<div className="grid grid-cols-3 gap-2">{num('Across', 'cols', { min: 1 })}{num('Down', 'rows', { min: 1 })}<button type="button" onClick={fitAuto} className="mt-5 h-9 rounded-xl border border-mt-border text-[12px] font-semibold">Most that fit</button></div><div className="grid grid-cols-3 gap-2">{num('Bleed (mm)', 'bleed', { min: 0 })}{num('Gap (mm)', 'gap', { min: 0 })}{selF('Duplex', 'duplex', [['none', 'One-sided'], ['long', 'Back: flip long edge'], ['short', 'Back: flip short edge']])}</div>{marksF()}</>;
      case 'joinPages': return <div className="grid grid-cols-2 gap-2">{selF('Layout', 'layout', [['side', 'Side by side'], ['stack', 'One above the other']])}{num('Gap (mm)', 'gap', { min: 0 })}</div>;
      case 'tile': return <><div className="grid grid-cols-3 gap-2">{num('Tile width (mm)', 'tileW', { min: 20 })}{num('Tile height (mm)', 'tileH', { min: 20 })}{num('Overlap (mm)', 'overlap', { min: 0 })}</div>{check('Crop marks', 'crop')}</>;
      case 'newSheet': return <>{sheetPick()}<p className="text-[12px] text-mt-muted">Added after the last sheet. Then use Place page.</p></>;
      case 'placePage': return <><div className="grid grid-cols-2 gap-2">{selF('From PDF', 'src', srcOpts)}{num('Page', 'page', { min: 1 })}{num('X from left (mm)', 'x')}{num('Y from bottom (mm)', 'y')}{selF('Rotate', 'deg', [['0', '0°'], ['90', '90°'], ['180', '180°'], ['270', '270°']])}{num('Scale', 'scale', { min: 0.05, step: 0.05 })}{num('Bleed (mm)', 'bleed', { min: 0 })}</div><p className="text-[12px] text-mt-muted">Placed on sheet {cur + 1}. Drag pages in the preview or select one and use the arrow keys (Shift = 10 mm).</p></>;
      case 'reverse': return <p className="text-[12.5px] text-mt-muted">Last page first.</p>;
      case 'shuffleEvenOdd': return selF('How', 'mode', [['odds-then-evens', 'Odd pages, then even pages'], ['evens-then-odds', 'Even pages, then odd pages'], ['interleave-halves', 'Merge first half with second half'], ['reverse-evens', 'Reverse the even pages']]);
      case 'shuffleForImposing': return num('Pages per sheet (n-up)', 'perSheet', { min: 1 });
      case 'insertBlank': return <div className="grid grid-cols-2 gap-2">{num('Before page', 'at', { min: 1 })}{num('How many', 'count', { min: 1 })}</div>;
      case 'insertPages': return sources.length ? <div className="grid grid-cols-2 gap-2">{selF('From PDF', 'src', srcOpts)}<label className="block text-[11.5px] text-mt-muted">Pages<input value={P.range || ''} onChange={(e) => setP({ range: e.target.value })} aria-label="Pages to insert" className={field} placeholder="1-4, 7" /></label>{num('Before page', 'at', { min: 1 })}</div> : <p className="text-[12.5px] text-mt-muted">Add a PDF first.</p>;
      case 'deletePages': return <p className="text-[12.5px] text-mt-muted">Deletes the selected pages.</p>;
      case 'duplicatePages': return num('Extra copies', 'times', { min: 1 });
      case 'movePages': return num('Move before page', 'to', { min: 1 });
      case 'rotatePages': return selF('Turn', 'deg', [['90', '90° clockwise'], ['180', '180°'], ['270', '90° anticlockwise']]);
      case 'defineBleeds': return edgesF('Bleed (mm)');
      case 'adjustSize': return <>{sheetPick()}<div className="grid grid-cols-2 gap-2">{selF('Content', 'fit', [['fit', 'Fit (keep proportions)'], ['fill', 'Fill (crop)'], ['stretch', 'Stretch'], ['none', 'Keep size']])}{selF('Anchor', 'anchor', anchors)}</div></>;
      case 'trimShift': return <><div className="grid grid-cols-2 gap-2">{num('Shift right (mm)', 'dx')}{num('Shift up (mm)', 'dy')}</div>{check('Mirror the shift on even pages (binding)', 'mirrorEven')}{edgesF('Cut off (mm)')}</>;
      case 'creep': return num('Innermost sheet shift (mm)', 'totalMm', { min: 0, step: 0.05 });
      case 'setTrimBox': return <><div className="grid grid-cols-2 gap-2">{num('X (mm)', 'x')}{num('Y (mm)', 'y')}{num('Width (mm)', 'w', { min: 1 })}{num('Height (mm)', 'h', { min: 1 })}</div><p className="text-[12px] text-mt-muted">Measured from the page’s current bottom-left corner.</p></>;
      case 'stickText': return <><label className="block text-[11.5px] text-mt-muted">Text<input value={P.text || ''} onChange={(e) => setP({ text: e.target.value })} aria-label="Text to stick on" className={field} /></label><div className="grid grid-cols-2 gap-2">{selF('Position', 'anchor', anchors)}{num('Start number', 'start')}{num('Offset right (mm)', 'dx')}{num('Offset up (mm)', 'dy')}{num('Size (pt)', 'size', { min: 3 })}<label className="block text-[11.5px] text-mt-muted">Colour<input type="color" value={P.color || '#000000'} onChange={(e) => setP({ color: e.target.value })} aria-label="Text colour" className="mt-1 h-9 w-full rounded-xl border border-mt-border" /></label></div></>;
      case 'stickPdf': return sources.length ? <div className="grid grid-cols-2 gap-2">{selF('From PDF', 'src', srcOpts)}{num('Page', 'page', { min: 1 })}{selF('Position', 'anchor', anchors)}{num('Scale', 'scale', { min: 0.01, step: 0.05 })}{num('Offset right (mm)', 'dx')}{num('Offset up (mm)', 'dy')}</div> : <p className="text-[12.5px] text-mt-muted">Add a PDF first.</p>;
      case 'maskTape': return <div className="grid grid-cols-2 gap-2">{num('X (mm)', 'x')}{num('Y from bottom (mm)', 'y')}{num('Width (mm)', 'w', { min: 0.5 })}{num('Height (mm)', 'h', { min: 0.5 })}<label className="block text-[11.5px] text-mt-muted">Colour<input type="color" value={P.color || '#FFFFFF'} onChange={(e) => setP({ color: e.target.value })} aria-label="Tape colour" className="mt-1 h-9 w-full rounded-xl border border-mt-border" /></label></div>;
      case 'peelOff': return selF('Remove', 'what', [['stuck', 'Stick-ons (text and PDF)'], ['tape', 'Masking tape'], ['marks', 'Printer marks'], ['all', 'All of these']]);
      default: return null;
    }
  };

  const isCmd = !['info', 'sample', 'sequences'].includes(tool);
  const chipCls = (on: boolean) => `w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] ${on ? 'bg-mt-ink text-mt-bg font-semibold' : 'hover:bg-mt-surface2'}`;
  const iconBtn = 'h-9 w-9 inline-flex items-center justify-center rounded-full border border-mt-border hover:bg-mt-surface2 disabled:opacity-40';

  return (
    <div className="space-y-3">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-mt-border bg-mt-surface p-2">
        <button type="button" onClick={() => fileRef.current?.click()} className="h-9 px-3.5 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5">{busy === 'open' ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />} Open PDF</button>
        <button type="button" onClick={() => addRef.current?.click()} disabled={!sources.length} className="h-9 px-3 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"><FilePlus2 size={14} /> Add PDF</button>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) loadFile(f, false); }} />
        <input ref={addRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) loadFile(f, true); }} />
        <span className="mx-1 h-6 w-px bg-mt-border" />
        <button type="button" onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo (Ctrl+Z)" className={iconBtn}><Undo2 size={15} /></button>
        <button type="button" onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={iconBtn}><Redo2 size={15} /></button>
        <button type="button" onClick={() => last && apply(last)} disabled={!last || !doc.sheets.length} title={last ? `Repeat: ${COMMAND_LABEL[last.type]}` : 'Nothing to repeat yet'} className="h-9 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"><RotateCw size={14} /> Repeat last{last ? `: ${COMMAND_LABEL[last.type]}` : ''}</button>
        <span className="ml-auto text-[12px] text-mt-muted truncate max-w-[30%]">{sources.length ? `${sources.map((s) => s.name).join(', ')} · ${doc.sheets.length} sheet${doc.sheets.length === 1 ? '' : 's'}` : 'No PDF open'}</span>
        <details className="relative">
          <summary className="list-none h-9 px-3.5 rounded-full bg-mt-ink text-mt-bg text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer">{busy && busy !== 'open' && busy !== 'sample' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export</summary>
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-mt-border bg-mt-surface p-2 shadow-xl">
            {([['print', 'Print-ready PDF · vector', 'Pages placed as vectors with marks. Text, fonts and vectors are untouched.'], ['editable', 'Editable PDF · layers', 'Same, with artwork, stick-ons, masking tape and printer marks on separate layers.'], ['front', 'Front sides only', 'Front sheets (or odd sheets) — for printers that print each side separately.'], ['back', 'Back sides only', 'Back sheets (or even sheets).'], ['flat', 'Flattened PDF · pictures', 'Every sheet becomes one image. Text is no longer editable — only if your printer asks for it.']] as const).map(([v, l, d]) => (
              <button key={v} type="button" disabled={!doc.sheets.length || !!busy} onClick={() => exportPdf(v)} className="w-full rounded-xl p-2.5 text-left hover:bg-mt-surface2 disabled:opacity-50"><p className="text-[13px] font-semibold">{l}</p><p className="text-[11.5px] text-mt-muted">{d}</p></button>
            ))}
            <label className="mt-1 flex items-center justify-between px-2.5 text-[11.5px] text-mt-muted">Flattened resolution<select value={params.flatDpi?.dpi || 300} onChange={(e) => setParams((x) => ({ ...x, flatDpi: { dpi: Number(e.target.value) } }))} className="h-8 rounded-lg border border-mt-border bg-mt-bg px-2"><option value={150}>150 dpi</option><option value={200}>200 dpi</option><option value={300}>300 dpi</option></select></label>
          </div>
        </details>
      </div>
      {err && <p role="alert" className="text-[13px] font-medium text-rose-600">{err}</p>}
      {msg && <p role="status" className="text-[13px]">{msg}</p>}

      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_320px] lg:items-start">
        {/* Commands */}
        <nav aria-label="Imposition commands" className="rounded-2xl border border-mt-border bg-mt-surface p-2 lg:max-h-[78vh] lg:overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-2">
              <p className="px-2.5 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-mt-faint">{g.label}</p>
              {g.tools.map((t) => <button key={t} type="button" aria-pressed={tool === t} onClick={() => { setTool(t); setErr(null); }} className={chipCls(tool === t)}>{TOOL_LABEL[t]}</button>)}
            </div>
          ))}
        </nav>

        {/* Preview */}
        <div className="min-w-0 rounded-2xl border border-mt-border bg-mt-surface2/50 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur <= 0} aria-label="Previous sheet" className={iconBtn}><ChevronLeft size={15} /></button>
            <span className="text-[12.5px] font-semibold tabular-nums">{shown.sheets.length ? `${Math.min(cur, shown.sheets.length - 1) + 1} / ${shown.sheets.length}` : '—'}</span>
            <button type="button" onClick={() => setCur((c) => Math.min(shown.sheets.length - 1, c + 1))} disabled={cur >= shown.sheets.length - 1} aria-label="Next sheet" className={iconBtn}><ChevronRight size={15} /></button>
            {shown.sheets.some((s) => s.side) && <span className="inline-flex rounded-full border border-mt-border p-0.5">{(['front', 'back'] as const).map((sd) => <button key={sd} type="button" onClick={() => { const i = shown.sheets.findIndex((s, k) => s.side === sd && (k >= cur - 1)); if (i >= 0) setCur(i); }} aria-pressed={sheet?.side === sd} className={`h-7 px-2.5 rounded-full text-[12px] font-semibold capitalize ${sheet?.side === sd ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{sd}</button>)}</span>}
            <span className="text-[12px] text-mt-muted truncate">{sheet ? `${sheet.label || ''} · ${r1(sheet.w)} × ${r1(sheet.h)} mm` : ''}</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Zoom out" className={iconBtn}><ZoomOut size={15} /></button>
              <button type="button" onClick={() => setZoom(1)} className="h-9 px-2 text-[12px] font-semibold tabular-nums">{Math.round(zoom * 100)}%</button>
              <button type="button" onClick={() => setZoom((z) => Math.min(6, z + 0.25))} aria-label="Zoom in" className={iconBtn}><ZoomIn size={15} /></button>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-2 text-[12px]">
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={showBoxes} onChange={(e) => setShowBoxes(e.target.checked)} className="h-3.5 w-3.5 accent-[#3B82C4]" /> Trim (blue) &amp; bleed (red)</label>
            {isCmd && <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} className="h-3.5 w-3.5 accent-[#3B82C4]" /> Preview the command before applying</label>}
            {draft && preview && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Preview — not applied yet</span>}
          </div>
          <div className="overflow-auto rounded-xl bg-[#E5E7EB] dark:bg-[#1F2430] p-3 max-h-[70vh]" style={{ touchAction: drag ? 'none' : 'auto' }}>
            {sheet ? <div ref={svgBox} role="img" aria-label={`Sheet ${cur + 1}: ${sheet.label || ''}`} style={{ width: `${zoom * 100}%`, margin: '0 auto' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} dangerouslySetInnerHTML={{ __html: svg }} />
              : <div className="py-24 text-center text-[14px] text-mt-muted"><p>Open a PDF to start — or make a sample document.</p><button type="button" onClick={() => { setTool('sample'); }} className="mt-3 h-9 px-4 rounded-full border border-mt-border text-[13px] font-semibold">Create sample document</button></div>}
          </div>
          {selGrp && selBounds && <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-mt-muted">Selected: {r1(selBounds.w)} × {r1(selBounds.h)} mm at {r1(selBounds.x)}, {r1(selBounds.y)}</span>
            {([['←', -1, 0], ['→', 1, 0], ['↑', 0, 1], ['↓', 0, -1]] as const).map(([l, dx, dy]) => <button key={l} type="button" onClick={() => apply({ type: 'moveGroup', sheet: cur, grp: selGrp, dx, dy })} className="h-7 w-7 rounded-full border border-mt-border">{l}</button>)}
            <button type="button" onClick={() => apply({ type: 'moveGroup', sheet: cur, grp: selGrp, dx: 0, dy: 0, deg: 90 })} className="h-7 px-2.5 rounded-full border border-mt-border">Rotate 90°</button>
            <button type="button" onClick={() => setSelGrp(null)} className="h-7 px-2.5 rounded-full border border-mt-border">Deselect</button>
          </div>}
        </div>

        {/* Settings / info */}
        <aside className="rounded-2xl border border-mt-border bg-mt-surface p-4 space-y-3 lg:max-h-[78vh] lg:overflow-y-auto" aria-label="Command settings">
          <h3 className="text-[15px] font-semibold">{TOOL_LABEL[tool]}</h3>
          {HELP[tool] && <p className="text-[12px] text-mt-muted">{HELP[tool]}</p>}
          {isCmd && <>
            {SEL_TOOLS.has(tool) && <label className="block text-[11.5px] text-mt-muted">Pages<div className="mt-1 flex gap-1">{(['all', 'odd', 'even'] as const).map((v) => <button key={v} type="button" aria-pressed={selStr === v} onClick={() => setSelStr(v)} className={`h-8 px-2.5 rounded-lg border text-[12px] font-semibold capitalize ${selStr === v ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{v}</button>)}<input value={['all', 'odd', 'even'].includes(selStr) ? '' : selStr} onChange={(e) => setSelStr(e.target.value || 'all')} placeholder="e.g. 1-3, 6" aria-label="Page range" className="h-8 min-w-0 flex-1 rounded-lg border border-mt-border bg-mt-bg px-2 text-[12px]" /></div></label>}
            {form()}
            <button type="button" onClick={() => apply()} disabled={!doc.sheets.length} className="h-10 w-full rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"><Wand2 size={15} /> Apply</button>
          </>}
          {tool === 'sample' && (() => { const p = params.sample; const setS = (o: any) => setParams((x) => ({ ...x, sample: { ...x.sample, ...o } })); return <>
            <p className="text-[12px] text-mt-muted">Numbered, coloured pages with bleed and a safe-area line — to test a layout before using the real file.</p>
            <div className="grid grid-cols-2 gap-2">{([['pages', 'Pages'], ['w', 'Width (mm)'], ['h', 'Height (mm)'], ['bleed', 'Bleed (mm)']] as const).map(([k, l]) => <label key={k} className="block text-[11.5px] text-mt-muted">{l}<input type="number" aria-label={`Sample ${l}`} value={p[k]} onChange={(e) => setS({ [k]: Number(e.target.value) || 0 })} className={field} /></label>)}</div>
            <button type="button" onClick={makeSample} disabled={!!busy} className="h-10 w-full rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5">{busy === 'sample' ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />} Create and open</button>
          </>; })()}
          {tool === 'sequences' && <>
            <p className="text-[12px] text-mt-muted">The commands you applied since opening the file, in order. Save them as a sequence and play it back on any PDF.</p>
            <ol className="list-decimal pl-5 text-[12.5px] space-y-0.5" aria-label="Steps applied">{steps.length ? steps.map((s, i) => <li key={i}>{COMMAND_LABEL[s.type]}</li>) : <li className="list-none -ml-5 text-mt-muted">No steps yet.</li>}</ol>
            <div className="flex gap-2"><input value={seqName} onChange={(e) => setSeqName(e.target.value)} placeholder="Sequence name" aria-label="Sequence name" className="h-9 min-w-0 flex-1 rounded-xl border border-mt-border bg-mt-bg px-2.5 text-[13px]" /><button type="button" onClick={saveSeq} disabled={!steps.length} className="h-9 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1 disabled:opacity-40"><Save size={13} /> Save</button></div>
            <ul className="space-y-1.5">{seqs.map((s) => <li key={s.name} className="flex items-center gap-2 rounded-xl border border-mt-border p-2"><span className="flex-1 min-w-0 truncate text-[13px]">{s.name} <span className="text-mt-faint">· {s.cmds.length} steps</span></span><button type="button" onClick={() => runSeq(s.cmds)} disabled={!doc.sheets.length} aria-label={`Play ${s.name}`} className="h-8 w-8 rounded-full border border-mt-border inline-flex items-center justify-center disabled:opacity-40"><Play size={13} /></button><button type="button" onClick={() => delSeq(s.name)} aria-label={`Delete ${s.name}`} className="h-8 w-8 rounded-full border border-mt-border inline-flex items-center justify-center"><Trash2 size={13} /></button></li>)}</ul>
          </>}
          {tool === 'info' && <>
            {!sources.length && <p className="text-[12.5px] text-mt-muted">Open a PDF to see its analysis.</p>}
            {sources.map((s, si) => { const r = s.report; return (
              <section key={si} className="space-y-2" aria-label={`Analysis of ${s.name}`}>
                <p className="text-[13px] font-semibold inline-flex items-center gap-1.5"><Info size={14} /> {s.name}</p>
                <p className="text-[12px] text-mt-muted">{r.pageCount} pages{r.producer ? ` · made with ${r.producer}` : ''}{r.title ? ` · “${r.title}”` : ''}</p>
                {r.warnings.length ? <ul className="space-y-1 text-[12px]">{r.warnings.map((w) => <li key={w} className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{w}</li>)}</ul> : <p className="text-[12px] text-emerald-700 dark:text-emerald-400">No problems found.</p>}
                <p className="text-[12px]"><b>Fonts:</b> {r.fonts.length ? r.fonts.map((f) => `${f.name}${f.embedded ? '' : ' (not embedded)'}`).join(', ') : 'none (outlined text or images only)'}</p>
                <p className="text-[12px]"><b>Colour spaces:</b> {r.colorSpaces.length ? r.colorSpaces.join(', ') : 'device colours set in the page'}</p>
                <div className="overflow-x-auto"><table className="w-full text-[11.5px] tabular-nums"><thead><tr className="text-left text-mt-muted"><th className="py-1">Page</th><th>Trim</th><th>Bleed</th><th>Media</th><th>Img</th></tr></thead><tbody>{r.pages.slice(0, 60).map((p) => <tr key={p.index} className="border-t border-mt-border"><td className="py-1">{p.index + 1}{p.rotate ? ` ↻${p.rotate}` : ''}{p.blank ? ' · blank' : ''}</td><td>{fmt(p.trim)}</td><td>{fmt(p.bleed)}</td><td>{fmt(p.media)}</td><td>{p.images.length || ''}</td></tr>)}</tbody></table></div>
              </section>
            ); })}
            {sheet && <section className="rounded-xl bg-mt-bg p-2.5 text-[12px] space-y-0.5"><p className="font-semibold">Current sheet</p><p>Size {r1(sheet.w)} × {r1(sheet.h)} mm · trim {fmt(sheet.trim)}</p><p>Bleed T {sheet.bleed.t} · R {sheet.bleed.r} · B {sheet.bleed.b} · L {sheet.bleed.l} mm</p><p>{sheet.items.filter((i) => i.k === 'page').length} placed page(s), {sheet.items.filter((i) => i.tag === 'stuck').length} stick-on(s), {sheet.items.filter((i) => i.tag === 'tape').length} tape, {sheet.items.filter((i) => i.tag === 'mark').length} mark line(s)</p><p className="text-mt-muted">Modify sizes with Define bleeds, Adjust page sizes or Set trim box.</p></section>}
          </>}
        </aside>
      </div>
    </div>
  );
}
