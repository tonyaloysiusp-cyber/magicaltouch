// ---------------------------------------------------------------------
// lib/editor/photoFilters.ts
// Real, non-destructive pixel adjustments for the Photo Editor workspace,
// built on Fabric's own fabric.Image.filters pipeline (Brightness,
// Contrast, Saturation, Blur, Convolute) rather than a hand-rolled
// pixel loop — these are genuine, well-tested filter implementations,
// not approximations.
//
// Scope note: only brightness/contrast/saturation/blur/sharpen are
// implemented. Temperature, tint, exposure, shadows and highlights are
// NOT implemented — there is no honest way to fake a real white-balance
// or tone-curve adjustment with the five filters above without it being
// a mislabeled brightness/hue tweak, so they're left out rather than
// shipped as something they aren't.
// ---------------------------------------------------------------------

export interface PhotoAdjustments {
  brightness: number; // -1..1, 0 = no change
  contrast: number; // -1..1, 0 = no change
  saturation: number; // -1..1, 0 = no change
  blur: number; // 0..1, 0 = no change
  sharpen: number; // 0..1, 0 = no change
}

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  sharpen: 0,
};

export function adjustmentsAreDefault(adj: PhotoAdjustments): boolean {
  return (
    adj.brightness === 0 &&
    adj.contrast === 0 &&
    adj.saturation === 0 &&
    adj.blur === 0 &&
    adj.sharpen === 0
  );
}

export function buildFilters(F: any, adj: PhotoAdjustments): any[] {
  const filters: any[] = [];
  if (adj.brightness) filters.push(new F.Image.filters.Brightness({ brightness: adj.brightness }));
  if (adj.contrast) filters.push(new F.Image.filters.Contrast({ contrast: adj.contrast }));
  if (adj.saturation) filters.push(new F.Image.filters.Saturation({ saturation: adj.saturation }));
  if (adj.blur) filters.push(new F.Image.filters.Blur({ blur: adj.blur }));
  if (adj.sharpen) {
    // A standard 3x3 unsharp kernel, scaled by the slider amount — real
    // convolution sharpening, not a cosmetic overlay.
    const s = adj.sharpen;
    filters.push(new F.Image.filters.Convolute({ matrix: [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0] }));
  }
  return filters;
}

// Bakes the given adjustments onto a Fabric image (mutates its .filters
// and applies them). Call with DEFAULT_ADJUSTMENTS to clear filters.
export function applyAdjustments(image: any, F: any, adj: PhotoAdjustments) {
  image.filters = buildFilters(F, adj);
  image.applyFilters();
}
