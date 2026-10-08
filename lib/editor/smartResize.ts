// Fits a layout made for one page size onto another — used by Resize
// (Instagram post → story → A4…) and when a template is applied to a page
// of a different size. Nothing is stretched: content keeps its proportions,
// full-page backgrounds are re-covered, and things sitting near an edge
// (headers, footers, logos in a corner) stay near that edge.

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Placement {
  // Uniform scale for the object's size (content), or separate x/y scales
  // for full-page colour blocks.
  scaleX: number;
  scaleY: number;
  // New centre in the target page's coordinates.
  cx: number;
  cy: number;
  role: 'background' | 'content';
}

export function planResize(
  objects: { box: Box; isImage: boolean; isShape: boolean }[],
  from: { width: number; height: number },
  to: { width: number; height: number }
): Placement[] {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  const s = Math.min(sx, sy);
  const cover = Math.max(sx, sy);
  const edge = 0.08;
  // Content is placed as if the old page were scaled by `s` and centred.
  const offX = (to.width - from.width * s) / 2;
  const offY = (to.height - from.height * s) / 2;

  return objects.map(({ box, isImage, isShape }) => {
    const area = (box.width * box.height) / (from.width * from.height);
    const spansW = box.width >= from.width * 0.92;
    const spansH = box.height >= from.height * 0.92;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;

    if (area >= 0.85 || (spansW && spansH)) {
      // Full-page background: fill the whole new page.
      if (isImage) return { scaleX: cover, scaleY: cover, cx: (cx / from.width) * to.width, cy: (cy / from.height) * to.height, role: 'background' };
      return { scaleX: sx, scaleY: sy, cx: (cx / from.width) * to.width, cy: (cy / from.height) * to.height, role: 'background' };
    }
    if (isShape && spansW && box.height < from.height * 0.4) {
      // A full-width band (header bar, footer strip): keep it full width.
      const nearTop = box.top <= from.height * edge;
      const nearBottom = box.top + box.height >= from.height * (1 - edge);
      const h = box.height * s;
      let ny = offY + cy * s;
      if (nearTop) ny = (box.top / from.height) * to.height + h / 2;
      if (nearBottom) ny = to.height - (from.height - (box.top + box.height)) * s - h / 2;
      return { scaleX: sx, scaleY: s, cx: to.width / 2 + (cx - from.width / 2) * sx, cy: ny, role: 'background' };
    }

    let ncx = offX + cx * s;
    let ncy = offY + cy * s;
    const w = box.width * s;
    const h = box.height * s;
    // Keep edge-anchored content against the same edge.
    if (box.left <= from.width * edge) ncx = box.left * s + w / 2;
    else if (box.left + box.width >= from.width * (1 - edge)) ncx = to.width - (from.width - (box.left + box.width)) * s - w / 2;
    if (box.top <= from.height * edge) ncy = box.top * s + h / 2;
    else if (box.top + box.height >= from.height * (1 - edge)) ncy = to.height - (from.height - (box.top + box.height)) * s - h / 2;
    return { scaleX: s, scaleY: s, cx: ncx, cy: ncy, role: 'content' };
  });
}
