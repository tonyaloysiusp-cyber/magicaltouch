// Print size & binding calculations: spine width, cover spread, hardcover
// case, saddle-stitch creep. Pure functions (no DOM) so they are unit-tested.
//
// Thickness: a spine depends on the paper's CALIPER (thickness per sheet),
// not on its weight alone — two 115 gsm papers can differ by 40 %. Enter the
// caliper from the paper's data sheet (or your printer) for an exact answer.
// Without it, a caliper is ESTIMATED from the weight and a bulk profile for
// that kind of paper, and every result says so. Board thicknesses, hinge
// and turn-in sizes are editable defaults, listed in `assumptions`.

export type Binding = 'perfect' | 'saddle' | 'hardcover';
export type Sides = 'double' | 'single';

/** Typical bulk (µm of thickness per gsm) by paper family. Mills vary; these
 *  are starting points to replace with the real caliper. */
export const PAPER_PROFILES: { id: string; label: string; bulk: number; note: string }[] = [
  { id: 'uncoated', label: 'Uncoated (offset / bond)', bulk: 1.25, note: 'e.g. 80 gsm ≈ 100 µm' },
  { id: 'bookwove', label: 'Bulky book paper (bookwove / cream)', bulk: 1.6, note: 'high-bulk novels' },
  { id: 'matt', label: 'Matt / silk coated', bulk: 0.95, note: 'e.g. 130 gsm ≈ 124 µm' },
  { id: 'gloss', label: 'Gloss coated', bulk: 0.85, note: 'e.g. 130 gsm ≈ 110 µm' },
  { id: 'board', label: 'Cover board (SBS / folding box board)', bulk: 1.3, note: 'e.g. 300 gsm ≈ 390 µm' },
];

export interface BookSpec {
  trimW: number; trimH: number; // finished page size, mm
  pages: number; // interior pages (page sides), not counting a separate cover
  sides: Sides;
  paperGsm: number; paperProfile: string; paperCaliperUm?: number | null;
  coverGsm: number; coverProfile: string; coverCaliperUm?: number | null;
  coverMaterial?: string; finish?: 'gloss' | 'matt' | 'silk' | 'uncoated';
  binding: Binding;
  bleed?: number; safe?: number;
  /** Extra leaves bound in (maps, tipped-in plates) and their caliper. */
  insertLeaves?: number; insertCaliperUm?: number | null;
  // Perfect binding
  hingeScore?: number; glueAllowance?: number;
  // Saddle stitch
  selfCover?: boolean;
  // Hardcover (case binding)
  boardMm?: number; squareMm?: number; jointMm?: number; turnInMm?: number;
  endpaperGsm?: number; endpaperCaliperUm?: number | null;
}

export interface Panel { name: string; x: number; w: number; kind: 'back' | 'spine' | 'front' | 'turn-in' | 'joint' | 'board' }
export interface Fold { x: number; kind: 'spine' | 'hinge' | 'joint' | 'board' | 'turn-in'; label: string }
export interface CoverLayout {
  /** Flat size of the printed cover / case wrap, including bleed. */
  widthMm: number; heightMm: number;
  /** Trim box inside it (for a hardcover wrap the whole sheet, no bleed). */
  trim: { x: number; y: number; w: number; h: number };
  bleed: number; safe: number;
  panels: Panel[]; folds: Fold[];
}
export interface BookResult {
  pagesUsed: number; blanksAdded: number;
  leaves: number; sheets?: number;
  textCaliperUm: number; coverCaliperUm: number;
  caliperSource: { text: 'entered' | 'estimated'; cover: 'entered' | 'estimated' };
  blockMm: number; spineMm: number;
  cover: CoverLayout;
  creep?: { totalMm: number; shiftsMm: number[] };
  hardcover?: { boardW: number; boardH: number; spineBoardW: number; endpaper: { w: number; h: number; count: number } };
  assumptions: string[]; warnings: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
export function estimateCaliper(gsm: number, profileId: string): number {
  const p = PAPER_PROFILES.find((x) => x.id === profileId) || PAPER_PROFILES[0];
  return Math.round(gsm * p.bulk);
}

export function calculateBook(s: BookSpec): BookResult {
  const bleed = s.bleed ?? 3, safe = s.safe ?? 5;
  const warnings: string[] = [], assumptions: string[] = [];
  const W = Math.max(1, s.trimW), H = Math.max(1, s.trimH);
  const textEntered = !!(s.paperCaliperUm && s.paperCaliperUm > 0);
  const coverEntered = !!(s.coverCaliperUm && s.coverCaliperUm > 0);
  const tc = textEntered ? s.paperCaliperUm! : estimateCaliper(s.paperGsm, s.paperProfile);
  const cc = coverEntered ? s.coverCaliperUm! : estimateCaliper(s.coverGsm, s.coverProfile);
  if (!textEntered) assumptions.push(`Text paper caliper estimated at ${tc} µm from ${s.paperGsm} gsm (${PAPER_PROFILES.find((p) => p.id === s.paperProfile)?.label || 'paper'}). Enter the caliper from the paper data sheet for an exact spine.`);
  if (!coverEntered) assumptions.push(`Cover caliper estimated at ${cc} µm from ${s.coverGsm} gsm.`);

  // Page count → leaves / sheets, adding blank pages where the binding needs them.
  let pages = Math.max(1, Math.round(s.pages));
  const step = s.binding === 'saddle' ? 4 : s.sides === 'double' ? 2 : 1;
  if (s.binding === 'saddle' && s.sides === 'single') warnings.push('Saddle stitching folds sheets printed on both sides — single-sided pages are counted with a blank back.');
  const unit = s.binding === 'saddle' ? 4 : step;
  const effPages = s.binding === 'saddle' && s.sides === 'single' ? pages * 2 : pages;
  const used = Math.ceil(effPages / unit) * unit;
  const blanks = used - effPages;
  if (blanks) warnings.push(`${blanks} blank page${blanks === 1 ? '' : 's'} added — ${s.binding === 'saddle' ? 'saddle stitching needs a multiple of 4 pages' : 'each leaf has two sides'}.`);
  pages = used;
  const leaves = s.binding === 'saddle' ? used / 2 : s.sides === 'double' ? used / 2 : used;
  const insertLeaves = Math.max(0, s.insertLeaves || 0);
  const insertUm = insertLeaves ? (s.insertCaliperUm && s.insertCaliperUm > 0 ? s.insertCaliperUm : tc) : 0;
  if (insertLeaves && !(s.insertCaliperUm && s.insertCaliperUm > 0)) assumptions.push('Inserts use the text paper caliper.');

  let blockMm = (leaves * tc + insertLeaves * insertUm) / 1000;
  let spineMm = blockMm;
  const out: BookResult = { pagesUsed: pages, blanksAdded: blanks, leaves, textCaliperUm: tc, coverCaliperUm: cc, caliperSource: { text: textEntered ? 'entered' : 'estimated', cover: coverEntered ? 'entered' : 'estimated' }, blockMm: 0, spineMm: 0, cover: null as any, assumptions, warnings };

  if (s.binding === 'perfect') {
    const glue = Math.max(0, s.glueAllowance ?? 0);
    spineMm = blockMm + glue;
    if (glue) assumptions.push(`Glue / spine allowance ${glue} mm added.`);
    const hinge = Math.max(0, s.hingeScore ?? 6);
    assumptions.push(`Hinge scores ${hinge} mm from each side of the spine (ask your printer for their value).`);
    if (spineMm < 3) warnings.push('Very thin spine — many printers set a minimum for perfect binding, and spine text is not advised. Check with your printer or consider saddle stitching.');
    if (spineMm < 6) warnings.push('Spine text is usually only advised on wider spines; keep it centred and small if you add it.');
    const x0 = bleed;
    out.cover = {
      widthMm: r2(2 * W + spineMm + 2 * bleed), heightMm: r2(H + 2 * bleed), bleed, safe,
      trim: { x: bleed, y: bleed, w: r2(2 * W + spineMm), h: H },
      panels: [{ name: 'Back cover', x: x0, w: W, kind: 'back' }, { name: 'Spine', x: r2(x0 + W), w: r2(spineMm), kind: 'spine' }, { name: 'Front cover', x: r2(x0 + W + spineMm), w: W, kind: 'front' }],
      folds: ([
        { x: r2(x0 + W - hinge), kind: 'hinge', label: 'Hinge score' },
        { x: r2(x0 + W), kind: 'spine', label: 'Spine fold' },
        { x: r2(x0 + W + spineMm), kind: 'spine', label: 'Spine fold' },
        { x: r2(x0 + W + spineMm + hinge), kind: 'hinge', label: 'Hinge score' },
      ] as Fold[]).filter((f) => hinge > 0 || f.kind === 'spine'),
    };
  } else if (s.binding === 'saddle') {
    const self = s.selfCover !== false;
    const textSheets = used / 4;
    const sheets = textSheets + (self ? 0 : 1);
    out.sheets = sheets;
    // Folded thickness at the spine: every sheet doubles over.
    blockMm = (textSheets * 2 * tc + (self ? 0 : 2 * cc)) / 1000;
    spineMm = blockMm;
    // Creep: each sheet sits outside the ones within it, so inner pages push
    // out at the fore-edge by the thickness of the sheets around them.
    const shifts: number[] = [];
    let acc = self ? 0 : cc / 1000;
    for (let i = 0; i < textSheets; i++) { shifts.push(r2(acc)); acc += tc / 1000; }
    out.creep = { totalMm: shifts[shifts.length - 1] || 0, shiftsMm: shifts };
    assumptions.push('Creep is approximate (sheet thickness only); confirm on a folded dummy before a long run.');
    if (spineMm > 5 || sheets > 20) warnings.push('This is thick for saddle stitching: it may not lie flat and creep becomes large. Check your printer’s maximum, or use perfect binding.');
    const x0 = bleed;
    out.cover = {
      widthMm: r2(2 * W + 2 * bleed), heightMm: r2(H + 2 * bleed), bleed, safe,
      trim: { x: bleed, y: bleed, w: 2 * W, h: H },
      panels: [{ name: self ? 'Back page' : 'Back cover', x: x0, w: W, kind: 'back' }, { name: self ? 'Front page' : 'Front cover', x: x0 + W, w: W, kind: 'front' }],
      folds: [{ x: x0 + W, kind: 'spine', label: 'Centre fold (staples)' }],
    };
  } else {
    // Hardcover / case binding.
    const board = s.boardMm ?? 2.5, square = s.squareMm ?? 3, joint = s.jointMm ?? 7, turn = s.turnInMm ?? 15;
    const epUm = s.endpaperCaliperUm && s.endpaperCaliperUm > 0 ? s.endpaperCaliperUm : estimateCaliper(s.endpaperGsm ?? 140, 'uncoated');
    assumptions.push(`Board ${board} mm, squares ${square} mm, joint (hinge gap) ${joint} mm, turn-in ${turn} mm — editable; confirm with your binder.`);
    if (!(s.endpaperCaliperUm && s.endpaperCaliperUm > 0)) assumptions.push(`Endpaper caliper estimated at ${epUm} µm from ${s.endpaperGsm ?? 140} gsm uncoated.`);
    // The free leaf of each endpaper adds to the book block.
    blockMm = (leaves * tc + insertLeaves * insertUm + 2 * epUm) / 1000;
    const spineBoardW = blockMm + 2 * board;
    spineMm = spineBoardW;
    const boardW = W + square; // the board starts at the joint and overhangs the fore-edge by the square
    const boardH = H + 2 * square;
    const caseW = 2 * turn + 2 * boardW + 2 * joint + spineBoardW;
    const caseH = boardH + 2 * turn;
    out.hardcover = { boardW: r2(boardW), boardH: r2(boardH), spineBoardW: r2(spineBoardW), endpaper: { w: 2 * W, h: H, count: 2 } };
    let x = 0;
    const panels: Panel[] = [];
    const add = (name: string, w: number, kind: Panel['kind']) => { panels.push({ name, x: r2(x), w: r2(w), kind }); x += w; };
    add('Turn-in', turn, 'turn-in'); add('Back board', boardW, 'back'); add('Joint', joint, 'joint'); add('Spine', spineBoardW, 'spine'); add('Joint', joint, 'joint'); add('Front board', boardW, 'front'); add('Turn-in', turn, 'turn-in');
    const folds: Fold[] = [];
    panels.forEach((p, i) => {
      if (!i) return;
      const k = [panels[i - 1].kind, p.kind];
      if (k.includes('turn-in')) folds.push({ x: p.x, kind: 'turn-in', label: 'Board edge (turn-in)' });
      else if (k.includes('spine')) folds.push({ x: p.x, kind: 'joint', label: 'Spine board edge' });
      else folds.push({ x: p.x, kind: 'board', label: 'Board edge (joint)' });
    });
    out.cover = { widthMm: r2(caseW), heightMm: r2(caseH), bleed: 0, safe, trim: { x: 0, y: 0, w: r2(caseW), h: r2(caseH) }, panels, folds };
    if (blockMm < 5) warnings.push('A very thin book block for case binding — check your binder’s minimum.');
  }
  out.blockMm = r2(blockMm);
  out.spineMm = r2(spineMm);
  return out;
}

// ------------------------------------------------------------------ outputs

const PANEL_FILL: Record<Panel['kind'], string> = { back: '#E8F1FB', front: '#E8F1FB', spine: '#FDECC8', 'turn-in': '#F1E8FB', joint: '#FBE8EE', board: '#E8F1FB' };

/** Cover / case template as SVG in millimetres. `slug` adds room outside for crop marks and notes. */
export function coverTemplateSvg(r: BookResult, o: { slug?: number; labels?: boolean } = {}): string {
  const c = r.cover, slug = o.slug ?? 12, labels = o.labels !== false;
  const W = c.widthMm + 2 * slug, H = c.heightMm + 2 * slug;
  const t = c.trim;
  const parts: string[] = [];
  parts.push(`<rect x="${slug}" y="${slug}" width="${c.widthMm}" height="${c.heightMm}" fill="#ffffff" stroke="none"/>`);
  for (const p of c.panels) {
    parts.push(`<rect x="${slug + p.x}" y="${slug + t.y}" width="${p.w}" height="${t.h}" fill="${PANEL_FILL[p.kind]}"/>`);
    if (labels && p.w > 4) {
      const cx = slug + p.x + p.w / 2, cy = slug + t.y + t.h / 2;
      const fs = Math.min(8, Math.max(2.2, p.w / 8));
      const rot = p.w < 25 ? ` transform="rotate(-90 ${r2(cx)} ${r2(cy)})"` : '';
      parts.push(`<text x="${r2(cx)}" y="${r2(cy)}" font-family="Helvetica, Arial, sans-serif" font-size="${r2(fs)}" text-anchor="middle" dominant-baseline="middle" fill="#334155"${rot}>${p.name} · ${r2(p.w)} mm</text>`);
    }
  }
  // Bleed (outside the trim) and safe area (inside each panel that carries artwork).
  if (c.bleed) parts.push(`<rect x="${slug}" y="${slug}" width="${c.widthMm}" height="${c.heightMm}" fill="none" stroke="#EF4444" stroke-width="0.25" stroke-dasharray="1.5 1"/>`);
  parts.push(`<rect x="${slug + t.x}" y="${slug + t.y}" width="${t.w}" height="${t.h}" fill="none" stroke="#0F172A" stroke-width="0.3"/>`);
  for (const p of c.panels) if (p.kind === 'back' || p.kind === 'front' || p.kind === 'spine') {
    const inset = p.kind === 'spine' ? Math.min(c.safe / 2, p.w / 4) : c.safe;
    const y0 = c.bleed ? t.y : t.y + (r.hardcover ? (c.heightMm - r.hardcover.boardH) / 2 : 0);
    const hh = r.hardcover ? r.hardcover.boardH : t.h;
    parts.push(`<rect x="${r2(slug + p.x + inset)}" y="${r2(slug + y0 + c.safe)}" width="${r2(Math.max(0, p.w - 2 * inset))}" height="${r2(Math.max(0, hh - 2 * c.safe))}" fill="none" stroke="#10B981" stroke-width="0.25" stroke-dasharray="2 1"/>`);
  }
  if (r.hardcover) {
    const ty = (c.heightMm - r.hardcover.boardH) / 2;
    parts.push(`<line x1="${slug}" y1="${slug + ty}" x2="${slug + c.widthMm}" y2="${slug + ty}" stroke="#7C3AED" stroke-width="0.25" stroke-dasharray="3 1.5"/><line x1="${slug}" y1="${r2(slug + c.heightMm - ty)}" x2="${slug + c.widthMm}" y2="${r2(slug + c.heightMm - ty)}" stroke="#7C3AED" stroke-width="0.25" stroke-dasharray="3 1.5"/>`);
  }
  // Folds and scores, carried into the slug so they can be seen after trimming.
  for (const f of c.folds) {
    const x = r2(slug + f.x);
    const col = f.kind === 'hinge' ? '#2563EB' : f.kind === 'spine' ? '#0F172A' : '#7C3AED';
    parts.push(`<line x1="${x}" y1="${slug - 6}" x2="${x}" y2="${r2(slug + c.heightMm + 6)}" stroke="${col}" stroke-width="0.25" stroke-dasharray="${f.kind === 'hinge' ? '0.8 0.8' : '3 1.5'}"/>`);
  }
  // Crop marks at the trim corners (outside the bleed).
  const cm = (x: number, y: number, dx: number, dy: number) => `<path d="M${r2(x + dx * (c.bleed + 1))} ${r2(y)}h${dx * 5}M${r2(x)} ${r2(y + dy * (c.bleed + 1))}v${dy * 5}" stroke="#000" stroke-width="0.25" fill="none"/>`;
  const L = slug + t.x, T = slug + t.y, R = L + t.w, B = T + t.h;
  parts.push(cm(L, T, -1, -1), cm(R, T, 1, -1), cm(L, B, -1, 1), cm(R, B, 1, 1));
  if (labels) parts.push(`<text x="${slug}" y="${slug - 3}" font-family="Helvetica, Arial, sans-serif" font-size="3" fill="#475569">${c.widthMm} × ${c.heightMm} mm${c.bleed ? ` incl. ${c.bleed} mm bleed` : ''} · spine ${r.spineMm} mm · red = bleed, black = trim, green = safe area, dashed = folds / scores</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(W)}mm" height="${r2(H)}mm" viewBox="0 0 ${r2(W)} ${r2(H)}">${parts.join('')}</svg>`;
}

const BIND_LABEL: Record<Binding, string> = { perfect: 'Perfect binding (glued spine)', saddle: 'Saddle stitch (stapled)', hardcover: 'Hardcover (case binding)' };
export function specText(s: BookSpec, r: BookResult): string {
  const L: string[] = [];
  L.push('PRINT SPECIFICATION — Magical Touch Design', '');
  L.push(`Binding: ${BIND_LABEL[s.binding]}`);
  L.push(`Finished size: ${s.trimW} × ${s.trimH} mm`);
  L.push(`Pages: ${r.pagesUsed}${r.blanksAdded ? ` (${r.blanksAdded} blank added)` : ''}, ${s.sides === 'double' ? 'double' : 'single'}-sided · ${r.leaves} leaves${r.sheets ? ` · ${r.sheets} folded sheets` : ''}`);
  L.push(`Text paper: ${s.paperGsm} gsm ${PAPER_PROFILES.find((p) => p.id === s.paperProfile)?.label || ''}${s.finish ? `, ${s.finish}` : ''} — caliper ${r.textCaliperUm} µm (${r.caliperSource.text})`);
  L.push(`Cover: ${s.coverGsm} gsm ${s.coverMaterial || ''} — caliper ${r.coverCaliperUm} µm (${r.caliperSource.cover})`);
  if (s.insertLeaves) L.push(`Inserts: ${s.insertLeaves} leaves`);
  L.push('', `Book block: ${r.blockMm} mm`, `Spine: ${r.spineMm} mm`);
  L.push(`Cover flat size: ${r.cover.widthMm} × ${r.cover.heightMm} mm${r.cover.bleed ? ` (incl. ${r.cover.bleed} mm bleed each side)` : ''}`);
  L.push('Panels (from the left edge):');
  r.cover.panels.forEach((p) => L.push(`  ${p.name.padEnd(12)} x ${String(p.x).padStart(7)} mm   width ${p.w} mm`));
  L.push('Folds / scores (from the left edge):');
  r.cover.folds.forEach((f) => L.push(`  ${f.label.padEnd(22)} ${f.x} mm`));
  if (r.hardcover) {
    L.push('', `Boards: ${r.hardcover.boardW} × ${r.hardcover.boardH} mm (×2) · spine board ${r.hardcover.spineBoardW} mm`);
    L.push(`Endpapers: ${r.hardcover.endpaper.count} × ${r.hardcover.endpaper.w} × ${r.hardcover.endpaper.h} mm (folded)`);
  }
  if (r.creep) { L.push('', `Creep (saddle stitch): innermost sheet ${r.creep.totalMm} mm`); r.creep.shiftsMm.forEach((v, i) => L.push(`  Sheet ${i + 1} (outer = 1): shift pages ${v} mm toward the spine`)); }
  if (r.assumptions.length) { L.push('', 'Assumptions:'); r.assumptions.forEach((a) => L.push(`  • ${a}`)); }
  if (r.warnings.length) { L.push('', 'Check:'); r.warnings.forEach((a) => L.push(`  • ${a}`)); }
  L.push('', 'Confirm caliper, spine and cover size with your printer before printing.');
  return L.join('\n');
}

/** Opens the cover in the design editor at its trim size with bleed, safe area and fold guides. */
export function coverEditorUrl(r: BookResult, dpi = 300): string {
  const px = (mm: number) => String(Math.round((mm / 25.4) * 96 * 1000) / 1000);
  const c = r.cover;
  const q = new URLSearchParams({ w: px(c.trim.w), h: px(c.trim.h), dpi: String(dpi), bg: 'white' });
  for (const k of ['T', 'R', 'B', 'L']) { q.set(`bleed${k}`, px(c.bleed)); q.set(`safe${k}`, px(c.safe)); }
  q.set('guidesV', c.folds.map((f) => px(f.x - c.trim.x)).join(','));
  if (r.hardcover) { const ty = (c.heightMm - r.hardcover.boardH) / 2; q.set('guidesH', [px(ty), px(c.heightMm - ty)].join(',')); }
  q.set('newTab', `cover-${Math.round(c.trim.w)}x${Math.round(c.trim.h)}-${Date.now().toString(36)}`);
  return `/editor?${q.toString()}`;
}
