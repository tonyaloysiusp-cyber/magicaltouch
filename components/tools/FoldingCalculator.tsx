'use client';

// Folding calculator: brochures, leaflets, cards and maps. Panel widths with
// creep compensation, fold positions and order, the flat layout (outside /
// inside), a folded preview, a PDF check (Pro), and Download & print: the
// branded layout template and job report, and the unbranded print files.

import { useMemo, useState } from 'react';
import { ExternalLink, FileSearch, Loader2 } from 'lucide-react';
import { foldPrintJob, printJobEditorUrl } from '@/lib/print/printJob';
import { FOLDS, calculateFold, foldability, foldDiagramSvg, checkPdfForFold, type FoldType, type PdfInspect } from '@/lib/fold';
import { PAPER_SIZES } from '@/lib/printSizes';
import { PAPER_PROFILES, estimateCaliper } from '@/lib/binding';
import { ModeSwitch, PrintDownloadPanel, usePro } from './PrintDownloadPanel';

const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px]';
const lbl = 'block text-[12px] text-mt-muted';

export function FoldingCalculator() {
  const [sizeId, setSizeId] = useState('a4');
  const [landscape, setLandscape] = useState(true);
  const [cw, setCw] = useState(297), [ch, setCh] = useState(210);
  const [type, setType] = useState<FoldType>('tri');
  const [panels, setPanels] = useState(6);
  const [gsm, setGsm] = useState(150), [profile, setProfile] = useState('matt');
  const [bleed, setBleed] = useState(3), [safe, setSafe] = useState(5);
  const [grain, setGrain] = useState<'parallel' | 'across' | 'unknown'>('unknown'), [darkInk, setDarkInk] = useState(false);
  const [custom, setCustom] = useState<number[] | null>(null);
  const [dirs, setDirs] = useState<('valley' | 'mountain')[]>([]);
  const [side, setSide] = useState<'outside' | 'inside'>('outside');
  const [angle, setAngle] = useState(60);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ name: string; res: PdfInspect } | null>(null);
  const [pro, setPro] = usePro();
  const size = PAPER_SIZES.find((p) => p.id === sizeId);
  const W = sizeId === 'custom' ? cw : size ? (landscape ? Math.max(size.w, size.h) : Math.min(size.w, size.h)) : 297;
  const H = sizeId === 'custom' ? ch : size ? (landscape ? Math.min(size.w, size.h) : Math.max(size.w, size.h)) : 210;
  const caliper = estimateCaliper(gsm, profile) / 1000;
  const r = useMemo(() => calculateFold({ type, w: W, h: H, panels, caliper, bleed, safe, widths: custom || undefined, dirs }), [type, W, H, panels, caliper, bleed, safe, custom, dirs]);
  const svg = useMemo(() => foldDiagramSvg(r, side, bleed, safe), [r, side, bleed, safe]);
  // The print job: handed to the editor (both sides, fold guides) and to Download & print.
  const fa = useMemo(() => foldability({ gsm, caliper, coated: profile !== 'uncoated' && profile !== 'bookwove', grain, type, layers: Math.max(1, Math.round(r.folded.thick / Math.max(caliper, 0.01))), darkInkOnFold: darkInk }), [gsm, caliper, profile, grain, type, r.folded.thick, darkInk]);
  const printJob = useMemo(() => foldPrintJob(r, { title: FOLDS.find((f) => f.id === type)?.label || 'Folded leaflet', bleed, safe, paper: `${gsm} gsm ${(PAPER_PROFILES.find((p) => p.id === profile)?.label || '').split(' (')[0].toLowerCase()}` }), [r, type, bleed, safe, gsm, profile]);
  const editorHref = useMemo(() => printJobEditorUrl(printJob), [printJob]);
  const def = FOLDS.find((f) => f.id === type)!;

  const inspect = async (f: File) => {
    setBusy('pdf');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const pt = 25.4 / 72;
      const pages = doc.getPages().map((p) => { const { width, height } = p.getSize(); const t = p.getTrimBox(); const hasTrim = Math.abs(t.width - width) > 0.5 || Math.abs(t.height - height) > 0.5; return { w: Math.round(width * pt * 10) / 10, h: Math.round(height * pt * 10) / 10, ...(hasTrim ? { trim: { w: Math.round(t.width * pt * 10) / 10, h: Math.round(t.height * pt * 10) / 10 } } : {}) }; });
      setPdf({ name: f.name, res: checkPdfForFold({ pages }, r, bleed) });
    } catch { setPdf({ name: f.name, res: { pages: 0, sizes: [], orientation: '—', issues: ['This PDF could not be read (damaged or protected).'], ok: false } }); }
    setBusy(null);
  };

  // Folded preview: panels as cards hinged at the folds, opened by the slider.
  const pv = r.panels.map((p) => p.w), totalW = W;
  const scale = 300 / totalW;
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-3 rounded-3xl border border-mt-border bg-mt-surface p-5" aria-label="Folding settings">
        <div className="flex items-center justify-between"><p className="text-[13px] font-semibold">Settings</p><ModeSwitch pro={pro} onChange={setPro} /></div>
        <label className={lbl}>Flat sheet<select value={sizeId} onChange={(e) => { setSizeId(e.target.value); setCustom(null); }} aria-label="Flat sheet size" className={field}>{PAPER_SIZES.filter((p) => /A sizes|US/.test(p.group || '') || ['dl', 'letter', 'legal', 'tabloid'].includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.label} ({p.w} × {p.h} mm)</option>)}<option value="custom">Custom size</option></select></label>
        {sizeId === 'custom'
          ? <div className="grid grid-cols-2 gap-2"><label className={lbl}>Width (mm)<input type="number" value={cw} min={50} onChange={(e) => { setCw(Number(e.target.value) || 0); setCustom(null); }} aria-label="Flat width" className={field} /></label><label className={lbl}>Height (mm)<input type="number" value={ch} min={50} onChange={(e) => setCh(Number(e.target.value) || 0)} aria-label="Flat height" className={field} /></label></div>
          : <div className="flex gap-1.5" role="radiogroup" aria-label="Orientation">{([[true, 'Landscape'], [false, 'Portrait']] as const).map(([v, l]) => <button key={l} type="button" role="radio" aria-checked={landscape === v} onClick={() => { setLandscape(v); setCustom(null); }} className={`h-9 flex-1 rounded-xl border text-[13px] ${landscape === v ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{l}</button>)}</div>}
        <label className={lbl}>Fold<select value={type} onChange={(e) => { setType(e.target.value as FoldType); setCustom(null); }} aria-label="Fold type" className={field}>{FOLDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
        <p className="text-[11.5px] text-mt-muted">{def.hint}</p>
        {def.panels === 'n' && <label className={lbl}>Panels<input type="number" min={def.minPanels} max={16} value={panels} onChange={(e) => { setPanels(Math.max(def.minPanels || 4, Math.min(16, Number(e.target.value) || 4))); setCustom(null); }} aria-label="Number of panels" className={field} /></label>}
        <div className="grid grid-cols-2 gap-2">
          <label className={lbl}>Paper (gsm)<input type="number" min={40} max={450} value={gsm} onChange={(e) => setGsm(Number(e.target.value) || 0)} aria-label="Paper gsm" className={field} /></label>
          <label className={lbl}>Type<select value={profile} onChange={(e) => setProfile(e.target.value)} aria-label="Paper type" className={field}>{PAPER_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label.split(' (')[0]}</option>)}</select></label>
          <label className={lbl}>Grain<select value={grain} onChange={(e) => setGrain(e.target.value as typeof grain)} aria-label="Grain direction" className={field}><option value="unknown">Not known</option><option value="parallel">Folds with the grain</option><option value="across">Folds across the grain</option></select></label>
          <label className={`${lbl} flex items-end gap-2 pb-2`}><input type="checkbox" checked={darkInk} onChange={(e) => setDarkInk(e.target.checked)} aria-label="Heavy ink across a fold" /> Heavy ink across a fold</label>
          <label className={lbl}>Bleed (mm)<input type="number" min={0} max={10} step={0.5} value={bleed} onChange={(e) => setBleed(Number(e.target.value) || 0)} aria-label="Bleed mm" className={field} /></label>
          <label className={lbl}>Safe margin (mm)<input type="number" min={0} max={20} step={0.5} value={safe} onChange={(e) => setSafe(Number(e.target.value) || 0)} aria-label="Safe margin mm" className={field} /></label>
        </div>
        {pro && type === 'custom' && <div role="group" aria-label="Fold directions"><p className="text-[12px] font-semibold">Fold directions</p><div className="mt-1 flex flex-wrap gap-1.5">{r.folds.filter((f) => f.x != null).map((f, i) => <button key={i} type="button" onClick={() => setDirs(r.folds.map((g, j) => (j === i ? (g.dir === 'valley' ? 'mountain' : 'valley') : g.dir)))} className="h-8 px-2.5 rounded-full border border-mt-border text-[12px]">{f.label}: {f.dir}</button>)}</div></div>}
        {pro && <div>
          <div className="flex items-center justify-between"><p className="text-[12px] font-semibold">Panel widths (mm)</p><button type="button" onClick={() => setCustom(custom ? null : r.panels.map((p) => p.w))} className="text-[12px] text-mt-primary">{custom ? 'Back to calculated' : 'Adjust by hand'}</button></div>
          <div className="mt-1 grid grid-cols-3 gap-1.5">{r.panels.map((p, i) => <label key={i} className="text-[11px] text-mt-muted">Panel {p.n}<input type="number" step={0.5} value={custom ? custom[i] : p.w} disabled={!custom} onChange={(e) => custom && setCustom(custom.map((v, j) => (j === i ? Number(e.target.value) || 0 : v)))} aria-label={`Panel ${p.n} width`} className="mt-0.5 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px] disabled:opacity-70" /></label>)}</div>
        </div>}
        {pro && <label className="block rounded-2xl border border-dashed border-mt-border p-3 text-[12.5px] cursor-pointer hover:bg-mt-surface2">
          <span className="inline-flex items-center gap-1.5 font-semibold">{busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileSearch size={14} />} Check an existing PDF</span>
          <span className="block text-[11.5px] text-mt-muted">Page count, sizes, trim and bleed are read and compared with this fold. Nothing is uploaded.</span>
          <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) inspect(f); }} />
        </label>}
      </aside>

      <div className="min-w-0 space-y-4">
        <section aria-label="Folding result" className="rounded-3xl border border-mt-border bg-mt-surface p-5 text-[13.5px] space-y-1">
          <p className="text-[15px] font-semibold">{def.label}: {W} × {H} mm flat → <b>{r.folded.w} × {r.folded.h} mm</b> folded</p>
          <p className="text-mt-muted">{r.panels.length} panels · {r.folds.length} folds · creep allowance {r.allowance} mm per tuck · folded thickness ≈ {r.folded.thick} mm</p>
          {r.errors.map((e) => <p key={e} className="text-rose-600">{e}</p>)}
          <a href={editorHref} className="mt-2 h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center gap-2">Design this leaflet in the editor (outside + inside) <ExternalLink size={15} /></a>
          {r.notes.map((n) => <p key={n} className="text-[12.5px] text-mt-muted">{n}</p>)}
        </section>
        <section aria-label="Will this paper fold" className="rounded-3xl border border-mt-border bg-mt-surface p-5 text-[13px]">
          <div className="flex items-center justify-between"><p className="text-[14px] font-semibold">Will this paper fold?</p>
            <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${fa.level === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : fa.level === 'warn' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'}`}>{fa.level === 'error' ? 'Not practical' : fa.method === 'crease' ? 'Crease first' : fa.method === 'score' ? 'Score first' : 'Folds as it is'}</span></div>
          <ul className="mt-2 space-y-1.5">{fa.checks.map((c) => <li key={c.id} className="flex gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.level === 'ok' ? 'bg-emerald-500' : c.level === 'warn' ? 'bg-amber-500' : 'bg-rose-500'}`} /><span><b className="font-semibold">{c.title}.</b> <span className="text-mt-muted">{c.detail}</span></span></li>)}</ul>
          {fa.crease && <p className="mt-2 text-[12px] text-mt-muted">Creasing set-up for {Math.round(caliper * 1000)} µm: rule {fa.crease.ruleWidth} mm, channel {fa.crease.channelWidth} mm wide × {fa.crease.channelDepth} mm deep (channel = 1.5 × caliper + rule width). Confirm with a test crease on the actual stock.</p>}
          <p className="mt-1 text-[11px] text-mt-faint">Caliper estimated from the paper type ({Math.round(caliper * 1000)} µm). Weight thresholds are printers' rules of thumb.</p>
        </section>
        <section className="rounded-3xl border border-mt-border bg-mt-surface p-4">
          <div className="mb-2 flex items-center gap-1.5" role="radiogroup" aria-label="Side">{(['outside', 'inside'] as const).map((s2) => <button key={s2} type="button" role="radio" aria-checked={side === s2} onClick={() => setSide(s2)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold capitalize ${side === s2 ? 'bg-mt-ink text-mt-bg' : 'border border-mt-border'}`}>{s2}</button>)}</div>
          <div className="overflow-x-auto bg-white rounded-xl [&_svg]:h-auto [&_svg]:w-full" aria-label="Flat layout" dangerouslySetInnerHTML={{ __html: svg }} />
        </section>
        <section className="rounded-3xl border border-mt-border bg-mt-surface p-4" aria-label="Folded preview">
          <div className="flex items-center justify-between"><p className="text-[13px] font-semibold">Folded preview</p><label className="text-[12px] text-mt-muted inline-flex items-center gap-2">Open<input type="range" min={0} max={180} value={angle} onChange={(e) => setAngle(Number(e.target.value))} aria-label="Fold angle" /></label></div>
          <div className="mt-3 flex justify-center" style={{ perspective: 900 }}>
            <div style={{ display: 'flex', transformStyle: 'preserve-3d', height: H * scale }}>
              {pv.map((w, i) => {
                const f = r.folds.find((x) => x.x != null && Math.abs((x.x as number) - r.panels[i].x) < 0.2);
                const turn = i === 0 || !f ? 0 : (f.dir === 'valley' ? -1 : 1) * (180 - angle) * (i > 0 ? 0.5 : 1);
                return <div key={i} style={{ width: w * scale, height: H * scale, transformOrigin: 'left center', transform: `rotateY(${turn}deg)`, background: i % 2 ? '#EEF2FF' : '#F8FAFC', border: '1px solid #94A3B8', fontSize: 11, display: 'grid', placeItems: 'center', color: '#334155', textAlign: 'center', padding: 4 }}>{r.panels[i].outside}</div>;
              })}
            </div>
          </div>
          <ol className="mt-3 list-decimal pl-5 text-[13px] space-y-0.5">{r.sequence.map((s2) => <li key={s2}>{s2}</li>)}</ol>
        </section>
        {pdf && <section aria-label="PDF check" className={`rounded-3xl border p-4 text-[13px] ${pdf.res.ok ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-300 bg-rose-50 dark:bg-rose-900/20'}`}>
          <p className="font-semibold">{pdf.name}: {pdf.res.pages} page{pdf.res.pages === 1 ? '' : 's'}, {pdf.res.orientation} — {pdf.res.ok ? 'suitable for this fold' : 'not suitable as it is'}</p>
          <ul className="mt-1 list-disc pl-5">{pdf.res.sizes.map((p, i) => <li key={i}>Page {i + 1}: {p.w} × {p.h} mm{p.trim ? ` · trim ${p.trim.w} × ${p.trim.h} mm · bleed ≈ ${p.bleed} mm` : ' · no trim box'}</li>)}{pdf.res.issues.map((s2) => <li key={s2} className="text-rose-700 dark:text-rose-300">{s2}</li>)}</ul>
        </section>}
      </div>
      <div className="lg:col-span-2">
        <PrintDownloadPanel job={printJob} editorHref={editorHref} />
      </div>
    </div>
  );
}
