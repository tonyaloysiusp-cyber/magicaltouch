'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ArtboardMeta } from '@/lib/editor/artboards';

export type ExportRangeMode = 'current' | 'range' | 'selected' | 'all';
export type ExportFormat = 'png' | 'jpg' | 'pdf';

export interface ExportSettings {
  rangeMode: ExportRangeMode;
  rangeFrom: number;
  rangeTo: number;
  selectedIds: string[];
  format: ExportFormat;
  multiplier: number;
  quality: number;
  includeBleed: boolean;
  includeMarks: boolean;
  transparentBackground: boolean;
}

interface Props {
  artboards: ArtboardMeta[];
  activeArtboardId: string | null;
  exporting: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
}

export function ExportDialog({ artboards, activeArtboardId, exporting, onClose, onExport }: Props) {
  const [rangeMode, setRangeMode] = useState<ExportRangeMode>('current');
  const [rangeFrom, setRangeFrom] = useState('1');
  const [rangeTo, setRangeTo] = useState(String(Math.max(artboards.length, 1)));
  const [selectedIds, setSelectedIds] = useState<string[]>(activeArtboardId ? [activeArtboardId] : []);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [multiplier, setMultiplier] = useState(2);
  const [quality, setQuality] = useState(0.9);
  const [includeBleed, setIncludeBleed] = useState(false);
  const [includeMarks, setIncludeMarks] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = () => {
    onExport({
      rangeMode,
      rangeFrom: parseInt(rangeFrom, 10) || 1,
      rangeTo: parseInt(rangeTo, 10) || artboards.length,
      selectedIds,
      format,
      multiplier,
      quality,
      includeBleed: includeBleed || includeMarks, // marks only make sense outside the trim edge
      includeMarks,
      transparentBackground,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-[420px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Export</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* ---------------------------------------------------- RANGE */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">Export Range</label>
            <div className="flex flex-col gap-1.5">
              {([
                ['current', 'Current page'],
                ['selected', 'Selected pages'],
                ['range', 'Page range'],
                ['all', 'All pages'],
              ] as [ExportRangeMode, string][]).map(([mode, label]) => (
                <label key={mode} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="range" checked={rangeMode === mode} onChange={() => setRangeMode(mode)} />
                  {label}
                </label>
              ))}
            </div>

            {rangeMode === 'range' && (
              <div className="mt-2 flex items-center gap-2 pl-6">
                <input
                  type="number"
                  min={1}
                  max={artboards.length}
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-16 text-sm border rounded px-2 py-1"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="number"
                  min={1}
                  max={artboards.length}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-16 text-sm border rounded px-2 py-1"
                />
                <span className="text-xs text-gray-400">of {artboards.length}</span>
              </div>
            )}

            {rangeMode === 'selected' && (
              <div className="mt-2 pl-6 flex flex-col gap-1 max-h-32 overflow-y-auto">
                {artboards.map((ab) => (
                  <label key={ab.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={selectedIds.includes(ab.id)} onChange={() => toggleSelected(ab.id)} />
                    {ab.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* --------------------------------------------------- FORMAT */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">Format</label>
            <div className="flex gap-2">
              {(['png', 'jpg', 'pdf'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 text-sm border rounded py-1.5 uppercase ${
                    format === f ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ----------------------------------------- RESOLUTION/QUALITY */}
          {format !== 'pdf' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-2">Resolution</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m)}
                    className={`flex-1 text-sm border rounded py-1.5 ${
                      multiplier === m ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-gray-50'
                    }`}
                  >
                    {m}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {format === 'jpg' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">
                Quality ({Math.round(quality * 100)}%)
              </label>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* ------------------------------------------- PRINT SETTINGS */}
          <div className="flex flex-col gap-2 border-t pt-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeBleed || includeMarks}
                disabled={includeMarks}
                onChange={(e) => setIncludeBleed(e.target.checked)}
              />
              Include bleed
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={includeMarks} onChange={(e) => setIncludeMarks(e.target.checked)} />
              Include crop marks &amp; color bar
            </label>
            {format === 'png' && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={transparentBackground}
                  onChange={(e) => setTransparentBackground(e.target.checked)}
                />
                Transparent background
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-full border hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={exporting || (rangeMode === 'selected' && selectedIds.length === 0)}
            className="text-sm px-5 py-2 rounded-full bg-brand-gradient text-white font-semibold disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
