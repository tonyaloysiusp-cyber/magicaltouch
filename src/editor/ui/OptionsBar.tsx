'use client';

import { Editor } from '../core/Editor';
import { EditorSnapshot } from '../core/EditorState';
import { getTool } from '../tools/ToolRegistry';

interface Props {
  editor: Editor;
  snapshot: EditorSnapshot;
}

// Generated purely from the active tool's own schema (§31) — for Phase
// 1's two navigation tools that schema is empty, so this bar honestly
// shows just the tool's name/description rather than inventing controls
// that don't back real behavior.
export function OptionsBar({ snapshot }: Props) {
  const tool = getTool(snapshot.activeToolId);
  if (!tool) return <div className="h-9 border-b bg-white shrink-0" />;
  return (
    <div className="h-9 border-b bg-white flex items-center px-3 gap-3 text-xs text-gray-600 shrink-0">
      <span className="font-semibold text-gray-800">{tool.name}</span>
      <span className="text-gray-400">{tool.description}</span>
      {tool.optionsSchema.length === 0 && <span className="text-gray-300 italic">No options for this tool yet.</span>}
    </div>
  );
}
