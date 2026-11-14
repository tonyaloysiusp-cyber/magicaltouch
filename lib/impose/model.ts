// Imposition model — pure functions, millimetres, PDF orientation (origin at
// the bottom-left, y up). A document is a list of sheets; every sheet holds
// items (source PDF pages, text, rectangles, lines) placed with an affine
// matrix. Every command takes a document and returns a new one, so undo /
// redo, "repeat last action" and automation sequences are just lists of
// commands replayed. Source pages stay vectors: an item references a page of
// a source PDF and the area of it to show; nothing is rasterised.

export interface Box { x: number; y: number; w: number; h: number }
export interface Edges { t: number; r: number; b: number; l: number }
export interface M { a: number; b: number; c: number; d: number; e: number; f: number }

export type Item =
  | { k: 'page'; src: number; page: number; avail: Box; srcTrim: Box; clip: Box; m: M; grp: string; tag?: string }
  | { k: 'text'; text: string; size: number; color: string; m: M; grp: string; tag?: string; align?: 'l' | 'c' | 'r' }
  | { k: 'rect'; w: number; h: number; color: string; m: M; grp: string; tag?: string }
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: string; m: M; grp: string; tag?: string };

export interface Sheet { id: string; w: number; h: number; trim: Box; bleed: Edges; items: Item[]; side?: 'front' | 'back'; label?: string }
export interface Doc { sheets: Sheet[] }

export interface SourcePage { media: Box; trim: Box; bleedBox: Box; rotate: number }
export interface Source { name: string; pages: SourcePage[] }

// ------------------------------------------------------------------ matrices
export const I: M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** A then B?  mul(A, B) applies B first, then A. */
export function mul(A: M, B: M): M {
  return { a: A.a * B.a + A.c * B.b, b: A.b * B.a + A.d * B.b, c: A.a * B.c + A.c * B.d, d: A.b * B.c + A.d * B.d, e: A.a * B.e + A.c * B.f + A.e, f: A.b * B.e + A.d * B.f + A.f };
}
export const tr = (x: number, y: number): M => ({ ...I, e: x, f: y });
export const sc = (sx: number, sy = sx): M => ({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
export function rot(deg: number): M {
  const q = ((Math.round(deg / 90) % 4) + 4) % 4; // exact for multiples of 90
  const [cos, sin] = deg % 90 === 0 ? [[1, 0], [0, 1], [-1, 0], [0, -1]][q] : [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}
export const apply = (m: M, x: number, y: number) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
/** Rotation (degrees), scale and translation of a matrix without skew. */
export function decompose(m: M): { x: number; y: number; deg: number; sx: number; sy: number } {
  const deg = Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI * 1000) / 1000;
  return { x: m.e, y: m.f, deg, sx: Math.hypot(m.a, m.b), sy: Math.hypot(m.c, m.d) };
}

let seq = 0;
export const uid = (p = 'g') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const noEdges: Edges = { t: 0, r: 0, b: 0, l: 0 };

// ------------------------------------------------------------------ start
/** One sheet per source page, sized to its trim box, with the bleed it carries. */
export function docFromSources(sources: Source[], only?: { src: number; pages?: number[] }): Doc {
  const sheets: Sheet[] = [];
  sources.forEach((s, si) => {
    if (only && only.src !== si) return;
    s.pages.forEach((p, pi) => { if (!only?.pages || only.pages.includes(pi)) sheets.push(sheetForPage(si, pi, p)); });
  });
  return { sheets };
}
export function sheetForPage(src: number, page: number, p: SourcePage): Sheet {
  const t = p.trim, bb = p.bleedBox;
  const bleed: Edges = { l: r3(Math.max(0, t.x - bb.x)), b: r3(Math.max(0, t.y - bb.y)), r: r3(Math.max(0, bb.x + bb.w - t.x - t.w)), t: r3(Math.max(0, bb.y + bb.h - t.y - t.h)) };
  // Local coordinates of the item: the trim's bottom-left is (0,0).
  let m = I;
  let w = t.w, h = t.h;
  const r = ((p.rotate % 360) + 360) % 360;
  if (r === 90) { m = mul(tr(0, t.w), rot(-90)); w = t.h; h = t.w; } // viewer shows the page turned clockwise
  else if (r === 180) { m = mul(tr(t.w, t.h), rot(180)); }
  else if (r === 270) { m = mul(tr(t.h, 0), rot(90)); w = t.h; h = t.w; }
  const rb: Edges = r === 90 ? { t: bleed.l, r: bleed.t, b: bleed.r, l: bleed.b } : r === 180 ? { t: bleed.b, r: bleed.l, b: bleed.t, l: bleed.r } : r === 270 ? { t: bleed.r, r: bleed.b, b: bleed.l, l: bleed.t } : bleed;
  return { id: uid('s'), w: r3(w), h: r3(h), trim: { x: 0, y: 0, w: r3(w), h: r3(h) }, bleed: rb, items: [{ k: 'page', src, page, avail: bb, srcTrim: t, clip: expand(t, bleed, bb), m, grp: uid() }], label: `p${page + 1}` };
}
function expand(t: Box, e: Edges, within: Box): Box {
  const x0 = Math.max(within.x, t.x - e.l), y0 = Math.max(within.y, t.y - e.b);
  const x1 = Math.min(within.x + within.w, t.x + t.w + e.r), y1 = Math.min(within.y + within.h, t.y + t.h + e.t);
  return { x: r3(x0), y: r3(y0), w: r3(x1 - x0), h: r3(y1 - y0) };
}
/** Page items' local origin is the source trim's bottom-left; the clip is in source coordinates. */
export function clipLocal(it: Extract<Item, { k: 'page' }>): Box { return { x: it.clip.x - it.srcTrim.x, y: it.clip.y - it.srcTrim.y, w: it.clip.w, h: it.clip.h }; }

// ------------------------------------------------------------------ commands
export type Sel = 'all' | 'odd' | 'even' | number[]; // 0-based sheet indices
export type Anchor = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br';
export type MarkOpts = { crop?: boolean; fold?: boolean; registration?: boolean; info?: boolean };

export type Command =
  | { type: 'reverse' }
  | { type: 'shuffleEvenOdd'; mode: 'odds-then-evens' | 'evens-then-odds' | 'interleave-halves' | 'reverse-evens' }
  | { type: 'shuffleForImposing'; perSheet: number }
  | { type: 'insertBlank'; at: number; count: number; w?: number; h?: number }
  | { type: 'insertPages'; at: number; src: number; pages: number[] }
  | { type: 'deletePages'; sel: Sel }
  | { type: 'duplicatePages'; sel: Sel; times: number }
  | { type: 'movePages'; sel: number[]; to: number }
  | { type: 'rotatePages'; sel: Sel; deg: 90 | 180 | 270 }
  | { type: 'defineBleeds'; sel: Sel; bleed: Edges }
  | { type: 'adjustSize'; sel: Sel; w: number; h: number; fit: 'none' | 'fit' | 'fill' | 'stretch'; anchor: Anchor }
  | { type: 'trimShift'; sel: Sel; dx: number; dy: number; mirrorEven?: boolean; cut?: Edges }
  | { type: 'creep'; totalMm: number }
  | { type: 'stickText'; sel: Sel; text: string; anchor: Anchor; dx: number; dy: number; size: number; color: string; start?: number }
  | { type: 'stickPdf'; sel: Sel; src: number; page: number; anchor: Anchor; dx: number; dy: number; scale: number }
  | { type: 'maskTape'; sel: Sel; box: Box; color?: string }
  | { type: 'peelOff'; sel: Sel; what: 'stuck' | 'tape' | 'marks' | 'all' }
  | { type: 'nUp'; sheetW: number; sheetH: number; cols: number; rows: number; gap: number; margin: number; order: 'rows' | 'columns'; duplex: 'none' | 'long' | 'short'; bleed: number; marks: MarkOpts; fit: 'none' | 'fit' }
  | { type: 'stepRepeat'; sheetW: number; sheetH: number; cols: number; rows: number; gap: number; bleed: number; marks: MarkOpts; duplex: 'none' | 'long' | 'short' }
  | { type: 'booklet'; sheet: 'spread' | { w: number; h: number }; marks: MarkOpts; creepMm?: number }
  | { type: 'joinPages'; layout: 'side' | 'stack'; gap: number }
  | { type: 'tile'; tileW: number; tileH: number; overlap: number; marks: MarkOpts }
  | { type: 'newSheet'; at: number; w: number; h: number }
  | { type: 'placePage'; sheet: number; src: number; page: number; x: number; y: number; deg: 0 | 90 | 180 | 270; scale: number; bleed: number }
  | { type: 'moveGroup'; sheet: number; grp: string; dx: number; dy: number; deg?: 0 | 90 | 180 | 270 }
  | { type: 'setTrimBox'; sel: Sel; trim: Box };

export const COMMAND_LABEL: Record<Command['type'], string> = {
  reverse: 'Reverse page order', shuffleEvenOdd: 'Shuffle even/odd pages', shuffleForImposing: 'Shuffle pages for imposing (cut & stack)',
  insertBlank: 'Insert blank pages', insertPages: 'Insert pages', deletePages: 'Delete pages', duplicatePages: 'Duplicate pages', movePages: 'Move pages',
  rotatePages: 'Rotate pages', defineBleeds: 'Define bleeds', adjustSize: 'Adjust page sizes', trimShift: 'Trim and shift', creep: 'Creep pages for binding',
  stickText: 'Stick on text and numbers', stickPdf: 'Stick on PDF pages', maskTape: 'Stick on masking tape', peelOff: 'Peel off',
  nUp: 'N-up pages', stepRepeat: 'Step and repeat', booklet: 'Create booklet', joinPages: 'Join two pages', tile: 'Tile pages',
  newSheet: 'New sheet (manual imposition)', placePage: 'Place page (manual imposition)', moveGroup: 'Move placed page (manual imposition)', setTrimBox: 'Info / modify: set trim box',
};

export function selIndices(sel: Sel, n: number): number[] {
  if (sel === 'all') return Array.from({ length: n }, (_, i) => i);
  if (sel === 'odd') return Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === 0); // pages 1, 3, 5…
  if (sel === 'even') return Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === 1);
  return sel.filter((i) => i >= 0 && i < n);
}
/** "1-3, 6, 9-" → 0-based indices. */
export function parseRange(s: string, n: number): number[] {
  const out = new Set<number>();
  for (const part of s.split(',').map((x) => x.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
    if (m) { const a = m[1] ? Number(m[1]) : 1, b = m[2] ? Number(m[2]) : n; for (let i = Math.max(1, a); i <= Math.min(n, b); i++) out.add(i - 1); }
    else if (/^\d+$/.test(part)) { const i = Number(part); if (i >= 1 && i <= n) out.add(i - 1); }
  }
  return [...out].sort((a, b) => a - b);
}

function anchorPoint(a: Anchor, w: number, h: number): { x: number; y: number } {
  const x = a === 'l' || a.endsWith('l') ? 0 : a === 'r' || a.endsWith('r') ? w : w / 2;
  const y = a[0] === 't' ? h : a[0] === 'b' ? 0 : h / 2;
  return { x, y };
}
const blankSheet = (w: number, h: number): Sheet => ({ id: uid('s'), w, h, trim: { x: 0, y: 0, w, h }, bleed: { ...noEdges }, items: [], label: 'blank' });
const isMark = (it: Item) => it.tag === 'mark';

/** Places a sheet's content into another sheet with matrix m; page clips grow to `bleed` where the source has it. */
function placeSheet(s: Sheet, m: M, bleed: number | null, grp = uid()): Item[] {
  return s.items.filter((it) => !isMark(it)).map((it) => {
    const n = { ...clone(it), m: mul(m, it.m), grp } as Item;
    if (n.k === 'page' && bleed != null) n.clip = expand(n.srcTrim, { t: bleed, r: bleed, b: bleed, l: bleed }, n.avail);
    return n;
  });
}
function cropMarkLines(trim: Box, bleed: number, grp: string): Item[] {
  const o = bleed + 2, L = 5, out: Item[] = [];
  const xs = [trim.x, trim.x + trim.w], ys = [trim.y, trim.y + trim.h];
  for (const x of xs) for (const y of ys) {
    const dx = x === trim.x ? -1 : 1, dy = y === trim.y ? -1 : 1;
    out.push({ k: 'line', x1: x + dx * o, y1: y, x2: x + dx * (o + L), y2: y, width: 0.25, color: '#000000', m: I, grp, tag: 'mark' });
    out.push({ k: 'line', x1: x, y1: y + dy * o, x2: x, y2: y + dy * (o + L), width: 0.25, color: '#000000', m: I, grp, tag: 'mark' });
  }
  return out;
}
function regMarks(w: number, h: number, grp: string): Item[] {
  const out: Item[] = [];
  const at = (cx: number, cy: number) => {
    out.push({ k: 'line', x1: cx - 4, y1: cy, x2: cx + 4, y2: cy, width: 0.2, color: '#000000', m: I, grp, tag: 'mark' });
    out.push({ k: 'line', x1: cx, y1: cy - 4, x2: cx, y2: cy + 4, width: 0.2, color: '#000000', m: I, grp, tag: 'mark' });
  };
  at(w / 2, 4); at(w / 2, h - 4); at(4, h / 2); at(w - 4, h / 2);
  return out;
}

/** Apply one command. `sources` is needed for commands that bring in source pages. */
export function run(doc: Doc, cmd: Command, sources: Source[] = []): Doc {
  const S = doc.sheets;
  const n = S.length;
  const map = (sel: Sel, fn: (s: Sheet, i: number) => Sheet): Doc => { const set = new Set(selIndices(sel, n)); return { sheets: S.map((s, i) => (set.has(i) ? fn(clone(s), i) : s)) }; };
  switch (cmd.type) {
    case 'reverse': return { sheets: [...S].reverse() };
    case 'shuffleEvenOdd': {
      const odd = S.filter((_, i) => i % 2 === 0), even = S.filter((_, i) => i % 2 === 1);
      if (cmd.mode === 'odds-then-evens') return { sheets: [...odd, ...even] };
      if (cmd.mode === 'evens-then-odds') return { sheets: [...even, ...odd] };
      if (cmd.mode === 'reverse-evens') { const re = [...even].reverse(); return { sheets: S.map((s, i) => (i % 2 ? re[(i - 1) / 2] : s)) }; }
      // Interleave the first half with the second (scanned fronts + backs).
      const half = Math.ceil(n / 2), out: Sheet[] = [];
      for (let i = 0; i < half; i++) { out.push(S[i]); if (S[half + i]) out.push(S[half + i]); }
      return { sheets: out };
    }
    case 'shuffleForImposing': {
      // Cut & stack: after n-up printing, stacking the cut piles gives 1, 2, 3… in order.
      const k = Math.max(1, Math.round(cmd.perSheet));
      const sheetsNeeded = Math.ceil(n / k), total = sheetsNeeded * k;
      const padW = S[n - 1]?.w || 210, padH = S[n - 1]?.h || 297;
      const pad = [...S, ...Array.from({ length: total - n }, () => blankSheet(padW, padH))];
      const out: Sheet[] = [];
      for (let s = 0; s < sheetsNeeded; s++) for (let j = 0; j < k; j++) out.push(pad[j * sheetsNeeded + s]);
      return { sheets: out };
    }
    case 'insertBlank': {
      const ref = S[Math.min(Math.max(0, cmd.at - 1), n - 1)] || S[0];
      const add = Array.from({ length: Math.max(1, cmd.count) }, () => blankSheet(cmd.w || ref?.w || 210, cmd.h || ref?.h || 297));
      const at = Math.max(0, Math.min(n, cmd.at));
      return { sheets: [...S.slice(0, at), ...add, ...S.slice(at)] };
    }
    case 'insertPages': {
      const src = sources[cmd.src]; if (!src) return doc;
      const add = cmd.pages.filter((p) => src.pages[p]).map((p) => sheetForPage(cmd.src, p, src.pages[p]));
      const at = Math.max(0, Math.min(n, cmd.at));
      return { sheets: [...S.slice(0, at), ...add, ...S.slice(at)] };
    }
    case 'deletePages': { const del = new Set(selIndices(cmd.sel, n)); return { sheets: S.filter((_, i) => !del.has(i)) }; }
    case 'duplicatePages': { const d = new Set(selIndices(cmd.sel, n)); return { sheets: S.flatMap((s, i) => (d.has(i) ? [s, ...Array.from({ length: Math.max(1, cmd.times) }, () => ({ ...clone(s), id: uid('s') }))] : [s])) }; }
    case 'movePages': {
      const pick = new Set(cmd.sel.filter((i) => i >= 0 && i < n));
      const moving = S.filter((_, i) => pick.has(i)), rest = S.filter((_, i) => !pick.has(i));
      const to = Math.max(0, Math.min(rest.length, cmd.to - [...pick].filter((i) => i < cmd.to).length));
      return { sheets: [...rest.slice(0, to), ...moving, ...rest.slice(to)] };
    }
    case 'rotatePages': return map(cmd.sel, (s) => {
      // Turned clockwise, as page viewers do.
      const d = cmd.deg;
      const m = d === 90 ? mul(tr(0, s.w), rot(-90)) : d === 180 ? mul(tr(s.w, s.h), rot(180)) : mul(tr(s.h, 0), rot(90));
      const b = s.bleed;
      const nb: Edges = d === 90 ? { t: b.l, r: b.t, b: b.r, l: b.b } : d === 180 ? { t: b.b, r: b.l, b: b.t, l: b.r } : { t: b.r, r: b.b, b: b.l, l: b.t };
      const w = d === 180 ? s.w : s.h, h = d === 180 ? s.h : s.w;
      return { ...s, w, h, trim: { x: 0, y: 0, w, h }, bleed: nb, items: s.items.map((it) => ({ ...it, m: mul(m, it.m) })) };
    });
    case 'defineBleeds': return map(cmd.sel, (s) => ({ ...s, bleed: { ...cmd.bleed }, items: s.items.map((it) => (it.k === 'page' ? { ...it, clip: expand(it.srcTrim, cmd.bleed, it.avail) } : it)) }));
    case 'adjustSize': return map(cmd.sel, (s) => {
      const k = cmd.fit === 'fit' ? Math.min(cmd.w / s.w, cmd.h / s.h) : cmd.fit === 'fill' ? Math.max(cmd.w / s.w, cmd.h / s.h) : 1;
      const kx = cmd.fit === 'stretch' ? cmd.w / s.w : k, ky = cmd.fit === 'stretch' ? cmd.h / s.h : k;
      const cw = s.w * kx, ch = s.h * ky;
      const ax = cmd.anchor.includes('l') ? 0 : cmd.anchor.includes('r') ? cmd.w - cw : (cmd.w - cw) / 2;
      const ay = cmd.anchor[0] === 'b' ? 0 : cmd.anchor[0] === 't' ? cmd.h - ch : (cmd.h - ch) / 2;
      const m = mul(tr(ax, ay), sc(kx, ky));
      return { ...s, w: cmd.w, h: cmd.h, trim: { x: 0, y: 0, w: cmd.w, h: cmd.h }, items: s.items.map((it) => ({ ...it, m: mul(m, it.m) })) };
    });
    case 'trimShift': return map(cmd.sel, (s, i) => {
      const dx = cmd.mirrorEven && i % 2 === 1 ? -cmd.dx : cmd.dx;
      const c = cmd.cut || noEdges;
      const m = tr(dx - c.l, cmd.dy - c.b);
      const w = Math.max(1, s.w - c.l - c.r), h = Math.max(1, s.h - c.t - c.b);
      return { ...s, w, h, trim: { x: 0, y: 0, w, h }, items: s.items.map((it) => ({ ...it, m: mul(m, it.m) })) };
    });
    case 'creep': {
      // Reading-order pages of a saddle-stitched booklet: inner sheets are shifted toward the spine.
      const total = Math.ceil(n / 4) * 4, sheetsN = total / 4;
      return { sheets: S.map((s, i) => {
        const sheet = Math.floor(Math.min(i, total - 1 - i) / 2);
        const shift = sheetsN > 1 ? (cmd.totalMm * sheet) / (sheetsN - 1) : 0;
        if (!shift) return s;
        const dx = i % 2 === 0 ? -shift : shift; // right-hand pages move left, left-hand pages move right
        return { ...clone(s), items: s.items.map((it) => ({ ...it, m: mul(tr(dx, 0), it.m) })) };
      }) };
    }
    case 'stickText': {
      const idx = selIndices(cmd.sel, n);
      return { sheets: S.map((s, i) => {
        const k = idx.indexOf(i); if (k < 0) return s;
        const num = (cmd.start ?? 1) + k;
        const text = cmd.text.replace(/\{n\}/g, String(num)).replace(/\{page\}/g, String(i + 1)).replace(/\{N\}/g, String(n)).replace(/\{total\}/g, String(n)).replace(/\{date\}/g, new Date().toISOString().slice(0, 10));
        const p = anchorPoint(cmd.anchor, s.w, s.h);
        const align = cmd.anchor === 'l' || cmd.anchor.endsWith('l') ? 'l' : cmd.anchor === 'r' || cmd.anchor.endsWith('r') ? 'r' : 'c';
        const down = cmd.anchor[0] === 't' ? cmd.size * 0.3528 : 0; // keep top-anchored text inside the page (size is in points)
        return { ...s, items: [...s.items, { k: 'text', text, size: cmd.size, color: cmd.color, m: tr(p.x + cmd.dx, p.y + cmd.dy - down), grp: uid(), tag: 'stuck', align } as Item] };
      }) };
    }
    case 'stickPdf': {
      const src = sources[cmd.src]?.pages[cmd.page]; if (!src) return doc;
      const st = sheetForPage(cmd.src, cmd.page, src);
      return map(cmd.sel, (s) => {
        const p = anchorPoint(cmd.anchor, s.w, s.h);
        const w = st.w * cmd.scale, h = st.h * cmd.scale;
        const ox = cmd.anchor.includes('l') ? 0 : cmd.anchor.includes('r') ? -w : -w / 2;
        const oy = cmd.anchor[0] === 'b' ? 0 : cmd.anchor[0] === 't' ? -h : -h / 2;
        const items = placeSheet(st, mul(tr(p.x + ox + cmd.dx, p.y + oy + cmd.dy), sc(cmd.scale)), 0).map((it) => ({ ...it, tag: 'stuck' }));
        return { ...s, items: [...s.items, ...items] };
      });
    }
    case 'maskTape': return map(cmd.sel, (s) => ({ ...s, items: [...s.items, { k: 'rect', w: cmd.box.w, h: cmd.box.h, color: cmd.color || '#FFFFFF', m: tr(cmd.box.x, cmd.box.y), grp: uid(), tag: 'tape' } as Item] }));
    case 'peelOff': return map(cmd.sel, (s) => ({ ...s, items: s.items.filter((it) => !(cmd.what === 'all' ? it.tag === 'stuck' || it.tag === 'tape' || it.tag === 'mark' : it.tag === cmd.what || (cmd.what === 'marks' && it.tag === 'mark'))) }));
    case 'setTrimBox': return map(cmd.sel, (s) => {
      const m = tr(-cmd.trim.x, -cmd.trim.y);
      return { ...s, w: cmd.trim.w, h: cmd.trim.h, trim: { x: 0, y: 0, w: cmd.trim.w, h: cmd.trim.h }, items: s.items.map((it) => ({ ...it, m: mul(m, it.m) })) };
    });
    case 'nUp': return nUp(doc, cmd);
    case 'stepRepeat': return stepRepeat(doc, cmd);
    case 'booklet': return booklet(doc, cmd);
    case 'joinPages': {
      const out: Sheet[] = [];
      for (let i = 0; i < n; i += 2) {
        const a = S[i], b = S[i + 1];
        if (!b) { out.push(a); break; }
        const side = cmd.layout === 'side';
        const w = side ? a.w + cmd.gap + b.w : Math.max(a.w, b.w), h = side ? Math.max(a.h, b.h) : a.h + cmd.gap + b.h;
        const items = [...placeSheet(a, side ? tr(0, (h - a.h) / 2) : tr((w - a.w) / 2, b.h + cmd.gap), null), ...placeSheet(b, side ? tr(a.w + cmd.gap, (h - b.h) / 2) : tr((w - b.w) / 2, 0), null)];
        out.push({ id: uid('s'), w, h, trim: { x: 0, y: 0, w, h }, bleed: side ? { t: Math.min(a.bleed.t, b.bleed.t), b: Math.min(a.bleed.b, b.bleed.b), l: a.bleed.l, r: b.bleed.r } : { t: a.bleed.t, b: b.bleed.b, l: Math.min(a.bleed.l, b.bleed.l), r: Math.min(a.bleed.r, b.bleed.r) }, items, label: `${a.label || ''}+${b.label || ''}` });
      }
      return { sheets: out };
    }
    case 'tile': {
      const out: Sheet[] = [];
      for (const s of S) {
        const stepX = Math.max(1, cmd.tileW - cmd.overlap), stepY = Math.max(1, cmd.tileH - cmd.overlap);
        const cols = Math.max(1, Math.ceil((s.w - cmd.overlap) / stepX)), rows = Math.max(1, Math.ceil((s.h - cmd.overlap) / stepY));
        for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) {
          const x0 = c * stepX, y0 = r * stepY;
          const tw = Math.min(cmd.tileW, s.w - x0), th = Math.min(cmd.tileH, s.h - y0);
          const items = s.items.filter((it) => !isMark(it)).map((it) => {
            const nIt = { ...clone(it), m: mul(tr(-x0, -y0), it.m) } as Item;
            if (nIt.k === 'page') {
              // Clip the source to this tile (plus the overlap the next tile repeats).
              const inv = invert(nIt.m);
              const p1 = apply(inv, 0, 0), p2 = apply(inv, tw, th);
              const lx = Math.min(p1.x, p2.x), ly = Math.min(p1.y, p2.y), hx = Math.max(p1.x, p2.x), hy = Math.max(p1.y, p2.y);
              const want = { x: nIt.srcTrim.x + lx, y: nIt.srcTrim.y + ly, w: hx - lx, h: hy - ly };
              nIt.clip = intersect(want, nIt.clip);
            }
            return nIt;
          }).filter((it) => it.k !== 'page' || (it.clip.w > 0 && it.clip.h > 0));
          const g = uid();
          const marks = cmd.marks.crop ? [...cropMarkLines({ x: 0, y: 0, w: tw, h: th }, 0, g)] : [];
          out.push({ id: uid('s'), w: r3(tw), h: r3(th), trim: { x: 0, y: 0, w: r3(tw), h: r3(th) }, bleed: { ...noEdges }, items: [...items, ...marks], label: `${s.label || ''} tile ${rows - r}-${c + 1}` });
        }
      }
      return { sheets: out };
    }
    case 'newSheet': { const at = Math.max(0, Math.min(n, cmd.at)); return { sheets: [...S.slice(0, at), blankSheet(cmd.w, cmd.h), ...S.slice(at)] }; }
    case 'placePage': {
      const src = sources[cmd.src]?.pages[cmd.page]; const target = S[cmd.sheet]; if (!src || !target) return doc;
      const st = sheetForPage(cmd.src, cmd.page, src);
      const w = st.w * cmd.scale, h = st.h * cmd.scale;
      const rm = cmd.deg === 90 ? mul(tr(0, w), rot(-90)) : cmd.deg === 180 ? mul(tr(w, h), rot(180)) : cmd.deg === 270 ? mul(tr(h, 0), rot(90)) : I;
      const items = placeSheet(st, mul(tr(cmd.x, cmd.y), mul(rm, sc(cmd.scale))), cmd.bleed);
      return { sheets: S.map((s, i) => (i === cmd.sheet ? { ...s, items: [...s.items, ...items] } : s)) };
    }
    case 'moveGroup': return { sheets: S.map((s, i) => {
      if (i !== cmd.sheet) return s;
      const its = s.items.filter((it) => it.grp === cmd.grp); if (!its.length) return s;
      let m = tr(cmd.dx, cmd.dy);
      if (cmd.deg) {
        const bb = groupBounds(its);
        const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
        m = mul(m, mul(tr(cx, cy), mul(rot(-cmd.deg), tr(-cx, -cy))));
      }
      return { ...s, items: s.items.map((it) => (it.grp === cmd.grp ? { ...it, m: mul(m, it.m) } : it)) };
    }) };
  }
  return doc;
}

export function invert(m: M): M {
  const det = m.a * m.d - m.b * m.c || 1;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
}
function intersect(a: Box, b: Box): Box {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return { x: r3(x0), y: r3(y0), w: r3(Math.max(0, x1 - x0)), h: r3(Math.max(0, y1 - y0)) };
}
/** Bounding box (sheet mm) of a set of items. */
export function groupBounds(items: Item[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) {
    const box = it.k === 'page' ? clipLocal(it) : it.k === 'rect' ? { x: 0, y: 0, w: it.w, h: it.h } : it.k === 'line' ? { x: Math.min(it.x1, it.x2), y: Math.min(it.y1, it.y2), w: Math.abs(it.x2 - it.x1), h: Math.abs(it.y2 - it.y1) } : { x: 0, y: 0, w: it.text.length * it.size * 0.18, h: it.size * 0.35 };
    for (const [px, py] of [[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]]) {
      const p = apply(it.m, px, py); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ------------------------------------------------------------------ impositions
function cellOrigin(cols: number, rows: number, cw: number, ch: number, gap: number, sheetW: number, sheetH: number, idx: number, order: 'rows' | 'columns', mirror: boolean) {
  const c0 = order === 'rows' ? idx % cols : Math.floor(idx / rows);
  const r = order === 'rows' ? Math.floor(idx / cols) : idx % rows;
  const c = mirror ? cols - 1 - c0 : c0;
  const usedW = cols * cw + (cols - 1) * gap, usedH = rows * ch + (rows - 1) * gap;
  const x0 = (sheetW - usedW) / 2, y0 = (sheetH - usedH) / 2;
  return { x: x0 + c * (cw + gap), y: y0 + (rows - 1 - r) * (ch + gap) }; // first row at the top
}
function finishSheet(w: number, h: number, items: Item[], trims: Box[], o: { bleed: number; marks: MarkOpts; side?: 'front' | 'back'; label: string; folds?: number[] }): Sheet {
  const g = uid('m');
  const marks: Item[] = [];
  if (o.marks.crop) for (const t of trims) marks.push(...cropMarkLines(t, o.bleed, g));
  if (o.marks.registration) marks.push(...regMarks(w, h, g));
  if (o.marks.fold && o.folds) for (const x of o.folds) { marks.push({ k: 'line', x1: x, y1: 0, x2: x, y2: 6, width: 0.25, color: '#000000', m: I, grp: g, tag: 'mark' }, { k: 'line', x1: x, y1: h - 6, x2: x, y2: h, width: 0.25, color: '#000000', m: I, grp: g, tag: 'mark' }); }
  if (o.marks.info) marks.push({ k: 'text', text: o.label, size: 6, color: '#000000', m: tr(4, 2), grp: g, tag: 'mark' });
  return { id: uid('s'), w, h, trim: { x: 0, y: 0, w, h }, bleed: { ...noEdges }, items: [...items, ...marks], side: o.side, label: o.label };
}

function nUp(doc: Doc, c: Extract<Command, { type: 'nUp' }>): Doc {
  const per = Math.max(1, c.cols * c.rows);
  const S = doc.sheets;
  if (!S.length) return doc;
  // Cell = the largest page's trim (pages are centred in their cell); optional fit scales pages into the cell.
  const availW = c.sheetW - 2 * c.margin, availH = c.sheetH - 2 * c.margin;
  const cw = c.fit === 'fit' ? (availW - (c.cols - 1) * c.gap) / c.cols - 2 * c.bleed : Math.max(...S.map((s) => s.w));
  const ch = c.fit === 'fit' ? (availH - (c.rows - 1) * c.gap) / c.rows - 2 * c.bleed : Math.max(...S.map((s) => s.h));
  const out: Sheet[] = [];
  const sheetsN = Math.ceil(S.length / per);
  for (let k = 0; k < sheetsN; k++) {
    const isBack = c.duplex !== 'none' && k % 2 === 1;
    const items: Item[] = [], trims: Box[] = [];
    for (let j = 0; j < per; j++) {
      const s = S[k * per + j]; if (!s) break;
      const o = cellOrigin(c.cols, c.rows, cw + 2 * c.bleed, ch + 2 * c.bleed, c.gap, c.sheetW, c.sheetH, j, c.order, isBack && c.duplex === 'long');
      const kf = c.fit === 'fit' ? Math.min(cw / s.w, ch / s.h) : 1;
      const pw = s.w * kf, ph = s.h * kf;
      let x = o.x + c.bleed + (cw - pw) / 2, y = o.y + c.bleed + (ch - ph) / 2;
      let m = mul(tr(x, y), sc(kf));
      if (isBack && c.duplex === 'short') {
        // Flip on the short edge: the back sheet is upside down relative to the front.
        const oo = cellOrigin(c.cols, c.rows, cw + 2 * c.bleed, ch + 2 * c.bleed, c.gap, c.sheetW, c.sheetH, j, c.order, false);
        x = c.sheetW - (oo.x + c.bleed + (cw - pw) / 2) - pw; y = c.sheetH - (oo.y + c.bleed + (ch - ph) / 2) - ph;
        m = mul(tr(x + pw, y + ph), mul(rot(180), sc(kf)));
      }
      items.push(...placeSheet(s, m, c.bleed / kf));
      trims.push({ x, y, w: pw, h: ph });
    }
    out.push(finishSheet(c.sheetW, c.sheetH, items, trims, { bleed: c.bleed, marks: c.marks, side: c.duplex === 'none' ? undefined : isBack ? 'back' : 'front', label: `Sheet ${Math.floor(k / (c.duplex === 'none' ? 1 : 2)) + 1}${c.duplex === 'none' ? '' : isBack ? ' back' : ' front'} · ${per}-up` }));
  }
  return { sheets: out };
}

function stepRepeat(doc: Doc, c: Extract<Command, { type: 'stepRepeat' }>): Doc {
  const out: Sheet[] = [];
  doc.sheets.forEach((s, k) => {
    const isBack = c.duplex !== 'none' && k % 2 === 1;
    const items: Item[] = [], trims: Box[] = [];
    const cw = s.w + 2 * c.bleed, ch = s.h + 2 * c.bleed;
    for (let j = 0; j < c.cols * c.rows; j++) {
      const o = cellOrigin(c.cols, c.rows, cw, ch, c.gap, c.sheetW, c.sheetH, j, 'rows', isBack && c.duplex === 'long');
      let x = o.x + c.bleed, y = o.y + c.bleed;
      let m = tr(x, y);
      if (isBack && c.duplex === 'short') { x = c.sheetW - x - s.w; y = c.sheetH - y - s.h; m = mul(tr(x + s.w, y + s.h), rot(180)); }
      items.push(...placeSheet(s, m, c.bleed));
      trims.push({ x, y, w: s.w, h: s.h });
    }
    out.push(finishSheet(c.sheetW, c.sheetH, items, trims, { bleed: c.bleed, marks: c.marks, side: c.duplex === 'none' ? undefined : isBack ? 'back' : 'front', label: `${s.label || `Page ${k + 1}`} × ${c.cols * c.rows}` }));
  });
  return { sheets: out };
}

/** Saddle-stitch booklet sheets (front/back), blank pages padded at the end. */
export function bookletPairs(pageCount: number): { front: [number, number]; back: [number, number] }[] {
  const total = Math.max(4, Math.ceil(pageCount / 4) * 4);
  const p = (i: number) => (i < pageCount ? i : -1);
  return Array.from({ length: total / 4 }, (_, s) => ({ front: [p(total - 1 - 2 * s), p(2 * s)] as [number, number], back: [p(2 * s + 1), p(total - 2 - 2 * s)] as [number, number] }));
}
function booklet(doc: Doc, c: Extract<Command, { type: 'booklet' }>): Doc {
  let S = doc.sheets;
  if (!S.length) return doc;
  if (c.creepMm) S = run({ sheets: S }, { type: 'creep', totalMm: c.creepMm }).sheets;
  const pw = Math.max(...S.map((s) => s.w)), ph = Math.max(...S.map((s) => s.h));
  const SW = c.sheet === 'spread' ? pw * 2 : Math.max(c.sheet.w, c.sheet.h), SH = c.sheet === 'spread' ? ph : Math.min(c.sheet.w, c.sheet.h);
  const k = Math.min(SW / (pw * 2), SH / ph);
  const x0 = (SW - pw * 2 * k) / 2, y0 = (SH - ph * k) / 2;
  const out: Sheet[] = [];
  bookletPairs(S.length).forEach((pair, si) => {
    (['front', 'back'] as const).forEach((side) => {
      const items: Item[] = [], trims: Box[] = [];
      pair[side].forEach((pi, i) => {
        const x = x0 + i * pw * k, y = y0;
        trims.push({ x, y, w: pw * k, h: ph * k });
        if (pi < 0) return;
        const s = S[pi];
        // Only the outer edges keep bleed; the spine edge is cut at the trim.
        const its = placeSheet(s, mul(tr(x + (pw - s.w) * k * (i === 0 ? 1 : 0), y + (ph - s.h) * k / 2), sc(k)), null).map((it) => {
          if (it.k !== 'page') return it;
          const b = s.bleed;
          const e: Edges = i === 0 ? { t: b.t, b: b.b, l: b.l, r: 0 } : { t: b.t, b: b.b, l: 0, r: b.r };
          return { ...it, clip: expand(it.srcTrim, e, it.avail) };
        });
        items.push(...its);
      });
      out.push(finishSheet(SW, SH, items, trims, { bleed: Math.max(0, ...S.map((s) => Math.max(s.bleed.t, s.bleed.l, s.bleed.r))), marks: c.marks, side, label: `Sheet ${si + 1} ${side} · pages ${pair[side].map((p) => (p < 0 ? 'blank' : p + 1)).join(' + ')}`, folds: [x0 + pw * k] }));
    });
  });
  return { sheets: out };
}

/** Run a list of commands (automation sequence). */
export function runAll(doc: Doc, cmds: Command[], sources: Source[] = []): Doc { return cmds.reduce((d, c) => run(d, c, sources), doc); }
