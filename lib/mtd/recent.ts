// ---------------------------------------------------------------------
// lib/mtd/recent.ts -- "Recent on this computer"
//
// A tiny list of recently saved/opened .mtd files, kept ONLY in this
// browser (IndexedDB) -- never sent to the Magical Touch Design server.
// It holds names, sizes and a small preview, plus (on Chrome/Edge) the
// browser's own file handle so the file can be reopened with one tap.
// The .mtd file itself stays wherever the customer saved it; clearing
// this list never touches the files.
// ---------------------------------------------------------------------

export interface RecentLocalFile {
  id: string; // file name is the identity: re-saving the same file updates it
  name: string;
  fileName: string;
  width: number;
  height: number;
  thumbnail: string | null;
  savedAt: string;
  handle: any | null;
}

const DB = 'mtd-local';
const STORE = 'recent';
const MAX_ITEMS = 12;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function listRecent(): Promise<RecentLocalFile[]> {
  try {
    const all = await tx<RecentLocalFile[]>('readonly', (s) => s.getAll() as IDBRequest<RecentLocalFile[]>);
    return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export async function rememberRecent(item: Omit<RecentLocalFile, 'id' | 'savedAt'>): Promise<void> {
  try {
    const entry: RecentLocalFile = { ...item, id: item.fileName.toLowerCase(), savedAt: new Date().toISOString() };
    try {
      await tx('readwrite', (s) => s.put(entry));
    } catch {
      // Some browsers can't store file handles; keep the entry without it.
      await tx('readwrite', (s) => s.put({ ...entry, handle: null }));
    }
    const all = await listRecent();
    for (const old of all.slice(MAX_ITEMS)) await tx('readwrite', (s) => s.delete(old.id));
  } catch (err) {
    console.warn('Could not update recent files list:', err);
  }
}

export async function forgetRecent(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    /* nothing to forget */
  }
}
