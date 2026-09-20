// ---------------------------------------------------------------------
// lib/editor/tabSession.ts
// Persists the editor's open-tab list (+ each background tab's frozen
// canvas snapshot) to sessionStorage, keyed to this one browser tab.
//
// Why this exists: "New Design" routes through the existing /create
// flow, which is a real page navigation away from /editor and back —
// that unmounts the editor's React tree, so anything living only in
// component state (the tabs array, tabSnapshotsRef) would be wiped out,
// silently closing every other open design the instant a new one was
// created. Persisting here across that round trip is what lets the
// other tabs survive it; the editor rehydrates from this on mount and
// adds the newly-created design as one more tab instead of replacing
// the session with just itself.
// ---------------------------------------------------------------------

const STORAGE_KEY = 'mt:editor-tab-session';

export interface PersistedTabInfo {
  id: string;
  designId: string | null;
  name: string;
  width: number;
  height: number;
  dirty: boolean;
}

export interface PersistedTabSession {
  tabs: PersistedTabInfo[];
  activeTabId: string;
  snapshots: Record<string, any>;
}

export function loadTabSession(): PersistedTabSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tabs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTabSession(session: PersistedTabSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota exceeded (a very large design's canvas JSON, e.g. several
    // embedded high-res images) — fail silently. Worst case, this one
    // navigation round trip doesn't preserve every open tab; it never
    // crashes the editor over it.
  }
}

export function clearTabSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
