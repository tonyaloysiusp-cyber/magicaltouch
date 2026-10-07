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

export interface LocalHandoff {
  opened: OpenedMtd;
  file: LocalFileRef;
}

const pending = new Map<string, LocalHandoff>();

export const LOCAL_TAB_PREFIX = 'local-';

export function newLocalKey(): string {
  return LOCAL_TAB_PREFIX + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

export function putHandoff(key: string, value: LocalHandoff) {
  pending.set(key, value);
}

export function peekHandoff(key: string | null | undefined): LocalHandoff | undefined {
  return key ? pending.get(key) : undefined;
}

export function takeHandoff(key: string | null | undefined): LocalHandoff | undefined {
  if (!key) return undefined;
  const v = pending.get(key);
  pending.delete(key);
  return v;
}

export function isLocalTabId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(LOCAL_TAB_PREFIX);
}

export function editorUrlForLocal(key: string, width: number, height: number): string {
  return `/editor?w=${Math.round(width)}&h=${Math.round(height)}&localDoc=${encodeURIComponent(key)}`;
}
