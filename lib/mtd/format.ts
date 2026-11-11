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
// Saved files are "Name.mtd.html": the same project, wrapped in a tiny web
// page so a double-click on any computer or phone opens the default browser,
// which hands the design to the site and lands in the editor. (A bare .mtd
// only opens by double-click where the site is installed as an app.)
export const MTD_OPEN_EXTENSION = '.mtd.html';
const SITE = 'https://www.magicaltouchdesign.com';
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
  // A self-opening "Name.mtd.html" file: the project sits inside as base64.
  if (head[0] === 0x3c /* < */) {
    const html = await file.text();
    const b64 = unwrapSelfOpening(html);
    if (!b64) throw new MtdError("This doesn't look like a Magical Touch Design project file.");
    return readText(new Blob([base64ToBytes(b64)]));
  }
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
  const bytes = new Uint8Array(await new Blob([blob]).arrayBuffer());
  const html = await wrapSelfOpening(file.document.name, file.thumbnail, bytes);
  return { blob: new Blob([html], { type: 'text/html' }), unembedded };
}

// ---------- the self-opening wrapper ----------

const DATA_OPEN = '<textarea name="mtd" hidden>';
const DATA_CLOSE = '</textarea>';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(out);
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** The base64 project inside a self-opening file, or null. */
export function unwrapSelfOpening(html: string): string | null {
  const a = html.indexOf(DATA_OPEN);
  if (a < 0) return null;
  const b = html.indexOf(DATA_CLOSE, a + DATA_OPEN.length);
  if (b < 0) return null;
  const b64 = html.slice(a + DATA_OPEN.length, b).replace(/\s+/g, '');
  return /^[A-Za-z0-9+/]+=*$/.test(b64) ? b64 : null;
}

async function iconDataUrl(): Promise<string> {
  try {
    const r = await fetch('/brand/file-icon/mtd-128.png');
    if (r.ok) return await blobToDataUrl(await r.blob());
  } catch {}
  return '';
}

async function wrapSelfOpening(name: string, thumbnail: string | null, bytes: Uint8Array): Promise<string> {
  const title = esc(name || 'Untitled Design');
  const icon = await iconDataUrl();
  const origin = typeof window !== 'undefined' && /^https?:/.test(window.location.origin) ? window.location.origin : SITE;
  const thumb = thumbnail && /^data:image\//.test(thumbnail) ? `<img class="t" src="${esc(thumbnail)}" alt="">` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="${MTD_FORMAT}">
<title>${title} · Magical Touch Design</title>${icon ? `<link rel="icon" href="${icon}">` : ''}
<style>body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f6f5f2;color:#14121f;display:grid;place-items:center;min-height:100vh}main{max-width:440px;padding:32px 24px;text-align:center}h1{font-size:20px;margin:12px 0 2px}.s{color:#6b6878;font-size:13px;margin:4px 0}.t{display:block;margin:20px auto 0;max-width:100%;max-height:280px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.14)}button{margin-top:22px;height:48px;padding:0 28px;border:0;border-radius:999px;background:#14121f;color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer}</style>
</head><body><main>
${icon ? `<img src="${icon}" width="64" height="64" alt="">` : ''}
<h1>${title}</h1><p class="s">Magical Touch Design file</p>${thumb}
<form id="mtd-open" method="post" action="${origin}/api/open-file" enctype="multipart/form-data">
<input type="hidden" name="name" value="${title}">
${DATA_OPEN}${bytesToBase64(bytes)}${DATA_CLOSE}
<button type="submit">Open in Magical Touch Design</button>
</form>
<p class="s" id="note">Opening in your browser… If nothing happens, press the button — or go to magicaltouchdesign.com → Dashboard → Open file and choose this file.</p>
</main>
<script>setTimeout(function(){try{document.getElementById('mtd-open').submit()}catch(e){}},500)</script>
</body></html>`;
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
  const safe = (name || 'Untitled Design').replace(/[\\/:*?"<>|]+/g, '-').trim().replace(/\.mtd(\.html)?$/i, '') || 'Untitled Design';
  return safe + MTD_OPEN_EXTENSION;
}

export function nameFromFileName(fileName: string): string {
  return fileName.replace(/\.mtd(\.html?)?$/i, '').replace(/\.html?$/i, '') || 'Untitled Design';
}
