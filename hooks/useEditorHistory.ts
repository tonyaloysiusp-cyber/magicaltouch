'use client';

import { useCallback, useRef, useState } from 'react';
import { MAX_HISTORY } from '@/lib/editor/types';
import { ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';
import { PERSIST_PROPS } from '@/lib/editor/persist';

const SNAPSHOT_PROPS = PERSIST_PROPS;

// One undo history for the whole document. Every edit calls pushHistory();
// calls made during the same task (e.g. grouping fires a remove/add per
// object, then the caller pushes once more) are coalesced into a single
// undo step taken once the edit has finished.
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
  const pendingRef = useRef(false);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryButtons = useCallback(() => {
    const h = historyRef.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  const takeSnapshot: () => void = useCallback(() => {
    pendingRef.current = false;
    const canvas = fabricCanvasRef.current;
    const h = historyRef.current;
    if (!canvas) return;
    if (h.suspend || suppressHistoryRef.current) {
      // A load is in progress; record once it has finished.
      pendingRef.current = true;
      setTimeout(takeSnapshot, 50);
      return;
    }
    let json: string;
    try {
      json = JSON.stringify(canvas.toJSON(SNAPSHOT_PROPS));
    } catch (err) {
      console.warn('Could not record an undo step:', err);
      return;
    }
    if (h.stack[h.index] === json) return; // nothing actually changed
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);
    if (h.stack.length > MAX_HISTORY) h.stack.shift();
    h.index = h.stack.length - 1;
    updateHistoryButtons();
  }, [fabricCanvasRef, updateHistoryButtons]);

  const pushHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const h = historyRef.current;
    if (!canvas || h.suspend || suppressHistoryRef.current) return;
    if (pendingRef.current) return;
    pendingRef.current = true;
    // Runs after the current edit (and any follow-up calls it makes) is done.
    setTimeout(takeSnapshot, 0);
  }, [fabricCanvasRef, takeSnapshot]);

  // Records immediately (used right before an undo so a just-made edit is
  // never lost to the coalescing delay).
  const flushHistory = useCallback(() => {
    if (pendingRef.current) takeSnapshot();
  }, [takeSnapshot]);

  const loadHistoryState = useCallback(
    (index: number) => {
      const canvas = fabricCanvasRef.current;
      const h = historyRef.current;
      if (!canvas || index < 0 || index >= h.stack.length) return;

      h.suspend = true;
      const json = h.stack[index];
      canvas.discardActiveObject();
      canvas.loadFromJSON(json, () => {
        h.index = index;
        try {
          onRestoreRef.current?.();
        } finally {
          canvas.renderAll();
          h.suspend = false;
          updateHistoryButtons();
        }
        ensureFontsLoadedForCanvasJSON(json).then(() => canvas.requestRenderAll());
      });
    },
    [fabricCanvasRef, updateHistoryButtons]
  );

  const undo = useCallback(() => {
    flushHistory();
    const h = historyRef.current;
    if (h.index > 0) loadHistoryState(h.index - 1);
  }, [flushHistory, loadHistoryState]);

  const redo = useCallback(() => {
    flushHistory();
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) loadHistoryState(h.index + 1);
  }, [flushHistory, loadHistoryState]);

  const seedInitialSnapshot = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    pendingRef.current = false;
    historyRef.current.stack = [JSON.stringify(canvas.toJSON(SNAPSHOT_PROPS))];
    historyRef.current.index = 0;
    updateHistoryButtons();
  }, [fabricCanvasRef, updateHistoryButtons]);

  // Wholesale swap of the undo stack — used when switching between open
  // design tabs, each of which keeps its own history.
  const restoreHistory = useCallback(
    (stack: string[], index: number) => {
      pendingRef.current = false;
      historyRef.current.stack = stack;
      historyRef.current.index = index;
      updateHistoryButtons();
    },
    [updateHistoryButtons]
  );

  return {
    historyRef,
    suppressHistoryRef,
    canUndo,
    canRedo,
    pushHistory,
    flushHistory,
    undo,
    redo,
    seedInitialSnapshot,
    restoreHistory,
    SNAPSHOT_PROPS,
  };
}
