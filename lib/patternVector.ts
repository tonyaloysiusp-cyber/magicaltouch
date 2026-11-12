// Pattern Studio → real vectors.
// Turns a pattern into Fabric objects (one editable path per motif, grouped,
// on an optional background rectangle). The same objects open in the design
// editor — where the group can be ungrouped and every motif recoloured,
// moved or deleted — and are written to a vector PDF with the editor's own
// PDF writer, so what you download matches what you would export there.

import { PatternSettings, sheetPlacements, motifPath } from './patterns';

export interface PatternFabricDoc { background: string; objects: any[] }

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Fabric JSON for the pattern on a page of width × height. */
export async function patternFabricJson(p: PatternSettings, width: number, height: number, opts: { transparent?: boolean } = {}): Promise<PatternFabricDoc> {
  const mod: any = await import('fabric');
  const F = mod.fabric;
  const d = motifPath(p);
  const places = sheetPlacements(p, width, height);
  const children: any[] = [];
  // Fabric centres a path on its own bounding box; shift each copy so the
  // motif lands exactly where the SVG puts it.
  let off = { x: 0, y: 0 };
  if (d) { const probe = new F.Path(d); off = { x: probe.pathOffset.x, y: probe.pathOffset.y }; }
  const pad = Math.max(24, p.tile) * p.scale;
  const gx = -pad, gy = -pad, gw = width + pad * 2, gh = height + pad * 2;
  const cx = gx + gw / 2, cy = gy + gh / 2;
  for (const q of places) {
    const a = (q.angle * Math.PI) / 180;
    const ox = off.x * q.sx, oy = off.y * q.sy;
    const x = q.x + ox * Math.cos(a) - oy * Math.sin(a);
    const y = q.y + ox * Math.sin(a) + oy * Math.cos(a);
    const base = {
      version: '5.1.0', originX: 'center', originY: 'center', left: r2(x - cx), top: r2(y - cy), angle: q.angle,
      scaleX: Math.abs(q.sx), scaleY: Math.abs(q.sy), flipX: q.sx < 0, flipY: q.sy < 0, opacity: 1,
    };
    if (d) {
      children.push({
        ...base, type: 'path', path: d, fillRule: 'evenodd', name: 'Motif',
        fill: p.stroke ? '' : q.color, stroke: p.stroke ? q.color : null, strokeWidth: p.stroke ? p.strokeWidth / Math.max(0.01, Math.abs(q.sx)) : 0,
        strokeLineJoin: 'round', strokeLineCap: 'round',
      });
    } else if (p.motif === 'text') {
      children.push({ ...base, type: 'text', text: (p.text || 'M').slice(0, 12), fontFamily: p.font || 'Georgia', fontWeight: String(p.fontWeight || 600), fontStyle: p.italic ? 'italic' : 'normal', fontSize: Math.min(80, Math.round(80 / Math.max(1, (p.text || 'M').length * 0.55))), fill: q.color, name: 'Motif' });
    } else if (p.image) {
      children.push({ ...base, type: 'image', src: p.image, width: 100, height: 100, crossOrigin: 'anonymous', name: 'Motif' });
    }
  }
  const group = {
    type: 'group', version: '5.1.0', originX: 'left', originY: 'top', left: r2(gx), top: r2(gy), width: r2(gw), height: r2(gh),
    opacity: p.opacity, name: 'Pattern (ungroup to edit each motif)', objects: children,
  };
  const objects: any[] = [];
  if (!opts.transparent) objects.push({ type: 'rect', version: '5.1.0', originX: 'left', originY: 'top', left: 0, top: 0, width, height, fill: p.background, strokeWidth: 0, name: 'Pattern background' });
  objects.push(group);
  return { background: opts.transparent ? '' : p.background, objects };
}

/** Vector PDF of the pattern (page = width × height at 96 px per inch). */
export async function patternPdf(p: PatternSettings, width: number, height: number, opts: { transparent?: boolean } = {}): Promise<Blob> {
  const doc = await patternFabricJson(p, width, height, opts);
  const mod: any = await import('fabric');
  const F = mod.fabric;
  const canvas = new F.StaticCanvas(null, { width, height, renderOnAddRemove: false });
  await new Promise<void>((res) => canvas.loadFromJSON({ version: '5.1.0', objects: doc.objects }, () => res()));
  const { jsPDF } = await import('jspdf');
  const { exportCanvasToPDF, toPt } = await import('./editor/pdfExport');
  const wPt = toPt(width), hPt = toPt(height);
  const pdf = new jsPDF({ orientation: wPt > hPt ? 'landscape' : 'portrait', unit: 'pt', format: [wPt, hPt], compress: true });
  await exportCanvasToPDF(pdf, canvas, F);
  canvas.dispose();
  return pdf.output('blob');
}
