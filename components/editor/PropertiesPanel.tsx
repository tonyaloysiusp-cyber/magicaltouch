'use client';

import { Lock, Unlock, Scissors } from 'lucide-react';
import { isDrawTool, TOOL_LABELS, DrawTool, DocUnit, ToolMode } from '@/lib/editor/types';
import { formatUnit, unitToPx, getObjectPixelSize } from '@/lib/editor/units';
import { GOOGLE_FONTS } from '@/lib/editor/googleFonts';

// 'Classic' (Arial, Times New Roman, ...) first since that's what most
// people look for first, then the rest in the order they're defined.
const FONT_CATEGORIES = Array.from(new Set(GOOGLE_FONTS.map((f) => f.category))).sort((a, b) =>
  a === 'Classic' ? -1 : b === 'Classic' ? 1 : 0
);

interface Props {
  activeTool: ToolMode;
  selected: any;
  unit: DocUnit;
  layers: any[];
  maskTargetId: string;
  setMaskTargetId: (id: string) => void;
  applyProp: (props: Record<string, any>, record?: boolean) => void;
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
}

export function PropertiesPanel({
  activeTool,
  selected,
  unit,
  layers,
  maskTargetId,
  setMaskTargetId,
  applyProp,
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
}: Props) {
  if (activeTool === 'pen') {
    return (
      <p className="text-xs text-gray-500">
        Pen tool active. Click to place anchors, click + drag for curved handles. Hold{' '}
        <kbd className="bg-gray-100 border rounded px-1">Alt/Option</kbd> while dragging a handle to
        break it (curve one side only). Press <kbd className="bg-gray-100 border rounded px-1">Enter</kbd>{' '}
        to finish an open path, or click the first anchor to close it.{' '}
        <kbd className="bg-gray-100 border rounded px-1">Esc</kbd> cancels the current path.
      </p>
    );
  }

  if (activeTool === 'direct' && (!selected || selected.__isAnchorHandle)) {
    if (selected?.__isAnchorHandle && !selected.__isMidpointMarker) {
      return (
        <p className="text-xs text-gray-500">
          {selected.__isHandlePoint ? 'Curve handle selected. Drag to reshape the curve.' : (
            <>
              Anchor point selected. Drag to move it,{' '}
              <kbd className="bg-gray-100 border rounded px-1">Alt/Option</kbd>+click it to toggle
              corner/smooth, or press <kbd className="bg-gray-100 border rounded px-1">Delete</kbd> to
              remove it.
            </>
          )}
        </p>
      );
    }
    return (
      <p className="text-xs text-gray-500">
        Direct Selection active. Select a vector path to edit it: drag an anchor (blue outline) or a
        curve handle (filled blue) to reshape it. <kbd className="bg-gray-100 border rounded px-1">Alt/Option</kbd>+click
        an anchor to toggle it between a sharp corner and a smooth curve point. Click a green square on a
        segment to add a new anchor there. Select an anchor and press{' '}
        <kbd className="bg-gray-100 border rounded px-1">Delete</kbd> to remove it.
      </p>
    );
  }

  if (activeTool === 'pan') {
    return (
      <p className="text-xs text-gray-500">
        Hand tool active. Click and drag anywhere on the pasteboard to pan around the canvas.
      </p>
    );
  }

  if (activeTool === 'artboard') {
    return (
      <p className="text-xs text-gray-500">
        Artboard tool active. Drag on the pasteboard to create a new artboard, or click and drag an
        existing one to move/resize it. Rename, duplicate, delete, and export artboards from the{' '}
        <span className="font-medium text-gray-600">Artboards</span> panel.
      </p>
    );
  }

  if (isDrawTool(activeTool)) {
    return (
      <p className="text-xs text-gray-500">
        {TOOL_LABELS[activeTool as DrawTool]} tool active. Click and drag on the canvas to draw. Hold{' '}
        <kbd className="bg-gray-100 border rounded px-1">Shift</kbd> to constrain proportions,{' '}
        <kbd className="bg-gray-100 border rounded px-1">Alt/Option</kbd> to draw from the center.{' '}
        <kbd className="bg-gray-100 border rounded px-1">Esc</kbd> cancels.
      </p>
    );
  }

  if (!selected) {
    return <p className="text-xs text-gray-400">Select an object to edit its properties.</p>;
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
        <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1.5">
          <Lock size={12} />
          Locked — unlock to edit (Ctrl/Cmd+L)
        </div>
      )}

      {!isMultiple && (
        <div
          key={`${selected.__uid || 'obj'}-${unit}`}
          className="border rounded-lg p-3 bg-gray-50 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Transform</p>
            <button
              type="button"
              onClick={toggleLockRatio}
              title={selected.__lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
              className={`hover:text-gray-700 ${selected.__lockRatio ? 'text-blue-600' : 'text-gray-400'}`}
            >
              {selected.__lockRatio ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">X ({unit})</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatUnit(selected.left ?? 0, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) applyProp({ left: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Y ({unit})</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatUnit(selected.top ?? 0, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) applyProp({ top: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">W ({unit})</label>
              <input
                type="text"
                disabled={isLocked}
                defaultValue={formatUnit(pixelSize.w, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) applyExactSize(unitToPx(val, unit), null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">H ({unit})</label>
              <input
                type="text"
                disabled={isLocked || selected.type === 'textbox'}
                title={selected.type === 'textbox' ? 'Height follows the wrapped text automatically' : undefined}
                defaultValue={formatUnit(pixelSize.h, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) applyExactSize(null, unitToPx(val, unit));
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Rotation (°)</label>
            <input
              type="text"
              disabled={isLocked}
              defaultValue={Math.round(selected.angle || 0).toString()}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) applyProp({ angle: val });
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Align to Canvas</p>
        <div className="grid grid-cols-3 gap-1">
          <button onClick={() => alignObject('left')} className="text-xs border rounded py-1 hover:bg-gray-50">⟸</button>
          <button onClick={() => alignObject('centerH')} className="text-xs border rounded py-1 hover:bg-gray-50">↔</button>
          <button onClick={() => alignObject('right')} className="text-xs border rounded py-1 hover:bg-gray-50">⟹</button>
          <button onClick={() => alignObject('top')} className="text-xs border rounded py-1 hover:bg-gray-50">⟰</button>
          <button onClick={() => alignObject('centerV')} className="text-xs border rounded py-1 hover:bg-gray-50">↕</button>
          <button onClick={() => alignObject('bottom')} className="text-xs border rounded py-1 hover:bg-gray-50">⟱</button>
        </div>
      </div>

      {isMultiple && (
        <button onClick={groupSelected} className="text-xs border rounded py-2 hover:bg-gray-50">
          Group Selection (Cmd+G)
        </button>
      )}

      {isMultiple && (
        <div className="border rounded-lg p-2.5 bg-purple-50/50 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-700">Shape Builder</p>
          <p className="text-[10px] text-gray-500">
            Combines the selected shapes into one real, editable vector path.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => runShapeBuilder('union')} className="text-xs border rounded py-1.5 hover:bg-white">Unite</button>
            <button onClick={() => runShapeBuilder('subtract')} className="text-xs border rounded py-1.5 hover:bg-white">Subtract</button>
            <button onClick={() => runShapeBuilder('intersect')} className="text-xs border rounded py-1.5 hover:bg-white">Intersect</button>
            <button onClick={() => runShapeBuilder('exclude')} className="text-xs border rounded py-1.5 hover:bg-white">Exclude</button>
          </div>
        </div>
      )}
      {isGroup && (
        <button onClick={ungroupSelected} className="text-xs border rounded py-2 hover:bg-gray-50">
          Ungroup (Cmd+Shift+G)
        </button>
      )}

      {isPath && (
        <div className="border rounded-lg p-2.5 bg-blue-50/50 flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Scissors size={12} /> Path → Mask
          </p>
          <p className="text-[10px] text-gray-500">
            Press <kbd className="bg-white border rounded px-1">A</kbd> to switch to Direct Selection
            and drag anchors to reshape this path.
          </p>
          {imageLayerOptions.length === 0 ? (
            <p className="text-[10px] text-gray-400">Upload an image to mask it with this path.</p>
          ) : (
            <>
              <select
                value={maskTargetId}
                onChange={(e) => setMaskTargetId(e.target.value)}
                className="w-full text-xs border rounded px-2 py-1"
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
          <label className="text-xs font-semibold text-gray-500">Opacity</label>
          <input
            key={`opacity-${selected.__uid || 'obj'}`}
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
            className="w-14 text-xs border rounded px-1.5 py-0.5 text-right disabled:opacity-40"
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          disabled={isLocked}
          value={Math.round((selected.opacity ?? 1) * 100)}
          onChange={(e) => applyProp({ opacity: Number(e.target.value) / 100 }, false)}
          onMouseUp={() => pushHistory()}
          className="w-full disabled:opacity-40"
        />
      </div>

      {isText && (
        <>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Font</label>
            <select
              value={selected.fontFamily || 'Arial'}
              disabled={isLocked}
              onChange={(e) => applyProp({ fontFamily: e.target.value })}
              className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
            >
              {FONT_CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {GOOGLE_FONTS.filter((f) => f.category === cat).map((f) => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Size ({selected.fontSize || 40})</label>
            <input
              type="range"
              min={8}
              max={200}
              disabled={isLocked}
              value={selected.fontSize || 40}
              onChange={(e) => applyProp({ fontSize: Number(e.target.value) }, false)}
              onMouseUp={() => pushHistory()}
              className="w-full disabled:opacity-40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Color</label>
            <input
              type="color"
              disabled={isLocked}
              value={selected.fill || '#000000'}
              onChange={(e) => applyProp({ fill: e.target.value }, false)}
              onBlur={() => pushHistory()}
              className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
            />
          </div>

          <div className="flex gap-1">
            <button
              disabled={isLocked}
              onClick={() => applyProp({ fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`flex-1 text-xs border rounded py-1 disabled:opacity-40 ${selected.fontWeight === 'bold' ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
            >
              B
            </button>
            <button
              disabled={isLocked}
              onClick={() => applyProp({ fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 text-xs border rounded py-1 italic disabled:opacity-40 ${selected.fontStyle === 'italic' ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
            >
              I
            </button>
            <button
              disabled={isLocked}
              onClick={() => applyProp({ underline: !selected.underline })}
              className={`flex-1 text-xs border rounded py-1 underline disabled:opacity-40 ${selected.underline ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
            >
              U
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Alignment</label>
            <div className="grid grid-cols-4 gap-1">
              {['left', 'center', 'right', 'justify'].map((a) => (
                <button
                  key={a}
                  disabled={isLocked}
                  onClick={() => applyProp({ textAlign: a })}
                  className={`text-xs border rounded py-1 disabled:opacity-40 ${selected.textAlign === a ? 'bg-gray-200' : 'hover:bg-gray-50'}`}
                >
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Letter Spacing ({selected.charSpacing || 0})</label>
            <input
              type="range"
              min={-100}
              max={800}
              disabled={isLocked}
              value={selected.charSpacing || 0}
              onChange={(e) => applyProp({ charSpacing: Number(e.target.value) }, false)}
              onMouseUp={() => pushHistory()}
              className="w-full disabled:opacity-40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              Line Height ({(selected.lineHeight || 1.16).toFixed(2)})
            </label>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              disabled={isLocked}
              value={selected.lineHeight || 1.16}
              onChange={(e) => applyProp({ lineHeight: Number(e.target.value) }, false)}
              onMouseUp={() => pushHistory()}
              className="w-full disabled:opacity-40"
            />
          </div>
        </>
      )}

      {!isText && !isImage && hasFillStroke && (
        <>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Fill Type</label>
            <select
              value={isGradientFill ? gradType : 'solid'}
              disabled={isLocked}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'solid') {
                  applyProp({ fill: typeof selected.fill === 'string' ? selected.fill : '#3FA9E8' });
                } else {
                  applyGradientFill(
                    v as 'linear' | 'radial',
                    gradStops[0]?.color || '#3FA9E8',
                    gradStops[1]?.color || '#7ED33E',
                    gradAngleRef.current
                  );
                }
              }}
              className="w-full text-xs border rounded px-2 py-1 disabled:opacity-40"
            >
              <option value="solid">Solid</option>
              <option value="linear">Linear Gradient</option>
              <option value="radial">Radial Gradient</option>
            </select>
          </div>

          {isGradientFill ? (
            <div className="border rounded-lg p-2.5 bg-gray-50 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Color 1</label>
                  <input
                    type="color"
                    disabled={isLocked}
                    value={gradStops[0]?.color || '#3FA9E8'}
                    onChange={(e) =>
                      applyGradientFill(gradType, e.target.value, gradStops[1]?.color || '#7ED33E', gradAngleRef.current)
                    }
                    className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Color 2</label>
                  <input
                    type="color"
                    disabled={isLocked}
                    value={gradStops[1]?.color || '#7ED33E'}
                    onChange={(e) =>
                      applyGradientFill(gradType, gradStops[0]?.color || '#3FA9E8', e.target.value, gradAngleRef.current)
                    }
                    className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>
              {gradType === 'linear' && (
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Angle</label>
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
              <p className="text-[10px] text-gray-400">
                Gradient stops are fixed at 2 colors (start/end) in this version. On-canvas
                draggable gradient handles are not implemented yet.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Fill Color</label>
              <input
                type="color"
                disabled={isLocked}
                value={typeof selected.fill === 'string' ? selected.fill : '#000000'}
                onChange={(e) => applyProp({ fill: e.target.value }, false)}
                onBlur={() => pushHistory()}
                className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Stroke Color</label>
            <input
              type="color"
              disabled={isLocked}
              value={selected.stroke || '#000000'}
              onChange={(e) => applyProp({ stroke: e.target.value }, false)}
              onBlur={() => pushHistory()}
              className="w-full h-8 border rounded cursor-pointer disabled:opacity-40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Stroke Width ({selected.strokeWidth || 0})</label>
            <input
              type="range"
              min={0}
              max={40}
              disabled={isLocked}
              value={selected.strokeWidth || 0}
              onChange={(e) => applyProp({ strokeWidth: Number(e.target.value) }, false)}
              onMouseUp={() => pushHistory()}
              className="w-full disabled:opacity-40"
            />
          </div>

          {selected.type === 'rect' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Corner Radius ({selected.rx || 0})</label>
              <input
                type="range"
                min={0}
                max={100}
                disabled={isLocked}
                value={selected.rx || 0}
                onChange={(e) => applyProp({ rx: Number(e.target.value), ry: Number(e.target.value) }, false)}
                onMouseUp={() => pushHistory()}
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
            className="text-xs font-semibold border rounded py-1.5 hover:bg-gray-50 disabled:opacity-40 bg-gray-800 text-white hover:bg-gray-700"
          >
            Edit Photo
          </button>
          <p className="text-[10px] text-gray-400 -mt-2">
            Opens the Photo Editor workspace for crop, adjustments, pixel selection/erase and
            background removal — Apply syncs the result back into this exact layer.
          </p>
          <label
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold border rounded py-1.5 cursor-pointer hover:bg-gray-50 ${
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
          <p className="text-[10px] text-gray-400 -mt-2">
            Swaps this layer's photo in place — same position, size and crop. The new image is scaled
            proportionally to fill the frame, never stretched.
          </p>
          <div className="grid grid-cols-2 gap-1">
            <button disabled={isLocked} onClick={() => applyProp({ flipX: !selected.flipX })} className="text-xs border rounded py-1 hover:bg-gray-50 disabled:opacity-40">
              Flip H
            </button>
            <button disabled={isLocked} onClick={() => applyProp({ flipY: !selected.flipY })} className="text-xs border rounded py-1 hover:bg-gray-50 disabled:opacity-40">
              Flip V
            </button>
          </div>
          {selected.clipPath ? (
            <button onClick={removeMask} className="text-xs border border-red-200 text-red-600 rounded py-1.5 hover:bg-red-50">
              Remove Mask
            </button>
          ) : (
            <p className="text-[10px] text-gray-400">
              Draw a closed path with the Pen tool, then apply it as a mask from the path's properties.
            </p>
          )}
        </>
      )}
    </div>
  );
}
