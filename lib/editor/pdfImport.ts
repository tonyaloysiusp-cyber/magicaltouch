// ---------------------------------------------------------------------
// lib/editor/pdfImport.ts
// Renders pages of an IMPORTED PDF into real raster images (via pdf.js),
// so a user can drop a multi-page PDF into the editor and bring in just
// the pages they need as editable image layers. This is a separate
// concern from lib/editor/pdfExport.ts, which only ever WRITES PDFs —
// reading one back requires pdf.js's own renderer, which jsPDF (the
// export-only library already in this app) doesn't provide.
// ---------------------------------------------------------------------

let pdfjsLibPromise: Promise<any> | null = null;

// Loaded lazily (not at module scope) since pdf.js only runs in the
// browser and this file is imported from the editor's client bundle.
async function getPdfjs(): Promise<any> {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((mod) => {
      // The worker file is copied into public/ at build time (see
      // public/pdf.worker.min.mjs) rather than resolved via a bundler
      // asset URL, which is the simplest way to guarantee pdf.js finds
      // its worker regardless of how Next.js's webpack config handles
      // `new URL(..., import.meta.url)` in a given build.
      mod.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return mod;
    });
  }
  return pdfjsLibPromise;
}

// pdf.js's own PDFDocumentProxy.destroy() releases the worker-side
// document early — a memory-management nicety, not something the actual
// import result depends on, so a build/bundling quirk that makes it
// unavailable (or makes calling it throw) should never take down the
// whole import with it.
async function safeDestroy(doc: any): Promise<void> {
  try {
    if (typeof doc?.destroy === 'function') await doc.destroy();
  } catch {
    // Best-effort cleanup only.
  }
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const count = doc.numPages;
  await safeDestroy(doc);
  return count;
}

export interface RenderedPdfPage {
  page: number;
  dataUrl: string;
  width: number;
  height: number;
}

// Renders each requested 1-indexed page to a PNG data URL at the given
// scale (2 = ~144dpi equivalent for a page authored at 72pt/in, plenty
// sharp for placing as an editable image layer without being needlessly
// huge).
export async function renderPdfPages(file: File, pages: number[], scale = 2): Promise<RenderedPdfPage[]> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const results: RenderedPdfPage[] = [];
  try {
    for (const pageNum of pages) {
      if (pageNum < 1 || pageNum > doc.numPages) continue;
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      results.push({ page: pageNum, dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
    }
  } finally {
    await safeDestroy(doc);
  }
  return results;
}

// Parses a user-typed page range like "1-3, 5, 8-9" (or "all") against a
// known page count into a sorted, deduped, in-range list of page numbers.
// Returns an empty array for input that resolves to nothing real, rather
// than silently guessing — the caller shows that as a validation error
// instead of importing pages the user didn't ask for.
export function parsePageRange(input: string, maxPage: number): number[] {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed === 'all') {
    return Array.from({ length: maxPage }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  for (const part of trimmed.split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    const rangeMatch = seg.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) {
        if (p >= 1 && p <= maxPage) pages.add(p);
      }
      continue;
    }
    const single = parseInt(seg, 10);
    if (!isNaN(single) && single >= 1 && single <= maxPage) pages.add(single);
  }
  return Array.from(pages).sort((a, b) => a - b);
}
