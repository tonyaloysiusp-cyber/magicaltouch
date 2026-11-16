'use client';

// Embroidery workspace: build a design from shapes, lettering (real font
// outlines) or your own SVG; choose fill / satin / running stitches per
// object with density, angle, length, width and underlay; see the real
// stitches as thread; place it on a garment piece; download the machine
// file (Tajima DST or Melco EXP), a stitch preview and the thread list.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, Trash2, Upload, X } from 'lucide-react';
import type { Piece } from '@/lib/garments';
import { PATTERN_MOTIFS, MOTIF_CATEGORIES } from '@/lib/patternMotifs';
import { normalize, segsToD, transformSegs, bbox } from '@/lib/textile/vector';
import { DEFAULTS, STITCH_LABEL, previewSvg, stitchDesign, summarise, toDst, toExp, validateDst, type EmbObject, type StitchType, type Summary } from '@/lib/embroidery/stitch';
import { flower, border as floralBorder, neckline as floralNeckline, vine as floralVine, DEFAULT_FLOWER } from '@/lib/textile/floral';

export interface EmbroideryDesign {
  objects: EmbObject[];
  hoop: [number, number];
  placement: { piece: string; x: number; y: number } | null;
  summary?: Summary | null;
}

const HOOPS: [number, number, string][] = [[100, 100, '100 × 100 mm'], [130, 180, '130 × 180 mm'], [150, 240, '150 × 240 mm'], [200, 200, '200 × 200 mm'], [200, 300, '200 × 300 mm'], [300, 300, '300 × 300 mm']];
const FONTS = ['Oswald', 'Roboto', 'Montserrat', 'Playfair Display', 'Great Vibes', 'Pacifico', 'Bebas Neue', 'Noto Sans Tamil'];
const uid = () => Math.random().toString(36).slice(2, 9);
const tf = (d: string, m: number[]) => segsToD(transformSegs(normalize(d), m as any));
const boxOf = (d: string) => bbox(normalize(d));

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Paths of an SVG file (path, rect, circle, ellipse, polygon, polyline) with their own fill colour. */
function svgShapes(text: string): { d: string; colour: string }[] {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const out: { d: string; colour: string }[] = [];
  const colourOf = (el: Element) => {
    const f = el.getAttribute('fill') || (el.getAttribute('style') || '').match(/fill:\s*([^;]+)/)?.[1] || '#000000';
    return /^#[0-9a-f]{6}$/i.test(f.trim()) ? f.trim() : /^#[0-9a-f]{3}$/i.test(f.trim()) ? '#' + f.trim().slice(1).split('').map((c) => c + c).join('') : '#222222';
  };
  doc.querySelectorAll('path,rect,circle,ellipse,polygon,polyline').forEach((el) => {
    const n = (k: string) => parseFloat(el.getAttribute(k) || '0');
    let d = '';
    const tag = el.tagName.toLowerCase();
    if (tag === 'path') d = el.getAttribute('d') || '';
    else if (tag === 'rect') d = `M${n('x')} ${n('y')}h${n('width')}v${n('height')}h${-n('width')}Z`;
    else if (tag === 'circle' || tag === 'ellipse') { const rx = tag === 'circle' ? n('r') : n('rx'), ry = tag === 'circle' ? n('r') : n('ry'); d = `M${n('cx') - rx} ${n('cy')}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`; }
    else { const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); if (pts.length >= 4) d = `M${pts.slice(0, 2).join(' ')}L${pts.slice(2).join(' ')}${tag === 'polygon' ? 'Z' : ''}`; }
    if (d && el.getAttribute('fill') !== 'none') out.push({ d, colour: colourOf(el) });
  });
  return out;
}

export function EmbroideryStudio({ design, pieces, colours, onSave, onClose, fileBase }: { design: EmbroideryDesign | null; pieces: Piece[]; colours: { body: string }; onSave: (d: EmbroideryDesign) => void; onClose: () => void; fileBase: string }) {
  const [objects, setObjects] = useState<EmbObject[]>(design?.objects || []);
  const [hoop, setHoop] = useState<[number, number]>(design?.hoop || [130, 180]);
  const [placement, setPlacement] = useState<EmbroideryDesign['placement']>(design?.placement || (pieces[0] ? { piece: pieces[0].id, x: Math.round(pieces[0].w * 0.7), y: 120 } : null));
  const [sel, setSel] = useState<string | null>(null);
  const [stitches, setStitchesView] = useState(true);
  const [cat, setCat] = useState<string>('Floral');
  const [sizeMm, setSizeMm] = useState(50);
  const [text, setText] = useState('');
  const [font, setFont] = useState('Oswald');
  const [textMm, setTextMm] = useState(15);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; d: string } | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg((x) => (x === m ? null : x)), 4500); };

  const update = (list: EmbObject[]) => { setObjects(list); setDirty(true); };
  const patch = (id: string, o: Partial<EmbObject>) => update(objects.map((x) => (x.id === id ? { ...x, ...o } : x)));
  const selected = objects.find((o) => o.id === sel) || null;

  // Stitches are worked out after edits settle (fill of a large design takes a moment).
  const [st, setSt] = useState(() => stitchDesign(objects));
  useEffect(() => { const t = setTimeout(() => setSt(stitchDesign(objects)), 150); return () => clearTimeout(t); }, [objects]);
  const [spm, setSpm] = useState(700);
  const summary = useMemo(() => summarise(objects, st, spm), [objects, st, spm]);
  // Stitch-by-stitch simulation: show the sewing order up to `upTo`, with jumps and trims marked.
  const [upTo, setUpTo] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (!playing) return; const t = setInterval(() => setUpTo((n) => { const nx = (n ?? 0) + Math.max(5, Math.round(st.length / 300)); if (nx >= st.length) { setPlaying(false); return st.length; } return nx; }), 40); return () => clearInterval(t); }, [playing, st.length]);
  const shown = upTo == null ? st : st.slice(0, upTo);
  const preview = useMemo(() => previewSvg(objects, shown), [objects, shown]);
  const travel = useMemo(() => {
    if (upTo == null) return '';
    let d = '', x = '', prev: { x: number; y: number } | null = null;
    for (const s of shown) {
      if (s.cmd === 'jump' && prev) d += `M${prev.x.toFixed(2)} ${prev.y.toFixed(2)}L${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
      if (s.cmd === 'trim') x += `M${(s.x - 1).toFixed(2)} ${(s.y - 1).toFixed(2)}l2 2m0 -2l-2 2`;
      if (s.cmd !== 'trim' && s.cmd !== 'color' && s.cmd !== 'stop') prev = s;
    }
    const n = prev ? `<circle cx="${prev.x.toFixed(2)}" cy="${prev.y.toFixed(2)}" r="1.2" fill="#2563EB" stroke="#fff" stroke-width="0.3"/>` : '';
    return `<path d="${d}" stroke="#2563EB" stroke-width="0.25" stroke-dasharray="1 0.8" fill="none"/><path d="${x}" stroke="#DC2626" stroke-width="0.35" fill="none"/>${n}`;
  }, [shown, upTo]);

  const [hw, hh] = hoop;
  const centreAdd = (d: string): string => { const b = boxOf(d); return tf(d, [1, 0, 0, 1, hw / 2 - (b.x + b.w / 2), hh / 2 - (b.y + b.h / 2)]); };
  const add = (o: Omit<EmbObject, 'id'>) => { const id = uid(); update([...objects, { ...o, id }]); setSel(id); };

  const addMotif = (id: string) => {
    const m = PATTERN_MOTIFS.find((x) => x.id === id); if (!m) return;
    const d = centreAdd(tf(m.d, [sizeMm / 100, 0, 0, sizeMm / 100, 0, 0]));
    add({ name: m.label, d, type: 'fill', colour: '#B8344F', angle: 45, spacing: DEFAULTS.fillSpacing, stitchLen: DEFAULTS.fillLen, underlay: true });
  };
  const addText = async () => {
    if (!text.trim()) return;
    setBusy('text');
    try {
      const { exactTextOutline } = await import('@/lib/fontOutline');
      const raw = await exactTextOutline(text.trim(), { family: font, weight: 400, size: 100 });
      if (!raw) { flash('That font could not be loaded — try another.'); setBusy(null); return; }
      const b = boxOf(raw);
      const k = textMm / Math.max(1, b.h);
      const d = centreAdd(tf(raw, [k, 0, 0, k, 0, 0]));
      add({ name: `Text “${text.trim()}”`, d, type: 'fill', colour: '#1E3A5F', angle: 90, spacing: DEFAULTS.fillSpacing, stitchLen: 2.5, underlay: true });
      if (textMm < 5) flash('Letters under 5 mm high may not stitch cleanly — make them bigger if you can.');
    } catch { flash('The lettering could not be made.'); }
    setBusy(null);
  };
  const importSvg = async (f?: File | null) => {
    if (!f) return;
    try {
      const shapes = svgShapes(await f.text());
      if (!shapes.length) { flash('No shapes found in that SVG.'); return; }
      const all = shapes.map((s) => s.d).join('');
      const b = boxOf(all), k = Math.min((hw * 0.8) / Math.max(1, b.w), (hh * 0.8) / Math.max(1, b.h));
      const m = [k, 0, 0, k, hw / 2 - (b.x + b.w / 2) * k, hh / 2 - (b.y + b.h / 2) * k];
      const next = shapes.map((s, i) => ({ id: uid(), name: `${f.name.replace(/\.svg$/i, '')} ${i + 1}`, d: tf(s.d, m), type: 'fill' as StitchType, colour: s.colour, angle: 45, spacing: DEFAULTS.fillSpacing, stitchLen: DEFAULTS.fillLen, underlay: true }));
      update([...objects, ...next]);
      flash(`${next.length} shape${next.length > 1 ? 's' : ''} imported and fitted to the hoop. Check the stitch type of each.`);
    } catch { flash('That SVG could not be read.'); }
  };

  // Transform helpers on the selected object (around its centre).
  const around = (o: EmbObject, m: number[]) => { const b = boxOf(o.d), cx = b.x + b.w / 2, cy = b.y + b.h / 2; return tf(tf(tf(o.d, [1, 0, 0, 1, -cx, -cy]), m), [1, 0, 0, 1, cx, cy]); };
  const scaleSel = (k: number) => selected && patch(selected.id, { d: around(selected, [k, 0, 0, k, 0, 0]) });
  const rotateSel = (deg: number) => { if (!selected) return; const a = (deg * Math.PI) / 180; patch(selected.id, { d: around(selected, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]) }); };
  const move = (dir: -1 | 1) => { if (!selected) return; const i = objects.indexOf(selected), j = i + dir; if (j < 0 || j >= objects.length) return; const l = [...objects]; [l[i], l[j]] = [l[j], l[i]]; update(l); };

  // Drag to move on the hoop.
  const toMm = (e: React.PointerEvent) => { const svg = svgRef.current!; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM()!.inverse()); return { x: p.x, y: p.y }; };
  const onDown = (e: React.PointerEvent, id: string) => { e.stopPropagation(); setSel(id); const o = objects.find((x) => x.id === id)!; const p = toMm(e); drag.current = { id, x: p.x, y: p.y, d: o.d }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { const g = drag.current; if (!g) return; const p = toMm(e); setObjects((l) => l.map((o) => (o.id === g.id ? { ...o, d: tf(g.d, [1, 0, 0, 1, p.x - g.x, p.y - g.y]) } : o))); };
  const onUp = () => { if (drag.current) setDirty(true); drag.current = null; };

  const warnings: string[] = [];
  if (summary.sizeMm[0] > hw + 0.5 || summary.sizeMm[1] > hh + 0.5) warnings.push(`The design (${Math.round(summary.sizeMm[0])} × ${Math.round(summary.sizeMm[1])} mm) is bigger than the ${hw} × ${hh} mm hoop.`);
  for (const o of objects) if (o.type === 'satin' && (o.width || DEFAULTS.satinWidth) > 8) warnings.push(`${o.name}: satin wider than 8 mm can snag — use fill.`);

  const doSave = () => { onSave({ objects, hoop, placement, summary }); setDirty(false); flash('Embroidery saved to the project.'); };
  const close = () => { if (dirty && !window.confirm('Save the embroidery before closing?\n\nOK = save and close · Cancel = keep editing')) return; if (dirty) doSave(); onClose(); };
  const dl = (kind: 'dst' | 'exp' | 'png' | 'svg') => {
    if (!summary.stitches) { flash('Add something to stitch first.'); return; }
    if (kind === 'dst') {
      // The file is read back and checked before it is offered.
      const bytes = toDst(st, fileBase.slice(0, 16).toUpperCase());
      const v = validateDst(bytes, st, hoop);
      if (!v.ok) { flash(`DST not saved: ${v.issues.join(' ')}`); return; }
      save(new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' }), `${fileBase}.dst`);
      flash(`DST checked and saved: ${v.stitches.toLocaleString('en')} stitches, ${v.colourChanges} colour change${v.colourChanges === 1 ? '' : 's'} / stops, ${Math.round(v.sizeMm[0])} × ${Math.round(v.sizeMm[1])} mm.`);
    }
    if (kind === 'exp') save(new Blob([toExp(st) as unknown as BlobPart], { type: 'application/octet-stream' }), `${fileBase}.exp`);
    if (kind === 'svg') { const p = previewSvg(objects, st, { background: colours.body }); save(new Blob([p.svg], { type: 'image/svg+xml' }), `${fileBase}-stitch-preview.svg`); }
    if (kind === 'png') {
      setBusy('png');
      const p = previewSvg(objects, st, { background: colours.body });
      const img = new Image(); img.onload = () => { const k = 2000 / Math.max(p.w, p.h); const c = document.createElement('canvas'); c.width = Math.round(p.w * k); c.height = Math.round(p.h * k); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); c.toBlob((b) => { if (b) save(b, `${fileBase}-stitch-preview.png`); setBusy(null); }, 'image/png'); };
      img.onerror = () => setBusy(null);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg)}`;
    }
  };

  const piece = pieces.find((p) => p.id === placement?.piece) || null;
  const lbl = 'block text-[11.5px] text-mt-muted';
  const field = 'mt-0.5 h-8 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px] text-mt-ink';
  const chip = (on: boolean) => `h-7 px-2.5 rounded-full border text-[11.5px] font-semibold ${on ? 'border-[#7A1F3D] bg-[#7A1F3D] text-white' : 'border-mt-border hover:bg-mt-surface2'}`;
  const motifs = PATTERN_MOTIFS.filter((m) => m.cat === cat);

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-mt-bg" role="dialog" aria-label="Embroidery workspace">
      <div className="flex flex-wrap items-center gap-2 border-b border-mt-border bg-mt-surface px-3 py-2">
        <p className="text-[14px] font-semibold">Embroidery</p>
        <span className="text-[12px] text-mt-muted">{summary.stitches.toLocaleString('en')} stitches · {summary.colours.length} colour{summary.colours.length === 1 ? '' : 's'} · {Math.round(summary.sizeMm[0])} × {Math.round(summary.sizeMm[1])} mm · {summary.trims} trims{summary.stops ? ` · ${summary.stops} stops` : ''} · about {summary.minutes} min at <input type="number" min={200} max={1500} step={50} value={spm} onChange={(e) => setSpm(Math.max(200, Math.min(1500, Number(e.target.value) || 700)))} aria-label="Machine speed" className="w-14 rounded border border-mt-border bg-mt-bg px-1 text-[12px]" /> stitches/min</span>
        <span className="flex-1" />
        <button type="button" onClick={() => setStitchesView((v) => !v)} aria-pressed={stitches} className={chip(stitches)}>{stitches ? 'Stitches' : 'Shapes'}</button>
        <button type="button" onClick={() => dl('dst')} className="h-8 px-3 rounded-full bg-[#7A1F3D] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Download size={14} /> DST (Tajima)</button>
        <button type="button" onClick={() => dl('exp')} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold">EXP (Melco)</button>
        <button type="button" onClick={() => dl('png')} disabled={!!busy} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold">Preview PNG</button>
        <button type="button" onClick={() => dl('svg')} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold">Preview SVG</button>
        <button type="button" onClick={doSave} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold">Save</button>
        <button type="button" onClick={close} aria-label="Close embroidery" className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-mt-surface2"><X size={16} /></button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Add */}
        <aside className="w-full lg:w-[270px] shrink-0 overflow-y-auto border-r border-mt-border bg-mt-surface p-3 space-y-3" aria-label="Add embroidery">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Hoop</p>
            <select value={`${hw}x${hh}`} onChange={(e) => { const [a, b] = e.target.value.split('x').map(Number); setHoop([a, b]); setDirty(true); }} aria-label="Hoop size" className={field}>
              {HOOPS.map(([a, b, l]) => <option key={l} value={`${a}x${b}`}>{l}</option>)}
            </select>
          </div>
          <div role="group" aria-label="Embroidery presets">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Ready presets</p>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {([
                ['Chest flower', () => flower({ ...DEFAULT_FLOWER, petals: 6, length: 14, width: 9, layers: 2, leaves: 2, centreSize: 4, stem: true }), 'fill'],
                ['Floral neckline', () => floralNeckline(Math.min(hw, 160) * 0.9, Math.min(hh, 160) * 0.55, 'u', 16), 'fill'],
                ['Border', () => floralBorder(hw * 0.9, 18, 'floral'), 'fill'],
                ['Vine outline', () => floralVine(hw * 0.85, 12, 6, 2), 'satin'],
              ] as const).map(([label, make, type]) => (
                <button key={label} type="button" onClick={() => {
                  const parts = make();
                  const cols: Record<string, string> = { petal: '#B8344F', petal2: '#F2A7B8', centre: '#E8B53C', leaf: '#3F7D4E', stem: '#2F5D3A', accent: '#7A1F3D' };
                  const next = parts.filter((pt) => pt.d).map((pt) => ({ id: uid(), name: `${label}: ${pt.name}`, d: tf(pt.d, [1, 0, 0, 1, hw / 2, hh / 2]), type: (pt.role === 'stem' && type === 'satin' ? 'satin' : pt.role === 'stem' ? 'running' : 'fill') as StitchType, colour: cols[pt.role] || '#7A1F3D', angle: 45, spacing: DEFAULTS.fillSpacing, stitchLen: pt.role === 'stem' ? 2.2 : DEFAULTS.fillLen, width: 1.6, underlay: true }));
                  update([...objects, ...next]);
                  flash(`${label} added: ${next.length} objects in sewing order (leaves and stems first, centres last).`);
                }} className="h-8 rounded-lg border border-mt-border text-[12px] hover:bg-mt-surface2">{label}</button>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Lettering">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Lettering</p>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, monogram, logo text" aria-label="Embroidery text" className={field} />
            <div className="mt-1 grid grid-cols-[1fr_70px] gap-1.5">
              <select value={font} onChange={(e) => setFont(e.target.value)} aria-label="Embroidery font" className={field}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
              <label className="sr-only" htmlFor="emb-text-h">Letter height</label>
              <input id="emb-text-h" type="number" min={3} max={200} value={textMm} onChange={(e) => setTextMm(Math.max(3, Number(e.target.value) || 3))} aria-label="Letter height mm" className={field} />
            </div>
            <button type="button" onClick={addText} disabled={!text.trim() || busy === 'text'} className="mt-1.5 w-full h-8 rounded-lg border border-mt-border text-[12.5px] font-semibold hover:bg-mt-surface2 disabled:opacity-50">{busy === 'text' ? 'Making…' : '+ Add lettering'}</button>
          </div>
          <div role="group" aria-label="Embroidery shapes">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Shapes & motifs</p>
            <div className="mt-1 flex flex-wrap gap-1">{MOTIF_CATEGORIES.map((c) => <button key={c} type="button" className={chip(cat === c)} onClick={() => setCat(c)}>{c}</button>)}</div>
            <label className={`${lbl} mt-1.5`}>Size (mm)<input type="number" min={5} max={300} value={sizeMm} onChange={(e) => setSizeMm(Math.max(5, Number(e.target.value) || 5))} aria-label="Shape size mm" className={field} /></label>
            <div className="mt-1.5 grid grid-cols-5 gap-1">
              {motifs.map((m) => <button key={m.id} type="button" title={m.label} aria-label={`Add ${m.label}`} onClick={() => addMotif(m.id)} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 p-1"><svg viewBox="-55 -55 110 110"><path d={m.d} fill="#7A1F3D" fillRule="evenodd" /></svg></button>)}
            </div>
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-8 rounded-lg border border-mt-border text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-mt-surface2"><Upload size={13} /> Import your SVG artwork</button>
            <input ref={fileRef} type="file" accept=".svg,image/svg+xml" hidden onChange={(e) => { importSvg(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div role="group" aria-label="Placement">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Placement on the garment</p>
            <select value={placement?.piece || ''} onChange={(e) => { setPlacement({ piece: e.target.value, x: placement?.x ?? 100, y: placement?.y ?? 100 }); setDirty(true); }} aria-label="Piece" className={field}>
              {pieces.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <label className={lbl}>Centre X (mm)<input type="number" value={placement?.x ?? 0} onChange={(e) => { setPlacement((p) => p && { ...p, x: Number(e.target.value) || 0 }); setDirty(true); }} aria-label="Placement X" className={field} /></label>
              <label className={lbl}>Centre Y (mm)<input type="number" value={placement?.y ?? 0} onChange={(e) => { setPlacement((p) => p && { ...p, y: Number(e.target.value) || 0 }); setDirty(true); }} aria-label="Placement Y" className={field} /></label>
            </div>
            {piece && placement && (
              <svg viewBox={`-10 -10 ${piece.w + 20} ${piece.h + 20}`} className="mt-1.5 w-full max-h-48" aria-label="Placement preview">
                <path d={piece.d} fill={colours.body} stroke="#334155" strokeWidth={3} />
                <g transform={`translate(${placement.x - (preview.x + preview.w / 2)} ${placement.y - (preview.y + preview.h / 2)})`} dangerouslySetInnerHTML={{ __html: preview.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') }} />
              </svg>
            )}
          </div>
        </aside>

        {/* Hoop */}
        <main className="relative min-h-[320px] flex-1 overflow-hidden bg-[#E9E4DA]" onPointerMove={onMove} onPointerUp={onUp} onPointerDown={() => setSel(null)}>
          <svg ref={svgRef} viewBox={`-10 -10 ${hw + 20} ${hh + 20}`} className="absolute inset-0 h-full w-full" aria-label="Hoop">
            <rect x={0} y={0} width={hw} height={hh} rx={8} fill={colours.body} stroke="#8B7355" strokeWidth={1.2} />
            <path d={`M${hw / 2} 0V${hh}M0 ${hh / 2}H${hw}`} stroke="#8B7355" strokeOpacity={0.35} strokeWidth={0.2} strokeDasharray="2 2" />
            {stitches
              ? <g dangerouslySetInnerHTML={{ __html: preview.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + travel }} />
              : objects.filter((o) => !o.hidden).map((o) => o.type === 'fill' ? <path key={o.id} d={o.d} fill={o.colour} fillRule="evenodd" /> : <path key={o.id} d={o.d} fill="none" stroke={o.colour} strokeWidth={o.type === 'satin' ? o.width || DEFAULTS.satinWidth : 0.5} />)}
            {/* Hit areas for selecting and dragging */}
            {objects.filter((o) => !o.hidden).map((o) => <path key={o.id} d={o.d} fill={o.type === 'fill' ? 'transparent' : 'none'} stroke="transparent" strokeWidth={4} fillRule="evenodd" style={{ cursor: 'move' }} onPointerDown={(e) => onDown(e, o.id)} aria-label={o.name} />)}
            {selected && (() => { const b = boxOf(selected.d); return <rect x={b.x - 1} y={b.y - 1} width={b.w + 2} height={b.h + 2} fill="none" stroke="#2563EB" strokeWidth={0.4} strokeDasharray="1.5 1" pointerEvents="none" />; })()}
          </svg>
          {!objects.length && <p className="absolute inset-x-0 top-6 text-center text-[13px] text-mt-muted">Add lettering, a motif or your own SVG to start.</p>}
          {st.length > 1 && (
            <div className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full bg-mt-surface/95 border border-mt-border px-3 py-1.5 shadow" role="group" aria-label="Stitch simulation" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => { if (upTo == null || upTo >= st.length) setUpTo(0); setPlaying((v) => !v); }} className="h-7 px-3 rounded-full bg-[#7A1F3D] text-white text-[12px] font-semibold">{playing ? 'Pause' : 'Play'}</button>
              <input type="range" min={0} max={st.length} value={upTo ?? st.length} onChange={(e) => { setPlaying(false); setUpTo(Number(e.target.value)); }} aria-label="Stitch sequence" className="w-40" />
              <span className="text-[11.5px] tabular-nums text-mt-muted">{(upTo ?? st.length).toLocaleString('en')} / {st.length.toLocaleString('en')}</span>
              {upTo != null && <button type="button" onClick={() => { setPlaying(false); setUpTo(null); }} className="text-[11.5px] text-mt-muted underline">Done</button>}
            </div>
          )}
          {warnings.length > 0 && <div role="alert" className="absolute left-3 bottom-3 max-w-md rounded-xl bg-amber-50 border border-amber-300 px-3 py-2 text-[12px] text-amber-900 space-y-0.5">{warnings.map((w) => <p key={w}>{w}</p>)}</div>}
        </main>

        {/* Properties */}
        <aside className="w-full lg:w-[290px] shrink-0 overflow-y-auto border-l border-mt-border bg-mt-surface p-3 space-y-3" aria-label="Stitch settings">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Objects (sewing order)</p>
            <div className="mt-1 space-y-1">
              {objects.map((o, i) => (
                <div key={o.id} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] ${sel === o.id ? 'border-[#7A1F3D] bg-[#7A1F3D]/5' : 'border-mt-border'}`}>
                  <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10" style={{ background: o.colour }} />
                  <button type="button" onClick={() => setSel(o.id)} className="flex-1 truncate text-left">{i + 1}. {o.name}</button>
                  <span className="text-mt-faint">{o.type}</span>
                  <button type="button" aria-label={o.hidden ? `Show ${o.name}` : `Hide ${o.name}`} onClick={() => patch(o.id, { hidden: !o.hidden })}>{o.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                </div>
              ))}
            </div>
          </div>
          {selected && (
            <div className="space-y-2" role="group" aria-label="Selected object">
              <label className={lbl}>Name<input value={selected.name} onChange={(e) => patch(selected.id, { name: e.target.value })} aria-label="Object name" className={field} /></label>
              <div role="radiogroup" aria-label="Stitch type" className="flex flex-wrap gap-1">
                {(Object.keys(STITCH_LABEL) as StitchType[]).map((t) => <button key={t} type="button" role="radio" aria-checked={selected.type === t} aria-label={({ fill: 'Fill', satin: 'Satin', running: 'Running' } as any)[t] || STITCH_LABEL[t]} className={chip(selected.type === t)} onClick={() => patch(selected.id, { type: t })}>{STITCH_LABEL[t]}</button>)}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className={lbl}>Thread colour<input type="color" value={selected.colour} onChange={(e) => patch(selected.id, { colour: e.target.value })} aria-label="Thread colour" className="mt-0.5 block h-8 w-full rounded-lg border border-mt-border" /></label>
                <label className={lbl}>Thread name / code<input value={selected.thread || ''} onChange={(e) => patch(selected.id, { thread: e.target.value })} placeholder="your thread" aria-label="Thread name" className={field} /></label>
                {selected.type === 'fill' && <label className={lbl}>Angle (°)<input type="number" value={selected.angle ?? 45} onChange={(e) => patch(selected.id, { angle: Number(e.target.value) || 0 })} aria-label="Fill angle" className={field} /></label>}
                {selected.type !== 'running' && <label className={lbl}>Density (mm)<input type="number" step={0.05} min={0.2} max={2} value={selected.spacing ?? 0.4} onChange={(e) => patch(selected.id, { spacing: Math.max(0.2, Math.min(2, Number(e.target.value) || 0.4)) })} aria-label="Density" className={field} /></label>}
                {selected.type !== 'satin' && <label className={lbl}>Stitch length (mm)<input type="number" step={0.1} min={1} max={7} value={selected.stitchLen ?? (selected.type === 'fill' ? 3.5 : 2.5)} onChange={(e) => patch(selected.id, { stitchLen: Math.max(1, Math.min(7, Number(e.target.value) || 2.5)) })} aria-label="Stitch length" className={field} /></label>}
                {['zigzag', 'motif', 'applique', 'decorative'].includes(selected.type) && <label className={lbl}>{selected.type === 'decorative' ? 'Spoke depth (mm)' : 'Width (mm)'}<input type="number" step={0.5} min={1} max={12} value={selected.width ?? 3} onChange={(e) => patch(selected.id, { width: Math.max(1, Math.min(12, Number(e.target.value) || 3)) })} aria-label="Stitch width" className={field} /></label>}
                {selected.type === 'motif' && <label className={lbl}>Motif<select value={selected.motif || 'diamond'} onChange={(e) => patch(selected.id, { motif: e.target.value as any })} aria-label="Motif shape" className={field}>{['diamond', 'cross', 'wave', 'triangle'].map((m) => <option key={m}>{m}</option>)}</select></label>}
                {(selected.type === 'satin' || selected.type === 'fill' || selected.type === 'applique') && <label className={lbl}>Pull comp. (mm)<input type="number" step={0.05} min={0} max={1.5} value={selected.pull ?? 0} onChange={(e) => patch(selected.id, { pull: Math.max(0, Math.min(1.5, Number(e.target.value) || 0)) })} aria-label="Pull compensation" className={field} /></label>}
                {selected.type === 'fill' && <label className={lbl}>Push comp. (mm)<input type="number" step={0.05} min={0} max={1.5} value={selected.push ?? 0} onChange={(e) => patch(selected.id, { push: Math.max(0, Math.min(1.5, Number(e.target.value) || 0)) })} aria-label="Push compensation" className={field} /></label>}
                <label className={lbl}>Start point<select value={selected.start || 'auto'} onChange={(e) => patch(selected.id, { start: e.target.value as any })} aria-label="Start point" className={field}>{[['auto', 'Automatic'], ['top-left', 'Top left'], ['top-right', 'Top right'], ['bottom-left', 'Bottom left'], ['bottom-right', 'Bottom right'], ['centre', 'Centre']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                {selected.type === 'satin' && <label className={lbl}>Column width (mm)<input type="number" step={0.5} min={1} max={12} value={selected.width ?? 3} onChange={(e) => patch(selected.id, { width: Math.max(1, Math.min(12, Number(e.target.value) || 3)) })} aria-label="Satin width" className={field} /></label>}
              </div>
              {selected.type !== 'running' && <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={selected.underlay !== false} onChange={(e) => patch(selected.id, { underlay: e.target.checked })} /> Underlay</label>}
              <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={selected.tie !== false} onChange={(e) => patch(selected.id, { tie: e.target.checked })} /> Tie-in and tie-off (lock stitches)</label>
              {selected.type === 'applique' && <p className="text-[11px] text-mt-muted">Appliqué sews a placement line, stops (lay the fabric), a tack-down, stops (trim the fabric), then a satin cover.</p>}
              {selected.type === 'running' && <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!selected.triple} onChange={(e) => patch(selected.id, { triple: e.target.checked })} /> Triple (bean) stitch</label>}
              <div className="flex flex-wrap gap-1">
                <button type="button" className={chip(false)} onClick={() => scaleSel(1.1)}>Bigger</button>
                <button type="button" className={chip(false)} onClick={() => scaleSel(1 / 1.1)}>Smaller</button>
                <button type="button" className={chip(false)} onClick={() => rotateSel(-15)}>⟲ 15°</button>
                <button type="button" className={chip(false)} onClick={() => rotateSel(15)}>⟳ 15°</button>
                <button type="button" aria-label="Sew earlier" className={chip(false)} onClick={() => move(-1)}><ArrowUp size={12} /></button>
                <button type="button" aria-label="Sew later" className={chip(false)} onClick={() => move(1)}><ArrowDown size={12} /></button>
                <button type="button" aria-label="Delete object" className={chip(false)} onClick={() => { update(objects.filter((o) => o.id !== selected.id)); setSel(null); }}><Trash2 size={12} /></button>
              </div>
            </div>
          )}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Thread list</p>
            <div className="mt-1 space-y-1 text-[12px]">
              {summary.colours.map((c, i) => <div key={i} className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-sm border border-black/10" style={{ background: c.hex }} /><span className="flex-1">{i + 1}. {c.name}</span><span className="tabular-nums text-mt-muted">{c.stitches.toLocaleString('en')}</span></div>)}
            </div>
            <p className="mt-2 text-[11px] text-mt-muted">DST is read by almost every embroidery machine (Tajima, Brother, Barudan, Ricoma, ZSK…); it has no colours, so use this list at the machine. Do a test stitch-out on the same fabric before production.</p>
          </div>
        </aside>
      </div>
      {msg && <p role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[95] rounded-full bg-mt-ink px-4 py-2 text-[13px] text-mt-bg shadow-lg">{msg}</p>}
    </div>
  );
}
