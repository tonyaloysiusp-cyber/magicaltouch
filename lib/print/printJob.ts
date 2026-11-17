// A print job carried from the Print Size Calculator into the Design Editor
// and back out to the print export: finished size, bleed, safe area, panels,
// folds (position, direction, order), the sides to design (outside / inside)
// and the production values the information sheet lists. Travels in the
// editor URL (?printJob=…) and is then stored on each artboard's print
// settings, so it survives saving, reopening and undo.

import type { PressJob } from './pressSheet.ts';
import type { FoldResult } from '../fold.ts';

export interface PrintJobFold { x?: number; y?: number; label?: string; dir?: 'valley' | 'mountain'; order?: number }
export interface PrintJobInfo {
  v: 1;
  source: 'fold' | 'book' | 'page';
  /** "Tri-fold (letter / roll)", "Perfect binding cover"… */
  title: string;
  trimW: number; trimH: number; bleed: number; safe: number;
  /** Folds on the first side (outside), from the trim's top-left. */
  folds: PrintJobFold[];
  /** Panels on the first side, from the left. */
  panels: { x: number; w: number; name: string; inside?: string }[];
  /** Pages to design, in order. The second side of a leaflet is the mirror of the first. */
  sides: string[];
  folded?: { w: number; h: number; thick?: number };
  sequence?: string[];
  /** Extra production values for the information sheet, e.g. ['Paper', '170 gsm silk']. */
  values?: [string, string][];
}

const b64 = (s: string) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : (globalThis as any).Buffer.from(s, 'utf8').toString('base64'));
const unb64 = (s: string) => (typeof atob === 'function' ? decodeURIComponent(escape(atob(s))) : (globalThis as any).Buffer.from(s, 'base64').toString('utf8'));

export function encodePrintJob(j: PrintJobInfo): string {
  return b64(JSON.stringify(j)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodePrintJob(s: string | null | undefined): PrintJobInfo | null {
  if (!s) return null;
  try {
    const j = JSON.parse(unb64(s.replace(/-/g, '+').replace(/_/g, '/')));
    if (j?.v !== 1 || !(j.trimW > 0) || !(j.trimH > 0) || !Array.isArray(j.sides)) return null;
    return { ...j, folds: Array.isArray(j.folds) ? j.folds : [], panels: Array.isArray(j.panels) ? j.panels : [] };
  } catch { return null; }
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Folds of a side: the second side of a sheet is seen from the back, so vertical folds mirror. */
export function sideFolds(j: PrintJobInfo, side: number): PrintJobFold[] {
  if (side === 0) return j.folds;
  return j.folds.map((f): PrintJobFold => ({ ...f, x: f.x != null ? r2(j.trimW - f.x) : undefined, dir: f.dir ? (f.dir === 'valley' ? 'mountain' : 'valley') : undefined })).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
}
export function sidePanels(j: PrintJobInfo, side: number): { x: number; w: number; name: string }[] {
  if (side === 0) return j.panels.map((p) => ({ x: p.x, w: p.w, name: p.name }));
  return j.panels.map((p) => ({ x: r2(j.trimW - p.x - p.w), w: p.w, name: p.inside || p.name })).sort((a, b) => a.x - b.x);
}

/** The press-sheet job for one side. */
export function sidePressJob(j: PrintJobInfo, side: number, name: string): PressJob {
  const folds = sideFolds(j, side);
  return {
    name, title: `${j.title}${j.sides.length > 1 ? ` · ${j.sides[side] || `side ${side + 1}`}` : ''}`,
    trimW: j.trimW, trimH: j.trimH, bleed: j.bleed, safe: j.safe,
    folds: folds.map((f) => ({ x: f.x, y: f.y, label: f.label })),
    panels: sidePanels(j, side).map((p) => ({ ...p, name: p.name.toUpperCase() })),
  };
}

/** A job for a design that did not come from the calculator: one page, its own size and bleed. */
export function pageJob(o: { trimW: number; trimH: number; bleed: number; safe: number; name: string; pages: number }): PrintJobInfo {
  return { v: 1, source: 'page', title: o.name, trimW: r2(o.trimW), trimH: r2(o.trimH), bleed: r2(o.bleed), safe: r2(o.safe), folds: [], panels: [], sides: Array.from({ length: Math.max(1, o.pages) }, (_, i) => `Page ${i + 1}`) };
}

/** Editor URL that opens a print job: page size in px (96 / in), bleed, safe, fold guides and the job. */
export function printJobEditorUrl(j: PrintJobInfo, dpi = 300): string {
  const px = (mm: number) => String(Math.round((mm / 25.4) * 96 * 1000) / 1000);
  const q = new URLSearchParams({ w: px(j.trimW), h: px(j.trimH), dpi: String(dpi), bg: 'white' });
  for (const k of ['T', 'R', 'B', 'L']) { q.set(`bleed${k}`, px(j.bleed)); q.set(`safe${k}`, px(j.safe)); }
  const v = j.folds.filter((f) => f.x != null).map((f) => px(f.x!)), h = j.folds.filter((f) => f.y != null).map((f) => px(f.y!));
  if (v.length) q.set('guidesV', v.join(','));
  if (h.length) q.set('guidesH', h.join(','));
  q.set('printJob', encodePrintJob(j));
  q.set('newTab', `${j.source}-${Math.round(j.trimW)}x${Math.round(j.trimH)}-${Date.now().toString(36)}`);
  return `/editor?${q.toString()}`;
}

/** The print job of a folded leaflet from the folding calculator: both sides, folds, panels, paper. */
export function foldPrintJob(r: FoldResult, o: { title: string; bleed: number; safe: number; paper?: string }): PrintJobInfo {
  return {
    v: 1, source: 'fold', title: o.title, trimW: r.flat.w, trimH: r.flat.h, bleed: o.bleed, safe: o.safe,
    folds: r.folds.map((f) => ({ x: f.x, y: f.y, dir: f.dir, order: f.order })),
    panels: r.panels.map((p) => ({ x: p.x, w: p.w, name: p.outside, inside: p.inside })),
    sides: ['Outside', 'Inside'], folded: r.folded, sequence: r.sequence,
    values: [...(o.paper ? [['Paper', o.paper] as [string, string]] : []), ...(r.allowance ? [['Creep allowance', `${r.allowance} mm per tuck-in panel`] as [string, string]] : [])],
  };
}
