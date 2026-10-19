'use client';

import { useEffect, useRef } from 'react';

/** Calls `onEscape` when Escape is pressed (e.g. to close a dialog). */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      ref.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
