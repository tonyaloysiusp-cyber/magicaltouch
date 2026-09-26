// ---------------------------------------------------------------------
// lib/storage/assets.ts
// Real content-addressed object storage for design images, replacing
// the base64-in-JSONB pattern documented as the #1 storage finding in
// docs/ENGINEERING_AUDIT.md. An uploaded image's bytes live exactly
// once in the private `design-assets` Storage bucket (schema in
// supabase/migrations/0005_design_assets.sql); the document only ever
// references it by a signed URL + assetId, never by re-embedding the
// pixels.
//
// KNOWN SCOPE LIMITATION (documented, not hidden): the signed URL
// returned here is long-lived (10 years) and gets baked directly into
// canvas_json as the Fabric image object's `src`, rather than storing
// just the assetId and re-resolving a fresh signed URL every time the
// document loads. A short-lived-URL + load-time-resolution design would
// be more correct long-term (and is what a template/asset registry
// eventually needs per the audit), but it requires threading an async
// resolution step through Main Design's canvas-load path, which is a
// separate, higher-risk migration of a mature, heavily-tested code path
// — not something to fold into this first slice. This module is wired
// up first against Photo Studio (a small, new, low-risk surface) for
// exactly that reason.
// ---------------------------------------------------------------------

import { supabase } from '@/lib/supabase';

const BUCKET = 'design-assets';
// Long enough that a saved design's image reference effectively never
// expires in practice, given the current bake-the-URL-into-JSON design.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10;

export interface UploadedAsset {
  assetId: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header)?.[1] || 'application/octet-stream';
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function loadImageDimensions(blob: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
}

async function signedUrlFor(storageKey: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storageKey, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) throw error || new Error('Failed to create signed URL');
  return data.signedUrl;
}

// Uploads `blob` (or a data URL, via dataUrlToBlob) as a real object in
// the design-assets bucket, under this user's own folder, deduplicating
// against any of their own previous uploads with identical content —
// content-based deduplication scoped per-user (see the migration's own
// comment on why this doesn't dedupe across different users).
export async function uploadDesignAsset(blob: Blob, userId: string): Promise<UploadedAsset> {
  const hash = await hashBlob(blob);

  const { data: existing, error: lookupError } = await supabase
    .from('assets')
    .select('id, storage_key, mime_type, width, height')
    .eq('user_id', userId)
    .eq('hash', hash)
    .maybeSingle();

  if (!lookupError && existing) {
    const url = await signedUrlFor(existing.storage_key);
    return {
      assetId: existing.id,
      url,
      width: existing.width || 0,
      height: existing.height || 0,
      mimeType: existing.mime_type,
    };
  }

  const { w, h } = await loadImageDimensions(blob).catch(() => ({ w: 0, h: 0 }));
  const mimeType = blob.type || 'application/octet-stream';
  const storageKey = `${userId}/${hash}.${extensionFor(mimeType)}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageKey, blob, {
    contentType: mimeType,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: inserted, error: insertError } = await supabase
    .from('assets')
    .insert({
      user_id: userId,
      storage_key: storageKey,
      mime_type: mimeType,
      width: w,
      height: h,
      file_size: blob.size,
      hash,
    })
    .select('id')
    .single();
  if (insertError || !inserted) throw insertError || new Error('Failed to record asset metadata');

  const url = await signedUrlFor(storageKey);
  return { assetId: inserted.id, url, width: w, height: h, mimeType };
}
