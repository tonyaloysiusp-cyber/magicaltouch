'use client';

import { useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import { SIZE_GROUPS, SizePreset, presetLabel, presetToPx } from '@/lib/editor/sizePresets';
import { Segmented, cx } from './ui';

export function ResizeDialog({
  current,
  onResize,
  onClose,
}: {
  current: { width: number; height: number };
  onResize: (size: { width: number; height: number; dpi?: number; label: string }, mode: 'this' | 'copy') => void;
  onClose: () => void;
}) {
  const [group, setGroup] = useState(SIZE_GROUPS[0].id);
  const [picked, setPicked] = useState<SizePreset | null>(null);
  const [custom, setCustom] = useState({ w: Math.round(current.width), h: Math.round(current.height) });
  const [mode, setMode] = useState<'copy' | 'this'>('copy');
  const items = SIZE_GROUPS.find((g) => g.id === group)?.items || [];

  const go = () => {
    if (picked) {
      const s = presetToPx(picked);
      onResize({ ...s, dpi: picked.dpi, label: picked.label }, mode);
    } else {
      onResize({ width: Math.max(16, custom.w), height: Math.max(16, custom.h), label: 'Custom size' }, mode);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Resize design">
      <div className="w-full max-w-xl max-h-[90vh] bg-mt-surface text-mt-ink rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 h-14 border-b border-mt-border">
          <h2 className="font-semibold inline-flex items-center gap-2">
            <Wand2 size={17} className="text-mt-accent" /> Resize
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <p className="text-sm text-mt-muted mb-4">Content is re-arranged to fit the new size — nothing gets stretched.</p>
          <div className="flex gap-1.5 overflow-x-auto mt-scroll pb-1 mb-3">
            {SIZE_GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => setGroup(g.id)} className={cx('shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border', group === g.id ? 'bg-mt-primary text-mt-onprimary border-mt-primary' : 'border-mt-border text-mt-muted')}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {items.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPicked(p)}
                className={cx('text-left rounded-xl border px-3 py-2', picked?.id === p.id ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2')}
              >
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-[11px] text-mt-muted">{presetLabel(p)}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-end gap-2">
            <label className="flex-1">
              <span className="block text-xs text-mt-muted mb-1">Custom width (px)</span>
              <input type="number" value={custom.w} onFocus={() => setPicked(null)} onChange={(e) => setCustom({ ...custom, w: Number(e.target.value) })} className="w-full h-10 rounded-lg border border-mt-input-border bg-mt-surface px-3 text-sm" />
            </label>
            <label className="flex-1">
              <span className="block text-xs text-mt-muted mb-1">Height (px)</span>
              <input type="number" value={custom.h} onFocus={() => setPicked(null)} onChange={(e) => setCustom({ ...custom, h: Number(e.target.value) })} className="w-full h-10 rounded-lg border border-mt-input-border bg-mt-surface px-3 text-sm" />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-mt-border">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'copy', label: 'Make a resized copy', hint: 'Adds a new page; the original stays as it is' },
              { value: 'this', label: 'Resize this page' },
            ]}
            size="sm"
          />
          <button type="button" onClick={go} className="h-10 px-5 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold">
            Resize
          </button>
        </div>
      </div>
    </div>
  );
}
