// Pictures stay on the customer's device until they choose to save to
// their Magical Touch account. Only then are the pictures inside that
// design stored with it: this walks the saved JSON (not the live canvas)
// and swaps each embedded data: picture for its stored copy, so the
// design row stays small. Nothing is uploaded when a picture is merely
// placed, and nothing at all when the design is saved to the device or
// to a cloud drive.

import { uploadDesignAsset, dataUrlToBlob } from './assets';

const done = new Map<string, string>();

const IMAGE_KEYS = ['src', '__originalSrc'] as const;

function collect(node: any, out: Set<string>) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, out));
    return;
  }
  for (const k of IMAGE_KEYS) {
    const v = node[k];
    if (typeof v === 'string' && v.startsWith('data:image/')) out.add(v);
  }
  if (node.objects) collect(node.objects, out);
  if (node.clipPath) collect(node.clipPath, out);
  if (node.backgroundImage) collect(node.backgroundImage, out);
  if (node.overlayImage) collect(node.overlayImage, out);
  if (node.fill && typeof node.fill === 'object' && node.fill.source) {
    const s = node.fill.source;
    if (typeof s === 'string' && s.startsWith('data:image/')) out.add(s);
  }
}

function replace(node: any, map: Map<string, string>) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => replace(n, map));
    return;
  }
  for (const k of IMAGE_KEYS) {
    const v = node[k];
    if (typeof v === 'string' && map.has(v)) {
      node[k] = map.get(v);
      if (k === 'src') node.crossOrigin = 'anonymous';
    }
  }
  if (node.objects) replace(node.objects, map);
  if (node.clipPath) replace(node.clipPath, map);
  if (node.backgroundImage) replace(node.backgroundImage, map);
  if (node.overlayImage) replace(node.overlayImage, map);
  if (node.fill && typeof node.fill === 'object' && typeof node.fill.source === 'string' && map.has(node.fill.source)) {
    node.fill.source = map.get(node.fill.source);
  }
}

/** Stores the pictures of a design being saved to the account. Pictures
 *  that fail to upload simply stay embedded in the JSON. */
export async function storeImagesForAccountSave<T>(json: T, userId: string): Promise<T> {
  const found = new Set<string>();
  collect(json, found);
  if (!found.size) return json;
  const map = new Map<string, string>();
  for (const dataUrl of found) {
    const cached = done.get(dataUrl);
    if (cached) {
      map.set(dataUrl, cached);
      continue;
    }
    try {
      const uploaded = await uploadDesignAsset(dataUrlToBlob(dataUrl), userId);
      done.set(dataUrl, uploaded.url);
      map.set(dataUrl, uploaded.url);
    } catch (err) {
      console.warn('Picture could not be stored with the design — it stays embedded:', err);
    }
  }
  if (map.size) replace(json, map);
  return json;
}
