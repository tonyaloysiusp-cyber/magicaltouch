// ---------------------------------------------------------------------
// lib/editor/buildPhotoDesignPayload.ts
// Turns a flattened Photo Studio composite (a plain data URL + its pixel
// size) into a Main-Design-compatible canvas_json: one real Artboard rect
// sized to the image, with the image itself as its only object. Built
// with a real headless Fabric StaticCanvas + toJSON (not hand-written
// JSON) so the result is byte-compatible with what Main Design's own
// save produces -- the design reopens in /editor, and the dashboard's
// thumbnail/reopen pipeline needs no special-casing for it.
// ---------------------------------------------------------------------

import { createArtboardId, nextArtboardName } from './artboards';
import { createDefaultPrintSettings } from './printSetup';

// Kept in sync by hand with the identical array in app/editor/page.tsx's
// own save function -- both must list every custom property that needs
// to survive a save/reload.
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
];

export interface PhotoDesignPayload {
  canvasJson: any;
  thumbnail: string | null;
}

export async function buildPhotoDesignJson(
  dataUrl: string,
  widthPx: number,
  heightPx: number,
  dpi: number
): Promise<PhotoDesignPayload> {
  const mod: any = await import('fabric');
  const F = mod.fabric;

  const canvas = new F.StaticCanvas(null, { width: widthPx, height: heightPx });

  const artboard = new F.Rect({
    left: 0,
    top: 0,
    width: widthPx,
    height: heightPx,
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
  artboard.__print = { ...createDefaultPrintSettings(), dpi };
  artboard.name = nextArtboardName([]);
  canvas.add(artboard);

  await new Promise<void>((resolve) => {
    F.Image.fromURL(dataUrl, (img: any) => {
      img.set({
        left: 0,
        top: 0,
        scaleX: widthPx / (img.width || widthPx),
        scaleY: heightPx / (img.height || heightPx),
        selectable: true,
      });
      img.__uid = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      img.__artboardId = artboard.__artboardId;
      canvas.add(img);
      resolve();
    });
  });

  const canvasJson = canvas.toJSON(SAVE_CUSTOM_PROPS);

  const THUMB_WIDTH = 400;
  let thumbnail: string | null = null;
  try {
    thumbnail = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.7,
      multiplier: THUMB_WIDTH / Math.max(widthPx, 1),
    });
  } catch (err) {
    console.error('Photo Studio thumbnail generation failed:', err);
  }

  canvas.dispose();

  return { canvasJson, thumbnail };
}
