// ---------------------------------------------------------------------
// lib/profile.ts
// Profile data (name/phone/avatar) and the creator-level badge, which is
// computed from the user's real saved-design count rather than a fake
// stored field — see supabase/migrations/0001_profiles_and_avatars.sql
// for the profiles table and avatar storage bucket this reads/writes.
// ---------------------------------------------------------------------

import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  avatar_url: string | null;
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
  const { data, error } = await supabase.from('profiles').select('id, name, phone, avatar_url').eq('id', userId).single();
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
    .select('id, name, phone, avatar_url')
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

// Uploads to the public avatars bucket under this user's own folder
// (avatars/<user_id>/<timestamp>-<filename>), matching the storage
// policy that only allows a user to write inside their own folder.
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (uploadError) {
    console.error('Avatar upload failed:', uploadError);
    return null;
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;
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
