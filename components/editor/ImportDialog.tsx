'use client';

import { useEffect, useState } from 'react';
import { getPdfPageCount, parsePageRange } from '@/lib/editor/pdfImport';

interface ImportDialogProps {
  file: File;
  onCancel: () => void;
  onConfirm: (pageNumbers: number[]) => void;
  importing: boolean;
}

// Shown only for a PDF import (a plain image file skips straight to
// being placed on the canvas, same as the existing single-image upload)
// — lets the user pick which page(s) of a multi-page PDF to bring in,
// instead of always importing every page.
export function ImportDialog({ file, onCancel, onConfirm, importing }: ImportDialogProps) {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState('all');
  const [error, setError] = useState<string | null>(null);

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
    onConfirm(pages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-1">Import PDF</h2>
        <p className="text-sm text-gray-500 mb-4 truncate" title={file.name}>
          {file.name}
        </p>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        {pageCount === null && !error ? (
          <p className="text-sm text-gray-400 py-4">Reading PDF…</p>
        ) : pageCount !== null ? (
          <div className="flex flex-col gap-2 mb-2">
            <label className="text-xs font-semibold text-gray-500">
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
            <p className="text-[11px] text-gray-400">
              Each imported page is placed as its own editable image layer on the current artboard.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} disabled={importing} className="text-sm px-4 py-2 rounded-full border hover:bg-gray-50 disabled:opacity-50">
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
