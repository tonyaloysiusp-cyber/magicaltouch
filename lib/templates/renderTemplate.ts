// ---------------------------------------------------------------------
// lib/templates/renderTemplate.ts
// Turns a TemplateBuilderDef (lib/templates/builders.ts) into a real
// Main-Design-compatible canvas_json + thumbnail, the same way
// lib/editor/buildPhotoDesignPayload.ts does for Photo Studio: a real
// headless Fabric StaticCanvas with a proper Artboard object, so the
// result is byte-compatible with what Main Design's own save produces
// and needs no special-casing to load, edit, or export.
// ---------------------------------------------------------------------

import { createArtboardId, nextArtboardName } from '@/lib/editor/artboards';
import { createDefaultPrintSettings } from '@/lib/editor/printSetup';
import { TemplateBuilderDef } from './builders';

// Kept in sync by hand with the identical arrays in app/editor/page.tsx's
// save function, hooks/useEditorHistory.ts, and
// lib/editor/buildPhotoDesignPayload.ts -- all must list every custom
// property that needs to survive a save/reload/undo.
const SAVE_CUSTOM_PROPS = [
  'name',
  'locked',
  'visible',
  'isVectorPath',
  'clipPath',
  '__uid',
  '__lockRatio',
  '__isArtboard',
  '__artboardId',
  '__print',
  '__originalSrc',
  '__photoEdits',
  '__cropRect',
  '__isGuide',
  '__guideAxis',
  '__assetId',
];

export interface RenderedTemplate {
  canvasJson: any;
  thumbnail: string | null;
}

export async function renderTemplate(def: TemplateBuilderDef): Promise<RenderedTemplate> {
  const mod: any = await import('fabric');
  const F = mod.fabric;

  const canvas = new F.StaticCanvas(null, { width: def.width, height: def.height });

  const artboard = new F.Rect({
    left: 0,
    top: 0,
    width: def.width,
    height: def.height,
    fill: '#ffffff',
    selectable: false,
    evented: false,
    hasControls: false,
    hoverCursor: 'default',
    objectCaching: false,
    lockRotation: true,
  });
  artboard.__isArtboard = true;
  artboard.__artboardId = createArtboardId();
  artboard.__print = createDefaultPrintSettings();
  artboard.name = nextArtboardName([]);
  canvas.add(artboard);

  const objects = def.build(F, def.color1, def.color2);
  objects.forEach((obj, i) => {
    obj.__uid = `obj_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    obj.__artboardId = artboard.__artboardId;
    canvas.add(obj);
  });
  canvas.requestRenderAll();

  const canvasJson = canvas.toJSON(SAVE_CUSTOM_PROPS);

  const THUMB_WIDTH = 400;
  let thumbnail: string | null = null;
  try {
    thumbnail = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.8,
      multiplier: THUMB_WIDTH / Math.max(def.width, 1),
    });
  } catch (err) {
    console.error(`Thumbnail generation failed for template "${def.name}":`, err);
  }

  canvas.dispose();

  return { canvasJson, thumbnail };
}
