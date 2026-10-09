'use client';

// Pro tool strip. The tool in use is always clearly marked (blue fill and
// a bar on its edge), and every tool says what it does and its shortcut.

import { useState } from 'react';
import {
  MousePointer2,
  Spline,
  Hand,
  Frame,
  PenTool,
  Pencil,
  Brush,
  Eraser,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  Hexagon,
  Star,
  ImagePlus,
  Combine,
  ChevronRight,
} from 'lucide-react';
import type { DrawTool } from '@/lib/editor/types';
import { cx } from './shell/ui';

// Everything the strip can show as "the tool in use".
export type StripTool = 'select' | 'direct' | 'pan' | 'artboard' | 'pen' | 'pencil' | 'brush' | 'eraser' | 'text' | DrawTool;

export const TOOL_INFO: Record<StripTool, { label: string; key?: string; hint: string }> = {
  select: { label: 'Select', key: 'V', hint: 'Select, move, resize and rotate' },
  direct: { label: 'Edit points', key: 'A', hint: 'Drag points to reshape · click a pink square to add a point · Alt-click a point to switch corner/smooth · Delete removes a point' },
  pan: { label: 'Hand', key: 'H', hint: 'Drag to move around the page (or hold Space with any tool)' },
  artboard: { label: 'Pages', key: 'Shift+O', hint: 'Drag on the pasteboard to draw a new page; drag pages to move them' },
  pen: { label: 'Pen', key: 'P', hint: 'Click for corners, drag for curves · click the first point to close · Enter or double-click to finish' },
  pencil: { label: 'Pencil', key: 'N', hint: 'Draw a freehand line that stays editable point by point' },
  brush: { label: 'Brush', key: 'B', hint: 'Paint on the page — press harder with a stylus for thicker lines' },
  eraser: { label: 'Eraser', key: 'E', hint: 'Rub over drawings, paths and shapes to erase them' },
  text: { label: 'Text', key: 'T', hint: 'Click where the text should go, then type' },
  rect: { label: 'Rectangle', key: 'M', hint: 'Drag to draw · Shift keeps it square · Alt draws from the centre' },
  ellipse: { label: 'Ellipse', key: 'L', hint: 'Drag to draw · Shift keeps it round · Alt draws from the centre' },
  triangle: { label: 'Triangle', key: 'Shift+T', hint: 'Drag to draw · Shift keeps the proportions' },
  polygon: { label: 'Polygon', key: 'Shift+G', hint: 'Drag to draw a hexagon · change the sides afterwards' },
  star: { label: 'Star', key: 'Shift+S', hint: 'Drag to draw · change the points afterwards' },
  line: { label: 'Line', key: '\\', hint: 'Drag to draw · Shift keeps it straight at 45° steps' },
};

const ICON: Record<StripTool, React.ReactNode> = {
  select: <MousePointer2 size={18} />,
  direct: <Spline size={18} />,
  pan: <Hand size={18} />,
  artboard: <Frame size={18} />,
  pen: <PenTool size={18} />,
  pencil: <Pencil size={18} />,
  brush: <Brush size={18} />,
  eraser: <Eraser size={18} />,
  text: <Type size={18} />,
  rect: <Square size={18} />,
  ellipse: <Circle size={18} />,
  triangle: <Triangle size={18} />,
  polygon: <Hexagon size={18} />,
  star: <Star size={18} />,
  line: <Minus size={18} />,
};

export const toolIcon = (t: StripTool) => ICON[t];

const SHAPES: DrawTool[] = ['rect', 'ellipse', 'triangle', 'polygon', 'star', 'line'];

interface Props {
  active: StripTool;
  onTool: (t: StripTool) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShapeBuilder: () => void;
  canShapeBuild: boolean;
}

function Btn({ id, active, onClick }: { id: StripTool; active: boolean; onClick: () => void }) {
  const info = TOOL_INFO[id];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${info.label}${info.key ? ` (${info.key})` : ''}`}
      title={`${info.label}${info.key ? ` — ${info.key}` : ''}\n${info.hint}`}
      className={cx(
        'relative w-11 h-11 rounded-xl inline-flex items-center justify-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]',
        active ? 'bg-[#3B82C4] border-[#3B82C4] text-white shadow-[0_6px_16px_-6px_rgba(59,130,196,0.7)]' : 'border-transparent text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'
      )}
    >
      {ICON[id]}
      {active && <span aria-hidden className="absolute -left-[7px] top-2 bottom-2 w-[3px] rounded-full bg-[#3B82C4]" />}
    </button>
  );
}

export function Toolbar({ active, onTool, onImageUpload, onShapeBuilder, canShapeBuild }: Props) {
  const [shape, setShape] = useState<DrawTool>('rect');
  const [shapesOpen, setShapesOpen] = useState(false);
  const shapeActive = (SHAPES as string[]).includes(active);
  const shownShape = shapeActive ? (active as DrawTool) : shape;
  const group = (ids: StripTool[]) => ids.map((id) => <Btn key={id} id={id} active={active === id} onClick={() => onTool(id)} />);
  const divider = <span aria-hidden className="w-7 h-px bg-mt-border my-1" />;

  return (
    <nav aria-label="Tools" className="w-[60px] shrink-0 bg-mt-surface border-r border-mt-border flex flex-col items-center py-2.5 gap-1 overflow-y-auto mt-scroll">
      {group(['select', 'direct'])}
      {divider}
      {group(['pen', 'pencil', 'brush', 'eraser'])}
      {divider}
      {group(['text'])}
      <div className="relative">
        <Btn id={shownShape} active={shapeActive} onClick={() => onTool(shownShape)} />
        <button
          type="button"
          onClick={() => setShapesOpen((v) => !v)}
          aria-label="More shape tools"
          aria-expanded={shapesOpen}
          className="absolute -right-1.5 bottom-0 h-4 w-4 rounded-full bg-mt-surface border border-mt-border text-mt-muted inline-flex items-center justify-center"
        >
          <ChevronRight size={10} />
        </button>
        {shapesOpen && (
          <div role="menu" className="absolute left-12 top-0 z-50 w-56 rounded-2xl border border-mt-border bg-mt-surface shadow-xl p-1.5">
            {SHAPES.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitem"
                onClick={() => {
                  setShape(s);
                  setShapesOpen(false);
                  onTool(s);
                }}
                className={cx('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm', active === s ? 'mt-active-blue' : 'hover:bg-mt-surface2')}
              >
                <span className="text-mt-muted">{ICON[s]}</span>
                <span className="flex-1 text-left text-mt-ink">{TOOL_INFO[s].label}</span>
                <span className="text-[11px] text-mt-faint">{TOOL_INFO[s].key}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <label title="Add a photo from this device" aria-label="Add a photo" className="w-11 h-11 rounded-xl inline-flex items-center justify-center text-mt-muted hover:text-mt-ink hover:bg-mt-surface2 cursor-pointer">
        <ImagePlus size={18} />
        <input type="file" accept="image/*" multiple onChange={onImageUpload} className="hidden" />
      </label>
      {divider}
      {group(['pan', 'artboard'])}
      {divider}
      <button
        type="button"
        onClick={onShapeBuilder}
        disabled={!canShapeBuild}
        title={'Shape builder\nSelect two or more shapes to unite, subtract, intersect or exclude them'}
        aria-label="Shape builder"
        className="w-11 h-11 rounded-xl inline-flex items-center justify-center text-mt-muted hover:text-mt-ink hover:bg-mt-surface2 disabled:opacity-35"
      >
        <Combine size={18} />
      </button>
    </nav>
  );
}

// The floating chip under the page that says which tool is in use, what
// to do with it, and how to get back to selecting.
export function ToolChip({ tool, onDone, extra }: { tool: StripTool; onDone: () => void; extra?: React.ReactNode }) {
  const info = TOOL_INFO[tool];
  return (
    <div role="status" aria-live="polite" className="pointer-events-auto max-w-full flex items-center gap-2.5 rounded-2xl border border-mt-border bg-mt-surface/95 backdrop-blur px-2 py-1.5 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.3)]">
      <span className="shrink-0 w-8 h-8 rounded-lg bg-[#3B82C4] text-white inline-flex items-center justify-center">{ICON[tool]}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-mt-ink leading-tight">
          {info.label}
          {info.key && <span className="ml-1.5 text-[11px] font-normal text-mt-faint">{info.key}</span>}
        </span>
        <span className="block text-[11px] text-mt-muted leading-snug truncate max-w-[52ch]">{info.hint}</span>
      </span>
      {extra}
      <button type="button" onClick={onDone} className="shrink-0 h-8 px-3 rounded-lg bg-mt-primary text-mt-onprimary text-xs font-semibold" title="Back to selecting (Esc)">
        Done
      </button>
    </div>
  );
}
