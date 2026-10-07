// ---------------------------------------------------------------------
// lib/storage/cloudProject.ts -- save/open a .mtd project in a cloud drive
// and keep the dashboard's lightweight reference up to date.
// ---------------------------------------------------------------------

import { readMtd, OpenedMtd } from '@/lib/mtd/format';
import { clearSession, getSession } from './oauth';
import { CloudFile, CloudProvider, CloudProviderId, CloudStorageError, ensureSession, providerById } from './providers';
import { recordConnection, recordProject } from './registry';

export interface CloudTarget {
  provider: CloudProviderId;
  file: CloudFile;
}

async function withSession<T>(provider: CloudProvider, popup: Window | null, fn: (token: Parameters<CloudProvider['list']>[0]) => Promise<T>, signal?: AbortSignal): Promise<T> {
  const wasConnected = !!getSession(provider.id);
  const session = await ensureSession(provider, popup, signal);
  if (!wasConnected) recordConnection(provider.id, session.account);
  try {
    return await fn(session);
  } catch (err) {
    if (err instanceof CloudStorageError && err.status === 401) clearSession(provider.id);
    throw err;
  }
}

export async function saveToCloud(
  providerId: CloudProviderId,
  popup: Window | null,
  project: { fileName: string; projectName: string; blob: Blob; existing?: CloudFile | null; thumbnail: string | null; width: number; height: number },
  signal?: AbortSignal,
): Promise<CloudFile> {
  const provider = providerById(providerId);
  const file = await withSession(provider, popup, (s) => provider.upload(s, { name: project.fileName, blob: project.blob, existing: project.existing }), signal);
  await recordProject({ provider: providerId, file, projectName: project.projectName, thumbnail: project.thumbnail, width: project.width, height: project.height });
  return file;
}

export async function openFromCloud(
  providerId: CloudProviderId,
  popup: Window | null,
  file: { id: string; path?: string | null },
  signal?: AbortSignal,
): Promise<OpenedMtd> {
  const provider = providerById(providerId);
  const blob = await withSession(provider, popup, (s) => provider.download(s, file), signal);
  return readMtd(blob);
}

export async function listCloud(providerId: CloudProviderId, popup: Window | null, signal?: AbortSignal): Promise<CloudFile[]> {
  const provider = providerById(providerId);
  return withSession(provider, popup, (s) => provider.list(s), signal);
}

// Silent saves (autosave) only happen while the tab still holds a valid
// sign-in; otherwise the design stays "unsaved" until the next manual Save.
export function canSaveSilently(providerId: CloudProviderId): boolean {
  return !!getSession(providerId);
}
