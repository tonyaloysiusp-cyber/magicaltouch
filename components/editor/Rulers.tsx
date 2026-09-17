'use client';

import { useEffect, useRef } from 'react';
import { DocUnit, RULER_SIZE } from '@/lib/editor/types';
import { UNIT_FACTORS, pxToUnit } from '@/lib/editor/units';

interface Props {
  fabricCanvasRef: React.MutableRefObject<any>;
  unit: DocUnit;
  artboardWidth: number;
  artboardHeight: number;
  ready: boolean;
}

// Picks a "nice" tick spacing (1/2/5 * 10^n) in document-unit space so that
// major ticks land roughly `targetPx` apart on screen at the current zoom.
function pickStepUnits(pxPerUnitOnScreen: number, targetPx: number) {
  const raw = targetPx / Math.max(pxPerUnitOnScreen, 0.0001);
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 5, 10];
  for (const m of candidates) {
    const step = magnitude * m;
    if (step >= raw) return step;
  }
  return magnitude * 10;
}

function drawRulers(
  canvas: any,
  topCanvas: HTMLCanvasElement | null,
  leftCanvas: HTMLCanvasElement | null,
  artboardWidth: number,
  artboardHeight: number,
  unit: DocUnit
) {
  if (!canvas || !topCanvas || !leftCanvas) return;
  const vt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = vt[0] || 1;
  const panX = vt[4] || 0;
  const panY = vt[5] || 0;
  const vw = canvas.getWidth();
  const vh = canvas.getHeight();

  const unitFactor = UNIT_FACTORS[unit];
  const pxPerUnitOnScreen = unitFactor * zoom;
  const stepUnits = pickStepUnits(pxPerUnitOnScreen, 70);
  const stepWorldPx = stepUnits * unitFactor;
  const minorStepWorldPx = stepWorldPx / 2;

  const worldToScreenX = (x: number) => x * zoom + panX;
  const worldToScreenY = (y: number) => y * zoom + panY;
  const screenToWorldX = (x: number) => (x - panX) / zoom;
  const screenToWorldY = (y: number) => (y - panY) / zoom;

  const bg = '#f3f4f6';
  const line = '#9ca3af';
  const majorLine = '#6b7280';
  const text = '#374151';
  const artboardTint = 'rgba(63,169,232,0.12)';

  // --- Top ruler ---
  if (topCanvas.width !== vw) topCanvas.width = vw;
  if (topCanvas.height !== RULER_SIZE) topCanvas.height = RULER_SIZE;
  const tctx = topCanvas.getContext('2d');
  if (tctx) {
    tctx.clearRect(0, 0, vw, RULER_SIZE);
    tctx.fillStyle = bg;
    tctx.fillRect(0, 0, vw, RULER_SIZE);

    const artLeft = worldToScreenX(0);
    const artRight = worldToScreenX(artboardWidth);
    tctx.fillStyle = artboardTint;
    tctx.fillRect(Math.max(artLeft, 0), 0, Math.max(Math.min(artRight, vw) - Math.max(artLeft, 0), 0), RULER_SIZE);

    const worldStart = screenToWorldX(0);
    const worldEnd = screenToWorldX(vw);
    const firstMinor = Math.floor(worldStart / minorStepWorldPx) * minorStepWorldPx;

    tctx.font = '9px sans-serif';
    tctx.textBaseline = 'top';
    for (let w = firstMinor; w <= worldEnd + minorStepWorldPx; w += minorStepWorldPx) {
      const sx = worldToScreenX(w);
      if (sx < 0 || sx > vw) continue;
      const isMajor = Math.abs(Math.round(w / stepWorldPx) * stepWorldPx - w) < minorStepWorldPx / 4;
      tctx.strokeStyle = isMajor ? majorLine : line;
      tctx.beginPath();
      tctx.moveTo(sx + 0.5, isMajor ? 4 : 12);
      tctx.lineTo(sx + 0.5, RULER_SIZE);
      tctx.stroke();
      if (isMajor) {
        const label = Math.round(pxToUnit(w, unit) * 100) / 100;
        tctx.fillStyle = text;
        tctx.fillText(String(label), sx + 2, 3);
      }
    }
  }

  // --- Left ruler ---
  if (leftCanvas.height !== vh) leftCanvas.height = vh;
  if (leftCanvas.width !== RULER_SIZE) leftCanvas.width = RULER_SIZE;
  const lctx = leftCanvas.getContext('2d');
  if (lctx) {
    lctx.clearRect(0, 0, RULER_SIZE, vh);
    lctx.fillStyle = bg;
    lctx.fillRect(0, 0, RULER_SIZE, vh);

    const artTop = worldToScreenY(0);
    const artBottom = worldToScreenY(artboardHeight);
    lctx.fillStyle = artboardTint;
    lctx.fillRect(0, Math.max(artTop, 0), RULER_SIZE, Math.max(Math.min(artBottom, vh) - Math.max(artTop, 0), 0));

    const worldStart = screenToWorldY(0);
    const worldEnd = screenToWorldY(vh);
    const firstMinor = Math.floor(worldStart / minorStepWorldPx) * minorStepWorldPx;

    lctx.font = '9px sans-serif';
    for (let w = firstMinor; w <= worldEnd + minorStepWorldPx; w += minorStepWorldPx) {
      const sy = worldToScreenY(w);
      if (sy < 0 || sy > vh) continue;
      const isMajor = Math.abs(Math.round(w / stepWorldPx) * stepWorldPx - w) < minorStepWorldPx / 4;
      lctx.strokeStyle = isMajor ? majorLine : line;
      lctx.beginPath();
      lctx.moveTo(isMajor ? 4 : 12, sy + 0.5);
      lctx.lineTo(RULER_SIZE, sy + 0.5);
      lctx.stroke();
      if (isMajor) {
        const label = Math.round(pxToUnit(w, unit) * 100) / 100;
        lctx.save();
        lctx.translate(9, sy + 2);
        lctx.rotate(-Math.PI / 2);
        lctx.fillStyle = text;
        lctx.fillText(String(label), 0, 0);
        lctx.restore();
      }
    }
  }
}

export function Rulers({ fabricCanvasRef, unit, artboardWidth, artboardHeight, ready }: Props) {
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let raf = 0;
    const scheduleDraw = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        drawRulers(canvas, topRef.current, leftRef.current, artboardWidth, artboardHeight, unit)
      );
    };

    scheduleDraw();
    canvas.on('after:render', scheduleDraw);
    return () => {
      canvas.off('after:render', scheduleDraw);
      cancelAnimationFrame(raf);
    };
  }, [fabricCanvasRef, ready, unit, artboardWidth, artboardHeight]);

  return (
    <>
      <div
        className="absolute top-0 left-0 z-20 bg-gray-100 border-b border-r border-gray-300"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
      <canvas
        ref={topRef}
        className="absolute top-0 z-20 border-b border-gray-300"
        style={{ left: RULER_SIZE, right: 0, height: RULER_SIZE }}
      />
      <canvas
        ref={leftRef}
        className="absolute left-0 z-20 border-r border-gray-300"
        style={{ top: RULER_SIZE, bottom: 0, width: RULER_SIZE }}
      />
    </>
  );
}
