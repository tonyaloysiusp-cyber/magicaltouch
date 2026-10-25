// Turns the photos in a template into empty photo frames, so the template
// is clean and reusable: same position, size, shape, rotation, opacity and
// layer order — only the picture is gone. Logos, icons, stickers and other
// graphics (PNG/SVG) are kept. Runs in the browser (admin tools).

import { ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';
import { PERSIST_PROPS } from '@/lib/editor/persist';
import { fillFrame, isFramed } from '@/lib/editor/frames';

// The same "Drop a photo" picture the editor draws for empty frames, as a
// small static file (6 KB) instead of a 300 KB data URL inside every design.
export const FRAME_PLACEHOLDER = '/templates/photo-frame-placeholder.jpg';

const PHOTO_RE = /\.(jpe?g|webp|avif|heic)(\?|#|$)/i;

/** A photograph (not a logo, icon or sticker). */
export function isPhotoObject(o: any): boolean {
  if (!o || o.type !== 'image' || o.__isArtboard) return false;
  if (o.__frame?.empty) return false;
  const src: string = (typeof o.getSrc === 'function' ? o.getSrc() : o.src) || '';
  if (src.includes(FRAME_PLACEHOLDER)) return false;
  const name = `${o.name || ''}`.toLowerCase();
  if (/logo|icon|sticker|badge|qr|signature|seal|stamp/.test(name)) return false;
  return PHOTO_RE.test(src) || /^data:image\/(jpeg|webp)/i.test(src);
}

/** How many photos the saved design contains (no canvas needed). */
export function countPhotosInJson(json: any): number {
  const j = typeof json === 'string' ? JSON.parse(json) : json;
  let n = 0;
  const walk = (list: any[]) => (list || []).forEach((o) => {
    if (o?.type === 'image' && isPhotoObject(o)) n++;
    if (o?.objects) walk(o.objects);
  });
  walk(j?.objects || []);
  return n;
}

export async function stripTemplatePhotos(canvasJson: any): Promise<{ json: any; replaced: number }> {
  const json = typeof canvasJson === 'string' ? JSON.parse(canvasJson) : canvasJson;
  await ensureFontsLoadedForCanvasJSON(json).catch(() => undefined);
  const mod: any = await import('fabric');
  const F = mod.fabric;
  const el = document.createElement('canvas');
  const canvas = new F.StaticCanvas(el, { enableRetinaScaling: false, renderOnAddRemove: false });
  await new Promise<void>((resolve) => canvas.loadFromJSON(json, () => resolve()));
  const placeholder = FRAME_PLACEHOLDER;
  let replaced = 0;
  for (const o of canvas.getObjects()) {
    if (!isPhotoObject(o)) continue;
    const before = { filters: o.filters, __photoEdits: o.__photoEdits, __originalSrc: o.__originalSrc, __adjust: o.__adjust, __frame: o.__frame, name: o.name };
    if (!isFramed(o)) o.__frame = { kind: 'rect' };
    // Drop photo edits that belonged to the old picture.
    o.filters = [];
    delete o.__photoEdits;
    delete o.__originalSrc;
    delete o.__adjust;
    try {
      await fillFrame(F, o, placeholder);
      // fillFrame keeps the frame where it was; mark it as waiting for a photo.
      o.__frame = { ...(o.__frame || { kind: 'rect' }), empty: true };
      o.name = 'Photo frame';
      replaced++;
    } catch {
      // Leave this photo as it was rather than risk breaking the layout.
      Object.assign(o, before);
    }
  }
  // Through JSON: 'clipPath' in PERSIST_PROPS would otherwise hand over the
  // live clip object (see cloneWithProps in lib/editor/persist.ts).
  const out = { ...json, ...JSON.parse(JSON.stringify(canvas.toJSON(PERSIST_PROPS))) };
  canvas.dispose();
  return { json: out, replaced };
}
