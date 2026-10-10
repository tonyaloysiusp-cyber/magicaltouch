// After a new version of the site is published, a tab that was opened
// earlier can ask for code files that no longer exist ("ChunkLoadError",
// "Failed to fetch dynamically imported module"). That used to end in a
// white page. Reloading once picks up the new version; a guard stops a
// reload loop if the network itself is down.

const KEY = 'mt:chunk-reload';

export function isChunkError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  const msg = `${e?.name || ''} ${e?.message || String(err ?? '')}`;
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
}

/** Reloads the page once per minute at most. Returns true if it reloaded. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: still try once */
  }
  window.location.reload();
  return true;
}

export function installChunkRecovery() {
  if (typeof window === 'undefined' || (window as any).__mtChunkRecovery) return;
  (window as any).__mtChunkRecovery = true;
  window.addEventListener('error', (ev) => { if (isChunkError(ev.error || ev.message)) reloadForNewVersion(); });
  window.addEventListener('unhandledrejection', (ev) => { if (isChunkError(ev.reason)) { ev.preventDefault(); reloadForNewVersion(); } });
}
