// ---------------------------------------------------------------------
// lib/editor/imageQuality.ts
// Fixes the actual root cause behind "Photo Editor exports blurry/low-res
// images": fabric.Object#toDataURL (and #toCanvasElement underneath it)
// size their output canvas from the object's CURRENT ON-SCREEN bounding
// box — width/height already multiplied by the object's own scaleX/scaleY
// — then multiply that by `options.multiplier` (default/assumed 1).
//
// A `multiplier: 1` therefore does NOT mean "native resolution" the way
// several call sites in this codebase assumed (their own comments said
// so, which is what made this bug so persistent) — it means "1x whatever
// the object currently looks like on screen." An image displayed at 10%
// zoom, or scaled down to fit a small frame, silently exports at that
// same tiny pixel size no matter how many megapixels the source file
// actually has.
//
// The fix is mechanical: since fabric.Image never mutates its own
// `width`/`height` when you change `scaleX`/`scaleY` (those stay the
// object's true natural/working pixel dimensions — see fabric's own
// `_setWidthHeight`), the multiplier that undoes the on-screen scale and
// restores native resolution is exactly `1 / scale`.
// ---------------------------------------------------------------------

// A generous but real ceiling — comfortably below every mainstream
// browser's max <canvas> dimension/area limits (Chrome/Firefox/Safari
// all allow canvases far larger than this) — so a pathological case
// (e.g. a small image rotated and scaled up 50x) can't try to allocate
// a multi-hundred-megapixel canvas and crash the tab.
export const MAX_EXPORT_DIMENSION = 8000;

// The uniform multiplier that, applied to fabric's toDataURL/
// toCanvasElement, restores an object's NATIVE pixel resolution
// regardless of how small/large it currently appears on screen.
//
// Uses the smaller of scaleX/scaleY when they differ (a non-uniform
// stretch) — that guarantees the more-compressed axis is never left
// under native resolution; the other axis simply comes out a little
// larger than strictly necessary, which costs file size, not quality.
export function nativeResMultiplier(obj: any): number {
  const sx = Math.abs(obj?.scaleX || 1);
  const sy = Math.abs(obj?.scaleY || 1);
  const scale = Math.max(0.0001, Math.min(sx, sy));
  return 1 / scale;
}

// Clamps a multiplier so the resulting canvas can't exceed
// MAX_EXPORT_DIMENSION on its longest side. Only ever clamps DOWN from
// what nativeResMultiplier asked for — it never upscales beyond native,
// so this is purely a safety rail, not a quality trade-off in the
// normal case.
//
// Must estimate the final render size the SAME way fabric's own
// toCanvasElement does: boundingRect.width/height (the object's current
// ON-SCREEN footprint) times the multiplier — NOT the object's native
// width/height times the multiplier. Using native width/height here was
// a real bug: for an image scaled down to a small on-canvas frame (the
// exact case nativeResMultiplier exists to fix), native-width * a large
// multiplier looks huge and gets clamped hard, even though the actual
// rendered canvas (boundingRect * multiplier) is nowhere near the limit
// — silently reintroducing a resolution cap almost as bad as the bug
// this whole module fixes.
export function clampMultiplierForSafety(obj: any, multiplier: number, maxDim = MAX_EXPORT_DIMENSION): number {
  const rect = obj?.getBoundingRect ? obj.getBoundingRect(true, true) : null;
  const w = (rect ? rect.width : obj?.width) || 1;
  const h = (rect ? rect.height : obj?.height) || 1;
  const longest = Math.max(w, h) * multiplier;
  if (longest <= maxDim) return multiplier;
  return Math.max(0.01, maxDim / Math.max(w, h));
}

// The single call every "give me this object's real pixel content"
// call site in the app should use instead of a bare `obj.toDataURL({})`
// or `obj.toDataURL({ multiplier: 1 })`. Still goes through fabric's own
// renderer (so clipPath/mask, filters, and any rotation/skew are all
// correctly composited into the result) — only the resolution is fixed.
export function imageObjectToDataURL(obj: any, options: { format?: 'png' | 'jpeg'; quality?: number } = {}): string {
  const multiplier = clampMultiplierForSafety(obj, nativeResMultiplier(obj));
  return obj.toDataURL({
    format: options.format || 'png',
    quality: options.quality ?? 1,
    multiplier,
  });
}

// The picture's own pixels, without the rotation, flip, mask or live
// filters applied to it on the page (the page keeps applying those), at
// its full resolution. Used to hand a placed photo to the Photo Editor.
export function imageSourceDataURL(obj: any, options: { format?: 'png' | 'jpeg'; quality?: number } = {}): string {
  const el: any = obj?._originalElement || obj?.getElement?.();
  const w = el?.naturalWidth || el?.width || 0;
  const h = el?.naturalHeight || el?.height || 0;
  if (el && w && h && typeof document !== 'undefined') {
    try {
      const longest = Math.max(w, h);
      const k = longest > MAX_EXPORT_DIMENSION ? MAX_EXPORT_DIMENSION / longest : 1;
      const c = document.createElement('canvas');
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      const ctx = c.getContext('2d');
      if (ctx) {
        configureHighQualityContext(ctx);
        ctx.drawImage(el, 0, 0, c.width, c.height);
        const type = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        return c.toDataURL(type, options.quality ?? 1);
      }
    } catch {
      // Fall through to Fabric's own rendering below.
    }
  }
  const multiplier = clampMultiplierForSafety(obj, nativeResMultiplier(obj));
  const saved = { angle: obj.angle, flipX: obj.flipX, flipY: obj.flipY, clipPath: obj.clipPath };
  obj.set({ angle: 0, flipX: false, flipY: false, clipPath: undefined });
  try {
    return obj.toDataURL({ format: options.format || 'png', quality: options.quality ?? 1, multiplier });
  } finally {
    obj.set(saved);
  }
}

// Enables the browser's best available image resampling on a 2D context
// — used for every offscreen canvas this app draws a photo into (crop,
// mask compositing, brush pixel ops, zoom-independent thumbnails), so
// scaling an image (up or down) never falls back to nearest-neighbor.
export function configureHighQualityContext(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  // Not every browser implements imageSmoothingQuality (it's a
  // progressive enhancement over the older imageSmoothingEnabled), so
  // this is set defensively rather than assumed.
  if ('imageSmoothingQuality' in ctx) {
    (ctx as any).imageSmoothingQuality = 'high';
  }
}

// A high-DPI-aware canvas for on-screen photo editing: the element's CSS
// size stays whatever the layout wants, but its actual backing store
// (width/height attributes) is scaled by devicePixelRatio, so text/edges/
// photos all render crisp on Retina/4K displays instead of the browser
// stretching a 1x-resolution bitmap up to fill more physical pixels.
export function devicePixelRatioSafe(): number {
  if (typeof window === 'undefined') return 1;
  return Math.max(1, Math.min(3, window.devicePixelRatio || 1));
}
