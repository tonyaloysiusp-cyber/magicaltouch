// Renders every page (artboard) of a template's real design to an image,
// so the preview shows exactly what opens in the editor — all pages of a
// magazine, the front and back of a card, and so on.

import { ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';

export interface PageImage { name: string; url: string; width: number; height: number }

export async function renderTemplatePages(canvasJson: any, maxSide = 1100): Promise<PageImage[]> {
  if (!canvasJson) return [];
  const json = typeof canvasJson === 'string' ? JSON.parse(canvasJson) : canvasJson;
  await ensureFontsLoadedForCanvasJSON(json).catch(() => undefined);
  const mod: any = await import('fabric');
  const F = mod.fabric;
  const el = document.createElement('canvas');
  const canvas = new F.StaticCanvas(el, { enableRetinaScaling: false, renderOnAddRemove: false });
  await new Promise<void>((resolve) => canvas.loadFromJSON(json, () => resolve()));
  const boards = canvas
    .getObjects()
    .filter((o: any) => o.__isArtboard)
    .sort((a: any, b: any) => (a.top - b.top) * 10 + (a.left - b.left));
  // Guides and similar helpers never belong in a preview.
  canvas.getObjects().filter((o: any) => o.__isGuide).forEach((o: any) => canvas.remove(o));
  let maxX = 0, maxY = 0;
  canvas.getObjects().forEach((o: any) => {
    const r = o.getBoundingRect(true, true);
    maxX = Math.max(maxX, r.left + r.width);
    maxY = Math.max(maxY, r.top + r.height);
  });
  canvas.setDimensions({ width: Math.ceil(maxX) + 2, height: Math.ceil(maxY) + 2 });
  canvas.renderAll();
  const pages: PageImage[] = [];
  const list = boards.length ? boards : [null];
  list.forEach((ab: any, i: number) => {
    const left = ab ? ab.left : 0, top = ab ? ab.top : 0;
    const w = ab ? ab.width * (ab.scaleX || 1) : canvas.getWidth();
    const h = ab ? ab.height * (ab.scaleY || 1) : canvas.getHeight();
    const mult = Math.min(2, maxSide / Math.max(w, h));
    try {
      const url = canvas.toDataURL({ format: 'jpeg', quality: 0.88, left, top, width: w, height: h, multiplier: mult });
      pages.push({ name: (ab && ab.name) || `Page ${i + 1}`, url, width: w, height: h });
    } catch {
      // A picture from another site can block reading the canvas; skip.
    }
  });
  canvas.dispose();
  return pages;
}

/** "Front"/"Back" for two-page cards; otherwise the page's own name. */
export function pageLabel(pages: PageImage[], i: number): string {
  const n = pages[i]?.name || '';
  if (pages.length === 2 && /^(page|artboard)\s*\d+$/i.test(n)) return i === 0 ? 'Front' : 'Back';
  return n || `Page ${i + 1}`;
}
