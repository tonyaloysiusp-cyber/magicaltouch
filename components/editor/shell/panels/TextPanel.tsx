'use client';

import { useState } from 'react';
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

export function TextPanel({ onAdd, onAddPairing, onAddPageNumber, onAddArticle }: { onAdd: (p: TextPreset) => void; onAddPairing: (heading: string, body: string) => void; onAddPageNumber: (format?: string, everyPage?: boolean) => void; onAddArticle?: (columns: number) => void }) {
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
      <PageNumbers onAdd={onAddPageNumber} />
      {onAddArticle && (
        <PanelSection title="Articles & columns">
          <p className="text-xs text-mt-muted -mt-1 mb-2.5 leading-relaxed">A headline and a story that flows from column to column — and on to new pages.</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onAddArticle(n)}
                title={`Article in ${n} column${n > 1 ? 's' : ''}`}
                className="group rounded-xl border border-mt-border hover:border-[#8CCBFF] hover:bg-mt-accentsoft p-2 flex flex-col items-center gap-1.5 transition-colors"
              >
                <span aria-hidden className="w-full aspect-[3/4] rounded-md bg-mt-surface border border-mt-border p-1.5 flex flex-col gap-1">
                  <span className="h-1.5 w-3/4 rounded-full bg-mt-ink/70" />
                  <span className="flex-1 flex gap-1">
                    {Array.from({ length: n }).map((_, i) => (
                      <span key={i} className="flex-1 flex flex-col gap-[3px] pt-0.5">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <span key={j} className="h-[2px] rounded-full bg-mt-faint/60" style={{ width: j === 6 ? '60%' : '100%' }} />
                        ))}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="text-[11px] text-mt-muted group-hover:text-mt-ink">{n === 1 ? '1 column' : `${n} columns`}</span>
              </button>
            ))}
          </div>
        </PanelSection>
      )}
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

const PAGE_NUMBER_FORMATS = [
  { f: '{n}', label: '3' },
  { f: 'Page {n}', label: 'Page 3' },
  { f: '{n} / {total}', label: '3 / 12' },
  { f: 'Page {n} of {total}', label: 'Page 3 of 12' },
];

// Page numbers that always match their page (and the page count).
function PageNumbers({ onAdd }: { onAdd: (format?: string, everyPage?: boolean) => void }) {
  const [fmt, setFmt] = useState('{n}');
  return (
    <div className="mb-5 rounded-xl border border-dashed border-mt-border p-3">
      <p className="text-[13px] font-semibold text-mt-ink"># Page numbers</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Page number style">
        {PAGE_NUMBER_FORMATS.map((o) => (
          <button
            key={o.f}
            type="button"
            role="radio"
            aria-checked={fmt === o.f}
            onClick={() => setFmt(o.f)}
            className={`h-8 rounded-lg border text-xs tabular-nums ${fmt === o.f ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => onAdd(fmt, false)} className="h-9 rounded-lg border border-mt-border text-xs font-medium text-mt-ink hover:bg-mt-surface2">
          This page
        </button>
        <button type="button" onClick={() => onAdd(fmt, true)} className="h-9 rounded-lg bg-mt-primary text-mt-onprimary text-xs font-semibold">
          Every page
        </button>
      </div>
    </div>
  );
}
