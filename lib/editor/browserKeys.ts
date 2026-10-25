// Browser shortcuts that would pull people out of the editor (Ctrl/Cmd+D
// bookmark, +H history, +J downloads, +L address bar, +R reload, +P print,
// +O open file, +U page source, +K/+E search, +G find next, +B bookmarks,
// +S save page, +N new window). Inside the design editor and Photo Studio
// these never do the browser action — our own shortcut (or nothing) runs
// instead. Copy, paste, cut, select-all, undo, redo and find (+F) are left
// alone so text boxes keep working normally.
// (Ctrl+T and Ctrl+W can't be blocked by any web page.)

const BLOCK = new Set(['d', 'h', 'j', 'l', 'r', 'p', 'o', 'u', 'k', 'e', 'g', 'b', 's', 'n']);

/** Call first thing in an editor keydown handler. */
export function blockBrowserShortcut(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return false;
  if (!BLOCK.has(e.key.toLowerCase())) return false;
  e.preventDefault();
  return true;
}
