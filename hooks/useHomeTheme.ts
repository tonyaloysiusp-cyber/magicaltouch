// ---------------------------------------------------------------------
// hooks/useHomeTheme.ts
// Day/night theme for the public homepage only — completely separate
// from useEditorTheme (which scopes to the editor's own chrome). Applies
// a `dark` class on the homepage's own root element rather than
// <html>/<body>, so it never affects the editor, dashboard, or any other
// route. Persisted to localStorage so a refresh keeps whatever the
// visitor picked last.
// ---------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';

export type HomeTheme = 'day' | 'night';

const STORAGE_KEY = 'homeTheme';

function readStoredTheme(): HomeTheme {
  if (typeof window === 'undefined') return 'day';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

export function useHomeTheme() {
  // Always start at 'day' — matching what a static prerender of the
  // homepage always ships as server HTML — then flip to the real stored
  // value in an effect once mounted. Reading localStorage synchronously
  // in the initializer (like useEditorTheme does for its client-only
  // panel) would make the very first client render disagree with the
  // static HTML for any returning "night" visitor, which React reports
  // as a hydration mismatch (error #418) rather than silently repainting.
  const [theme, setTheme] = useState<HomeTheme>('day');

  useEffect(() => {
    setTheme(readStoredTheme());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing / storage disabled — theme just won't persist
      // across a refresh, which is a harmless degradation.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'night' ? 'day' : 'night'));
  }, []);

  return { theme, toggleTheme };
}
