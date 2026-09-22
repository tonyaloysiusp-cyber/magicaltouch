'use client';

import { Hand, ZoomIn, LucideIcon } from 'lucide-react';
import { Editor } from '../core/Editor';
import { EditorSnapshot } from '../core/EditorState';
import { listToolsByCategory } from '../tools/ToolRegistry';

// Original, monochrome, lucide-react icons — no Adobe artwork. Generated
// from ToolRegistry per §48: adding a tool later means adding it to the
// registry (src/editor/tools/index.ts) and an entry here, never
// restructuring this component.
const ICONS: Record<string, LucideIcon> = {
  hand: Hand,
  zoom: ZoomIn,
};

interface Props {
  editor: Editor;
  snapshot: EditorSnapshot;
}

export function Toolbar({ editor, snapshot }: Props) {
  const groups = listToolsByCategory();
  return (
    <div className="w-12 border-r bg-white flex flex-col items-center py-2 gap-1 shrink-0">
      {Array.from(groups.entries()).map(([category, tools]) => (
        <div key={category} className="flex flex-col items-center gap-1">
          {tools.map((tool) => {
            const Icon = ICONS[tool.icon];
            const active = snapshot.activeToolId === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => editor.setActiveTool(tool.id)}
                title={`${tool.name}${tool.shortcut ? ` (${tool.shortcut})` : ''}\n${tool.description}`}
                className={`w-9 h-9 flex items-center justify-center rounded ${active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {Icon ? <Icon size={18} /> : <span className="text-[10px]">{tool.name.slice(0, 2)}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
