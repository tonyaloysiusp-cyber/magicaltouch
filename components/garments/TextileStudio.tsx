'use client';

// Textile Studio — one professional workspace for any garment:
// T-shirts and polos (standard templates, unverified), kurta / kameez and
// chudidar (drafted from the customer's own measurements), dupatta and
// running fabric. Design in the Illustrator-style print studio, add
// embroidery, then download print-ready files (real-size pieces with bleed,
// cut lines and registration marks), the embroidery machine file and a tech
// pack. Everything stays on this device.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, FileUp, PenTool, Save, Scissors, Shirt, Sparkles } from 'lucide-react';
import { DEFAULT_PATTERN } from '@/lib/patterns';
import { SIZES, ROLLS, type Product } from '@/lib/garments';
import { kitFor, kitProduct, pieceMarkup, rosterSheets, safeFile, type KitDesign, type Player } from '@/lib/teamKit';
import { boardLayout, artFonts, type ArtEl } from '@/lib/textile/art';
import { ensureFonts } from '@/lib/textile/fonts';
import { measureGarment } from '@/lib/textile/measure';
import {
  CHUDIDAR_FIELDS, CHUDIDAR_STYLE_DEFAULTS, DUPATTA_FIELDS, DUPATTA_PRESETS, FABRIC_FIELDS, KURTA_FIELDS, KURTA_STYLE_DEFAULTS,
  conflicts, draftChudidar, draftKurta, draftRect, missing, outOfRange, type Field, type GarmentType, type Measures, type NeckStyle, type SleeveStyle,
} from '@/lib/textile/draft';
import { listAssets } from '@/lib/assets/library';
import { openToolFile, saveToolProject, TOOL_FILE_ACCEPT } from '@/lib/mtd/toolProject';
import { PrintStudio } from './PrintStudio';
import { EmbroideryStudio, type EmbroideryDesign } from './EmbroideryStudio';
import type { Asset } from '@/lib/assets/library';

export interface TextileProject {
  name: string;
  type: GarmentType;
  tshirtNeck: 'round' | 'v';
  sleeves: 'short' | 'long';
  neck: NeckStyle;
  sleeve: SleeveStyle;
  measures: Partial<Record<GarmentType, Measures>>;
  colours: { body: string; sleeve: string; trim: string };
  art: ArtEl[];
  sizeQty: Record<string, number>; // T-shirt / polo: garments per standard size
  qty: number; // made-to-measure garments
  rollW: number;
  bleed: number;
  textMode: 'outline' | 'live';
  embroidery?: EmbroideryDesign | null;
}

export const NEW_PROJECT: TextileProject = {
  name: 'My textile design', type: 'kurta', tshirtNeck: 'round', sleeves: 'short', neck: 'round', sleeve: 'elbow',
  measures: {}, colours: { body: '#F5E6D3', sleeve: '#F5E6D3', trim: '#7A1F3D' }, art: [], sizeQty: { m: 1 }, qty: 1,
  rollW: 1600, bleed: 10, textMode: 'outline', embroidery: null,
};

const GARMENTS: { id: GarmentType; label: string; hint: string }[] = [
  { id: 'tshirt', label: 'T-shirt', hint: 'Round or V-neck · standard sizes' },
  { id: 'polo', label: 'Polo', hint: 'Collar and placket · standard sizes' },
  { id: 'kurta', label: 'Kurta / kameez', hint: 'Drafted from your measurements' },
  { id: 'chudidar', label: 'Chudidar', hint: 'Drafted from your measurements' },
  { id: 'dupatta', label: 'Dupatta / stole', hint: 'Any width and length' },
  { id: 'fabric', label: 'Fabric length', hint: 'Running fabric, borders, yardage' },
];
const FIELDS: Partial<Record<GarmentType, Field[]>> = { kurta: KURTA_FIELDS, chudidar: CHUDIDAR_FIELDS, dupatta: DUPATTA_FIELDS, fabric: FABRIC_FIELDS };
const STYLE_DEFAULTS: Partial<Record<GarmentType, Record<string, number>>> = { kurta: KURTA_STYLE_DEFAULTS, chudidar: CHUDIDAR_STYLE_DEFAULTS };
const DRAFT_KEY = 'mt:textile-studio';
const MEASURE_KEY = 'mt:textile-measures';
const standard = (t: GarmentType) => t === 'tshirt' || t === 'polo';

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Pieces of the project, or the reason they can't be made yet. */
export function projectProduct(p: TextileProject): { product: Product | null; problems: string[] } {
  if (standard(p.type)) return { product: kitProduct(projectKit(p, null)), problems: [] };
  const fields = FIELDS[p.type]!, m = p.measures[p.type] || {};
  const miss = missing(fields, m);
  if (miss.length) return { product: null, problems: [`Type ${miss.length === 1 ? 'this measurement' : `these ${miss.length} measurements`}: ${miss.map((f) => f.label).join(', ')}.`] };
  const bad = outOfRange(fields, m);
  if (bad.length) return { product: null, problems: bad.map((f) => `${f.label}: ${m[f.key]} cm looks wrong (expected ${f.min}–${f.max} cm). Check the unit.`) };
  const c = conflicts(p.type, m);
  if (c.length) return { product: null, problems: c };
  if (p.type === 'kurta') return { product: draftKurta(m, p.neck, p.sleeve), problems: [] };
  if (p.type === 'chudidar') return { product: draftChudidar(m), problems: [] };
  return { product: draftRect(p.type as 'dupatta' | 'fabric', m), problems: [] };
}

export function projectKit(p: TextileProject, product: Product | null): KitDesign {
  const base = kitFor(p.type === 'polo' ? 'polo' : 'tshirt');
  return {
    ...base, style: p.type === 'polo' ? 'polo' : 'tshirt', teamName: p.name,
    body: p.colours.body, sleeve: p.colours.sleeve, collar: p.colours.trim, accent: p.colours.trim,
    graphic: 'plain', patternOn: 'none', frontText: '', frontNumber: false, personalise: false, teamLogo: null, sponsorLogo: null,
    studioOnly: true, art: p.art, neck: p.tshirtNeck, sleeves: p.sleeves,
    customProduct: standard(p.type) ? undefined : product || undefined,
  };
}

export function projectPlayers(p: TextileProject): Player[] {
  if (standard(p.type)) return SIZES.flatMap((s) => Array.from({ length: Math.max(0, Math.floor(p.sizeQty[s.id] || 0)) }, () => ({ name: '', number: '', size: s.id })));
  return Array.from({ length: Math.max(1, Math.floor(p.qty || 1)) }, () => ({ name: '', number: '', size: 'm' }));
}

/** Flat pieces with their artwork (preview / sketch), board coordinates in mm. */
export function flatSvg(kit: KitDesign, product: Product): { inner: string; w: number; h: number } {
  const board = boardLayout(product);
  const inner = board.pieces.map((bp) => `<g transform="translate(${bp.x} ${bp.y})${bp.piece.mirror ? ` translate(${bp.piece.w} 0) scale(-1 1)` : ''}">${pieceMarkup(bp.piece, kit, DEFAULT_PATTERN, null, {}, 1, 0, 'live')}<path d="${bp.piece.d}" fill="none" stroke="#334155" stroke-width="2"/></g><text x="${bp.x}" y="${bp.y - 12}" font-family="Arial" font-size="34" fill="#475569">${bp.piece.label}</text>`).join('');
  return { inner: `<g transform="translate(0 60)">${inner}</g>`, w: board.w, h: board.h + 60 };
}

export function TextileStudio() {
  const [p, setP] = useState<TextileProject>(NEW_PROJECT);
  const [loaded, setLoaded] = useState(false);
  const [studio, setStudio] = useState(false);
  const [embOpen, setEmbOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lib, setLib] = useState<Asset[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const handle = useRef<any | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg((x) => (x === m ? null : x)), 5000); };

  // Restore the last project (and the customer's measurements) from this device.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      const ms = JSON.parse(localStorage.getItem(MEASURE_KEY) || 'null');
      setP({ ...NEW_PROJECT, ...(d || {}), measures: { ...(ms || {}), ...(d?.measures || {}) } });
    } catch { /* ignore */ }
    setLoaded(true);
    listAssets('pattern').then(setLib).catch(() => {});
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(p)); localStorage.setItem(MEASURE_KEY, JSON.stringify(p.measures)); } catch { /* full */ } }, 400);
    return () => clearTimeout(t);
  }, [p, loaded]);

  const set = (o: Partial<TextileProject>) => setP((x) => ({ ...x, ...o }));
  const setMeasure = (k: string, v: string) => setP((x) => {
    const cur = { ...(x.measures[x.type] || {}) };
    const n = parseFloat(v.replace(',', '.'));
    if (v.trim() === '' || !Number.isFinite(n)) delete cur[k]; else cur[k] = n;
    return { ...x, measures: { ...x.measures, [x.type]: cur } };
  });

  const { product, problems } = useMemo(() => projectProduct(p), [p]);
  const kit = useMemo(() => projectKit(p, product), [p, product]);
  const players = useMemo(() => projectPlayers(p), [p]);
  const flat = useMemo(() => (product ? flatSvg(kit, product) : null), [kit, product]);
  const garmentLabel = product?.label || GARMENTS.find((g) => g.id === p.type)!.label;
  const fields = FIELDS[p.type];
  const m = p.measures[p.type] || {};
  const pieceMeasures = useMemo(() => (product && standard(p.type) ? measureGarment(product.pieces) : []), [product, p.type]);

  const ready = async () => { if (p.art.length) await ensureFonts(artFonts(p.art)); };
  const fonts = { loadFont: p.textMode === 'live' ? async (family: string, weight: number, italic: boolean) => { try { const { fontBytes } = await import('@/lib/fontOutline'); return await fontBytes(family, weight, italic); } catch { return null; } } : undefined };
  const sheets = () => rosterSheets(kit, DEFAULT_PATTERN, players, {}, { rollW: p.rollW, bleed: p.bleed, cutLines: true, group: 'fabric', marks: true, textMode: p.textMode });

  const dlPrintPdf = async () => {
    if (!product) { flash(problems[0] || 'Finish the garment set-up first.'); return; }
    if (!players.length) { flash('Set how many garments to print.'); return; }
    setBusy('pdf');
    try {
      await ready();
      const r = sheets();
      if (r.tooWide) { flash(`${r.tooWide} piece${r.tooWide > 1 ? 's are' : ' is'} wider than the ${p.rollW} mm roll — choose a wider roll.`); setBusy(null); return; }
      if (r.overlaps) { flash(`${r.overlaps} pieces overlap — not exported. Try a wider roll.`); setBusy(null); return; }
      const { svgToPdfBlob } = await import('@/lib/svgToPdf');
      save(await svgToPdfBlob('', 0, 0, r.pages.map((pg) => ({ svg: pg.svg, widthMm: pg.width, heightMm: pg.height })), fonts), `${safeFile(p.name)}-print.pdf`);
      flash(`Print PDF ready: ${players.length} garment${players.length > 1 ? 's' : ''} on ${r.pages.length} page${r.pages.length > 1 ? 's' : ''}, ${(r.totalMm / 1000).toFixed(2)} m of ${p.rollW} mm fabric, ${Math.round(r.utilisation * 100)} % used.`);
    } catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };
  const dlPrintSvg = async () => {
    if (!product) { flash(problems[0] || 'Finish the garment set-up first.'); return; }
    setBusy('svg');
    try {
      await ready();
      const r = sheets();
      if (r.overlaps || r.tooWide) { flash('Pieces overlap or are wider than the roll — not exported.'); setBusy(null); return; }
      if (r.pages.length === 1) save(new Blob([r.pages[0].svg], { type: 'image/svg+xml' }), `${safeFile(p.name)}-print.svg`);
      else {
        const { buildZip } = await import('@/lib/editor/zip');
        save(new Blob([await buildZip(r.pages.map((pg, i) => ({ name: `${safeFile(p.name)}-page-${i + 1}.svg`, data: new TextEncoder().encode(pg.svg) })))], { type: 'application/zip' }), `${safeFile(p.name)}-print-svg.zip`);
      }
      flash('Print SVG ready (real size in mm).');
    } catch { flash('The SVG could not be made.'); }
    setBusy(null);
  };
  const dlTechPack = async () => {
    if (!product) { flash(problems[0] || 'Finish the garment set-up first.'); return; }
    setBusy('tech');
    try {
      await ready();
      const [{ techPackPages }, { svgToPdfBlob }] = await Promise.all([import('@/lib/textile/techPack'), import('@/lib/svgToPdf')]);
      const r = sheets();
      const allFields = fields || [];
      const measurements = standard(p.type)
        ? pieceMeasures.map((x) => ({ label: `${x.label} — standard template, size M (unverified)`, value: (x.mm / 10).toFixed(1) }))
        : allFields.map((f) => ({ label: f.label, value: String(m[f.key] ?? STYLE_DEFAULTS[p.type]?.[f.key] ?? '—'), style: f.style }));
      const pages = techPackPages({
        project: p.name, garment: garmentLabel, date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        sketch: flat, product,
        measurements,
        colours: [{ role: 'Body', hex: p.colours.body }, ...(product.pieces.some((x) => x.id.startsWith('sleeve')) ? [{ role: 'Sleeves', hex: p.colours.sleeve }] : []), { role: 'Trim / collar / casing', hex: p.colours.trim }],
        artwork: p.art.filter((e: any) => !e.hidden).map((e: any) => ({ name: e.name || e.kind, detail: e.kind === 'text' ? `${e.font} ${e.weight} · ${typeof e.fill === 'string' ? e.fill : 'gradient / pattern'}` : e.kind })),
        order: standard(p.type) ? SIZES.filter((s) => (p.sizeQty[s.id] || 0) > 0).map((s) => ({ label: `Size ${s.label}`, qty: p.sizeQty[s.id] })) : [{ label: 'Made to measure', qty: Math.max(1, p.qty) }],
        print: { rollW: p.rollW, bleed: p.bleed, lengthMm: r.totalMm, pages: r.pages.length, textMode: p.textMode === 'live' ? 'live text (fonts embedded)' : 'outlines' },
        embroidery: p.embroidery?.summary || null,
        notes: [
          product.note,
          ...(standard(p.type) ? ['Standard template sizes are not a factory specification — check them against your own pattern before production.'] : ['Pieces are drafted from the measurements above. Sew a test garment (toile) before cutting good fabric.']),
          `Print at 100 %. Cut lines are magenta (${p.bleed} mm bleed outside them).`,
        ],
      });
      save(await svgToPdfBlob('', 0, 0, pages.map((svg) => ({ svg, widthMm: 210, heightMm: 297 }))), `${safeFile(p.name)}-tech-pack.pdf`);
      flash(`Tech pack ready (${pages.length} page${pages.length > 1 ? 's' : ''}).`);
    } catch { flash('The tech pack could not be made.'); }
    setBusy(null);
  };
  const dlSketch = async () => {
    if (!flat) return;
    setBusy('png');
    try {
      await ready();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -20 ${flat.w + 80} ${flat.h + 40}" width="${Math.round(flat.w + 80)}" height="${Math.round(flat.h + 40)}"><rect x="-40" y="-20" width="${flat.w + 80}" height="${flat.h + 40}" fill="#fff"/>${flat.inner}</svg>`;
      const img = new Image(); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await img.decode();
      const k = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => b && save(b, `${safeFile(p.name)}-flat-sketch.png`), 'image/png');
    } catch { flash('The picture could not be made.'); }
    setBusy(null);
  };

  const saveProject = async () => {
    try {
      const ref = await saveToolProject({ kind: 'textile', name: p.name, data: { project: p }, previewSvg: flat ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${flat.w} ${flat.h}">${flat.inner}</svg>` : undefined, handle: handle.current });
      if (ref) { handle.current = ref.handle; flash(`Saved as “${ref.fileName}” on this device.`); }
    } catch { flash('The project could not be saved.'); }
  };
  const openProject = async (f?: File | null) => {
    if (!f) return;
    try {
      const pr = await openToolFile(f);
      if (pr.kind !== 'textile' || !pr.data?.project) { flash('That file is not a Textile Studio project.'); return; }
      setP({ ...NEW_PROJECT, ...pr.data.project }); handle.current = pr.handle || null;
      flash('Project opened.');
    } catch { flash('That file could not be opened.'); }
  };
  const newProject = (keep: boolean) => {
    if (!window.confirm(keep ? 'Start a new design with the same garment and measurements? Your current design is not deleted if you saved it.' : 'Start a new, empty project? Save the current one first if you need it.')) return;
    setP(keep ? { ...p, name: 'My textile design', art: [], embroidery: null } : { ...NEW_PROJECT, measures: p.measures });
    handle.current = null;
  };

  const lbl = 'block text-[12px] text-mt-muted';
  const field = 'mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2.5 text-[13.5px] text-mt-ink';
  const chip = (on: boolean) => `h-8 px-3 rounded-full border text-[12.5px] font-semibold ${on ? 'border-[#0F766E] bg-[#0F766E] text-white' : 'border-mt-border hover:bg-mt-surface2'}`;
  const btn = 'h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center gap-2 hover:bg-mt-surface2 disabled:opacity-50';

  return (
    <div className="rounded-3xl border border-mt-border bg-mt-surface p-4 sm:p-6 space-y-6" aria-label="Textile Studio">
      {/* Project bar */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={p.name} onChange={(e) => set({ name: e.target.value })} aria-label="Project name" className="h-10 min-w-[200px] flex-1 rounded-xl border border-mt-border bg-mt-bg px-3 text-[15px] font-semibold" />
        <button type="button" className={btn} onClick={saveProject}><Save size={15} /> Save project</button>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}><FileUp size={15} /> Open</button>
        <button type="button" className={btn} onClick={() => newProject(true)}>New (same garment)</button>
        <button type="button" className={btn} onClick={() => newProject(false)}>New empty</button>
        <input ref={fileRef} type="file" hidden accept={TOOL_FILE_ACCEPT} onChange={(e) => { openProject(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {/* 1 Garment */}
      <section aria-label="Garment">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-mt-faint">1 · Garment</p>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="radiogroup" aria-label="Garment type">
          {GARMENTS.map((g) => (
            <button key={g.id} type="button" role="radio" aria-checked={p.type === g.id} onClick={() => set({ type: g.id })} className={`rounded-2xl border p-3 text-left ${p.type === g.id ? 'border-[#0F766E] ring-2 ring-[#0F766E]/30 bg-[#0F766E]/5' : 'border-mt-border hover:bg-mt-surface2'}`}>
              <Shirt size={18} className="text-[#0F766E]" />
              <p className="mt-1 text-[13.5px] font-semibold">{g.label}</p>
              <p className="text-[11.5px] text-mt-muted">{g.hint}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            {standard(p.type) && <>
              {p.type === 'tshirt' && <div className="flex flex-wrap items-center gap-2"><span className="text-[12.5px] text-mt-muted w-16">Neck</span>{(['round', 'v'] as const).map((n) => <button key={n} type="button" className={chip(p.tshirtNeck === n)} onClick={() => set({ tshirtNeck: n })}>{n === 'v' ? 'V-neck' : 'Round neck'}</button>)}</div>}
              <div className="flex flex-wrap items-center gap-2"><span className="text-[12.5px] text-mt-muted w-16">Sleeves</span>{(['short', 'long'] as const).map((n) => <button key={n} type="button" className={chip(p.sleeves === n)} onClick={() => set({ sleeves: n })}>{n === 'short' ? 'Short' : 'Long'}</button>)}</div>
              <div>
                <p className="text-[12.5px] text-mt-muted">How many of each size</p>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {SIZES.map((s) => <label key={s.id} className={lbl}>{s.label}<input type="number" min={0} value={p.sizeQty[s.id] || 0} onChange={(e) => set({ sizeQty: { ...p.sizeQty, [s.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} aria-label={`Quantity ${s.label}`} className={field} /></label>)}
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-amber-700"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Standard template sizes, not a factory specification. Check them against your own pattern before production.</p>
              </div>
            </>}
            {p.type === 'kurta' && <>
              <div className="flex flex-wrap items-center gap-2"><span className="text-[12.5px] text-mt-muted w-16">Neck</span>{(['round', 'v', 'boat', 'square'] as NeckStyle[]).map((n) => <button key={n} type="button" className={chip(p.neck === n)} onClick={() => set({ neck: n })}>{{ round: 'Round', v: 'V-neck', boat: 'Boat', square: 'Square' }[n]}</button>)}</div>
              <div className="flex flex-wrap items-center gap-2"><span className="text-[12.5px] text-mt-muted w-16">Sleeves</span>{(['sleeveless', 'cap', 'short', 'elbow', 'three-quarter', 'full'] as SleeveStyle[]).map((n) => <button key={n} type="button" className={chip(p.sleeve === n)} onClick={() => set({ sleeve: n })}>{{ sleeveless: 'Sleeveless', cap: 'Cap', short: 'Short', elbow: 'Elbow', 'three-quarter': '¾', full: 'Full' }[n]}</button>)}</div>
            </>}
            {p.type === 'dupatta' && <div className="flex flex-wrap gap-2">{DUPATTA_PRESETS.map((d) => <button key={d.label} type="button" className={chip(m.width === d.width && m.length === d.length)} onClick={() => set({ measures: { ...p.measures, dupatta: { width: d.width, length: d.length } } })}>{d.label}</button>)}</div>}
            {fields && (
              <div role="group" aria-label="Measurements">
                <p className="text-[12.5px] text-mt-muted">{p.type === 'kurta' || p.type === 'chudidar' ? 'Measurements in cm — taken on the person, saved on this device only.' : 'Size in cm.'}</p>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2">
                  {fields.map((f) => (
                    <label key={f.key} className={lbl}>{f.label}{f.style && <span className="text-mt-faint"> · style</span>}
                      <input inputMode="decimal" value={m[f.key] ?? ''} placeholder={f.style ? String(STYLE_DEFAULTS[p.type]?.[f.key] ?? '') : 'cm'} onChange={(e) => setMeasure(f.key, e.target.value)} aria-label={f.label} className={field} />
                    </label>
                  ))}
                </div>
              </div>
            )}
            {!standard(p.type) && <label className={lbl}>How many garments<input type="number" min={1} value={p.qty} onChange={(e) => set({ qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} aria-label="Quantity" className={`${field} max-w-[140px]`} /></label>}
            <div className="flex flex-wrap items-end gap-3">
              {(['body', 'sleeve', 'trim'] as const).map((k) => <label key={k} className={lbl}>{{ body: 'Body colour', sleeve: 'Sleeve colour', trim: 'Trim / collar' }[k]}<input type="color" value={p.colours[k]} onChange={(e) => set({ colours: { ...p.colours, [k]: e.target.value } })} aria-label={{ body: 'Body colour', sleeve: 'Sleeve colour', trim: 'Trim colour' }[k]} className="mt-1 block h-9 w-14 rounded-lg border border-mt-border" /></label>)}
            </div>
          </div>

          {/* Pieces preview */}
          <div className="rounded-2xl border border-mt-border bg-white p-3 min-h-[260px]">
            {problems.length > 0 ? (
              <div role="alert" className="space-y-1 text-[13px] text-mt-muted"><p className="font-semibold text-mt-ink">Pieces appear here once the garment is set up.</p>{problems.map((x) => <p key={x}>{x}</p>)}</div>
            ) : flat && product ? (
              <>
                <svg viewBox={`-20 -10 ${flat.w + 40} ${flat.h + 20}`} className="w-full max-h-[420px]" role="img" aria-label="Garment pieces" dangerouslySetInnerHTML={{ __html: flat.inner }} />
                <p className="mt-2 text-[11.5px] text-slate-600">{product.label} · {product.pieces.length} pieces · {product.note}</p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* 2 Design */}
      <section aria-label="Design">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-mt-faint">2 · Design</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={!product} onClick={() => setStudio(true)} className="rounded-2xl border border-mt-border p-4 text-left hover:bg-mt-surface2 disabled:opacity-50">
            <PenTool size={18} className="text-[#0F766E]" />
            <p className="mt-1 text-[14px] font-semibold">Open the design workspace</p>
            <p className="text-[12px] text-mt-muted">Illustrator-style tools on the real-size pieces: pen, shapes, text, curved text, layers, booleans, clipping masks, patterns, gradients, logos. {p.art.length ? `${p.art.length} element${p.art.length > 1 ? 's' : ''} so far.` : ''}</p>
          </button>
          <button type="button" disabled={!product} onClick={() => setEmbOpen(true)} className="rounded-2xl border border-mt-border p-4 text-left hover:bg-mt-surface2 disabled:opacity-50">
            <Sparkles size={18} className="text-[#7A1F3D]" />
            <p className="mt-1 text-[14px] font-semibold">Embroidery</p>
            <p className="text-[12px] text-mt-muted">Neck, yoke, border or logo embroidery: fill, satin and running stitches, thread preview, colour list and a DST machine file. {p.embroidery?.summary ? `${p.embroidery.summary.stitches.toLocaleString('en')} stitches, ${p.embroidery.summary.colours.length} colour${p.embroidery.summary.colours.length === 1 ? '' : 's'}.` : ''}</p>
          </button>
        </div>
      </section>

      {/* 3 Production files */}
      <section aria-label="Production files">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-mt-faint">3 · Production files</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className={lbl}>Roll / fabric width
            <select value={ROLLS.includes(p.rollW) ? p.rollW : 'custom'} onChange={(e) => e.target.value !== 'custom' && set({ rollW: Number(e.target.value) })} aria-label="Roll width" className={`${field} w-44`}>
              {ROLLS.map((r) => <option key={r} value={r}>{r} mm</option>)}<option value="custom">Other…</option>
            </select>
          </label>
          <label className={lbl}>Width (mm)<input type="number" value={p.rollW} min={300} max={3300} onChange={(e) => set({ rollW: Math.max(300, Number(e.target.value) || 300) })} aria-label="Roll width in mm" className={`${field} w-28`} /></label>
          <label className={lbl}>Bleed (mm)<input type="number" value={p.bleed} min={0} max={50} onChange={(e) => set({ bleed: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} aria-label="Bleed" className={`${field} w-24`} /></label>
          <label className={lbl}>Text
            <select value={p.textMode} onChange={(e) => set({ textMode: e.target.value as any })} aria-label="Text in print files" className={`${field} w-44`}><option value="outline">Outlines (safest)</option><option value="live">Live text (editable)</option></select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="h-10 px-4 rounded-full bg-[#0F766E] text-white text-[13.5px] font-semibold inline-flex items-center gap-2 disabled:opacity-50" disabled={!product || !!busy} onClick={dlPrintPdf}><Download size={15} /> {busy === 'pdf' ? 'Making…' : 'Print PDF (real size)'}</button>
          <button type="button" className={btn} disabled={!product || !!busy} onClick={dlPrintSvg}><Download size={15} /> {busy === 'svg' ? 'Making…' : 'Print SVG'}</button>
          <button type="button" className={btn} disabled={!product || !!busy} onClick={dlTechPack}><Scissors size={15} /> {busy === 'tech' ? 'Making…' : 'Tech pack PDF'}</button>
          <button type="button" className={btn} disabled={!product || !!busy} onClick={dlSketch}><Download size={15} /> Flat sketch PNG</button>
        </div>
        <p className="mt-2 text-[11.5px] text-mt-muted">Print files: every piece at real size with {p.bleed} mm bleed, magenta cut lines and registration marks, nested on the roll to save fabric. Branding appears only on the tech pack, never in the artwork.</p>
      </section>

      {msg && <p role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] rounded-full bg-mt-ink px-4 py-2 text-[13px] text-mt-bg shadow-lg">{msg}</p>}

      {studio && product && <PrintStudio garment title={`Design workspace — ${garmentLabel}`} kit={kit} pattern={DEFAULT_PATTERN} glyphs={{}} players={[]} libraryPatterns={lib}
        onSave={(art) => set({ art })} onClose={() => setStudio(false)} />}
      {embOpen && product && <EmbroideryStudio design={p.embroidery || null} pieces={product.pieces} colours={p.colours} onSave={(embroidery) => set({ embroidery })} onClose={() => setEmbOpen(false)} fileBase={safeFile(p.name)} />}
    </div>
  );
}
