// ---------------------------------------------------------------------
// lib/editor/geometry.ts
//
// Pure math. Nothing here touches fabric.Canvas or React state.
// ---------------------------------------------------------------------

import type { DraftGeometry, DrawTool } from './types';

export function regularPolygonPoints(sides: number, radius: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push({ x: Math.cos(angle) * radius + radius, y: Math.sin(angle) * radius + radius });
  }
  return pts;
}

export function starPoints(spikes: number, outerRadius: number, innerRadius: number) {
  const pts: { x: number; y: number }[] = [];
  const step = Math.PI / spikes;
  let rot = -Math.PI / 2;
  for (let i = 0; i < spikes; i++) {
    pts.push({ x: Math.cos(rot) * outerRadius + outerRadius, y: Math.sin(rot) * outerRadius + outerRadius });
    rot += step;
    pts.push({
      x: Math.cos(rot) * innerRadius + outerRadius,
      y: Math.sin(rot) * innerRadius + outerRadius,
    });
    rot += step;
  }
  return pts;
}

export function computeDragGeometry(
  startX: number,
  startY: number,
  curX: number,
  curY: number,
  shiftKey: boolean,
  altKey: boolean
) {
  const dx = curX - startX;
  const dy = curY - startY;
  let w = Math.abs(dx);
  let h = Math.abs(dy);
  if (shiftKey) {
    const m = Math.max(w, h);
    w = m;
    h = m;
  }
  let left = dx >= 0 ? startX : startX - w;
  let top = dy >= 0 ? startY : startY - h;
  if (altKey) {
    left = startX - w;
    top = startY - h;
    w *= 2;
    h *= 2;
  }
  return { left, top, w, h };
}

export function buildDraftShape(F: any, tool: DrawTool, geo: DraftGeometry) {
  const common = { selectable: false, evented: false, objectCaching: false };
  switch (tool) {
    case 'rect':
      return new F.Rect({
        ...common,
        left: geo.left,
        top: geo.top,
        width: Math.max(geo.w, 1),
        height: Math.max(geo.h, 1),
        fill: '#3FA9E8',
      });
    case 'ellipse':
      return new F.Ellipse({
        ...common,
        left: geo.left,
        top: geo.top,
        rx: Math.max(geo.w / 2, 0.5),
        ry: Math.max(geo.h / 2, 0.5),
        fill: '#7ED33E',
      });
    case 'triangle':
      return new F.Triangle({
        ...common,
        left: geo.left,
        top: geo.top,
        width: Math.max(geo.w, 1),
        height: Math.max(geo.h, 1),
        fill: '#E85D75',
      });
    case 'polygon': {
      const r = Math.max(Math.min(geo.w, geo.h) / 2, 1);
      return new F.Polygon(regularPolygonPoints(6, r), {
        ...common,
        left: geo.left,
        top: geo.top,
        fill: '#9B6BD6',
      });
    }
    case 'star': {
      const r = Math.max(Math.min(geo.w, geo.h) / 2, 1);
      return new F.Polygon(starPoints(5, r, r * 0.45), {
        ...common,
        left: geo.left,
        top: geo.top,
        fill: '#F5A623',
      });
    }
    case 'line':
      return new F.Line([geo.x1 ?? 0, geo.y1 ?? 0, geo.x2 ?? 0, geo.y2 ?? 0], {
        ...common,
        stroke: '#1A1A1A',
        strokeWidth: 4,
      });
  }
}

export function flattenPathToLocalPoints(obj: any): { x: number; y: number }[] {
  const offset = obj.pathOffset || { x: 0, y: 0 };
  const commands: any[] = obj.path || [];
  const pts: { x: number; y: number }[] = [];
  let cur = { x: 0, y: 0 };

  const cubic = (p0: any, p1: any, p2: any, p3: any, steps = 12) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      pts.push({
        x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
        y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
      });
    }
  };

  commands.forEach((cmd: any[]) => {
    const type = cmd[0];
    if (type === 'M' || type === 'L') {
      cur = { x: cmd[1], y: cmd[2] };
      pts.push({ ...cur });
    } else if (type === 'C') {
      const p1 = { x: cmd[1], y: cmd[2] };
      const p2 = { x: cmd[3], y: cmd[4] };
      const p3 = { x: cmd[5], y: cmd[6] };
      cubic(cur, p1, p2, p3);
      cur = p3;
    } else if (type === 'Q') {
      const p1 = { x: cmd[1], y: cmd[2] };
      const p2 = { x: cmd[3], y: cmd[4] };
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        pts.push({
          x: mt * mt * cur.x + 2 * mt * t * p1.x + t * t * p2.x,
          y: mt * mt * cur.y + 2 * mt * t * p1.y + t * t * p2.y,
        });
      }
      cur = p2;
    }
  });

  return pts.map((p) => ({ x: p.x - offset.x, y: p.y - offset.y }));
}

export function getAbsolutePolygonPoints(obj: any, F: any): [number, number][] {
  const w = obj.width || 0;
  const h = obj.height || 0;
  let localPts: { x: number; y: number }[] = [];

  if (obj.type === 'rect') {
    localPts = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ].map((p) => ({ x: p.x - w / 2, y: p.y - h / 2 }));
  } else if (obj.type === 'triangle') {
    localPts = [
      { x: w / 2, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ].map((p) => ({ x: p.x - w / 2, y: p.y - h / 2 }));
  } else if (obj.type === 'circle') {
    const r = obj.radius || 0;
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2 * Math.PI;
      localPts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
  } else if (obj.type === 'ellipse') {
    const rx = obj.rx || 0;
    const ry = obj.ry || 0;
    const N = 64;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2 * Math.PI;
      localPts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
    }
  } else if (obj.type === 'polygon') {
    const pts: any[] = obj.points || [];
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    localPts = pts.map((p) => ({ x: p.x - minX - w / 2, y: p.y - minY - h / 2 }));
  } else if (obj.type === 'path') {
    localPts = flattenPathToLocalPoints(obj);
  }

  const matrix: any = obj.calcTransformMatrix();
  return localPts.map((p) => {
    const tp: any = F.util.transformPoint(new F.Point(p.x, p.y), matrix);
    return [tp.x, tp.y] as [number, number];
  });
}

export function multiPolygonToPathD(mp: number[][][][]): string {
  let d = '';
  mp.forEach((polygon) => {
    polygon.forEach((ring) => {
      if (ring.length === 0) return;
      d += `M ${ring[0][0]} ${ring[0][1]} `;
      for (let i = 1; i < ring.length; i++) d += `L ${ring[i][0]} ${ring[i][1]} `;
      d += 'Z ';
    });
  });
  return d.trim();
}

export function buildPathD(
  anchors: { x: number; y: number; handleIn?: { x: number; y: number }; handleOut?: { x: number; y: number } }[],
  rubberBandTo: { x: number; y: number } | null,
  closed: boolean
) {
  if (anchors.length === 0) return '';
  let d = `M ${anchors[0].x} ${anchors[0].y}`;
  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const curr = anchors[i];
    const c1 = prev.handleOut || prev;
    const c2 = curr.handleIn || curr;
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${curr.x} ${curr.y}`;
  }
  if (rubberBandTo) {
    const last = anchors[anchors.length - 1];
    const c1 = last.handleOut || last;
    d += ` C ${c1.x} ${c1.y}, ${rubberBandTo.x} ${rubberBandTo.y}, ${rubberBandTo.x} ${rubberBandTo.y}`;
  }
  if (closed) {
    const last = anchors[anchors.length - 1];
    const first = anchors[0];
    const c1 = last.handleOut || last;
    const c2 = first.handleIn || first;
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${first.x} ${first.y} Z`;
  }
  return d;
}
