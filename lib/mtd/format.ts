// ---------------------------------------------------------------------
// lib/mtd/format.ts -- the Magical Touch Design project file (.mtd)
//
// A .mtd file is the customer's master editable project. It is fully
// self-contained, so it opens on any computer, from a USB stick, email
// attachment or cloud drive, even if the website's database is wiped:
//
//   gzip( JSON {
//     format: "magical-touch-design",
//     formatVersion: 1,
//     app:       { name, savedWith },
//     document:  { name, width, height, editor, createdAt, savedAt },
//     canvas:    the editor's full document (layers, vectors, text,
//                masks, effects, artboards, guides...), with every image
//                replaced by a reference "mtd-asset://<sha256>"
//     assets:    { "<sha256>": { mime, size, data: "data:..." } }
//     fonts:     font families used (names only -- fonts themselves
//                are never packaged, for licensing reasons)
//     thumbnail: small JPEG preview,
//     template:  { id, version } when started from a template
//   })
//
// Images are de-duplicated by content hash, so the same photo used five
// times is stored once. Files are gzip-compressed when the browser
// supports it; plain-JSON .mtd files open just as well.
// ---------------------------------------------------------------------

export const MTD_FORMAT = 'magical-touch-design';
export const MTD_VERSION = 1;
export const MTD_EXTENSION = '.mtd';
export const MTD_MIME = 'application/x-magical-touch-design';
const ASSET_PREFIX = 'mtd-asset://';
const MAX_FILE_BYTES = 500 * 1024 * 1024;
// Object keys whose string values may point at image data.
const IMAGE_KEYS = new Set(['src', '__originalSrc', 'source']);

export class MtdError extends Error {}

export interface MtdDocumentInfo {
  name: string;
  width: number;
  height: number;
  editor: 'design' | 'photo-studio';
  createdAt?: string;
  savedAt?: string;
}

export interface MtdAsset {
  mime: string;
  size: number;
  data: string; // data: URL
}

export interface MtdFile {
  format: typeof MTD_FORMAT;
  formatVersion: number;
  app: { name: string; savedWith: string };
  document: MtdDocumentInfo;
  canvas: any;
  assets: Record<string, MtdAsset>;
  fonts: string[];
  thumbnail: string | null;
  template?: { id: string; version?: string } | null;
}

export interface OpenedMtd {
  document: MtdDocumentInfo;
  canvas: any; // ready for canvas.loadFromJSON (assets restored inline)
  fonts: string[];
  thumbnail: string | null;
  template: MtdFile['template'];
  missingAssets: string[];
}

// ---------- helpers ----------

function walk(node: any, visit: (holder: any, key: string, value: string) => void) {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (typeof value === 'string' && IMAGE_KEYS.has(key)) visit(node, key, value);
      else if (value && typeof value === 'object') walk(value, visit);
    }
  }
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function srcToBlob(src: string): Promise<Blob | null> {
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

async function gzip(text: string): Promise<Blob> {
  const raw = new Blob([text], { type: 'application/json' });
  if (typeof (globalThis as any).CompressionStream === 'undefined') return raw;
  const stream = raw.stream().pipeThrough(new (globalThis as any).CompressionStream('gzip'));
  return await new Response(stream).blob();
}

async function readText(file: Blob): Promise<string> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  const isGzip = head[0] === 0x1f && head[1] === 0x8b;
  if (!isGzip) return await file.text();
  if (typeof (globalThis as any).DecompressionStream === 'undefined') {
    throw new MtdError('This browser is too old to open compressed .mtd files. Please update your browser.');
  }
  const stream = file.stream().pipeThrough(new (globalThis as any).DecompressionStream('gzip'));
  return await new Response(stream).text();
}

// ---------- writing ----------

export interface BuildOptions {
  canvas: any;
  document: MtdDocumentInfo;
  thumbnail?: string | null;
  template?: MtdFile['template'];
}

export interface BuildResult {
  blob: Blob;
  // Images that couldn't be embedded (e.g. a remote site blocked the
  // download). They stay as links and will need internet to show.
  unembedded: number;
}

export async function buildMtd(opts: BuildOptions): Promise<BuildResult> {
  const canvas = JSON.parse(JSON.stringify(opts.canvas));
  const assets: Record<string, MtdAsset> = {};
  const fonts = new Set<string>();
  const byOriginal = new Map<string, string>();
  const pending: { holder: any; key: string; value: string }[] = [];
  let unembedded = 0;

  walk(canvas, (holder, key, value) => {
    if (/^(data:|https?:|blob:)/i.test(value)) pending.push({ holder, key, value });
  });
  (function collectFonts(node: any) {
    if (Array.isArray(node)) node.forEach(collectFonts);
    else if (node && typeof node === 'object') {
      if (typeof node.fontFamily === 'string') fonts.add(node.fontFamily);
      Object.values(node).forEach((v) => v && typeof v === 'object' && collectFonts(v));
    }
  })(canvas);

  for (const item of pending) {
    let ref = byOriginal.get(item.value);
    if (!ref) {
      const blob = await srcToBlob(item.value);
      if (!blob) {
        unembedded++;
        continue;
      }
      const hash = await sha256Hex(await blob.arrayBuffer());
      if (!assets[hash]) assets[hash] = { mime: blob.type || 'application/octet-stream', size: blob.size, data: await blobToDataUrl(blob) };
      ref = ASSET_PREFIX + hash;
      byOriginal.set(item.value, ref);
    }
    item.holder[item.key] = ref;
  }

  const file: MtdFile = {
    format: MTD_FORMAT,
    formatVersion: MTD_VERSION,
    app: { name: 'Magical Touch Design', savedWith: typeof window !== 'undefined' ? window.location.origin : '' },
    document: { ...opts.document, savedAt: new Date().toISOString() },
    canvas,
    assets,
    fonts: Array.from(fonts).sort(),
    thumbnail: opts.thumbnail ?? null,
    template: opts.template ?? null,
  };
  const blob = await gzip(JSON.stringify(file));
  return { blob: new Blob([blob], { type: MTD_MIME }), unembedded };
}

// ---------- reading ----------

export async function readMtd(file: Blob): Promise<OpenedMtd> {
  if (file.size === 0) throw new MtdError('This file is empty.');
  if (file.size > MAX_FILE_BYTES) throw new MtdError('This file is larger than 500 MB and cannot be opened.');

  let parsed: any;
  try {
    parsed = JSON.parse(await readText(file));
  } catch (err) {
    if (err instanceof MtdError) throw err;
    throw new MtdError("This doesn't look like a Magical Touch Design project (.mtd) file, or the file is damaged.");
  }

  if (!parsed || parsed.format !== MTD_FORMAT) {
    throw new MtdError("This doesn't look like a Magical Touch Design project (.mtd) file.");
  }
  if (typeof parsed.formatVersion !== 'number' || parsed.formatVersion > MTD_VERSION) {
    throw new MtdError('This project was saved with a newer version of Magical Touch Design. Please refresh the page and try again.');
  }
  const doc = parsed.document || {};
  if (!parsed.canvas || typeof parsed.canvas !== 'object' || !Array.isArray(parsed.canvas.objects)) {
    throw new MtdError('This project file is damaged: its design data is missing.');
  }
  const width = Number(doc.width);
  const height = Number(doc.height);
  if (!(width > 0) || !(height > 0)) throw new MtdError('This project file is damaged: its page size is missing.');

  const assets: Record<string, MtdAsset> = parsed.assets && typeof parsed.assets === 'object' ? parsed.assets : {};
  const missing = new Set<string>();
  walk(parsed.canvas, (holder, key, value) => {
    if (!value.startsWith(ASSET_PREFIX)) return;
    const id = value.slice(ASSET_PREFIX.length);
    const asset = assets[id];
    // Only image data is ever restored -- never scripts or HTML.
    if (asset && typeof asset.data === 'string' && /^data:image\//i.test(asset.data)) {
      holder[key] = asset.data;
    } else {
      missing.add(id);
      holder[key] = '';
    }
  });

  return {
    document: {
      name: String(doc.name || 'Untitled Design').slice(0, 200),
      width,
      height,
      editor: doc.editor === 'photo-studio' ? 'photo-studio' : 'design',
      createdAt: doc.createdAt,
      savedAt: doc.savedAt,
    },
    canvas: parsed.canvas,
    fonts: Array.isArray(parsed.fonts) ? parsed.fonts.filter((f: unknown) => typeof f === 'string') : [],
    thumbnail: typeof parsed.thumbnail === 'string' && parsed.thumbnail.startsWith('data:image/') ? parsed.thumbnail : null,
    template: parsed.template ?? null,
    missingAssets: Array.from(missing),
  };
}

export function fileNameFor(name: string): string {
  const safe = (name || 'Untitled Design').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Untitled Design';
  return safe.toLowerCase().endsWith(MTD_EXTENSION) ? safe : safe + MTD_EXTENSION;
}

export function nameFromFileName(fileName: string): string {
  return fileName.replace(/\.mtd$/i, '') || 'Untitled Design';
}
