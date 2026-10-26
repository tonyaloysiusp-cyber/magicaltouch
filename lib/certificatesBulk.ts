// Bulk certificates: parse a pasted list of names, render each issued
// certificate (design + filled text + QR verification block) to an image,
// and package them as one multi-page PDF or a ZIP of PDFs.

import { renderTemplatePages } from '@/lib/templates/renderPages';
import { buildVerificationBlock, fillCertificateJson, IssuedCertificate } from '@/lib/certificates';
import { buildZip } from '@/lib/editor/zip';

export interface BulkRow { recipient: string; title: string; description: string }

/**
 * One certificate per line. A line may be just a name, or
 * "Name, Title, Details" / tab-separated (as pasted from Excel or Sheets).
 * Empty title/details fall back to the shared defaults.
 */
export function parseBulkNames(text: string, defaults: { title: string; description: string }): BulkRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = (l.includes('\t') ? l.split('\t') : l.split(/\s*[,;]\s*/)).map((x) => x.trim());
      return { recipient: parts[0] || '', title: parts[1] || defaults.title, description: parts.slice(2).join(', ') || defaults.description };
    })
    .filter((r) => r.recipient && !/^(name|full name|recipient)$/i.test(r.recipient));
}

/** The issued certificate as a high-resolution image (first page of the design). */
export async function renderIssuedCertificate(masterJson: any, c: IssuedCertificate, maxSide = 2400) {
  // A certificate finished by hand in the editor (signature, extra logos…)
  // keeps its own design, already filled in and with its QR block.
  const own = (c as any).canvas_json;
  if (own) {
    const pages = await renderTemplatePages(own, maxSide, { format: 'jpeg', quality: 0.92, maxMultiplier: 4 });
    return pages[0] || null;
  }
  const json = fillCertificateJson(masterJson, c);
  const pages = await renderTemplatePages(json, maxSide, {
    format: 'jpeg',
    quality: 0.92,
    maxMultiplier: 4,
    prepare: (canvas, F, boards) => {
      const page = boards[0];
      const slot = canvas.getObjects().find((o: any) => o.name === 'Verification slot');
      const pw = page ? page.width * (page.scaleX || 1) : canvas.getWidth();
      const ph = page ? page.height * (page.scaleY || 1) : canvas.getHeight();
      const size = slot ? Math.min(slot.getScaledWidth(), slot.getScaledHeight()) : Math.min(pw, ph) * 0.13;
      const at = slot ? { x: slot.left, y: slot.top, size } : { x: (page?.left || 0) + pw - size * 1.6, y: (page?.top || 0) + ph - size * 1.9, size };
      if (slot) canvas.remove(slot);
      buildVerificationBlock(F, c, at).forEach((o: any) => canvas.add(o));
    },
  });
  return pages[0] || null;
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'certificate';

/**
 * Renders every certificate and returns a single PDF (one page each) or a
 * ZIP with one PDF per person. onProgress(done, total) drives a progress bar.
 */
export async function packageCertificates(
  masterJson: any,
  certs: IssuedCertificate[],
  mode: 'pdf' | 'zip',
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; fileName: string }> {
  const { jsPDF } = await import('jspdf');
  const pxToMm = (px: number) => (px / 96) * 25.4;
  let doc: any = null;
  const zipParts: { name: string; data: Uint8Array }[] = [];
  for (let i = 0; i < certs.length; i++) {
    const c = certs[i];
    const img = await renderIssuedCertificate(masterJson, c);
    if (img) {
      const w = pxToMm(img.width), h = pxToMm(img.height);
      const orientation = w >= h ? 'landscape' : 'portrait';
      if (mode === 'pdf') {
        if (!doc) doc = new jsPDF({ orientation, unit: 'mm', format: [w, h], compress: true });
        else doc.addPage([w, h], orientation);
        doc.addImage(img.url, 'JPEG', 0, 0, w, h, undefined, 'FAST');
      } else {
        const one: any = new jsPDF({ orientation, unit: 'mm', format: [w, h], compress: true });
        one.addImage(img.url, 'JPEG', 0, 0, w, h, undefined, 'FAST');
        one.setProperties({ title: `${c.title} — ${c.recipient}`, subject: `Certificate ${c.code}`, author: 'Magical Touch Design' });
        zipParts.push({ name: `${String(i + 1).padStart(3, '0')} ${safeName(c.recipient)} (${c.code}).pdf`, data: new Uint8Array(one.output('arraybuffer')) });
      }
    }
    onProgress?.(i + 1, certs.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  if (mode === 'pdf') {
    doc?.setProperties({ title: `Certificates ${stamp}`, author: 'Magical Touch Design' });
    return { blob: doc ? doc.output('blob') : new Blob(), fileName: `Certificates ${stamp} (${certs.length}).pdf` };
  }
  return { blob: buildZip(zipParts), fileName: `Certificates ${stamp} (${certs.length}).zip` };
}
