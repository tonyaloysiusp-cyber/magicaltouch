'use client';

import { useState } from 'react';
import { Plus, Trash2, Copy, ScanSearch, ChevronUp, ChevronDown, Download, FileDown, ClipboardCheck, ChevronRight } from 'lucide-react';
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

  const active = artboards.find((a) => a.id === activeArtboardId) || null;

  return (
    <div className="p-3 border-b">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-gray-700 text-sm">Artboards</p>
        <div className="flex items-center gap-2">
          <button onClick={onRunPreflight} title="Run preflight check" className="text-gray-400 hover:text-gray-700">
            <ClipboardCheck size={14} />
          </button>
          <button onClick={onFitAll} title="Fit all artboards" className="text-gray-400 hover:text-gray-700">
            <ScanSearch size={14} />
          </button>
          <button onClick={() => setShowAddMenu((v) => !v)} title="Add artboard" className="text-gray-400 hover:text-gray-700">
            <Plus size={14} />
          </button>
        </div>
      </div>

      {showAddMenu && (
        <div className="mb-3 border rounded p-2 bg-gray-50 space-y-2">
          {PRESET_CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="text-[10px] uppercase text-gray-400 mb-1">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {ARTBOARD_PRESETS.filter((p) => p.category === cat).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onAddPreset(p);
                      setShowAddMenu(false);
                    }}
                    className="text-[11px] border rounded px-1.5 py-1 bg-white hover:bg-purple-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-[10px] uppercase text-gray-400 mb-1">Custom (px)</p>
            <div className="flex items-center gap-1">
              <input
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                className="w-16 text-xs border rounded px-1.5 py-1"
                placeholder="W"
              />
              <span className="text-gray-400">×</span>
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
                className="text-[11px] border rounded px-2 py-1 bg-white hover:bg-purple-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 mb-2">
        {artboards.length === 0 && <p className="text-xs text-gray-400">No artboards</p>}
        {artboards.map((ab, i) => {
          const isActive = ab.id === activeArtboardId;
          const isRenaming = renamingId === ab.id;
          return (
            <div key={ab.id} className={`border rounded p-1.5 text-xs ${isActive ? 'bg-gray-100 border-gray-400' : ''}`}>
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
                <button onClick={() => onMoveUp(i)} disabled={i === 0} className="text-gray-300 hover:text-gray-700 disabled:opacity-30" title="Move up">
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => onMoveDown(i)}
                  disabled={i === artboards.length - 1}
                  className="text-gray-300 hover:text-gray-700 disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown size={12} />
                </button>
                <button onClick={() => onDuplicate(ab.id)} className="text-gray-300 hover:text-gray-700" title="Duplicate artboard">
                  <Copy size={12} />
                </button>
                <button onClick={() => onExportOne(ab.id)} className="text-gray-300 hover:text-gray-700" title="Export this artboard (PNG)">
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
              <p className="text-[10px] text-gray-400 mt-0.5">
                {Math.round(ab.width)} × {Math.round(ab.height)} px
              </p>
            </div>
          );
        })}
      </div>

      {active && (
        <div key={active.id} className="border-t pt-2">
          <p className="text-[10px] text-gray-500 mb-1">Active artboard</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">X ({unit})</label>
              <input
                type="text"
                defaultValue={formatUnit(active.x, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onResize(active.id, { x: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">Y ({unit})</label>
              <input
                type="text"
                defaultValue={formatUnit(active.y, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onResize(active.id, { y: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">W ({unit})</label>
              <input
                type="text"
                defaultValue={formatUnit(active.width, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) onResize(active.id, { width: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">H ({unit})</label>
              <input
                type="text"
                defaultValue={formatUnit(active.height, unit)}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) onResize(active.id, { height: unitToPx(val, unit) });
                }}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="w-full text-xs border rounded px-2 py-1"
              />
            </div>
          </div>

          <button
            onClick={() => setShowPrintSetup((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 mt-2"
          >
            <ChevronRight size={12} className={`transition-transform ${showPrintSetup ? 'rotate-90' : ''}`} />
            Print Setup
          </button>

          {showPrintSetup && (
            <div key={active.id + '-print'} className="mt-2 space-y-2 border rounded p-2 bg-gray-50">
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
                <label className="text-[10px] text-gray-500 block mb-0.5">Target Print DPI</label>
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
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={active.print.marks.crop}
                    onChange={(e) => onUpdatePrint(active.id, { marks: { ...active.print.marks, crop: e.target.checked } })}
                  />
                  Crop marks
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={active.print.marks.registration}
                    onChange={(e) => onUpdatePrint(active.id, { marks: { ...active.print.marks, registration: e.target.checked } })}
                  />
                  Registration marks
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={active.print.marks.colorBar}
                    onChange={(e) => onUpdatePrint(active.id, { marks: { ...active.print.marks, colorBar: e.target.checked } })}
                  />
                  Color bar (RGB swatches — not true CMYK/Pantone)
                </label>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">Export for Print</label>
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
                    className="flex-1 text-[11px] border rounded px-2 py-1 bg-white hover:bg-purple-50"
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => onExportPrint(active.id, exportScope, 'pdf')}
                    className="flex-1 text-[11px] border rounded px-2 py-1 bg-white hover:bg-purple-50"
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
        <button onClick={onExportAll} className="flex-1 flex items-center justify-center gap-1 text-[11px] border rounded px-2 py-1.5 hover:bg-gray-50">
          <Download size={12} /> All (PNG)
        </button>
        <button onClick={onExportAllPDF} className="flex-1 flex items-center justify-center gap-1 text-[11px] border rounded px-2 py-1.5 hover:bg-gray-50">
          <FileDown size={12} /> All (PDF)
        </button>
      </div>
    </div>
  );
}
