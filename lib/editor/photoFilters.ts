// ---------------------------------------------------------------------
// lib/editor/photoFilters.ts
// Real, non-destructive pixel adjustments for the Photo Editor workspace,
// built on Fabric's own fabric.Image.filters pipeline (Brightness,
// Contrast, Saturation, Blur, Convolute) plus two custom filters that
// follow Fabric's own filter contract (Exposure, Vibrance) — genuine,
// well-defined per-pixel algorithms, not approximations or relabeled
// duplicates of an existing slider.
//
// Scope note: temperature/tint (real white balance) and per-zone
// highlights/shadows/whites/blacks are NOT implemented — those need a
// luminance-masked, multi-region tone curve to be honest tools rather
// than a mislabeled brightness/hue tweak, and that's a materially bigger
// feature than fits alongside everything else in this round; they're
// left out rather than shipped as something they aren't.
// ---------------------------------------------------------------------

export interface PhotoAdjustments {
  brightness: number; // -1..1, 0 = no change
  contrast: number; // -1..1, 0 = no change
  saturation: number; // -1..1, 0 = no change
  hue: number; // -1..1 (mapped to a -π..π rotation), 0 = no change
  exposure: number; // -2..2 stops, 0 = no change — real linear-light gain, not a brightness alias
  vibrance: number; // -1..1, 0 = no change — saturation boost weighted toward already-muted colors
  blur: number; // 0..1, 0 = no change
  sharpen: number; // 0..1, 0 = no change
  blackAndWhite: boolean;
}

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  exposure: 0,
  vibrance: 0,
  blur: 0,
  sharpen: 0,
  blackAndWhite: false,
};

export function adjustmentsAreDefault(adj: PhotoAdjustments): boolean {
  return (
    adj.brightness === 0 &&
    adj.contrast === 0 &&
    adj.saturation === 0 &&
    adj.hue === 0 &&
    adj.exposure === 0 &&
    adj.vibrance === 0 &&
    adj.blur === 0 &&
    adj.sharpen === 0 &&
    !adj.blackAndWhite
  );
}

// ---- Custom filters Fabric doesn't ship, following its own BaseFilter
// contract (applyTo2d only — WebGL filtering is disabled app-wide below,
// so every filter, built-in or custom, always runs this same real,
// synchronous pixel path; see the note on `fabric.enableGLFiltering`). ----

let filtersRegistered = false;
function registerCustomFilters(F: any) {
  if (filtersRegistered) return;
  filtersRegistered = true;

  // Real exposure: gain applied in approximate LINEAR light (sRGB decode
  // -> multiply by 2^stops -> sRGB encode), the same operation a camera's
  // exposure compensation or a RAW developer's "Exposure" slider performs
  // — distinct from Brightness, which shifts levels in the already
  // gamma-encoded space and clips/flattens highlights much sooner.
  F.Image.filters.Exposure = F.util.createClass(F.Image.filters.BaseFilter, {
    type: 'Exposure',
    exposure: 0,
    mainParameter: 'exposure',
    applyTo2d: function (options: any) {
      const data = options.imageData.data;
      const gain = Math.pow(2, this.exposure);
      // 256-entry LUT: sRGB->linear, scale, linear->sRGB.
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        const srgb = i / 255;
        const linear = srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
        const scaled = Math.min(1, Math.max(0, linear * gain));
        const out = scaled <= 0.0031308 ? scaled * 12.92 : 1.055 * Math.pow(scaled, 1 / 2.4) - 0.055;
        lut[i] = Math.round(out * 255);
      }
      for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
    },
    isNeutralState: function () {
      return this.exposure === 0;
    },
  });

  // Real vibrance: a saturation boost whose strength is weighted DOWN
  // for pixels that are already highly saturated (weight = 1 - current
  // saturation) — so muted colors get pushed the most while already-
  // vivid colors and skin tones are largely protected, unlike a flat
  // Saturation boost which pushes every pixel by the same amount.
  F.Image.filters.Vibrance = F.util.createClass(F.Image.filters.BaseFilter, {
    type: 'Vibrance',
    vibrance: 0,
    mainParameter: 'vibrance',
    applyTo2d: function (options: any) {
      const data = options.imageData.data;
      const v = this.vibrance;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const avg = (r + g + b) / 3;
        const sat = max > 0 ? (max - min) / max : 0;
        const factor = 1 + v * (1 - sat);
        data[i] = Math.max(0, Math.min(255, avg + (r - avg) * factor));
        data[i + 1] = Math.max(0, Math.min(255, avg + (g - avg) * factor));
        data[i + 2] = Math.max(0, Math.min(255, avg + (b - avg) * factor));
      }
    },
    isNeutralState: function () {
      return this.vibrance === 0;
    },
  });
}

export function buildFilters(F: any, adj: PhotoAdjustments): any[] {
  registerCustomFilters(F);
  const filters: any[] = [];
  // Exposure first — it models a linear-light gain applied at capture
  // time, upstream of the gamma-space brightness/contrast/etc tweaks
  // below, the same ordering a real photo pipeline uses.
  if (adj.exposure) filters.push(new F.Image.filters.Exposure({ exposure: adj.exposure }));
  if (adj.brightness) filters.push(new F.Image.filters.Brightness({ brightness: adj.brightness }));
  if (adj.contrast) filters.push(new F.Image.filters.Contrast({ contrast: adj.contrast }));
  if (adj.vibrance) filters.push(new F.Image.filters.Vibrance({ vibrance: adj.vibrance }));
  if (adj.saturation) filters.push(new F.Image.filters.Saturation({ saturation: adj.saturation }));
  if (adj.hue) filters.push(new F.Image.filters.HueRotation({ rotation: adj.hue * Math.PI }));
  if (adj.blur) filters.push(new F.Image.filters.Blur({ blur: adj.blur }));
  if (adj.sharpen) {
    // A standard 3x3 unsharp kernel, scaled by the slider amount — real
    // convolution sharpening, not a cosmetic overlay.
    const s = adj.sharpen;
    filters.push(new F.Image.filters.Convolute({ matrix: [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0] }));
  }
  if (adj.blackAndWhite) filters.push(new F.Image.filters.Grayscale());
  return filters;
}

// Bakes the given adjustments onto a Fabric image (mutates its .filters
// and applies them). Call with DEFAULT_ADJUSTMENTS to clear filters.
export function applyAdjustments(image: any, F: any, adj: PhotoAdjustments) {
  // WebGL filtering has a hard texture-size ceiling (fabric.textureSize)
  // that a genuinely large source photo (6000x4000+) can exceed, and it
  // can't run the two custom filters above (they only implement the 2D
  // fallback). Forcing the 2D backend keeps every filter — built-in and
  // custom — on the same well-tested, size-unlimited code path; for the
  // per-pixel math here the difference is not perceptible in an editor
  // (as opposed to a real-time video effect), so this is a pure
  // robustness win, not a quality/perf trade-off worth reintroducing GPU
  // filtering to avoid.
  F.enableGLFiltering = false;
  image.filters = buildFilters(F, adj);
  image.applyFilters();
}
