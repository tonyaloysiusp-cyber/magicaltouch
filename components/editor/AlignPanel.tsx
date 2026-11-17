'use client';

import { useState } from 'react';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from 'lucide-react';

type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';

interface Props {
  alignObject: (mode: AlignMode, relativeTo?: 'auto' | 'page' | 'selection' | 'column') => void;
  distribute: (axis: 'h' | 'v') => void;
  hasSelection: boolean;
  selectionCount: number;
}

// Align to the page, to the column / folding panel the object sits in, or
// (with several objects selected) to each other; space 3+ objects evenly.
export function AlignPanel({ alignObject, distribute, hasSelection, selectionCount }: Props) {
  const [relativeTo, setRelativeTo] = useState<'selection' | 'page' | 'column'>('selection');
  const multi = selectionCount > 1;
  const btn = (icon: React.ReactNode, label: string, onClick: () => void, disabled: boolean) => (
    <button
      key={label}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center border border-mt-border rounded-lg hover:bg-mt-surface2 disabled:opacity-30 disabled:hover:bg-transparent text-mt-muted hover:text-mt-ink"
    >
      {icon}
    </button>
  );
  const target = multi ? relativeTo : relativeTo === 'selection' ? 'page' : relativeTo;
  const a = (mode: AlignMode) => () => alignObject(mode, target);

  return (
    <div className="p-3">
      <p className="font-semibold text-mt-ink mb-3 text-sm">Align</p>
      <div role="radiogroup" aria-label="Align to" className="flex gap-1 mb-3 text-[11px]">
        {((multi ? ['selection', 'page', 'column'] : ['page', 'column']) as const).map((r) => (
          <button
            key={r}
            role="radio"
            aria-checked={target === r}
            onClick={() => setRelativeTo(r)}
            className={`flex-1 rounded-md border py-1 ${target === r ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted'}`}
          >
            {r === 'selection' ? 'Each other' : r === 'page' ? 'Page' : 'Column'}
          </button>
        ))}
      </div>
      <div className="flex gap-1 mb-3 flex-wrap">
        {btn(<AlignStartVertical size={15} />, 'Align left', a('left'), !hasSelection)}
        {btn(<AlignCenterVertical size={15} />, 'Align centre', a('centerH'), !hasSelection)}
        {btn(<AlignEndVertical size={15} />, 'Align right', a('right'), !hasSelection)}
        {btn(<AlignStartHorizontal size={15} />, 'Align top', a('top'), !hasSelection)}
        {btn(<AlignCenterHorizontal size={15} />, 'Align middle', a('centerV'), !hasSelection)}
        {btn(<AlignEndHorizontal size={15} />, 'Align bottom', a('bottom'), !hasSelection)}
      </div>
      <p className="text-[11px] text-mt-faint mb-1.5">Space evenly (3 or more objects)</p>
      <div className="flex gap-1">
        {btn(<AlignHorizontalSpaceAround size={15} />, 'Space horizontally', () => distribute('h'), selectionCount < 3)}
        {btn(<AlignVerticalSpaceAround size={15} />, 'Space vertically', () => distribute('v'), selectionCount < 3)}
      </div>
    </div>
  );
}
