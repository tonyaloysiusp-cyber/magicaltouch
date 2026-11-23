'use client';

// Packaging panel of the design editor. Works on the current page:
//  · Box: style, product size + fitting gap, board → the dieline is drawn as
//    locked line layers on a page sized to the flat blank (artwork stays).
//  · Will it close? and the crease set-up for the board.
//  · Line type: mark any selected shape as cut, crease, perforation or glue
//    (windows, hang holes, unique shapes), or back to artwork.
//  · Press files: print PDF (vector artwork, CMYK, die lines as overprinting
//    spot colours), branded dieline template, DXF.

import { useEffect, useMemo, useState } from 'react';
import { Box, Download, Eye, EyeOff, FileDown, Lock, RefreshCw, Unlock } from 'lucide-react';
import { GLUE_ANGLES, BOX_STYLES, type BoxStyleId } from '@/lib/packaging/dieline';
import { BOARD_GRADES, caliperFor, creaseSetup, gradeById, gsmRange } from '@/lib/packaging/board';
import { checkStructure } from '@/lib/packaging/validate';
import { defaultClearance } from '@/lib/packaging/editorModel';
import { DIE_STYLE, PAGE_MARGIN, PX, dieToFabric, objectPathPx, remapBox, pageSizePx, specDieline, specInner, type DieKind, type PackSpec } from '@/lib/packaging/editorBridge';
import { StyleThumb } from '@/components/packaging/StyleThumb';

export interface PackagingApi {
  canvas: () => any;
  fabric: () => any;
  page: () => { id?: string; x: number; y: number; width: number; height: number };
  resize: (w: number, h: number) => void;
  /** change the page size without touching objects (the panel maps artwork itself) */
  resizeOnly?: (w: number, h: number) => void;
  /** artwork objects on the current page (no page frames, guides or helpers) */
  pageArtwork?: () => any[];
  commit: () => void;
  selection: () => any[];
  pressPdf: () => Promise<void>;
  notice: (m: string) => void;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
type Unit = 'mm' | 'cm' | 'in';
const UK: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };

export function defaultSpec(): PackSpec {
  const g = gradeById('sbs');
  return { style: 'rte', product: { L: 50, W: 50, H: 50 }, clearance: defaultClearance(g.family), grade: g.id, gsm: 350, t: caliperFor(g, 350), glue: g.glue, tuck: 15, lidDepth: 30 };
}

/** Number field that commits on Enter or when it loses focus — typing "12.5" never redraws at "1". */
function Field({ label, value, onChange, unit = 'mm', step = 0.5, onFocusChange }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; onFocusChange?: (on: boolean) => void }) {
  const [txt, setTxt] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setTxt(String(value)); }, [value, editing]);
  const commit = () => { setEditing(false); const v = Number(txt.replace(',', '.')); if (txt !== '' && isFinite(v) && v >= 0) onChange(v); else setTxt(String(value)); };
  return (
    <label className="block text-[11.5px]">
      <span className="text-mt-muted">{label}</span>
      <span className="mt-0.5 flex h-8 items-center rounded-md border border-mt-border bg-mt-bg focus-within:border-mt-ink/50">
        <input inputMode="decimal" value={txt} aria-label={label} onFocus={() => { setEditing(true); onFocusChange?.(true); }} onChange={(e) => setTxt(e.target.value)} onBlur={() => { commit(); onFocusChange?.(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); } if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const v = Math.max(0, Math.round(((Number(txt) || 0) + (e.key === 'ArrowUp' ? step : -step) * (e.shiftKey ? 10 : 1)) * 1000) / 1000); setTxt(String(v)); onChange(v); } }}
          className="h-full w-full min-w-0 bg-transparent px-2 text-[12.5px] tabular-nums outline-none" />
        <span className="pr-2 text-[10.5px] text-mt-faint">{unit}</span>
      </span>
    </label>
  );
}

/** Which edge is Length, Width and Height: L and W are the opening, H runs from the opening to the base. */
function BoxAxes({ hl }: { hl: 'L' | 'W' | 'H' | null }) {
  const c = (k: 'L' | 'W' | 'H') => (hl === k ? '#2563eb' : 'currentColor');
  const w = (k: 'L' | 'W' | 'H') => (hl === k ? 2.4 : 1.2);
  return (
    <svg viewBox="0 0 150 92" className="h-[84px] w-full text-mt-muted" aria-label="Length is the longer side of the opening, width the shorter side, height from the opening to the base">
      <path d="M40 30 L90 18 L120 28 L70 40 Z" fill="#2563eb" fillOpacity={0.08} stroke="currentColor" strokeWidth={0.8} />
      <path d="M40 30 L40 72 L70 84 L70 40 Z M70 40 L70 84 L120 72 L120 28" fill="none" stroke="currentColor" strokeWidth={0.8} />
      <path d="M40 30 L70 40" stroke={c('W')} strokeWidth={w('W')} /><path d="M70 40 L120 28" stroke={c('L')} strokeWidth={w('L')} /><path d="M120 28 L120 72" stroke={c('H')} strokeWidth={w('H')} />
      <text x="96" y="44" fontSize="9" fill={c('L')} fontWeight={hl === 'L' ? 700 : 500}>L</text>
      <text x="50" y="44" fontSize="9" fill={c('W')} fontWeight={hl === 'W' ? 700 : 500}>W</text>
      <text x="125" y="54" fontSize="9" fill={c('H')} fontWeight={hl === 'H' ? 700 : 500}>H</text>
      <text x="62" y="27" fontSize="6.5" fill="currentColor">opening</text>
    </svg>
  );
}

export function PackagingPanel({ api }: { api: PackagingApi }) {
  const readSpec = (): PackSpec | null => {
    const c = api.canvas(); if (!c) return null;
    const page = api.page();
    const cut = c.getObjects().find((o: any) => o.__dieGen && o.__pack && (!page.id || o.__artboardId === page.id || !o.__artboardId));
    try { return cut ? JSON.parse(cut.__pack) : null; } catch { return null; }
  };
  const [spec, setSpec] = useState<PackSpec>(() => readSpec() || defaultSpec());
  const [applied, setApplied] = useState<string | null>(() => { const s = readSpec(); return s ? JSON.stringify(s) : null; });
  const [unit, setUnit] = useState<Unit>(() => { try { return (localStorage.getItem('mt-pack-unit') as Unit) || 'mm'; } catch { return 'mm'; } });
  useEffect(() => { try { localStorage.setItem('mt-pack-unit', unit); } catch { /* optional */ } }, [unit]);
  const u = (mm: number) => r2(mm / UK[unit]), toMm = (v: number) => Math.round(v * UK[unit] * 1000) / 1000;
  const stepU = unit === 'mm' ? 1 : unit === 'cm' ? 0.1 : 0.05, fine = unit === 'mm' ? 0.01 : unit === 'cm' ? 0.001 : 0.001;
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'box' | 'lines' | 'files'>('box');
  const [focusKey, setFocusKey] = useState<'L' | 'W' | 'H' | null>(null);
  const [, bump] = useState(0);
  useEffect(() => { const c = api.canvas(); if (!c) return; const f = () => bump((x) => x + 1); c.on('selection:created', f); c.on('selection:updated', f); c.on('selection:cleared', f); return () => { c.off('selection:created', f); c.off('selection:updated', f); c.off('selection:cleared', f); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = gradeById(spec.grade), range = gsmRange(grade);
  const die = useMemo(() => specDieline(spec), [spec]);
  const inner = specInner(spec), outer = { L: inner.L + 2 * spec.t, W: inner.W + 2 * spec.t, D: inner.D + 2 * spec.t };
  const report = useMemo(() => { const i = specInner(spec); return checkStructure({ style: spec.style, L: i.L, W: i.W, D: i.D, t: spec.t, glue: spec.glue, tuck: spec.tuck, lidDepth: spec.lidDepth }, grade.family); }, [spec, grade.family]);
  const crease = useMemo(() => creaseSetup(grade.family, spec.t), [grade.family, spec.t]);
  const set = (p: Partial<PackSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setBoard = (id: string, gsm: number) => setSpec((s) => { const g = gradeById(id), prev = gradeById(s.grade), same = g.family === prev.family; return { ...s, grade: g.id, gsm, t: caliperFor(g, gsm), glue: same ? s.glue : g.glue, clearance: same ? s.clearance : defaultClearance(g.family) }; });
  const dirty = applied !== JSON.stringify(spec);
  const hasDie = applied != null;

  const dieObjs = () => { const c = api.canvas(); const page = api.page(); return c ? c.getObjects().filter((o: any) => o.__die && (!page.id || !o.__artboardId || o.__artboardId === page.id)) : []; };

  /** Draw (or redraw) the dieline on this page. Artwork moves and resizes with the panel it sits on. */
  const apply = () => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F) return;
    const page = api.page();
    const onPage = (o: any) => !page.id || !o.__artboardId || o.__artboardId === page.id;
    let prev: PackSpec | null = null; try { prev = applied ? JSON.parse(applied) : null; } catch { prev = null; }
    const oldDie = prev ? specDieline(prev) : null;
    const origin = { x: page.x + PAGE_MARGIN * PX, y: page.y + PAGE_MARGIN * PX };
    // plan where each artwork object goes before anything moves
    const art = oldDie ? (api.pageArtwork ? api.pageArtwork() : c.getObjects().filter((o: any) => onPage(o) && !o.__isArtboard)).filter((o: any) => !o.__dieGen) : [];
    const plans = art.map((o: any) => { const r = o.getBoundingRect(true, true); return { o, plan: remapBox({ x: (r.left - origin.x) / PX, y: (r.top - origin.y) / PX, w: r.width / PX, h: r.height / PX }, oldDie!, die) }; });
    c.getObjects().filter((o: any) => o.__dieGen && onPage(o)).forEach((o: any) => c.remove(o));
    const size = pageSizePx(die);
    if (Math.abs(page.width - size.width) > 1 || Math.abs(page.height - size.height) > 1) (api.resizeOnly || api.resize)(size.width, size.height);
    const p2 = api.page(), o2 = { x: p2.x + PAGE_MARGIN * PX, y: p2.y + PAGE_MARGIN * PX };
    if (api.resizeOnly) for (const { o, plan } of plans) {
      o.set({ scaleX: (o.scaleX || 1) * plan.fx, scaleY: (o.scaleY || 1) * plan.fy });
      o.setPositionByOrigin(new F.Point(o2.x + plan.cx * PX, o2.y + plan.cy * PX), 'center', 'center');
      o.setCoords();
    }
    const objs = dieToFabric(F, die, o2, spec);
    objs.forEach((o) => { c.add(o); c.bringToFront(o); });
    c.requestRenderAll();
    api.commit();
    setApplied(JSON.stringify(spec));
    api.notice(hasDie ? `Dieline updated — ${plans.length} artwork object${plans.length === 1 ? '' : 's'} moved with their panels.` : 'Dieline added. Design on the page; the die lines are locked layers.');
  };

  const markAs = (kind: DieKind | 'art') => {
    const sel = api.selection().filter((o: any) => !o.__dieGen);
    if (!sel.length) { api.notice('Select a line or shape first (draw it with the shape, line or pen tools).'); return; }
    for (const o of sel) {
      if (kind === 'art') { o.__die = undefined; o.set({ strokeDashArray: null }); continue; }
      const st = DIE_STYLE[kind];
      o.__die = kind;
      o.set({ stroke: st.colour, strokeWidth: 1, strokeUniform: true, strokeDashArray: st.dash, fill: o.type === 'textbox' || o.type === 'i-text' ? o.fill : '' });
      if (!/^Die · /.test(o.name || '')) o.set({ name: `Die · ${st.name}` });
    }
    api.canvas()?.requestRenderAll(); api.commit();
    api.notice(kind === 'art' ? 'Back to artwork.' : `Marked as ${DIE_STYLE[kind].name} — it prints on that spot plate in the press PDF.`);
  };
  const toggleDie = (what: 'visible' | 'locked') => {
    const objs = dieObjs(); if (!objs.length) return;
    const on = what === 'visible' ? !objs.every((o: any) => o.visible !== false) : !objs.every((o: any) => o.locked);
    for (const o of objs) {
      if (what === 'visible') o.set({ visible: on });
      else o.set({ locked: on, lockMovementX: on, lockMovementY: on, lockScalingX: on, lockScalingY: on, lockRotation: on, hasControls: !on, selectable: !on, evented: !on, perPixelTargetFind: true });
    }
    api.canvas()?.requestRenderAll(); api.commit();
  };

  const run = async (label: string, f: () => Promise<void>) => { setBusy(label); try { await f(); } catch (e: any) { api.notice(e?.message || 'Export failed.'); } finally { setBusy(null); } };
  const dieLinesMm = () => {
    const page = api.page();
    return dieObjs().filter((o: any) => o.visible !== false).map((o: any) => ({ kind: o.__die as DieKind, d: pxToMm(objectPath(o), page) })).filter((l: any) => l.d);
  };
  const templatePdf = () => run('Building the dieline template…', async () => {
    const [{ newDoc, regenerate }, { editorPdf }] = await Promise.all([import('@/lib/packaging/editorModel'), import('@/lib/packaging/editorPdf')]);
    const base = newDoc('Dieline');
    const doc = regenerate({ ...base, name: `${BOX_STYLES.find((s) => s.id === spec.style)?.name || 'Box'} ${r2(inner.L)}×${r2(inner.W)}×${r2(inner.D)}`, box: { ...base.box, ...spec } as any });
    // add hand-marked die lines (not generated) from the page
    const page = api.page();
    for (const o of dieObjs().filter((x: any) => !x.__dieGen && x.visible !== false)) { const d = pxToMm(objectPath(o), page, PAGE_MARGIN); if (d) doc.objects.push({ id: `m${doc.objects.length}`, name: o.name || 'Line', layer: 'structure', kind: 'path', d, x: 0, y: 0, w: 0, h: 0, line: o.__die }); }
    let logo: Uint8Array | null = null; try { logo = new Uint8Array(await (await fetch('/logo.png')).arrayBuffer()); } catch { /* optional */ }
    const bytes = await editorPdf({ doc, mode: 'template', textPaths: {}, logoPng: logo, board: `${grade.name}${range ? ` ${spec.gsm} g/m²` : ''} · ${spec.t} mm · crease ${crease.rulePt} pt, channel ${crease.channelWidth} × ${crease.channelDepth} mm` });
    save(new Blob([bytes as BlobPart], { type: 'application/pdf' }), 'dieline-template.pdf');
  });
  const dxf = () => run('Building DXF…', async () => {
    const { pathToPolylines, writeDxf } = await import('@/lib/dxf');
    const lines = dieLinesMm();
    const layer = (k: DieKind, name: string, color: number) => ({ name, color, polylines: lines.filter((l: any) => l.kind === k).flatMap((l: any) => pathToPolylines(l.d)) });
    const page = api.page();
    const txt = writeDxf([layer('cut', 'CUT', 6), layer('crease', 'CREASE', 5), layer('perf', 'PERF', 30), layer('glue', 'GLUE', 3)].filter((l) => l.polylines.length), page.height / PX);
    save(new Blob([txt], { type: 'application/dxf' }), 'dieline.dxf');
  });
  const sel = api.selection();
  const iconBtn = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-mt-border px-2 text-[11.5px] font-semibold hover:bg-mt-surface2';

  return (
    <div className="space-y-4 text-[12px]">
      <div role="tablist" aria-label="Packaging" className="grid grid-cols-3 rounded-lg border border-mt-border p-0.5">
        {([['box', 'Box'], ['lines', 'Lines'], ['files', 'Files']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-7 rounded-md text-[12px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{label}</button>
        ))}
      </div>
      {tab === 'box' && <>
      {/* Box */}
      <section>
        <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Box style</p>
        <div className="grid grid-cols-2 gap-1.5">
          {BOX_STYLES.map((s) => (
            <button key={s.id} type="button" title={s.hint} aria-pressed={spec.style === s.id}
              onClick={() => setSpec((cur) => { const corr = s.group === 'Corrugated', was = gradeById(cur.grade).family === 'corrugated'; const n = { ...cur, style: s.id as BoxStyleId }; if (corr === was) return n; const g = gradeById(corr ? 'bflute' : 'sbs'), gsm = corr ? 0 : 350; return { ...n, grade: g.id, gsm, t: caliperFor(g, gsm), glue: g.glue, clearance: defaultClearance(g.family) }; })}
              className={`rounded-lg border p-1.5 text-left ${spec.style === s.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border hover:border-mt-ink/40'}`}>
              <span className="block text-mt-ink/80"><StyleThumb id={s.id} className="h-12 w-full" /></span>
              <span className="block truncate text-[11px] font-semibold">{s.name}</span>
              <span className="block truncate text-[10px] text-mt-faint">{s.code}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Size</p>
          <div className="inline-flex rounded-md border border-mt-border p-0.5" role="radiogroup" aria-label="Units">
            {(['mm', 'cm', 'in'] as Unit[]).map((x) => <button key={x} type="button" role="radio" aria-checked={unit === x} onClick={() => setUnit(x)} className={`h-6 rounded px-2 text-[11px] font-semibold ${unit === x ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{x}</button>)}
          </div>
        </div>
        <select value={spec.mode || 'product'} onChange={(e) => { const m = e.target.value as PackSpec['mode']; const i = specInner(spec); const t2 = spec.t; set({ mode: m, product: m === 'inside' ? { L: i.L, W: i.W, H: i.D } : m === 'outside' ? { L: r2(i.L + 2 * t2), W: r2(i.W + 2 * t2), H: r2(i.D + 2 * t2) } : { L: r2(i.L - spec.clearance.L), W: r2(i.W - spec.clearance.W), H: r2(i.D - spec.clearance.H) } }); }} aria-label="Size means" className="mb-1.5 h-8 w-full rounded-md border border-mt-border bg-mt-bg px-2 text-[12px]">
          <option value="product">Product size (+ fitting gap)</option>
          <option value="inside">Box inside size</option>
          <option value="outside">Box outside size</option>
        </select>
        <div className="grid grid-cols-3 gap-1.5">
          {(['L', 'W', 'H'] as const).map((k) => <Field key={k} label={k === 'L' ? 'Length' : k === 'W' ? 'Width' : 'Height'} unit={unit} step={stepU} value={u(spec.product[k])} onChange={(v) => set({ product: { ...spec.product, [k]: toMm(v) } })} onFocusChange={(on) => setFocusKey(on ? k : null)} />)}
        </div>
        <BoxAxes hl={focusKey} />
        <p className="text-[10.5px] leading-snug text-mt-faint">L = longer side of the opening · W = shorter side · H = from the opening to the base. Inside sizes, as box makers quote them.</p>
        {spec.product.W > spec.product.L && <p className="mt-1 text-[11px] text-amber-600">Width is larger than length. <button type="button" onClick={() => set({ product: { ...spec.product, L: spec.product.W, W: spec.product.L } })} className="font-semibold underline-offset-2 hover:underline">Swap them</button></p>}
        {(spec.mode || 'product') === 'product' && <>
          <p className="mt-1.5 text-[11px] text-mt-muted">Fitting gap added (total per size)</p>
          <div className="mt-0.5 grid grid-cols-3 gap-1.5">
            {(['L', 'W', 'H'] as const).map((k) => <Field key={k} label={`+ ${k}`} unit={unit} step={stepU / 2} value={u(spec.clearance[k])} onChange={(v) => set({ clearance: { ...spec.clearance, [k]: toMm(v) } })} />)}
          </div>
        </>}
      </section>
      <section className="space-y-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Board</p>
        <select value={spec.grade} onChange={(e) => { const g = gradeById(e.target.value), rg = gsmRange(g); setBoard(g.id, rg ? Math.min(rg[1], Math.max(rg[0], spec.gsm)) : spec.gsm); }} aria-label="Board" className="h-8 w-full rounded-md border border-mt-border bg-mt-bg px-2 text-[12.5px]">{BOARD_GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        {range && <label className="block text-[11.5px]"><span className="text-mt-muted">Weight · {spec.gsm} g/m² → {spec.t} mm</span><input type="range" min={range[0]} max={range[1]} step={5} value={spec.gsm} onChange={(e) => setBoard(spec.grade, Number(e.target.value))} aria-label="Board weight" className="w-full" /></label>}
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="Thickness" unit={unit} step={fine * 10} value={unit === 'mm' ? spec.t : Math.round(spec.t / UK[unit] * 10000) / 10000} onChange={(v) => set({ t: toMm(v) })} />
          <Field label="Glue flap" unit={unit} step={stepU} value={u(spec.glue)} onChange={(v) => set({ glue: toMm(v) })} />
          {(spec.style === 'rte' || spec.style === 'ste') && <Field label="Tuck depth" unit={unit} step={stepU} value={u(spec.tuck)} onChange={(v) => set({ tuck: toMm(v) })} />}
          {spec.style === 'traylid' && <Field label="Lid depth" unit={unit} step={stepU} value={u(spec.lidDepth)} onChange={(v) => set({ lidDepth: toMm(v) })} />}
        </div>
      </section>
      {!['tray', 'traylid'].includes(spec.style) && <section className="space-y-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Glue flap{spec.style === 'rte' || spec.style === 'ste' ? ' & tuck' : ''}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {['rte', 'ste', 'seal', 'sleeve'].includes(spec.style) && <label className="block text-[11.5px]"><span className="text-mt-muted">Attached to</span>
            <select value={spec.gluePos || 'side'} onChange={(e) => set({ gluePos: e.target.value as 'side' | 'back' })} aria-label="Glue flap attached to" className="h-8 w-full rounded-md border border-mt-border bg-mt-bg px-1.5 text-[12px]">
              <option value="side">Side panel</option><option value="back">Back panel</option>
            </select></label>}
          <label className="block text-[11.5px]"><span className="text-mt-muted">End angle</span>
            <select value={spec.glueAngle ?? 45} onChange={(e) => set({ glueAngle: Number(e.target.value) })} aria-label="Glue flap end angle" className="h-8 w-full rounded-md border border-mt-border bg-mt-bg px-1.5 text-[12px]">
              {GLUE_ANGLES.map((a) => <option key={a} value={a}>{a === 0 ? 'Straight (0°)' : `${a}°`}</option>)}
            </select></label>
        </div>
        {(spec.style === 'rte' || spec.style === 'ste') && <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!spec.thumbNotch} onChange={(e) => set({ thumbNotch: e.target.checked })} /> Thumb notch on the front panel</label>}
        <p className="text-[11px] text-mt-faint">Folder-gluer lines usually want 15–22 mm flaps with 7–15° ends; hand-glued samples are fine at 30–45°. Ask your converter for their machine’s numbers.</p>
      </section>}
      <section className="rounded-lg border border-mt-border p-2.5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 tabular-nums">
          <dt className="text-mt-muted">Inside</dt><dd className="text-right font-semibold">{u(inner.L)} × {u(inner.W)} × {u(inner.D)} {unit}</dd>
          <dt className="text-mt-muted">Outside</dt><dd className="text-right">{u(outer.L)} × {u(outer.W)} × {u(outer.D)} {unit}</dd>
          <dt className="text-mt-muted">Flat blank</dt><dd className="text-right">{u(die.w)} × {u(die.h)} {unit}</dd>
          <dt className="text-mt-muted">Crease rule</dt><dd className="text-right">{crease.rulePt} pt · channel {crease.channelWidth} × {crease.channelDepth}</dd>
        </dl>
        <p className={`mt-2 text-[11.5px] font-semibold ${report.level === 'error' ? 'text-rose-600' : report.level === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>{report.level === 'error' ? 'Will not close' : report.level === 'warn' ? 'Closes — check the notes' : `Closes — all ${report.checks.length} checks pass`}</p>
        <ul className="mt-1 space-y-1">{report.checks.filter((c) => c.level !== 'ok').map((c) => <li key={c.id} className="text-[11px] leading-snug text-mt-muted"><b className={c.level === 'error' ? 'text-rose-600' : 'text-amber-600'}>{c.title}.</b> {c.detail}{c.fix && <button type="button" onClick={() => set(c.fix as any)} className="ml-1 font-semibold text-mt-ink underline-offset-2 hover:underline">Fix</button>}</li>)}</ul>
      </section>
      <button type="button" onClick={apply} disabled={hasDie && !dirty} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-mt-ink text-[13px] font-semibold text-mt-bg disabled:opacity-40">
        {hasDie ? <><RefreshCw size={15} /> {dirty ? 'Update the dieline' : 'Dieline is up to date'}</> : <><Box size={15} /> Add this dieline to the page</>}
      </button>
      </>}

      {tab === 'lines' && <>
      {/* Lines */}
      <section className="space-y-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Die lines</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => toggleDie('visible')} className={iconBtn}>{dieObjs().every((o: any) => o.visible !== false) ? <><EyeOff size={13} /> Hide lines</> : <><Eye size={13} /> Show lines</>}</button>
          <button type="button" onClick={() => toggleDie('locked')} className={iconBtn}>{dieObjs().every((o: any) => o.locked) ? <><Unlock size={13} /> Unlock</> : <><Lock size={13} /> Lock</>}</button>
        </div>
        <p className="text-[11px] text-mt-muted">Mark the selected shape{sel.length > 1 ? 's' : ''} as:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['cut', 'crease', 'perf', 'glue'] as DieKind[]).map((k) => (
            <button key={k} type="button" onClick={() => markAs(k)} disabled={!sel.length} className={`${iconBtn} disabled:opacity-40`}>
              <svg width="18" height="6" aria-hidden><line x1="1" y1="3" x2="17" y2="3" stroke={DIE_STYLE[k].colour} strokeWidth="2" strokeDasharray={DIE_STYLE[k].dash ? '3 2' : undefined} /></svg>{DIE_STYLE[k].name.replace(' (CutContour)', '').replace(' (fold)', '')}
            </button>
          ))}
          <button type="button" onClick={() => markAs('art')} disabled={!sel.length} className={`${iconBtn} col-span-2 disabled:opacity-40`}>Back to artwork</button>
        </div>
        <p className="text-[10.5px] leading-relaxed text-mt-faint">Draw windows, hang holes or a unique outline with the shape, line or pen tools, then mark them here. They join the dieline in every export.</p>
      </section>

      </>}

      {tab === 'files' && <>
      {/* Files */}
      <section className="space-y-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Press files</p>
        <button type="button" onClick={() => run('Building the print PDF…', api.pressPdf)} disabled={!!busy} className={`${iconBtn} w-full justify-start`}><FileDown size={14} /> Print PDF — vector, CMYK, die lines as spot colours</button>
        <button type="button" onClick={templatePdf} disabled={!!busy} className={`${iconBtn} w-full justify-start`}><Download size={14} /> Dieline template PDF (branded)</button>
        <button type="button" onClick={dxf} disabled={!!busy} className={`${iconBtn} w-full justify-start`}><Download size={14} /> DXF for the die maker</button>
        {busy && <p role="status" className="text-[11px] text-mt-muted">{busy}</p>}
        <p className="text-[10.5px] leading-relaxed text-mt-faint">Save the project as .mtd from the File menu — it opens again with every layer editable.</p>
      </section>
      </>}
    </div>
  );
}

const objectPath = (o: any): string | null => objectPathPx(o);
/** Canvas-pixel path → page millimetres (from the page's top-left, or from the blank origin when `shift` mm is given). */
function pxToMm(d: string | null, page: { x: number; y: number }, shift = 0): string {
  if (!d) return '';
  let i = 0;
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/gi, (v) => { const n = Number(v), out = (i % 2 === 0 ? (n - page.x) / PX : (n - page.y) / PX) - shift; i++; return String(Math.round(out * 100) / 100); });
}
function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
