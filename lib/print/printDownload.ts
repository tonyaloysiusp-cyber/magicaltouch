// Browser side of the print set: brand logo for the report / template,
// SVG → PDF, and saving the files (one .zip or separate PDFs). Everything
// stays on this device.

export async function loadImage(path: string): Promise<{ src: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch(path)).blob();
    const src = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    const img = new Image(); img.src = src; await img.decode();
    return { src, w: img.naturalWidth, h: img.naturalHeight };
  } catch { return null; }
}

export async function svgPagesToPdf(pages: { svg: string; widthMm: number; heightMm: number }[]): Promise<Uint8Array> {
  const { svgToPdfBlob } = await import('../svgToPdf');
  const blob = await svgToPdfBlob('', 0, 0, pages);
  return new Uint8Array(await blob.arrayBuffer());
}

export function saveBytes(data: Uint8Array | Blob, name: string, type = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

export async function saveSet(out: { name: string; data: Uint8Array }[], zipName: string, zip: boolean) {
  if (zip && out.length > 1) {
    const { buildZip } = await import('../editor/zip');
    saveBytes(buildZip(out), zipName, 'application/zip');
    return;
  }
  for (const f of out) { saveBytes(f.data, f.name); await new Promise((r) => setTimeout(r, 450)); }
}

export const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const safeBase = (s: string, fallback = 'print-job') => (s || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || fallback;

/** CMYK conversion for print files (FOGRA39 coated): press LUT, output profile, JPEG decoding via canvas. */
export async function loadPressCmyk() {
  const [{ loadCmykTable, loadPressProfile, makeCmykMapper, rgbaToCmyk }] = await Promise.all([import('../color/cmyk')]);
  const [lut, icc] = await Promise.all([loadCmykTable(), loadPressProfile()]);
  return {
    toCmyk: makeCmykMapper(lut),
    pixels: (rgba: Uint8Array) => rgbaToCmyk(rgba, lut),
    icc,
    decodeJpeg: async (bytes: Uint8Array) => {
      const bmp = await createImageBitmap(new Blob([bytes as unknown as BlobPart], { type: 'image/jpeg' }));
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(bmp, 0, 0);
      return { rgba: new Uint8Array(ctx.getImageData(0, 0, c.width, c.height).data.buffer), width: c.width, height: c.height };
    },
  };
}

/** A print-ready PDF converted to CMYK (FOGRA39 coated) — used for every print file. */
export async function printPdfCmyk(bytes: Uint8Array): Promise<Uint8Array> {
  const [{ cmykify }, o] = await Promise.all([import('./cmykPdf'), loadPressCmyk()]);
  return (await cmykify(bytes, o)).bytes;
}
