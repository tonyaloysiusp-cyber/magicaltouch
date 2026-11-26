'use client';

// Packaging Dieline Studio: pick a box style, enter the inside size and the
// board, and get a print-ready dieline (cut + crease spot colours, 1:1 vector
// PDF), an artwork template with bleed, an SVG, or open it in the editor to
// design on it. Everything is calculated on this device.

import { OPEN_ACCESS } from '@/lib/access';
import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Box, CheckCircle2, Download, FileDown, PenTool, XCircle } from 'lucide-react';
import { BOX_STYLES, DEFAULT_DIE, DIE_COLOURS, boxIsoSvg, dielineSvg, makeDieline, ruleLength, type BoxStyleId, type DieOptions } from '@/lib/packaging/dieline';
import { BOARD_GRADES, caliperFor, creaseSetup, gradeById, gsmRange } from '@/lib/packaging/board';
import { checkStructure } from '@/lib/packaging/validate';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';

const SHEETS = [{ name: 'SRA3', w: 320, h: 450 }, { name: 'B2', w: 500, h: 707 }, { name: 'B1', w: 707, h: 1000 }, { name: '28 × 40 in', w: 711, h: 1016 }];
const r1 = (v: number) => Math.round(v * 10) / 10;

export function PackagingStudio() {
  const router = useRouter();
  const [o, setO] = useState<DieOptions>(() => ({ ...DEFAULT_DIE, t: caliperFor(gradeById('fbb'), 300) }));
  const [board, setBoard] = useState('fbb');
  const [gsm, setGsm] = useState(300);
  const [cutH, setCutH] = useState(23.8);
  const [crushed, setCrushed] = useState(0);
  const [unit, setUnit] = useState<'mm' | 'in'>('mm');
  const [sizeIs, setSizeIs] = useState<'inside' | 'outside'>('inside');
  const [bleed, setBleed] = useState(3);
  const [layers, setLayers] = useState({ cut: true, crease: true, bleed: true, labels: true, dims: true });
  const [zoom, setZoom] = useState(1);
  const [msg, setMsg] = useState('');
  const set = (p: Partial<DieOptions>) => setO((v) => ({ ...v, ...p }));
  const k = unit === 'in' ? 25.4 : 1;
  // Outside size → inside size: take off two board thicknesses.
  const inside = sizeIs === 'inside' ? o : { ...o, L: o.L - 2 * o.t, W: o.W - 2 * o.t, D: o.D - 2 * o.t };
  const die = useMemo(() => makeDieline(inside), [inside.style, inside.L, inside.W, inside.D, inside.t, inside.glue, inside.tuck, inside.lidDepth]); // eslint-disable-line react-hooks/exhaustive-deps
  const svg = useMemo(() => dielineSvg(die, { bleed, layers }), [die, bleed, layers]);
  const iso = useMemo(() => boxIsoSvg(die.inside), [die]);
  const knife = ruleLength(die, 'cut'), crease = ruleLength(die, 'crease');
  const ups = SHEETS.map((s) => {
    const g = 6, fit = (w: number, h: number) => Math.max(0, Math.floor((s.w - 20 + g) / (w + g))) * Math.max(0, Math.floor((s.h - 20 + g) / (h + g)));
    return { ...s, n: Math.max(fit(die.w + 2 * bleed, die.h + 2 * bleed), fit(die.h + 2 * bleed, die.w + 2 * bleed)) };
  });
  const style = BOX_STYLES.find((s) => s.id === o.style)!;
  const base = `${style.name.replace(/[^\w]+/g, '-')}_${r1(die.inside.L)}x${r1(die.inside.W)}x${r1(die.inside.D)}mm`;
  const grade = gradeById(board), range = gsmRange(grade);
  const cset = useMemo(() => creaseSetup(grade.family, o.t, { cutHeight: cutH, compressed: crushed > 0 ? crushed : undefined }), [grade.family, o.t, cutH, crushed]);
  const report = useMemo(() => checkStructure(inside, grade.family), [inside.style, inside.L, inside.W, inside.D, inside.t, inside.glue, inside.tuck, inside.lidDepth, grade.family]); // eslint-disable-line react-hooks/exhaustive-deps
  const boardName = `${grade.name}${range ? ` ${gsm} gsm` : ''} · ${r1(o.t * 100) / 100} mm · crease rule ${cset.rulePt} pt (${cset.ruleWidth} mm), channel ${cset.channelWidth} × ${cset.channelDepth} mm`;
  const pickBoard = (id: string, g = gsm) => { const b = gradeById(id), rg = gsmRange(b), gg = rg ? Math.min(rg[1], Math.max(rg[0], g)) : g; setBoard(b.id); if (rg) setGsm(gg); set({ t: caliperFor(b, gg), glue: b.glue }); };

  const save = (data: Uint8Array | Blob, name: string, type = 'application/pdf') => {
    const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  };
  const pdf = async (template: boolean) => {
    try {
      const { dielinePdf } = await import('@/lib/packaging/diePdf');
      save(await dielinePdf(die, { template, bleed, board: boardName }), `${base}_${template ? 'ARTWORK_TEMPLATE' : 'DIELINE'}.pdf`);
    } catch { setMsg('The PDF could not be made in this browser.'); }
  };
  // DXF for die makers, CAD, laser and plotter cutters: CUT (red) and CREASE (blue) layers, 1:1 mm.
  const dxfFile = async () => {
    const { pathToPolylines, writeDxf } = await import('@/lib/dxf');
    const layer = (kind: 'cut' | 'crease', name: string, color: number) => ({ name, color, polylines: die.lines.filter((l) => l.kind === kind).flatMap((l) => pathToPolylines(l.d, 0.02)) });
    save(new Blob([writeDxf([layer('cut', 'CUT', 1), layer('crease', 'CREASE', 5)], die.h)], { type: 'application/dxf' }), `${base}_DIELINE.dxf`, 'application/dxf');
  };
  const svgFile = () => save(new Blob([dielineSvg(die, { bleed, layers: { ...layers, dims: false } })], { type: 'image/svg+xml' }), `${base}_DIELINE.svg`);
  // Open the editor with the dieline as a locked guide layer, artboard = blank + bleed.
  const toEditor = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session && !OPEN_ACCESS) { router.push('/login?next=' + encodeURIComponent('/packaging-dieline')); return; }
    const mod: any = await import('fabric'); const F = mod.fabric;
    const px = 96 / 25.4, W = (die.w + 2 * bleed) * px, H = (die.h + 2 * bleed) * px;
    const objs: any[] = [];
    const add = (kind: 'cut' | 'crease', name: string) => {
      const d = die.lines.filter((l) => l.kind === kind).map((l) => l.d).join(' ');
      if (!d) return;
      const p = new F.Path(d, { fill: null, stroke: DIE_COLOURS[kind], strokeWidth: 1, strokeDashArray: kind === 'crease' ? [8, 4] : null, strokeUniform: true, name, selectable: false, evented: false, lockMovementX: true, lockMovementY: true, excludeFromExport: false });
      p.set({ scaleX: px, scaleY: px, left: (p.left + bleed) * px, top: (p.top + bleed) * px });
      objs.push(p);
    };
    for (const pn of die.panels) if (pn.face) objs.push(new F.Text(pn.name, { left: (pn.x + bleed + 3) * px, top: (pn.y + bleed + 3) * px, fontSize: 11, fill: '#9AA3AF', fontFamily: 'Arial', selectable: false, evented: false, name: `Panel label · ${pn.name} (delete before print)` }));
    add('crease', 'Dieline · crease (hide before print)'); add('cut', 'Dieline · cut (hide before print)');
    const canvas = { version: '5.1.0', background: '#FFFFFF', objects: objs.map((x) => x.toObject(['name', 'selectable', 'evented', 'lockMovementX', 'lockMovementY'])) };
    const key = newLocalKey();
    putHandoff(key, { opened: { document: { name: `${style.name} ${r1(die.inside.L)}×${r1(die.inside.W)}×${r1(die.inside.D)}`, width: W, height: H, editor: 'design' }, canvas, fonts: [], thumbnail: null, template: null, missingAssets: [] } as any, file: { handle: null, fileName: `${base}.mtd.svg` } });
    router.push(editorUrlForLocal(key, W, H));
  };

  const num = (label: string, v: number, onV: (n: number) => void, step = 1) => (
    <label className="block text-[12px]">
      <span className="text-mt-muted">{label}</span>
      <span className="mt-1 flex items-center rounded-lg border border-mt-border bg-mt-bg focus-within:border-mt-ink">
        <input type="number" step={unit === 'in' ? 0.01 : step} value={unit === 'in' ? Math.round((v / 25.4) * 100) / 100 : r1(v)} onChange={(e) => onV((Number(e.target.value) || 0) * k)} aria-label={label} className="h-9 w-full min-w-0 bg-transparent px-2 tabular-nums outline-none" />
        <span className="pr-2 text-[11px] text-mt-faint">{unit}</span>
      </span>
    </label>
  );
  const groups = ['Folding carton', 'Tray & lid', 'Corrugated'] as const;

  return (
    <div className="grid gap-3 lg:h-[calc(100dvh-6.25rem)] lg:grid-cols-[300px_minmax(0,1fr)_300px]">
      {/* Left: structure */}
      <aside aria-label="Box settings" className="space-y-4 rounded-xl border border-mt-border bg-mt-surface p-3.5 self-start lg:self-stretch lg:overflow-y-auto">
        {groups.map((g) => (
          <div key={g} role="radiogroup" aria-label={`${g} styles`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mt-faint">{g}</p>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {BOX_STYLES.filter((s) => s.group === g).map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={o.style === s.id} title={s.hint}
                  onClick={() => { const corr = s.group === 'Corrugated', b = corr ? 'bflute' : s.group === 'Tray & lid' ? 'rigid' : 'fbb', bd = gradeById(b); setBoard(b); set({ style: s.id as BoxStyleId, t: caliperFor(bd, gsm), glue: bd.glue, ...(corr && o.L < 150 ? { L: 300, W: 200, D: 150 } : {}), ...(!corr && o.L >= 250 ? { L: 80, W: 40, D: 120 } : {}) }); }}
                  className={`rounded-xl border px-2.5 py-2 text-left ${o.style === s.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:bg-mt-surface2'}`}>
                  <span className="block text-[12.5px] font-semibold leading-tight">{s.name}</span>
                  <span className={`block text-[10.5px] ${o.style === s.id ? 'text-mt-bg/70' : 'text-mt-faint'}`}>{s.code}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between gap-2">
          <div role="radiogroup" aria-label="Size is" className="inline-flex rounded-full border border-mt-border p-0.5 text-[12px]">
            {(['inside', 'outside'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={sizeIs === v} onClick={() => setSizeIs(v)} className={`h-7 rounded-full px-3 font-semibold ${sizeIs === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v === 'inside' ? 'Inside' : 'Outside'}</button>)}
          </div>
          <div role="radiogroup" aria-label="Units" className="inline-flex rounded-full border border-mt-border p-0.5 text-[12px]">
            {(['mm', 'in'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={unit === v} onClick={() => setUnit(v)} className={`h-7 rounded-full px-3 font-semibold ${unit === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {num('Length', o.L, (n) => set({ L: n }))}
          {num('Width', o.W, (n) => set({ W: n }))}
          {num(o.style === 'sleeve' ? 'Sleeve width' : 'Depth', o.D, (n) => set({ D: n }))}
        </div>
        <label className="block text-[12px]"><span className="text-mt-muted">Board</span>
          <select value={board} onChange={(e) => pickBoard(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px]">{BOARD_GRADES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        </label>
        {range && <label className="block text-[12px]"><span className="text-mt-muted">Grammage (g/m²) · published {range[0]}–{range[1]}</span>
          <span className="mt-1 flex items-center gap-2"><input type="range" min={range[0]} max={range[1]} step={5} value={gsm} onChange={(e) => pickBoard(board, Number(e.target.value))} aria-label="Board grammage slider" className="flex-1" />
          <input type="number" min={range[0]} max={range[1]} value={gsm} onChange={(e) => pickBoard(board, Number(e.target.value) || range[0])} aria-label="Board grammage" className="h-9 w-20 rounded-lg border border-mt-border bg-mt-bg px-2 tabular-nums" /></span>
          <span className="mt-1 block text-[11px] text-mt-faint">Thickness follows the {grade.source}; you can still type your own below.</span>
        </label>}
        <div className="grid grid-cols-2 gap-2">
          {num('Board thickness', o.t, (n) => set({ t: n }), 0.05)}
          {style.id !== 'tray' && style.id !== 'traylid' && num(style.group === 'Corrugated' ? "Manufacturer's joint" : 'Glue flap', o.glue, (n) => set({ glue: n }))}
          {(o.style === 'rte' || o.style === 'ste') && num('Tuck flap', o.tuck, (n) => set({ tuck: n }))}
          {o.style === 'traylid' && num('Lid depth', o.lidDepth, (n) => set({ lidDepth: n }))}
          {num('Bleed', bleed, (n) => setBleed(Math.max(0, n)), 0.5)}
        </div>
        <p className="text-[11.5px] leading-relaxed text-mt-muted">{style.hint}</p>
      </aside>

      {/* Centre: dieline */}
      <section aria-label="Dieline" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-mt-border bg-mt-surface">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-mt-border px-3 py-2">
          <span className="mr-auto text-[13px] font-semibold">{die.title}</span>
          {(['cut', 'crease', 'bleed', 'labels', 'dims'] as const).map((l) => (
            <label key={l} className="inline-flex items-center gap-1.5 rounded-full border border-mt-border px-2.5 py-1 text-[11.5px]">
              <input type="checkbox" checked={layers[l]} onChange={(e) => setLayers((v) => ({ ...v, [l]: e.target.checked }))} />
              {l === 'cut' && <span className="h-0.5 w-3" style={{ background: DIE_COLOURS.cut }} />}
              {l === 'crease' && <span className="h-0 w-3 border-t border-dashed" style={{ borderColor: DIE_COLOURS.crease }} />}
              {l === 'bleed' && <span className="h-2 w-3 rounded-sm" style={{ background: DIE_COLOURS.bleed }} />}
              {{ cut: 'Cut', crease: 'Crease', bleed: 'Bleed', labels: 'Panels', dims: 'Sizes' }[l]}
            </label>
          ))}
          <span className="ml-1 inline-flex items-center gap-1">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} className="h-7 w-7 rounded-full border border-mt-border text-[13px]">−</button>
            <span className="w-11 text-center text-[11.5px] tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.25))} className="h-7 w-7 rounded-full border border-mt-border text-[13px]">+</button>
          </span>
        </div>
        <div className="max-h-[72vh] flex-1 overflow-auto lg:max-h-none bg-[radial-gradient(circle,rgba(9,9,11,0.07)_1px,transparent_1px)] [background-size:18px_18px] p-4">
          <div role="img" aria-label={`${die.title} dieline, flat size ${r1(die.w)} by ${r1(die.h)} millimetres`} style={{ width: `${zoom * 100}%` }} className="mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:shadow-[0_10px_30px_-18px_rgba(9,9,11,0.4)]" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </section>

      {/* Right: facts + files */}
      <aside aria-label="Dieline files" className="space-y-3 self-start lg:self-stretch lg:overflow-y-auto lg:pr-0.5">
        <div className="rounded-xl border border-mt-border bg-mt-surface p-3.5">
          <div className="mx-auto h-36 w-full [&_svg]:h-full [&_svg]:w-full" aria-label="Closed box preview" role="img" dangerouslySetInnerHTML={{ __html: iso }} />
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            <dt className="text-mt-muted">Inside</dt><dd className="text-right font-semibold tabular-nums">{r1(die.inside.L / k)} × {r1(die.inside.W / k)} × {r1(die.inside.D / k)} {unit}</dd>
            <dt className="text-mt-muted">Flat blank</dt><dd className="text-right font-semibold tabular-nums">{r1(die.w / k)} × {r1(die.h / k)} {unit}</dd>
            <dt className="text-mt-muted">Knife (cut)</dt><dd className="text-right tabular-nums">{r1(knife / 1000)} m</dd>
            <dt className="text-mt-muted">Crease</dt><dd className="text-right tabular-nums">{r1(crease / 1000)} m</dd>
            {ups.map((s) => <Fragment key={s.name}><dt className="text-mt-muted">Per {s.name} sheet</dt><dd className="text-right tabular-nums">{s.n ? `${s.n} up` : 'too big'}</dd></Fragment>)}
          </dl>
          {die.notes.map((n) => <p key={n} className="mt-2 text-[11.5px] leading-relaxed text-mt-muted">{n}</p>)}
        </div>
        <section aria-label="Structure check" className="rounded-xl border border-mt-border bg-mt-surface p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Structure check</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${report.level === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : report.level === 'warn' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'}`}>
              {report.level === 'error' ? 'Will not close' : report.level === 'warn' ? 'Closes — check notes' : 'Closes'}
            </span>
          </div>
          <ul className="mt-2 space-y-2">
            {report.checks.map((c) => (
              <li key={c.id} className="flex gap-2 text-[11.5px] leading-relaxed">
                {c.level === 'ok' ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : c.level === 'warn' ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" /> : <XCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />}
                <span><b className="font-semibold">{c.title}</b> <span className="text-mt-faint">· {c.rule}</span><br /><span className="text-mt-muted">{c.detail}</span>
                  {c.fix && c.level !== 'ok' && <button type="button" onClick={() => set(c.fix!)} className="ml-1 font-semibold text-mt-primary underline-offset-2 hover:underline">Apply fix</button>}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Crease and board" className="rounded-xl border border-mt-border bg-mt-surface p-3.5">
          <p className="text-[13px] font-semibold">Crease set-up for this board</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            <dt className="text-mt-muted">Board</dt><dd className="text-right tabular-nums">{range ? `${gsm} g/m² · ` : ''}{r1(o.t * 1000) / 1000} mm</dd>
            <dt className="text-mt-muted">Crease rule</dt><dd className="text-right font-semibold tabular-nums">{cset.rulePt} pt · {cset.ruleWidth} mm</dd>
            <dt className="text-mt-muted">Crease rule height</dt><dd className="text-right font-semibold tabular-nums">{cset.ruleHeight} mm</dd>
            <dt className="text-mt-muted">Channel width</dt><dd className="text-right font-semibold tabular-nums">{cset.channelWidth} mm</dd>
            <dt className="text-mt-muted">Channel depth</dt><dd className="text-right font-semibold tabular-nums">{cset.channelDepth} mm</dd>
            <dt className="text-mt-muted">Panel allowance</dt><dd className="text-right tabular-nums">+{r1(o.t * 100) / 100} mm per panel</dd>
          </dl>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block text-[11.5px]"><span className="text-mt-muted">Cutting rule height</span><input type="number" step={0.01} value={cutH} onChange={(e) => setCutH(Number(e.target.value) || 23.8)} aria-label="Cutting rule height" className="mt-1 h-8 w-full rounded-lg border border-mt-border bg-mt-bg px-2 tabular-nums" /></label>
            {grade.family === 'corrugated' && <label className="block text-[11.5px]"><span className="text-mt-muted">Crushed thickness</span><input type="number" step={0.1} min={0} value={crushed || ''} placeholder="measure" onChange={(e) => setCrushed(Number(e.target.value) || 0)} aria-label="Crushed board thickness" className="mt-1 h-8 w-full rounded-lg border border-mt-border bg-mt-bg px-2 tabular-nums" /></label>}
          </div>
          <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-mt-faint">{cset.formula}</p>
          {cset.notes.map((n) => <p key={n} className="mt-1 text-[11px] leading-relaxed text-mt-muted">{n}</p>)}
          <p className={`mt-2 text-[11px] font-semibold ${cset.confidence === 'published' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {cset.confidence === 'published' ? 'Inside the board maker\'s published table.' : cset.confidence === 'formula' ? 'From the published formula — confirm with a crease test.' : 'Outside published tables — a starting point for your die maker only.'}
          </p>
        </section>
        <div className="space-y-2 rounded-xl border border-mt-border bg-mt-surface p-3.5">
          <button type="button" onClick={() => pdf(false)} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mt-primary text-[13.5px] font-semibold text-mt-onprimary"><FileDown size={16} /> Dieline PDF (cut + crease)</button>
          <button type="button" onClick={() => pdf(true)} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-mt-border text-[13px] font-semibold hover:bg-mt-surface2"><Download size={15} /> Artwork template PDF</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={svgFile} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-mt-border text-[13px] font-semibold hover:bg-mt-surface2"><Download size={15} /> SVG</button>
            <button type="button" onClick={dxfFile} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-mt-border text-[13px] font-semibold hover:bg-mt-surface2" title="CAD / die maker / plotter: CUT and CREASE layers in mm"><Download size={15} /> DXF</button>
          </div>
          <button type="button" onClick={toEditor} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-mt-border text-[13px] font-semibold hover:bg-mt-surface2"><PenTool size={15} /> Design on this dieline</button>
          <p className="text-[11px] leading-relaxed text-mt-muted">Cut is the spot colour <b>CutContour</b>, folds are <b>Crease</b>; both overprint and never print. The PDF is 1:1 — print or send it at 100 %.</p>
          {msg && <p role="alert" className="text-[12px] text-red-600">{msg}</p>}
        </div>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-mt-faint"><Box size={14} className="mt-0.5 shrink-0" /> Standard carton allowances. Always check a sample and confirm the final dieline with your die maker before cutting steel.</p>
      </aside>
    </div>
  );
}
