'use client';

// Pro inspector: exact numbers for everything about the selection, in the
// document's units, grouped the way designers expect (position & size,
// alignment, layer, text, fill, border, corners, shadow, photo, path).
// Every change goes through the same actions as the floating toolbar, so
// it records undo steps, saves and exports the same way.

import { ReactNode, useState } from 'react';
import {
  Lock,
  Unlock,
  Link2,
  Unlink2,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Crop,
  SlidersHorizontal,
  WandSparkles,
  ImagePlus,
  Scissors,
  Group,
  Ungroup,
  Spline,
  ChevronDown,
} from 'lucide-react';
import type { DocUnit, ToolMode } from '@/lib/editor/types';
import { formatUnit, unitToPx, getObjectPixelSize } from '@/lib/editor/units';
import { fromFabricGradient, GradientSpec } from '@/lib/editor/gradients';
import { googleFontByName, WEIGHT_NAMES } from '@/lib/editor/googleFonts';
import { FontPicker } from './FontPicker';
import { ColorPicker, ColorChip } from './shell/ColorPicker';
import { Popover, Slider, Segmented, cx } from './shell/ui';
import type { ToolbarActions } from './shell/ContextToolbar';
import { layerName } from './DesignLayersPanel';
import { TOOL_INFO, toolIcon, StripTool } from './Toolbar';

interface Props {
  activeTool: ToolMode;
  stripTool: StripTool;
  selected: any;
  unit: DocUnit;
  layers: any[];
  a: ToolbarActions;
  brandColors: string[];
  documentColors: string[];
  maskTargetId: string;
  setMaskTargetId: (id: string) => void;
  applyExactSize: (w: number | null, h: number | null) => void;
  toggleLockRatio: () => void;
  applyPathAsMask: () => void;
  removeMask: () => void;
  layerLabel: (obj: any, index: number) => string;
  onEditPhoto: () => void;
  // Top-left of the page the selection sits on: X/Y are measured from it.
  artboardOrigin?: { x: number; y: number };
}

const BLEND_MODES: [string, string][] = [
  ['source-over', 'Normal'],
  ['multiply', 'Multiply'],
  ['screen', 'Screen'],
  ['overlay', 'Overlay'],
  ['darken', 'Darken'],
  ['lighten', 'Lighten'],
  ['color-dodge', 'Colour dodge'],
  ['color-burn', 'Colour burn'],
  ['hard-light', 'Hard light'],
  ['soft-light', 'Soft light'],
  ['difference', 'Difference'],
  ['exclusion', 'Exclusion'],
  ['hue', 'Hue'],
  ['saturation', 'Saturation'],
  ['color', 'Colour'],
  ['luminosity', 'Luminosity'],
];

const isTextObj = (o: any) => o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');
const fillValue = (o: any): string | GradientSpec | null => {
  if (!o) return null;
  if (o.fill && typeof o.fill === 'object' && o.fill.colorStops) return fromFabricGradient(o.fill);
  return typeof o.fill === 'string' && o.fill ? o.fill : null;
};

// ---------------------------------------------------------------- pieces

function Section({ title, children, action, defaultOpen = true }: { title: string; children: ReactNode; action?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-mt-border px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1.5 text-[12px] font-semibold text-mt-ink">
          <ChevronDown size={13} className={cx('text-mt-faint transition-transform', !open && '-rotate-90')} />
          {title}
        </button>
        {action}
      </div>
      {open && <div className="mt-3 flex flex-col gap-3">{children}</div>}
    </section>
  );
}

// A number field with a short label inside it (like "X" or "W"). Typed
// values commit on Enter or when leaving the field; arrow keys step
// (Shift = ×10). Nothing is rounded beyond what the unit shows.
function NumField({
  label,
  value,
  onCommit,
  step = 1,
  min,
  max,
  suffix,
  disabled,
  title,
  mixed,
}: {
  label: ReactNode;
  value: number | undefined;
  onCommit: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
  title?: string;
  mixed?: boolean;
}) {
  const shown = mixed || value === undefined ? '' : String(Math.round(value * 100) / 100);
  const commit = (raw: string, el: HTMLInputElement) => {
    let n = parseFloat(raw.replace(',', '.'));
    if (raw.trim() === '' || isNaN(n)) {
      el.value = shown;
      return;
    }
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    el.value = String(Math.round(n * 100) / 100);
    if (value === undefined || Math.abs(n - value) > 1e-6) onCommit(n);
  };
  return (
    <label title={title} className={cx('group flex items-center h-9 rounded-lg border border-mt-input-border bg-mt-surface focus-within:border-[#3B82C4] focus-within:ring-2 focus-within:ring-[#8CCBFF]/40', disabled && 'opacity-45')}>
      <span className="pl-2.5 pr-1 text-[11px] font-medium text-mt-faint shrink-0 inline-flex items-center">{label}</span>
      <input
        key={shown}
        type="text"
        inputMode="decimal"
        defaultValue={shown}
        placeholder={mixed ? 'Mixed' : undefined}
        disabled={disabled}
        onBlur={(e) => commit(e.target.value, e.target)}
        onKeyDown={(e) => {
          const el = e.target as HTMLInputElement;
          if (e.key === 'Enter') el.blur();
          if (e.key === 'Escape') {
            el.value = shown;
            el.blur();
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const cur = parseFloat(el.value) || value || 0;
            commit(String(cur + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)), el);
          }
          e.stopPropagation();
        }}
        className="flex-1 min-w-0 h-full bg-transparent text-[13px] text-mt-ink tabular-nums focus:outline-none disabled:cursor-not-allowed"
      />
      {suffix && <span className="pr-2.5 text-[11px] text-mt-faint shrink-0">{suffix}</span>}
    </label>
  );
}

function IconBtn({ label, onClick, active, disabled, children }: { label: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'h-9 flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border transition-colors disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]',
        active ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'
      )}
    >
      {children}
    </button>
  );
}

function WideBtn({ icon, label, onClick, disabled, primary }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'h-9 px-3 rounded-lg text-[13px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none',
        primary ? 'bg-mt-primary text-mt-onprimary hover:opacity-90' : 'border border-mt-border text-mt-ink hover:bg-mt-surface2'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  gradient,
  none,
  brandColors,
  documentColors,
  onPick,
  disabled,
}: {
  label: string;
  value: any;
  onChange: (v: any, commit: boolean) => void;
  gradient?: boolean;
  none?: boolean;
  brandColors: string[];
  documentColors: string[];
  onPick: (cb: (hex: string) => void) => void;
  disabled?: boolean;
}) {
  const text = !value ? 'None' : typeof value === 'string' ? value.toUpperCase() : value.type === 'radial' ? 'Radial gradient' : 'Linear gradient';
  return (
    <Popover
      width={300}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          aria-label={label}
          className={cx('w-full h-9 flex items-center gap-2.5 px-2 rounded-lg border text-left disabled:opacity-45', open ? 'border-[#3B82C4] ring-2 ring-[#8CCBFF]/40' : 'border-mt-input-border hover:bg-mt-surface2')}
        >
          <ColorChip value={value} label={label} size={22} />
          <span className="flex-1 min-w-0 truncate text-[13px] text-mt-ink tabular-nums">{text}</span>
          <ChevronDown size={14} className="text-mt-faint" />
        </button>
      )}
    >
      <ColorPicker value={value} onChange={onChange} allowGradient={gradient} allowNone={none} brandColors={brandColors} documentColors={documentColors} onPickFromCanvas={onPick} />
    </Popover>
  );
}

// ---------------------------------------------------------------- panel

export function PropertiesPanel(p: Props) {
  const { selected, unit, a } = p;
  const origin = p.artboardOrigin || { x: 0, y: 0 };

  // A drawing/editing tool is in use: say what it does.
  if (p.stripTool !== 'select' && !(p.stripTool === 'direct' && selected && !selected.__isAnchorHandle)) {
    const info = TOOL_INFO[p.stripTool];
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-mt-border bg-mt-surface2/60 p-4">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#3B82C4] text-white inline-flex items-center justify-center">{toolIcon(p.stripTool)}</span>
            <div>
              <p className="text-sm font-semibold text-mt-ink">{info.label}</p>
              {info.key && <p className="text-[11px] text-mt-faint">Shortcut {info.key}</p>}
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-[12px] text-mt-muted leading-relaxed">
            {info.hint.split(' · ').map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden className="mt-[7px] w-1 h-1 rounded-full bg-mt-faint shrink-0" />
                {h.charAt(0).toUpperCase() + h.slice(1)}
              </li>
            ))}
            <li className="flex gap-2">
              <span aria-hidden className="mt-[7px] w-1 h-1 rounded-full bg-mt-faint shrink-0" />
              Press Esc or V to go back to selecting
            </li>
          </ul>
        </div>
      </div>
    );
  }

  if (!selected || selected.__isAnchorHandle) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl mt-spectrum opacity-90" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-mt-ink">Nothing selected</p>
        <p className="mt-1 text-xs text-mt-muted leading-relaxed">Click something on the page to see its exact size, position, colours and more.</p>
      </div>
    );
  }

  const isMultiple = selected.type === 'activeSelection';
  const isText = isTextObj(selected);
  const isImage = selected.type === 'image';
  const isGroup = selected.type === 'group';
  const isPath = !!selected.isVectorPath;
  const locked = !!selected.locked;
  const meta = selected.__shape;
  const kind: string | undefined = meta?.kind;
  const isLine = kind === 'line' || kind === 'arrowLine' || selected.type === 'line' || (isPath && !selected.fill);
  const hasCorner = selected.type === 'rect' || kind === 'rect' || kind === 'roundRect';
  const radius = selected.type === 'rect' ? Math.round((selected.rx || 0) * Math.abs(selected.scaleX || 1)) : Math.round(meta?.params?.radius ?? 0);
  const size = getObjectPixelSize(selected);
  const toUnit = (px: number) => parseFloat(formatUnit(px, unit));
  const unitStep = unit === 'px' || unit === 'pt' ? 1 : unit === 'mm' ? 0.5 : 0.01;
  const shadow = isMultiple ? selected.getObjects().find((x: any) => x.shadow)?.shadow || null : selected.shadow;
  const sh = shadow ? { color: shadow.color || 'rgba(9,9,11,0.35)', blur: shadow.blur || 0, x: shadow.offsetX || 0, y: shadow.offsetY || 0 } : null;
  const setSh = (patch: Partial<NonNullable<typeof sh>>, record: boolean) => sh && a.setShadow({ ...sh, ...patch }, record);
  const blend = selected.globalCompositeOperation || 'source-over';
  const colorProps = { brandColors: p.brandColors, documentColors: p.documentColors, onPick: a.pickFromCanvas, disabled: locked };
  const images = p.layers.filter((o) => o.type === 'image');
  const title = isMultiple ? `${selected.getObjects().length} selected` : layerName(selected);

  return (
    <div className="flex flex-col pb-6">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-mt-border flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.08em] text-mt-faint">{isMultiple ? 'Selection' : isText ? 'Text' : isImage ? 'Photo' : isGroup ? 'Group' : isPath ? 'Path' : 'Shape'}</p>
          <p className="text-sm font-semibold text-mt-ink truncate">{title}</p>
        </div>
        <button
          type="button"
          onClick={a.toggleLock}
          aria-label={locked ? 'Unlock' : 'Lock'}
          title={locked ? 'Unlock (Ctrl/Cmd+L)' : 'Lock so it can’t be moved (Ctrl/Cmd+L)'}
          className={cx('h-8 w-8 rounded-lg inline-flex items-center justify-center border', locked ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300' : 'border-mt-border text-mt-muted hover:text-mt-ink')}
        >
          {locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>
      {locked && <p className="mx-4 mt-3 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-2">Locked. Unlock it to make changes.</p>}

      {/* Position & size */}
      <Section
        title="Position & size"
        action={
          <span className="text-[11px] text-mt-faint" title="Measured from the top-left of the page">
            {unit}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <NumField label="X" value={toUnit((selected.left ?? 0) - origin.x)} step={unitStep} disabled={locked} onCommit={(n) => a.applyProp({ left: unitToPx(n, unit) + origin.x })} />
          <NumField label="Y" value={toUnit((selected.top ?? 0) - origin.y)} step={unitStep} disabled={locked} onCommit={(n) => a.applyProp({ top: unitToPx(n, unit) + origin.y })} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 items-center">
          <NumField label="W" value={toUnit(size.w)} step={unitStep} min={0.01} disabled={locked} onCommit={(n) => p.applyExactSize(unitToPx(n, unit), null)} />
          <button
            type="button"
            onClick={p.toggleLockRatio}
            aria-label={selected.__lockRatio ? 'Width and height are linked' : 'Link width and height'}
            title={selected.__lockRatio ? 'Width and height change together — click to unlink' : 'Link width and height'}
            className={cx('h-9 w-8 rounded-lg inline-flex items-center justify-center', selected.__lockRatio ? 'text-[#3B82C4] bg-[#3B82C4]/10' : 'text-mt-faint hover:text-mt-ink')}
          >
            {selected.__lockRatio ? <Link2 size={15} /> : <Unlink2 size={15} />}
          </button>
          <NumField
            label="H"
            value={toUnit(size.h)}
            step={unitStep}
            min={0.01}
            disabled={locked || selected.type === 'textbox'}
            title={selected.type === 'textbox' ? 'A text box grows with its text' : undefined}
            onCommit={(n) => p.applyExactSize(null, unitToPx(n, unit))}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NumField label={<RotateCw size={12} />} value={Math.round((selected.angle || 0) * 10) / 10} suffix="°" disabled={locked} onCommit={(n) => a.applyProp({ angle: ((n % 360) + 360) % 360 })} title="Rotation" />
          <div className="flex gap-1.5 w-[84px]">
            <IconBtn label="Flip horizontally" onClick={() => a.flip('x')} disabled={locked} active={!!selected.flipX}>
              <FlipHorizontal2 size={15} />
            </IconBtn>
            <IconBtn label="Flip vertically" onClick={() => a.flip('y')} disabled={locked} active={!!selected.flipY}>
              <FlipVertical2 size={15} />
            </IconBtn>
          </div>
        </div>
      </Section>

      {/* Align */}
      <Section title={isMultiple ? 'Align to each other' : 'Align to page'}>
        <div className="flex gap-1.5">
          <IconBtn label="Align left" onClick={() => a.align('left')} disabled={locked}><AlignStartVertical size={15} /></IconBtn>
          <IconBtn label="Align centre" onClick={() => a.align('centerH')} disabled={locked}><AlignCenterVertical size={15} /></IconBtn>
          <IconBtn label="Align right" onClick={() => a.align('right')} disabled={locked}><AlignEndVertical size={15} /></IconBtn>
          <IconBtn label="Align top" onClick={() => a.align('top')} disabled={locked}><AlignStartHorizontal size={15} /></IconBtn>
          <IconBtn label="Align middle" onClick={() => a.align('centerV')} disabled={locked}><AlignCenterHorizontal size={15} /></IconBtn>
          <IconBtn label="Align bottom" onClick={() => a.align('bottom')} disabled={locked}><AlignEndHorizontal size={15} /></IconBtn>
        </div>
        {isMultiple && selected.getObjects().length > 2 && (
          <div className="flex gap-1.5">
            <WideBtn icon={<AlignHorizontalDistributeCenter size={15} />} label="Space across" onClick={() => a.distribute('h')} />
            <WideBtn icon={<AlignVerticalDistributeCenter size={15} />} label="Space down" onClick={() => a.distribute('v')} />
          </div>
        )}
      </Section>

      {/* Layer */}
      <Section title="Layer">
        <Slider label="Opacity" value={Math.round((selected.opacity ?? 1) * 100)} min={0} max={100} suffix="%" disabled={locked} onChange={(v) => a.setOpacity(v / 100, false)} onCommit={(v) => a.setOpacity(v / 100, true)} />
        {!isMultiple && (
          <label className="flex items-center justify-between gap-3 text-xs text-mt-muted">
            Blend
            <select
              value={blend}
              disabled={locked}
              onChange={(e) => a.applyProp({ globalCompositeOperation: e.target.value })}
              className="h-9 flex-1 max-w-[170px] rounded-lg border border-mt-input-border bg-mt-surface px-2 text-[13px] text-mt-ink"
            >
              {BLEND_MODES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
        {(isMultiple || isGroup) && (
          <div className="flex gap-1.5">
            {isMultiple && <WideBtn icon={<Group size={15} />} label="Group" onClick={a.group} />}
            {isGroup && <WideBtn icon={<Ungroup size={15} />} label="Ungroup" onClick={a.ungroup} />}
          </div>
        )}
      </Section>

      {isText && <TextSection p={p} colorProps={colorProps} />}

      {/* Fill & border for shapes and paths */}
      {!isText && !isImage && (
        <>
          {!isLine && (
            <Section title="Fill">
              <ColorRow label="Fill" value={isMultiple ? null : fillValue(selected)} onChange={(v, commit) => a.setFill(v, commit)} gradient none {...colorProps} />
            </Section>
          )}
          {!isMultiple && !isGroup && (
            <Section title={isLine ? 'Line' : 'Border'}>
              <ColorRow
                label={isLine ? 'Line colour' : 'Border colour'}
                value={typeof selected.stroke === 'string' && selected.stroke ? selected.stroke : null}
                onChange={(v, commit) => (commit ? a.setStroke({ stroke: (v as string) || null }) : a.applyProp({ stroke: v || '' }, false))}
                none
                {...colorProps}
              />
              <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <NumField label="Width" value={Math.round((selected.strokeWidth || 0) * 100) / 100} min={0} max={500} suffix="px" disabled={locked} onCommit={(n) => a.setStroke({ strokeWidth: n })} />
                <Segmented
                  size="sm"
                  value={!selected.strokeDashArray?.length ? 'solid' : selected.strokeDashArray[0] < 0.1 ? 'dotted' : 'dashed'}
                  options={[
                    { value: 'solid', label: '—', hint: 'Solid' },
                    { value: 'dashed', label: '- -', hint: 'Dashed' },
                    { value: 'dotted', label: '···', hint: 'Dotted' },
                  ]}
                  onChange={(d) => a.setStroke({ dash: d as 'solid' | 'dashed' | 'dotted' })}
                />
              </div>
            </Section>
          )}
          {hasCorner && !isMultiple && (
            <Section title="Corners">
              <Slider label="Corner radius" value={radius} min={0} max={Math.max(1, Math.round(Math.min(selected.getScaledWidth(), selected.getScaledHeight()) / 2))} disabled={locked} onChange={(v) => a.setCornerRadius(v, false)} onCommit={(v) => a.setCornerRadius(v)} />
            </Section>
          )}
        </>
      )}

      {/* Shadow */}
      <Section
        key={sh ? 'shadow-on' : 'shadow-off'}
        title="Shadow"
        defaultOpen={!!sh}
        action={
          <button
            type="button"
            role="switch"
            aria-checked={!!sh}
            aria-label="Shadow"
            disabled={locked}
            onClick={() => a.setShadow(sh ? null : { color: 'rgba(9,9,11,0.35)', blur: 18, x: 0, y: 10 })}
            className={cx('relative w-9 h-5 rounded-full transition-colors', sh ? 'bg-[#3B82C4]' : 'bg-mt-border')}
          >
            <span className={cx('absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', sh ? 'translate-x-[18px]' : 'translate-x-0.5')} />
          </button>
        }
      >
        {sh ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <NumField label="X" value={Math.round(sh.x)} onCommit={(n) => setSh({ x: n }, true)} />
              <NumField label="Y" value={Math.round(sh.y)} onCommit={(n) => setSh({ y: n }, true)} />
              <NumField label="Blur" value={Math.round(sh.blur)} min={0} onCommit={(n) => setSh({ blur: n }, true)} />
            </div>
            <ColorRow label="Shadow colour" value={sh.color} onChange={(v, commit) => v && setSh({ color: v as string }, commit)} {...colorProps} />
          </>
        ) : (
          <p className="text-xs text-mt-faint">Turn on for a soft shadow behind {isMultiple ? 'each object' : 'it'}.</p>
        )}
      </Section>

      {/* Photo */}
      {isImage && (
        <Section title="Photo">
          <WideBtn primary icon={<SlidersHorizontal size={15} />} label="Edit photo" onClick={p.onEditPhoto} disabled={locked} />
          <div className="grid grid-cols-2 gap-1.5">
            <WideBtn icon={<Crop size={15} />} label="Crop" onClick={a.startCrop} disabled={locked} />
            <WideBtn icon={<SlidersHorizontal size={15} />} label="Adjust" onClick={a.openAdjust} disabled={locked} />
            <WideBtn icon={<WandSparkles size={15} />} label="Remove bg" onClick={a.removeBackground} disabled={locked} />
            <WideBtn icon={<ImagePlus size={15} />} label="Replace" onClick={a.replaceImage} disabled={locked} />
          </div>
          {selected.clipPath && (
            <WideBtn icon={<Scissors size={15} />} label="Remove mask" onClick={p.removeMask} disabled={locked} />
          )}
        </Section>
      )}

      {/* Path */}
      {isPath && !isMultiple && (
        <Section title="Path">
          <p className="text-xs text-mt-muted leading-relaxed">
            Press <kbd className="px-1 rounded border border-mt-border bg-mt-surface2 text-[11px]">A</kbd> (Edit points) to drag its points and curve handles.
          </p>
          {images.length ? (
            <>
              <label className="text-xs text-mt-muted flex flex-col gap-1">
                Use this path to cut out a photo
                <select value={p.maskTargetId} onChange={(e) => p.setMaskTargetId(e.target.value)} className="h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-[13px] text-mt-ink">
                  <option value="">Choose a photo…</option>
                  {images.map((img, i) => (
                    <option key={img.__id || i} value={img.__id}>
                      {p.layerLabel(img, p.layers.indexOf(img))}
                    </option>
                  ))}
                </select>
              </label>
              <WideBtn icon={<Spline size={15} />} label="Cut out photo with path" onClick={p.applyPathAsMask} disabled={!p.maskTargetId} />
            </>
          ) : (
            <p className="text-xs text-mt-faint">Add a photo to cut it out with this path.</p>
          )}
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- text

function TextSection({ p, colorProps }: { p: Props; colorProps: any }) {
  const { selected: sel, a } = p;
  const locked = !!sel.locked;
  const font = a.getTextPropValue(sel, 'fontFamily');
  const size = a.getTextPropValue(sel, 'fontSize');
  const weight = a.getTextPropValue(sel, 'fontWeight');
  const style = a.getTextPropValue(sel, 'fontStyle');
  const under = a.getTextPropValue(sel, 'underline');
  const strike = a.getTextPropValue(sel, 'linethrough');
  const baseline = a.getTextPropValue(sel, 'deltaY');
  const weightNum = weight.value === 'bold' ? 700 : weight.value === 'normal' || weight.value == null ? 400 : Number(weight.value) || 400;
  const def = !font.mixed && font.value ? googleFontByName(font.value) : undefined;
  const weights: number[] = def?.weights?.length ? def.weights : [400, 700];
  const k = Math.abs(sel.scaleY || 1);
  const shownSize = size.mixed ? undefined : Math.round((size.value ?? 40) * k * 10) / 10;
  const isItalic = !style.mixed && style.value === 'italic';
  const hasSelection = sel.isEditing && sel.selectionStart !== sel.selectionEnd;
  const textColor = (() => {
    if (sel.fill && typeof sel.fill === 'object' && sel.fill.colorStops) return fromFabricGradient(sel.fill);
    const f = a.getTextPropValue(sel, 'fill');
    return typeof f.value === 'string' ? f.value : '#09090B';
  })();
  return (
    <>
      <Section title="Text" action={hasSelection ? <span className="text-[11px] text-[#3B82C4]">Selected letters</span> : undefined}>
        <FontPicker value={font.mixed ? undefined : font.value} mixed={font.mixed} disabled={locked} onChange={(f) => a.applyCharProp({ fontFamily: f })} />
        <div className="grid grid-cols-[1fr_92px] gap-2">
          <select
            aria-label="Font weight"
            value={weight.mixed ? '' : String(weightNum)}
            disabled={locked}
            onChange={(e) => a.applyCharProp({ fontWeight: Number(e.target.value) })}
            className="h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-[13px] text-mt-ink"
          >
            {weight.mixed && <option value="">Mixed</option>}
            {!weight.mixed && !weights.includes(weightNum) && <option value={weightNum}>{WEIGHT_NAMES[weightNum] || weightNum}</option>}
            {weights.map((w) => (
              <option key={w} value={w}>
                {WEIGHT_NAMES[w] || w}
              </option>
            ))}
          </select>
          <NumField label="Size" value={shownSize} mixed={size.mixed} min={1} max={2000} disabled={locked} onCommit={(n) => a.applyCharProp({ fontSize: n / k })} />
        </div>
        <ColorRow label="Text colour" value={textColor} onChange={(v, commit) => (v && typeof v === 'object' ? a.setFill(v, commit) : a.applyCharProp({ fill: v || '#09090B' }, commit))} gradient {...colorProps} />
        <div className="flex gap-1.5">
          <IconBtn label="Bold" active={!weight.mixed && weightNum >= 600} disabled={locked} onClick={() => a.applyCharProp({ fontWeight: weightNum >= 600 ? 400 : 700 })}>
            <Bold size={15} />
          </IconBtn>
          <IconBtn label="Italic" active={isItalic} disabled={locked} onClick={() => a.applyCharProp({ fontStyle: isItalic ? 'normal' : 'italic' })}>
            <Italic size={15} />
          </IconBtn>
          <IconBtn label="Underline" active={!under.mixed && !!under.value} disabled={locked} onClick={() => a.applyCharProp({ underline: !under.value })}>
            <Underline size={15} />
          </IconBtn>
          <IconBtn label="Strikethrough" active={!strike.mixed && !!strike.value} disabled={locked} onClick={() => a.applyCharProp({ linethrough: !strike.value })}>
            <Strikethrough size={15} />
          </IconBtn>
        </div>
        <p className="text-[11px] text-mt-faint leading-snug">Double-click the text and highlight some letters to change just those.</p>
      </Section>
      <Section title="Paragraph">
        <div className="flex gap-1.5">
          {(
            [
              ['left', <AlignLeft key="l" size={15} />, 'Align left'],
              ['center', <AlignCenter key="c" size={15} />, 'Centre'],
              ['right', <AlignRight key="r" size={15} />, 'Align right'],
              ['justify', <AlignJustify key="j" size={15} />, 'Justify'],
            ] as [string, ReactNode, string][]
          ).map(([v, icon, label]) => (
            <IconBtn key={v} label={label} active={(sel.textAlign || 'left') === v} disabled={locked} onClick={() => a.applyProp({ textAlign: v })}>
              {icon}
            </IconBtn>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumField label="Letter" value={Math.round(sel.charSpacing || 0)} step={5} min={-500} max={2000} disabled={locked} title="Letter spacing (thousandths of the size)" onCommit={(n) => a.applyProp({ charSpacing: n })} />
          <NumField label="Line" value={Math.round((sel.lineHeight ?? 1.16) * 100) / 100} step={0.05} min={0.3} max={10} disabled={locked} title="Line spacing (1 = the font’s own spacing)" onCommit={(n) => a.applyProp({ lineHeight: n })} />
          <NumField label="Paragraph" value={Math.round((sel.paragraphSpacing || 0) * 100) / 100} step={0.1} min={0} max={10} suffix="em" disabled={locked} title="Extra space before each paragraph (1 em = the text size)" onCommit={(n) => a.applyProp({ paragraphSpacing: n })} />
          <NumField label="Baseline" value={baseline.mixed ? undefined : baseline.value ?? 0} mixed={baseline.mixed} min={-500} max={500} disabled={locked} title="Raise or lower letters" onCommit={(n) => a.applyCharProp({ deltaY: n })} />
        </div>
      </Section>
      {sel.type === 'textbox' && !sel.path && (
        <Section title="Text frame">
          {sel.__storyId && sel.__frameH > 0 ? (
            <>
              <NumField label="Frame height" value={Math.round(sel.__frameH)} min={20} suffix="px" disabled={locked} onCommit={(n) => a.frame.setHeight(n)} />
              {sel.canvas?.getObjects().some((o: any) => o.__storyId === sel.__storyId && o.__storyOverflow) && (
                <p className="text-xs text-rose-600">Some text doesn’t fit yet — add a linked frame to show it.</p>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <WideBtn icon={<Spline size={15} />} label="Add linked frame" onClick={a.frame.addLinked} disabled={locked} />
                <WideBtn icon={<Scissors size={15} />} label="Unlink" onClick={a.frame.unlink} disabled={locked} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-mt-muted mr-1">Columns</span>
                {[2, 3, 4].map((n) => (
                  <IconBtn key={n} label={`Split into ${n} columns`} onClick={() => a.frame.columns(n)} disabled={locked}>
                    <span className="text-[13px]">{n}</span>
                  </IconBtn>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-mt-muted leading-relaxed">Keep this box a fixed size and let extra text flow on into linked frames and columns.</p>
              <WideBtn icon={<Spline size={15} />} label="Make text frame" onClick={a.frame.make} disabled={locked} />
            </>
          )}
        </Section>
      )}
    </>
  );
}
