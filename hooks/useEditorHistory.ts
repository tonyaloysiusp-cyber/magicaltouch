'use client';

import { useCallback, useRef, useState } from 'react';
import { MAX_HISTORY } from '@/lib/editor/types';

const SNAPSHOT_PROPS = ['name', 'locked', 'visible', 'isVectorPath', 'clipPath', '__uid', '__lockRatio'];

export function useEditorHistory(
  fabricCanvasRef: React.MutableRefObject<any>,
  onRestore?: () => void
) {
  const historyRef = useRef<{ stack: string[]; index: number; suspend: boolean }>({
    stack: [],
    index: -1,
    suspend: false,
  });
  const suppressHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryButtons = useCallback(() => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const h = historyRef.current;
    if (!canvas || h.suspend || suppressHistoryRef.current) return;

    const json = JSON.stringify(canvas.toJSON(SNAPSHOT_PROPS));
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);

    if (h.stack.length > MAX_HISTORY) {
      h.stack.shift();
    }
    h.index = h.stack.length - 1;
    updateHistoryButtons();
  }, [fabricCanvasRef, updateHistoryButtons]);

  const loadHistoryState = useCallback(
    (index: number) => {
      const canvas = fabricCanvasRef.current;
      const h = historyRef.current;
      if (!canvas || index < 0 || index >= h.stack.length) return;

      h.suspend = true;
      canvas.loadFromJSON(h.stack[index], () => {
        canvas.renderAll();
        onRestore?.();
        h.suspend = false;
        h.index = index;
        updateHistoryButtons();
      });
    },
    [fabricCanvasRef, onRestore, updateHistoryButtons]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.index > 0) loadHistoryState(h.index - 1);
  }, [loadHistoryState]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) loadHistoryState(h.index + 1);
  }, [loadHistoryState]);

  const seedInitialSnapshot = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    historyRef.current.stack = [JSON.stringify(canvas.toJSON(SNAPSHOT_PROPS))];
    historyRef.current.index = 0;
    updateHistoryButtons();
  }, [fabricCanvasRef, updateHistoryButtons]);

  return {
    historyRef,
    suppressHistoryRef,
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    seedInitialSnapshot,
    SNAPSHOT_PROPS,
  };
}
