// Keeps a copy of unsaved work on this device (IndexedDB), so a lost
// connection, closed tab or crash never loses a design. The copy is
// removed once the design has been saved.

const DB = 'mt-editor';
const STORE = 'drafts';

export interface Draft {
  key: string;
  json: any;
  name: string;
  width: number;
  height: number;
  savedAt: number;
}

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req ? (req.result as T) : null);
      t.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export const putDraft = (d: Draft) => tx('readwrite', (s) => s.put(d));
export const getDraft = (key: string) => tx<Draft>('readonly', (s) => s.get(key));
export const deleteDraft = (key: string) => tx('readwrite', (s) => s.delete(key));

// Key for a design that has no account id yet.
export const UNSAVED_KEY = 'unsaved:latest';
