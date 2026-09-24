'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------
// ContextMenu
//
// A real right-click menu: closes on an outside click, Escape, or after
// any item fires — same dismiss conventions as MenuBar's own dropdowns.
// Every item calls a real function the caller passes in; this component
// has no editing logic of its own.
// ---------------------------------------------------------------------

export interface ContextMenuAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: false;
}
export interface ContextMenuDivider {
  divider: true;
}
export type ContextMenuEntry = ContextMenuAction | ContextMenuDivider;

interface Props {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

function isDivider(item: ContextMenuEntry): item is ContextMenuDivider {
  return (item as ContextMenuDivider).divider === true;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // A capturing listener so a right-click that opens ANOTHER context
    // menu elsewhere still closes this one first, same as a native menu.
    window.addEventListener('mousedown', handleOutside, true);
    window.addEventListener('contextmenu', handleOutside, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside, true);
      window.removeEventListener('contextmenu', handleOutside, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Keep the menu on-screen even when the right-click lands near an edge.
  const MENU_WIDTH = 200;
  const MENU_HEIGHT_ESTIMATE = items.length * 30 + 16;
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : x) - MENU_WIDTH - 8);
  const top = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : y) - MENU_HEIGHT_ESTIMATE - 8);

  return (
    <div
      ref={ref}
      data-testid="context-menu"
      style={{ position: 'fixed', left: Math.max(4, left), top: Math.max(4, top), zIndex: 100 }}
      className="min-w-[190px] bg-white border rounded-md shadow-lg py-1 text-[13px] select-none"
    >
      {items.map((item, i) =>
        isDivider(item) ? (
          <div key={i} className="my-1 border-t border-gray-100" />
        ) : (
          <button
            key={item.label}
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 ${
              item.disabled ? 'text-gray-300 cursor-default' : item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-purple-50'
            }`}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
