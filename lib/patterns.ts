// ---------------------------------------------------------------------
// lib/patterns.ts — the Pattern Studio engine.
// Builds a seamless repeat tile (SVG) from a motif and repeat settings.
// Pure functions: no DOM, so it runs in the browser, on the server and in
// unit tests. Every repeat type places motifs inside one tile (with wrap
// copies at the edges) so the tile joins with itself on all four sides.
// ---------------------------------------------------------------------

export type RepeatType = 'grid' | 'brick' | 'half-drop' | 'mirror' | 'rotational' | 'radial' | 'kaleidoscope' | 'geometric' | 'organic' | 'random';

export const REPEATS: { id: RepeatType; label: string; hint: string }[] = [
  { id: 'grid', label: 'Grid', hint: 'Straight rows and columns' },
  { id: 'brick', label: 'Brick', hint: 'Every other row shifted by half' },
  { id: 'half-drop', label: 'Half-drop', hint: 'Every other column dropped by half' },
  { id: 'mirror', label: 'Mirror', hint: 'Flipped left–right and up–down' },
  { id: 'rotational', label: 'Rotational', hint: 'Turned 90° in each quarter' },
  { id: 'radial', label: 'Radial', hint: 'A ring of motifs around a centre' },
  { id: 'kaleidoscope', label: 'Kaleidoscope', hint: 'Mirrored ring, like a mandala' },
  { id: 'geometric', label: 'Geometric', hint: 'Hexagonal lattice' },
  { id: 'organic', label: 'Organic', hint: 'Scattered with natural variation' },
  { id: 'random', label: 'Random', hint: 'Evenly scattered, seamless' },
];

// A flower of n rounded petals around a small centre.
function flower(n: number): string {
  const rot = (x: number, y: number, a: number) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)].map((v) => Math.round(v * 10) / 10).join(' ');
  let d = '';
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    d += `M${rot(0, -8, a)}C${rot(-20, -22, a)} ${rot(-14, -48, a)} ${rot(0, -48, a)}C${rot(14, -48, a)} ${rot(20, -22, a)} ${rot(0, -8, a)}Z`;
  }
  return d + 'M0-7A7 7 0 1 1 0 7A7 7 0 1 1 0-7Z';
}

// Original motifs, drawn in a 100 × 100 box centred on 0,0.
export const MOTIFS: { id: string; label: string; d: string; stroke?: boolean }[] = [
  { id: 'sparkle', label: 'Sparkle', d: 'M0-50C4-14 14-4 50 0C14 4 4 14 0 50C-4 14-14 4-50 0C-14-4-4-14 0-50Z' },
  { id: 'dot', label: 'Dot', d: 'M0-40A40 40 0 1 1 0 40A40 40 0 1 1 0-40Z' },
  { id: 'ring', label: 'Ring', d: 'M0-44A44 44 0 1 1 0 44A44 44 0 1 1 0-44ZM0-26A26 26 0 1 0 0 26A26 26 0 1 0 0-26Z' },
  { id: 'leaf', label: 'Leaf', d: 'M0-50C30-30 30 30 0 50C-30 30-30-30 0-50Z' },
  { id: 'petal', label: 'Flower', d: flower(5) },
  { id: 'diamond', label: 'Diamond', d: 'M0-50L36 0L0 50L-36 0Z' },
  { id: 'arch', label: 'Arch', d: 'M-36 50L-36-10A36 36 0 0 1 36-10L36 50Z' },
  { id: 'wave', label: 'Wave', d: 'M-50 6C-34-18-16-18 0 6C16 30 34 30 50 6L50 22C34 46 16 46 0 22C-16-2-34-2-50 22Z' },
  { id: 'triangle', label: 'Triangle', d: 'M0-46L44 34L-44 34Z' },
  { id: 'cross', label: 'Cross', d: 'M-12-46H12V-12H46V12H12V46H-12V12H-46V-12H-12Z' },
  { id: 'crescent', label: 'Crescent', d: 'M18-42A46 46 0 1 0 18 42A50 50 0 0 1 18-42Z' },
  { id: 'scallop', label: 'Scallop', d: 'M-50 20A25 25 0 0 1 0 20A25 25 0 0 1 50 20L50 50L-50 50Z' },
  { id: 'petal4', label: 'Quatrefoil', d: 'M0-48A20 20 0 0 1 0-8A20 20 0 0 1 40 0A20 20 0 0 1 0 8A20 20 0 0 1 0 48A20 20 0 0 1 0 8A20 20 0 0 1-40 0A20 20 0 0 1 0-8A20 20 0 0 1 0-48Z' },
  { id: 'line', label: 'Dash', d: 'M-44-7H44V7H-44Z' },
];

export interface PatternSettings {
  motif: string;            // MOTIFS id, or 'text' / 'image'
  text?: string;            // for motif 'text'
  image?: string;           // data URL for motif 'image'
  repeat: RepeatType;
  tile: number;             // tile cell size in px (before the repeat multiplies it)
  scale: number;            // motif size as a share of the cell, 0.1–1.5
  rotation: number;         // degrees
  spacingX: number;         // extra space between columns, share of cell, 0–1
  spacingY: number;
  offset: number;           // shift of alternate rows/cols, 0–1 (brick/half-drop)
  density: number;          // motifs per tile for random/organic, 3–60
  symmetry: number;         // copies for radial/kaleidoscope, 3–16
  seed: number;
  colors: string[];         // motif colours, cycled
  background: string;
  stroke: boolean;
  strokeWidth: number;
  opacity: number;          // 0–1
}

export const DEFAULT_PATTERN: PatternSettings = {
  motif: 'sparkle', repeat: 'half-drop', tile: 120, scale: 0.55, rotation: 0, spacingX: 0, spacingY: 0, offset: 0.5,
  density: 14, symmetry: 8, seed: 7, colors: ['#1E3A5F', '#C9A86A', '#3B82C4'], background: '#F4F1EA', stroke: false, strokeWidth: 3, opacity: 1,
};

export const PALETTES: { name: string; colors: string[]; background: string }[] = [
  { name: 'Navy & sand', colors: ['#1E3A5F', '#C9A86A', '#3B82C4'], background: '#F4F1EA' },
  { name: 'Emerald', colors: ['#0F5F4F', '#5DCCB8', '#E3C77B'], background: '#F2F7F4' },
  { name: 'Terracotta', colors: ['#B5563C', '#E7B07A', '#5A3A2E'], background: '#FBF3EA' },
  { name: 'Blush', colors: ['#D9738E', '#F2B8C6', '#7A3B54'], background: '#FFF6F7' },
  { name: 'Midnight gold', colors: ['#E3B964', '#B08A3E', '#F5E6C2'], background: '#0E1424' },
  { name: 'Spectrum', colors: ['#F2708F', '#35C2F1', '#8CC84B'], background: '#FFFFFF' },
  { name: 'Mono', colors: ['#111111', '#6B6B6B', '#BDBDBD'], background: '#FAFAFA' },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Small seeded random generator so a pattern looks the same every time.
export function rng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Place { x: number; y: number; r: number; s: number; fx: number; fy: number; c: number }

/** Tile size and motif placements for the settings. */
export function layout(p: PatternSettings): { w: number; h: number; places: Place[] } {
  const cell = Math.max(24, p.tile);
  const cw = cell * (1 + p.spacingX);
  const ch = cell * (1 + p.spacingY);
  const base = { r: p.rotation, s: 1, fx: 1, fy: 1 };
  const P = (x: number, y: number, o: Partial<Place> = {}, c = 0): Place => ({ x, y, ...base, c, ...o });
  switch (p.repeat) {
    case 'grid':
      return { w: cw, h: ch, places: [P(cw / 2, ch / 2)] };
    case 'brick': {
      const off = cw * p.offset;
      return { w: cw, h: ch * 2, places: [P(cw / 2, ch / 2, {}, 0), ...wrapX([P(cw / 2 + off, ch * 1.5, {}, 1)], cw)] };
    }
    case 'half-drop': {
      const off = ch * p.offset;
      return { w: cw * 2, h: ch, places: [P(cw / 2, ch / 2, {}, 0), ...wrapY([P(cw * 1.5, ch / 2 + off, {}, 1)], ch)] };
    }
    case 'mirror':
      return { w: cw * 2, h: ch * 2, places: [P(cw / 2, ch / 2, {}, 0), P(cw * 1.5, ch / 2, { fx: -1 }, 1), P(cw / 2, ch * 1.5, { fy: -1 }, 1), P(cw * 1.5, ch * 1.5, { fx: -1, fy: -1 }, 0)] };
    case 'rotational':
      return { w: cw * 2, h: ch * 2, places: [P(cw / 2, ch / 2, { r: p.rotation }, 0), P(cw * 1.5, ch / 2, { r: p.rotation + 90 }, 1), P(cw * 1.5, ch * 1.5, { r: p.rotation + 180 }, 0), P(cw / 2, ch * 1.5, { r: p.rotation + 270 }, 1)] };
    case 'radial':
    case 'kaleidoscope': {
      const n = Math.max(3, Math.min(24, Math.round(p.symmetry)));
      const size = Math.max(cw, ch) * 3;
      const R = size * 0.3;
      const places: Place[] = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const deg = (a * 180) / Math.PI + 90 + p.rotation;
        places.push(P(size / 2 + Math.cos(a) * R, size / 2 + Math.sin(a) * R, { r: deg, fx: p.repeat === 'kaleidoscope' && i % 2 ? -1 : 1 }, i % 2));
      }
      places.push(P(size / 2, size / 2, { s: 0.8 }, 2));
      return { w: size, h: size, places };
    }
    case 'geometric': {
      // Hexagonal lattice: tile is w × w·√3 with motifs on the hex centres.
      const w = cw;
      const h = r2(cw * Math.sqrt(3));
      return { w, h, places: [P(0, 0, {}, 0), P(w, 0, {}, 0), P(0, h, {}, 0), P(w, h, {}, 0), P(w / 2, h / 2, {}, 1)] };
    }
    case 'organic':
    case 'random': {
      const size = Math.max(cw, ch) * 3;
      const rand = rng(p.seed);
      const n = Math.max(3, Math.min(80, Math.round(p.density)));
      const out: Place[] = [];
      // Jittered grid keeps motifs evenly spread (no clumps).
      const k = Math.ceil(Math.sqrt(n));
      const step = size / k;
      for (let i = 0; i < n; i++) {
        const gx = i % k, gy = Math.floor(i / k);
        const x = (gx + 0.2 + rand() * 0.6) * step;
        const y = (gy + 0.2 + rand() * 0.6) * step;
        const organic = p.repeat === 'organic';
        out.push(P(x % size, y % size, { r: p.rotation + (organic ? rand() * 360 : 0), s: organic ? 0.55 + rand() * 0.75 : 1 }, Math.floor(rand() * 3)));
      }
      return { w: size, h: size, places: wrapXY(out, size, size, (step * 0.9)) };
    }
  }
}

function wrapX(ps: Place[], w: number) {
  return ps.flatMap((q) => [q, { ...q, x: q.x - w }, { ...q, x: q.x + w }]);
}
function wrapY(ps: Place[], h: number) {
  return ps.flatMap((q) => [q, { ...q, y: q.y - h }, { ...q, y: q.y + h }]);
}
// Copies of motifs near an edge on the opposite side, so the tile is seamless.
function wrapXY(ps: Place[], w: number, h: number, margin: number) {
  const out: Place[] = [];
  for (const q of ps) {
    const xs = [0, q.x < margin ? w : 0, q.x > w - margin ? -w : 0].filter((v, i) => i === 0 || v !== 0);
    const ys = [0, q.y < margin ? h : 0, q.y > h - margin ? -h : 0].filter((v, i) => i === 0 || v !== 0);
    for (const dx of xs) for (const dy of ys) out.push({ ...q, x: q.x + dx, y: q.y + dy });
  }
  return out;
}

function motifMarkup(p: PatternSettings, color: string): string {
  const fill = p.stroke ? 'none' : color;
  const stroke = p.stroke ? ` stroke="${color}" stroke-width="${r2(p.strokeWidth)}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"` : '';
  if (p.motif === 'text') {
    const t = esc((p.text || 'M').slice(0, 3));
    return `<text x="0" y="0" font-family="Georgia, 'Times New Roman', serif" font-size="80" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="${fill}"${stroke}>${t}</text>`;
  }
  if (p.motif === 'image' && p.image && /^data:image\/(png|jpe?g|webp|svg\+xml);/i.test(p.image)) {
    return `<image href="${p.image}" x="-50" y="-50" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  }
  const m = MOTIFS.find((x) => x.id === p.motif) || MOTIFS[0];
  return `<path d="${m.d}" fill="${fill}" fill-rule="evenodd"${stroke}/>`;
}

/** Seamless tile as an SVG string. */
export function tileSvg(p: PatternSettings, opts: { background?: boolean } = {}): string {
  const { w, h, places: raw } = layout(p);
  const cell = Math.max(24, p.tile);
  const k = (cell * p.scale) / 100;
  // Any motif that crosses an edge also appears on the opposite edge.
  const seen = new Set<string>();
  const places = wrapXY(raw, w, h, cell * p.scale * 0.75 + 1).filter((q) => {
    const key = `${Math.round(q.x)}:${Math.round(q.y)}:${q.c}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const colors = p.colors.length ? p.colors : ['#111'];
  const defs = colors.map((c, i) => `<g id="m${i}">${motifMarkup(p, c)}</g>`).join('');
  const uses = places
    .map((q) => `<use href="#m${q.c % colors.length}" transform="translate(${r2(q.x)} ${r2(q.y)}) rotate(${r2(q.r)}) scale(${r2(k * q.s * q.fx)} ${r2(k * q.s * q.fy)})"/>`)
    .join('');
  const bg = opts.background === false ? '' : `<rect width="${r2(w)}" height="${r2(h)}" fill="${p.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(w)}" height="${r2(h)}" viewBox="0 0 ${r2(w)} ${r2(h)}"><defs>${defs}</defs>${bg}<g opacity="${r2(p.opacity)}">${uses}</g></svg>`;
}

/** A sheet of any size filled with the repeating tile (vector). */
export function sheetSvg(p: PatternSettings, width: number, height: number): string {
  const { w, h } = layout(p);
  const inner = tileSvg(p, { background: false }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="mtp" width="${r2(w)}" height="${r2(h)}" patternUnits="userSpaceOnUse">${inner}</pattern></defs><rect width="${width}" height="${height}" fill="${p.background}"/><rect width="${width}" height="${height}" fill="url(#mtp)"/></svg>`;
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
