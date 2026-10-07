// ---------------------------------------------------------------------
// lib/profile.ts
// Profile data (name/phone/avatar) and the creator-level badge, which is
// computed from the user's real saved-design count rather than a fake
// stored field — see supabase/migrations/0001_profiles_and_avatars.sql
// for the profiles table and avatar storage bucket this reads/writes.
// ---------------------------------------------------------------------

import { supabase } from './supabase';
import { optimizeAvatar } from './avatar/optimize';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

// The active/recent-design cap: past this, creating another design is
// blocked until the user frees up a slot. Chosen to be a real, enforced
// number rather than a soft/cosmetic one.
export const MAX_DESIGNS = 15;

export type CreatorLevel = 'New Creator' | 'Creator' | 'Pro Creator';

// Thresholds are on the number of designs the user has actually saved —
// a real, computable signal instead of an arbitrary label.
export function creatorLevelForCount(designCount: number): CreatorLevel {
  if (designCount >= 10) return 'Pro Creator';
  if (designCount >= 3) return 'Creator';
  return 'New Creator';
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('id, name, phone, avatar_url, is_admin').eq('id', userId).single();
  if (error) {
    // PGRST116 = no row found, e.g. a user who signed up before this
    // table existed, or the "no rows" case for .single() generally.
    if (error.code !== 'PGRST116') console.error('Failed to load profile:', error);
    return null;
  }
  return data;
}

// Loads the profile if one exists, otherwise creates a minimal row —
// callers get a real profile object either way instead of having to
// special-case "no profile yet" everywhere they display one.
export async function getOrCreateProfile(userId: string, fallbackName?: string): Promise<Profile | null> {
  const existing = await getProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, name: fallbackName || null })
    .select('id, name, phone, avatar_url, is_admin')
    .single();
  if (error) {
    console.error('Failed to create profile:', error);
    return null;
  }
  return data;
}

export async function updateProfile(userId: string, patch: Partial<Pick<Profile, 'name' | 'phone'>>): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    console.error('Failed to update profile:', error);
    return false;
  }
  return true;
}

// Optimizes the photo in the browser (see lib/avatar/optimize.ts), then
// uploads the 512/128/64 variants to avatars/<user_id>/<random>/ -- the
// user-id folder satisfies the storage policy; the random segment keeps
// the public URL unguessable. Old avatar files are removed afterwards so
// storage only ever holds the current photo. Throws AvatarError with a
// user-facing message when the file is rejected.
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const variants = await optimizeAvatar(file);
  const folder = `${userId}/${crypto.randomUUID()}`;
  let mainPath = '';
  for (const v of variants) {
    const path = `${folder}/avatar-${v.size}.${v.ext}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, v.blob, { contentType: v.blob.type, cacheControl: '31536000', upsert: false });
    if (uploadError) {
      console.error('Avatar upload failed:', uploadError);
      return null;
    }
    if (v.size === 512) mainPath = path;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(mainPath);
  const url = data.publicUrl;
  await removeOldAvatars(userId, folder);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: url, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) {
    console.error('Failed to save avatar URL to profile:', updateError);
    return null;
  }
  return url;
}

// Best-effort cleanup of previous avatar uploads (both the old
// single-file layout and earlier variant folders).
async function removeOldAvatars(userId: string, keepFolder: string) {
  try {
    const { data: entries } = await supabase.storage.from('avatars').list(userId, { limit: 100 });
    if (!entries) return;
    const paths: string[] = [];
    for (const e of entries) {
      const full = `${userId}/${e.name}`;
      if (full === keepFolder) continue;
      if (e.id) {
        paths.push(full); // a file directly in the user folder (old layout)
      } else {
        const { data: inner } = await supabase.storage.from('avatars').list(full, { limit: 10 });
        inner?.forEach((f) => paths.push(`${full}/${f.name}`));
      }
    }
    if (paths.length) await supabase.storage.from('avatars').remove(paths);
  } catch (err) {
    console.warn('Old avatar cleanup skipped:', err);
  }
}

export async function getDesignCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('designs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) {
    console.error('Failed to count designs:', error);
    return 0;
  }
  return count || 0;
}
