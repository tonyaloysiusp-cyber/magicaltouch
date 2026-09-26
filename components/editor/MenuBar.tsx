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
    <div ref={barRef} className="flex items-center h-8 px-1 bg-white dark:bg-[#242424] border-b dark:border-[#3A3A3A] text-[13px] text-gray-800 dark:text-gray-200 select-none relative z-40 transition-colors duration-150">
      {leading && <div className="flex items-center pl-1 pr-3 shrink-0">{leading}</div>}
      {menus.map((menu, i) => (
        <div key={menu.label} className="relative">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            onMouseEnter={() => openIndex !== null && setOpenIndex(i)}
            className={`px-3 h-8 rounded-sm ${openIndex === i ? 'bg-gray-100 dark:bg-[#333333]' : 'hover:bg-gray-50 dark:hover:bg-[#333333]'}`}
          >
            {menu.label}
          </button>

          {openIndex === i && (
            <div className="absolute top-full left-0 mt-0.5 min-w-[220px] bg-white dark:bg-[#2B2B2B] border dark:border-[#3A3A3A] rounded-md shadow-lg py-1">
              {menu.items.map((item, j) =>
                isDivider(item) ? (
                  <div key={j} className="my-1 border-t border-gray-100 dark:border-[#3A3A3A]" />
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
                        ? 'text-gray-300 dark:text-gray-600 cursor-default'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-[#333333]'
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
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{item.shortcut}</span>
                      )}
                      {item.planned && (
                        <span className="text-[9px] bg-gray-100 dark:bg-[#3A3A3A] text-gray-400 dark:text-gray-500 rounded px-1 py-0.5">
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
