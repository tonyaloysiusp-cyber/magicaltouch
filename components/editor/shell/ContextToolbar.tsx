'use client';

// The toolbar above the page that shows only the tools for what's
// selected: text, photo, shape, several objects — or the page itself.

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
  Sparkles,
  Newspaper,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Layers as LayersIcon,
  Replace,
  Crop,
  SlidersHorizontal,
  Scissors,
  Shapes,
  Group,
  Ungroup,
  Droplet,
  Square as SquareRound,
  Spline,
  FlipHorizontal2,
  FlipVertical2,
  CaseSensitive,
  ImageMinus,
  BringToFront,
  SendToBack,
  ArrowUp,
  ArrowDown,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Check,
  X,
  RotateCcw,
  Maximize2,
  Frame as FrameIcon,
  Sun,
  Wand2,
} from 'lucide-react';
import { FontPicker } from '../FontPicker';
import { ColorPicker, ColorChip } from './ColorPicker';
import { TextEffectsEditor } from './TextEffectsEditor';
import { Divider, IconButton, Popover, Slider, ToolButton, cx } from './ui';
import { fromFabricGradient, GradientSpec } from '@/lib/editor/gradients';
import { readTextFx, TextFx } from '@/lib/editor/textEffects';
import { googleFontByName, WEIGHT_NAMES } from '@/lib/editor/googleFonts';
import { FRAME_KINDS } from '@/lib/editor/catalog';
import { shapePathD, ShapeKind } from '@/lib/editor/shapePaths';
import type { FrameKind } from '@/lib/editor/frames';
import { isFramed } from '@/lib/editor/frames';

type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

export interface ToolbarActions {
  applyProp: (p: Record<string, any>, record?: boolean) => void;
  applyCharProp: (p: Record<string, any>, record?: boolean) => void;
  getTextPropValue: (o: any, prop: string) => { value: any; mixed: boolean };
  setFill: (v: string | GradientSpec | null, record?: boolean) => void;
  setStroke: (p: { stroke?: string | null; strokeWidth?: number; dash?: 'solid' | 'dashed' | 'dotted' }) => void;
  setShadow: (s: { color: string; blur: number; x: number; y: number } | null, record?: boolean) => void;
  setCornerRadius: (r: number, record?: boolean) => void;
  setShapeParams: (p: any, record?: boolean) => void;
  setTextFx: (fx: TextFx, record?: boolean) => void;
  setOpacity: (v: number, record?: boolean) => void;
  flip: (axis: 'x' | 'y') => void;
  replaceImage: () => void;
  startCrop: () => void;
  openAdjust: () => void;
  removeBackground: () => void;
  editPhoto?: () => void;
  maskWithShape: (k: FrameKind) => void;
  detachFromFrame: () => void;
  placeInShape: () => void;
  combineShapes: (op: 'union' | 'subtract' | 'intersect' | 'exclude') => void;
  duplicate: () => void;
  remove: () => void;
  toggleLock: () => void;
  group: () => void;
  ungroup: () => void;
  align: (m: AlignMode, rel?: 'auto' | 'page' | 'selection') => void;
  distribute: (axis: 'h' | 'v') => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  pageBackground: () => string | GradientSpec | null;
  setPageBackground: (v: string | GradientSpec | null, commit: boolean) => void;
  openResize: () => void;
  pickFromCanvas: (cb: (hex: string) => void) => void;
  frame: { make: () => void; columns: (n: number) => void; addLinked: () => void; unlink: () => void; setHeight: (h: number) => void };
}

const isTextObj = (o: any) => o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');

function FillValue(o: any): string | GradientSpec | null {
  if (!o) return null;
  if (o.fill && typeof o.fill === 'object' && o.fill.colorStops) return fromFabricGradient(o.fill);
  return typeof o.fill === 'string' && o.fill ? o.fill : null;
}

function firstChildFill(o: any): string | GradientSpec | null {
  if (!o) return null;
  if (o.getObjects) {
    const kids = o.getObjects();
    for (const k of kids) {
      const v = firstChildFill(k);
      if (v) return v;
    }
    return null;
  }
  return FillValue(o);
}

export function ContextToolbar({
  sel,
  a,
  brandColors,
  documentColors,
  cropping,
  onCropRatio,
  onCropReset,
  onCropDone,
  onSmartCrop,
  cropAspect,
  cropZoom = 1,
  cropStraighten = 0,
  onCropZoom,
  onCropStraighten,
  pro,
}: {
  sel: any;
  a: ToolbarActions;
  brandColors: string[];
  documentColors: string[];
  cropping: boolean;
  cropAspect: number | null;
  onCropRatio: (r: number | null) => void;
  onCropReset: () => void;
  onCropDone: (apply: boolean) => void;
  onSmartCrop?: () => void;
  cropZoom?: number;
  cropStraighten?: number;
  onCropZoom?: (z: number) => void;
  onCropStraighten?: (deg: number) => void;
  pro: boolean;
}) {
  const wrap = (children: React.ReactNode) => (
    <div
      role="toolbar"
      aria-label="Tools for the selection"
      className="pointer-events-auto max-w-full flex items-center gap-0.5 overflow-x-auto mt-scroll rounded-2xl border border-mt-border bg-mt-surface/95 backdrop-blur px-1.5 py-1 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.25)]"
    >
      {children}
    </div>
  );

  const colorPopover = (label: string, value: any, onChange: (v: any, commit: boolean) => void, opts: { gradient?: boolean; none?: boolean } = {}) => (
    <Popover
      width={300}
      trigger={({ toggle, open }) => (
        <IconButton label={label} onClick={toggle} active={open}>
          <ColorChip value={value} label={label} size={22} />
        </IconButton>
      )}
    >
      <ColorPicker value={value} onChange={onChange} allowGradient={opts.gradient} allowNone={opts.none} brandColors={brandColors} documentColors={documentColors} onPickFromCanvas={a.pickFromCanvas} />
    </Popover>
  );

  const opacityPopover = (value: number) => (
    <Popover
      width={240}
      trigger={({ toggle, open }) => (
        <IconButton label="Transparency" hint="Make it see-through" onClick={toggle} active={open}>
          <Droplet size={17} />
        </IconButton>
      )}
    >
      <Slider label="Transparency" value={Math.round(value * 100)} min={0} max={100} suffix="%" onChange={(v) => a.setOpacity(v / 100, false)} onCommit={(v) => a.setOpacity(v / 100, true)} />
    </Popover>
  );

  const positionPopover = (multi: boolean, count: number) => (
    <Popover
      width={280}
      align="end"
      trigger={({ toggle, open }) => <ToolButton label="Position" hint="Layer order and alignment" icon={<LayersIcon size={16} />} onClick={toggle} active={open} />}
    >
      <p className="text-[13px] font-semibold mb-2">Layer order</p>
      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {[
          { l: 'Forward', i: <ArrowUp size={14} />, f: a.bringForward },
          { l: 'Backward', i: <ArrowDown size={14} />, f: a.sendBackward },
          { l: 'To front', i: <BringToFront size={14} />, f: a.bringToFront },
          { l: 'To back', i: <SendToBack size={14} />, f: a.sendToBack },
        ].map((b) => (
          <button key={b.l} type="button" onClick={b.f} className="h-9 rounded-lg border border-mt-border text-xs inline-flex items-center justify-center gap-1.5 hover:bg-mt-surface2">
            {b.i} {b.l}
          </button>
        ))}
      </div>
      <p className="text-[13px] font-semibold mb-2">{multi ? 'Align to each other' : 'Align to page'}</p>
      <div className="grid grid-cols-6 gap-1">
        {[
          ['left', <AlignStartVertical key="1" size={15} />, 'Left'],
          ['centerH', <AlignCenterVertical key="2" size={15} />, 'Centre'],
          ['right', <AlignEndVertical key="3" size={15} />, 'Right'],
          ['top', <AlignStartHorizontal key="4" size={15} />, 'Top'],
          ['centerV', <AlignCenterHorizontal key="5" size={15} />, 'Middle'],
          ['bottom', <AlignEndHorizontal key="6" size={15} />, 'Bottom'],
        ].map(([m, icon, l]) => (
          <IconButton key={m as string} label={`Align ${l}`} onClick={() => a.align(m as AlignMode, multi ? 'selection' : 'page')}>
            {icon}
          </IconButton>
        ))}
      </div>
      {multi && (
        <>
          <p className="text-[13px] font-semibold mt-3 mb-2">Align to page</p>
          <div className="grid grid-cols-6 gap-1">
            {(['left', 'centerH', 'right', 'top', 'centerV', 'bottom'] as AlignMode[]).map((m) => (
              <button key={m} type="button" onClick={() => a.align(m, 'page')} className="h-8 rounded-lg border border-mt-border text-[10px] text-mt-muted hover:bg-mt-surface2">
                {m === 'centerH' ? 'Ctr' : m === 'centerV' ? 'Mid' : m[0].toUpperCase() + m.slice(1, 3)}
              </button>
            ))}
          </div>
          <p className="text-[13px] font-semibold mt-3 mb-2">Space evenly</p>
          <div className="flex gap-1.5">
            <button type="button" disabled={count < 3} onClick={() => a.distribute('h')} className="flex-1 h-9 rounded-lg border border-mt-border text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-35">
              <AlignHorizontalSpaceAround size={14} /> Across
            </button>
            <button type="button" disabled={count < 3} onClick={() => a.distribute('v')} className="flex-1 h-9 rounded-lg border border-mt-border text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-35">
              <AlignVerticalSpaceAround size={14} /> Down
            </button>
          </div>
        </>
      )}
    </Popover>
  );

  // Drop shadow for shapes, photos, groups and several objects at once.
  // Sliders preview live and record one undo step when released.
  const shadowPopover = (o: any) => {
    const base = o.type === 'activeSelection' ? o.getObjects().find((x: any) => x.shadow)?.shadow || null : o.shadow;
    const cur = base ? { color: base.color || 'rgba(9,9,11,0.35)', blur: base.blur || 0, x: base.offsetX || 0, y: base.offsetY || 0 } : null;
    const set = (patch: Partial<{ color: string; blur: number; x: number; y: number }>, record: boolean) =>
      cur && a.setShadow({ ...cur, ...patch }, record);
    return (
      <Popover
        width={280}
        trigger={({ toggle, open }) => (
          <IconButton label="Shadow" hint="Add a soft drop shadow" onClick={toggle} active={open || !!cur}>
            <Sun size={16} />
          </IconButton>
        )}
      >
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-sm">
            Shadow
            <input
              type="checkbox"
              checked={!!cur}
              onChange={(e) => a.setShadow(e.target.checked ? { color: 'rgba(9,9,11,0.35)', blur: 18, x: 0, y: 10 } : null)}
              className="accent-[#3B82C4] w-4 h-4"
            />
          </label>
          {cur && (
            <>
              <Slider label="Blur" value={Math.round(cur.blur)} min={0} max={80} onChange={(v) => set({ blur: v }, false)} onCommit={(v) => set({ blur: v }, true)} />
              <Slider label="Distance" value={Math.round(cur.y)} min={-60} max={60} onChange={(v) => set({ y: v }, false)} onCommit={(v) => set({ y: v }, true)} />
              <Slider label="Sideways" value={Math.round(cur.x)} min={-60} max={60} onChange={(v) => set({ x: v }, false)} onCommit={(v) => set({ x: v }, true)} />
              <div>
                <p className="text-xs text-mt-muted mb-1">Colour</p>
                <ColorPicker value={cur.color} alpha onChange={(v, commit) => typeof v === 'string' && set({ color: v }, commit)} brandColors={brandColors} documentColors={documentColors} onPickFromCanvas={a.pickFromCanvas} />
              </div>
            </>
          )}
        </div>
      </Popover>
    );
  };

  const common = (o: any, multi = false, count = 1) => (
    <>
      <Divider />
      {positionPopover(multi, count)}
      {opacityPopover(o.opacity ?? 1)}
      <IconButton label={o.locked ? 'Unlock' : 'Lock'} hint="Stop it moving by accident" onClick={a.toggleLock} active={!!o.locked}>
        {o.locked ? <Lock size={16} /> : <Unlock size={16} />}
      </IconButton>
      <IconButton label="Duplicate" hint="Ctrl/Cmd+D" onClick={a.duplicate}>
        <Copy size={16} />
      </IconButton>
      <IconButton label="Delete" hint="Delete key" onClick={a.remove} tone="danger" disabled={!!o.locked}>
        <Trash2 size={16} />
      </IconButton>
    </>
  );

  // ---------------- crop mode ----------------
  if (cropping) {
    const ratios: [string, number | null][] = [
      ['Free', 0],
      ['Original', null],
      ['1:1', 1],
      ['4:5', 4 / 5],
      ['16:9', 16 / 9],
      ['9:16', 9 / 16],
      ['3:2', 3 / 2],
      ['2:3', 2 / 3],
    ];
    const isPreset = ratios.some(([, r]) => r !== null && r !== 0 && cropAspect !== null && Math.abs((cropAspect || 0) - r) < 1e-6);
    return wrap(
      <>
        <span className="px-2 text-[13px] font-semibold whitespace-nowrap">Crop</span>
        {ratios.map(([l, r]) => (
          <button
            key={l}
            type="button"
            onClick={() => onCropRatio(r)}
            className={cx(
              'h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap border',
              (r === 0 && (cropAspect === 0 || cropAspect === null)) || (r !== null && r !== 0 && cropAspect !== null && Math.abs(cropAspect - r) < 1e-6) ? 'mt-active-blue text-mt-ink' : 'border-transparent text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'
            )}
            title={r === 0 ? 'Drag the frame’s edges and corners freely' : r === null ? 'The photo’s own shape' : `Crop to ${l}`}
          >
            {l}
          </button>
        ))}
        <Popover
          width={230}
          trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} className={cx('h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap border', open || (cropAspect && !isPreset) ? 'mt-active-blue text-mt-ink' : 'border-transparent text-mt-muted hover:text-mt-ink hover:bg-mt-surface2')}>
              Custom…
            </button>
          )}
        >
          {(close) => (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const w = parseFloat(String(f.get('w')));
                const h = parseFloat(String(f.get('h')));
                if (w > 0 && h > 0) {
                  onCropRatio(w / h);
                  close();
                }
              }}
            >
              <label className="flex-1 text-xs text-mt-muted">
                Width
                <input name="w" inputMode="decimal" defaultValue="5" className="mt-1 w-full h-8 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-sm text-mt-ink" />
              </label>
              <span className="pb-2 text-mt-muted">:</span>
              <label className="flex-1 text-xs text-mt-muted">
                Height
                <input name="h" inputMode="decimal" defaultValue="7" className="mt-1 w-full h-8 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-sm text-mt-ink" />
              </label>
              <button type="submit" className="h-8 px-3 rounded-lg bg-mt-primary text-mt-onprimary text-xs font-semibold">
                Set
              </button>
            </form>
          )}
        </Popover>
        <Divider />
        <Popover
          width={260}
          trigger={({ toggle, open }) => <ToolButton label="Zoom & straighten" hint="Zoom the photo in its frame, or level it" icon={<RotateCcw size={15} />} onClick={toggle} active={open} />}
        >
          <div className="flex flex-col gap-3">
            <Slider label="Zoom" value={Math.round(cropZoom * 100)} min={100} max={400} suffix="%" onChange={(v) => onCropZoom?.(v / 100)} />
            <Slider label="Straighten" value={cropStraighten} min={-45} max={45} suffix="°" onChange={(v) => onCropStraighten?.(v)} />
            <p className="text-[11px] text-mt-faint">Drag the photo to move it inside the frame. Drag the frame’s corners or edges to change the crop.</p>
          </div>
        </Popover>
        {onSmartCrop && (
          <button type="button" onClick={onSmartCrop} title="Find the subject and centre it" className="h-8 px-2.5 rounded-lg text-xs font-semibold mt-spectrum-border inline-flex items-center gap-1 whitespace-nowrap">
            <Sparkles size={13} /> Smart
          </button>
        )}
        <button type="button" onClick={onCropReset} title="Show the whole photo again" className="h-8 px-2.5 rounded-lg text-xs font-medium text-mt-muted hover:text-mt-ink hover:bg-mt-surface2 whitespace-nowrap">
          Reset
        </button>
        <button type="button" onClick={() => onCropDone(false)} title="Cancel (Esc)" className="h-8 px-3 rounded-lg text-xs font-medium text-mt-muted hover:text-mt-ink inline-flex items-center gap-1">
          <X size={14} /> Cancel
        </button>
        <button type="button" onClick={() => onCropDone(true)} className="h-8 px-3 rounded-lg text-xs font-semibold bg-mt-primary text-mt-onprimary inline-flex items-center gap-1">
          <Check size={14} /> Done
        </button>
      </>
    );
  }

  // ---------------- nothing selected: the page ----------------
  if (!sel) {
    const bg = a.pageBackground();
    return wrap(
      <>
        <span className="px-2 text-[13px] font-semibold text-mt-muted whitespace-nowrap">Page</span>
        <Popover
          width={300}
          trigger={({ toggle, open }) => (
            <ToolButton label="Background" hint="Page colour, gradient or picture" icon={<ColorChip value={bg} label="Page background" size={18} />} onClick={toggle} active={open} />
          )}
        >
          <ColorPicker value={bg} allowGradient allowNone brandColors={brandColors} documentColors={documentColors} onPickFromCanvas={a.pickFromCanvas} onChange={(v, commit) => a.setPageBackground(v as any, commit)} />
        </Popover>
        <ToolButton label="Resize" hint="Change this design to another size" icon={<Maximize2 size={16} />} onClick={a.openResize} />
      </>
    );
  }

  // ---------------- several objects ----------------
  if (sel.type === 'activeSelection') {
    const objs = sel.getObjects();
    const imgs = objs.filter((o: any) => o.type === 'image');
    const shapes = objs.filter((o: any) => o.type !== 'image' && !isTextObj(o) && o.type !== 'group');
    return wrap(
      <>
        <span className="px-2 text-[13px] font-semibold text-mt-muted whitespace-nowrap">{objs.length} selected</span>
        <ToolButton label="Group" hint="Ctrl/Cmd+G" icon={<Group size={16} />} onClick={a.group} />
        {imgs.length === 1 && shapes.length === 1 && objs.length === 2 && (
          <ToolButton label="Place photo in shape" hint="Clip the photo to the shape" icon={<FrameIcon size={16} />} onClick={a.placeInShape} special />
        )}
        {shapes.length >= 2 && shapes.length === objs.length && (
          <Popover
            width={240}
            trigger={({ toggle, open }) => <ToolButton label="Combine" hint="Unite, subtract, intersect or exclude shapes" icon={<Shapes size={16} />} onClick={toggle} active={open} />}
          >
            {(close) => (
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['union', 'Unite'],
                    ['subtract', 'Subtract'],
                    ['intersect', 'Intersect'],
                    ['exclude', 'Exclude'],
                  ] as const
                ).map(([op, label]) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      close();
                      a.combineShapes(op);
                    }}
                    className="h-9 rounded-lg border border-mt-border text-sm hover:bg-mt-surface2"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </Popover>
        )}
        {colorPopover('Colour', firstChildFill(sel), (v, commit) => a.setFill(v, commit), { gradient: true })}
        {shadowPopover(sel)}
        {common(sel, true, objs.length)}
      </>
    );
  }

  // ---------------- text ----------------
  if (isTextObj(sel)) {
    const font = a.getTextPropValue(sel, 'fontFamily');
    const size = a.getTextPropValue(sel, 'fontSize');
    const weight = a.getTextPropValue(sel, 'fontWeight');
    const style = a.getTextPropValue(sel, 'fontStyle');
    const under = a.getTextPropValue(sel, 'underline');
    const strike = a.getTextPropValue(sel, 'linethrough');
    const isBold = !weight.mixed && (weight.value === 'bold' || weight.value >= 600);
    const weightNum = weight.value === 'bold' ? 700 : weight.value === 'normal' || weight.value == null ? 400 : Number(weight.value) || 400;
    const fontDef = !font.mixed && font.value ? googleFontByName(font.value) : undefined;
    const weights: number[] = fontDef?.weights?.length ? fontDef.weights : [];
    const isItalic = !style.mixed && style.value === 'italic';
    const fx = readTextFx(sel);
    const alignIcons: Record<string, React.ReactNode> = {
      left: <AlignLeft size={16} />,
      center: <AlignCenter size={16} />,
      right: <AlignRight size={16} />,
      justify: <AlignJustify size={16} />,
    };
    const nextAlign: Record<string, string> = { left: 'center', center: 'right', right: 'justify', justify: 'left' };
    const curSize = Math.round((size.value ?? 40) * Math.abs(sel.scaleY || 1));
    const setSize = (n: number) => {
      const k = Math.abs(sel.scaleY || 1);
      a.applyCharProp({ fontSize: Math.max(4, Math.min(1600, n / k)) });
    };
    return wrap(
      <>
        <div className="w-40 shrink-0">
          <FontPicker value={font.mixed ? undefined : font.value} mixed={font.mixed} disabled={sel.locked} onChange={(f) => a.applyCharProp({ fontFamily: f })} />
        </div>
        {weights.length > 1 && (
          <select
            aria-label="Font weight"
            title="Font weight"
            value={weight.mixed ? '' : String(weightNum)}
            onChange={(e) => a.applyCharProp({ fontWeight: Number(e.target.value) })}
            disabled={sel.locked}
            className="h-8 w-[112px] shrink-0 ml-1 rounded-lg border border-mt-input-border bg-mt-surface px-1.5 text-[13px] text-mt-ink"
          >
            {weight.mixed && <option value="">Mixed</option>}
            {!weights.includes(weightNum) && !weight.mixed && <option value={weightNum}>{WEIGHT_NAMES[weightNum] || weightNum}</option>}
            {weights.map((w) => (
              <option key={w} value={w} style={{ fontWeight: w }}>
                {WEIGHT_NAMES[w] || w}
              </option>
            ))}
          </select>
        )}
        <div className="flex items-center shrink-0 ml-1">
          <IconButton label="Smaller" size="sm" onClick={() => setSize(curSize - Math.max(1, Math.round(curSize * 0.1)))}>
            <Minus size={14} />
          </IconButton>
          <input
            key={`fs-${curSize}`}
            defaultValue={size.mixed ? '' : curSize}
            placeholder={size.mixed ? '–' : undefined}
            inputMode="numeric"
            aria-label="Font size"
            onBlur={(e) => {
              const n = parseFloat(e.target.value);
              if (!isNaN(n) && n !== curSize) setSize(n);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-12 h-8 rounded-lg border border-mt-input-border bg-mt-surface text-center text-sm"
          />
          <IconButton label="Bigger" size="sm" onClick={() => setSize(curSize + Math.max(1, Math.round(curSize * 0.1)))}>
            <Plus size={14} />
          </IconButton>
        </div>
        {colorPopover(
          'Text colour',
          FillValue(sel),
          (v, commit) => {
            if (v && typeof v === 'object') a.setFill(v, commit);
            else a.applyCharProp({ fill: v || '#09090B' }, commit);
          },
          { gradient: true }
        )}
        <IconButton label="Bold" onClick={() => a.applyCharProp({ fontWeight: isBold ? 'normal' : 'bold' })} active={isBold}>
          <Bold size={16} />
        </IconButton>
        <IconButton label="Italic" onClick={() => a.applyCharProp({ fontStyle: isItalic ? 'normal' : 'italic' })} active={isItalic}>
          <Italic size={16} />
        </IconButton>
        <IconButton label="Underline" onClick={() => a.applyCharProp({ underline: !under.value })} active={!!under.value && !under.mixed}>
          <Underline size={16} />
        </IconButton>
        <IconButton label="Strikethrough" onClick={() => a.applyCharProp({ linethrough: !strike.value })} active={!!strike.value && !strike.mixed}>
          <Strikethrough size={16} />
        </IconButton>
        <IconButton label="Alignment" hint="Left, centre, right, justify" onClick={() => a.applyProp({ textAlign: nextAlign[sel.textAlign || 'left'] || 'left' })}>
          {alignIcons[sel.textAlign || 'left']}
        </IconButton>
        <IconButton
          label="Uppercase"
          hint="Change letters to capitals or back"
          onClick={() => {
            const t = sel.text || '';
            a.applyProp({ text: t === t.toUpperCase() ? t.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m: string) => m.toUpperCase()) : t.toUpperCase() });
          }}
        >
          <CaseSensitive size={18} />
        </IconButton>
        <Popover
          width={260}
          trigger={({ toggle, open }) => (
            <IconButton label="Spacing" hint="Letter, line and paragraph spacing" onClick={toggle} active={open}>
              <Spline size={16} />
            </IconButton>
          )}
        >
          <div className="flex flex-col gap-3">
            <Slider label="Letter spacing" value={Math.round(sel.charSpacing || 0)} min={-200} max={1000} step={5} onChange={(v) => a.applyProp({ charSpacing: v }, false)} onCommit={(v) => a.applyProp({ charSpacing: v })} />
            <Slider label="Line spacing" value={Math.round((sel.lineHeight ?? 1.16) * 100) / 100} min={0.5} max={3} step={0.05} onChange={(v) => a.applyProp({ lineHeight: v }, false)} onCommit={(v) => a.applyProp({ lineHeight: v })} />
            <Slider label="Paragraph spacing" value={Math.round((sel.paragraphSpacing || 0) * 100) / 100} min={0} max={2} step={0.05} onChange={(v) => a.applyProp({ paragraphSpacing: v }, false)} onCommit={(v) => a.applyProp({ paragraphSpacing: v })} />
            <p className="text-[11px] text-mt-faint -mt-1">Extra space before each new paragraph (after you press Enter).</p>
          </div>
        </Popover>
        {sel.type === 'textbox' && !fx.curve && !fx.wave && <TextFlowPopover sel={sel} a={a} />}
        <Popover
          width={300}
          trigger={({ toggle, open }) => <ToolButton label="Effects" hint="Shadow, glow, outline, curve" icon={<Sparkles size={16} />} onClick={toggle} active={open} special />}
        >
          <TextEffectsEditor value={fx} onChange={(v, commit) => a.setTextFx(v, commit)} />
        </Popover>
        {common(sel)}
      </>
    );
  }

  // ---------------- photo / frame ----------------
  if (sel.type === 'image') {
    const framed = isFramed(sel);
    const empty = !!sel.__frame?.empty;
    return wrap(
      <>
        <ToolButton label={empty ? 'Add photo' : 'Replace'} hint="Swap the photo, keeping size, crop and effects" icon={<Replace size={16} />} onClick={a.replaceImage} />
        {!empty && (
          <>
            <ToolButton label="Crop" hint="Crop and reposition your image (or double-click it)" icon={<Crop size={16} />} onClick={a.startCrop} />
            <ToolButton label="Adjust" hint="Filters, light and colour" icon={<SlidersHorizontal size={16} />} onClick={a.openAdjust} />
            <ToolButton label="Remove BG" hint="Automatically remove the background from your image" icon={<Scissors size={16} />} onClick={a.removeBackground} special />
            {a.editPhoto && <ToolButton label="Edit photo" hint="Open Photo Studio: light, colour, looks, exact crop, heal — saved back into this picture" icon={<Wand2 size={16} />} onClick={a.editPhoto} />}
          </>
        )}
        <Popover
          width={280}
          trigger={({ toggle, open }) => <ToolButton label="Mask" hint="Place the image inside a shape" icon={<Shapes size={16} />} onClick={toggle} active={open} />}
        >
          {(close) => (
            <div>
              <p className="text-[13px] font-semibold mb-2">Shape</p>
              <div className="grid grid-cols-4 gap-1.5">
                {FRAME_KINDS.map((f) => (
                  <button
                    key={f.kind}
                    type="button"
                    title={f.label}
                    onClick={() => {
                      a.maskWithShape(f.kind);
                      close();
                    }}
                    className="aspect-square rounded-lg bg-mt-surface2 hover:bg-mt-accentsoft p-2"
                  >
                    <svg viewBox="-2 -2 44 44" className="w-full h-full" aria-hidden>
                      <path d={shapePathD(f.kind as ShapeKind, 40, 40)} className="fill-mt-ink/70" />
                    </svg>
                  </button>
                ))}
              </div>
              {framed && (
                <button
                  type="button"
                  onClick={() => {
                    a.detachFromFrame();
                    close();
                  }}
                  className="mt-3 w-full h-9 rounded-lg border border-mt-border text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <ImageMinus size={14} /> Remove mask (show whole photo)
                </button>
              )}
            </div>
          )}
        </Popover>
        <Popover
          width={200}
          trigger={({ toggle, open }) => (
            <IconButton label="Flip" onClick={toggle} active={open}>
              <FlipHorizontal2 size={16} />
            </IconButton>
          )}
        >
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => a.flip('x')} className="h-9 rounded-lg hover:bg-mt-surface2 text-sm inline-flex items-center gap-2 px-2">
              <FlipHorizontal2 size={15} /> Flip horizontal
            </button>
            <button type="button" onClick={() => a.flip('y')} className="h-9 rounded-lg hover:bg-mt-surface2 text-sm inline-flex items-center gap-2 px-2">
              <FlipVertical2 size={15} /> Flip vertical
            </button>
          </div>
        </Popover>
        {shadowPopover(sel)}
        {framed && sel.clipPath?.type === 'rect' && (
          <Popover
            width={240}
            trigger={({ toggle, open }) => (
              <IconButton label="Rounded corners" onClick={toggle} active={open}>
                <SquareRound size={16} />
              </IconButton>
            )}
          >
            <Slider
              label="Corner radius"
              value={Math.round((sel.clipPath.rx || 0) * Math.abs(sel.clipPath.scaleX || 1) * Math.abs(sel.scaleX || 1))}
              min={0}
              max={Math.round(Math.min(sel.getScaledWidth(), sel.getScaledHeight()) / 2)}
              onChange={(v) => a.setCornerRadius(v, false)}
              onCommit={(v) => a.setCornerRadius(v)}
            />
          </Popover>
        )}
        {common(sel)}
      </>
    );
  }

  // ---------------- group ----------------
  if (sel.type === 'group') {
    return wrap(
      <>
        <ToolButton label="Ungroup" hint="Ctrl/Cmd+Shift+G" icon={<Ungroup size={16} />} onClick={a.ungroup} />
        {colorPopover('Colour', firstChildFill(sel), (v, commit) => a.setFill(v, commit), { gradient: true })}
        {shadowPopover(sel)}
        {common(sel)}
      </>
    );
  }

  // ---------------- shapes, lines, drawings ----------------
  const meta = sel.__shape;
  const kind: string | undefined = meta?.kind;
  const isLine = kind === 'line' || kind === 'arrowLine' || sel.type === 'line' || (sel.isVectorPath && !sel.fill);
  const hasCorner = sel.type === 'rect' || kind === 'rect' || kind === 'roundRect';
  const curRadius = sel.type === 'rect' ? Math.round((sel.rx || 0) * Math.abs(sel.scaleX || 1)) : Math.round(meta?.params?.radius ?? 0);
  const shadow = sel.shadow;
  return wrap(
    <>
      {!isLine && colorPopover('Fill', FillValue(sel), (v, commit) => a.setFill(v, commit), { gradient: true, none: true })}
      <Popover
        width={280}
        trigger={({ toggle, open }) => (
          <IconButton label="Border" hint="Outline colour, thickness and style" onClick={toggle} active={open}>
            <span className="inline-block w-5 h-5 rounded-md border-[3px]" style={{ borderColor: typeof sel.stroke === 'string' && sel.stroke ? sel.stroke : '#A1A1AA' }} />
          </IconButton>
        )}
      >
        <div className="flex flex-col gap-3">
          <Slider label="Thickness" value={Math.round(sel.strokeWidth || 0)} min={0} max={60} onChange={(v) => a.applyProp({ strokeWidth: v, stroke: sel.stroke || '#09090B', strokeUniform: true }, false)} onCommit={(v) => a.setStroke({ strokeWidth: v })} />
          <div className="flex gap-1.5">
            {(['solid', 'dashed', 'dotted'] as const).map((d) => (
              <button key={d} type="button" onClick={() => a.setStroke({ dash: d })} className="flex-1 h-9 rounded-lg border border-mt-border text-xs capitalize hover:bg-mt-surface2">
                {d}
              </button>
            ))}
          </div>
          <ColorPicker value={typeof sel.stroke === 'string' && sel.stroke ? sel.stroke : '#09090B'} allowNone onChange={(v, commit) => (commit ? a.setStroke({ stroke: v as string | null }) : a.applyProp({ stroke: v || '' }, false))} brandColors={brandColors} documentColors={documentColors} onPickFromCanvas={a.pickFromCanvas} />
        </div>
      </Popover>
      {hasCorner && (
        <Popover
          width={240}
          trigger={({ toggle, open }) => (
            <IconButton label="Rounded corners" onClick={toggle} active={open}>
              <SquareRound size={16} />
            </IconButton>
          )}
        >
          <Slider label="Corner radius" value={curRadius} min={0} max={Math.round(Math.min(sel.getScaledWidth(), sel.getScaledHeight()) / 2)} onChange={(v) => a.setCornerRadius(v, false)} onCommit={(v) => a.setCornerRadius(v)} />
        </Popover>
      )}
      {meta && ['star', 'burst', 'badge', 'polygon'].includes(kind!) && (
        <Popover
          width={240}
          trigger={({ toggle, open }) => <ToolButton label={kind === 'polygon' ? 'Sides' : 'Points'} icon={<Shapes size={16} />} onClick={toggle} active={open} />}
        >
          <div className="flex flex-col gap-3">
            {kind === 'polygon' ? (
              <Slider label="Sides" value={meta.params.sides ?? 8} min={3} max={16} onChange={(v) => a.setShapeParams({ sides: v }, false)} onCommit={(v) => a.setShapeParams({ sides: v })} />
            ) : (
              <Slider label="Points" value={meta.params.points ?? 5} min={kind === 'badge' ? 8 : 3} max={kind === 'badge' ? 48 : 32} onChange={(v) => a.setShapeParams({ points: v }, false)} onCommit={(v) => a.setShapeParams({ points: v })} />
            )}
            {(kind === 'star' || kind === 'burst') && (
              <Slider label="Inner size" value={Math.round((meta.params.inner ?? 0.45) * 100)} min={10} max={95} suffix="%" onChange={(v) => a.setShapeParams({ inner: v / 100 }, false)} onCommit={(v) => a.setShapeParams({ inner: v / 100 })} />
            )}
          </div>
        </Popover>
      )}
      {shadowPopover(sel)}
      {common(sel)}
    </>
  );
}

// Text frames: fixed-size boxes whose text flows on to linked frames
// (columns, next frame, next page). See lib/editor/textFrames.ts.
function TextFlowPopover({ sel, a }: { sel: any; a: ToolbarActions }) {
  const frame = !!sel.__storyId && sel.__frameH > 0;
  const canvas = sel.canvas;
  const frames = frame && canvas ? canvas.getObjects().filter((o: any) => o.__storyId === sel.__storyId && o.__frameH > 0) : [];
  const overflow = frames.some((f: any) => !!f.__storyOverflow);
  const idx = (sel.__storyIndex || 0) + 1;
  return (
    <Popover
      width={290}
      trigger={({ toggle, open }) => (
        <span className="relative inline-flex">
          <ToolButton label={frame ? 'Text flow' : 'Text frame'} hint="Columns and text that flows between frames" icon={<Newspaper size={16} />} onClick={toggle} active={open} />
          {overflow && <span aria-label="Some text doesn’t fit" className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-600" />}
        </span>
      )}
    >
      {(close) =>
        frame ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-mt-ink">Frame {idx} of {frames.length}</p>
              <p className={cx('text-xs', overflow ? 'text-rose-600' : 'text-mt-muted')}>{overflow ? 'Some text doesn’t fit yet — add a frame to show it.' : 'All of the story fits.'}</p>
            </div>
            <button type="button" onClick={() => { a.frame.addLinked(); close(); }} className={cx('h-9 rounded-lg text-[13px] font-semibold', overflow ? 'bg-mt-primary text-mt-onprimary' : 'border border-mt-border text-mt-ink hover:bg-mt-surface2')}>
              Add a linked frame
            </button>
            <div>
              <p className="text-xs text-mt-muted mb-1.5">Split this frame into columns</p>
              <div className="flex gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button key={n} type="button" onClick={() => { a.frame.columns(n); close(); }} className="flex-1 h-9 rounded-lg border border-mt-border text-[13px] hover:bg-mt-surface2">
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => { a.frame.unlink(); close(); }} className="self-start text-xs text-mt-muted hover:text-mt-ink underline-offset-2 hover:underline">
              {frames.length > 1 ? 'Unlink this frame from the story' : 'Turn back into a normal text box'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-mt-ink">Make it a text frame</p>
            <p className="text-xs text-mt-muted leading-relaxed">The box keeps its size. Text that doesn’t fit flows on into linked frames or columns — like a magazine.</p>
            <button type="button" onClick={() => { a.frame.make(); close(); }} className="h-9 rounded-lg bg-mt-primary text-mt-onprimary text-[13px] font-semibold">
              Make text frame
            </button>
          </div>
        )
      }
    </Popover>
  );
}
