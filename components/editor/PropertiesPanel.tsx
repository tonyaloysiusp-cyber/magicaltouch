'use client';

import { Lock, Unlock, Scissors } from 'lucide-react';
import { isDrawTool, TOOL_LABELS, DrawTool, DocUnit, ToolMode } from '@/lib/editor/types';
import { formatUnit, unitToPx, getObjectPixelSize } from '@/lib/editor/units';
import { FontPicker } from './FontPicker';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { GradientPresetPicker } from './GradientPresetPicker';

interface Props {
  activeTool: ToolMode;
  selected: any;
  unit: DocUnit;
  layers: any[];
  maskTargetId: string;
  setMaskTargetId: (id: string) => void;
  applyProp: (props: Record<string, any>, record?: boolean) => void;
  // Character-scoped version of applyProp: targets the exact highlighted
  // characters when the user is mid-edit with a real (non-collapsed)
  // text selection, otherwise behaves exactly like applyProp.
  applyCharProp: (props: Record<string, any>, record?: boolean) => void;
  // Reads a text property's effective value for whatever's relevant right
  // now (the selected characters, or the whole object), flagging "mixed"
  // when a real selection's characters don't all agree.
  getTextPropValue: (active: any, prop: string) => { value: any; mixed: boolean };
  applyExactSize: (w: number | null, h: number | null) => void;
  toggleLockRatio: () => void;
  alignObject: (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  runShapeBuilder: (op: 'union' | 'subtract' | 'intersect' | 'exclude') => void;
  applyPathAsMask: () => void;
  removeMask: () => void;
  applyGradientFill: (type: 'linear' | 'radial', c1: string, c2: string, angle: number) => void;
  gradAngleRef: React.MutableRefObject<number>;
  pushHistory: () => void;
  layerLabel: (obj: any, index: number) => string;
  onReplaceImage: (file: File) => void;
  onEditPhoto: () => void;
  // Top-left of the artboard the selection sits on: X/Y are shown
  // relative to it, like every design app.
  artboardOrigin?: { x: number; y: number };
}

// Range sliders commit one undo step when the drag ends — on mouse, touch,
// pen and keyboard alike (iPad has no mouseup).
const commitHandlers = (commit: () => void) => ({
  onPointerUp: commit,
  onKeyUp: commit,
  onTouchEnd: commit,
});

// A precise numeric input: types/pastes/arrow-keys any decimal (and
// negative, when allowed) value, commits on blur/Enter, and never
// silently rounds what the user typed — the properties panel used to
// only expose sliders for several of these, which round to whole numbers
// and can't express e.g. tracking of 12.75 or a line height of 17.5.
function PrecisionNumberInput({
  value,
  onCommit,
  min,
  max,
  step = 1,
  disabled,
  suffix,
  placeholder,
  className = '',
}: {
  value: number | undefined;
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  suffix?: string;
  placeholder?: string;
  className?: string;
}) {
  const display = value === undefined ? '' : String(Math.round(value * 100) / 100);
  const commit = (raw: string, el: HTMLInputElement) => {
    if (raw.trim() === '') return;
    let n = parseFloat(raw);
    if (isNaN(n)) {
      el.value = display;
      return;
    }
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onCommit(n);
    el.value = String(n);
  };
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        defaultValue={display}
        key={display}
        onBlur={(e) => commit(e.target.value, e.target)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const current = value ?? 0;
            const next = current + (e.key === 'ArrowUp' ? step : -step);
            commit(String(next), e.target as HTMLInputElement);
          }
        }}
        className={`w-full text-xs border rounded px-2 py-1 text-right disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink ${className}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-mt-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function PropertiesPanel({
  activeTool,
  selected,
  unit,
  layers,
  maskTargetId,
  setMaskTargetId,
  applyProp,
  applyCharProp,
  getTextPropValue,
  applyExactSize,
  toggleLockRatio,
  alignObject,
  groupSelected,
  ungroupSelected,
  runShapeBuilder,
  applyPathAsMask,
  removeMask,
  applyGradientFill,
  gradAngleRef,
  pushHistory,
  layerLabel,
  onReplaceImage,
  onEditPhoto,
  artboardOrigin = { x: 0, y: 0 },
}: Props) {
  const kbd = 'bg-mt-surface2 dark:bg-mt-surface2 border dark:border-mt-border rounded px-1';

  if (activeTool === 'pen') {
    return (
      <p className="text-xs text-mt-muted dark:text-mt-muted">
        Pen tool active. Click to place anchors, click + drag for curved handles. Hold{' '}
        <kbd className={kbd}>Alt/Option</kbd> while dragging a handle to
        break it (curve one side only). Press <kbd className={kbd}>Enter</kbd>{' '}
        to finish an open path, or click the first anchor to close it.{' '}
        <kbd className={kbd}>Esc</kbd> cancels the current path.
      </p>
    );
  }

  if (activeTool === 'direct' && (!selected || selected.__isAnchorHandle)) {
    if (selected?.__isAnchorHandle && !selected.__isMidpointMarker) {
      return (
        <p className="text-xs text-mt-muted dark:text-mt-muted">
          {selected.__isHandlePoint ? 'Curve handle selected. Drag to reshape the curve.' : (
            <>
              Anchor point selected. Drag to move it,{' '}
              <kbd className={kbd}>Alt/Option</kbd>+click it to toggle
              corner/smooth, or press <kbd className={kbd}>Delete</kbd> to
              remove it.
            </>
          )}
        </p>
      );
    }
    return (
      <p className="text-xs text-mt-muted dark:text-mt-muted">
        Direct Selection active. Select a vector path to edit it: drag an anchor (blue outline) or a
        curve handle (filled blue) to reshape it. <kbd className={kbd}>Alt/Option</kbd>+click
        an anchor to toggle it between a sharp corner and a smooth curve point. Click a green square on a
        segment to add a new anchor there. Select an anchor and press{' '}
        <kbd className={kbd}>Delete</kbd> to remove it.
      </p>
    );
  }

  if (activeTool === 'pan') {
    return (
      <p className="text-xs text-mt-muted dark:text-mt-muted">
        Hand tool active. Click and drag anywhere on the pasteboard to pan around the canvas.
      </p>
    );
  }

  if (activeTool === 'artboard') {
    return (
      <p className="text-xs text-mt-muted dark:text-mt-muted">
        Artboard tool active. Drag on the pasteboard to create a new artboard, or click and drag an
        existing one to move/resize it. Rename, duplicate, delete, and export artboards from the{' '}
        <span className="font-medium text-mt-muted dark:text-mt-muted">Artboards</span> panel.
      </p>
    );
  }

  if (isDrawTool(activeTool)) {
    return (
      <p className="text-xs text-mt-muted dark:text-mt-muted">
        {TOOL_LABELS[activeTool as DrawTool]} tool active. Click and drag on the canvas to draw. Hold{' '}
        <kbd className={kbd}>Shift</kbd> to constrain proportions,{' '}
        <kbd className={kbd}>Alt/Option</kbd> to draw from the center.{' '}
        <kbd className={kbd}>Esc</kbd> cancels.
      </p>
    );
  }

  if (!selected) {
    return <p className="text-xs text-mt-faint dark:text-mt-muted">Select an object to edit its properties.</p>;
  }

  const isMultiple = selected.type === 'activeSelection';
  const isText = selected.type === 'i-text' || selected.type === 'text' || selected.type === 'textbox';
  const isImage = selected.type === 'image';
  const isGroup = selected.type === 'group';
  const isPath = !!selected.isVectorPath;
  const hasFillStroke = !isImage;
  const isLocked = !!selected.locked;

  const currentFill = selected.fill;
  const isGradientFill = !!(currentFill && typeof currentFill === 'object' && (currentFill as any).type);
  const isNoneFill = currentFill === '' || currentFill === null || currentFill === undefined;
  const gradType: 'linear' | 'radial' = isGradientFill ? (currentFill as any).type : 'linear';
  const gradStops =
    isGradientFill && (currentFill as any).colorStops
      ? (currentFill as any).colorStops
      : [
          { offset: 0, color: '#3FA9E8' },
          { offset: 1, color: '#7ED33E' },
        ];

  const pixelSize = getObjectPixelSize(selected);
  const imageLayerOptions = layers.filter((o) => o.type === 'image');

  return (
    <div className="flex flex-col gap-4">
      {isLocked && (
        <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded px-2 py-1.5">
          <Lock size={12} />
          Locked — unlock to edit (Ctrl/Cmd+L)
        </div>
      )}

      {(
        <div
          key={`${selected.__uid || 'obj'}-${unit}-${Math.round((selected.left ?? 0) * 100)}-${Math.round((selected.top ?? 0) * 100)}-${Math.round(pixelSize.w * 100)}-${Math.round(pixelSize.h * 100)}-${Math.round((selected.angle || 0) * 100)}`}
          className="border rounded-lg p-3 bg-mt-surface2 dark:bg-mt-surface dark:border-mt-border flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-mt-muted dark:text-mt-muted">Transform</p>
            <button
              type="button"
              onClick={toggleLockRatio}
              title={selected.__lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              className={`hover:text-mt-ink dark:hover:text-mt-ink ${selected.__lockRatio ? 'text-blue-600 dark:text-blue-400' : 'text-mt-faint'}`}
            >
              {selected.__lockRatio ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-mt-muted dark:text-mt-muted block mb-0.5">X ({unit})</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatUnit((selected.left ?? 0) - artboardOrigin.x, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    const next = unitToPx(val, unit) + artboardOrigin.x;
                    if (Math.abs(next - (selected.left ?? 0)) > 0.001) applyProp({ left: next });
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
              />
            </div>
            <div>
              <label className="text-[10px] text-mt-muted dark:text-mt-muted block mb-0.5">Y ({unit})</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatUnit((selected.top ?? 0) - artboardOrigin.y, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    const next = unitToPx(val, unit) + artboardOrigin.y;
                    if (Math.abs(next - (selected.top ?? 0)) > 0.001) applyProp({ top: next });
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
              />
            </div>
            <div>
              <label className="text-[10px] text-mt-muted dark:text-mt-muted block mb-0.5">W ({unit})</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatUnit(pixelSize.w, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0 && e.target.value !== formatUnit(pixelSize.w, unit)) applyExactSize(unitToPx(val, unit), null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
              />
            </div>
            <div>
              <label className="text-[10px] text-mt-muted dark:text-mt-muted block mb-0.5">H ({unit})</label>
              <input
                type="text"
                disabled={isLocked || selected.type === 'textbox'}
                title={selected.type === 'textbox' ? 'Height follows the wrapped text automatically' : undefined}
                defaultValue={formatUnit(pixelSize.h, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0 && e.target.value !== formatUnit(pixelSize.h, unit)) applyExactSize(null, unitToPx(val, unit));
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-mt-muted dark:text-mt-muted block mb-0.5">Rotation (°)</label>
            <input
              type="text"
              disabled={isLocked}
              defaultValue={(Math.round((selected.angle || 0) * 10) / 10).toString()}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && Math.abs((((val % 360) + 360) % 360) - (selected.angle || 0)) > 0.01) applyProp({ angle: ((val % 360) + 360) % 360 });
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-mt-muted dark:text-mt-muted mb-2">{isMultiple ? 'Align to each other' : 'Align to page'}</p>
        <div className="grid grid-cols-3 gap-1">
          <button onClick={() => alignObject('left')} className="text-xs border rounded py-1 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">⟸</button>
          <button onClick={() => alignObject('centerH')} className="text-xs border rounded py-1 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">↔</button>
          <button onClick={() => alignObject('right')} className="text-xs border rounded py-1 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">⟹</button>
          <button onClick={() => alignObject('top')} className="text-xs border rounded py-1 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">⟰</button>
          <button onClick={() => alignObject('centerV')} className="text-xs border rounded py-1 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">↕</button>
          <button onClick={() => alignObject('bottom')} className="text-xs border rounded py-1 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">⟱</button>
        </div>
      </div>

      {isMultiple && (
        <button onClick={groupSelected} className="text-xs border rounded py-2 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">
          Group Selection (Cmd+G)
        </button>
      )}

      {isMultiple && (
        <div className="border rounded-lg p-2.5 bg-purple-50/50 dark:bg-purple-950/20 dark:border-mt-border flex flex-col gap-2">
          <p className="text-xs font-semibold text-mt-ink dark:text-mt-ink">Shape Builder</p>
          <p className="text-[10px] text-mt-muted dark:text-mt-muted">
            Combines the selected shapes into one real, editable vector path.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => runShapeBuilder('union')} className="text-xs border rounded py-1.5 hover:bg-mt-surface dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">Unite</button>
            <button onClick={() => runShapeBuilder('subtract')} className="text-xs border rounded py-1.5 hover:bg-mt-surface dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">Subtract</button>
            <button onClick={() => runShapeBuilder('intersect')} className="text-xs border rounded py-1.5 hover:bg-mt-surface dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">Intersect</button>
            <button onClick={() => runShapeBuilder('exclude')} className="text-xs border rounded py-1.5 hover:bg-mt-surface dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">Exclude</button>
          </div>
        </div>
      )}
      {isGroup && (
        <button onClick={ungroupSelected} className="text-xs border rounded py-2 hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">
          Ungroup (Cmd+Shift+G)
        </button>
      )}

      {isPath && (
        <div className="border rounded-lg p-2.5 bg-blue-50/50 dark:bg-blue-950/20 dark:border-mt-border flex flex-col gap-2">
          <p className="text-xs font-semibold text-mt-ink dark:text-mt-ink flex items-center gap-1.5">
            <Scissors size={12} /> Path → Mask
          </p>
          <p className="text-[10px] text-mt-muted dark:text-mt-muted">
            Press <kbd className={`${kbd} bg-mt-surface dark:bg-mt-surface2`}>A</kbd> to switch to Direct Selection
            and drag anchors to reshape this path.
          </p>
          {imageLayerOptions.length === 0 ? (
            <p className="text-[10px] text-mt-faint dark:text-mt-muted">Upload an image to mask it with this path.</p>
          ) : (
            <>
              <select
                value={maskTargetId}
                onChange={(e) => setMaskTargetId(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
              >
                <option value="">Choose target image…</option>
                {imageLayerOptions.map((img, i) => (
                  <option key={img.__id || i} value={img.__id}>
                    {layerLabel(img, layers.indexOf(img))}
                  </option>
                ))}
              </select>
              <button
                onClick={applyPathAsMask}
                disabled={!maskTargetId}
                className="text-xs bg-brand-gradient text-white rounded py-1.5 font-semibold disabled:opacity-40"
              >
                Apply as Mask (Shift+Enter)
              </button>
            </>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted">Opacity</label>
          <input
            key={`opacity-${selected.__uid || 'obj'}-${Math.round((selected.opacity ?? 1) * 100)}`}
            type="text"
            inputMode="numeric"
            disabled={isLocked}
            defaultValue={Math.round((selected.opacity ?? 1) * 100)}
            onBlur={(e) => {
              const val = Math.max(0, Math.min(100, parseFloat(e.target.value)));
              if (!isNaN(val)) {
                applyProp({ opacity: val / 100 });
                e.target.value = String(val);
              } else {
                e.target.value = String(Math.round((selected.opacity ?? 1) * 100));
              }
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="w-14 text-xs border rounded px-1.5 py-0.5 text-right disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          disabled={isLocked}
          value={Math.round((selected.opacity ?? 1) * 100)}
          onChange={(e) => applyProp({ opacity: Number(e.target.value) / 100 }, false)}
          {...commitHandlers(pushHistory)}
          className="w-full disabled:opacity-40"
        />
      </div>

      {isText && (
        <TextControls
          selected={selected}
          isLocked={isLocked}
          applyProp={applyProp}
          applyCharProp={applyCharProp}
          getTextPropValue={getTextPropValue}
          pushHistory={pushHistory}
        />
      )}

      {!isText && !isImage && hasFillStroke && (
        <>
          <div>
            <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Fill Type</label>
            <select
              value={isGradientFill ? gradType : isNoneFill ? 'none' : 'solid'}
              disabled={isLocked}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'none') {
                  applyProp({ fill: '' });
                } else if (v === 'solid') {
                  applyProp({ fill: typeof selected.fill === 'string' && selected.fill ? selected.fill : '#3FA9E8' });
                } else {
                  applyGradientFill(
                    v as 'linear' | 'radial',
                    gradStops[0]?.color || '#3FA9E8',
                    gradStops[1]?.color || '#7ED33E',
                    gradAngleRef.current
                  );
                }
              }}
              className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40 dark:bg-mt-surface dark:border-mt-border dark:text-mt-ink"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="linear">Linear Gradient</option>
              <option value="radial">Radial Gradient</option>
            </select>
          </div>

          {isGradientFill ? (
            <div className="border rounded-lg p-2.5 bg-mt-surface2 dark:bg-mt-surface dark:border-mt-border flex flex-col gap-2">
              <GradientPresetPicker
                disabled={isLocked}
                onPick={(p) => applyGradientFill(gradType, p.c1, p.c2, gradAngleRef.current)}
              />
              <div className="grid grid-cols-2 gap-2">
                <ColorSwatchPicker
                  label="Color 1"
                  disabled={isLocked}
                  value={gradStops[0]?.color || '#3FA9E8'}
                  onChange={(c) => {
                    applyGradientFill(gradType, c || '#3FA9E8', gradStops[1]?.color || '#7ED33E', gradAngleRef.current);
                    pushHistory();
                  }}
                />
                <ColorSwatchPicker
                  label="Color 2"
                  disabled={isLocked}
                  value={gradStops[1]?.color || '#7ED33E'}
                  onChange={(c) => {
                    applyGradientFill(gradType, gradStops[0]?.color || '#3FA9E8', c || '#7ED33E', gradAngleRef.current);
                    pushHistory();
                  }}
                />
              </div>
              {gradType === 'linear' && (
                <div>
                  <label className="text-[10px] text-mt-muted dark:text-mt-muted block mb-1">Angle</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    disabled={isLocked}
                    defaultValue={gradAngleRef.current}
                    onChange={(e) => {
                      gradAngleRef.current = Number(e.target.value);
                      applyGradientFill('linear', gradStops[0]?.color || '#3FA9E8', gradStops[1]?.color || '#7ED33E', gradAngleRef.current);
                    }}
                    className="w-full disabled:opacity-40"
                  />
                </div>
              )}
            </div>
          ) : !isNoneFill ? (
            <ColorSwatchPicker
              label="Fill Color"
              allowNone
              disabled={isLocked}
              value={typeof selected.fill === 'string' && selected.fill ? selected.fill : '#000000'}
              onChange={(c) => {
                applyProp({ fill: c === null ? '' : c });
                pushHistory();
              }}
            />
          ) : null}

          <ColorSwatchPicker
            label="Stroke Color"
            allowNone
            disabled={isLocked}
            value={selected.stroke || null}
            onChange={(c) => {
              applyProp({ stroke: c === null ? '' : c });
              pushHistory();
            }}
          />

          <div>
            <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Stroke Width ({selected.strokeWidth || 0})</label>
            <input
              type="range"
              min={0}
              max={40}
              disabled={isLocked}
              value={selected.strokeWidth || 0}
              onChange={(e) => applyProp({ strokeWidth: Number(e.target.value), strokeUniform: true, ...(selected.stroke ? {} : { stroke: '#09090B' }) }, false)}
              {...commitHandlers(pushHistory)}
              className="w-full disabled:opacity-40"
            />
          </div>

          {selected.type === 'rect' && (
            <div>
              <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Corner Radius ({selected.rx || 0})</label>
              <input
                type="range"
                min={0}
                max={100}
                disabled={isLocked}
                value={selected.rx || 0}
                onChange={(e) => applyProp({ rx: Number(e.target.value), ry: Number(e.target.value) }, false)}
                {...commitHandlers(pushHistory)}
                className="w-full disabled:opacity-40"
              />
            </div>
          )}
        </>
      )}

      {isImage && (
        <>
          <button
            disabled={isLocked}
            onClick={onEditPhoto}
            className="text-xs font-semibold border rounded py-1.5 hover:bg-mt-surface2 disabled:opacity-40 bg-mt-accent text-white hover:bg-mt-accent/90 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-mt-border"
          >
            Edit Photo
          </button>
          <p className="text-[10px] text-mt-faint dark:text-mt-muted -mt-2">
            Opens the Photo Editor workspace for crop, adjustments, pixel selection/erase and
            background removal — Apply syncs the result back into this exact layer.
          </p>
          <label
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold border rounded py-1.5 cursor-pointer hover:bg-mt-surface2 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2 ${
              isLocked ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            Replace Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onReplaceImage(file);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-[10px] text-mt-faint dark:text-mt-muted -mt-2">
            Swaps this layer's photo in place — same position, size and crop. The new image is scaled
            proportionally to fill the frame, never stretched.
          </p>
          <div className="grid grid-cols-2 gap-1">
            <button disabled={isLocked} onClick={() => applyProp({ flipX: !selected.flipX })} className="text-xs border rounded py-1 hover:bg-mt-surface2 disabled:opacity-40 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">
              Flip H
            </button>
            <button disabled={isLocked} onClick={() => applyProp({ flipY: !selected.flipY })} className="text-xs border rounded py-1 hover:bg-mt-surface2 disabled:opacity-40 dark:border-mt-border dark:text-mt-ink dark:hover:bg-mt-surface2">
              Flip V
            </button>
          </div>
          {selected.clipPath ? (
            <button onClick={removeMask} className="text-xs border border-red-200 text-red-600 rounded py-1.5 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30">
              Remove Mask
            </button>
          ) : (
            <p className="text-[10px] text-mt-faint dark:text-mt-muted">
              Draw a closed path with the Pen tool, then apply it as a mask from the path's properties.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Character / Paragraph typography controls, split the way a real
// desktop design app splits them:
//  - Character: Font, Style (weight/italic), Size, Color, Underline,
//    Baseline Shift — apply to the exact highlighted characters when
//    there's a real text selection (via applyCharProp/Fabric's
//    setSelectionStyles), or the whole object otherwise.
//  - Paragraph: Alignment, Tracking, Line Height — Fabric has no
//    per-character support for these (charSpacing and lineHeight are
//    inherently object-wide in this engine), which is exactly how a real
//    app's paragraph properties behave: the whole paragraph, never a
//    sub-selection, and this app's one-Textbox-per-paragraph model means
//    "the object" and "the paragraph" are the same thing.
// ---------------------------------------------------------------------
function TextControls({
  selected,
  isLocked,
  applyProp,
  applyCharProp,
  getTextPropValue,
  pushHistory,
}: {
  selected: any;
  isLocked: boolean;
  applyProp: Props['applyProp'];
  applyCharProp: Props['applyCharProp'];
  getTextPropValue: Props['getTextPropValue'];
  pushHistory: () => void;
}) {
  // Re-render whenever the caret/selection inside this text object
  // changes — the parent already bumps its own "selVersion" state on
  // every relevant Fabric event, which re-renders this whole panel, so
  // reading fresh values directly off `selected` on every render (rather
  // than caching them in local state) is what keeps this in sync.
  const font = getTextPropValue(selected, 'fontFamily');
  const size = getTextPropValue(selected, 'fontSize');
  const weight = getTextPropValue(selected, 'fontWeight');
  const style = getTextPropValue(selected, 'fontStyle');
  const underline = getTextPropValue(selected, 'underline');
  const fill = getTextPropValue(selected, 'fill');
  const baseline = getTextPropValue(selected, 'deltaY');

  const isBold = !weight.mixed && (weight.value === 'bold' || (typeof weight.value === 'number' && weight.value >= 600));
  const isItalic = !style.mixed && style.value === 'italic';
  const isUnderline = !underline.mixed && !!underline.value;

  return (
    <>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-mt-faint dark:text-mt-muted mb-2">Character</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Font</label>
            <FontPicker
              value={font.mixed ? undefined : font.value || 'Arial'}
              mixed={font.mixed}
              disabled={isLocked}
              onChange={(family) => applyCharProp({ fontFamily: family })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Size</label>
              <PrecisionNumberInput
                value={size.mixed ? undefined : size.value ?? 40}
                min={1}
                max={2000}
                step={1}
                disabled={isLocked}
                placeholder={size.mixed ? 'Mixed' : undefined}
                onCommit={(n) => applyCharProp({ fontSize: n })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Baseline</label>
              <PrecisionNumberInput
                value={baseline.mixed ? undefined : baseline.value ?? 0}
                min={-500}
                max={500}
                step={1}
                disabled={isLocked}
                placeholder={baseline.mixed ? 'Mixed' : undefined}
                onCommit={(n) => applyCharProp({ deltaY: n })}
              />
            </div>
          </div>

          <ColorSwatchPicker
            label="Color"
            disabled={isLocked}
            value={typeof fill.value === 'string' ? fill.value : '#000000'}
            onChange={(c) => {
              applyCharProp({ fill: c || '#000000' });
              pushHistory();
            }}
          />

          <div className="flex gap-1">
            <button
              disabled={isLocked}
              onClick={() => applyCharProp({ fontWeight: isBold ? 'normal' : 'bold' })}
              title="Bold"
              className={`flex-1 text-xs font-bold border rounded py-1 disabled:opacity-40 dark:border-mt-border dark:text-mt-ink ${isBold ? 'bg-mt-surface2 dark:bg-mt-surface2' : 'hover:bg-mt-surface2 dark:hover:bg-mt-surface2'}`}
            >
              B
            </button>
            <button
              disabled={isLocked}
              onClick={() => applyCharProp({ fontStyle: isItalic ? 'normal' : 'italic' })}
              title="Italic"
              className={`flex-1 text-xs italic border rounded py-1 disabled:opacity-40 dark:border-mt-border dark:text-mt-ink ${isItalic ? 'bg-mt-surface2 dark:bg-mt-surface2' : 'hover:bg-mt-surface2 dark:hover:bg-mt-surface2'}`}
            >
              I
            </button>
            <button
              disabled={isLocked}
              onClick={() => applyCharProp({ underline: !isUnderline })}
              title="Underline"
              className={`flex-1 text-xs underline border rounded py-1 disabled:opacity-40 dark:border-mt-border dark:text-mt-ink ${isUnderline ? 'bg-mt-surface2 dark:bg-mt-surface2' : 'hover:bg-mt-surface2 dark:hover:bg-mt-surface2'}`}
            >
              U
            </button>
          </div>
          <p className="text-[10px] text-mt-faint dark:text-mt-muted -mt-1">
            Highlight part of the text (double-click to enter editing) to format only that selection —
            with nothing selected, changes apply to the whole text box.
          </p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-mt-faint dark:text-mt-muted mb-2">Paragraph</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Alignment</label>
            <div className="grid grid-cols-4 gap-1">
              {['left', 'center', 'right', 'justify'].map((a) => (
                <button
                  key={a}
                  disabled={isLocked}
                  onClick={() => applyProp({ textAlign: a })}
                  className={`text-xs border rounded py-1 disabled:opacity-40 dark:border-mt-border dark:text-mt-ink ${selected.textAlign === a ? 'bg-mt-surface2 dark:bg-mt-surface2' : 'hover:bg-mt-surface2 dark:hover:bg-mt-surface2'}`}
                >
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Tracking</label>
              <PrecisionNumberInput
                value={selected.charSpacing || 0}
                min={-500}
                max={2000}
                step={5}
                disabled={isLocked}
                onCommit={(n) => applyProp({ charSpacing: n })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-mt-muted dark:text-mt-muted block mb-1">Leading</label>
              <PrecisionNumberInput
                value={selected.lineHeight ?? 1.16}
                min={0.1}
                max={10}
                step={0.05}
                disabled={isLocked}
                onCommit={(n) => applyProp({ lineHeight: n })}
              />
            </div>
          </div>
          <button
            disabled={isLocked}
            onClick={() => applyProp({ lineHeight: 1.16 })}
            className="text-[10px] text-mt-muted dark:text-mt-muted hover:text-mt-ink dark:hover:text-mt-ink -mt-2 self-start disabled:opacity-40"
          >
            Reset leading to Auto (1.16)
          </button>
        </div>
      </div>
    </>
  );
}
