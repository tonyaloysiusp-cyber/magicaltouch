// ---------------------------------------------------------------------
// src/editor/core/ProjectStore.ts
// Real local persistence via the browser's native IndexedDB — no
// external dependency, no network call, no claim of cloud sync. See
// docs/file-format.md for the schema and versioning policy.
// ---------------------------------------------------------------------

import { DocumentModel } from './Document';

const DB_NAME = 'magicaltouch-studio';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'document.id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface DocumentSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export async function saveDocument(doc: DocumentModel): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(doc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDocument(id: string): Promise<DocumentModel | null> {
  const db = await openDb();
  const result = await new Promise<DocumentModel | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as DocumentModel) || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (result && result.version > 1) {
    throw new Error(`Document was saved with a newer format (v${result.version}) than this build understands (v1).`);
  }
  return result;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const db = await openDb();
  const result = await new Promise<DocumentSummary[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const docs = (req.result as DocumentModel[]) || [];
      resolve(docs.map((d) => ({ id: d.document.id, name: d.document.name, updatedAt: d.document.updatedAt })));
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
