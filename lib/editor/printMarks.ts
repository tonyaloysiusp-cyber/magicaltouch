// ---------------------------------------------------------------------
// lib/editor/printMarks.ts
// Builds real, temporary Fabric objects for crop marks, registration
// marks, and a color bar around an artboard's bleed box. These are added
// to the canvas right before an export and removed right after (see
// page.tsx's buildAndInsertMarks/removeMarks), so they show up as actual
// vector content in the exported file instead of a faked overlay.
// ---------------------------------------------------------------------

import { EdgeValues, PrintMarksSettings } from './printSetup';

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MARK_LENGTH = 18;
const MARK_OFFSET = 6;
const MARK_COLOR = '#000000';
const REG_MARK_RADIUS = 5;

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

export function buildCropMarks(F: any, ab: RectLike, bleed: EdgeValues) {
  const left = ab.x - bleed.left;
  const top = ab.y - bleed.top;
  const right = ab.x + ab.width + bleed.right;
  const bottom = ab.y + ab.height + bleed.bottom;

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

export function buildRegistrationMarks(F: any, ab: RectLike, bleed: EdgeValues) {
  const top = ab.y - bleed.top;
  const bottom = ab.y + ab.height + bleed.bottom;
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
    return [
      circle,
      markLine(F, cx - REG_MARK_RADIUS - 3, cy, cx + REG_MARK_RADIUS + 3, cy),
      markLine(F, cx, cy - REG_MARK_RADIUS - 3, cx, cy + REG_MARK_RADIUS + 3),
    ];
  };

  return [...markAt(midX, top - MARK_OFFSET - REG_MARK_RADIUS - 6), ...markAt(midX, bottom + MARK_OFFSET + REG_MARK_RADIUS + 6)];
}

export function buildColorBar(F: any, ab: RectLike, bleed: EdgeValues) {
  const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  const swatchW = 10;
  const swatchH = 6;
  const startX = ab.x;
  const y = ab.y + ab.height + bleed.bottom + MARK_OFFSET + MARK_LENGTH + 4;

  return colors.map((c, i) => {
    const rect = new F.Rect({
      left: startX + i * swatchW,
      top: y,
      width: swatchW,
      height: swatchH,
      fill: c,
      stroke: '#cccccc',
      strokeWidth: 0.25,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    rect.__isPrintMark = true;
    return rect;
  });
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
