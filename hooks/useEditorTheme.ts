// ---------------------------------------------------------------------
// hooks/useEditorTheme.ts
// Light/dark theme for the editor's own chrome (toolbar, panels, canvas
// surround) only — scoped by wrapping the editor's root element in a
// `dark` class rather than touching <html>/<body>, so it never affects
// the homepage, dashboard, or any other route. Persisted to localStorage
// so a refresh keeps whatever the user picked last.
// ---------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';

export type EditorTheme = 'light' | 'dark';

const STORAGE_KEY = 'editorTheme';

function readStoredTheme(): EditorTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useEditorTheme() {
  // Start at the real stored value on first client render (not just
  // 'light' then flipping a frame later) to avoid a visible flash.
  const [theme, setTheme] = useState<EditorTheme>(readStoredTheme);

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
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
