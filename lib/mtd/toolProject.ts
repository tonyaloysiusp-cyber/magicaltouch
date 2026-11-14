// Saving and opening projects made in the dedicated tools (jersey, polo,
// T-shirt, pattern, wall) as the same Magical Touch project file (.mtd) the
// design editor uses — one project format across the studio. Older .mtdt
// textile files still open (they are migrated on the next save).

import { buildMtd, readMtd, fileNameFor, type ToolKind } from './format';
import { saveMtdFile, type LocalFileRef } from './fileAccess';
import { rememberRecent } from './recent';
import { takeHandoff } from './handoff';
import { decodeMtdt, isMtdt } from '@/lib/mtdt';

export interface ToolProject<T = any> { kind: ToolKind; name: string; data: T; fileName?: string; handle?: any | null }

/** A small JPEG preview of an SVG (for the file icon and the dashboard). */
async function svgThumb(svg: string, size = 360): Promise<string | null> {
  try {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    const k = size / Math.max(img.naturalWidth || size, img.naturalHeight || size);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((img.naturalWidth || size) * k)); c.height = Math.max(1, Math.round((img.naturalHeight || size) * k));
    const g = c.getContext('2d')!; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } catch { return null; }
}

/** Save to the customer's device (same file again when the browser allows it). Returns where it went, or null if cancelled. */
export async function saveToolProject(p: { kind: ToolKind; name: string; data: unknown; previewSvg?: string; handle?: any | null }): Promise<LocalFileRef | null> {
  const thumbnail = p.previewSvg ? await svgThumb(p.previewSvg) : null;
  const { blob } = await buildMtd({
    canvas: { version: '5.1.0', objects: [] },
    document: { name: p.name || 'Untitled', width: 1000, height: 1000, editor: p.kind, createdAt: new Date().toISOString() },
    thumbnail,
    tool: { kind: p.kind, version: 1, data: p.data },
  });
  const ref = await saveMtdFile(blob, fileNameFor(p.name || 'Untitled'), p.handle || null);
  if (ref) await rememberRecent({ name: p.name || 'Untitled', fileName: ref.fileName, width: 1000, height: 1000, thumbnail, handle: ref.handle });
  return ref;
}

/** Read a .mtd / .mtd.svg project (or an older .mtdt file) made in one of the tools. */
export async function openToolFile(file: File): Promise<ToolProject> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isMtdt(bytes)) {
    const p = await decodeMtdt<any>(bytes);
    return { kind: p.kind as ToolKind, name: p.name, data: p.data, fileName: file.name };
  }
  const opened = await readMtd(file);
  if (!opened.tool) throw new Error('This project was made in the design editor — open it from the Dashboard or the editor.');
  return { kind: opened.tool.kind, name: opened.document.name, data: opened.tool.data, fileName: file.name };
}

/** A project handed over by the Dashboard / Open page (?localDoc=…), for this tool. */
export function takeToolHandoff(kind: ToolKind | ToolKind[]): ToolProject | null {
  const kinds = Array.isArray(kind) ? kind : [kind];
  try {
    const key = new URLSearchParams(window.location.search).get('localDoc');
    if (!key) return null;
    const h = takeHandoff(key);
    if (!h?.opened?.tool || !kinds.includes(h.opened.tool.kind)) return null;
    const u = new URL(window.location.href); u.searchParams.delete('localDoc'); window.history.replaceState(null, '', u.toString());
    return { kind: h.opened.tool.kind, name: h.opened.document.name, data: h.opened.tool.data, fileName: (h.file as any)?.fileName, handle: (h.file as any)?.handle || null };
  } catch { return null; }
}

export const TOOL_FILE_ACCEPT = '.mtd,.svg,.mtdt,application/gzip,image/svg+xml,application/octet-stream';
