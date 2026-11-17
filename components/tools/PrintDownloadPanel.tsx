'use client';

// Download & print — one clean place for every file of a job in the Print
// Size Calculator:
//  · Layout template (branded) — guides to design on
//  · Job report (branded)      — the one document: spec, preview, how to print, approval
//  · Print files (no branding) — actual size, fit to print, normal (bleed only)
// Print files need your artwork (a PDF with one page per side, or one image
// per side). Nothing is uploaded.

import { useMemo, useState, useEffect } from 'react';
import { ModeSwitch, useToolMode } from '@/components/ToolMode';
import { Download, ExternalLink, FileText, LayoutTemplate, Loader2, Package, Upload } from 'lucide-react';
import type { Artwork } from '@/lib/print/pressSheet';
import { templateSvg } from '@/lib/print/pressSheet';
import { sidePressJob, type PrintJobInfo } from '@/lib/print/printJob';
import { makePrintSet, planSheet, type PrintSelection } from '@/lib/print/printPackage';
import { layoutTemplatePages } from '@/lib/print/layoutTemplate';
import { loadImage, loadPressCmyk, saveBytes, saveSet, safeBase, svgPagesToPdf, today } from '@/lib/print/printDownload';
import { PrintOutputSettings, initialOutput, rememberOutput, type PrintOutput } from './PrintOutputSettings';

const MODE_KEY = 'mt:print-mode';

export { ModeSwitch };
export function usePro(key = MODE_KEY): [boolean, (v: boolean) => void] { return useToolMode(key); }

export function PrintDownloadPanel({ job, editorHref }: { job: PrintJobInfo; editorHref?: string }) {
  const [pro, setPro] = usePro();
  const [out, setOut] = useState<PrintOutput>(() => initialOutput(''));
  const [art, setArt] = useState<{ names: string[]; arts: Artwork[]; previews: ({ src: string; w: number; h: number } | null)[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null), [err, setErr] = useState<string | null>(null);
  useEffect(() => { setOut(initialOutput('')); }, []);
  const actual = useMemo(() => planSheet(job, 'actual', out.options.actualSheet, out.options), [job, out.options]);
  const preview = useMemo(() => templateSvg(sidePressJob(job, 0, 'preview'), actual), [job, actual]);
  const base = safeBase(out.details.jobName, `${job.source}-${Math.round(job.trimW)}x${Math.round(job.trimH)}`);

  const pickArt = async (list: FileList | null) => {
    if (!list?.length) return;
    setErr(null); setMsg(null);
    const files = Array.from(list);
    const pdf = files.find((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    if (pdf) {
      const bytes = new Uint8Array(await pdf.arrayBuffer());
      let pages = 1;
      try { const { PDFDocument } = await import('pdf-lib'); pages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount(); } catch { setErr('This PDF could not be read (damaged or protected).'); return; }
      if (pages < job.sides.length) setMsg(`Your PDF has ${pages} page${pages > 1 ? 's' : ''}; this job has ${job.sides.length} sides — the missing side${job.sides.length - pages > 1 ? 's are' : ' is'} left blank.`);
      setArt({ names: [pdf.name], arts: job.sides.map((_, i): Artwork => (i < pages ? { kind: 'pdf', bytes, page: i } : null)), previews: [] });
      return;
    }
    const imgs = files.filter((f) => /png|jpe?g/i.test(f.type) || /\.(png|jpe?g)$/i.test(f.name)).slice(0, job.sides.length);
    if (!imgs.length) { setErr('Use a PDF, or PNG / JPG images (one per side).'); return; }
    const arts: Artwork[] = [], previews: ({ src: string; w: number; h: number } | null)[] = [];
    for (const f of imgs) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      arts.push({ kind: /png/i.test(f.type) || /\.png$/i.test(f.name) ? 'png' : 'jpg', bytes });
      const url = URL.createObjectURL(f); previews.push(await loadImage(url)); URL.revokeObjectURL(url);
    }
    setArt({ names: imgs.map((f) => f.name), arts: job.sides.map((_, i) => arts[i] ?? null), previews });
  };

  const run = async (key: string, files: PrintSelection, zip: boolean) => {
    setBusy(key); setErr(null); setMsg(null);
    try {
      const logo = files.report ? await loadImage('/logo.png') : null;
      const set = await makePrintSet({ job, base, options: out.options, files, arts: art?.arts || null, details: { ...out.details, jobName: out.details.jobName || base.replace(/_/g, ' ') }, date: today(), colour: 'CMYK (FOGRA39 coated)', previews: art?.previews, logo, toPdf: svgPagesToPdf, cmyk: (files.actual || files.fit || files.normal) && art ? await loadPressCmyk() : null });
      if (!set.out.length) throw new Error(set.warnings[0] || 'Nothing to download.');
      await saveSet(set.out, `${base}_PRINT_FILES.zip`, zip);
      rememberOutput(out);
      setMsg(`Downloaded: ${set.out.map((f) => f.name).join(', ')}.${set.warnings.length ? ` ${set.warnings[0]}` : ''}`);
    } catch (e: any) { setErr(e?.message || 'The files could not be made in this browser.'); }
    setBusy(null);
  };
  const template = async () => {
    setBusy('template'); setErr(null); setMsg(null);
    try {
      const pages = layoutTemplatePages(job, { name: base, markType: out.options.markType, logo: await loadImage('/logo.png') });
      saveBytes(await svgPagesToPdf(pages), `${base}_LAYOUT_TEMPLATE.pdf`);
      setMsg(`Downloaded: ${base}_LAYOUT_TEMPLATE.pdf (${pages.length} page${pages.length > 1 ? 's' : ''}).`);
    } catch { setErr('The template could not be made in this browser.'); }
    setBusy(null);
  };

  const btn = 'h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-50';
  const ghost = `${btn} border border-mt-border bg-mt-surface hover:bg-mt-surface2`;
  const icon = (k: string, I: any) => (busy === k ? <Loader2 size={15} className="animate-spin" /> : <I size={15} />);
  const noArt = !art;
  const fitName = out.options.fitSheet === 'a4' ? 'A4' : out.options.fitSheet.toUpperCase();

  return (
    <section aria-label="Download and print" className="rounded-3xl border border-mt-border bg-mt-surface p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-[16px] font-semibold mr-auto">Download &amp; print</h3>
        <ModeSwitch pro={pro} onChange={setPro} />
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <PrintOutputSettings job={job} value={out} onChange={setOut} pro={pro} />
          <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-dashed border-mt-border text-[13px] cursor-pointer hover:bg-mt-surface2">
            <Upload size={15} className="text-mt-accent shrink-0" /><span className="truncate">{art ? art.names.join(', ') : `Your artwork — PDF (${job.sides.length > 1 ? `${job.sides.length} pages: ${job.sides.join(', ')}` : '1 page'}) or ${job.sides.length > 1 ? 'one image per side' : 'an image'}`}</span>
            <input type="file" multiple accept="application/pdf,image/png,image/jpeg" className="sr-only" aria-label="Artwork for print files" onChange={(e) => { pickArt(e.target.files); e.target.value = ''; }} />
          </label>
          {editorHref && <p className="text-[12.5px] text-mt-muted">Designing it here? <a href={editorHref} className="font-semibold text-mt-accent inline-flex items-center gap-1">Open in the editor <ExternalLink size={13} /></a> — its <b>Print files</b> button makes all of these from your design.</p>}
        </div>
        <div>
          <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview)}`} alt={`Actual size on ${actual.sheet.name}`} className="w-full max-h-[300px] object-contain rounded-xl border border-mt-border bg-white" />
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={template} disabled={!!busy} className={ghost}>{icon('template', LayoutTemplate)} Layout template</button>
              <button type="button" onClick={() => run('report', { actual: false, fit: false, normal: false, report: true }, false)} disabled={!!busy} className={ghost}>{icon('report', FileText)} Job report</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => run('actual', { actual: true, fit: false, normal: false, report: false }, false)} disabled={!!busy || noArt || !actual.fits} className={ghost}>{icon('actual', Download)} Actual size</button>
              <button type="button" onClick={() => run('fit', { actual: false, fit: true, normal: false, report: false }, false)} disabled={!!busy || noArt} className={ghost}>{icon('fit', Download)} Fit to {fitName}</button>
              <button type="button" onClick={() => run('normal', { actual: false, fit: false, normal: true, report: false }, false)} disabled={!!busy || noArt} className={ghost}>{icon('normal', Download)} Normal PDF</button>
            </div>
            <button type="button" onClick={() => run('all', { actual: true, fit: true, normal: true, report: true }, true)} disabled={!!busy || noArt} className={`${btn} bg-mt-primary text-mt-onprimary`}>{icon('all', Package)} Download all (.zip)</button>
            {noArt && <p className="text-[12px] text-mt-muted">Add your artwork to make the print files. The layout template and job report work without it.</p>}
            {msg && <p role="status" className="text-[12.5px] text-emerald-700 dark:text-emerald-300">{msg}</p>}
            {err && <p role="alert" className="text-[12.5px] text-rose-600">{err}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
