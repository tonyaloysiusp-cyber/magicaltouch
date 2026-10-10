// Fits a layout made for one page size onto another — used by Resize
// (Instagram post → story → A4…) and when a template is applied to a page
// of a different size.
//
// The aim is "the same design, at the new size", not a new layout:
//  • Everything is scaled by ONE factor (the largest that fits), so text,
//    photos and shapes keep their proportions and their spacing to each
//    other.
//  • The design is split into blocks along each axis wherever there is a
//    real gutter (an empty strip across the whole page). Inside a block
//    nothing moves relative to anything else, so a bullet stays next to its
//    line, a name stays on its header bar, a list stays inside its card.
//  • The page's extra room goes into the gutters and margins, in proportion
//    to how big they already were, so a centred title stays centred and a
//    footer stays at the bottom.
//  • Full-page backgrounds re-cover the new page, and plain colour bars
//    that run across the page (header/footer bands, side strips) stretch to
//    keep running across it.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Placement {
  // Uniform scale for the object's size (content), or separate x/y scales
  // for full-page colour blocks and bands.
  scaleX: number;
  scaleY: number;
  // New centre in the target page's coordinates.
  cx: number;
  cy: number;
  role: 'background' | 'content';
}

type Item = { box: Box; isImage: boolean; isShape: boolean; isText?: boolean };

// A gutter must be at least this share of the page to split blocks; tighter
// gaps (between a bullet and its text, between lines of a list) stay fixed.
const MIN_GUTTER = 0.03;

// Monotonic map from an old coordinate to a new one along one axis.
function axisMap(intervals: [number, number][], L: number, Lnew: number, s: number): (x: number) => number {
  const iv = intervals
    .map(([a, b]) => [Math.max(0, Math.min(L, a)), Math.max(0, Math.min(L, b))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((p, q) => p[0] - q[0]);
  if (!iv.length) return (x) => (x / L) * Lnew;
  const blocks: [number, number][] = [];
  for (const [a, b] of iv) {
    const last = blocks[blocks.length - 1];
    if (last && a - last[1] < L * MIN_GUTTER) last[1] = Math.max(last[1], b);
    else blocks.push([a, b]);
  }
  // Gaps: before the first block, between blocks, after the last.
  const gaps: number[] = [blocks[0][0]];
  for (let i = 1; i < blocks.length; i++) gaps.push(blocks[i][0] - blocks[i - 1][1]);
  gaps.push(L - blocks[blocks.length - 1][1]);
  const extra = Math.max(0, Lnew - L * s);
  const gsum = gaps.reduce((t, g) => t + g, 0);
  const share = gaps.map((g) => (gsum > 0 ? (extra * g) / gsum : extra / gaps.length));
  // New start of each block.
  const starts: number[] = [];
  let pos = gaps[0] * s + share[0];
  blocks.forEach(([a, b], i) => {
    starts.push(pos);
    pos += (b - a) * s + gaps[i + 1] * s + share[i + 1];
  });
  return (x: number) => {
    if (x <= 0) return x * s;
    if (x >= L) return Lnew + (x - L) * s;
    for (let i = 0; i < blocks.length; i++) {
      const [a, b] = blocks[i];
      if (x < a) {
        // Inside the gap before block i.
        const prevEnd = i === 0 ? 0 : blocks[i - 1][1];
        const nPrevEnd = i === 0 ? 0 : starts[i - 1] + (blocks[i - 1][1] - blocks[i - 1][0]) * s;
        const g = a - prevEnd;
        return g > 0 ? nPrevEnd + ((x - prevEnd) / g) * (starts[i] - nPrevEnd) : starts[i];
      }
      if (x <= b) return starts[i] + (x - a) * s;
    }
    const lastEnd = blocks[blocks.length - 1][1];
    const nLastEnd = starts[starts.length - 1] + (lastEnd - blocks[blocks.length - 1][0]) * s;
    const g = L - lastEnd;
    return g > 0 ? nLastEnd + ((x - lastEnd) / g) * (Lnew - nLastEnd) : Lnew;
  };
}

export function planResize(objects: Item[], from: { width: number; height: number }, to: { width: number; height: number }): Placement[] {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const s = Math.min(sx, sy);
  const cover = Math.max(sx, sy);

  const isBackground = (b: Box) =>
    (b.width * b.height) / (from.width * from.height) >= 0.85 || (b.width >= from.width * 0.92 && b.height >= from.height * 0.92);
  const isText = (o: Item) => o.isText ?? (!o.isImage && !o.isShape);
  // Plain colour bars that run across (or down) the whole page.
  const stretchX = (o: Item) => o.isShape && !isText(o) && o.box.width >= from.width * 0.92 && o.box.height < from.height * 0.4;
  const stretchY = (o: Item) => o.isShape && !isText(o) && o.box.height >= from.height * 0.92 && o.box.width < from.width * 0.4;

  const xs: [number, number][] = [];
  const ys: [number, number][] = [];
  objects.forEach((o) => {
    if (isBackground(o.box)) return;
    if (!stretchX(o)) xs.push([o.box.left, o.box.left + o.box.width]);
    if (!stretchY(o)) ys.push([o.box.top, o.box.top + o.box.height]);
  });
  const X = axisMap(xs, from.width, to.width, s);
  const Y = axisMap(ys, from.height, to.height, s);

  return objects.map((o) => {
    const { box, isImage } = o;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    if (isBackground(box)) {
      // Full-page background: fill the whole new page.
      const ncx = (cx / from.width) * to.width;
      const ncy = (cy / from.height) * to.height;
      return isImage ? { scaleX: cover, scaleY: cover, cx: ncx, cy: ncy, role: 'background' } : { scaleX: sx, scaleY: sy, cx: ncx, cy: ncy, role: 'background' };
    }
    if (stretchX(o)) {
      const l = X(box.left);
      const r = X(box.left + box.width);
      return { scaleX: (r - l) / box.width, scaleY: s, cx: (l + r) / 2, cy: Y(cy), role: 'background' };
    }
    if (stretchY(o)) {
      const t = Y(box.top);
      const b = Y(box.top + box.height);
      return { scaleX: s, scaleY: (b - t) / box.height, cx: X(cx), cy: (t + b) / 2, role: 'background' };
    }
    return { scaleX: s, scaleY: s, cx: X(cx), cy: Y(cy), role: 'content' };
  }) as Placement[];
}
