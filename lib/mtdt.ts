// .mtdt — Magical Touch Design Textile project files (jerseys, polos,
// T-shirts and patterns). A small binary container, not a JSON file:
//   bytes 0–3  "MTDT"
//   byte  4    format version (1)
//   byte  5    flags (bit 0 = deflate-compressed body)
//   bytes 6–9  body length (big-endian)
//   body       the project (UTF-8 text, compressed when the browser can)
// Files open again in the matching tool with every setting, logo, player,
// size and quantity exactly as saved.

export const MTDT_EXT = '.mtdt';
export const MTDT_MIME = 'application/x-magical-touch-textile';
export type MtdtKind = 'jersey' | 'polo' | 'tshirt' | 'pattern';
export interface MtdtProject<T = unknown> { kind: MtdtKind; name: string; savedAt: string; app: string; data: T }

const MAGIC = [0x4d, 0x54, 0x44, 0x54]; // MTDT

async function pipe(bytes: Uint8Array, stream: { readable: ReadableStream; writable: WritableStream }): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream as any));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeMtdt<T>(p: MtdtProject<T>): Promise<Uint8Array> {
  const text = new TextEncoder().encode(JSON.stringify(p));
  let body: Uint8Array = text, flags = 0;
  if (typeof CompressionStream !== 'undefined') {
    try { body = await pipe(text, new CompressionStream('deflate')); flags = 1; } catch { body = text; flags = 0; }
  }
  const out = new Uint8Array(10 + body.length);
  out.set(MAGIC, 0); out[4] = 1; out[5] = flags;
  new DataView(out.buffer).setUint32(6, body.length);
  out.set(body, 10);
  return out;
}

export function isMtdt(bytes: Uint8Array): boolean {
  return bytes.length >= 10 && MAGIC.every((b, i) => bytes[i] === b);
}

export async function decodeMtdt<T = unknown>(bytes: Uint8Array): Promise<MtdtProject<T>> {
  if (!isMtdt(bytes)) throw new Error('This is not a Magical Touch textile file (.mtdt).');
  if (bytes[4] > 1) throw new Error('This file was made by a newer version of Magical Touch Design.');
  const len = new DataView(bytes.buffer, bytes.byteOffset).getUint32(6);
  let body = bytes.subarray(10, 10 + len);
  if (bytes[5] & 1) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Your browser cannot open compressed project files.');
    body = await pipe(body, new DecompressionStream('deflate'));
  }
  const p = JSON.parse(new TextDecoder().decode(body));
  if (!p || typeof p.kind !== 'string' || !('data' in p)) throw new Error('The project file is damaged.');
  return p as MtdtProject<T>;
}

export function mtdtFileName(name: string): string {
  return `${(name || 'project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'project'}${MTDT_EXT}`;
}
