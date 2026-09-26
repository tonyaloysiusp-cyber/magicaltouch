'use client';

import { useEffect, useRef } from 'react';

interface Props {
  fabricCanvasRef: React.MutableRefObject<any>;
  visible: boolean;
  gridSize: number; // world px between grid lines
  ready: boolean;
}

// A pure visual aid, drawn on its own overlay canvas kept in sync with
// the Fabric canvas's pan/zoom -- never a Fabric object itself, so it can
// never be selected, dragged, saved into canvas_json, or leak into an
// export (unlike guides, which deliberately ARE real Fabric objects).
function drawGrid(canvas: any, overlay: HTMLCanvasElement | null, gridSize: number) {
  if (!canvas || !overlay || gridSize <= 0) return;
  const vt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vt[0] || 1;
  const panX = vt[4] || 0;
  const panY = vt[5] || 0;
  const vw = canvas.getWidth();
  const vh = canvas.getHeight();

  if (overlay.width !== vw) overlay.width = vw;
  if (overlay.height !== vh) overlay.height = vh;
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, vw, vh);

  const stepScreenPx = gridSize * zoom;
  if (stepScreenPx < 4) return; // zoomed out far enough that a full grid would just be noise

  const worldToScreenX = (x: number) => x * zoom + panX;
  const worldToScreenY = (y: number) => y * zoom + panY;
  const screenToWorldX = (x: number) => (x - panX) / zoom;
  const screenToWorldY = (y: number) => (y - panY) / zoom;

  const firstWorldX = Math.floor(screenToWorldX(0) / gridSize) * gridSize;
  const lastWorldX = screenToWorldX(vw);
  const firstWorldY = Math.floor(screenToWorldY(0) / gridSize) * gridSize;
  const lastWorldY = screenToWorldY(vh);

  ctx.strokeStyle = 'rgba(63,169,232,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = firstWorldX; x <= lastWorldX; x += gridSize) {
    const sx = Math.round(worldToScreenX(x)) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, vh);
  }
  for (let y = firstWorldY; y <= lastWorldY; y += gridSize) {
    const sy = Math.round(worldToScreenY(y)) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(vw, sy);
  }
  ctx.stroke();
}

export function GridOverlay({ fabricCanvasRef, visible, gridSize, ready }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const scheduleDraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = canvasRef.current;
        if (!el) return;
        if (!visible) {
          const ctx = el.getContext('2d');
          ctx?.clearRect(0, 0, el.width, el.height);
          return;
        }
        drawGrid(canvas, el, gridSize);
      });
    };

    scheduleDraw();
    canvas.on('after:render', scheduleDraw);
    return () => {
      canvas.off('after:render', scheduleDraw);
      cancelAnimationFrame(raf);
    };
  }, [fabricCanvasRef, ready, visible, gridSize]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[5]"
      aria-hidden="true"
    />
  );
}
