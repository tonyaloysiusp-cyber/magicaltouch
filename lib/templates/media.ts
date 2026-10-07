// ---------------------------------------------------------------------
// lib/templates/media.ts
// Template thumbnails and previews live in the public "template-media"
// storage bucket (admin-write only, see migration 0011) instead of being
// stored as huge base64 strings inside the templates table. Grid cards
// load a small thumbnail; the template page loads a larger preview; the
// editable design itself is only fetched when the customer taps
// "Use Template".
// ---------------------------------------------------------------------

import { supabase } from '@/lib/supabase';

export const THUMBNAIL_MAX = 600;
export const PREVIEW_MAX = 1600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image could not be loaded'));
    img.src = src;
  });
}

// Scales an image (data URL, object URL or http URL) so its longest side
// is at most `maxSide`, and encodes it as WebP (JPEG on Safari).
export async function encodeImage(src: string, maxSide: number): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await toBlob('image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.88);
  if (!blob) throw new Error('Image could not be encoded');
  return blob;
}

// Uploads a thumbnail + preview for one template version and returns
// their public URLs. Paths are versioned and never overwritten, so an
// older version's images stay valid. Returns null if the bucket isn't
// set up yet (caller falls back to keeping the inline image).
export async function uploadTemplateImages(
  templateId: string,
  version: string,
  src: string,
): Promise<{ thumbnail: string; preview: string } | null> {
  try {
    const stamp = Date.now().toString(36);
    const out: Record<string, string> = {};
    for (const [kind, max] of [['thumbnail', THUMBNAIL_MAX], ['preview', PREVIEW_MAX]] as const) {
      const blob = await encodeImage(src, max);
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `templates/${templateId}/v${version}/${kind}-${stamp}.${ext}`;
      const { error } = await supabase.storage
        .from('template-media')
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) throw error;
      out[kind] = supabase.storage.from('template-media').getPublicUrl(path).data.publicUrl;
    }
    return { thumbnail: out.thumbnail, preview: out.preview };
  } catch (err) {
    console.warn('Template image upload skipped:', err);
    return null;
  }
}
