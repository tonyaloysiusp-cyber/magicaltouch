'use client';

import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------
// MenuBar
//
// A real File/Edit/Object/Type/Select/View/Window/Help menu bar.
// Every item either calls a real function passed in via props, or is
// rendered disabled with a "Planned" tag — never a fake working button.
// ---------------------------------------------------------------------

export interface MenuAction {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  planned?: boolean; // shows a "Planned" tag instead of pretending to work
  checked?: boolean; // shows a real checkmark for a persistent on/off toggle
  divider?: false;
}

export interface MenuDivider {
  divider: true;
}

export type MenuItem = MenuAction | MenuDivider;

export interface MenuDef {
  label: string;
  items: MenuItem[];
}

interface Props {
  menus: MenuDef[];
  leading?: React.ReactNode;
}

function isDivider(item: MenuItem): item is MenuDivider {
  return (item as MenuDivider).divider === true;
}

export function MenuBar({ menus, leading }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={barRef} className="flex items-center h-8 px-1 bg-mt-surface dark:bg-mt-surface border-b dark:border-mt-border text-[13px] text-mt-ink dark:text-mt-ink select-none relative z-40 transition-colors duration-150">
      {leading && <div className="flex items-center pl-1 pr-3 shrink-0">{leading}</div>}
      {menus.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            onMouseEnter={() => openIndex !== null && setOpenIndex(i)}
            className={`px-3 h-8 rounded-sm ${openIndex === i ? 'bg-mt-surface2 dark:bg-mt-surface2' : 'hover:bg-mt-surface2 dark:hover:bg-mt-surface2'}`}
          >
            {menu.label}
          </button>

          {openIndex === i && (
            <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-mt-surface dark:bg-mt-surface border dark:border-mt-border rounded-md shadow-lg py-1">
              {menu.items.map((item, j) =>
                isDivider(item) ? (
                  <div key={j} className="my-1 border-t border-mt-border dark:border-mt-border" />
                ) : (
                  <button
                    key={item.label}
                    disabled={item.disabled || item.planned}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      setOpenIndex(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-left ${
                      item.disabled || item.planned
                        ? 'text-mt-faint dark:text-mt-faint cursor-default'
                        : 'text-mt-ink dark:text-mt-ink hover:bg-purple-50 dark:hover:bg-mt-surface2'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {item.checked !== undefined && (
                        <span className="w-3 text-[11px] text-purple-600 dark:text-purple-400">{item.checked ? '✓' : ''}</span>
                      )}
                      <span>{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 ml-4">
                      {item.shortcut && (
                        <span className="text-[11px] text-mt-faint dark:text-mt-muted font-mono">{item.shortcut}</span>
                      )}
                      {item.planned && (
                        <span className="text-[9px] bg-mt-surface2 dark:bg-mt-surface2 text-mt-faint dark:text-mt-muted rounded px-1 py-0.5">
                          Planned
                        </span>
                      )}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
