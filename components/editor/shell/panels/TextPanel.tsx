'use client';

import type { TextPreset } from '@/hooks/useEditorFeatures';
import { TEXT_BASICS, TEXT_STYLES, FONT_PAIRINGS } from '@/lib/editor/catalog';
import { gradientCss } from '@/lib/editor/gradients';
import { PanelSection } from '../ui';

function previewStyle(p: TextPreset): React.CSSProperties {
  const fx = p.fx || {};
  const s: React.CSSProperties = {
    fontFamily: `"${p.fontFamily}", system-ui`,
    fontWeight: (p.fontWeight as any) ?? 400,
    fontStyle: p.fontStyle ?? 'normal',
    letterSpacing: p.charSpacing ? `${p.charSpacing / 1000}em` : undefined,
    color: p.fill || '#09090B',
    lineHeight: 1.05,
  };
  if (p.gradient) {
    s.backgroundImage = gradientCss(p.gradient);
    s.WebkitBackgroundClip = 'text';
    s.backgroundClip = 'text';
    s.color = 'transparent';
  }
  if (fx.effect === 'neon' || fx.effect === 'glow') s.textShadow = `0 0 10px ${fx.color}, 0 0 20px ${fx.color}`;
  if (fx.effect === 'echo') s.textShadow = `4px 4px 0 ${fx.color}`;
  if (fx.effect === 'lift') s.textShadow = '0 6px 12px rgba(0,0,0,0.3)';
  if (fx.effect === 'outline' || fx.effect === 'hollow') {
    (s as any).WebkitTextStroke = `2px ${fx.color}`;
    if (fx.effect === 'hollow') s.color = 'transparent';
  }
  if (fx.effect === 'highlight') s.background = `${fx.color}99`;
  return s;
}

export function TextPanel({ onAdd, onAddPairing, onAddPageNumber }: { onAdd: (p: TextPreset) => void; onAddPairing: (heading: string, body: string) => void; onAddPageNumber: () => void }) {
  const drag = (id: string) => (e: React.DragEvent) => e.dataTransfer.setData('application/x-mt-asset', `text:${id}`);
  return (
    <div>
      <div className="flex flex-col gap-2 mb-5">
        {TEXT_BASICS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onAdd(p)}
            draggable
            onDragStart={drag(p.id)}
            className="w-full text-left rounded-xl border border-mt-border hover:border-[#B9E2FF] hover:bg-mt-accentsoft px-4 py-3 transition-colors text-mt-ink"
            style={{ fontFamily: `"${p.fontFamily}", system-ui`, fontWeight: (p.fontWeight as any) ?? 400, fontSize: i === 0 ? 24 : i === 1 ? 17 : 13 }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onAddPageNumber}
        title="Adds a number that always matches the page it's on"
        className="w-full mb-5 h-10 rounded-xl border border-dashed border-mt-border text-sm text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"
      >
        # Add page number
      </button>
      <PanelSection title="Text styles">
        <div className="grid grid-cols-2 gap-2">
          {TEXT_STYLES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onAdd(p)}
              draggable
              onDragStart={drag(p.id)}
              title={`Add “${p.label}”`}
              className="h-20 rounded-xl bg-mt-surface2 hover:ring-2 hover:ring-[#8CCBFF] flex items-center justify-center overflow-hidden px-2 transition-shadow"
              style={{ background: p.id === 'glow' || p.id === 'neon' ? '#0B1020' : undefined }}
            >
              <span className="truncate" style={{ ...previewStyle(p), fontSize: Math.min(28, 900 / Math.max(6, p.text.length * 4)) }}>
                {p.text}
              </span>
            </button>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Font pairings">
        <div className="flex flex-col gap-2">
          {FONT_PAIRINGS.map((f) => (
            <button
              key={f.heading + f.body}
              type="button"
              onClick={() => onAddPairing(f.heading, f.body)}
              className="text-left rounded-xl border border-mt-border hover:border-[#B9E2FF] hover:bg-mt-accentsoft px-3 py-2.5 transition-colors"
              title="Adds a heading and body text in these fonts"
            >
              <span className="block text-lg text-mt-ink leading-tight" style={{ fontFamily: `"${f.heading}", serif` }}>
                {f.mood} heading
              </span>
              <span className="block text-xs text-mt-muted" style={{ fontFamily: `"${f.body}", sans-serif` }}>
                {f.heading} with {f.body}
              </span>
            </button>
          ))}
        </div>
      </PanelSection>
    </div>
  );
}
