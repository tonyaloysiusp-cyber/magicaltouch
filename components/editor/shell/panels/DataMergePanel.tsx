'use client';

// Data merge inside the design editor: the page is the template.
//  · Fields: any text on the page with {Column} (or {#0001} for serial numbers);
//    QR codes made from a column.
//  · Data: paste from Excel / Google Sheets, type, or import a CSV.
//  · Check: missing values, duplicates in the first column, unknown fields.
//  · Preview any record on the page, then download one PDF page per record
//    (and lay them out many-up on sheets with crop marks from Imposition).

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, FileUp, Layers, Plus, QrCode, Undo2 } from 'lucide-react';
import { fillTemplate, parseTable, unknownFields, type DataSet } from '@/lib/print/vdp';

export interface MergeApi {
  canvas: () => any;
  fabric: () => any;
  page: () => { id?: string | null; x: number; y: number; width: number; height: number };
  commit: () => void;
  notice: (m: string) => void;
  /** one PDF page per record; `apply(i)` puts record i on the page before it is drawn */
  recordsPdf: (count: number, apply: (i: number) => Promise<void>) => Promise<Uint8Array>;
  openStudio: (kind: 'layout', file: File) => void;
}

const SAMPLE = 'Name,Title,Number,Website\nRavi Shankar,Designer,0001,https://magicaltouchdesign.com\nAisha Khan,Printer,0002,https://magicaltouchdesign.com';
const btn = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-mt-border px-2 text-[11.5px] font-semibold hover:bg-mt-surface2 disabled:opacity-50';
const primary = 'inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-mt-ink text-[12.5px] font-semibold text-mt-bg hover:opacity-90 disabled:opacity-50';
const label = 'mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint';
const isText = (o: any) => o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');

export function DataMergePanel({ api }: { api: MergeApi }) {
  const [text, setText] = useState('');
  const [rec, setRec] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [, bump] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const originals = useRef<Map<any, string> | null>(null);
  const ds: DataSet = useMemo(() => parseTable(text), [text]);

  const pageObjs = () => { const c = api.canvas(); const p = api.page(); return c ? c.getObjects().filter((o: any) => !o.__isArtboard && (!p.id || !o.__artboardId || o.__artboardId === p.id)) : []; };
  const textFields = () => pageObjs().filter((o: any) => isText(o) && /\{[^{}]+\}/.test(o.__mergeTpl ?? o.text ?? ''));
  const qrFields = () => pageObjs().filter((o: any) => o.__mergeQr);
  const fieldTpls = () => [...textFields().map((o: any) => o.__mergeTpl ?? o.text), ...qrFields().map((o: any) => o.__mergeQr)];
  const unknown = useMemo(() => [...new Set(fieldTpls().flatMap((t: string) => unknownFields(t, ds)))], [ds, busy, previewing]); // eslint-disable-line react-hooks/exhaustive-deps

  // checks
  const missing = useMemo(() => {
    const used = new Set(fieldTpls().flatMap((t: string) => [...t.matchAll(/\{([^{}#][^{}]*)\}/g)].map((m) => m[1].trim().toLowerCase())));
    const out: string[] = [];
    ds.rows.forEach((r, i) => ds.headers.forEach((h, k) => { if (used.has(h.toLowerCase()) && !r[k]) out.push(`Row ${i + 1}: ${h}`); }));
    return out;
  }, [ds, busy, previewing]); // eslint-disable-line react-hooks/exhaustive-deps
  const dupes = useMemo(() => { const seen = new Set<string>(), d: string[] = []; ds.rows.forEach((r) => { const k = (r[0] || '').toLowerCase(); if (!k) return; if (seen.has(k)) d.push(r[0]); seen.add(k); }); return [...new Set(d)]; }, [ds]);

  const addField = (tpl: string) => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F) return;
    const p = api.page();
    const t = new F.Textbox(tpl, { left: p.x + p.width * 0.15, top: p.y + p.height * 0.45, width: p.width * 0.7, fontSize: Math.max(18, p.width / 22), fontFamily: 'Inter', textAlign: 'center', fill: '#111827', name: `Field ${tpl}` });
    c.add(t); c.setActiveObject(t); c.requestRenderAll(); api.commit(); bump((n) => n + 1);
  };
  const qrSvg = async (data: string) => {
    const { buildGrid, qrDesignSvg, DEFAULT_LOOK } = await import('@/lib/qrStyle');
    const G = buildGrid(data || ' ', DEFAULT_LOOK, false);
    return qrDesignSvg(G, DEFAULT_LOOK, null, 600).svg;
  };
  const setQrImage = async (o: any, data: string) => {
    const svg = await qrSvg(data);
    await new Promise<void>((res) => { const img = new Image(); img.onload = () => { const w = o.getScaledWidth(); o.setElement(img); o.scaleToWidth(w); res(); }; img.onerror = () => res(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  };
  const addQrField = (col: string) => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F) return;
    run('Adding the QR field…', async () => {
      const first = ds.rows.length ? fillTemplate(`{${col}}`, ds, 0) : 'https://magicaltouchdesign.com';
      const svg = await qrSvg(first);
      const img: any = await new Promise((res) => F.Image.fromURL('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), (i: any) => res(i)));
      const p = api.page(), size = Math.min(p.width, p.height) * 0.25;
      img.scaleToWidth(size); img.set({ left: p.x + p.width - size - p.width * 0.06, top: p.y + p.height - size - p.height * 0.06, name: `QR {${col}}` });
      img.__mergeQr = `{${col}}`;
      c.add(img); c.setActiveObject(img); c.requestRenderAll(); api.commit(); bump((n) => n + 1);
    });
  };

  /** Puts record i on the page (remembering the template text the first time). */
  const apply = async (i: number) => {
    if (!originals.current) { originals.current = new Map(); textFields().forEach((o: any) => originals.current!.set(o, o.__mergeTpl ?? o.text)); qrFields().forEach((o: any) => originals.current!.set(o, o.__mergeQr)); }
    for (const [o, tpl] of originals.current) {
      if (isText(o)) { o.__mergeTpl = tpl; o.set({ text: fillTemplate(tpl, ds, i) }); o.initDimensions?.(); }
      else if (o.__mergeQr) await setQrImage(o, fillTemplate(tpl, ds, i));
    }
    api.canvas()?.requestRenderAll();
  };
  const restore = async () => {
    if (!originals.current) return;
    for (const [o, tpl] of originals.current) { if (isText(o)) { o.set({ text: tpl }); o.initDimensions?.(); } }
    originals.current = null; setPreviewing(false); api.canvas()?.requestRenderAll(); bump((n) => n + 1);
  };
  const show = async (i: number) => { const n = Math.max(0, Math.min(ds.rows.length - 1, i)); setRec(n); await apply(n); setPreviewing(true); };
  const run = async (what: string, f: () => Promise<void>) => { setBusy(what); try { await f(); } catch (e: any) { api.notice(e?.message || 'That did not work.'); } finally { setBusy(null); } };
  const merged = async () => {
    if (!ds.rows.length) throw new Error('Add some data first (paste from a spreadsheet or import a CSV).');
    if (!fieldTpls().length) throw new Error('Put a field on the page first, for example a text with {Name}.');
    const bytes = await api.recordsPdf(ds.rows.length, apply);
    await restore();
    return bytes;
  };
  const download = () => run(`Making ${ds.rows.length} pages…`, async () => {
    const b = await merged();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([b as BlobPart], { type: 'application/pdf' })); a.download = `data-merge_${ds.rows.length}-records.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    api.notice(`${ds.rows.length} pages downloaded — one per record.`);
  });
  const toSheets = () => run(`Making ${ds.rows.length} pages…`, async () => { const b = await merged(); api.openStudio('layout', new File([b as BlobPart], 'data-merge.pdf', { type: 'application/pdf' })); });

  const tf = textFields(), qf = qrFields();
  return (
    <div className="space-y-4 text-[12px]">
      <section>
        <p className={label}>1 · Fields on this page</p>
        {tf.length + qf.length === 0 ? <p className="text-[11.5px] text-mt-muted">No fields yet. Type <code className="rounded bg-mt-surface2 px-1">{'{Name}'}</code> in any text, or add one below. <code className="rounded bg-mt-surface2 px-1">{'{#0001}'}</code> numbers each record.</p>
          : <ul className="space-y-1">{[...tf.map((o: any) => ({ k: o, t: o.__mergeTpl ?? o.text, q: false })), ...qf.map((o: any) => ({ k: o, t: o.__mergeQr, q: true }))].map(({ k, t, q }, i) => <li key={i} className="flex items-center gap-1.5 truncate rounded-md border border-mt-border px-2 py-1">{q && <QrCode size={12} className="shrink-0" />}<span className="truncate font-mono text-[11px]">{String(t).slice(0, 60)}</span><button type="button" className="ml-auto text-[11px] text-mt-muted hover:text-mt-ink" onClick={() => { api.canvas()?.setActiveObject(k); api.canvas()?.requestRenderAll(); }}>Select</button></li>)}</ul>}
        <div className="mt-2 flex flex-wrap gap-1">
          {(ds.headers.length ? ds.headers : ['Name', 'Title']).slice(0, 6).map((h) => <button key={h} type="button" className={btn} onClick={() => addField(`{${h}}`)}><Plus size={12} /> {h}</button>)}
          <button type="button" className={btn} onClick={() => addField('No. {#0001}')}><Plus size={12} /> Serial no.</button>
        </div>
        {ds.headers.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{ds.headers.slice(0, 6).map((h) => <button key={h} type="button" className={btn} onClick={() => addQrField(h)}><QrCode size={12} /> QR of {h}</button>)}</div>}
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between"><p className={label.replace('mb-1 ', '')}>2 · Data</p>
          <span className="flex gap-1"><button type="button" className="text-[11px] text-mt-muted underline" onClick={() => setText(SAMPLE)}>Sample</button><button type="button" className={btn} onClick={() => fileRef.current?.click()}><FileUp size={12} /> CSV</button></span></div>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" aria-label="CSV file" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) setText(await fl.text()); e.target.value = ''; }} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={'Paste from Excel or Google Sheets, or type:\nName,Title,Number\nRavi,Designer,07'} aria-label="Merge data" className="w-full rounded-md border border-mt-border bg-mt-bg p-2 font-mono text-[11px]" />
        {ds.headers.length > 0 && (
          <div className="mt-1 overflow-x-auto rounded-md border border-mt-border">
            <table className="w-full text-[10.5px]"><thead><tr className="bg-mt-surface2">{ds.headers.map((h) => <th key={h} className="px-1.5 py-1 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>{ds.rows.slice(0, 4).map((r, i) => <tr key={i} className="border-t border-mt-border">{r.map((c, k) => <td key={k} className={`max-w-[90px] truncate px-1.5 py-0.5 ${!c ? 'bg-amber-500/10' : ''}`}>{c || '—'}</td>)}</tr>)}</tbody></table>
            <p className="px-1.5 py-1 text-[10.5px] text-mt-faint">{ds.rows.length} record{ds.rows.length === 1 ? '' : 's'}{ds.rows.length > 4 ? ` (first 4 shown)` : ''}</p>
          </div>
        )}
      </section>

      {(unknown.length > 0 || missing.length > 0 || dupes.length > 0) && <ul className="space-y-1 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
        {unknown.length > 0 && <li className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />No column for {unknown.map((u) => `{${u}}`).join(', ')}</li>}
        {missing.length > 0 && <li className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{missing.length} empty value{missing.length === 1 ? '' : 's'}: {missing.slice(0, 3).join('; ')}{missing.length > 3 ? '…' : ''}</li>}
        {dupes.length > 0 && <li className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />Repeated in the first column: {dupes.slice(0, 4).join(', ')}</li>}
      </ul>}

      <section>
        <p className={label}>3 · Preview</p>
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} disabled={!ds.rows.length} onClick={() => show(rec - 1)} aria-label="Previous record"><ChevronLeft size={14} /></button>
          <button type="button" className={`${btn} flex-1`} disabled={!ds.rows.length} onClick={() => show(rec)}>{previewing ? `Record ${rec + 1} of ${ds.rows.length}` : 'Show a record on the page'}</button>
          <button type="button" className={btn} disabled={!ds.rows.length} onClick={() => show(rec + 1)} aria-label="Next record"><ChevronRight size={14} /></button>
        </div>
        {previewing && <button type="button" className={`${btn} mt-1.5 w-full`} onClick={restore}><Undo2 size={12} /> Back to the fields</button>}
      </section>

      <section className="space-y-2">
        <p className={label}>4 · Output</p>
        <button type="button" className={primary} disabled={!!busy || !ds.rows.length} onClick={download}><Download size={14} /> PDF — one page per record</button>
        <button type="button" className={`${btn} w-full`} disabled={!!busy || !ds.rows.length} onClick={toSheets}><Layers size={13} /> Many per sheet with crop marks…</button>
        {busy && <p className="text-[11px] text-mt-muted">{busy}</p>}
        <p className="text-[11px] text-mt-faint">Business cards, certificates, ID cards, tickets, labels, invitations. Text stays vector in the PDF; your data never leaves this device.</p>
      </section>
    </div>
  );
}
