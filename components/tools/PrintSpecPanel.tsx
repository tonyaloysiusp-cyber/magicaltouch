'use client';

// Printing Layout & Specification document: the customer / job details, the
// print settings, page contents per panel, production notes, approvals and
// the files actually supplied (read from the PDFs on this device) — turned
// into a branded A4 landscape technical PDF. All numbers come from the
// calculator; nothing is sample data.

import { useEffect, useState } from 'react';
import { ClipboardList, Download, FilePlus2, Loader2, Trash2 } from 'lucide-react';
import type { FoldResult } from '@/lib/fold';
import { DEFAULT_APPROVALS, DEFAULT_NOTES, sidePanels, specPages, type SpecClient, type SpecJob, type SpecPrint, type SuppliedFile } from '@/lib/print/specDoc';

const KEY = 'mt:print-spec';
const field = 'mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2.5 text-[13px]';
const lbl = 'block text-[11.5px] text-mt-muted';

interface Saved { client: SpecClient; job: SpecJob; print: SpecPrint; contents: string[]; notes: string; approvals: string; markLen: number; markOffset: number }
const EMPTY: Saved = {
  client: { company: '', contact: '', email: '', phone: '' },
  job: { project: '', description: '', artworkFile: '', jobNo: '', orderNo: '', quantity: '', date: '', preparedBy: '', status: 'Proof', revision: '1' },
  print: { paper: '', method: 'Digital', colours: '4/4 full colour both sides', colourMode: 'CMYK', resolution: '300 dpi at final size', stock: '', lamination: '', finishing: '', optional: '', binding: '', cutting: '' },
  contents: [], notes: DEFAULT_NOTES.join('\n'), approvals: DEFAULT_APPROVALS.join('\n'), markLen: 5, markOffset: 3,
};

const PT = 25.4 / 72, r1 = (n: number) => Math.round(n * 10) / 10;

/** Reads a PDF the user supplied: page count, MediaBox / TrimBox / BleedBox (mm) — only what the file really says. */
export async function inspectSupplied(f: File, expect: { w: number; h: number; bleed: number }, purpose: string): Promise<SuppliedFile> {
  const issues: string[] = [];
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    const pages = doc.getPages();
    const sizes = pages.map((p) => { const s = p.getMediaBox(); return { w: r1(s.width * PT), h: r1(s.height * PT) }; });
    const p0 = pages[0], m = p0.getMediaBox(), t = p0.getTrimBox(), b = p0.getBleedBox();
    const hasTrim = Math.abs(t.width - m.width) > 0.5 || Math.abs(t.height - m.height) > 0.5;
    const trim = hasTrim ? { w: r1(t.width * PT), h: r1(t.height * PT) } : null;
    const bleedSrc = Math.abs(b.width - t.width) > 0.5 ? b : m;
    const bleed = trim ? r1(Math.min(t.x - bleedSrc.x, t.y - bleedSrc.y) * PT) : null;
    if (purpose === 'Print file') {
      if (!trim) issues.push('no TrimBox — the finished size is not marked');
      else if (Math.abs(trim.w - expect.w) > 0.6 || Math.abs(trim.h - expect.h) > 0.6) issues.push(`trim ${trim.w} × ${trim.h} mm, expected ${expect.w} × ${expect.h} mm`);
      if (bleed == null || bleed + 0.2 < expect.bleed) issues.push(`bleed ${bleed ?? 0} mm, needs ${expect.bleed} mm`);
    }
    return { name: f.name, purpose, pages: pages.length, sizes, trim, bleed, colour: null, ready: purpose === 'Print file' ? issues.length === 0 : purpose !== 'Reference only', issues };
  } catch {
    return { name: f.name, purpose, pages: 0, sizes: [], trim: null, bleed: null, colour: null, ready: false, issues: ['could not be read (damaged or protected)'] };
  }
}

async function dataUrl(path: string): Promise<{ src: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch(path)).blob();
    const src = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    const img = new Image(); img.src = src; await img.decode();
    return { src, w: img.naturalWidth, h: img.naturalHeight };
  } catch { return null; }
}

export function PrintSpecPanel({ fold, bleed, safe, paperLabel, stockHint }: { fold: FoldResult; bleed: number; safe: number; paperLabel: string; stockHint: string }) {
  const [s, setS] = useState<Saved>(EMPTY);
  const [files, setFiles] = useState<SuppliedFile[]>([]);
  const [purpose, setPurpose] = useState('Print file');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v) setS({ ...EMPTY, ...v, client: { ...EMPTY.client, ...v.client }, job: { ...EMPTY.job, ...v.job }, print: { ...EMPTY.print, ...v.print } }); } catch { /* ignore */ } }, []);
  useEffect(() => { const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }, 400); return () => clearTimeout(t); }, [s]);
  const n = fold.panels.length;
  const { side1, side2 } = sidePanels(fold);
  const roles = [...side1, ...side2].map((p) => p.role);
  const up = <K extends 'client' | 'job' | 'print'>(k: K, o: Partial<Saved[K]>) => setS((x) => ({ ...x, [k]: { ...x[k], ...o } }));

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy('files');
    const out: SuppliedFile[] = [];
    for (const f of Array.from(list)) out.push(await inspectSupplied(f, { w: fold.flat.w, h: fold.flat.h, bleed }, purpose));
    setFiles((x) => [...x, ...out]);
    setBusy(null);
  };

  const make = async () => {
    setBusy('spec');
    try {
      const [{ svgToPdfBlob }, logo, promo] = await Promise.all([import('@/lib/svgToPdf'), dataUrl('/logo.png'), dataUrl('/promo/promo-linkedin.jpg')]);
      const date = s.job.date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const base = (s.job.project || 'print-job').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'print-job';
      const specName = `${base}_LAYOUT_SPECIFICATION.pdf`;
      const self: SuppliedFile = { name: specName, purpose: 'Technical document', pages: 3, sizes: [{ w: 297, h: 210 }], trim: null, bleed: null, colour: null, ready: true, issues: [] };
      const data = {
        client: s.client, job: { ...s.job, date }, print: { ...s.print, paper: s.print.paper || paperLabel, stock: s.print.stock || stockHint },
        fold, bleed, safe, marks: { len: s.markLen, offset: s.markOffset },
        contents: Array.from({ length: 2 * n }, (_, i) => s.contents[i] || ''),
        notes: s.notes.split('\n').map((x) => x.trim()).filter(Boolean),
        approvals: s.approvals.split('\n').map((x) => x.trim()).filter(Boolean),
        files: [...files, self], logo: logo?.src || null, promo,
      };
      const pages = specPages(data);
      const blob = await svgToPdfBlob('', 0, 0, pages.map((svg) => ({ svg, widthMm: 297, heightMm: 210 })));
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = specName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setMsg(`${specName} ready (${pages.length} pages).`);
    } catch { setMsg('The specification could not be made in this browser.'); }
    setBusy(null);
  };

  const inp = (k: 'client' | 'job' | 'print', key: string, label: string, ph = '') => (
    <label className={lbl}>{label}<input value={(s[k] as any)[key] || ''} placeholder={ph} onChange={(e) => up(k, { [key]: e.target.value } as any)} aria-label={label} className={field} /></label>
  );

  return (
    <section aria-label="Printing layout and specification" className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-4">
      <div>
        <p className="text-[15px] font-semibold inline-flex items-center gap-2"><ClipboardList size={17} /> Printing layout &amp; specification PDF</p>
        <p className="text-[12.5px] text-mt-muted">A technical document for your customer and the print operator: imposition of side 1 and side 2, specification, page geometry (MediaBox, BleedBox, TrimBox), the files you supply, page contents and the approval sign-off. Branded Magical Touch Design; your details stay on this device.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2" role="group" aria-label="Client">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Client</p>
          {inp('client', 'company', 'Client / company')}{inp('client', 'contact', 'Contact person')}{inp('client', 'email', 'Email')}{inp('client', 'phone', 'Phone')}
        </div>
        <div className="space-y-2" role="group" aria-label="Job">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Job</p>
          {inp('job', 'project', 'Project name')}{inp('job', 'description', 'Short description', `${n * 2} printed panels…`)}{inp('job', 'artworkFile', 'Artwork file name')}
          <div className="grid grid-cols-2 gap-2">{inp('job', 'jobNo', 'Job number')}{inp('job', 'orderNo', 'Order number')}{inp('job', 'quantity', 'Quantity')}{inp('job', 'date', 'Prepared date', 'today')}{inp('job', 'preparedBy', 'Prepared by')}{inp('job', 'revision', 'Revision')}</div>
          <label className={lbl}>Production status<select value={s.job.status} onChange={(e) => up('job', { status: e.target.value })} aria-label="Production status" className={field}>{['Draft', 'Proof', 'Awaiting approval', 'Approved', 'In production', 'Completed'].map((o) => <option key={o}>{o}</option>)}</select></label>
        </div>
        <div className="space-y-2" role="group" aria-label="Print settings">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Printing</p>
          {inp('print', 'paper', 'Paper size label', paperLabel)}
          <div className="grid grid-cols-2 gap-2">
            <label className={lbl}>Method<select value={s.print.method} onChange={(e) => up('print', { method: e.target.value })} aria-label="Printing method" className={field}>{['Digital', 'Offset', 'Digital or offset', 'Large format', 'Screen print'].map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className={lbl}>Colour mode<select value={s.print.colourMode} onChange={(e) => up('print', { colourMode: e.target.value })} aria-label="Colour mode" className={field}>{['CMYK', 'CMYK + spot', 'Spot colours', 'Greyscale'].map((o) => <option key={o}>{o}</option>)}</select></label>
          </div>
          <label className={lbl}>Colours<select value={s.print.colours} onChange={(e) => up('print', { colours: e.target.value })} aria-label="Colours" className={field}>{['4/4 full colour both sides', '4/0 full colour one side', '4/1 colour + black', '1/1 black both sides', '1/0 black one side'].map((o) => <option key={o}>{o}</option>)}</select></label>
          {inp('print', 'resolution', 'Resolution')}{inp('print', 'stock', 'Paper stock', stockHint)}{inp('print', 'lamination', 'Lamination', 'None')}{inp('print', 'finishing', 'Finishing', `Trim and ${fold.folds.length} folds`)}{inp('print', 'binding', 'Binding (if any)')}{inp('print', 'optional', 'Optional extras')}{inp('print', 'cutting', 'Cutting instructions')}
          <div className="grid grid-cols-2 gap-2">
            <label className={lbl}>Crop mark length (mm)<input type="number" min={2} max={15} value={s.markLen} onChange={(e) => setS((x) => ({ ...x, markLen: Math.max(2, Math.min(15, Number(e.target.value) || 5)) }))} aria-label="Crop mark length" className={field} /></label>
            <label className={lbl}>Mark offset (mm)<input type="number" min={0} max={10} value={s.markOffset} onChange={(e) => setS((x) => ({ ...x, markOffset: Math.max(0, Math.min(10, Number(e.target.value) || 0)) }))} aria-label="Crop mark offset" className={field} /></label>
          </div>
        </div>
      </div>

      <div role="group" aria-label="Page contents">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint">Page contents</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 2 * n }, (_, i) => (
            <label key={i} className={lbl}>Panel {i + 1} · {roles[i]} ({i < n ? 'side 1' : 'side 2'})
              <input value={s.contents[i] || ''} onChange={(e) => setS((x) => { const c = [...x.contents]; c[i] = e.target.value; return { ...x, contents: c }; })} aria-label={`Panel ${i + 1} contents`} className={field} />
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className={lbl}>Production notes (one per line)<textarea value={s.notes} onChange={(e) => setS((x) => ({ ...x, notes: e.target.value }))} rows={6} aria-label="Production notes" className="mt-1 w-full rounded-lg border border-mt-border bg-mt-bg p-2.5 text-[13px]" /></label>
        <label className={lbl}>Approval items (one per line)<textarea value={s.approvals} onChange={(e) => setS((x) => ({ ...x, approvals: e.target.value }))} rows={6} aria-label="Approval items" className="mt-1 w-full rounded-lg border border-mt-border bg-mt-bg p-2.5 text-[13px]" /></label>
      </div>

      <div role="group" aria-label="Supplied files">
        <div className="flex flex-wrap items-end gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-faint mr-auto">Supplied files</p>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} aria-label="File purpose" className="h-9 rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px]">{['Print file', 'Reference only', 'Technical document'].map((o) => <option key={o}>{o}</option>)}</select>
          <label className="h-9 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-mt-surface2">{busy === 'files' ? <Loader2 size={14} className="animate-spin" /> : <FilePlus2 size={14} />} Add PDFs<input type="file" multiple accept="application/pdf,.pdf" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} /></label>
        </div>
        {files.length === 0 ? <p className="mt-1 text-[12px] text-mt-muted">Add the press PDF (and any reference PDF) to list their real pages, sizes, trim and bleed. Files are read on this device only.</p> : (
          <ul className="mt-2 space-y-1 text-[12.5px]">
            {files.map((f, i) => (
              <li key={i} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${f.ready ? 'border-emerald-300' : 'border-rose-300'}`}>
                <span className="flex-1"><b>{f.purpose}:</b> {f.name} — {f.pages} page{f.pages === 1 ? '' : 's'}{f.sizes[0] ? `, ${f.sizes[0].w} × ${f.sizes[0].h} mm` : ''}{f.trim ? `, trim ${f.trim.w} × ${f.trim.h} mm` : ', no trim box'}{f.bleed != null ? `, ${f.bleed} mm bleed` : ''} — {f.ready ? 'ready' : `not ready: ${f.issues.join('; ')}`}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={make} disabled={!!busy} className="h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-60">{busy === 'spec' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Printing layout &amp; specification (PDF)</button>
        <button type="button" onClick={() => { if (window.confirm('Clear the client, job and page contents? The calculator settings are not changed.')) setS(EMPTY); }} className="h-11 px-4 rounded-full border border-mt-border text-[13px] font-semibold">Clear details</button>
        {msg && <span role="status" className="text-[12.5px] text-mt-muted">{msg}</span>}
      </div>
    </section>
  );
}
