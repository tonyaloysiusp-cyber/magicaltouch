'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, RotateCcw, Scissors, Crop, FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import { Adjust, ADJUST_SLIDERS, DEFAULT_ADJUST, FILTER_PRESETS, autoEnhance, buildAdjustFilters } from '@/lib/editor/imageAdjust';
import { PanelSection, Slider, cx } from '../ui';

// Small previews of each look, rendered from the selected photo itself.
function usePresetThumbs(img: any) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    const F = (window as any).fabric;
    const el: any = img?._originalElement || img?.getElement?.();
    if (!F || !el) return;
    let cancelled = false;
    const run = async () => {
      const k = 120 / Math.max(el.naturalWidth || el.width || 1, el.naturalHeight || el.height || 1);
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((el.naturalWidth || el.width) * k));
      c.height = Math.max(1, Math.round((el.naturalHeight || el.height) * k));
      try {
        c.getContext('2d')!.drawImage(el, 0, 0, c.width, c.height);
      } catch {
        return;
      }
      const out: Record<string, string> = {};
      for (const p of FILTER_PRESETS) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 0));
        try {
          const small = new F.Image(c);
          small.filters = buildAdjustFilters(F, { ...DEFAULT_ADJUST, ...p.adjust });
          small.applyFilters();
          out[p.id] = small.toDataURL({ format: 'jpeg', quality: 0.8 });
        } catch {
          // A photo from another site that can't be read back: no preview.
        }
      }
      if (!cancelled) setThumbs(out);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [img]);
  return thumbs;
}

export function AdjustPanel({
  img,
  value,
  onChange,
  onRemoveBackground,
  onCrop,
  onFlip,
}: {
  img: any;
  value: Adjust;
  onChange: (a: Adjust, commit: boolean) => void;
  onRemoveBackground: () => void;
  onCrop: () => void;
  onFlip: (axis: 'x' | 'y') => void;
}) {
  const thumbs = usePresetThumbs(img);
  const [preset, setPreset] = useState<string | null>(null);
  const pending = useRef<number | null>(null);
  // Live preview is throttled to one update per frame.
  const live = (a: Adjust) => {
    if (pending.current) cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => onChange(a, false));
  };

  if (!img) return <p className="text-sm text-mt-muted">Select a photo to adjust it.</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button type="button" onClick={() => onChange({ ...value, ...autoEnhance(img) }, true)} className="h-10 rounded-xl mt-spectrum-border text-sm font-semibold text-mt-ink inline-flex items-center justify-center gap-1.5" title="Gentle automatic fixes for light and colour">
          <Sparkles size={15} /> Enhance
        </button>
        <button type="button" onClick={onRemoveBackground} className="h-10 rounded-xl mt-spectrum-border text-sm font-semibold text-mt-ink inline-flex items-center justify-center gap-1.5" title="Automatically remove the background from your image">
          <Scissors size={15} /> Remove BG
        </button>
        <button type="button" onClick={onCrop} className="h-10 rounded-xl border border-mt-border text-sm font-medium text-mt-ink inline-flex items-center justify-center gap-1.5 hover:bg-mt-surface2">
          <Crop size={15} /> Crop
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => onFlip('x')} title="Flip horizontally" aria-label="Flip horizontally" className="flex-1 h-10 rounded-xl border border-mt-border text-mt-ink inline-flex items-center justify-center hover:bg-mt-surface2">
            <FlipHorizontal2 size={16} />
          </button>
          <button type="button" onClick={() => onFlip('y')} title="Flip vertically" aria-label="Flip vertically" className="flex-1 h-10 rounded-xl border border-mt-border text-mt-ink inline-flex items-center justify-center hover:bg-mt-surface2">
            <FlipVertical2 size={16} />
          </button>
        </div>
      </div>
      <PanelSection title="Filters">
        <div className="grid grid-cols-3 gap-2">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                onChange({ ...DEFAULT_ADJUST, ...p.adjust }, true);
              }}
              className={cx('rounded-xl overflow-hidden ring-1 text-left', preset === p.id ? 'ring-2 ring-[#3B82C4]' : 'ring-mt-border hover:ring-[#8CCBFF]')}
            >
              <span className="block aspect-square bg-mt-surface2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumbs[p.id] && <img src={thumbs[p.id]} alt="" className="w-full h-full object-cover" />}
              </span>
              <span className="block px-1.5 py-1 text-[11px] text-mt-ink truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </PanelSection>
      <PanelSection
        title="Adjust"
        action={
          <button type="button" onClick={() => onChange(DEFAULT_ADJUST, true)} className="inline-flex items-center gap-1 text-xs text-mt-muted hover:text-mt-ink">
            <RotateCcw size={12} /> Reset
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {ADJUST_SLIDERS.map((s) => (
            <Slider
              key={s.key}
              label={s.label}
              value={value[s.key] as number}
              min={s.min}
              max={s.max}
              onChange={(v) => live({ ...value, [s.key]: v })}
              onCommit={(v) => onChange({ ...value, [s.key]: v }, true)}
            />
          ))}
          <div className="flex gap-2">
            {(['grayscale', 'sepia'] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={value[k]}
                onClick={() => onChange({ ...value, [k]: !value[k] }, true)}
                className={cx('flex-1 h-9 rounded-lg border text-xs font-medium', value[k] ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted')}
              >
                {k === 'grayscale' ? 'Black & white' : 'Sepia'}
              </button>
            ))}
          </div>
        </div>
      </PanelSection>
    </div>
  );
}
