// ---------------------------------------------------------------------
// lib/storage/registry.ts -- the only cloud-storage data kept on the
// Magical Touch Design server (migration 0013): which drives a customer
// connected (account e-mail/name), and lightweight references to their
// cloud projects (name, provider file id, small preview, size, dates).
// Never tokens, never passwords, never the project itself.
// ---------------------------------------------------------------------

import { supabase } from '@/lib/supabase';
import type { CloudProviderId } from './oauth';
import type { CloudFile } from './providers';

export interface ProjectReference {
  id: string;
  projectName: string;
  provider: CloudProviderId;
  fileId: string;
  location: string | null; // Dropbox path, for overwriting in place
  thumbnail: string | null;
  width: number | null;
  height: number | null;
  modifiedAt: string | null;
  updatedAt: string;
}

export interface StorageConnection {
  provider: CloudProviderId;
  email: string | null;
  name: string | null;
  status: 'connected' | 'disconnected';
  updatedAt: string;
}

async function userId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function recordConnection(provider: CloudProviderId, account: { email: string | null; name: string | null }) {
  const uid = await userId();
  if (!uid) return;
  const { error } = await supabase.from('storage_connections').upsert(
    { user_id: uid, provider, account_email: account.email, account_name: account.name, status: 'connected', updated_at: new Date().toISOString() },
    { onConflict: 'user_id,provider' },
  );
  if (error) console.warn('Could not record storage connection:', error.message);
}

export async function markDisconnected(provider: CloudProviderId) {
  const uid = await userId();
  if (!uid) return;
  await supabase
    .from('storage_connections')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('user_id', uid)
    .eq('provider', provider);
}

export async function listConnections(): Promise<StorageConnection[]> {
  const { data, error } = await supabase.from('storage_connections').select('provider, account_email, account_name, status, updated_at');
  if (error || !data) return [];
  return data.map((c: any) => ({ provider: c.provider, email: c.account_email, name: c.account_name, status: c.status, updatedAt: c.updated_at }));
}

// Keep previews small: this table is for listing, not storing designs.
const MAX_THUMB_CHARS = 60_000;

export async function recordProject(ref: {
  provider: CloudProviderId;
  file: CloudFile;
  projectName: string;
  thumbnail: string | null;
  width: number;
  height: number;
}): Promise<void> {
  const uid = await userId();
  if (!uid) return;
  const { error } = await supabase.from('project_references').upsert(
    {
      user_id: uid,
      project_name: ref.projectName,
      storage_provider: ref.provider,
      external_file_id: ref.file.id,
      storage_location_reference: ref.file.path ?? null,
      thumbnail: ref.thumbnail && ref.thumbnail.length <= MAX_THUMB_CHARS ? ref.thumbnail : null,
      document_width: Math.round(ref.width),
      document_height: Math.round(ref.height),
      last_known_modified_at: ref.file.modifiedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,storage_provider,external_file_id' },
  );
  if (error) console.warn('Could not record project reference:', error.message);
}

export async function listProjects(): Promise<ProjectReference[]> {
  const { data, error } = await supabase
    .from('project_references')
    .select('id, project_name, storage_provider, external_file_id, storage_location_reference, thumbnail, document_width, document_height, last_known_modified_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    projectName: r.project_name,
    provider: r.storage_provider,
    fileId: r.external_file_id,
    location: r.storage_location_reference,
    thumbnail: r.thumbnail,
    width: r.document_width,
    height: r.document_height,
    modifiedAt: r.last_known_modified_at,
    updatedAt: r.updated_at,
  }));
}

// Removes the dashboard entry only; the file in the drive is untouched.
export async function forgetProject(id: string): Promise<void> {
  await supabase.from('project_references').delete().eq('id', id);
}
