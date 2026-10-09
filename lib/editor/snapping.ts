// ---------------------------------------------------------------------
// lib/editor/snapping.ts
// Real move-snapping ("smart guides"): while dragging an object, its
// left/center/right and top/center/bottom are compared against every
// other object's (and every artboard's) same anchors in actual
// canvas-plane coordinates, and the drag position is nudged onto the
// closest match within a small on-screen threshold. This is move-only —
// resize and rotate snapping are not included.
// ---------------------------------------------------------------------

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GuideLine {
  axis: 'v' | 'h';
  position: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: GuideLine[];
}

function xAnchors(b: Bounds): number[] {
  return [b.left, b.left + b.width / 2, b.left + b.width];
}
function yAnchors(b: Bounds): number[] {
  return [b.top, b.top + b.height / 2, b.top + b.height];
}

export function computeSnap(moving: Bounds, targets: Bounds[], threshold: number): SnapResult {
  let bestDx = 0;
  let bestDxAbs = threshold;
  let bestDy = 0;
  let bestDyAbs = threshold;

  const movingXs = xAnchors(moving);
  const movingYs = yAnchors(moving);

  for (const target of targets) {
    for (const mx of movingXs) {
      for (const tx of xAnchors(target)) {
        const diff = tx - mx;
        if (Math.abs(diff) < bestDxAbs) {
          bestDxAbs = Math.abs(diff);
          bestDx = diff;
        }
      }
    }
    for (const my of movingYs) {
      for (const ty of yAnchors(target)) {
        const diff = ty - my;
        if (Math.abs(diff) < bestDyAbs) {
          bestDyAbs = Math.abs(diff);
          bestDy = diff;
        }
      }
    }
  }

  const snappedX = bestDxAbs < threshold;
  const snappedY = bestDyAbs < threshold;
  const snapped: Bounds = {
    left: moving.left + (snappedX ? bestDx : 0),
    top: moving.top + (snappedY ? bestDy : 0),
    width: moving.width,
    height: moving.height,
  };

  const guides: GuideLine[] = [];
  const seenV = new Set<number>();
  const seenH = new Set<number>();

  if (snappedX) {
    for (const sx of xAnchors(snapped)) {
      for (const target of targets) {
        for (const tx of xAnchors(target)) {
          const key = Math.round(tx * 10);
          if (Math.abs(tx - sx) < 0.5 && !seenV.has(key)) {
            seenV.add(key);
            guides.push({ axis: 'v', position: tx });
          }
        }
      }
    }
  }
  if (snappedY) {
    for (const sy of yAnchors(snapped)) {
      for (const target of targets) {
        for (const ty of yAnchors(target)) {
          const key = Math.round(ty * 10);
          if (Math.abs(ty - sy) < 0.5 && !seenH.has(key)) {
            seenH.add(key);
            guides.push({ axis: 'h', position: ty });
          }
        }
      }
    }
  }

  return {
    dx: snappedX ? bestDx : 0,
    dy: snappedY ? bestDy : 0,
    guides,
  };
}

// Persistent ruler guides are single positions on one axis (not full
// bounds like objects/artboards), so they get their own, simpler snap
// check rather than reusing computeSnap's bounds-vs-bounds anchors.
export interface PersistedGuide {
  axis: 'v' | 'h';
  position: number;
}

export function computeGuideSnap(moving: Bounds, guides: PersistedGuide[], threshold: number): { dx: number; dy: number } {
  let bestDx = 0;
  let bestDxAbs = threshold;
  let bestDy = 0;
  let bestDyAbs = threshold;

  const movingXs = xAnchors(moving);
  const movingYs = yAnchors(moving);

  for (const g of guides) {
    if (g.axis === 'v') {
      for (const mx of movingXs) {
        const diff = g.position - mx;
        if (Math.abs(diff) < bestDxAbs) {
          bestDxAbs = Math.abs(diff);
          bestDx = diff;
        }
      }
    } else {
      for (const my of movingYs) {
        const diff = g.position - my;
        if (Math.abs(diff) < bestDyAbs) {
          bestDyAbs = Math.abs(diff);
          bestDy = diff;
        }
      }
    }
  }

  return {
    dx: bestDxAbs < threshold ? bestDx : 0,
    dy: bestDyAbs < threshold ? bestDy : 0,
  };
}

// Snaps a moving object's top-left onto the nearest grid line, only on
// whichever axis didn't already get a smart-guide/ruler-guide snap (those
// take priority, matching how professional tools layer their snap
// sources: guides beat grid).
export function computeGridSnap(
  moving: Bounds,
  gridSize: number,
  skipX: boolean,
  skipY: boolean,
  origin: { x: number; y: number } = { x: 0, y: 0 }
): { dx: number; dy: number } {
  if (gridSize <= 0) return { dx: 0, dy: 0 };
  const snappedLeft = origin.x + Math.round((moving.left - origin.x) / gridSize) * gridSize;
  const snappedTop = origin.y + Math.round((moving.top - origin.y) / gridSize) * gridSize;
  return {
    dx: skipX ? 0 : snappedLeft - moving.left,
    dy: skipY ? 0 : snappedTop - moving.top,
  };
}

// ---------------------------------------------------------------------
// Equal spacing: while dragging between other objects in the same row
// (or column), snap to where the gaps on both sides are equal, or to a
// gap that already exists between other objects. Returns the move and
// the gaps to show.
// ---------------------------------------------------------------------
export interface SpacingMark {
  axis: 'h' | 'v'; // 'h' = horizontal gap (measured along x)
  from: number;
  to: number;
  at: number; // the y (for 'h') or x (for 'v') where the mark is drawn
}

export function computeSpacingSnap(moving: Bounds, targets: Bounds[], threshold: number, axis: 'h' | 'v'): { d: number; marks: SpacingMark[] } {
  const H = axis === 'h';
  const start = (b: Bounds) => (H ? b.left : b.top);
  const size = (b: Bounds) => (H ? b.width : b.height);
  const end = (b: Bounds) => start(b) + size(b);
  const crossStart = (b: Bounds) => (H ? b.top : b.left);
  const crossEnd = (b: Bounds) => crossStart(b) + (H ? b.height : b.width);
  // Objects sharing the moving object's row (or column).
  const row = targets.filter((t) => crossEnd(t) > crossStart(moving) && crossStart(t) < crossEnd(moving) && size(t) > 0);
  if (!row.length) return { d: 0, marks: [] };
  const before = row.filter((t) => end(t) <= start(moving) + threshold).sort((a, b) => end(b) - end(a))[0];
  const after = row.filter((t) => start(t) >= end(moving) - threshold).sort((a, b) => start(a) - start(b))[0];
  // Gaps that already exist between neighbouring objects in the row.
  const sorted = [...row].sort((a, b) => start(a) - start(b));
  const gaps: { g: number; a: Bounds; b: Bounds }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const g = start(sorted[i]) - end(sorted[i - 1]);
    if (g > 0.5) gaps.push({ g, a: sorted[i - 1], b: sorted[i] });
  }
  const cands: { pos: number; marks: (p: number) => SpacingMark[] }[] = [];
  const at = (a: Bounds) => (Math.max(crossStart(a), crossStart(moving)) + Math.min(crossEnd(a), crossEnd(moving))) / 2;
  const mark = (from: number, to: number, a: Bounds): SpacingMark => ({ axis, from, to, at: at(a) });
  if (before && after) {
    const free = start(after) - end(before) - size(moving);
    if (free > 0) {
      const pos = end(before) + free / 2;
      cands.push({ pos, marks: (p) => [mark(end(before), p, before), mark(p + size(moving), start(after), after)] });
    }
  }
  gaps.forEach(({ g, a, b }) => {
    const existing = (): SpacingMark => ({ axis, from: end(a), to: start(b), at: (Math.max(crossStart(a), crossStart(b)) + Math.min(crossEnd(a), crossEnd(b))) / 2 });
    if (before) cands.push({ pos: end(before) + g, marks: (p) => [mark(end(before), p, before), existing()] });
    if (after) cands.push({ pos: start(after) - g - size(moving), marks: (p) => [mark(p + size(moving), start(after), after), existing()] });
  });
  let best: { d: number; marks: SpacingMark[] } = { d: 0, marks: [] };
  let bestAbs = threshold;
  cands.forEach((c) => {
    const d = c.pos - start(moving);
    if (Math.abs(d) < bestAbs) {
      bestAbs = Math.abs(d);
      best = { d, marks: c.marks(c.pos) };
    }
  });
  return best;
}

// ---------------------------------------------------------------------
// Resize snapping: the edges being dragged snap to other objects' edges
// and centres (and the page's). Only for objects that aren't rotated.
// ---------------------------------------------------------------------
export function computeEdgeSnap(edge: number, anchors: number[], threshold: number): { d: number; at: number | null } {
  let best = 0;
  let bestAbs = threshold;
  let at: number | null = null;
  anchors.forEach((a) => {
    const d = a - edge;
    if (Math.abs(d) < bestAbs) {
      bestAbs = Math.abs(d);
      best = d;
      at = a;
    }
  });
  return { d: best, at };
}

export function allXAnchors(targets: Bounds[]): number[] {
  return targets.flatMap(xAnchors);
}
export function allYAnchors(targets: Bounds[]): number[] {
  return targets.flatMap(yAnchors);
}
