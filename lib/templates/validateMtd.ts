// ---------------------------------------------------------------------
// lib/templates/validateMtd.ts -- checks an uploaded .mtd before it can
// become template content (storage spec §21-§23). An invalid template is
// never published; every problem is reported by name.
// ---------------------------------------------------------------------

import type { OpenedMtd } from '@/lib/mtd/format';
import { GOOGLE_FONT_NAMES } from '@/lib/editor/googleFonts';

// Every object type the editor itself creates and can load.
const SUPPORTED_TYPES = new Set([
  'rect', 'circle', 'ellipse', 'triangle', 'line', 'polyline', 'polygon', 'path',
  'textbox', 'i-text', 'text', 'image', 'group',
]);
const MAX_SIDE = 20000;

export interface TemplateValidation {
  errors: string[];
  warnings: string[];
  stats: { layers: number; images: number; texts: number; artboards: number; fonts: string[] };
}

export function validateTemplateMtd(opened: OpenedMtd): TemplateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = { layers: 0, images: 0, texts: 0, artboards: 0, fonts: [] as string[] };
  const unsupported = new Set<string>();
  const fonts = new Set<string>();

  const { width, height, editor } = opened.document;
  if (editor !== 'design') errors.push('This project was made in Photo Studio. Templates must be made in the Design editor.');
  if (width > MAX_SIDE || height > MAX_SIDE) errors.push(`Page size ${width}×${height} is too large (max ${MAX_SIDE}px per side).`);

  const visit = (obj: any, depth: number) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.__isArtboard) {
      stats.artboards++;
      return;
    }
    if (obj.__isGuide) return;
    if (depth === 0) stats.layers++;
    const type = String(obj.type || '').toLowerCase();
    if (!SUPPORTED_TYPES.has(type)) unsupported.add(type || 'unknown');
    if (type === 'image') {
      stats.images++;
      if (!obj.src) errors.push(`An image${obj.name ? ` ("${obj.name}")` : ''} has no picture data.`);
    }
    if (type === 'textbox' || type === 'i-text' || type === 'text') {
      stats.texts++;
      if (typeof obj.fontFamily === 'string') fonts.add(obj.fontFamily);
    }
    if (Array.isArray(obj.objects)) obj.objects.forEach((child: any) => visit(child, depth + 1));
  };
  (opened.canvas.objects || []).forEach((o: any) => visit(o, 0));

  opened.missingAssets.forEach((id) => errors.push(`Missing asset: ${id.slice(0, 12)}…`));
  unsupported.forEach((t) => errors.push(`Unsupported element: ${t}`));

  const known = new Set(GOOGLE_FONT_NAMES.map((f) => f.toLowerCase()));
  stats.fonts = Array.from(fonts).sort();
  stats.fonts
    .filter((f) => !known.has(f.toLowerCase()))
    .forEach((f) => errors.push(`Missing font: ${f} — it isn't in the site's licensed font list. Change the text to an available font.`));

  if (stats.layers === 0) errors.push('The design is empty.');
  if (stats.artboards === 0) warnings.push('No artboard found; one will be created at the page size.');
  if (stats.artboards > 1) warnings.push(`${stats.artboards} artboards found; the thumbnail shows the first one.`);
  if (!opened.thumbnail) warnings.push('No preview image in the file; add one with "Replace thumbnail".');

  return { errors, warnings, stats };
}
