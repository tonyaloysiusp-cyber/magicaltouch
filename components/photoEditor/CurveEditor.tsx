'use client';

import { useRef, useState } from 'react';
import { CurvePoint, Histogram, buildCurveLUT } from '@/lib/editor/curves';

// ---------------------------------------------------------------------
// A real, interactive tone-curve editor: draggable control points over
// a genuine histogram of the actual image, rendered as a live-updating
// Catmull-Rom curve (lib/editor/curves.ts) — not a static preview image.
// Click empty graph space to add a point; double-click a point (other
// than the two fixed endpoints) to remove it; drag any point to reshape
// the curve. Endpoints stay pinned to x=0/x=255 (only their output
// value moves), matching how every real Curves tool locks the ends of
// the input domain.
// ---------------------------------------------------------------------

const SIZE = 256; // both the SVG viewBox and the data domain (0-255) — 1:1, no separate scale factor needed

interface Props {
  points: CurvePoint[];
  histogram: Histogram | null;
  onChange: (points: CurvePoint[]) => void;
}

export function CurveEditor({ points, histogram, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const sorted = [...points].sort((a, b) => a.x - b.x);

  const toData = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE;
    const y = SIZE - ((clientY - rect.top) / rect.height) * SIZE; // flip: SVG y grows down, data y grows up
    return { x: Math.max(0, Math.min(255, Math.round(x))), y: Math.max(0, Math.min(255, Math.round(y))) };
  };

  const handlePointerDownOnPoint = (index: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragIndex(index);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragIndex == null) return;
    const isEndpoint = dragIndex === 0 || dragIndex === sorted.length - 1;
    const { x, y } = toData(e.clientX, e.clientY);
    const next = sorted.map((p, i) => (i === dragIndex ? { x: isEndpoint ? p.x : x, y } : p));
    onChange(next);
  };

  const handlePointerUp = () => setDragIndex(null);

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (dragIndex != null) return;
    const { x, y } = toData(e.clientX, e.clientY);
    // Don't add a point right on top of an existing one.
    if (sorted.some((p) => Math.abs(p.x - x) < 4)) return;
    onChange([...sorted, { x, y }]);
  };

  const handleDoubleClickOnPoint = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0 || index === sorted.length - 1) return; // endpoints aren't removable
    onChange(sorted.filter((_, i) => i !== index));
  };

  const lut = buildCurveLUT(sorted);
  const curvePath = Array.from({ length: 256 }, (_, x) => `${x},${SIZE - lut[x]}`).join(' ');

  const maxHistBin = histogram ? Math.max(1, ...Array.from(histogram.luminance)) : 1;
  const histPath = histogram
    ? `M 0,${SIZE} ` +
      Array.from({ length: 256 }, (_, x) => `L ${x},${SIZE - (histogram.luminance[x] / maxHistBin) * SIZE}`).join(' ') +
      ` L 255,${SIZE} Z`
    : '';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full aspect-square border rounded bg-gray-50 touch-none select-none"
      onClick={handleBackgroundClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {histogram && <path d={histPath} fill="#9ca3af" opacity={0.35} />}
      <line x1={0} y1={SIZE} x2={SIZE} y2={0} stroke="#d1d5db" strokeDasharray="4,4" strokeWidth={1} />
      <polyline points={curvePath} fill="none" stroke="#1f2937" strokeWidth={1.5} />
      {sorted.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={SIZE - p.y}
          r={5}
          fill="#ffffff"
          stroke="#3FA9E8"
          strokeWidth={2}
          onPointerDown={handlePointerDownOnPoint(i)}
          onDoubleClick={handleDoubleClickOnPoint(i)}
          style={{ cursor: i === 0 || i === sorted.length - 1 ? 'ns-resize' : 'move' }}
        />
      ))}
    </svg>
  );
}
