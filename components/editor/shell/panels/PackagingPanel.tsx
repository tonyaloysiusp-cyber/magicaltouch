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
import { BOX_STYLES, type BoxStyleId } from '@/lib/packaging/dieline';
import { BOARD_GRADES, caliperFor, creaseSetup, gradeById, gsmRange } from '@/lib/packaging/board';
import { checkStructure } from '@/lib/packaging/validate';
import { defaultClearance } from '@/lib/packaging/editorModel';
import { DIE_STYLE, PAGE_MARGIN, PX, dieToFabric, objectPathPx, pageSizePx, specDieline, specInner, type DieKind, type PackSpec } from '@/lib/packaging/editorBridge';
import { StyleThumb } from '@/components/packaging/StyleThumb';

export interface PackagingApi {
  canvas: () => any;
  fabric: () => any;
  page: () => { id?: string; x: number; y: number; width: number; height: number };
  resize: (w: number, h: number) => void;
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

function Field({ label, value, onChange, unit = 'mm', step = 0.5 }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number }) {
  return (
    <label className="block text-[11.5px]">
      <span className="text-mt-muted">{label}</span>
      <span className="mt-0.5 flex h-8 items-center rounded-md border border-mt-border bg-mt-bg focus-within:border-mt-ink/50">
        <input type="number" step={step} value={value} onChange={(e) => { const v = Number(e.target.value); if (e.target.value !== '' && isFinite(v) && v >= 0) onChange(v); }} aria-label={label} className="h-full w-full min-w-0 bg-transparent px-2 text-[12.5px] tabular-nums outline-none" />
        <span className="pr-2 text-[10.5px] text-mt-faint">{unit}</span>
      </span>
    </label>
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
  const [unit, setUnit] = useState<Unit>('mm');
  const [busy, setBusy] = useState<string | null>(null);
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

  /** Draw (or redraw) the dieline on this page; artwork stays. */
  const apply = () => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F) return;
    c.getObjects().filter((o: any) => o.__dieGen && (!api.page().id || !o.__artboardId || o.__artboardId === api.page().id)).forEach((o: any) => c.remove(o));
    const size = pageSizePx(die), page = api.page();
    if (Math.abs(page.width - size.width) > 1 || Math.abs(page.height - size.height) > 1) api.resize(size.width, size.height);
    const p2 = api.page();
    const objs = dieToFabric(F, die, { x: p2.x + PAGE_MARGIN * PX, y: p2.y + PAGE_MARGIN * PX }, spec);
    objs.forEach((o) => { c.add(o); c.bringToFront(o); });
    c.requestRenderAll();
    api.commit();
    setApplied(JSON.stringify(spec));
    api.notice(hasDie ? 'Dieline updated — artwork kept on the page.' : 'Dieline added. Design on the page; the die lines are locked layers.');
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
      else o.set({ locked: on, lockMovementX: on, lockMovementY: on, lockScalingX: on, lockScalingY: on, lockRotation: on, hasControls: !on });
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
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Product size</p>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Units" className="h-6 rounded border border-mt-border bg-mt-bg px-1 text-[11px]"><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['L', 'W', 'H'] as const).map((k) => <Field key={k} label={k === 'L' ? 'Length' : k === 'W' ? 'Width' : 'Height'} unit={unit} step={unit === 'mm' ? 1 : 0.1} value={r2(spec.product[k] / UK[unit])} onChange={(v) => set({ product: { ...spec.product, [k]: r2(v * UK[unit]) } })} />)}
        </div>
        <p className="mt-1.5 text-[11px] text-mt-muted">Fitting gap added (total per size)</p>
        <div className="mt-0.5 grid grid-cols-3 gap-1.5">
          {(['L', 'W', 'H'] as const).map((k) => <Field key={k} label={`+ ${k}`} value={spec.clearance[k]} onChange={(v) => set({ clearance: { ...spec.clearance, [k]: v } })} />)}
        </div>
      </section>
      <section className="space-y-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Board</p>
        <select value={spec.grade} onChange={(e) => { const g = gradeById(e.target.value), rg = gsmRange(g); setBoard(g.id, rg ? Math.min(rg[1], Math.max(rg[0], spec.gsm)) : spec.gsm); }} aria-label="Board" className="h-8 w-full rounded-md border border-mt-border bg-mt-bg px-2 text-[12.5px]">{BOARD_GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        {range && <label className="block text-[11.5px]"><span className="text-mt-muted">Weight · {spec.gsm} g/m² → {spec.t} mm</span><input type="range" min={range[0]} max={range[1]} step={5} value={spec.gsm} onChange={(e) => setBoard(spec.grade, Number(e.target.value))} aria-label="Board weight" className="w-full" /></label>}
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="Thickness" value={spec.t} step={0.01} onChange={(v) => set({ t: v })} />
          <Field label="Glue flap" value={spec.glue} onChange={(v) => set({ glue: v })} />
          {(spec.style === 'rte' || spec.style === 'ste') && <Field label="Tuck depth" value={spec.tuck} onChange={(v) => set({ tuck: v })} />}
          {spec.style === 'traylid' && <Field label="Lid depth" value={spec.lidDepth} onChange={(v) => set({ lidDepth: v })} />}
        </div>
      </section>
      <section className="rounded-lg border border-mt-border p-2.5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 tabular-nums">
          <dt className="text-mt-muted">Inside</dt><dd className="text-right font-semibold">{r2(inner.L)} × {r2(inner.W)} × {r2(inner.D)} mm</dd>
          <dt className="text-mt-muted">Outside</dt><dd className="text-right">{r2(outer.L)} × {r2(outer.W)} × {r2(outer.D)} mm</dd>
          <dt className="text-mt-muted">Flat blank</dt><dd className="text-right">{r2(die.w)} × {r2(die.h)} mm</dd>
          <dt className="text-mt-muted">Crease rule</dt><dd className="text-right">{crease.rulePt} pt · channel {crease.channelWidth} × {crease.channelDepth}</dd>
        </dl>
        <p className={`mt-2 text-[11.5px] font-semibold ${report.level === 'error' ? 'text-rose-600' : report.level === 'warn' ? 'text-amber-600' : 'text-emerald-600'}`}>{report.level === 'error' ? 'Will not close' : report.level === 'warn' ? 'Closes — check the notes' : `Closes — all ${report.checks.length} checks pass`}</p>
        <ul className="mt-1 space-y-1">{report.checks.filter((c) => c.level !== 'ok').map((c) => <li key={c.id} className="text-[11px] leading-snug text-mt-muted"><b className={c.level === 'error' ? 'text-rose-600' : 'text-amber-600'}>{c.title}.</b> {c.detail}{c.fix && <button type="button" onClick={() => set(c.fix as any)} className="ml-1 font-semibold text-mt-ink underline-offset-2 hover:underline">Fix</button>}</li>)}</ul>
      </section>
      <button type="button" onClick={apply} disabled={hasDie && !dirty} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-mt-ink text-[13px] font-semibold text-mt-bg disabled:opacity-40">
        {hasDie ? <><RefreshCw size={15} /> {dirty ? 'Update the dieline' : 'Dieline is up to date'}</> : <><Box size={15} /> Add this dieline to the page</>}
      </button>

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

      {/* Files */}
      <section className="space-y-1.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Press files</p>
        <button type="button" onClick={() => run('Building the print PDF…', api.pressPdf)} disabled={!!busy} className={`${iconBtn} w-full justify-start`}><FileDown size={14} /> Print PDF — vector, CMYK, die lines as spot colours</button>
        <button type="button" onClick={templatePdf} disabled={!!busy} className={`${iconBtn} w-full justify-start`}><Download size={14} /> Dieline template PDF (branded)</button>
        <button type="button" onClick={dxf} disabled={!!busy} className={`${iconBtn} w-full justify-start`}><Download size={14} /> DXF for the die maker</button>
        {busy && <p role="status" className="text-[11px] text-mt-muted">{busy}</p>}
        <p className="text-[10.5px] leading-relaxed text-mt-faint">Save the project as .mtd from the File menu — it opens again with every layer editable.</p>
      </section>
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
