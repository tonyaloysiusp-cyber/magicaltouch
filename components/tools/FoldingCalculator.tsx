'use client';

// Folding calculator: brochures, leaflets, cards and maps. Panel widths with
// creep compensation, fold positions and order, the flat artwork layout
// (outside / inside), a folded preview, a check of an uploaded PDF, and a
// technical report for the print operator (branded in the footer only).

import { useMemo, useState } from 'react';
import { Download, FileSearch, Loader2 } from 'lucide-react';
import { FOLDS, calculateFold, foldDiagramSvg, checkPdfForFold, type FoldType, type PdfInspect } from '@/lib/fold';
import { PAPER_SIZES } from '@/lib/printSizes';
import { PAPER_PROFILES, estimateCaliper } from '@/lib/binding';
import { PrintSpecPanel } from './PrintSpecPanel';

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
  const [custom, setCustom] = useState<number[] | null>(null);
  const [side, setSide] = useState<'outside' | 'inside'>('outside');
  const [angle, setAngle] = useState(60);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ name: string; res: PdfInspect } | null>(null);
  const size = PAPER_SIZES.find((p) => p.id === sizeId);
  const W = sizeId === 'custom' ? cw : size ? (landscape ? Math.max(size.w, size.h) : Math.min(size.w, size.h)) : 297;
  const H = sizeId === 'custom' ? ch : size ? (landscape ? Math.min(size.w, size.h) : Math.max(size.w, size.h)) : 210;
  const caliper = estimateCaliper(gsm, profile) / 1000;
  const r = useMemo(() => calculateFold({ type, w: W, h: H, panels, caliper, bleed, safe, widths: custom || undefined }), [type, W, H, panels, caliper, bleed, safe, custom]);
  const svg = useMemo(() => foldDiagramSvg(r, side, bleed, safe), [r, side, bleed, safe]);
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

  const report = async () => {
    setBusy('report');
    try {
      const { svgToPdfBlob } = await import('@/lib/svgToPdf');
      const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
      const lines: [string, number, number][] = []; // text, size, weight
      const add = (s: string, size = 3.2, weight = 400) => lines.push([s, size, weight]);
      add('Folding specification', 6.5, 700);
      add(`${def.label} · flat ${W} × ${H} mm → folded ${r.folded.w} × ${r.folded.h} mm`, 4);
      add(`Paper ${gsm} gsm ${PAPER_PROFILES.find((p) => p.id === profile)?.label} (≈ ${Math.round(caliper * 1000)} µm) · folded thickness ≈ ${r.folded.thick} mm · creep allowance ${r.allowance} mm`, 3.2);
      add(`Bleed ${bleed} mm · safe margin ${safe} mm from every trim and fold · ${r.pages} panels (outside + inside)`, 3.2);
      add(' ', 2); add('Panels (outside, from the left)', 4.2, 700);
      r.panels.forEach((p) => add(`${p.n}.  ${p.w} mm at ${p.x} mm — outside: ${p.outside} · inside: ${p.inside}`));
      add(' ', 2); add('Folds', 4.2, 700);
      [...r.folds].sort((a, b) => a.order - b.order).forEach((f) => add(`Step ${f.order}: ${f.label} — ${f.dir} fold ${f.x != null ? `at ${f.x} mm from the left (outside)` : `across at ${f.y} mm from the top`}`));
      add(' ', 2); add('Folding sequence', 4.2, 700);
      r.sequence.forEach((s, i) => add(`${i + 1}. ${s}`));
      add(' ', 2); add('Cutting & printing', 4.2, 700);
      add(`Trim the flat sheet to ${W} × ${H} mm. Print outside and inside on the two sides, turning on the ${type === 'cross' ? 'long' : 'short'} edge (check with a folded dummy).`);
      r.notes.forEach((s) => add(`• ${s}`));
      r.errors.forEach((s) => add(`! ${s}`, 3.2, 700));
      if (pdf) { add(' ', 2); add(`Checked PDF: ${pdf.name}`, 4.2, 700); add(pdf.res.ok ? 'Suitable for this fold.' : 'Not suitable as it is:'); pdf.res.issues.forEach((s) => add(`• ${s}`)); }
      let y = 22, body = '';
      for (const [s, sz, wt] of lines) { body += `<text x="14" y="${y}" font-family="Helvetica" font-size="${sz}" font-weight="${wt}" fill="#111">${esc(s)}</text>`; y += sz * 1.6; }
      const foot = (pg: number, of: number, w: number, h: number) => `<line x1="14" y1="${h - 14}" x2="${w - 14}" y2="${h - 14}" stroke="#CBD5E1" stroke-width="0.25"/><text x="14" y="${h - 9}" font-family="Helvetica" font-size="3" font-weight="700" fill="#111">Magical Touch Design</text><text x="48" y="${h - 9}" font-family="Helvetica" font-size="3" fill="#475569">www.magicaltouchdesign.com · folding specification · technical information, not a print file</text><text x="${w - 14}" y="${h - 9}" font-family="Helvetica" font-size="3" fill="#475569" text-anchor="end">page ${pg} of ${of}</text>`;
      const page1 = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect width="210" height="297" fill="#fff"/>${body}${foot(1, 3, 210, 297)}</svg>`;
      const diag = (sd: 'outside' | 'inside', pg: number) => {
        const d = foldDiagramSvg(r, sd, bleed, safe);
        const vb = d.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
        const pw = 297, ph = 210, k = Math.min((pw - 28) / vb[2], (ph - 40) / vb[3]);
        const inner = d.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}"><rect width="${pw}" height="${ph}" fill="#fff"/><text x="14" y="16" font-family="Helvetica" font-size="5" font-weight="700" fill="#111">${sd === 'outside' ? 'Outside' : 'Inside'} — flat layout (scale ${Math.round(k * 100)} %)</text><g transform="translate(${14 - vb[0] * k} ${24 - vb[1] * k}) scale(${k})">${inner}</g>${foot(pg, 3, pw, ph)}</svg>`;
      };
      const blob = await svgToPdfBlob('', 0, 0, [{ svg: page1, widthMm: 210, heightMm: 297 }, { svg: diag('outside', 2), widthMm: 297, heightMm: 210 }, { svg: diag('inside', 3), widthMm: 297, heightMm: 210 }]);
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `folding-${type}-${W}x${H}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { /* surfaced by the disabled state */ }
    setBusy(null);
  };

  // Folded preview: panels as cards hinged at the folds, opened by the slider.
  const pv = r.panels.map((p) => p.w), totalW = W;
  const scale = 300 / totalW;
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-3 rounded-3xl border border-mt-border bg-mt-surface p-5" aria-label="Folding settings">
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
          <label className={lbl}>Bleed (mm)<input type="number" min={0} max={10} step={0.5} value={bleed} onChange={(e) => setBleed(Number(e.target.value) || 0)} aria-label="Bleed mm" className={field} /></label>
          <label className={lbl}>Safe margin (mm)<input type="number" min={0} max={20} step={0.5} value={safe} onChange={(e) => setSafe(Number(e.target.value) || 0)} aria-label="Safe margin mm" className={field} /></label>
        </div>
        <div>
          <div className="flex items-center justify-between"><p className="text-[12px] font-semibold">Panel widths (mm)</p><button type="button" onClick={() => setCustom(custom ? null : r.panels.map((p) => p.w))} className="text-[12px] text-mt-primary">{custom ? 'Back to calculated' : 'Adjust by hand'}</button></div>
          <div className="mt-1 grid grid-cols-3 gap-1.5">{r.panels.map((p, i) => <label key={i} className="text-[11px] text-mt-muted">Panel {p.n}<input type="number" step={0.5} value={custom ? custom[i] : p.w} disabled={!custom} onChange={(e) => custom && setCustom(custom.map((v, j) => (j === i ? Number(e.target.value) || 0 : v)))} aria-label={`Panel ${p.n} width`} className="mt-0.5 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px] disabled:opacity-70" /></label>)}</div>
        </div>
        <label className="block rounded-2xl border border-dashed border-mt-border p-3 text-[12.5px] cursor-pointer hover:bg-mt-surface2">
          <span className="inline-flex items-center gap-1.5 font-semibold">{busy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileSearch size={14} />} Check an existing PDF</span>
          <span className="block text-[11.5px] text-mt-muted">Page count, sizes, trim and bleed are read and compared with this fold. Nothing is uploaded.</span>
          <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) inspect(f); }} />
        </label>
        <button type="button" onClick={report} disabled={!!busy} className="h-11 w-full rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">{busy === 'report' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Technical folding report (PDF)</button>
      </aside>

      <div className="min-w-0 space-y-4">
        <section aria-label="Folding result" className="rounded-3xl border border-mt-border bg-mt-surface p-5 text-[13.5px] space-y-1">
          <p className="text-[15px] font-semibold">{def.label}: {W} × {H} mm flat → <b>{r.folded.w} × {r.folded.h} mm</b> folded</p>
          <p className="text-mt-muted">{r.panels.length} panels · {r.folds.length} folds · creep allowance {r.allowance} mm per tuck · folded thickness ≈ {r.folded.thick} mm</p>
          {r.errors.map((e) => <p key={e} className="text-rose-600">{e}</p>)}
          {r.notes.map((n) => <p key={n} className="text-[12.5px] text-mt-muted">{n}</p>)}
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
        <PrintSpecPanel fold={r} bleed={bleed} safe={safe} paperLabel={sizeId === 'custom' ? `${W} × ${H} mm` : `${(size?.label || '').split(' (')[0]} ${landscape ? 'landscape' : 'portrait'}`} stockHint={`${gsm} gsm ${(PAPER_PROFILES.find((p) => p.id === profile)?.label || '').split(' (')[0].toLowerCase()}`} />
      </div>
    </div>
  );
}
