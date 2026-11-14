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
//     tool:      for projects made in a dedicated tool (jersey, polo,
//                T-shirt, pattern, wall): { kind, version, data } with every
//                setting, player, size, logo and colour, so the project
//                reopens in that tool exactly as it was saved
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
// Saved files are "Name.mtd.svg": the same project inside a picture of the
// design with the Magical Touch badge. File managers (Mac Finder, iPhone and
// iPad Files, Android, Linux) show that picture as the file's icon with
// nothing to install, and a double-click opens the default browser (SVG files
// open in the browser on Windows), which hands the design to the site and
// lands in the editor. Older "Name.mtd.html" and ".mtd" files still open.
export const MTD_OPEN_EXTENSION = '.mtd.svg';
const SITE = 'https://www.magicaltouchdesign.com';
const ASSET_PREFIX = 'mtd-asset://';
const MAX_FILE_BYTES = 500 * 1024 * 1024;
// Object keys whose string values may point at image data.
const IMAGE_KEYS = new Set(['src', '__originalSrc', 'source']);

export class MtdError extends Error {}

/** Projects made in a dedicated tool rather than the design editor. */
export type ToolKind = 'jersey' | 'polo' | 'tshirt' | 'pattern' | 'wall';
export const TOOL_KINDS: ToolKind[] = ['jersey', 'polo', 'tshirt', 'pattern', 'wall'];
export const TOOL_PATHS: Record<ToolKind, string> = { jersey: '/textile-designer', polo: '/textile-designer', tshirt: '/textile-designer', pattern: '/patterns', wall: '/wallpaper-designer' };
export interface MtdTool { kind: ToolKind; version: number; data: any }
export const isToolKind = (v: unknown): v is ToolKind => typeof v === 'string' && (TOOL_KINDS as string[]).includes(v);
/** Where an opened project belongs (tool projects open in their tool). */
export function toolUrlFor(opened: { tool?: MtdTool | null }, key: string): string | null {
  return opened.tool ? `${TOOL_PATHS[opened.tool.kind]}?localDoc=${encodeURIComponent(key)}` : null;
}

export interface MtdDocumentInfo {
  name: string;
  width: number;
  height: number;
  editor: 'design' | 'photo-studio' | ToolKind;
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
  tool?: MtdTool | null;
}

export interface OpenedMtd {
  document: MtdDocumentInfo;
  canvas: any; // ready for canvas.loadFromJSON (assets restored inline)
  fonts: string[];
  thumbnail: string | null;
  template: MtdFile['template'];
  missingAssets: string[];
  tool?: MtdTool | null;
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
  tool?: MtdTool | null;
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
    ...(opts.tool ? { tool: opts.tool } : {}),
  };
  const blob = await gzip(JSON.stringify(file));
  const bytes = new Uint8Array(await new Blob([blob]).arrayBuffer());
  const html = await wrapSelfOpening(file.document.name, file.thumbnail, bytes);
  return { blob: new Blob([html], { type: 'image/svg+xml' }), unembedded };
}

// ---------- the self-opening wrapper ----------

const DATA_OPEN = '<textarea name="mtd" hidden="hidden">';
const DATA_OPEN_RE = /<textarea name="mtd" hidden(?:="hidden")?>/;
const DATA_CLOSE = '</textarea>';
const MTD_NS = 'https://www.magicaltouchdesign.com/ns/mtd';
const META_RE = /<mt:file\b[^>]*>([A-Za-z0-9+/=\s]+)<\/mt:file>/;

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
  // Current files: the design is SVG metadata (<mt:file>…</mt:file>).
  const meta = META_RE.exec(html);
  if (meta) { const b = meta[1].replace(/\s+/g, ''); if (/^[A-Za-z0-9+/]+=*$/.test(b)) return b; }
  // Older files: a hidden form field.
  const m = DATA_OPEN_RE.exec(html);
  if (!m) return null;
  const start = m.index + m[0].length;
  const b = html.indexOf(DATA_CLOSE, start);
  if (b < 0) return null;
  const b64 = html.slice(start, b).replace(/\s+/g, '');
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
  const thumb = thumbnail && /^data:image\//.test(thumbnail) ? esc(thumbnail) : '';
  // 1024 × 1024 picture: the design on a soft card + the brand badge.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024">
<title>${title} · Magical Touch Design</title>
<desc>Magical Touch Design file (${MTD_FORMAT}). Double-click to open it in your browser and keep editing at magicaltouchdesign.com.</desc>
<defs>
<linearGradient id="mt-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDF2F6"/><stop offset=".5" stop-color="#EEF7FD"/><stop offset="1" stop-color="#F1F9EA"/></linearGradient>
<linearGradient id="mt-sp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F2708F"/><stop offset=".3" stop-color="#A69BD3"/><stop offset=".55" stop-color="#35C2F1"/><stop offset=".78" stop-color="#5DCCB8"/><stop offset="1" stop-color="#8CC84B"/></linearGradient>
<clipPath id="mt-card"><rect x="112" y="96" width="800" height="760" rx="36"/></clipPath>
<filter id="mt-sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0B0B0F" flood-opacity=".22"/></filter>
</defs>
<rect width="1024" height="1024" rx="120" fill="url(#mt-bg)"/>
<rect x="112" y="96" width="800" height="760" rx="36" fill="#FFFFFF" filter="url(#mt-sh)"/>
${thumb ? `<image clip-path="url(#mt-card)" x="132" y="116" width="760" height="720" preserveAspectRatio="xMidYMid meet" href="${thumb}" xlink:href="${thumb}"/>` : `<text x="512" y="490" text-anchor="middle" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="#14121F">${title}</text>`}
<rect x="0" y="928" width="1024" height="12" fill="url(#mt-sp)"/>
${icon ? `<image x="760" y="740" width="200" height="200" href="${icon}" xlink:href="${icon}"/>` : `<circle cx="860" cy="840" r="96" fill="url(#mt-sp)"/>`}
<text x="112" y="905" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="34" font-weight="700" fill="#14121F">${title.length > 34 ? title.slice(0, 33) + '…' : title}</text>
<metadata><mt:file xmlns:mt="${MTD_NS}" format="${MTD_FORMAT}" name="${title}" encoding="base64">${bytesToBase64(bytes)}</mt:file></metadata>
<script type="text/javascript"><![CDATA[
// Opened in a browser: send the design to Magical Touch Design to keep editing.
// (Picture viewers and file thumbnails ignore this and just show the image.)
setTimeout(function(){try{
var NS='http://www.w3.org/1999/xhtml',d=document,m=d.getElementsByTagNameNS('${MTD_NS}','file')[0];if(!m)return;
var fo=d.createElementNS('http://www.w3.org/2000/svg','foreignObject');fo.setAttribute('width','1');fo.setAttribute('height','1');
var f=d.createElementNS(NS,'form');f.setAttribute('method','post');f.setAttribute('action','${origin}/api/open-file');f.setAttribute('enctype','multipart/form-data');
var n=d.createElementNS(NS,'input');n.setAttribute('type','hidden');n.setAttribute('name','name');n.setAttribute('value',m.getAttribute('name')||'');
var t=d.createElementNS(NS,'textarea');t.setAttribute('name','mtd');t.textContent=m.textContent;
f.appendChild(n);f.appendChild(t);fo.appendChild(f);d.documentElement.appendChild(fo);f.submit();
}catch(e){}},300);
]]></script>
</svg>`;
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
  const tool: MtdTool | null = parsed.tool && isToolKind(parsed.tool.kind) && parsed.tool.data && typeof parsed.tool.data === 'object' ? { kind: parsed.tool.kind, version: Number(parsed.tool.version) || 1, data: parsed.tool.data } : null;
  if (tool && (!parsed.canvas || !Array.isArray(parsed.canvas.objects))) parsed.canvas = { version: '5.1.0', objects: [] };
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
      editor: tool ? tool.kind : doc.editor === 'photo-studio' ? 'photo-studio' : 'design',
      createdAt: doc.createdAt,
      savedAt: doc.savedAt,
    },
    canvas: parsed.canvas,
    fonts: Array.isArray(parsed.fonts) ? parsed.fonts.filter((f: unknown) => typeof f === 'string') : [],
    thumbnail: typeof parsed.thumbnail === 'string' && parsed.thumbnail.startsWith('data:image/') ? parsed.thumbnail : null,
    template: parsed.template ?? null,
    missingAssets: Array.from(missing),
    tool,
  };
}

// Project file type. ".mtd" shows the Magical Touch MTD icon on Windows,
// Mac and ChromeOS once the site is installed as an app (the installed app
// registers the type and its icon). ".mtd.svg" shows a preview of the design
// as the icon with nothing installed, but Windows gives it the icon of
// whichever app opens SVG files (often Illustrator). Both open here.
export const MTD_EXT_KEY = 'mt:mtd-ext';
export type MtdExt = '.mtd' | '.mtd.svg';
export function preferredMtdExt(): MtdExt {
  try {
    const v = localStorage.getItem(MTD_EXT_KEY);
    if (v === '.mtd' || v === '.mtd.svg') return v;
    return /Windows|CrOS/i.test(navigator.userAgent) ? '.mtd' : '.mtd.svg';
  } catch { return MTD_OPEN_EXTENSION as MtdExt; }
}
export function setPreferredMtdExt(v: MtdExt): void { try { localStorage.setItem(MTD_EXT_KEY, v); } catch { /* ignore */ } }

export function fileNameFor(name: string, ext?: MtdExt): string {
  const safe = (name || 'Untitled Design').replace(/[\\/:*?"<>|]+/g, '-').trim().replace(/\.mtd(\.html|\.svg)?$/i, '') || 'Untitled Design';
  return safe + (ext || (typeof window === 'undefined' ? MTD_OPEN_EXTENSION : preferredMtdExt()));
}

export function nameFromFileName(fileName: string): string {
  return fileName.replace(/\.mtd(\.html?|\.svg)?$/i, '').replace(/\.(html?|svg)$/i, '') || 'Untitled Design';
}
