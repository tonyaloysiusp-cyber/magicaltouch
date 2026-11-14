// The shared design-asset library — one place, on the customer's own device,
// for everything they make or bring: patterns, palettes, gradients, logos,
// SVGs, images and text styles. Every tool reads and writes the same
// library, so a pattern saved in Pattern Design is the exact same asset in
// the Textile Designer and the Wallpaper Designer, and editing it in
// Pattern Design updates it everywhere it is picked next.
//
// Storage: IndexedDB in this browser (nothing is uploaded). Assets have
// stable ids; projects store the id plus a copy of the data they used, so a
// project still opens if the asset is later deleted, and changing an asset
// never silently changes a finished project.

export type AssetKind = 'pattern' | 'palette' | 'gradient' | 'logo' | 'image' | 'svg' | 'text-style';
export interface Asset<T = any> {
  id: string;
  kind: AssetKind;
  name: string;
  data: T;
  /** Small preview (data URL) for pickers. */
  thumb?: string | null;
  /** Which tool made it (pattern, rangoli, textile, wall…). */
  source?: string;
  createdAt: string;
  updatedAt: string;
  bytes?: number;
}

const DB = 'mt-local-library';
const VERSION = 1;
const ASSETS = 'assets';
const STATES = 'toolStates';
const channelName = 'mt-assets';

let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('This browser has no on-device storage (IndexedDB).'));
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, VERSION);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(ASSETS)) { const s = db.createObjectStore(ASSETS, { keyPath: 'id' }); s.createIndex('kind', 'kind'); }
        if (!db.objectStoreNames.contains(STATES)) db.createObjectStore(STATES, { keyPath: 'tool' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbp = null; rej(r.error || new Error('On-device storage could not be opened.')); };
      r.onblocked = () => rej(new Error('On-device storage is busy in another tab.'));
    });
  }
  return dbp;
}
function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return open().then((db) => new Promise<T>((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    let value: T;
    if (req) req.onsuccess = () => { value = req.result; };
    // Resolve only when the browser confirms the write (transaction complete).
    t.oncomplete = () => res(value);
    t.onerror = () => rej(t.error || new Error('Could not write to on-device storage.'));
    t.onabort = () => rej(t.error || new Error('On-device storage is full or unavailable.'));
  }));
}

export const newAssetId = (kind: AssetKind) => `${kind}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function notify(ids: string[]) {
  try { const c = new BroadcastChannel(channelName); c.postMessage({ ids }); c.close(); } catch { /* old browser */ }
  try { window.dispatchEvent(new CustomEvent('mt-assets', { detail: { ids } })); } catch { /* server */ }
}

/** Every asset (optionally of one kind), newest first. */
export async function listAssets(kind?: AssetKind): Promise<Asset[]> {
  const all = await tx<Asset[]>(ASSETS, 'readonly', (s) => (kind ? s.index('kind').getAll(kind) : s.getAll()));
  return (all || []).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
export function getAsset<T = any>(id: string): Promise<Asset<T> | undefined> {
  return tx<Asset<T> | undefined>(ASSETS, 'readonly', (s) => s.get(id));
}
/** Create or update (same id = same asset everywhere). Resolves once the browser has confirmed the write. */
export async function putAsset<T>(a: Omit<Asset<T>, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): Promise<Asset<T>> {
  const now = new Date().toISOString();
  const prev = a.id ? await getAsset(a.id).catch(() => undefined) : undefined;
  const asset: Asset<T> = { ...a, id: a.id || newAssetId(a.kind), createdAt: prev?.createdAt || a.createdAt || now, updatedAt: now } as Asset<T>;
  try { asset.bytes = new Blob([JSON.stringify(asset.data)]).size + (asset.thumb?.length || 0); } catch { /* ignore */ }
  await tx(ASSETS, 'readwrite', (s) => s.put(asset));
  notify([asset.id]);
  return asset;
}
export async function deleteAsset(id: string): Promise<void> {
  await tx(ASSETS, 'readwrite', (s) => s.delete(id));
  notify([id]);
}

/** Call `fn` whenever any tool (in any tab) changes the library. Returns an unsubscribe. */
export function onAssetsChanged(fn: () => void): () => void {
  let c: BroadcastChannel | null = null;
  try { c = new BroadcastChannel(channelName); c.onmessage = () => fn(); } catch { /* ignore */ }
  const h = () => fn();
  window.addEventListener('mt-assets', h);
  return () => { c?.close(); window.removeEventListener('mt-assets', h); };
}

// ---------------------------------------------------------------- tool states
// Each tool's working state, so returning to a tool restores exactly where
// the customer left it (larger and safer than localStorage).

export async function saveToolState<T>(tool: string, state: T): Promise<void> {
  await tx(STATES, 'readwrite', (s) => s.put({ tool, state, savedAt: new Date().toISOString() }));
}
export async function loadToolState<T>(tool: string): Promise<T | null> {
  const r = await tx<{ state: T } | undefined>(STATES, 'readonly', (s) => s.get(tool)).catch(() => undefined);
  return r ? r.state : null;
}

// ---------------------------------------------------------------- storage info

export interface StorageInfo { usage: number | null; quota: number | null; persisted: boolean | null; assets: number; assetBytes: number }
export async function storageInfo(): Promise<StorageInfo> {
  let usage: number | null = null, quota: number | null = null, persisted: boolean | null = null;
  try { const e = await navigator.storage?.estimate?.(); usage = e?.usage ?? null; quota = e?.quota ?? null; } catch { /* ignore */ }
  try { persisted = (await navigator.storage?.persisted?.()) ?? null; } catch { /* ignore */ }
  const all = await listAssets().catch(() => [] as Asset[]);
  return { usage, quota, persisted, assets: all.length, assetBytes: all.reduce((s, a) => s + (a.bytes || 0), 0) };
}
/** Ask the browser to keep this site's storage (not clear it when space runs low). */
export async function requestPersistence(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}

// ---------------------------------------------------------------- backups

export async function exportLibrary(): Promise<Blob> {
  const assets = await listAssets();
  return new Blob([JSON.stringify({ format: 'mt-library', version: 1, exportedAt: new Date().toISOString(), assets })], { type: 'application/json' });
}
export async function importLibrary(file: File): Promise<number> {
  const j = JSON.parse(await file.text());
  if (j?.format !== 'mt-library' || !Array.isArray(j.assets)) throw new Error('This is not a Magical Touch library backup.');
  let n = 0;
  for (const a of j.assets) if (a?.id && a.kind && a.data !== undefined) { await tx(ASSETS, 'readwrite', (s) => s.put(a)); n++; }
  notify(j.assets.map((a: Asset) => a.id));
  return n;
}

// ---------------------------------------------------------------- migration
// Patterns saved before the library existed (localStorage "mt:patterns")
// are copied in once, keeping their names.
export async function migrateLegacyPatterns(): Promise<void> {
  try {
    if (localStorage.getItem('mt:patterns-migrated') === '1') return;
    const old = JSON.parse(localStorage.getItem('mt:patterns') || '[]');
    for (const s of Array.isArray(old) ? old : []) {
      if (s?.p?.motif) await putAsset({ kind: 'pattern', name: s.name || 'My pattern', data: s.p, source: 'pattern', thumb: null });
    }
    localStorage.setItem('mt:patterns-migrated', '1');
  } catch { /* storage unavailable — try again next time */ }
}
