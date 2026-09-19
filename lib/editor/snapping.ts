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
