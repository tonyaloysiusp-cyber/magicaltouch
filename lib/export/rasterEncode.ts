// Full-size picture files without one giant canvas.
//
// Phones and iPads refuse to make a canvas bigger than about 16 million
// pixels, so a 300 DPI poster could never be drawn in one go there. The
// editor draws the page in horizontal strips instead and feeds them, top
// to bottom, into these encoders, which write the PNG or JPEG file
// directly. The full picture never has to exist as one canvas.

export interface StripEncoder {
  /** RGBA rows for the next `rows` lines (width × rows × 4 bytes). */
  add(rgba: Uint8ClampedArray | Uint8Array, rows: number): Promise<void>;
  finish(): Promise<Blob>;
}

// ---------------------------------------------------------------- PNG
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(parts: Uint8Array[]) {
  let c = 0xffffffff;
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC_TABLE[(c ^ p[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n: number) {
  return new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}
function pngChunk(type: string, data: Uint8Array): Uint8Array[] {
  const t = new Uint8Array([...type].map((c) => c.charCodeAt(0)));
  return [u32(data.length), t, data, u32(crc32([t, data]))];
}

export function canStreamPng() {
  return typeof (globalThis as any).CompressionStream === 'function';
}

/** Streaming PNG writer (8-bit RGB or RGBA, zlib via CompressionStream). */
export function pngEncoder(width: number, height: number, o: { alpha: boolean; dpi?: number }): StripEncoder {
  const ch = o.alpha ? 4 : 3;
  const cs = new (globalThis as any).CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  const zipped: Promise<ArrayBuffer> = new Response(cs.readable).arrayBuffer();
  let written = 0;
  return {
    async add(rgba, rows) {
      const stride = width * ch;
      const out = new Uint8Array(rows * (stride + 1));
      for (let y = 0; y < rows; y++) {
        const o0 = y * (stride + 1);
        out[o0] = 1; // "Sub" filter: each byte minus the one to its left
        let s = y * width * 4;
        let prevR = 0, prevG = 0, prevB = 0, prevA = 0;
        let d = o0 + 1;
        for (let x = 0; x < width; x++, s += 4) {
          const r = rgba[s], g = rgba[s + 1], b = rgba[s + 2];
          out[d++] = (r - prevR) & 255;
          out[d++] = (g - prevG) & 255;
          out[d++] = (b - prevB) & 255;
          prevR = r; prevG = g; prevB = b;
          if (ch === 4) {
            const a = rgba[s + 3];
            out[d++] = (a - prevA) & 255;
            prevA = a;
          }
        }
      }
      written += rows;
      await writer.write(out);
    },
    async finish() {
      if (written !== height) throw new Error(`PNG: expected ${height} rows, got ${written}`);
      await writer.close();
      const z = new Uint8Array(await zipped);
      const ihdr = new Uint8Array(13);
      ihdr.set(u32(width), 0);
      ihdr.set(u32(height), 4);
      ihdr[8] = 8;
      ihdr[9] = o.alpha ? 6 : 2;
      const parts: Uint8Array[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), ...pngChunk('IHDR', ihdr)];
      if (o.dpi) {
        const ppm = Math.round(o.dpi / 0.0254);
        const phys = new Uint8Array(9);
        phys.set(u32(ppm), 0);
        phys.set(u32(ppm), 4);
        phys[8] = 1;
        parts.push(...pngChunk('pHYs', phys));
      }
      // IDAT in 4 MB pieces
      for (let i = 0; i < z.length; i += 4 << 20) parts.push(...pngChunk('IDAT', z.subarray(i, Math.min(z.length, i + (4 << 20)))));
      parts.push(...pngChunk('IEND', new Uint8Array(0)));
      return new Blob(parts as BlobPart[], { type: 'image/png' });
    },
  };
}

// --------------------------------------------------------------- JPEG
// Baseline JPEG (4:4:4, standard Huffman tables, AAN DCT).
const ZIGZAG = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63];
const Y_Q = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99];
const C_Q = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99];
const DC_L_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const DC_C_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const DC_VALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const AC_L_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d];
const AC_L_VALS = [0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa];
const AC_C_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const AC_C_VALS = [0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62, 0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa];
const AASF = [1.0, 1.387039845, 1.306562965, 1.175875602, 1.0, 0.785694958, 0.5411961, 0.275899379];

type Huff = { code: Int32Array; len: Int32Array };
function buildHuff(bits: number[], vals: number[]): Huff {
  const code = new Int32Array(256), len = new Int32Array(256);
  let c = 0, k = 0;
  for (let l = 1; l <= 16; l++) {
    for (let i = 0; i < bits[l - 1]; i++) {
      code[vals[k]] = c;
      len[vals[k]] = l;
      k++;
      c++;
    }
    c <<= 1;
  }
  return { code, len };
}
function quantTable(base: number[], quality: number) {
  const q = Math.max(1, Math.min(100, Math.round(quality)));
  const scale = q < 50 ? 5000 / q : 200 - q * 2;
  return base.map((v) => Math.max(1, Math.min(255, Math.floor((v * scale + 50) / 100))));
}

class ByteSink {
  chunks: Uint8Array[] = [];
  buf = new Uint8Array(1 << 16);
  n = 0;
  byte(b: number) {
    if (this.n === this.buf.length) this.flush();
    this.buf[this.n++] = b;
  }
  bytes(a: ArrayLike<number>) {
    for (let i = 0; i < a.length; i++) this.byte(a[i]);
  }
  word(w: number) {
    this.byte((w >> 8) & 255);
    this.byte(w & 255);
  }
  flush() {
    if (this.n) this.chunks.push(this.buf.slice(0, this.n));
    this.n = 0;
  }
}

/** Streaming baseline JPEG writer. Strips must be a multiple of 8 rows (the last may be shorter). */
export function jpegEncoder(width: number, height: number, o: { quality: number; dpi?: number }): StripEncoder {
  const quality = o.quality <= 1 ? o.quality * 100 : o.quality;
  const qY = quantTable(Y_Q, quality), qC = quantTable(C_Q, quality);
  const fY = new Float64Array(64), fC = new Float64Array(64);
  for (let r = 0, k = 0; r < 8; r++) for (let c = 0; c < 8; c++, k++) {
    fY[k] = 1 / (qY[k] * AASF[r] * AASF[c] * 8);
    fC[k] = 1 / (qC[k] * AASF[r] * AASF[c] * 8);
  }
  const dcL = buildHuff(DC_L_BITS, DC_VALS), dcC = buildHuff(DC_C_BITS, DC_VALS);
  const acL = buildHuff(AC_L_BITS, AC_L_VALS), acC = buildHuff(AC_C_BITS, AC_C_VALS);
  const out = new ByteSink();

  // ---- headers
  out.word(0xffd8);
  const dpi = Math.max(1, Math.min(65535, Math.round(o.dpi || 72)));
  out.word(0xffe0); out.word(16); out.bytes([0x4a, 0x46, 0x49, 0x46, 0]); out.bytes([1, 1, 1]); out.word(dpi); out.word(dpi); out.bytes([0, 0]);
  out.word(0xffdb); out.word(132);
  out.byte(0); for (let z = 0; z < 64; z++) out.byte(qY[ZIGZAG.indexOf(z)]);
  out.byte(1); for (let z = 0; z < 64; z++) out.byte(qC[ZIGZAG.indexOf(z)]);
  out.word(0xffc0); out.word(17); out.byte(8); out.word(height); out.word(width); out.byte(3);
  out.bytes([1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1]);
  out.word(0xffc4); out.word(0x01a2);
  out.byte(0x00); out.bytes(DC_L_BITS); out.bytes(DC_VALS);
  out.byte(0x10); out.bytes(AC_L_BITS); out.bytes(AC_L_VALS);
  out.byte(0x01); out.bytes(DC_C_BITS); out.bytes(DC_VALS);
  out.byte(0x11); out.bytes(AC_C_BITS); out.bytes(AC_C_VALS);
  out.word(0xffda); out.word(12); out.byte(3); out.bytes([1, 0x00, 2, 0x11, 3, 0x11]); out.bytes([0, 0x3f, 0]);

  // ---- entropy-coded data
  let bitBuf = 0, bitCnt = 0;
  const writeBits = (code: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitBuf = (bitBuf << 1) | ((code >> i) & 1);
      if (++bitCnt === 8) {
        out.byte(bitBuf);
        if (bitBuf === 0xff) out.byte(0);
        bitBuf = 0;
        bitCnt = 0;
      }
    }
  };
  const cat = (v: number) => { let a = v < 0 ? -v : v, n = 0; while (a) { n++; a >>= 1; } return n; };
  const blk = new Float64Array(64);
  const du = new Int32Array(64);
  const encodeBlock = (fd: Float64Array, prevDC: number, dc: Huff, ac: Huff) => {
    const d = blk;
    for (let i = 0; i < 64; i += 8) {
      const t0 = d[i] + d[i + 7], t7 = d[i] - d[i + 7], t1 = d[i + 1] + d[i + 6], t6 = d[i + 1] - d[i + 6];
      const t2 = d[i + 2] + d[i + 5], t5 = d[i + 2] - d[i + 5], t3 = d[i + 3] + d[i + 4], t4 = d[i + 3] - d[i + 4];
      let a10 = t0 + t3; const a13 = t0 - t3; let a11 = t1 + t2; let a12 = t1 - t2;
      d[i] = a10 + a11; d[i + 4] = a10 - a11;
      const z1 = (a12 + a13) * 0.707106781; d[i + 2] = a13 + z1; d[i + 6] = a13 - z1;
      a10 = t4 + t5; a11 = t5 + t6; a12 = t6 + t7;
      const z5 = (a10 - a12) * 0.382683433, z2 = 0.5411961 * a10 + z5, z4 = 1.306562965 * a12 + z5, z3 = a11 * 0.707106781;
      const z11 = t7 + z3, z13 = t7 - z3;
      d[i + 5] = z13 + z2; d[i + 3] = z13 - z2; d[i + 1] = z11 + z4; d[i + 7] = z11 - z4;
    }
    for (let i = 0; i < 8; i++) {
      const t0 = d[i] + d[i + 56], t7 = d[i] - d[i + 56], t1 = d[i + 8] + d[i + 48], t6 = d[i + 8] - d[i + 48];
      const t2 = d[i + 16] + d[i + 40], t5 = d[i + 16] - d[i + 40], t3 = d[i + 24] + d[i + 32], t4 = d[i + 24] - d[i + 32];
      let a10 = t0 + t3; const a13 = t0 - t3; let a11 = t1 + t2; let a12 = t1 - t2;
      d[i] = a10 + a11; d[i + 32] = a10 - a11;
      const z1 = (a12 + a13) * 0.707106781; d[i + 16] = a13 + z1; d[i + 48] = a13 - z1;
      a10 = t4 + t5; a11 = t5 + t6; a12 = t6 + t7;
      const z5 = (a10 - a12) * 0.382683433, z2 = 0.5411961 * a10 + z5, z4 = 1.306562965 * a12 + z5, z3 = a11 * 0.707106781;
      const z11 = t7 + z3, z13 = t7 - z3;
      d[i + 40] = z13 + z2; d[i + 24] = z13 - z2; d[i + 8] = z11 + z4; d[i + 56] = z11 - z4;
    }
    for (let i = 0; i < 64; i++) du[ZIGZAG[i]] = Math.round(d[i] * fd[i]);
    const diff = du[0] - prevDC;
    if (diff === 0) writeBits(dc.code[0], dc.len[0]);
    else {
      const n = cat(diff);
      writeBits(dc.code[n], dc.len[n]);
      writeBits(diff < 0 ? diff - 1 : diff, n);
    }
    let end = 63;
    while (end > 0 && du[end] === 0) end--;
    let run = 0;
    for (let i = 1; i <= end; i++) {
      if (du[i] === 0) { run++; continue; }
      while (run >= 16) { writeBits(ac.code[0xf0], ac.len[0xf0]); run -= 16; }
      const v = du[i], n = cat(v), sym = (run << 4) | n;
      writeBits(ac.code[sym], ac.len[sym]);
      writeBits(v < 0 ? v - 1 : v, n);
      run = 0;
    }
    if (end < 63) writeBits(ac.code[0], ac.len[0]);
    return du[0];
  };

  let dcY = 0, dcCb = 0, dcCr = 0, written = 0;
  let carry: Uint8Array | null = null; // rows left over that don't fill 8 lines yet
  let carryRows = 0;
  const Y = new Float64Array(64), Cb = new Float64Array(64), Cr = new Float64Array(64);
  const encodeRows = (rgba: ArrayLike<number>, rows: number) => {
    // rows is a multiple of 8, or the final band.
    for (let by = 0; by < rows; by += 8) {
      for (let bx = 0; bx < width; bx += 8) {
        for (let y = 0; y < 8; y++) {
          const yy = Math.min(rows - 1, by + y);
          for (let x = 0; x < 8; x++) {
            const xx = Math.min(width - 1, bx + x);
            const p = (yy * width + xx) * 4;
            const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
            const k = y * 8 + x;
            Y[k] = 0.299 * r + 0.587 * g + 0.114 * b - 128;
            Cb[k] = -0.168736 * r - 0.331264 * g + 0.5 * b;
            Cr[k] = 0.5 * r - 0.418688 * g - 0.081312 * b;
          }
        }
        blk.set(Y); dcY = encodeBlock(fY, dcY, dcL, acL);
        blk.set(Cb); dcCb = encodeBlock(fC, dcCb, dcC, acC);
        blk.set(Cr); dcCr = encodeBlock(fC, dcCr, dcC, acC);
      }
    }
  };
  return {
    async add(rgba, rows) {
      let data: ArrayLike<number> = rgba;
      let n = rows;
      if (carry) {
        const merged = new Uint8Array((carryRows + rows) * width * 4);
        merged.set(carry, 0);
        merged.set(rgba as ArrayLike<number>, carry.length);
        data = merged;
        n = carryRows + rows;
        carry = null;
        carryRows = 0;
      }
      written += rows;
      const full = written === height ? n : n - (n % 8);
      if (full) encodeRows(data, full);
      if (full < n) {
        carry = new Uint8Array((data as Uint8Array).subarray ? (data as Uint8Array).subarray(full * width * 4, n * width * 4) : Array.prototype.slice.call(data, full * width * 4, n * width * 4));
        carryRows = n - full;
      }
      // let the page breathe between bands
      await new Promise((r) => setTimeout(r, 0));
    },
    async finish() {
      if (written !== height) throw new Error(`JPEG: expected ${height} rows, got ${written}`);
      if (carry) encodeRows(carry, carryRows);
      if (bitCnt > 0) writeBits((1 << (8 - bitCnt)) - 1, 8 - bitCnt);
      out.word(0xffd9);
      out.flush();
      return new Blob(out.chunks as BlobPart[], { type: 'image/jpeg' });
    },
  };
}
