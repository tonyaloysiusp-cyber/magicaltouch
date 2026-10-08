'use client';

import { useRef } from 'react';
import { ImagePlus, Ban } from 'lucide-react';
import { BACKGROUND_COLORS, BACKGROUND_GRADIENTS, BACKGROUND_PATTERNS } from '@/lib/editor/catalog';
import { GradientSpec, gradientCss } from '@/lib/editor/gradients';
import { ColorPicker } from '../ColorPicker';
import { PanelSection } from '../ui';

export function BackgroundPanel({
  current,
  brandColors,
  documentColors,
  onSet,
  onPickFromCanvas,
}: {
  current: string | GradientSpec | null;
  brandColors: string[];
  documentColors: string[];
  onSet: (bg: { color?: string | null; gradient?: GradientSpec; imageUrl?: string; pattern?: string }, commit?: boolean) => void;
  onPickFromCanvas?: (cb: (hex: string) => void) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <PanelSection title="Colours">
        <div className="grid grid-cols-8 gap-1.5">
          <button
            type="button"
            onClick={() => onSet({ color: null })}
            title="Transparent"
            aria-label="Transparent background"
            className="aspect-square rounded-lg ring-1 ring-mt-border flex items-center justify-center text-mt-muted"
            style={{ background: 'repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 50% / 10px 10px' }}
          >
            <Ban size={14} />
          </button>
          {BACKGROUND_COLORS.map((c) => (
            <button key={c} type="button" title={c} aria-label={`Background ${c}`} onClick={() => onSet({ color: c })} className="aspect-square rounded-lg ring-1 ring-black/10 hover:scale-105 transition-transform" style={{ background: c }} />
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Gradients">
        <div className="grid grid-cols-5 gap-1.5">
          {BACKGROUND_GRADIENTS.map((g) => (
            <button key={g.id} type="button" title={g.label} aria-label={g.label} onClick={() => onSet({ gradient: g.spec })} className="aspect-square rounded-lg ring-1 ring-black/10 hover:scale-105 transition-transform" style={{ background: gradientCss(g.spec) }} />
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Patterns">
        <div className="grid grid-cols-4 gap-1.5">
          {BACKGROUND_PATTERNS.map((p) => (
            <button key={p.id} type="button" title={p.label} aria-label={`${p.label} pattern`} onClick={() => onSet({ pattern: p.url })} className="aspect-square rounded-lg ring-1 ring-black/10 hover:scale-105 transition-transform" style={{ backgroundImage: `url("${p.url}")`, backgroundSize: '24px 24px' }} />
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Photo background">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-mt-border hover:bg-mt-surface2 text-sm font-medium text-mt-ink"
        >
          <ImagePlus size={16} /> Use a photo as the background
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const r = new FileReader();
            r.onload = () => onSet({ imageUrl: String(r.result) });
            r.readAsDataURL(f);
          }}
        />
      </PanelSection>
      <PanelSection title="Custom">
        <ColorPicker
          value={current}
          allowGradient
          brandColors={brandColors}
          documentColors={documentColors}
          onPickFromCanvas={onPickFromCanvas}
          onChange={(v, commit) => {
            if (v && typeof v === 'object') onSet({ gradient: v }, commit);
            else onSet({ color: v }, commit);
          }}
        />
      </PanelSection>
    </div>
  );
}
