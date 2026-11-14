'use client';

import { useEffect, useState } from 'react';
import { getPdfPageCount, parsePageRange } from '@/lib/editor/pdfImport';
import { readProjectFromPdf } from '@/lib/editor/pdfProject';

interface ImportDialogProps {
  file: File;
  onCancel: () => void;
  onConfirm: (pageNumbers: number[], mode: 'vector' | 'flat') => void;
  onOpenProject?: () => void;
  importing: boolean;
}

// Shown only for a PDF import (a plain image file skips straight to
// being placed on the canvas, same as the existing single-image upload)
// — lets the user pick which page(s) of a multi-page PDF to bring in,
// instead of always importing every page.
export function ImportDialog({ file, onCancel, onConfirm, onOpenProject, importing }: ImportDialogProps) {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState('all');
  const [error, setError] = useState<string | null>(null);
  // Never flattened unless the customer chooses it.
  const [mode, setMode] = useState<'vector' | 'flat'>('vector');
  const [hasProject, setHasProject] = useState(false);
  useEffect(() => { let live = true; file.arrayBuffer().then((b) => readProjectFromPdf(new Uint8Array(b))).then((p) => { if (live) setHasProject(!!p); }).catch(() => {}); return () => { live = false; }; }, [file]);

  useEffect(() => {
    let cancelled = false;
    getPdfPageCount(file)
      .then((count) => {
        if (!cancelled) setPageCount(count);
      })
      .catch((err) => {
        console.error('PDF import failed:', err);
        if (!cancelled) setError('Could not read this PDF — it may be corrupted or password-protected.');
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const confirm = () => {
    if (!pageCount) return;
    const pages = parsePageRange(rangeInput, pageCount);
    if (pages.length === 0) {
      setError(`"${rangeInput}" doesn't match any page in this ${pageCount}-page PDF.`);
      return;
    }
    setError(null);
    onConfirm(pages, mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-mt-surface rounded-xl shadow-xl w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-mt-ink mb-1">Import PDF</h2>
        <p className="text-sm text-mt-muted mb-4 truncate" title={file.name}>
          {file.name}
        </p>

        {hasProject && onOpenProject && (
          <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-[12.5px] text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100">
            <p className="font-semibold">This PDF was made in Magical Touch.</p>
            <p className="mt-0.5">It contains the original design — open it to get back every layer, text, colour and effect exactly as you left them.</p>
            <button type="button" onClick={onOpenProject} disabled={importing} className="mt-2 rounded-full bg-emerald-700 px-3 py-1.5 text-[12.5px] font-semibold text-white">Open the original design</button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {pageCount === null && !error ? (
          <p className="text-sm text-mt-faint py-4">Reading PDF…</p>
        ) : pageCount !== null ? (
          <div className="flex flex-col gap-2 mb-2">
            <label className="text-xs font-semibold text-mt-muted">
              Pages to import ({pageCount} total)
            </label>
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              placeholder='e.g. "all", "1-3", or "2, 4-5"'
              className="text-sm border rounded px-3 py-2"
              autoFocus
            />
            <fieldset className="mt-2 space-y-1.5" aria-label="How to import">
              <label className="flex items-start gap-2 rounded-lg border border-mt-border p-2 text-[12.5px] cursor-pointer">
                <input type="radio" name="pdfmode" checked={mode === 'vector'} onChange={() => setMode('vector')} className="mt-0.5" />
                <span><b>Editable layers</b> — every shape, text and picture becomes its own layer. Vectors stay vectors; text stays editable (fonts you don’t have are replaced, and you’ll be told which).</span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-mt-border p-2 text-[12.5px] cursor-pointer">
                <input type="radio" name="pdfmode" checked={mode === 'flat'} onChange={() => setMode('flat')} className="mt-0.5" />
                <span><b>One flattened picture per page</b> — looks exactly like the PDF, but text and shapes can no longer be edited. Use it when the page only needs to be placed, not changed.</span>
              </label>
            </fieldset>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} disabled={importing} className="text-sm px-4 py-2 rounded-full border hover:bg-mt-surface2 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={importing || pageCount === null}
            className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white font-semibold disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
