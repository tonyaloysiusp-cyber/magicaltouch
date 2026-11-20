'use client';

// PDF Preflight Inspector: drop a PDF, choose the output, read the report.
// The file is read on this device and never changed or uploaded.

import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileDown, FileSearch, XCircle } from 'lucide-react';
import { TARGETS, preflightPdf, type PreflightReport, type Target } from '@/lib/print/preflight';

const ICON = { ok: <CheckCircle2 size={16} className="text-emerald-600" />, warn: <AlertTriangle size={16} className="text-amber-500" />, error: <XCircle size={16} className="text-red-600" /> };
const STATUS = { ok: ['Ready', 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900'], warn: ['Check the warnings', 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900'], error: ['Not ready for print', 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900'] } as const;

export function PdfPreflight() {
  const [target, setTarget] = useState<Target>('press-cmyk');
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [rep, setRep] = useState<PreflightReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (f: { name: string; bytes: Uint8Array }, t: Target) => {
    setBusy(true); setErr('');
    try { setRep(await preflightPdf(f.bytes, t)); }
    catch (e) { console.error(e); setRep(null); setErr('This PDF could not be read. It may be damaged or password-protected.'); }
    finally { setBusy(false); }
  };
  const open = async (fl: File | undefined | null) => {
    if (!fl) return;
    if (!/\.pdf$/i.test(fl.name) && fl.type !== 'application/pdf') { setErr('Choose a PDF file.'); return; }
    const f = { name: fl.name, bytes: new Uint8Array(await fl.arrayBuffer()) };
    setFile(f); run(f, target);
  };
  const reportPdf = async () => {
    if (!rep || !file) return;
    const [{ docDefs, docHeader, docFooter, section, txt, C, metaStrip }, { svgPagesToPdf, loadImage, saveBytes, today }] = await Promise.all([import('@/lib/print/docStyle'), import('@/lib/print/printDownload')]);
    const logo = await loadImage('/logo.png');
    const W = 210, H = 297, M = 16;
    const pages: string[][] = [[]];
    let y = 32;
    const need = (h: number) => { if (y + h > H - 20) { pages.push([]); y = 32; } };
    const put = (s: string) => pages[pages.length - 1].push(s);
    const wrap = (s: string, max: number) => { const out: string[] = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > max) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out; };
    put(metaStrip(M, y, W - 2 * M, [['Result', STATUS[rep.status][0]], ['Pages', String(rep.pages.length)], ['Fonts', String(rep.fonts.length)], ['Output', TARGETS.find((t) => t.id === rep.target)!.name.split(' (')[0]]]));
    y += 22;
    put(section(M, y, 'Findings', W - 2 * M)); y += 8;
    for (const f of rep.findings) {
      const lines = wrap(f.message, 92), fix = f.fix ? wrap(`Fix: ${f.fix}`, 92) : [];
      need(6 + (lines.length + fix.length) * 4.4);
      const col = f.level === 'error' ? '#DC2626' : f.level === 'warn' ? '#D97706' : '#059669';
      put(`<circle cx="${M + 1.6}" cy="${y - 1}" r="1.6" fill="${col}"/>`);
      put(txt(M + 5, y, `${f.check}${f.pages?.length ? ` · page ${f.pages.slice(0, 8).join(', ')}${f.pages.length > 8 ? '…' : ''}` : ''}`, 2.8, { bold: true, color: C.ink }));
      y += 4.6;
      for (const l of lines) { put(txt(M + 5, y, l, 2.6, { color: C.text })); y += 4.2; }
      for (const l of fix) { put(txt(M + 5, y, l, 2.5, { color: C.muted })); y += 4.1; }
      y += 2.4;
    }
    need(16 + rep.pages.length * 4.4);
    y += 4; put(section(M, y, 'Pages', W - 2 * M)); y += 8;
    for (const p of rep.pages.slice(0, 120)) {
      need(5);
      put(txt(M, y, `Page ${p.n}`, 2.5, { bold: true, color: C.ink }));
      put(txt(M + 18, y, `${p.trimMm ? `trim ${p.trimMm[0]} × ${p.trimMm[1]} mm · bleed ${p.bleedMm ?? 0} mm` : `page ${p.mediaMm[0]} × ${p.mediaMm[1]} mm · no TrimBox`} · ${p.images.length} image${p.images.length === 1 ? '' : 's'}${p.images.length ? ` (min ${Math.min(...p.images.map((i) => i.ppi))} ppi)` : ''}${p.minTextPt ? ` · text ≥ ${p.minTextPt} pt` : ''}`, 2.5, { color: C.text }));
      y += 4.4;
    }
    const n = pages.length;
    const svgs = pages.map((g, i) => ({ svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${docDefs()}<rect width="${W}" height="${H}" fill="#FFFFFF"/>${docHeader(W, { logo, kind: 'Preflight report', title: file.name.length > 48 ? file.name.slice(0, 45) + '…' : file.name, meta: today(), margin: M })}${g.join('')}${docFooter(W, H, { label: 'Preflight report', page: i + 1, pages: n, margin: M })}</svg>`, widthMm: W, heightMm: H }));
    saveBytes(await svgPagesToPdf(svgs), file.name.replace(/\.pdf$/i, '') + '_PREFLIGHT_REPORT.pdf');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-4 self-start rounded-2xl border border-mt-border bg-mt-surface p-4" aria-label="Preflight settings">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); open(e.dataTransfer.files?.[0]); }}
          className={`rounded-2xl border-2 border-dashed p-5 text-center ${drag ? 'border-[#3B82C4] bg-[#3B82C4]/5' : 'border-mt-border'}`}>
          <FileSearch size={26} className="mx-auto text-mt-muted" />
          <p className="mt-2 text-[13px] font-semibold">{file ? file.name : 'Drop a PDF here'}</p>
          <p className="text-[11.5px] text-mt-muted">Checked on this device — never uploaded or changed.</p>
          <button type="button" onClick={() => input.current?.click()} className="mt-3 h-9 rounded-full bg-mt-primary px-4 text-[13px] font-semibold text-mt-onprimary">{file ? 'Choose another PDF' : 'Choose PDF'}</button>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="PDF file" onChange={(e) => { open(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div role="radiogroup" aria-label="Output" className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mt-faint">Check for</p>
          {TARGETS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={target === t.id} onClick={() => { setTarget(t.id); if (file) run(file, t.id); }}
              className={`w-full rounded-xl border px-3 py-2 text-left ${target === t.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border hover:bg-mt-surface2'}`}>
              <span className="block text-[12.5px] font-semibold">{t.name}</span>
              <span className="block text-[11px] text-mt-muted">{t.hint}</span>
            </button>
          ))}
        </div>
        {err && <p role="alert" className="text-[12.5px] text-red-600">{err}</p>}
      </aside>

      <section aria-label="Preflight report" className="min-w-0 rounded-2xl border border-mt-border bg-mt-surface">
        {!rep ? (
          <div className="grid min-h-[420px] place-items-center p-8 text-center text-mt-muted">
            <div>
              <p className="text-[14px] font-semibold text-mt-ink">{busy ? 'Checking…' : 'Your report appears here'}</p>
              <p className="mt-1 max-w-md text-[12.5px]">Page boxes and bleed, fonts, image resolution, colour spaces, spot colours, output intent, overprint, transparency, small text and thin lines.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className={`m-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${STATUS[rep.status][1]}`} role="status">
              {ICON[rep.status]}
              <p className="mr-auto text-[14px] font-semibold">{STATUS[rep.status][0]}</p>
              <span className="text-[12px]">{rep.findings.filter((f) => f.level === 'error').length} errors · {rep.findings.filter((f) => f.level === 'warn').length} warnings</span>
              <button type="button" onClick={reportPdf} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-current/30 bg-white/60 px-3 text-[12px] font-semibold text-mt-ink dark:bg-black/20"><FileDown size={14} /> Report PDF</button>
            </div>
            <ul className="divide-y divide-mt-border border-y border-mt-border" aria-label="Findings">
              {rep.findings.map((f, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <span className="mt-0.5 shrink-0">{ICON[f.level]}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{f.check}{f.pages?.length ? <span className="ml-2 font-normal text-mt-muted">page {f.pages.slice(0, 10).join(', ')}{f.pages.length > 10 ? '…' : ''}</span> : null}</p>
                    <p className="text-[12.5px] text-mt-muted">{f.message}</p>
                    {f.fix && <p className="mt-0.5 text-[12px]"><span className="font-semibold">Fix:</span> {f.fix}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Fonts</h3>
                {rep.fonts.length ? <ul className="mt-1.5 space-y-1 text-[12.5px]">{rep.fonts.map((f) => <li key={f.name + f.embedded} className="flex justify-between gap-2"><span className="truncate">{f.name}</span><span className={f.embedded ? 'text-emerald-700' : 'text-red-600'}>{f.embedded ? 'embedded' : 'not embedded'} · {f.type}</span></li>)}</ul> : <p className="mt-1.5 text-[12.5px] text-mt-muted">No live text.</p>}
              </div>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Colour</h3>
                <p className="mt-1.5 text-[12.5px]">{rep.colourSpaces.join(', ') || '—'}</p>
                {rep.spots.length > 0 && <p className="text-[12.5px] text-mt-muted">Spots: {rep.spots.join(', ')}</p>}
                <p className="text-[12.5px] text-mt-muted">Output intent: {rep.outputIntent || 'none'} · PDF {rep.version || '?'}</p>
              </div>
            </div>
            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead><tr className="text-left text-mt-faint"><th className="py-1.5 font-semibold">Page</th><th className="font-semibold">Trim (mm)</th><th className="font-semibold">Bleed</th><th className="font-semibold">Images (lowest ppi)</th><th className="font-semibold">Smallest text</th><th className="font-semibold">Thinnest line</th></tr></thead>
                <tbody className="divide-y divide-mt-border">
                  {rep.pages.slice(0, 200).map((p) => (
                    <tr key={p.n}><td className="py-1.5">{p.n}</td><td>{p.trimMm ? `${p.trimMm[0]} × ${p.trimMm[1]}` : <span className="text-amber-600">no TrimBox</span>}</td><td>{p.bleedMm !== null ? `${p.bleedMm} mm` : '—'}</td><td>{p.images.length ? `${p.images.length} (${Math.min(...p.images.map((i) => i.ppi))} ppi)` : '—'}</td><td>{p.minTextPt ? `${p.minTextPt} pt` : '—'}</td><td>{p.minStrokePt !== null ? `${p.minStrokePt} pt` : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
