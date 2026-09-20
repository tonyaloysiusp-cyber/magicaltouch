// ---------------------------------------------------------------------
// lib/editor/printMarks.ts
// Builds real, temporary Fabric objects for crop marks, registration
// marks, and a color bar around an artboard's bleed box. These are added
// to the canvas right before an export and removed right after (see
// page.tsx's buildAndInsertMarks/removeMarks), so they show up as actual
// vector content in the exported file instead of a faked overlay.
// ---------------------------------------------------------------------

import { EdgeValues, PrintMarksSettings, MARK_OFFSET, MARK_LENGTH, COLOR_BAR_GAP, COLOR_BAR_SWATCH_H_MAX, COLOR_BAR_LABEL_H, PT_TO_PX } from './printSetup';

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MARK_COLOR = '#000000';
// Not independently verified against the reference files (which is why
// this isn't in printSetup.ts's shared/confirmed constants), but scaled
// by the same px<->pt factor for internal consistency with the ones that
// were: ~5pt, a typical registration-target radius.
const REG_MARK_RADIUS = 5 * PT_TO_PX;

function markLine(F: any, x1: number, y1: number, x2: number, y2: number) {
  const line = new F.Line([x1, y1, x2, y2], {
    stroke: MARK_COLOR,
    strokeWidth: 0.5,
    selectable: false,
    evented: false,
    objectCaching: false,
  });
  line.__isPrintMark = true;
  return line;
}

// Crop (trim/cutting) marks indicate where the sheet is physically cut —
// that's the artboard's own trim edge, always, regardless of how much
// bleed is set. Verified against real Adobe-generated reference PDFs
// (a business card and an A4 sheet, both with bleed + cutting marks):
// each tick's aligned coordinate sits exactly on the TrimBox edge, with
// its near point offset outward from that trim edge by a fixed 6pt and
// its far point 18pt further still — both measured from the trim edge,
// never from the bleed edge. That offset is independent of the bleed
// amount: real software doesn't grow it to match a larger bleed, so a
// bleed bigger than the offset can make the mark's inner end sit inside
// the bleed area — confirmed in the reference files themselves — but the
// mark is never drawn across the trim line.
export function buildCropMarks(F: any, ab: RectLike, _bleed: EdgeValues) {
  const left = ab.x;
  const top = ab.y;
  const right = ab.x + ab.width;
  const bottom = ab.y + ab.height;

  return [
    markLine(F, left, top - MARK_OFFSET, left, top - MARK_OFFSET - MARK_LENGTH),
    markLine(F, left - MARK_OFFSET, top, left - MARK_OFFSET - MARK_LENGTH, top),
    markLine(F, right, top - MARK_OFFSET, right, top - MARK_OFFSET - MARK_LENGTH),
    markLine(F, right + MARK_OFFSET, top, right + MARK_OFFSET + MARK_LENGTH, top),
    markLine(F, left, bottom + MARK_OFFSET, left, bottom + MARK_OFFSET + MARK_LENGTH),
    markLine(F, left - MARK_OFFSET, bottom, left - MARK_OFFSET - MARK_LENGTH, bottom),
    markLine(F, right, bottom + MARK_OFFSET, right, bottom + MARK_OFFSET + MARK_LENGTH),
    markLine(F, right + MARK_OFFSET, bottom, right + MARK_OFFSET + MARK_LENGTH, bottom),
  ];
}

// Same principle as crop marks: anchored on the trim edge, not the bleed
// edge, so the mark identifies the real cut line regardless of bleed.
export function buildRegistrationMarks(F: any, ab: RectLike, _bleed: EdgeValues) {
  const top = ab.y;
  const bottom = ab.y + ab.height;
  const midX = ab.x + ab.width / 2;

  const markAt = (cx: number, cy: number) => {
    const circle = new F.Circle({
      left: cx,
      top: cy,
      radius: REG_MARK_RADIUS,
      originX: 'center',
      originY: 'center',
      fill: '',
      stroke: MARK_COLOR,
      strokeWidth: 0.5,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    circle.__isPrintMark = true;
    const tickPad = 3 * PT_TO_PX;
    return [
      circle,
      markLine(F, cx - REG_MARK_RADIUS - tickPad, cy, cx + REG_MARK_RADIUS + tickPad, cy),
      markLine(F, cx, cy - REG_MARK_RADIUS - tickPad, cx, cy + REG_MARK_RADIUS + tickPad),
    ];
  };

  const clearance = 6 * PT_TO_PX;
  return [...markAt(midX, top - MARK_OFFSET - REG_MARK_RADIUS - clearance), ...markAt(midX, bottom + MARK_OFFSET + REG_MARK_RADIUS + clearance)];
}

// Screen-RGB approximations of the four process-ink solids, in the order
// a real GATF/SWOP-style print control bar lists them, followed by the
// three 2-color overprints and a registration (all-inks) solid. This is
// exactly what a press operator's color bar shows — it just can't be a
// true ink-separated CMYK value, because this app's whole pipeline (the
// canvas, every fill picker, PNG/PDF output) is RGB end to end. Faking a
// CMYK badge on top of that would be lying about a capability the app
// doesn't have; this bar is upfront about being a visual reference, not
// a proof.
const PROCESS_SWATCHES: { label: string; color: string }[] = [
  { label: 'C', color: '#00AEEF' },
  { label: 'M', color: '#EC008C' },
  { label: 'Y', color: '#FFF200' },
  { label: 'K', color: '#000000' },
  { label: 'R', color: '#ED1C24' }, // M+Y overprint
  { label: 'G', color: '#00A651' }, // C+Y overprint
  { label: 'B', color: '#2E3192' }, // C+M overprint
  { label: 'Reg', color: '#000000' }, // 4-color registration solid
];

const GRAY_RAMP_STEPS = 11; // 0%, 10%, ... 100% black

function grayAt(t: number): string {
  // t=0 -> white, t=1 -> black, matching a 0%-100% K tint ramp.
  const v = Math.round(255 * (1 - t));
  const hex = v.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

function labelText(F: any, text: string, x: number, y: number) {
  const label = new F.Text(text, {
    left: x,
    top: y,
    fontSize: 3.2,
    fontFamily: 'Helvetica',
    fill: '#000000',
    originX: 'center',
    originY: 'top',
    selectable: false,
    evented: false,
    objectCaching: false,
  });
  label.__isPrintMark = true;
  return label;
}

// A print-shop-style color control bar: solid process/overprint swatches
// plus a grayscale tint ramp, run along the artboard's bottom edge —
// the same reference marks a real press sheet carries so an operator can
// eyeball ink density and registration at a glance.
//
// Deliberately compact: sits just past the BLEED edge (not past the crop
// marks' own reach — real corner crop marks don't span the full width,
// so there's no actual clash), sized to COLOR_BAR_GAP/SWATCH_H_MAX/
// LABEL_H from printSetup.ts, which the export-rect margin calculation
// reads to make sure this never gets clipped.
export function buildColorBar(F: any, ab: RectLike, bleed: EdgeValues) {
  const objs: any[] = [];
  const gap = 1;
  const totalSwatches = PROCESS_SWATCHES.length + GRAY_RAMP_STEPS;
  // Sized to fit within the artboard's own width, capped to a sensible
  // on-screen swatch size — so this never overflows past what "Artboard +
  // Bleed + Marks" already exports for tiny artboards, and doesn't turn
  // into an oversized stripe on a large poster.
  const swatchW = Math.max(3, Math.min(12, (ab.width - (totalSwatches - 1) * gap) / totalSwatches));
  const swatchH = Math.min(COLOR_BAR_SWATCH_H_MAX, Math.max(swatchW * 0.6, 3));
  const startX = ab.x;
  const y = ab.y + ab.height + bleed.bottom + COLOR_BAR_GAP;

  PROCESS_SWATCHES.forEach((s, i) => {
    const left = startX + i * (swatchW + gap);
    const rect = new F.Rect({
      left,
      top: y,
      width: swatchW,
      height: swatchH,
      fill: s.color,
      stroke: '#999999',
      strokeWidth: 0.25,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    rect.__isPrintMark = true;
    objs.push(rect, labelText(F, s.label, left + swatchW / 2, y + swatchH + 1));
  });

  // Grayscale ramp, right after the solids, sharing the same row height.
  const rampStartX = startX + PROCESS_SWATCHES.length * (swatchW + gap) + 6;
  for (let i = 0; i < GRAY_RAMP_STEPS; i++) {
    const t = i / (GRAY_RAMP_STEPS - 1);
    const rect = new F.Rect({
      left: rampStartX + i * (swatchW + gap),
      top: y,
      width: swatchW,
      height: swatchH,
      fill: grayAt(t),
      stroke: '#999999',
      strokeWidth: 0.25,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    rect.__isPrintMark = true;
    objs.push(rect);
  }

  return objs;
}

export function buildProductionMarks(F: any, ab: RectLike, bleed: EdgeValues, marks: PrintMarksSettings, artboardId: string) {
  const objs: any[] = [];
  if (marks.crop) objs.push(...buildCropMarks(F, ab, bleed));
  if (marks.registration) objs.push(...buildRegistrationMarks(F, ab, bleed));
  if (marks.colorBar) objs.push(...buildColorBar(F, ab, bleed));
  // Tag with the owning artboard so the PDF exporter's __artboardId filter
  // picks these up as part of that artboard's page.
  objs.forEach((o) => (o.__artboardId = artboardId));
  return objs;
}
