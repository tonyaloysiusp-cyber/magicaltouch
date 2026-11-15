// Folding calculator: panel widths, fold positions, folding order, creep
// compensation and the folded size for brochures, leaflets, cards and maps.
//
// Conventions: the flat sheet is W × H mm, seen from the OUTSIDE (the side
// with the front cover). Panels are numbered 1… from the left on the outside.
// Fold positions are measured from the left edge of the outside. Panels that
// tuck inside others are made shorter so they don't buckle: by the paper
// thickness and a working allowance per nesting level (industry practice is
// 1–3 mm; we use max(1 mm, 2 × caliper) per level).

export type FoldType = 'half' | 'tri' | 'z' | 'accordion' | 'gate' | 'double-gate' | 'roll' | 'parallel' | 'cross' | 'map';

export const FOLDS: { id: FoldType; label: string; hint: string; panels: number | 'n'; minPanels?: number }[] = [
  { id: 'half', label: 'Half fold (bi-fold)', hint: 'One fold in the middle: 4 pages', panels: 2 },
  { id: 'tri', label: 'Tri-fold (letter / roll)', hint: 'Two folds rolled inward; the tuck-in panel is shorter', panels: 3 },
  { id: 'z', label: 'Z-fold', hint: 'Two folds in opposite directions, equal panels', panels: 3 },
  { id: 'accordion', label: 'Accordion', hint: 'Zig-zag folds, equal panels', panels: 'n', minPanels: 4 },
  { id: 'gate', label: 'Gate fold', hint: 'Two outer panels fold to meet in the middle', panels: 3 },
  { id: 'double-gate', label: 'Double gate fold', hint: 'Gate fold, then folded again in the middle', panels: 4 },
  { id: 'roll', label: 'Roll fold', hint: 'Panels roll inward one after another; each inner panel shorter', panels: 'n', minPanels: 4 },
  { id: 'parallel', label: 'Double parallel', hint: 'Folded in half, then in half again (parallel)', panels: 4 },
  { id: 'cross', label: 'Cross fold (French)', hint: 'Folded in half, then in half the other way', panels: 2 },
  { id: 'map', label: 'Map fold', hint: 'Accordion across, then folded in half down', panels: 'n', minPanels: 4 },
];

export interface FoldSpec { type: FoldType; w: number; h: number; panels?: number; caliper: number; bleed: number; safe: number; widths?: number[] }
export interface FoldPanel { n: number; x: number; w: number; outside: string; inside: string }
export interface FoldLine { x?: number; y?: number; dir: 'valley' | 'mountain'; order: number; label: string }
export interface FoldResult {
  type: FoldType; flat: { w: number; h: number }; folded: { w: number; h: number; thick: number };
  panels: FoldPanel[]; folds: FoldLine[]; sequence: string[]; notes: string[]; errors: string[]; allowance: number; pages: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function calculateFold(s: FoldSpec): FoldResult {
  const errors: string[] = [], notes: string[] = [];
  const def = FOLDS.find((f) => f.id === s.type)!;
  const n = def.panels === 'n' ? Math.max(def.minPanels || 4, Math.round(s.panels || def.minPanels || 4)) : def.panels;
  const allowance = Math.max(1, 2 * s.caliper);
  const W = s.w, H = s.h;
  let widths: number[] = [];
  const eq = (k: number) => Array.from({ length: k }, () => W / k);
  switch (s.type) {
    case 'half': case 'z': case 'accordion': case 'parallel': case 'cross': case 'map': widths = eq(n); break;
    case 'tri': { // outside: [inside flap (tuck-in) | back | front]; flap shorter by the allowance
      const big = (W + allowance) / 3; widths = [W - 2 * big, big, big]; break;
    }
    case 'gate': { // flaps each quarter minus allowance, centre takes the rest
      const flap = W / 4 - allowance / 2; widths = [flap, W - 2 * flap, flap]; break;
    }
    case 'double-gate': {
      const flap = W / 4 - allowance; const centre = (W - 2 * flap) / 2; widths = [flap, centre, centre, flap]; break;
    }
    case 'roll': { // the innermost panel is the leftmost; each panel towards it loses one allowance more
      const k = n; const loss = (i: number) => (k - 1 - i) * allowance; // panel i from the right: 0 = front (full)
      const base = (W + Array.from({ length: k }, (_, i) => loss(i)).reduce((a, b) => a + b, 0)) / k;
      widths = Array.from({ length: k }, (_, i) => base - loss(i)); // left = innermost = shortest
      break;
    }
  }
  if (s.widths && s.widths.length === widths.length && s.widths.every((v) => v > 0)) {
    const total = s.widths.reduce((a, b) => a + b, 0);
    if (Math.abs(total - W) > 0.5) errors.push(`Custom panel widths add up to ${r1(total)} mm, not the sheet width ${W} mm.`);
    widths = s.widths.slice();
    notes.push('Custom panel widths — check that tucked-in panels are shorter than the panels that close over them.');
  }
  // Panels and folds (vertical folds at the panel joins).
  let x = 0;
  const panels: FoldPanel[] = widths.map((w, i) => { const p = { n: i + 1, x: r1(x), w: r1(w), outside: '', inside: '' }; x += w; return p; });
  const folds: FoldLine[] = [];
  for (let i = 1; i < panels.length; i++) folds.push({ x: panels[i].x, dir: 'valley', order: 0, label: `Fold ${i}` });
  const sequence: string[] = [];
  let folded = { w: Math.max(...widths), h: H };
  const pages = panels.length * 2;
  const name = (side: 'o' | 'i', labels: string[]) => labels.forEach((l, i) => { if (panels[i]) panels[i][side === 'o' ? 'outside' : 'inside'] = l; });

  switch (s.type) {
    case 'half':
      name('o', ['Back', 'Front cover']); name('i', ['Inside left', 'Inside right']);
      folds[0].order = 1; sequence.push('Fold in half with the outside out: the front cover on top.');
      break;
    case 'tri':
      name('o', ['Inside flap (tuck-in)', 'Back', 'Front cover']); name('i', ['Inside 1', 'Inside 2', 'Inside 3']);
      folds[1].order = 1; folds[0].order = 2;
      sequence.push('Lay the sheet inside up.', `Fold the right panel (inside 3) over at ${panels[2].x} mm.`, `Fold the shorter left panel (inside 1) over it at ${panels[1].x} mm — it tucks inside.`);
      notes.push(`The tuck-in panel is ${r1(widths[1] - widths[0])} mm narrower so it closes flat.`);
      break;
    case 'z':
      name('o', ['Front cover', 'Inside 2', 'Back']); name('i', ['Inside 1', 'Inside 3', 'Inside 4']);
      folds[0].dir = 'mountain'; folds[0].order = 1; folds[1].order = 2;
      sequence.push(`Mountain fold at ${panels[1].x} mm.`, `Valley fold at ${panels[2].x} mm — the sheet zig-zags like a Z.`);
      break;
    case 'accordion': case 'map':
      name('o', panels.map((_, i) => (i === 0 ? 'Front cover' : i === panels.length - 1 ? 'Back' : `Panel ${i + 1}`)));
      name('i', panels.map((_, i) => `Inside ${i + 1}`));
      folds.forEach((f, i) => { f.dir = i % 2 ? 'valley' : 'mountain'; f.order = i + 1; });
      sequence.push(...folds.map((f) => `${f.dir === 'mountain' ? 'Mountain' : 'Valley'} fold at ${f.x} mm.`));
      if (s.type === 'map') { folds.push({ y: r1(H / 2), dir: 'valley', order: folds.length + 1, label: 'Cross fold' }); sequence.push(`Then fold the strip in half down at ${r1(H / 2)} mm.`); folded = { w: folded.w, h: H / 2 }; }
      break;
    case 'gate':
      name('o', ['Left gate (outside)', 'Back', 'Right gate (outside)']); name('i', ['Inside left gate', 'Inside centre', 'Inside right gate']);
      folds[0].order = 1; folds[1].order = 2;
      sequence.push('Lay the sheet inside up.', `Fold the left gate in at ${panels[1].x} mm.`, `Fold the right gate in at ${panels[2].x} mm — the gates meet in the middle.`);
      notes.push(`Gates are ${r1(allowance / 2)} mm short of a quarter each so they meet without touching.`);
      folded = { w: widths[1], h: H };
      break;
    case 'double-gate':
      name('o', ['Left gate', 'Back', 'Front cover', 'Right gate']); name('i', ['Inside 1', 'Inside 2', 'Inside 3', 'Inside 4']);
      folds[0].order = 1; folds[2].order = 2; folds[1].order = 3; folds[1].dir = 'mountain';
      sequence.push('Fold both gates in to meet in the middle.', `Then fold the whole piece in half at ${panels[2].x} mm.`);
      folded = { w: widths[1], h: H };
      break;
    case 'roll':
      name('o', panels.map((_, i) => (i === panels.length - 1 ? 'Front cover' : i === panels.length - 2 ? 'Back' : `Inside flap ${i + 1}`)));
      name('i', panels.map((_, i) => `Inside ${i + 1}`));
      for (let i = folds.length - 1, o = 1; i >= 0; i--, o++) folds[i].order = o;
      sequence.push('Lay the sheet inside up.', ...[...folds].sort((a, b) => a.order - b.order).map((f) => `Roll the end over at ${f.x} mm.`));
      notes.push(`Each inner panel is ${r1(allowance)} mm narrower than the one that wraps it.`);
      break;
    case 'parallel':
      name('o', ['Back', 'Inside 2', 'Inside 3', 'Front cover']); name('i', ['Inside 1', 'Inside 4', 'Inside 5', 'Inside 6']);
      folds[1].order = 1; folds[0].order = 2; folds[2].order = 2;
      sequence.push(`Fold in half at ${panels[2].x} mm.`, 'Fold in half again in the same direction.');
      break;
    case 'cross':
      name('o', ['Back', 'Front cover']); name('i', ['Inside left', 'Inside right']);
      folds[0].order = 2; folds.push({ y: r1(H / 2), dir: 'valley', order: 1, label: 'Cross fold' });
      sequence.push(`Fold in half across at ${r1(H / 2)} mm (top to bottom).`, `Then fold in half at ${panels[1].x} mm (right angle to the first fold).`);
      folded = { w: widths[0], h: H / 2 };
      break;
  }
  if (s.type !== 'cross' && s.type !== 'map' && s.type !== 'half') folded = { w: folded.w, h: folded.h };
  if (s.type === 'half') folded = { w: widths[1], h: H };
  if (s.type === 'parallel') folded = { w: widths[0], h: H };
  const layers = s.type === 'cross' ? 4 : s.type === 'map' ? panels.length * 2 : s.type === 'parallel' ? 4 : panels.length;
  const minPanel = Math.min(...widths);
  if (minPanel < 30) errors.push(`The narrowest panel is ${r1(minPanel)} mm — most folding machines need at least 30 mm.`);
  if (s.safe * 2 >= minPanel) errors.push(`The safe margin (${s.safe} mm each side) does not fit the narrowest panel (${r1(minPanel)} mm).`);
  if (s.caliper > 0.25 || (s.caliper > 0.15 && layers > 4)) notes.push('Thick paper: score before folding to stop the fibres cracking.');
  notes.push(`Keep text ${s.safe} mm away from every fold and trim edge; bleed ${s.bleed} mm past the trim on all sides.`);
  return {
    type: s.type, flat: { w: W, h: H }, folded: { w: r1(folded.w), h: r1(folded.h), thick: r1(layers * s.caliper * 100) / 100 },
    panels, folds, sequence, notes, errors, allowance: r1(allowance), pages,
  };
}

/** Technical diagram of the flat sheet: trim, bleed, safe area, folds (valley dashed, mountain dash-dot), panel names. */
export function foldDiagramSvg(r: FoldResult, side: 'outside' | 'inside', bleed: number, safe: number): string {
  const W = r.flat.w, H = r.flat.h, m = 12 + bleed;
  const panels = side === 'outside' ? r.panels : r.panels.slice().reverse().map((p, i, a) => ({ ...p, x: W - p.x - p.w }));
  const t = (x: number, y: number, s: string, size = 4, anchor = 'middle', fill = '#111') => `<text x="${x}" y="${y}" font-family="Helvetica" font-size="${size}" text-anchor="${anchor}" fill="${fill}">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  let g = `<rect x="${-bleed}" y="${-bleed}" width="${W + 2 * bleed}" height="${H + 2 * bleed}" fill="#FDECEC" stroke="#E11D48" stroke-width="0.2"/>`;
  g += `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF" stroke="#111" stroke-width="0.35"/>`;
  for (const p of panels) {
    g += `<rect x="${p.x + safe}" y="${safe}" width="${Math.max(0, p.w - 2 * safe)}" height="${Math.max(0, H - 2 * safe)}" fill="none" stroke="#06B6D4" stroke-width="0.2" stroke-dasharray="1.5 1"/>`;
    g += t(p.x + p.w / 2, H / 2 - 3, side === 'outside' ? p.outside : p.inside, 4.2);
    g += t(p.x + p.w / 2, H / 2 + 4, `${p.w} mm`, 3.4, 'middle', '#475569');
  }
  for (const f of r.folds) {
    const dir = side === 'outside' ? f.dir : f.dir === 'valley' ? 'mountain' : 'valley';
    const dash = dir === 'valley' ? '3 1.5' : '3 1 0.6 1';
    if (f.x != null) { const x = side === 'outside' ? f.x : W - f.x; g += `<line x1="${x}" y1="${-bleed - 6}" x2="${x}" y2="${H + bleed + 6}" stroke="#2563EB" stroke-width="0.35" stroke-dasharray="${dash}"/>` + t(x, -bleed - 8, `${f.label} · ${dir} · step ${f.order} · ${side === 'outside' ? f.x : r1(W - f.x)} mm`, 2.8, 'middle', '#2563EB'); }
    if (f.y != null) g += `<line x1="${-bleed - 6}" y1="${f.y}" x2="${W + bleed + 6}" y2="${f.y}" stroke="#2563EB" stroke-width="0.35" stroke-dasharray="${dash}"/>` + t(-bleed - 7, f.y - 1, `${f.label} · ${dir} · step ${f.order}`, 2.8, 'end', '#2563EB');
  }
  // Crop marks outside the bleed.
  const cm = (x: number, y: number, dx: number, dy: number) => `<path d="M${x + dx * (bleed + 2)} ${y}h${dx * 5}M${x} ${y + dy * (bleed + 2)}v${dy * 5}" stroke="#000" stroke-width="0.2"/>`;
  g += cm(0, 0, -1, -1) + cm(W, 0, 1, -1) + cm(0, H, -1, 1) + cm(W, H, 1, 1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-m - 30} ${-m - 14} ${W + 2 * m + 60} ${H + 2 * m + 28}" width="${W + 2 * m + 60}mm" height="${H + 2 * m + 28}mm">${g}${t(W / 2, H + bleed + 12, `${side === 'outside' ? 'Outside' : 'Inside'} — flat ${W} × ${H} mm · trim black · bleed red · safe area cyan · valley - - - · mountain -·-`, 3, 'middle', '#475569')}</svg>`;
}

export interface PdfInspect { pages: number; sizes: { w: number; h: number; trim?: { w: number; h: number }; bleed?: number }[]; orientation: string; issues: string[]; ok: boolean }
/** Checks an uploaded PDF against a folding layout: page count, size (with or without bleed), orientation. */
export function checkPdfForFold(pdf: { pages: { w: number; h: number; trim?: { w: number; h: number } }[] }, r: FoldResult, bleed: number): PdfInspect {
  const issues: string[] = [];
  const sizes = pdf.pages.map((p) => ({ ...p, bleed: p.trim ? r1(((p.w - p.trim.w) + (p.h - p.trim.h)) / 4) : undefined }));
  const first = sizes[0];
  if (!first) return { pages: 0, sizes, orientation: '—', issues: ['The PDF has no pages.'], ok: false };
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  const fits = (p: { w: number; h: number; trim?: { w: number; h: number } }) => {
    const tw = p.trim?.w ?? p.w, th = p.trim?.h ?? p.h;
    return (near(tw, r.flat.w) && near(th, r.flat.h)) || (near(p.w, r.flat.w + 2 * bleed) && near(p.h, r.flat.h + 2 * bleed));
  };
  const turned = (p: { w: number; h: number }) => near(p.w, r.flat.h) && near(p.h, r.flat.w);
  if (pdf.pages.length !== 2) issues.push(`A folded leaflet is printed as 2 flat pages (outside and inside); this PDF has ${pdf.pages.length}.${pdf.pages.length === r.pages ? ' It looks like single panel pages — they must be imposed onto the flat sheet first (Print Layout can do this).' : ''}`);
  sizes.forEach((p, i) => {
    if (!fits(p)) issues.push(`Page ${i + 1} is ${r1(p.w)} × ${r1(p.h)} mm${p.trim ? ` (trim ${r1(p.trim.w)} × ${r1(p.trim.h)})` : ''}; the flat sheet is ${r.flat.w} × ${r.flat.h} mm${bleed ? ` (${r.flat.w + 2 * bleed} × ${r.flat.h + 2 * bleed} with bleed)` : ''}.${turned(p) ? ' The page is turned 90°.' : ''}`);
    if (fits(p) && !p.trim && near(p.w, r.flat.w)) issues.push(`Page ${i + 1} has no bleed (no TrimBox and page = trim size).`);
  });
  return { pages: pdf.pages.length, sizes, orientation: first.w >= first.h ? 'landscape' : 'portrait', issues, ok: !issues.some((s) => !/no bleed/.test(s)) };
}
