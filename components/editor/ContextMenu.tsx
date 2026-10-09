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
  shortcut?: string;
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
  const MENU_WIDTH = 240;
  const MENU_HEIGHT_ESTIMATE = items.length * 30 + 16;
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : x) - MENU_WIDTH - 8);
  const top = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : y) - MENU_HEIGHT_ESTIMATE - 8);

  return (
    <div
      ref={ref}
      data-testid="context-menu"
      style={{ position: 'fixed', left: Math.max(4, left), top: Math.max(4, top), zIndex: 100 }}
      role="menu"
      className="min-w-[220px] bg-mt-surface border border-mt-border rounded-xl shadow-[0_20px_50px_-12px_rgba(9,9,11,0.28)] p-1 text-[13px] select-none"
    >
      {items.map((item, i) =>
        isDivider(item) ? (
          <div key={i} className="my-1 border-t border-mt-border dark:border-mt-border" />
        ) : (
          <button
            key={item.label}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center justify-between gap-4 text-left px-2.5 py-1.5 rounded-lg ${
              item.disabled
                ? 'text-mt-faint cursor-default'
                : item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-mt-ink hover:bg-mt-surface2'
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-[11px] text-mt-faint tabular-nums">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}
