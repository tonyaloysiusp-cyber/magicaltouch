'use client';

import { Brush, Highlighter, Pencil, Eraser, PenTool, MousePointer2, Spline, Check } from 'lucide-react';
import { BrushKind, BrushSettings, BRUSH_KINDS } from '@/lib/editor/brush';
import { DEFAULT_SWATCHES } from '../ColorPicker';
import { PanelSection, Slider, cx } from '../ui';

const ICONS: Record<BrushKind, React.ReactNode> = {
  brush: <Brush size={18} />,
  marker: <PenTool size={18} />,
  highlighter: <Highlighter size={18} />,
  pencil: <Pencil size={18} />,
  eraser: <Eraser size={18} />,
};

export function DrawPanel({
  drawing,
  settings,
  onChange,
  onStart,
  onStop,
  pro,
  onVectorTool,
  vectorTool,
}: {
  drawing: boolean;
  settings: BrushSettings;
  onChange: (s: BrushSettings) => void;
  onStart: (kind: BrushKind) => void;
  onStop: () => void;
  pro: boolean;
  onVectorTool: (t: 'pen' | 'direct' | 'select') => void;
  vectorTool: string;
}) {
  return (
    <div>
      <PanelSection title="Draw">
        <div className="grid grid-cols-5 gap-1.5">
          {BRUSH_KINDS.map((b) => (
            <button
              key={b.id}
              type="button"
              title={b.hint}
              aria-pressed={drawing && settings.kind === b.id}
              onClick={() => (drawing && settings.kind === b.id ? onStop() : onStart(b.id))}
              className={cx(
                'flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium transition-colors',
                drawing && settings.kind === b.id ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'
              )}
            >
              {ICONS[b.id]}
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-mt-faint mt-2">
          {drawing
            ? settings.kind === 'eraser'
              ? 'Rub over drawn strokes to erase them.'
              : 'Draw on the page. With Apple Pencil or a stylus, press harder for thicker lines.'
            : 'Pick a tool and draw straight onto your page.'}
        </p>
      </PanelSection>
      {settings.kind !== 'eraser' && (
        <PanelSection title="Colour">
          <div className="grid grid-cols-10 gap-1.5">
            {DEFAULT_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => onChange({ ...settings, color: c })}
                className={cx('aspect-square rounded-full ring-1 ring-black/10', settings.color.toUpperCase() === c && 'ring-2 ring-[#3B82C4] ring-offset-1 ring-offset-mt-surface')}
                style={{ background: c }}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-mt-muted">
            Custom
            <input type="color" value={settings.color} onChange={(e) => onChange({ ...settings, color: e.target.value })} className="h-7 w-10 rounded border border-mt-border bg-transparent" />
          </label>
        </PanelSection>
      )}
      <PanelSection title="Brush">
        <div className="flex flex-col gap-3">
          <Slider label="Size" value={settings.size} min={1} max={120} onChange={(v) => onChange({ ...settings, size: v })} suffix=" px" />
          {settings.kind !== 'eraser' && (
            <Slider label="Opacity" value={Math.round(settings.opacity * 100)} min={5} max={100} onChange={(v) => onChange({ ...settings, opacity: v / 100 })} suffix="%" />
          )}
          <Slider label="Smoothing" value={Math.round(settings.smoothing * 100)} min={0} max={100} onChange={(v) => onChange({ ...settings, smoothing: v / 100 })} suffix="%" />
        </div>
      </PanelSection>
      {drawing && (
        <button type="button" onClick={onStop} className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center justify-center gap-2">
          <Check size={16} /> Done drawing
        </button>
      )}
      {pro && (
        <PanelSection title="Vector tools">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'pen', label: 'Pen', icon: <PenTool size={16} />, hint: 'Create editable vector paths: click for corners, drag for curves' },
              { id: 'direct', label: 'Edit points', icon: <Spline size={16} />, hint: 'Move, add and delete the points of a path' },
              { id: 'select', label: 'Select', icon: <MousePointer2 size={16} />, hint: 'Select and move objects' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.hint}
                onClick={() => onVectorTool(t.id as any)}
                className={cx('flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium', vectorTool === t.id ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink')}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </PanelSection>
      )}
    </div>
  );
}
