'use client';

// On-canvas gradient editing: when the selected object is filled with a
// gradient, its start and end points (linear) or centre and edge (radial)
// appear as handles you drag right on the design. Shift snaps the angle to
// 15° steps. Purely an overlay — never part of the design or its exports.

import { useEffect, useRef, useState } from 'react';
import { P, fromScreen, snapAngle, toScreen } from '@/lib/editor/gradientHandles';

interface Props { fabricCanvasRef: React.MutableRefObject<any>; ready: boolean; enabled: boolean }

const boxOf = (o: any) => ({ width: o.width || 1, height: o.height || 1, matrix: o.calcTransformMatrix() as number[] });
const gradOf = (o: any) => {
  const g = o?.fill;
  return g && typeof g === 'object' && g.colorStops && g.coords && (g.gradientUnits || 'pixels') === 'percentage' && !g.gradientTransform ? g : null;
};

export function GradientHandles({ fabricCanvasRef, ready, enabled }: Props) {
  const [pts, setPts] = useState<{ a: P; b: P; radial: boolean; colours: [string, string] } | null>(null);
  const drag = useRef<null | { which: 'a' | 'b' | 'move'; start: P; c0: any }>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c || !ready) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const o = c.getActiveObject();
        const g = enabled && o && !o.isEditing ? gradOf(o) : null;
        if (!g) { setPts(null); return; }
        const vpt = c.viewportTransform || [1, 0, 0, 1, 0, 0], b = boxOf(o), k = g.coords;
        const stops = [...g.colorStops].sort((x: any, y: any) => x.offset - y.offset);
        if (g.type === 'radial') {
          const r = k.r2 ?? 0.5;
          setPts({ a: toScreen(b, vpt, k.x2 ?? 0.5, k.y2 ?? 0.5), b: toScreen(b, vpt, (k.x2 ?? 0.5) + r, k.y2 ?? 0.5), radial: true, colours: [stops[0].color, stops[stops.length - 1].color] });
        } else {
          setPts({ a: toScreen(b, vpt, k.x1, k.y1), b: toScreen(b, vpt, k.x2, k.y2), radial: false, colours: [stops[0].color, stops[stops.length - 1].color] });
        }
      });
    };
    c.on('after:render', update);
    update();
    return () => { cancelAnimationFrame(raf); c.off('after:render', update); };
  }, [fabricCanvasRef, ready, enabled]);

  if (!pts) return null;

  const local = (e: React.PointerEvent): P => {
    const r = hostRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (which: 'a' | 'b' | 'move') => (e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    const o = fabricCanvasRef.current?.getActiveObject(), g = gradOf(o);
    if (!g) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { which, start: local(e), c0: { ...g.coords } };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const c = fabricCanvasRef.current, o = c?.getActiveObject(), g = gradOf(o);
    if (!g) return;
    const vpt = c.viewportTransform || [1, 0, 0, 1, 0, 0], b = boxOf(o);
    let p = local(e);
    const k = { ...d.c0 };
    if (g.type === 'radial') {
      const cx = d.c0.x2 ?? 0.5, cy = d.c0.y2 ?? 0.5;
      if (d.which === 'b') {
        const f = fromScreen(b, vpt, p);
        // Radius in fractions of the box width (how Fabric scales r with 'percentage').
        k.r2 = Math.max(0.02, Math.hypot(f.x - cx, ((f.y - cy) * b.height) / b.width));
      } else {
        const f = fromScreen(b, vpt, p);
        k.x1 = k.x2 = f.x; k.y1 = k.y2 = f.y;
      }
    } else {
      const sa = toScreen(b, vpt, d.c0.x1, d.c0.y1), sb = toScreen(b, vpt, d.c0.x2, d.c0.y2);
      if (d.which === 'move') {
        const s = fromScreen(b, vpt, d.start), f = fromScreen(b, vpt, p);
        k.x1 = d.c0.x1 + f.x - s.x; k.y1 = d.c0.y1 + f.y - s.y; k.x2 = d.c0.x2 + f.x - s.x; k.y2 = d.c0.y2 + f.y - s.y;
      } else {
        if (e.shiftKey) p = snapAngle(d.which === 'a' ? sb : sa, p);
        const f = fromScreen(b, vpt, p);
        if (d.which === 'a') { k.x1 = f.x; k.y1 = f.y; } else { k.x2 = f.x; k.y2 = f.y; }
      }
    }
    g.coords = k;
    o.dirty = true;
    c.requestRenderAll();
  };
  const up = () => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const c = fabricCanvasRef.current, o = c?.getActiveObject();
    if (o) c.fire('object:modified', { target: o });
  };

  const dot = (p: P, colour: string, which: 'a' | 'b', label: string) => (
    <div
      role="slider"
      aria-label={label}
      aria-valuenow={0}
      tabIndex={-1}
      onPointerDown={down(which)}
      onPointerMove={move}
      onPointerUp={up}
      className="absolute pointer-events-auto cursor-grab rounded-full"
      style={{ left: p.x - 8, top: p.y - 8, width: 16, height: 16, background: colour, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(15,23,42,.55), 0 1px 4px rgba(0,0,0,.35)' }}
    />
  );
  const len = Math.hypot(pts.b.x - pts.a.x, pts.b.y - pts.a.y);
  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-none z-10" data-gradient-handles>
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        {pts.radial
          ? <circle cx={pts.a.x} cy={pts.a.y} r={len} fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="4 3" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,.7))' }} />
          : <line x1={pts.a.x} y1={pts.a.y} x2={pts.b.x} y2={pts.b.y} stroke="#fff" strokeWidth={2} style={{ pointerEvents: 'stroke', cursor: 'move', filter: 'drop-shadow(0 0 1px rgba(0,0,0,.7))' }} onPointerDown={down('move') as any} onPointerMove={move as any} onPointerUp={up} />}
      </svg>
      {dot(pts.a, pts.colours[0], pts.radial ? 'a' : 'a', pts.radial ? 'Gradient centre' : 'Gradient start')}
      {dot(pts.b, pts.colours[1], 'b', pts.radial ? 'Gradient size' : 'Gradient end')}
    </div>
  );
}
