// Image Trace → editable vectors.
// Builds the traced artwork as Fabric objects: one group per colour, and
// inside it one path per shape when "Separate shapes" is on. Ungroup once
// to get the colour layers, again to get every single shape. The same
// objects are written to a vector PDF with the editor's PDF writer.

import { TraceResult, toFabricPath } from './trace';

/** Colour-layer groups (or single compound paths) for a trace result. */
export function traceLayerObjects(F: any, r: TraceResult): any[] {
  return r.layers.map((l, i) => {
    const name = `Colour ${i + 1} · ${l.color}`;
    const mk = (d: string, n: string) => new F.Path(toFabricPath(d) as any, { fill: l.color, fillRule: 'evenodd', stroke: null, strokeWidth: 0, objectCaching: true, name: n });
    if (l.shapes && l.shapes.length > 1) return new F.Group(l.shapes.map((d, k) => mk(d, `${name} · shape ${k + 1}`)), { name, subTargetCheck: true });
    return mk(l.d, name);
  });
}

/** The whole artwork as one group, pinned to the image box by an invisible frame. */
export async function traceGroup(r: TraceResult, background?: string): Promise<{ F: any; group: any }> {
  const mod: any = await import('fabric');
  const F = mod.fabric;
  const frame = new F.Rect({ left: 0, top: 0, width: r.width, height: r.height, fill: background || 'rgba(0,0,0,0)', strokeWidth: 0, name: background ? 'Background' : 'Trace frame' });
  const group = new F.Group([frame, ...traceLayerObjects(F, r)], { name: 'Traced artwork', subTargetCheck: true });
  return { F, group };
}

/** Canvas JSON for the editor (fresh document the size of the artwork). */
export async function traceCanvasJson(r: TraceResult, background?: string) {
  const { group } = await traceGroup(r, background);
  group.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
  return { version: '5.1.0', background: background || '#FFFFFF', objects: [group.toObject(['name', 'subTargetCheck'])] };
}

/** Vector PDF of the traced artwork (page = artwork size). */
export async function tracePdf(r: TraceResult, background?: string): Promise<Blob> {
  const { F, group } = await traceGroup(r, background);
  group.set({ left: 0, top: 0, originX: 'left', originY: 'top' });
  const canvas = new F.StaticCanvas(null, { width: r.width, height: r.height, renderOnAddRemove: false });
  canvas.add(group);
  const { jsPDF } = await import('jspdf');
  const { exportCanvasToPDF, toPt } = await import('./editor/pdfExport');
  const wPt = toPt(r.width), hPt = toPt(r.height);
  const pdf = new jsPDF({ orientation: wPt > hPt ? 'landscape' : 'portrait', unit: 'pt', format: [wPt, hPt], compress: true });
  await exportCanvasToPDF(pdf, canvas, F);
  canvas.dispose();
  return pdf.output('blob');
}
