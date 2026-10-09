'use client';

// "Download": pick a format, a quality and which pages. Every choice shows
// what it's for and what you'll get (pixel size, number of files).

import { useEffect, useState } from 'react';
import { X, Image as ImageIcon, FileImage, FileText, Printer, Loader2, Download, Check } from 'lucide-react';
import { ArtboardMeta } from '@/lib/editor/artboards';
import { PX_PER_INCH } from '@/lib/editor/units';
import { cx } from './shell/ui';

export type ExportRangeMode = 'current' | 'range' | 'selected' | 'all';
export type ExportFormat = 'png' | 'jpg' | 'webp' | 'pdf';

export interface ExportSettings {
  rangeMode: ExportRangeMode;
  rangeFrom: number;
  rangeTo: number;
  selectedIds: string[];
  format: ExportFormat;
  // Document geometry is stored at 96 px = 1 in, so the picture size for a
  // DPI is dpi / 96 times the page size.
  dpi: number;
  multiplier: number;
  quality: number;
  includeBleed: boolean;
  includeMarks: boolean;
  transparentBackground: boolean;
}

type Choice = 'png' | 'jpg' | 'webp' | 'pdf' | 'pdf-print';

const CHOICES: { id: Choice; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'png', label: 'PNG', hint: 'Sharp graphics and text. Can be transparent.', icon: <ImageIcon size={18} /> },
  { id: 'jpg', label: 'JPG', hint: 'Small files, great for photos and sharing.', icon: <FileImage size={18} /> },
  { id: 'pdf', label: 'PDF', hint: 'For sending and printing at home.', icon: <FileText size={18} /> },
  { id: 'pdf-print', label: 'PDF for print shops', hint: 'With bleed and crop marks.', icon: <Printer size={18} /> },
  { id: 'webp', label: 'WebP', hint: 'Small, high-quality pictures for websites.', icon: <FileImage size={18} /> },
];

const DPI_PRESETS = [
  { dpi: 72, label: 'Screen', hint: '72 DPI' },
  { dpi: 150, label: 'Standard', hint: '150 DPI' },
  { dpi: 300, label: 'Print', hint: '300 DPI' },
];

interface Props {
  artboards: ArtboardMeta[];
  activeArtboardId: string | null;
  exporting: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
}

function Switch({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={cx('flex items-center justify-between gap-3 py-1.5', disabled && 'opacity-50')}>
      <span className="min-w-0">
        <span className="block text-sm text-mt-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mt-faint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF]', checked ? 'bg-[#3B82C4]' : 'bg-mt-border')}
      >
        <span className={cx('absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </button>
    </label>
  );
}

export function ExportDialog({ artboards, activeArtboardId, exporting, onClose, onExport }: Props) {
  const multi = artboards.length > 1;
  const [choice, setChoice] = useState<Choice>('png');
  const [rangeMode, setRangeMode] = useState<ExportRangeMode>(multi ? 'all' : 'current');
  const [selectedIds, setSelectedIds] = useState<string[]>(activeArtboardId ? [activeArtboardId] : []);
  const [dpi, setDpi] = useState(300);
  const [quality, setQuality] = useState(0.9);
  const [bleed, setBleed] = useState(false);
  const [marks, setMarks] = useState(false);
  const [transparent, setTransparent] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const format: ExportFormat = choice === 'pdf-print' ? 'pdf' : choice;
  const printPreset = choice === 'pdf-print';
  const isRaster = format !== 'pdf';
  const includeMarks = printPreset || marks;
  const includeBleed = printPreset || bleed || marks;

  const pages =
    rangeMode === 'all'
      ? artboards
      : rangeMode === 'selected'
      ? artboards.filter((a) => selectedIds.includes(a.id))
      : artboards.filter((a) => a.id === activeArtboardId).slice(0, 1).concat(activeArtboardId ? [] : artboards.slice(0, 1));
  const preview = pages[0] || artboards[0];
  const k = Math.max(0.01, dpi) / PX_PER_INCH;
  const outW = preview ? Math.round(preview.width * k) : 0;
  const outH = preview ? Math.round(preview.height * k) : 0;
  const tooBig = outW * outH > 16_000_000;

  const submit = () => {
    onExport({
      rangeMode,
      rangeFrom: 1,
      rangeTo: artboards.length,
      selectedIds,
      format,
      dpi,
      multiplier: k,
      quality,
      includeBleed,
      includeMarks,
      transparentBackground: format === 'png' && transparent,
    });
  };

  const fileNote = pages.length > 1 && isRaster ? `${pages.length} pictures in one .zip file` : pages.length > 1 ? `One PDF with ${pages.length} pages` : format === 'pdf' ? 'One PDF' : 'One picture';

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Download your design"
        className="bg-mt-surface text-mt-ink w-full sm:max-w-[520px] max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-mt-border shrink-0">
          <h2 className="font-semibold inline-flex items-center gap-2">
            <Download size={17} className="text-mt-accent" /> Download
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-6">
          <section>
            <p className="text-[13px] font-semibold mb-2">File type</p>
            <div className="grid grid-cols-2 gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChoice(c.id)}
                  aria-pressed={choice === c.id}
                  className={cx(
                    'relative text-left rounded-2xl border p-3 transition-colors',
                    choice === c.id ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2',
                    c.id === 'webp' && 'col-span-2 sm:col-span-1'
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="text-mt-accent">{c.icon}</span>
                    {c.label}
                  </span>
                  <span className="block mt-1 text-[11px] leading-snug text-mt-muted">{c.hint}</span>
                  {choice === c.id && <Check size={15} className="absolute top-3 right-3 text-mt-accent" />}
                </button>
              ))}
            </div>
          </section>

          {isRaster && (
            <section>
              <p className="text-[13px] font-semibold mb-2">Quality</p>
              <div className="flex gap-2">
                {DPI_PRESETS.map((p) => (
                  <button
                    key={p.dpi}
                    type="button"
                    onClick={() => setDpi(p.dpi)}
                    aria-pressed={dpi === p.dpi}
                    className={cx('flex-1 rounded-xl border py-2 text-sm', dpi === p.dpi ? 'mt-active-blue font-semibold' : 'border-mt-border hover:bg-mt-surface2')}
                  >
                    {p.label}
                    <span className="block text-[10px] text-mt-faint font-normal">{p.hint}</span>
                  </button>
                ))}
                <label className="w-24">
                  <span className="sr-only">Custom DPI</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    key={`dpi-${dpi}`}
                    defaultValue={DPI_PRESETS.some((p) => p.dpi === dpi) ? '' : String(dpi)}
                    placeholder="Custom"
                    className="w-full h-full rounded-xl border border-mt-input-border bg-mt-surface px-2 text-center text-sm"
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v) && v >= 10 && v <= 1200) setDpi(Math.round(v));
                      else e.target.value = DPI_PRESETS.some((p) => p.dpi === dpi) ? '' : String(dpi);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </label>
              </div>
              {preview && (
                <p className={cx('text-xs mt-2', tooBig ? 'text-amber-700 dark:text-amber-400' : 'text-mt-faint')}>
                  {outW.toLocaleString()} × {outH.toLocaleString()} px at {dpi} DPI
                  {tooBig ? ' — very large; it will be made a little smaller so it opens on phones and iPads.' : ''}
                </p>
              )}
              {(format === 'jpg' || format === 'webp') && (
                <label className="block mt-3 text-xs text-mt-muted">
                  <span className="flex justify-between">
                    <span>Compression</span>
                    <span className="tabular-nums text-mt-ink">{Math.round(quality * 100)}%</span>
                  </span>
                  <input type="range" min={0.5} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-[#3B82C4]" />
                </label>
              )}
            </section>
          )}

          {multi && (
            <section>
              <p className="text-[13px] font-semibold mb-2">Pages</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['all', `All ${artboards.length} pages`],
                    ['current', 'This page'],
                    ['selected', 'Choose pages'],
                  ] as [ExportRangeMode, string][]
                ).map(([m, l]) => (
                  <button key={m} type="button" onClick={() => setRangeMode(m)} aria-pressed={rangeMode === m} className={cx('h-9 px-3 rounded-full border text-sm', rangeMode === m ? 'mt-active-blue font-semibold' : 'border-mt-border text-mt-muted hover:text-mt-ink')}>
                    {l}
                  </button>
                ))}
              </div>
              {rangeMode === 'selected' && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {artboards.map((ab, i) => {
                    const on = selectedIds.includes(ab.id);
                    return (
                      <button
                        key={ab.id}
                        type="button"
                        onClick={() => setSelectedIds((prev) => (on ? prev.filter((x) => x !== ab.id) : [...prev, ab.id]))}
                        aria-pressed={on}
                        className={cx('h-8 min-w-8 px-2.5 rounded-lg border text-xs tabular-nums', on ? 'mt-active-blue font-semibold' : 'border-mt-border text-mt-muted')}
                        title={ab.name}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-mt-border px-3 py-1">
            {format === 'png' && <Switch checked={transparent} onChange={setTransparent} label="Transparent background" hint="Only what you added, no page colour" />}
            {!printPreset && (
              <>
                <Switch checked={includeBleed} onChange={setBleed} disabled={marks} label="Include bleed" hint="The extra edge printers trim off" />
                <Switch checked={marks} onChange={setMarks} label="Crop marks & colour bar" hint="For professional printing" />
              </>
            )}
            {printPreset && <p className="text-xs text-mt-muted py-2">Bleed, crop marks and a colour bar are included, the way print shops expect.</p>}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-mt-border shrink-0">
          <span className="text-xs text-mt-muted">{fileNote}</span>
          <button
            type="button"
            onClick={submit}
            disabled={exporting || pages.length === 0}
            className="h-11 px-6 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? 'Preparing…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
