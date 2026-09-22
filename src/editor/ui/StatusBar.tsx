'use client';

import { EditorSnapshot } from '../core/EditorState';

interface Props {
  snapshot: EditorSnapshot;
}

export function StatusBar({ snapshot }: Props) {
  const { document, viewport, cursorDocX, cursorDocY } = snapshot;
  return (
    <div className="h-7 border-t bg-white flex items-center justify-between px-3 text-[11px] text-gray-500 shrink-0">
      <span>
        {document.document.width} × {document.document.height} px
      </span>
      <span>
        X: {Math.round(cursorDocX)} Y: {Math.round(cursorDocY)}
      </span>
      <span>{Math.round(viewport.zoom * 100)}%</span>
    </div>
  );
}
