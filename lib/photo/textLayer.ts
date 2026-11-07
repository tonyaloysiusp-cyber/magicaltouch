// Photo Studio live text: a text layer keeps its words and settings
// (Layer.text) and is re-drawn from them, so it can be edited any time —
// words, font, size, colour, spacing, alignment and effect — and moved.
// Painting or erasing on it, or cropping, turns it into pixels.

import { makeCanvas } from './ops';
import { isPremium, paintPremium } from '@/lib/textfx/premium';

export interface TextSpec {
  value: string;
  x: number; y: number; // top-left of the text block (document px)
  font: string; size: number; bold: boolean; italic: boolean;
  align: 'left' | 'center' | 'right'; spacing: number;
  color: string; effect: string; fxColor: string;
  bw?: number; bh?: number; // measured box (for clicking on it)
}

export const BASIC_TEXT_FX = ['none', 'shadow', 'lift', 'glow', 'outline', 'highlight'] as const;

export function renderTextSpec(spec: TextSpec, W: number, H: number): { canvas: HTMLCanvasElement; spec: TextSpec } {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d')!;
  const px = spec.size;
  ctx.textBaseline = 'top';
  ctx.font = `${spec.italic ? 'italic ' : ''}${spec.bold ? 700 : 400} ${px}px "${spec.font}", sans-serif`;
  try { (ctx as any).letterSpacing = `${spec.spacing}px`; } catch { /* older browsers */ }
  const lines = spec.value.split('\n');
  const widths = lines.map((l) => ctx.measureText(l).width);
  const blockW = Math.max(1, ...widths);
  const lineX = (i: number) => (spec.align === 'left' ? spec.x : spec.align === 'center' ? spec.x + (blockW - widths[i]) / 2 : spec.x + blockW - widths[i]);
  const lineY = (i: number) => spec.y + i * px * 1.2;
  const blockH = px * (1.2 * (lines.length - 1) + 1.05);
  const fx = spec.fxColor;
  const fillAll = (dx = 0, dy = 0, style: string = spec.color) => { ctx.fillStyle = style; lines.forEach((l, i) => ctx.fillText(l, lineX(i) + dx, lineY(i) + dy)); };
  const strokeAll = (w: number, style: string) => { ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.strokeStyle = style; lines.forEach((l, i) => ctx.strokeText(l, lineX(i), lineY(i))); };
  ctx.save();
  if (isPremium(spec.effect)) {
    paintPremium(ctx, spec.effect, fx, px, { x: spec.x, y: spec.y, w: blockW, h: blockH }, (mode) => lines.forEach((l, i) => (mode === 'fill' ? ctx.fillText(l, lineX(i), lineY(i)) : ctx.strokeText(l, lineX(i), lineY(i)))));
  } else {
    switch (spec.effect) {
      case 'highlight':
        ctx.fillStyle = fx === '#09090B' ? '#F7C948' : fx;
        lines.forEach((l, i) => l.trim() && ctx.fillRect(lineX(i) - px * 0.15, lineY(i) - px * 0.05, widths[i] + px * 0.3, px * 1.15));
        fillAll();
        break;
      case 'shadow':
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = px * 0.12; ctx.shadowOffsetX = ctx.shadowOffsetY = px * 0.06;
        fillAll();
        break;
      case 'lift':
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = px * 0.3; ctx.shadowOffsetY = px * 0.1;
        fillAll();
        break;
      case 'glow':
        ctx.shadowColor = fx === '#09090B' ? '#8CCBFF' : fx; ctx.shadowBlur = px * 0.35;
        fillAll(); fillAll();
        break;
      case 'outline':
        strokeAll(Math.max(2, px * 0.1), fx);
        fillAll();
        break;
      default:
        fillAll();
    }
  }
  ctx.restore();
  return { canvas: c, spec: { ...spec, bw: blockW, bh: blockH } };
}

/** The top-most text layer under a point, if any. */
export function textLayerAt<L extends { text?: TextSpec; visible: boolean }>(layers: L[], x: number, y: number): number {
  for (let i = layers.length - 1; i >= 0; i--) {
    const t = layers[i].text;
    if (!t || !layers[i].visible) continue;
    const pad = t.size * 0.2;
    if (x >= t.x - pad && x <= t.x + (t.bw || 0) + pad && y >= t.y - pad && y <= t.y + (t.bh || t.size) + pad) return i;
  }
  return -1;
}
