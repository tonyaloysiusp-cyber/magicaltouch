// ---------------------------------------------------------------------
// lib/editor/printMarks.ts
// Builds real, temporary Fabric objects for crop marks, registration
// marks, and a color bar around an artboard's bleed box. These are added
// to the canvas right before an export and removed right after (see
// page.tsx's buildAndInsertMarks/removeMarks), so they show up as actual
// vector content in the exported file instead of a faked overlay.
// ---------------------------------------------------------------------

import { EdgeValues, PrintMarksSettings, MARK_OFFSET, MARK_LENGTH, COLOR_BAR_GAP, COLOR_BAR_SIDE_WIDTH, PT_TO_PX } from './printSetup';

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

// Screen-RGB approximations of the process-ink solids and their 2-color
// overprints, in the order a real press-sheet color bar runs them down
// each side: C, M, Y, then the three overprints (CM, MY, CY), then the
// 3-color overprint (CMY, the closest RGB screen approximation of rich
// black). These are exactly what a press operator's side color bars
// show — they just can't be true ink-separated CMYK values, because this
// app's whole pipeline (canvas, every fill picker, PNG/PDF output) is RGB
// end to end. Faking a real CMYK badge on top of that would be lying
// about a capability the app doesn't have; this bar is upfront about
// being a visual reference, not a proof.
const VERTICAL_SWATCHES: { label: string; color: string; labelColor: string }[] = [
  { label: 'C', color: '#00AEEF', labelColor: '#FFFFFF' },
  { label: 'M', color: '#EC008C', labelColor: '#FFFFFF' },
  { label: 'Y', color: '#FFF200', labelColor: '#000000' },
  { label: 'CM', color: '#2E3192', labelColor: '#FFFFFF' },
  { label: 'MY', color: '#ED1C24', labelColor: '#FFFFFF' },
  { label: 'CY', color: '#00A651', labelColor: '#FFFFFF' },
  { label: 'CMY', color: '#231F20', labelColor: '#FFFFFF' },
];

const GRAY_RAMP_STEPS = 10; // 0%, ~11%, ... 100% black

function grayAt(t: number): string {
  // t=0 -> white, t=1 -> black, matching a 0%-100% K tint ramp.
  const v = Math.round(255 * (1 - t));
  const hex = v.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

function swatchLabel(F: any, text: string, cx: number, cy: number, color: string, fontSize: number) {
  const label = new F.Text(text, {
    left: cx,
    top: cy,
    fontSize,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    fill: color,
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    objectCaching: false,
  });
  label.__isPrintMark = true;
  return label;
}

// A print-shop-style color control bar: two vertical strips of solid
// process/overprint swatches flanking the artboard's left and right
// edges (C/M/Y/CM/MY/CY/CMY, top to bottom, each labeled directly on the
// swatch), plus a horizontal grayscale tint ramp along the bottom — the
// same reference marks a real press sheet carries so an operator can
// eyeball ink density and registration at a glance. Sized to
// COLOR_BAR_GAP/SIDE_WIDTH from printSetup.ts, which the export-rect
// margin calculation reads to make sure this never gets clipped.
export function buildColorBar(F: any, ab: RectLike, bleed: EdgeValues) {
  const objs: any[] = [];

  // --- Left + right vertical CMY/overprint bars ---
  const barW = COLOR_BAR_SIDE_WIDTH;
  const barGap = 1;
  const barTotalH = ab.height * 0.9;
  const barTop = ab.y + (ab.height - barTotalH) / 2;
  const swatchH = (barTotalH - (VERTICAL_SWATCHES.length - 1) * barGap) / VERTICAL_SWATCHES.length;
  const fontSize = Math.max(3, Math.min(6, swatchH * 0.4));

  [
    { x: ab.x - bleed.left - COLOR_BAR_GAP - barW },
    { x: ab.x + ab.width + bleed.right + COLOR_BAR_GAP },
  ].forEach(({ x }) => {
    VERTICAL_SWATCHES.forEach((s, i) => {
      const top = barTop + i * (swatchH + barGap);
      const rect = new F.Rect({
        left: x,
        top,
        width: barW,
        height: swatchH,
        fill: s.color,
        stroke: '#999999',
        strokeWidth: 0.25,
        selectable: false,
        evented: false,
        objectCaching: false,
      });
      rect.__isPrintMark = true;
      objs.push(rect, swatchLabel(F, s.label, x + barW / 2, top + swatchH / 2, s.labelColor, fontSize));
    });
  });

  // --- Bottom grayscale ramp ---
  const rampGap = 0.5;
  const rampW = Math.max(3, Math.min(12, (ab.width - (GRAY_RAMP_STEPS - 1) * rampGap) / GRAY_RAMP_STEPS));
  const rampH = Math.max(swatchH * 0.7, 3);
  const rampStartX = ab.x + (ab.width - (rampW * GRAY_RAMP_STEPS + rampGap * (GRAY_RAMP_STEPS - 1))) / 2;
  const rampY = ab.y + ab.height + bleed.bottom + COLOR_BAR_GAP;
  for (let i = 0; i < GRAY_RAMP_STEPS; i++) {
    const t = i / (GRAY_RAMP_STEPS - 1);
    const rect = new F.Rect({
      left: rampStartX + i * (rampW + rampGap),
      top: rampY,
      width: rampW,
      height: rampH,
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
