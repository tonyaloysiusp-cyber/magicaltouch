// ---------------------------------------------------------------------
// lib/editor/preflight.ts
// Real, computed preflight checks against the live canvas — no faked
// pass/fail. Every issue here is derived from an actual property on an
// actual object (image native resolution vs. displayed size, effective
// font size/stroke width after scale, artboard bleed/marks state).
// ---------------------------------------------------------------------

import { ArtboardPrintSettings } from './printSetup';

export type PreflightSeverity = 'warning' | 'error';

export interface PreflightIssue {
  severity: PreflightSeverity;
  artboardName: string;
  message: string;
}

interface ArtboardLike {
  id: string;
  name: string;
}

const MIN_FONT_PT = 6;
const MIN_STROKE_PT = 0.25;
const PT_PER_PX = 72 / 96;

function isPaintableStroke(obj: any) {
  return typeof obj.stroke === 'string' && obj.stroke !== '' && (obj.strokeWidth || 0) > 0;
}

export function runPreflight(canvas: any, artboards: ArtboardLike[], printSettingsById: Record<string, ArtboardPrintSettings>): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  if (!canvas) return issues;

  const allObjects = canvas
    .getObjects()
    .filter((o: any) => !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && !o.__isPrintMark && !o.__isGuide);

  artboards.forEach((ab) => {
    const settings = printSettingsById[ab.id];
    const members = allObjects.filter((o: any) => !o.__isArtboard && o.__artboardId === ab.id);

    if (members.length === 0) {
      issues.push({ severity: 'warning', artboardName: ab.name, message: 'This artboard is empty.' });
    }

    if (settings) {
      const b = settings.bleed;
      const hasBleed = !!(b.top || b.right || b.bottom || b.left);
      if ((settings.marks.crop || settings.marks.registration) && !hasBleed) {
        issues.push({
          severity: 'warning',
          artboardName: ab.name,
          message: 'Crop/registration marks are enabled but bleed is 0 — marks will sit right at the trim edge.',
        });
      }
    }

    members.forEach((obj: any) => {
      if (obj.type === 'image' && settings) {
        const el = obj.getElement ? obj.getElement() : obj._element;
        const naturalW = el?.naturalWidth || 0;
        const displayW = obj.getScaledWidth ? obj.getScaledWidth() : (obj.width || 0) * (obj.scaleX || 1);
        if (naturalW > 0 && displayW > 0) {
          const effectiveDpi = naturalW / (displayW / 96);
          if (effectiveDpi < settings.dpi * 0.85) {
            issues.push({
              severity: effectiveDpi < settings.dpi * 0.5 ? 'error' : 'warning',
              artboardName: ab.name,
              message: `Image "${obj.name || 'image'}" is ~${Math.round(effectiveDpi)} DPI at its current size (target ${settings.dpi} DPI).`,
            });
          }
        }
      }

      if (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') {
        const avgScale = ((obj.scaleX || 1) + (obj.scaleY || 1)) / 2;
        const effectivePt = (obj.fontSize || 0) * avgScale * PT_PER_PX;
        if (effectivePt > 0 && effectivePt < MIN_FONT_PT) {
          issues.push({
            severity: 'warning',
            artboardName: ab.name,
            message: `Text "${String(obj.text || '').slice(0, 24)}" is ${effectivePt.toFixed(1)}pt — likely too small for reliable print.`,
          });
        }
      }

      if (isPaintableStroke(obj)) {
        const avgScale = ((obj.scaleX || 1) + (obj.scaleY || 1)) / 2;
        const effectivePt = (obj.strokeWidth || 0) * avgScale * PT_PER_PX;
        if (effectivePt > 0 && effectivePt < MIN_STROKE_PT) {
          issues.push({
            severity: 'warning',
            artboardName: ab.name,
            message: `A stroke is ${effectivePt.toFixed(2)}pt — thinner than most presses print reliably (min ~${MIN_STROKE_PT}pt).`,
          });
        }
      }
    });
  });

  return issues;
}
