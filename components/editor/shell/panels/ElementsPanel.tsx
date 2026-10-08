'use client';

import { useMemo, useState } from 'react';
import { SHAPES, ShapeKind, shapePathD } from '@/lib/editor/shapePaths';
import { FRAME_KINDS, STICKER_SETS, ELEMENT_KEYWORDS } from '@/lib/editor/catalog';
import type { FrameKind } from '@/lib/editor/frames';
import { PanelSection, SearchField } from '../ui';

function ShapePreview({ kind, stroked, frame }: { kind: ShapeKind; stroked?: boolean; frame?: boolean }) {
  const w = 56;
  const h = stroked ? 20 : 56;
  const d = shapePathD(kind, w, h);
  return (
    <svg viewBox={`-3 -3 ${w + 6} ${h + 6}`} className="w-full h-full" aria-hidden>
      {frame ? (
        <>
          <defs>
            <linearGradient id={`fr-${kind}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#E8F5FF" />
              <stop offset="1" stopColor="#FCE9EE" />
            </linearGradient>
          </defs>
          <path d={d} fill={`url(#fr-${kind})`} stroke="#A1A1AA" strokeDasharray="3 3" strokeWidth="1.2" />
          <path d={`M ${w * 0.32} ${h * 0.64} L ${w * 0.44} ${h * 0.48} L ${w * 0.54} ${h * 0.58} L ${w * 0.62} ${h * 0.5} L ${w * 0.72} ${h * 0.64} Z`} fill="#A1A1AA" />
        </>
      ) : stroked ? (
        <path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={d} className="fill-[#8CCBFF]" />
      )}
    </svg>
  );
}

export function ElementsPanel({
  onAddShape,
  onAddFrame,
  onAddSticker,
}: {
  onAddShape: (kind: ShapeKind) => void;
  onAddFrame: (kind: FrameKind) => void;
  onAddSticker: (emoji: string) => void;
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shapes = useMemo(
    () => SHAPES.filter((s) => !needle || `${s.label} ${ELEMENT_KEYWORDS[s.kind] || ''}`.toLowerCase().includes(needle)),
    [needle]
  );
  const frames = useMemo(() => FRAME_KINDS.filter((f) => !needle || `${f.label} frame photo picture`.toLowerCase().includes(needle)), [needle]);
  const stickers = useMemo(
    () =>
      STICKER_SETS.map((set) => ({
        ...set,
        items: !needle || set.title.toLowerCase().includes(needle) || 'sticker emoji'.includes(needle) ? set.items : [],
      })).filter((s) => s.items.length),
    [needle]
  );
  const filled = shapes.filter((s) => !s.stroked);
  const lines = shapes.filter((s) => s.stroked);

  const tile = 'aspect-square rounded-xl bg-mt-surface2 hover:bg-mt-accentsoft border border-transparent hover:border-[#B9E2FF] p-2.5 text-mt-ink transition-colors';
  const drag = (asset: string) => (e: React.DragEvent) => e.dataTransfer.setData('application/x-mt-asset', asset);

  return (
    <div>
      <SearchField value={q} onChange={setQ} placeholder="Search shapes, frames, stickers" />
      <div className="mt-4" />
      {frames.length > 0 && (
        <PanelSection title="Photo frames">
          <p className="text-[11px] text-mt-faint -mt-1 mb-2">Add a frame, then drop a photo into it.</p>
          <div className="grid grid-cols-4 gap-2">
            {frames.map((f) => (
              <button key={f.kind} type="button" title={`${f.label} frame`} onClick={() => onAddFrame(f.kind)} draggable onDragStart={drag(`frame:${f.kind}`)} className={tile}>
                <ShapePreview kind={f.kind as ShapeKind} frame />
              </button>
            ))}
          </div>
        </PanelSection>
      )}
      {filled.length > 0 && (
        <PanelSection title="Shapes">
          <div className="grid grid-cols-4 gap-2">
            {filled.map((s) => (
              <button key={s.kind} type="button" title={s.label} onClick={() => onAddShape(s.kind)} draggable onDragStart={drag(`shape:${s.kind}`)} className={tile}>
                <ShapePreview kind={s.kind} />
              </button>
            ))}
          </div>
        </PanelSection>
      )}
      {lines.length > 0 && (
        <PanelSection title="Lines">
          <div className="grid grid-cols-4 gap-2">
            {lines.map((s) => (
              <button key={s.kind} type="button" title={s.label} onClick={() => onAddShape(s.kind)} draggable onDragStart={drag(`shape:${s.kind}`)} className={tile}>
                <ShapePreview kind={s.kind} stroked />
              </button>
            ))}
          </div>
        </PanelSection>
      )}
      {stickers.map((set) => (
        <PanelSection key={set.title} title={`Stickers · ${set.title}`}>
          <div className="grid grid-cols-6 gap-1.5">
            {set.items.map((e) => (
              <button
                key={e}
                type="button"
                title="Add sticker"
                onClick={() => onAddSticker(e)}
                draggable
                onDragStart={drag(`sticker:${e}`)}
                className="aspect-square rounded-lg hover:bg-mt-surface2 text-2xl leading-none flex items-center justify-center"
              >
                {e}
              </button>
            ))}
          </div>
        </PanelSection>
      ))}
      {!frames.length && !shapes.length && !stickers.length && <p className="text-sm text-mt-muted">Nothing matches “{q}”. Try “star”, “arrow” or “heart”.</p>}
    </div>
  );
}
