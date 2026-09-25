'use client';

import { Plus, X } from 'lucide-react';

export interface EditorTabInfo {
  id: string;
  designId: string | null;
  name: string;
  width: number;
  height: number;
  dirty: boolean;
}

interface TabBarProps {
  tabs: EditorTabInfo[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string, e: React.MouseEvent) => void;
  onAdd: () => void;
}

// A CorelDRAW/Illustrator-style strip of open documents. Each tab is a
// fully independent design (own canvas, undo history, artboards) that
// the editor swaps in/out of the single live Fabric canvas on switch —
// see activateTab() in app/editor/page.tsx.
export function TabBar({ tabs, activeTabId, onSwitch, onClose, onAdd }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-3 pt-1.5 bg-gray-100 dark:bg-[#1E1E1E] border-b dark:border-[#3A3A3A] overflow-x-auto transition-colors duration-150">
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            title={tab.name}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium max-w-[180px] shrink-0 border border-b-0 ${
              active
                ? 'bg-white dark:bg-[#242424] text-gray-800 dark:text-gray-100 border-gray-200 dark:border-[#3A3A3A]'
                : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-white/60 dark:hover:bg-[#2B2B2B]'
            }`}
          >
            {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#EC1E79] shrink-0" />}
            <span className="truncate">{tab.name || 'Untitled Design'}</span>
            <span
              role="button"
              onClick={(e) => onClose(tab.id, e)}
              className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-[#3A3A3A] rounded p-0.5 shrink-0"
              title="Close"
            >
              <X size={11} />
            </span>
          </button>
        );
      })}
      <button
        onClick={onAdd}
        title="Open another design"
        className="p-1.5 rounded-t-lg text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#2B2B2B] shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
