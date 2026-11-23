// ---------------------------------------------------------------------
// lib/mtd/handoff.ts
// Passes an opened .mtd project from one page (e.g. the dashboard) to the
// editor without uploading it anywhere: the parsed project is held in
// this browser tab's memory under a one-time key that travels in the
// editor URL (?localDoc=<key>). Client-side navigation keeps this module
// alive between pages.
// ---------------------------------------------------------------------

import type { OpenedMtd } from './format';
import type { LocalFileRef } from './fileAccess';
import type { CloudTarget } from '@/lib/storage/cloudProject';

// Where a non-account project lives: a file on this computer, or a file
// in the customer's Google Drive / OneDrive / Dropbox.
export type ExternalTarget = LocalFileRef | CloudTarget;

export function isCloudTarget(t: ExternalTarget | null | undefined): t is CloudTarget {
  return !!t && 'provider' in t;
}

export interface LocalHandoff {
  opened: OpenedMtd;
  file: ExternalTarget;
}

const pending = new Map<string, LocalHandoff>();

export const LOCAL_TAB_PREFIX = 'local-';

export function newLocalKey(): string {
  return LOCAL_TAB_PREFIX + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

// Memory is the fast path. A copy also goes to sessionStorage (same tab
// only) so a template or file still opens if the editor page loads fresh —
// a hard reload, a sign-in bounce, or the browser restoring the tab. File
// handles cannot be copied; those opens rely on memory as before.
const STORE = 'mt-handoff:';
function stash(key: string, value: LocalHandoff) {
  try {
    const hasHandle = !!(value.file as any)?.handle;
    if (hasHandle) return;
    const json = JSON.stringify(value);
    if (json.length < 4_500_000) sessionStorage.setItem(STORE + key, json);
  } catch { /* storage full or blocked: memory still works */ }
}
function unstash(key: string, remove: boolean): LocalHandoff | undefined {
  try {
    const json = sessionStorage.getItem(STORE + key);
    if (remove) sessionStorage.removeItem(STORE + key);
    return json ? (JSON.parse(json) as LocalHandoff) : undefined;
  } catch { return undefined; }
}

export function putHandoff(key: string, value: LocalHandoff) {
  pending.set(key, value);
  stash(key, value);
}

export function peekHandoff(key: string | null | undefined): LocalHandoff | undefined {
  return key ? pending.get(key) ?? unstash(key, false) : undefined;
}

export function takeHandoff(key: string | null | undefined): LocalHandoff | undefined {
  if (!key) return undefined;
  const v = pending.get(key) ?? unstash(key, false);
  pending.delete(key);
  unstash(key, true);
  return v;
}

export function isLocalTabId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(LOCAL_TAB_PREFIX);
}

export function editorUrlForLocal(key: string, width: number, height: number): string {
  return `/editor?w=${Math.round(width)}&h=${Math.round(height)}&localDoc=${encodeURIComponent(key)}`;
}
