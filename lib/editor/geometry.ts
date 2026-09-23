// ---------------------------------------------------------------------
// lib/editor/geometry.ts
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

// Snaps the direction from `from` to `to` onto the nearest 45° increment
// (0/45/90/135/180/225/270/315), preserving the distance between them —
// the standard Shift-constrain gesture for a pen segment or a bezier
// handle, kept as one shared helper so both usePenTool and
// useDirectSelection apply the exact same math.
export function snapAngleTo45(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return { x: to.x, y: to.y };
  const angle = Math.atan2(dy, dx);
  const step = Math.PI / 4;
  const snapped = Math.round(angle / step) * step;
  return { x: from.x + Math.cos(snapped) * d, y: from.y + Math.sin(snapped) * d };
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

// De Casteljau subdivision of a cubic bezier at parameter t — splits one
// curve into two that together trace the exact same shape (unlike
// approximating a midpoint and guessing new handles).
export function splitCubicBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t = 0.5
) {
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const p01 = lerp(p0, p1);
  const p12 = lerp(p1, p2);
  const p23 = lerp(p2, p3);
  const p012 = lerp(p01, p12);
  const p123 = lerp(p12, p23);
  const p0123 = lerp(p012, p123);
  return {
    left: [p0, p01, p012, p0123] as const,
    right: [p0123, p123, p23, p3] as const,
    midpoint: p0123,
  };
}

// A command's own "end point", in the path's raw coordinate space — the
// point every M/L/C/Q command ultimately draws to. Mirrors the identical
// helper in useDirectSelection.ts (kept local there to avoid a Fabric
// dependency here) — this file stays pure math.
function commandEndPoint(cmd: any[]): { x: number; y: number } | null {
  const type = cmd[0];
  if (type === 'M' || type === 'L') return { x: cmd[1], y: cmd[2] };
  if (type === 'C') return { x: cmd[5], y: cmd[6] };
  if (type === 'Q') return { x: cmd[3], y: cmd[4] };
  return null;
}

interface PathEdge {
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  end: { x: number; y: number };
}

// Parses a raw Fabric .path command array (this app's Pen tool only ever
// emits M then C commands, closed paths ending in a trailing Z) into its
// start point plus one edge per C command — the shared representation
// reversePathCommands/breakClosedPathAt/breakOpenPathAt/joinTwoOpenPaths
// all build on, so none of them has to re-parse the raw array itself.
function parsePathEdges(cmds: any[]): { start: { x: number; y: number }; edges: PathEdge[]; closed: boolean } | null {
  if (!cmds.length) return null;
  const hasZ = cmds[cmds.length - 1][0] === 'Z';
  const body = hasZ ? cmds.slice(0, -1) : cmds;
  const start = commandEndPoint(body[0]);
  if (!start) return null;
  const edges: PathEdge[] = [];
  for (let i = 1; i < body.length; i++) {
    const cmd = body[i];
    if (cmd[0] !== 'C') return null; // unexpected shape — bail out safely
    const end = commandEndPoint(cmd);
    if (!end) return null;
    edges.push({ c1: { x: cmd[1], y: cmd[2] }, c2: { x: cmd[3], y: cmd[4] }, end });
  }
  return { start, edges, closed: hasZ };
}

function buildCommandsFromEdges(start: { x: number; y: number }, edges: PathEdge[], closed: boolean): any[] {
  const cmds: any[] = [['M', start.x, start.y]];
  edges.forEach((e) => cmds.push(['C', e.c1.x, e.c1.y, e.c2.x, e.c2.y, e.end.x, e.end.y]));
  if (closed) cmds.push(['Z']);
  return cmds;
}

// Reverses a path's direction: anchor order, segment order, AND each
// segment's own handle roles all flip (a cubic bezier (P0,P1,P2,P3)
// reversed is exactly (P3,P2,P1,P0) — the standard, shape-preserving way
// to reverse a bezier segment). Works for open and closed paths alike;
// returns the original array unchanged if it isn't in the M-then-C shape
// this app always produces.
export function reversePathCommands(cmds: any[]): any[] {
  const parsed = parsePathEdges(cmds);
  if (!parsed || parsed.edges.length === 0) return cmds;
  const { start, edges, closed } = parsed;
  const points = [start, ...edges.map((e) => e.end)];
  const newEdges: PathEdge[] = [];
  for (let i = edges.length - 1; i >= 0; i--) {
    newEdges.push({ c1: edges[i].c2, c2: edges[i].c1, end: points[i] });
  }
  return buildCommandsFromEdges(points[points.length - 1], newEdges, closed);
}

// "Cuts" a closed path open at anchor `idx` (0-indexed, counting the M
// as anchor 0) — rotates the loop so that anchor becomes both the new
// start and end, without changing the traced shape at all, just where it
// starts/stops. Returns null if the path isn't closed or idx is invalid.
export function breakClosedPathAt(cmds: any[], idx: number): any[] | null {
  const parsed = parsePathEdges(cmds);
  if (!parsed || !parsed.closed) return null;
  const { start, edges } = parsed;
  const n = edges.length;
  if (idx < 0 || idx >= n || n < 2) return null;
  const points = [start, ...edges.map((e) => e.end)]; // points[n] === points[0]
  const rotated: PathEdge[] = [];
  for (let m = 0; m < n; m++) rotated.push(edges[(idx + m) % n]);
  return buildCommandsFromEdges(points[idx], rotated, false);
}

// Splits an OPEN path into two separate open paths at interior anchor
// `idx` (1..edges.length-1 — the endpoints themselves have nothing to
// split). Returns null if the path is closed or idx is an endpoint.
export function breakOpenPathAt(cmds: any[], idx: number): { cmdsA: any[]; cmdsB: any[] } | null {
  const parsed = parsePathEdges(cmds);
  if (!parsed || parsed.closed) return null;
  const { start, edges } = parsed;
  const n = edges.length;
  if (idx <= 0 || idx >= n) return null;
  const points = [start, ...edges.map((e) => e.end)];
  const cmdsA = buildCommandsFromEdges(points[0], edges.slice(0, idx), false);
  const cmdsB = buildCommandsFromEdges(points[idx], edges.slice(idx), false);
  return { cmdsA, cmdsB };
}

// Closes a single open path by connecting its own last anchor back to
// its first — a straight closing segment when neither endpoint has a
// handle pointing that way, degenerating exactly like buildPathD's own
// "no handle" case does.
export function closeOpenPathCommands(cmds: any[]): any[] | null {
  const parsed = parsePathEdges(cmds);
  if (!parsed || parsed.closed || parsed.edges.length === 0) return null;
  const { start, edges } = parsed;
  const last = edges[edges.length - 1].end;
  const closingEdge: PathEdge = { c1: last, c2: start, end: start };
  return buildCommandsFromEdges(start, [...edges, closingEdge], true);
}

// Merges two open paths into one continuous open path by connecting the
// closest pair of endpoints with a new straight segment (degenerate
// handles, same convention as every other "no handle" join in this
// file). Whichever path needs to run backward to make its connecting
// endpoint meet the other path's is reversed first via
// reversePathCommands so the merge always reads A-start -> ... -> A-end
// -> (new segment) -> B-start -> ... -> B-end.
export function joinTwoOpenPaths(cmdsA: any[], cmdsB: any[]): any[] | null {
  const a = parsePathEdges(cmdsA);
  const b = parsePathEdges(cmdsB);
  if (!a || !b || a.closed || b.closed) return null;
  const aPoints = [a.start, ...a.edges.map((e) => e.end)];
  const bPoints = [b.start, ...b.edges.map((e) => e.end)];
  const aStart = aPoints[0];
  const aEnd = aPoints[aPoints.length - 1];
  const bStart = bPoints[0];
  const bEnd = bPoints[bPoints.length - 1];
  const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y);

  // Of the four ways to pair up two open paths' endpoints, pick whichever
  // needs the least reversing to read "A's end meets B's start" — i.e.
  // the closest pairing decides both which ends connect and which path
  // (if either) needs reversePathCommands first.
  const options: { d: number; reverseA: boolean; reverseB: boolean }[] = [
    { d: dist(aEnd, bStart), reverseA: false, reverseB: false },
    { d: dist(aEnd, bEnd), reverseA: false, reverseB: true },
    { d: dist(aStart, bStart), reverseA: true, reverseB: false },
    { d: dist(aStart, bEnd), reverseA: true, reverseB: true },
  ];
  const best = options.reduce((min, o) => (o.d < min.d ? o : min));

  const finalA = best.reverseA ? reversePathCommands(cmdsA) : cmdsA;
  const finalB = best.reverseB ? reversePathCommands(cmdsB) : cmdsB;
  const parsedA = parsePathEdges(finalA)!;
  const parsedB = parsePathEdges(finalB)!;
  const joinPoint = parsedA.start && parsedA.edges.length ? parsedA.edges[parsedA.edges.length - 1].end : parsedA.start;
  const connector: PathEdge = { c1: joinPoint, c2: parsedB.start, end: parsedB.start };
  return buildCommandsFromEdges(parsedA.start, [...parsedA.edges, connector, ...parsedB.edges], false);
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
