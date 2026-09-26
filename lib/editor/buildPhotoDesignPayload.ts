// ---------------------------------------------------------------------
// lib/editor/buildPhotoDesignPayload.ts
// Turns a flattened Photo Studio composite (a plain data URL + its pixel
// size) into a Main-Design-compatible canvas_json: one real Artboard rect
// sized to the image, with the image itself as its only object. Built
// with a real headless Fabric StaticCanvas + toJSON (not hand-written
// JSON) so the result is byte-compatible with what Main Design's own
// save produces -- the design reopens in /editor, and the dashboard's
// thumbnail/reopen pipeline needs no special-casing for it.
//
// The composite's pixels are uploaded to real object storage
// (lib/storage/assets.ts) rather than embedded as base64 inside
// canvas_json -- the #1 fix identified in docs/ENGINEERING_AUDIT.md.
// This is the first live cutover of that pattern, deliberately scoped
// to this one new, low-risk page rather than Main Design's mature
// upload path (see the audit for why).
// ---------------------------------------------------------------------

import { createArtboardId, nextArtboardName } from './artboards';
import { createDefaultPrintSettings } from './printSetup';
import { dataUrlToBlob, uploadDesignAsset } from '@/lib/storage/assets';

// Kept in sync by hand with the identical arrays in app/editor/page.tsx's
// own save function and hooks/useEditorHistory.ts -- all three must list
// every custom property that needs to survive a save/reload/undo.
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

export interface PhotoDesignPayload {
  canvasJson: any;
  thumbnail: string | null;
}

export async function buildPhotoDesignJson(
  dataUrl: string,
  widthPx: number,
  heightPx: number,
  dpi: number,
  userId: string
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

  // Real object storage instead of embedding these pixels as base64
  // inside canvas_json -- see the module comment above.
  const uploaded = await uploadDesignAsset(dataUrlToBlob(dataUrl), userId);

  await new Promise<void>((resolve, reject) => {
    F.Image.fromURL(
      uploaded.url,
      (img: any, isError: boolean) => {
        if (isError || !img) {
          reject(new Error('Failed to load the uploaded asset back into the canvas'));
          return;
        }
        img.set({
          left: 0,
          top: 0,
          scaleX: widthPx / (img.width || widthPx),
          scaleY: heightPx / (img.height || heightPx),
          selectable: true,
        });
        img.__uid = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        img.__artboardId = artboard.__artboardId;
        img.__assetId = uploaded.assetId;
        canvas.add(img);
        resolve();
      },
      { crossOrigin: 'anonymous' }
    );
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
