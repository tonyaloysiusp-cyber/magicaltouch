'use client';

import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
} from 'lucide-react';

// ---------------------------------------------------------------------
// AlignPanel
//
// Real Illustrator-style Align panel. Reuses the alignObject function
// that already exists in the editor (aligns to canvas/artboard).
// Distribute-among-selection is marked planned since it needs
// multi-object relative positioning, not built yet.
// ---------------------------------------------------------------------

interface Props {
  alignObject: (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void;
  hasSelection: boolean;
}

export function AlignPanel({ alignObject, hasSelection }: Props) {
  const btn = (
    icon: React.ReactNode,
    label: string,
    mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'
  ) => (
    <button
      key={mode}
      title={label}
      disabled={!hasSelection}
      onClick={() => alignObject(mode)}
      className="w-8 h-8 flex items-center justify-center border dark:border-[#3A3A3A] rounded hover:bg-purple-50 dark:hover:bg-[#333333] disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 dark:text-gray-300"
    >
      {icon}
    </button>
  );

  return (
    <div className="p-3">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-3 text-sm">Align</p>

      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">
        Align to Artboard
      </p>
      <div className="flex gap-1 mb-3">
        {btn(<AlignStartVertical size={15} />, 'Align Left', 'left')}
        {btn(<AlignCenterVertical size={15} />, 'Align Center Horizontal', 'centerH')}
        {btn(<AlignEndVertical size={15} />, 'Align Right', 'right')}
        {btn(<AlignStartHorizontal size={15} />, 'Align Top', 'top')}
        {btn(<AlignCenterHorizontal size={15} />, 'Align Center Vertical', 'centerV')}
        {btn(<AlignEndHorizontal size={15} />, 'Align Bottom', 'bottom')}
      </div>

      <p className="text-[10px] font-semibold text-gray-300 dark:text-gray-600 mb-1.5 uppercase tracking-wide">
        Distribute (Planned)
      </p>
      <div className="flex gap-1 opacity-40 pointer-events-none">
        {btn(<AlignStartVertical size={15} />, 'Distribute Left', 'left')}
        {btn(<AlignCenterVertical size={15} />, 'Distribute Center', 'centerH')}
        {btn(<AlignEndVertical size={15} />, 'Distribute Right', 'right')}
      </div>
    </div>
  );
}
