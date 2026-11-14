// Our own PDFs carry the editable design inside them: when the design editor
// exports a PDF, the Magical Touch project (.mtd) is attached to the PDF as
// an embedded file. Any PDF viewer ignores it; importing the PDF back into
// the editor finds it and reopens the design exactly — every layer, text,
// colour and effect editable — instead of reconstructing it from drawing
// commands. The PDF's printed content is unchanged.

export const PROJECT_ATTACHMENT = 'magical-touch-design.mtd';

/** Adds the project to a finished PDF (bytes) — returns the new bytes, or the original if anything fails. */
export async function attachProject(pdfBytes: ArrayBuffer | Uint8Array, mtd: Blob): Promise<Uint8Array> {
  const src = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(src, { updateMetadata: false });
    await doc.attach(new Uint8Array(await mtd.arrayBuffer()), PROJECT_ATTACHMENT, {
      mimeType: 'application/x-magicaltouch-design',
      description: 'Editable Magical Touch design — import this PDF into magicaltouchdesign.com to edit every layer.',
      creationDate: new Date(),
      modificationDate: new Date(),
    });
    return await doc.save({ useObjectStreams: false }); // plain cross-reference table, like the original — friendlier to older RIPs
  } catch {
    return src;
  }
}

/** Saves a jsPDF document with the project attached (falls back to a plain PDF). */
export async function savePdfWithProject(pdf: any, filename: string, mtd: Blob | null): Promise<void> {
  if (!mtd) { pdf.save(filename); return; }
  const bytes = await attachProject(pdf.output('arraybuffer'), mtd);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** The attached Magical Touch project, if this PDF was exported by our editor. */
export async function readProjectFromPdf(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const L: any = await import('pdf-lib');
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream, PDFString, PDFHexString, decodePDFRawStream } = L;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const ctx = doc.context;
    const names = ctx.lookup(doc.catalog.get(PDFName.of('Names')));
    if (!(names instanceof PDFDict)) return null;
    const ef = ctx.lookup(names.get(PDFName.of('EmbeddedFiles')));
    if (!(ef instanceof PDFDict)) return null;
    // Walk the name tree (Names arrays, possibly under Kids).
    const found: any[] = [];
    const walk = (node: any, depth: number) => {
      if (!(node instanceof PDFDict) || depth > 8) return;
      const arr = ctx.lookup(node.get(PDFName.of('Names')));
      if (arr instanceof PDFArray) for (let i = 0; i + 1 < arr.size(); i += 2) {
        const k = ctx.lookup(arr.get(i));
        const key = k instanceof PDFString || k instanceof PDFHexString ? k.decodeText() : '';
        found.push([key, ctx.lookup(arr.get(i + 1))]);
      }
      const kids = ctx.lookup(node.get(PDFName.of('Kids')));
      if (kids instanceof PDFArray) for (let i = 0; i < kids.size(); i++) walk(ctx.lookup(kids.get(i)), depth + 1);
    };
    walk(ef, 0);
    const hit = found.find(([k]) => k === PROJECT_ATTACHMENT);
    if (!hit || !(hit[1] instanceof PDFDict)) return null;
    const efd = ctx.lookup(hit[1].get(PDFName.of('EF')));
    if (!(efd instanceof PDFDict)) return null;
    const stream = ctx.lookup(efd.get(PDFName.of('F')));
    if (!stream) return null;
    return stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : stream.getContents();
  } catch {
    return null;
  }
}
