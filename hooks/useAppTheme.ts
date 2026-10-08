'use client';

// ---------------------------------------------------------------------
// hooks/useAppTheme.ts
// ONE global light/dark theme shared by every route -- homepage,
// templates, dashboard, editor, photo project, auth pages. Replaces the
// two previously separate, unsynced hooks (useHomeTheme's 'day'/'night'
// and useEditorTheme's 'light'/'dark'): switching the theme on any page
// now updates every other page too, including ones already open in
// another tab (via the native `storage` event), and there is exactly one
// localStorage key instead of two that could disagree with each other.
// ---------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'appTheme';

function readStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useAppTheme() {
  // Always start at 'light' — matching what a static prerender always
  // ships as server HTML — then flip to the real stored value in an
  // effect once mounted. Reading localStorage synchronously in the
  // initializer would make the very first client render disagree with
  // the static HTML for any returning dark-mode visitor, which React
  // reports as a hydration mismatch (error #418) rather than silently
  // repainting.
  const [theme, setTheme] = useState<AppTheme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setReady(true);

    // Keeps every other open tab/route in sync the instant the theme
    // changes anywhere else -- `storage` only fires in OTHER documents,
    // never the one that made the write, so this can't loop.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTheme(e.newValue === 'dark' ? 'dark' : 'light');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    // The whole document follows the theme, so pages and parts that
    // never wrap themselves in a `dark` element (admin, legal pages,
    // dialogs rendered at the root) still switch with everything else.
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing / storage disabled — theme just won't persist
      // across a refresh or sync to other tabs, a harmless degradation.
    }
  }, [theme, ready]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme, setTheme };
}
