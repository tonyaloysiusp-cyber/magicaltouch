// Writes the print resolution into a PNG (pHYs chunk), so RIP software,
// Photoshop and printers open the file at its real size instead of 72 DPI.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** PNG bytes with a pHYs chunk for `dpi` (replaces any existing one). */
export function pngWithDpi(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1; // unit: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  // Walk the chunks: keep everything except an old pHYs; insert after IHDR.
  const out: Uint8Array[] = [png.subarray(0, 8)];
  let i = 8;
  const pv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (i + 8 <= png.length) {
    const len = pv.getUint32(i);
    const type = String.fromCharCode(png[i + 4], png[i + 5], png[i + 6], png[i + 7]);
    const end = i + 12 + len;
    if (type !== 'pHYs') out.push(png.subarray(i, end));
    if (type === 'IHDR') out.push(chunk);
    i = end;
  }
  const total = out.reduce((n, a) => n + a.length, 0);
  const res = new Uint8Array(total);
  let o = 0;
  for (const a of out) { res.set(a, o); o += a.length; }
  return res;
}

/** JPEG bytes with the JFIF density set to `dpi` (adds a JFIF header if missing). */
export function jpegWithDpi(jpg: Uint8Array, dpi: number): Uint8Array {
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  const isJfif = jpg[2] === 0xff && jpg[3] === 0xe0 && jpg[6] === 0x4a && jpg[7] === 0x46 && jpg[8] === 0x49 && jpg[9] === 0x46 && jpg[10] === 0;
  if (isJfif) {
    const out = jpg.slice();
    out[13] = 1; out[14] = d >> 8; out[15] = d & 255; out[16] = d >> 8; out[17] = d & 255;
    return out;
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, d >> 8, d & 255, d >> 8, d & 255, 0, 0]);
  const out = new Uint8Array(jpg.length + app0.length);
  out.set(jpg.subarray(0, 2), 0); out.set(app0, 2); out.set(jpg.subarray(2), 2 + app0.length);
  return out;
}
