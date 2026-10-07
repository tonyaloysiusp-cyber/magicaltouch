// ---------------------------------------------------------------------
// lib/mtd/fileAccess.ts -- saving and opening .mtd files on the
// customer's own computer.
//
// Chrome/Edge on desktop: the File System Access API lets the customer
// pick a folder once, and later saves write straight back to the same
// file (like a desktop app). Safari/Firefox/iPad: Save downloads the
// file (to Downloads / the Files app), and Open uses the normal file
// picker. Either way the file only ever lives where the customer puts it.
// ---------------------------------------------------------------------

import { MTD_EXTENSION, MTD_MIME } from './format';

export interface LocalFileRef {
  handle: any | null; // FileSystemFileHandle when the browser supports it
  fileName: string;
}

const pickerTypes = [
  {
    description: 'Magical Touch Design project',
    accept: { [MTD_MIME]: [MTD_EXTENSION] },
  },
];

export function supportsSaveInPlace(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError');
}

async function writeToHandle(handle: any, blob: Blob) {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

// True when we can write to this handle right now without asking.
export async function canWriteSilently(handle: any | null): Promise<boolean> {
  if (!handle?.queryPermission) return false;
  try {
    return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

// Returns where the file went, or null if the customer cancelled.
export async function saveMtdFile(blob: Blob, suggestedName: string, existing?: any | null): Promise<LocalFileRef | null> {
  if (existing) {
    try {
      if (existing.requestPermission && (await existing.requestPermission({ mode: 'readwrite' })) !== 'granted') {
        throw new DOMException('denied', 'NotAllowedError');
      }
      await writeToHandle(existing, blob);
      return { handle: existing, fileName: existing.name || suggestedName };
    } catch (err) {
      if (!isAbort(err)) console.warn('Saving to the same file failed, asking where to save instead:', err);
    }
  }

  if (supportsSaveInPlace()) {
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName, types: pickerTypes });
      await writeToHandle(handle, blob);
      return { handle, fileName: handle.name || suggestedName };
    } catch (err) {
      if (isAbort(err)) return null;
      console.warn('Save picker failed, downloading instead:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { handle: null, fileName: suggestedName };
}

function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

// Lets the customer choose a .mtd file. Returns null if cancelled.
export async function pickMtdFile(): Promise<{ file: File; handle: any | null } | null> {
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const [handle] = await (window as any).showOpenFilePicker({ types: pickerTypes, multiple: false });
      return { file: await handle.getFile(), handle };
    } catch (err) {
      if (isAbort(err)) return null;
      console.warn('Open picker failed, using the basic file chooser:', err);
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    // iPad/iPhone grey out files with unknown extensions when filtered,
    // so they get an unfiltered picker; the file is validated on open.
    if (!isAppleMobile()) input.accept = `${MTD_EXTENSION},${MTD_MIME}`;
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      resolve(file ? { file, handle: null } : null);
    };
    // No reliable "cancel" event everywhere; a cancelled picker simply
    // never resolves, which is harmless here.
    document.body.appendChild(input);
    input.click();
  });
}

// Re-open a file remembered from an earlier session (Chrome/Edge only).
export async function reopenFromHandle(handle: any): Promise<File | null> {
  try {
    if (handle.requestPermission && (await handle.requestPermission({ mode: 'read' })) !== 'granted') return null;
    return await handle.getFile();
  } catch {
    return null;
  }
}
