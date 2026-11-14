// Browser-only helpers (pdf.js): page thumbnails for the imposition preview,
// and turning an imposed PDF into pictures for the "flattened" export.
import { getPdfjs } from '@/lib/editor/pdfImport';

export interface Thumb { url: string; view: { x: number; y: number; w: number; h: number } } // view in mm (user space, unrotated)
const MM = 25.4 / 72;

export async function pdfThumbs(bytes: Uint8Array, maxPx = 360): Promise<Thumb[]> {
  const pdfjs = await getPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out: Thumb[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const [x1, y1, x2, y2] = page.view;
      const scale = maxPx / Math.max(x2 - x1, y2 - y1);
      const vp = page.getViewport({ scale, rotation: 0 });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
      out.push({ url: c.toDataURL('image/jpeg', 0.8), view: { x: x1 * MM, y: y1 * MM, w: (x2 - x1) * MM, h: (y2 - y1) * MM } });
    }
  } finally { try { await doc.destroy(); } catch { /* ignore */ } }
  return out;
}

/** Every page as a JPEG at `dpi`, in a new PDF of the same page sizes (flattened — no longer editable). */
export async function flattenPdf(bytes: Uint8Array, dpi = 200, onProgress?: (i: number, n: number) => void): Promise<Uint8Array> {
  const pdfjs = await getPdfjs();
  const { PDFDocument } = await import('pdf-lib');
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out = await PDFDocument.create();
  out.setTitle('Flattened print file'); out.setCreator('Magical Touch Design — Print Layout');
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.(i, doc.numPages);
      const page = await doc.getPage(i);
      const vp1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: dpi / 72 });
      const c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      const jpg = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.92));
      const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      const p = out.addPage([vp1.width, vp1.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
      c.width = c.height = 0;
    }
  } finally { try { await doc.destroy(); } catch { /* ignore */ } }
  return out.save();
}
