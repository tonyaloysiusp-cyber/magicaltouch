'use client';

import { useEffect, useState } from 'react';
import { Editor } from '../core/Editor';

interface Props {
  editor: Editor;
}

// Real command labels from History (a facade over CommandManager), not
// a fabricated list — every entry corresponds to an actual executed
// Command with working undo()/redo() (§33).
export function HistoryPanel({ editor }: Props) {
  const [entries, setEntries] = useState(editor.history.entries);

  useEffect(() => {
    setEntries(editor.history.entries);
    return editor.history.subscribe(() => setEntries(editor.history.entries));
  }, [editor]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide px-3 py-2 border-b">History</p>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 && <p className="text-xs text-gray-400 px-3 py-4 text-center">No actions yet.</p>}
        {entries.map((entry, i) => (
          <div key={i} className={`px-3 py-1 text-xs ${entry.isFuture ? 'text-gray-300' : 'text-gray-700'}`}>
            {entry.label}
          </div>
        ))}
      </div>
    </div>
  );
}
