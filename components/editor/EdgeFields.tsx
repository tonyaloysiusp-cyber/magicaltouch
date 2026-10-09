'use client';

import { Link2, Link2Off } from 'lucide-react';
import { EdgeValues } from '@/lib/editor/printSetup';
import { DocUnit } from '@/lib/editor/types';
import { formatUnit, unitToPx } from '@/lib/editor/units';

// Four-sided (top/right/bottom/left) numeric input, linked or independent —
// shared by the Artboards panel and the New Design setup screen so bleed/
// safe-area editing looks and behaves identically in both places.
export function EdgeFields({
  label,
  unit,
  values,
  linked,
  onChange,
  onToggleLinked,
}: {
  label: string;
  unit: DocUnit;
  values: EdgeValues;
  linked: boolean;
  onChange: (next: EdgeValues) => void;
  onToggleLinked: () => void;
}) {
  const set = (edge: keyof EdgeValues, raw: string) => {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    const px = unitToPx(val, unit);
    if (linked) onChange({ top: px, right: px, bottom: px, left: px });
    else onChange({ ...values, [edge]: px });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-mt-muted dark:text-mt-muted">
          {label} ({unit})
        </label>
        <button onClick={onToggleLinked} title={linked ? 'Unlink edges' : 'Link edges'} className="text-mt-faint dark:text-[#8A8499] hover:text-mt-ink dark:hover:text-mt-ink">
          {linked ? <Link2 size={11} /> : <Link2Off size={11} />}
        </button>
      </div>
      {linked ? (
        <input
          key={`${unit}-${values.top}`}
          type="text"
          defaultValue={formatUnit(values.top, unit)}
          onBlur={(e) => set('top', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full text-xs border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-2 py-1"
        />
      ) : (
        <div className="grid grid-cols-4 gap-1">
          {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
            <input
              key={`${edge}-${unit}-${values[edge]}`}
              type="text"
              title={edge}
              defaultValue={formatUnit(values[edge], unit)}
              onBlur={(e) => set(edge, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full text-xs border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-1 py-1"
            />
          ))}
        </div>
      )}
    </div>
  );
}
