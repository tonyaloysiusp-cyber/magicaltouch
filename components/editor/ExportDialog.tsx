'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ArtboardMeta } from '@/lib/editor/artboards';
import { PX_PER_INCH } from '@/lib/editor/units';

export type ExportRangeMode = 'current' | 'range' | 'selected' | 'all';
export type ExportFormat = 'png' | 'jpg' | 'pdf';

export interface ExportSettings {
  rangeMode: ExportRangeMode;
  rangeFrom: number;
  rangeTo: number;
  selectedIds: string[];
  format: ExportFormat;
  // The real target DPI for the raster export -- document geometry is
  // always stored at a fixed 96px = 1in (lib/editor/units.ts), so the
  // multiplier fabric's toDataURL needs is derived here (dpi / 96),
  // never asked for directly. This replaces a previous 1x/2x/3x-only
  // control that couldn't express an exact print DPI (3x = 288, not
  // the 300 a real print document needs).
  dpi: number;
  multiplier: number;
  quality: number;
  includeBleed: boolean;
  includeMarks: boolean;
  transparentBackground: boolean;
}

const DPI_PRESETS = [
  { dpi: 72, label: '72 DPI', hint: 'Screen' },
  { dpi: 150, label: '150 DPI', hint: 'Draft print' },
  { dpi: 300, label: '300 DPI', hint: 'Print quality' },
];

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
  // Default to a real print-accurate 300 DPI (the previous "2x" default
  // was 192 DPI -- a multiplier of the 96px/in document baseline, not an
  // actual print DPI anyone asked for).
  const [dpi, setDpi] = useState(300);
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
      dpi,
      // Document geometry is always stored at a fixed 96px = 1in (see
      // lib/editor/units.ts), so this is the exact multiplier fabric's
      // toDataURL needs to produce a raster output whose real DPI is
      // genuinely `dpi` -- e.g. a 210mm-wide artboard is 793.7px
      // internally; at dpi=300 this multiplier (3.125) scales that to
      // 2480px, which really is 210mm at 300 DPI, not an approximation.
      multiplier: Math.max(0.01, dpi) / PX_PER_INCH,
      quality,
      includeBleed: includeBleed || includeMarks, // marks only make sense outside the trim edge
      includeMarks,
      transparentBackground,
    });
  };

  // The artboard this export's size preview reflects -- whatever single
  // page "Current" would resolve to, so the dialog can show real,
  // verifiable output pixel dimensions instead of an unlabeled multiplier.
  const previewArtboard =
    (rangeMode === 'current' ? artboards.find((a) => a.id === activeArtboardId) : undefined) ||
    artboards.find((a) => a.id === activeArtboardId) ||
    artboards[0];
  const previewMultiplier = Math.max(0.01, dpi) / PX_PER_INCH;
  const previewPxWidth = previewArtboard ? Math.round(previewArtboard.width * previewMultiplier) : null;
  const previewPxHeight = previewArtboard ? Math.round(previewArtboard.height * previewMultiplier) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-mt-surface rounded-xl shadow-xl w-[420px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-mt-ink">Export</h2>
          <button onClick={onClose} className="text-mt-faint hover:text-mt-ink">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* ---------------------------------------------------- RANGE */}
          <div>
            <label className="text-xs font-semibold text-mt-muted block mb-2">Export Range</label>
            <div className="flex flex-col gap-1.5">
              {([
                ['current', 'Current page'],
                ['selected', 'Selected pages'],
                ['range', 'Page range'],
                ['all', 'All pages'],
              ] as [ExportRangeMode, string][]).map(([mode, label]) => (
                <label key={mode} className="flex items-center gap-2 text-sm text-mt-ink">
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
                <span className="text-sm text-mt-muted">to</span>
                <input
                  type="number"
                  min={1}
                  max={artboards.length}
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-16 text-sm border rounded px-2 py-1"
                />
                <span className="text-xs text-mt-faint">of {artboards.length}</span>
              </div>
            )}

            {rangeMode === 'selected' && (
              <div className="mt-2 pl-6 flex flex-col gap-1 max-h-32 overflow-y-auto">
                {artboards.map((ab) => (
                  <label key={ab.id} className="flex items-center gap-2 text-sm text-mt-ink">
                    <input type="checkbox" checked={selectedIds.includes(ab.id)} onChange={() => toggleSelected(ab.id)} />
                    {ab.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* --------------------------------------------------- FORMAT */}
          <div>
            <label className="text-xs font-semibold text-mt-muted block mb-2">Format</label>
            <div className="flex gap-2">
              {(['png', 'jpg', 'pdf'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 text-sm border rounded py-1.5 uppercase ${
                    format === f ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-mt-surface2'
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
              <label className="text-xs font-semibold text-mt-muted block mb-2">Resolution</label>
              <div className="flex gap-2">
                {DPI_PRESETS.map((p) => (
                  <button
                    key={p.dpi}
                    onClick={() => setDpi(p.dpi)}
                    title={p.hint}
                    className={`flex-1 text-sm border rounded py-1.5 ${
                      dpi === p.dpi ? 'bg-gray-900 text-white border-gray-900' : 'hover:bg-mt-surface2'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <input
                  type="text"
                  inputMode="numeric"
                  title="Custom DPI"
                  aria-label="Custom DPI"
                  key={`dpi-${dpi}`}
                  defaultValue={DPI_PRESETS.some((p) => p.dpi === dpi) ? '' : String(dpi)}
                  placeholder="Custom"
                  className="w-20 text-sm border rounded py-1.5 px-2 text-center"
                  onBlur={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (Number.isFinite(parsed) && parsed > 0) setDpi(Math.round(parsed));
                    else e.target.value = DPI_PRESETS.some((p) => p.dpi === dpi) ? '' : String(dpi);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') {
                      (e.target as HTMLInputElement).value = DPI_PRESETS.some((p) => p.dpi === dpi) ? '' : String(dpi);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
              {previewArtboard && previewPxWidth && previewPxHeight && (
                <p className="text-xs text-mt-faint mt-1.5">
                  Output: {previewPxWidth} × {previewPxHeight}px at {dpi} DPI
                  {rangeMode !== 'current' && artboards.length > 1 ? ` (${previewArtboard.name})` : ''}
                </p>
              )}
            </div>
          )}

          {format === 'jpg' && (
            <div>
              <label className="text-xs font-semibold text-mt-muted block mb-1">
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
            <label className="flex items-center gap-2 text-sm text-mt-ink">
              <input
                type="checkbox"
                checked={includeBleed || includeMarks}
                disabled={includeMarks}
                onChange={(e) => setIncludeBleed(e.target.checked)}
              />
              Include bleed
            </label>
            <label className="flex items-center gap-2 text-sm text-mt-ink">
              <input type="checkbox" checked={includeMarks} onChange={(e) => setIncludeMarks(e.target.checked)} />
              Include crop marks &amp; color bar
            </label>
            {format === 'png' && (
              <label className="flex items-center gap-2 text-sm text-mt-ink">
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

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t bg-mt-surface2 rounded-b-xl">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-full border hover:bg-mt-surface2">
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
