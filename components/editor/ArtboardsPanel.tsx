'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy, ScanSearch, ChevronUp, ChevronDown, Download, FileDown, ClipboardCheck, ChevronRight, Lock, Unlock } from 'lucide-react';
import { ArtboardMeta, ArtboardPreset, ARTBOARD_PRESETS } from '@/lib/editor/artboards';
import { ArtboardPrintSettings, ExportScope, EXPORT_SCOPE_LABELS } from '@/lib/editor/printSetup';
import { DocUnit } from '@/lib/editor/types';
import { formatUnit, unitToPx } from '@/lib/editor/units';
import { EdgeFields } from './EdgeFields';

interface Props {
  artboards: ArtboardMeta[];
  activeArtboardId: string | null;
  unit: DocUnit;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onResize: (id: string, patch: Partial<{ x: number; y: number; width: number; height: number }>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddPreset: (preset: ArtboardPreset) => void;
  onAddCustom: (widthPx: number, heightPx: number) => void;
  onFitAll: () => void;
  onExportOne: (id: string) => void;
  onExportAll: () => void;
  onExportAllPDF: () => void;
  onExportRangePDF: (fromIndex: number, toIndex: number, scope: ExportScope) => void;
  onUpdatePrint: (id: string, patch: Partial<ArtboardPrintSettings>) => void;
  onExportPrint: (id: string, scope: ExportScope, format: 'png' | 'pdf') => void;
  onRunPreflight: () => void;
}

const PRESET_CATEGORIES = Array.from(new Set(ARTBOARD_PRESETS.map((p) => p.category)));

export function ArtboardsPanel({
  artboards,
  activeArtboardId,
  unit,
  onSelect,
  onRename,
  onResize,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddPreset,
  onAddCustom,
  onFitAll,
  onExportOne,
  onExportAll,
  onExportAllPDF,
  onExportRangePDF,
  onUpdatePrint,
  onExportPrint,
  onRunPreflight,
}: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [customW, setCustomW] = useState('1080');
  const [customH, setCustomH] = useState('1080');
  const [showPrintSetup, setShowPrintSetup] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('artboard');
  const [rangeFrom, setRangeFrom] = useState('1');
  const [rangeTo, setRangeTo] = useState('1');
  const [ratioLocked, setRatioLocked] = useState(false);
  const [widthError, setWidthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  const active = artboards.find((a) => a.id === activeArtboardId) || null;

  return (
    <div className="p-3 border-b">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-mt-ink text-sm">Artboards</p>
        <div className="flex items-center gap-2">
          <button onClick={onRunPreflight} title="Run preflight check" className="text-mt-faint hover:text-mt-ink">
            <ClipboardCheck size={14} />
          </button>
          <button onClick={onFitAll} title="Fit all artboards" className="text-mt-faint hover:text-mt-ink">
            <ScanSearch size={14} />
          </button>
          <button onClick={() => setShowAddMenu((v) => !v)} title="Add artboard" className="text-mt-faint hover:text-mt-ink">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {showAddMenu && (
        <div className="mb-3 border rounded p-2 bg-mt-bg space-y-2">
          {PRESET_CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] uppercase text-mt-faint mb-1">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {ARTBOARD_PRESETS.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onAddPreset(p);
                      setShowAddMenu(false);
                    }}
                    className="text-[11px] border rounded px-1.5 py-1 bg-mt-surface hover:bg-purple-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-[10px] uppercase text-mt-faint mb-1">Custom (px)</p>
            <div className="flex items-center gap-1">
              <input
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="w-16 text-xs border rounded px-1.5 py-1"
                placeholder="W"
              />
              <span className="text-mt-faint">×</span>
              <input
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                className="w-16 text-xs border rounded px-1.5 py-1"
                placeholder="H"
              />
              <button
                onClick={() => {
                  const w = parseFloat(customW);
                  const h = parseFloat(customH);
                  if (w > 0 && h > 0) {
                    onAddCustom(w, h);
                    setShowAddMenu(false);
                  }
                }}
                className="text-[11px] border rounded px-2 py-1 bg-mt-surface hover:bg-purple-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 mb-2">
        {artboards.length === 0 && <p className="text-xs text-mt-faint">No artboards</p>}
        {artboards.map((ab, i) => {
          const isActive = ab.id === activeArtboardId;
          const isRenaming = renamingId === ab.id;
          return (
            <div key={ab.id} className={`border rounded p-1.5 text-xs ${isActive ? 'bg-mt-surface2 border-gray-400' : ''}`}>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onSelect(ab.id)} className="flex-1 min-w-0 text-left truncate" title="Select and fit">
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        onRename(ab.id, renameValue.trim() || ab.name);
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="w-full border rounded px-1 py-0.5"
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(ab.id);
                        setRenameValue(ab.name);
                      }}
                    >
                      {ab.name}
                    </span>
                  )}
                </button>
                <button onClick={() => onMoveUp(i)} disabled={i === 0} className="text-mt-faint hover:text-mt-ink disabled:opacity-30" title="Move up">
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => onMoveDown(i)}
                  disabled={i === artboards.length - 1}
                  className="text-mt-faint hover:text-mt-ink disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown size={12} />
                </button>
                <button onClick={() => onDuplicate(ab.id)} className="text-mt-faint hover:text-mt-ink" title="Duplicate artboard">
                  <Copy size={12} />
                </button>
                <button onClick={() => onExportOne(ab.id)} className="text-mt-faint hover:text-mt-ink" title="Export this artboard (PNG)">
                  <Download size={12} />
                </button>
                <button
                  onClick={() => artboards.length > 1 && onDelete(ab.id)}
                  disabled={artboards.length <= 1}
                  className="text-red-300 hover:text-red-500 disabled:opacity-30"
                  title={artboards.length <= 1 ? "Can't delete the only artboard" : 'Delete artboard'}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="text-[10px] text-mt-faint mt-0.5">
                {Math.round(ab.width)} × {Math.round(ab.height)} px
              </p>
            </div>
          );
        })}
      </div>

      {active && (
        <div key={active.id} className="border-t pt-2">
          <p className="text-[10px] text-mt-muted mb-1">Active artboard</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-mt-muted block mb-0.5">X ({unit})</label>
              <input
                type="text"
                key={`x-${active.id}-${unit}-${active.x}`}
                defaultValue={formatUnit(active.x, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onResize(active.id, { x: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') {
                    (e.target as HTMLInputElement).value = formatUnit(active.x, unit);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-mt-muted block mb-0.5">Y ({unit})</label>
              <input
                type="text"
                key={`y-${active.id}-${unit}-${active.y}`}
                defaultValue={formatUnit(active.y, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onResize(active.id, { y: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') {
                    (e.target as HTMLInputElement).value = formatUnit(active.y, unit);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
            <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div>
                <label className="text-[10px] text-mt-muted block mb-0.5">W ({unit})</label>
                <input
                  type="text"
                  key={`w-${active.id}-${unit}-${active.width}`}
                  defaultValue={formatUnit(active.width, unit)}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || val <= 0) {
                      setWidthError('Enter a valid size greater than 0.');
                      return;
                    }
                    setWidthError(null);
                    const newWidthPx = unitToPx(val, unit);
                    if (ratioLocked && active.width > 0) {
                      onResize(active.id, { width: newWidthPx, height: active.height * (newWidthPx / active.width) });
                    } else {
                      onResize(active.id, { width: newWidthPx });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') {
                      setWidthError(null);
                      (e.target as HTMLInputElement).value = formatUnit(active.width, unit);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-xs border rounded px-2 py-1"
                />
                {widthError && <p className="text-[9px] text-red-500 mt-0.5">{widthError}</p>}
              </div>
              <button
                type="button"
                onClick={() => setRatioLocked((v) => !v)}
                title={ratioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                aria-label={ratioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                className={`mb-0.5 p-1.5 rounded-full border transition-colors ${
                  ratioLocked ? 'bg-mt-accent text-white border-mt-accent' : 'border-mt-border text-mt-faint hover:text-mt-ink'
                }`}
              >
                {ratioLocked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
              <div>
                <label className="text-[10px] text-mt-muted block mb-0.5">H ({unit})</label>
                <input
                  type="text"
                  key={`h-${active.id}-${unit}-${active.height}`}
                  defaultValue={formatUnit(active.height, unit)}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || val <= 0) {
                      setHeightError('Enter a valid size greater than 0.');
                      return;
                    }
                    setHeightError(null);
                    const newHeightPx = unitToPx(val, unit);
                    if (ratioLocked && active.height > 0) {
                      onResize(active.id, { height: newHeightPx, width: active.width * (newHeightPx / active.height) });
                    } else {
                      onResize(active.id, { height: newHeightPx });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') {
                      setHeightError(null);
                      (e.target as HTMLInputElement).value = formatUnit(active.height, unit);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-xs border rounded px-2 py-1"
                />
                {heightError && <p className="text-[9px] text-red-500 mt-0.5">{heightError}</p>}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPrintSetup((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-mt-muted hover:text-mt-ink mt-2"
          >
            <ChevronRight size={12} className={`transition-transform ${showPrintSetup ? 'rotate-90' : ''}`} />
            Print Setup
          </button>

          {showPrintSetup && (
            <div key={active.id + '-print'} className="mt-2 space-y-2 border rounded p-2 bg-mt-bg">
              <EdgeFields
                label="Bleed"
                unit={unit}
                values={active.print.bleed}
                linked={active.print.bleedLinked}
                onChange={(next) => onUpdatePrint(active.id, { bleed: next })}
                onToggleLinked={() => onUpdatePrint(active.id, { bleedLinked: !active.print.bleedLinked })}
              />
              <EdgeFields
                label="Slug"
                unit={unit}
                values={active.print.slug}
                linked={active.print.slugLinked}
                onChange={(next) => onUpdatePrint(active.id, { slug: next })}
                onToggleLinked={() => onUpdatePrint(active.id, { slugLinked: !active.print.slugLinked })}
              />
              <EdgeFields
                label="Safe Area"
                unit={unit}
                values={active.print.safeArea}
                linked={active.print.safeAreaLinked}
                onChange={(next) => onUpdatePrint(active.id, { safeArea: next })}
                onToggleLinked={() => onUpdatePrint(active.id, { safeAreaLinked: !active.print.safeAreaLinked })}
              />

              <div>
                <label className="text-[10px] text-mt-muted block mb-0.5">Target Print DPI</label>
                <input
                  type="text"
                  defaultValue={String(active.print.dpi)}
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) onUpdatePrint(active.id, { dpi: val });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="w-full text-xs border rounded px-2 py-1"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-[11px] text-mt-muted">
                  <input
                    type="checkbox"
                    checked={active.print.marks.crop}
                    onChange={(e) => onUpdatePrint(active.id, { marks: { ...active.print.marks, crop: e.target.checked } })}
                  />
                  Crop marks
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-mt-muted">
                  <input
                    type="checkbox"
                    checked={active.print.marks.registration}
                    onChange={(e) => onUpdatePrint(active.id, { marks: { ...active.print.marks, registration: e.target.checked } })}
                  />
                  Registration marks
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-mt-muted">
                  <input
                    type="checkbox"
                    checked={active.print.marks.colorBar}
                    onChange={(e) => onUpdatePrint(active.id, { marks: { ...active.print.marks, colorBar: e.target.checked } })}
                  />
                  Color bar (CMYK + grayscale ramp, RGB screen simulation)
                </label>
              </div>

              <div>
                <label className="text-[10px] text-mt-muted block mb-0.5">Export for Print</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as ExportScope)}
                  className="w-full text-xs border rounded px-2 py-1 mb-1"
                >
                  {(Object.keys(EXPORT_SCOPE_LABELS) as ExportScope[]).map((s) => (
                    <option key={s} value={s}>
                      {EXPORT_SCOPE_LABELS[s]}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => onExportPrint(active.id, exportScope, 'png')}
                    className="flex-1 text-[11px] border rounded px-2 py-1 bg-mt-surface hover:bg-purple-50"
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => onExportPrint(active.id, exportScope, 'pdf')}
                    className="flex-1 text-[11px] border rounded px-2 py-1 bg-mt-surface hover:bg-purple-50"
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onExportAll} className="flex-1 flex items-center justify-center gap-1 text-[11px] border rounded px-2 py-1.5 hover:bg-mt-surface2">
          <Download size={12} /> All (PNG)
        </button>
        <button onClick={onExportAllPDF} className="flex-1 flex items-center justify-center gap-1 text-[11px] border rounded px-2 py-1.5 hover:bg-mt-surface2">
          <FileDown size={12} /> All (PDF)
        </button>
      </div>

      {artboards.length > 1 && (
        <div className="mt-2 pt-2 border-t">
          <label className="text-[10px] text-mt-muted block mb-1">
            Export page range (PDF) — 1–{artboards.length}
          </label>
          <select
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value as ExportScope)}
            className="w-full text-xs border rounded px-2 py-1 mb-1.5"
          >
            {(Object.keys(EXPORT_SCOPE_LABELS) as ExportScope[]).map((s) => (
              <option key={s} value={s}>
                {EXPORT_SCOPE_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={artboards.length}
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="w-14 text-xs border rounded px-2 py-1"
            />
            <span className="text-[11px] text-mt-muted">to</span>
            <input
              type="number"
              min={1}
              max={artboards.length}
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="w-14 text-xs border rounded px-2 py-1"
            />
            <button
              onClick={() => {
                const from = parseInt(rangeFrom, 10);
                const to = parseInt(rangeTo, 10);
                if (!isNaN(from) && !isNaN(to)) onExportRangePDF(from, to, exportScope);
              }}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] border rounded px-2 py-1.5 hover:bg-mt-surface2"
            >
              <FileDown size={12} /> Export Range
            </button>
          </div>
          <button
            onClick={() => onExportRangePDF(1, artboards.length, exportScope)}
            className="w-full mt-1.5 flex items-center justify-center gap-1 text-[11px] border rounded px-2 py-1.5 hover:bg-mt-surface2"
          >
            <FileDown size={12} /> Export All Pages ({EXPORT_SCOPE_LABELS[exportScope]})
          </button>
        </div>
      )}
    </div>
  );
}
