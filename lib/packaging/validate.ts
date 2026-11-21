// Structure check: does this box close, and will the board fold? Each check
// compares a value against the geometry it has to fit (the flaps that meet,
// the panel a tuck slides into, the wall a corner flap is glued to) or a
// stated rule of thumb. Geometry checks are exact; rules of thumb say so.

import type { DieOptions } from './dieline.ts';
import type { BoardFamily } from './board.ts';

export type Level = 'ok' | 'warn' | 'error';
export interface Check { id: string; level: Level; title: string; detail: string; fix?: Partial<DieOptions>; rule: 'geometry' | 'rule of thumb' }
export interface StructureReport { level: Level; checks: Check[]; closes: boolean }

const f = (n: number) => String(Math.round(n * 10) / 10);
const worst = (cs: Check[]): Level => cs.some((c) => c.level === 'error') ? 'error' : cs.some((c) => c.level === 'warn') ? 'warn' : 'ok';

export function checkStructure(o: DieOptions, family: BoardFamily): StructureReport {
  const cs: Check[] = [], t = o.t;
  const add = (c: Check) => cs.push(c);
  const corr = family === 'corrugated';

  if (o.L <= 0 || o.W <= 0 || o.D <= 0 || t <= 0) {
    add({ id: 'size', level: 'error', title: 'Size', detail: 'Length, width, depth and board thickness must all be above zero.', rule: 'geometry' });
    return { level: 'error', checks: cs, closes: false };
  }

  // Smallest panel the board can fold around: a crease needs room either side.
  const minPanel = Math.max(corr ? 3 * t : 8 * t, corr ? 20 : 8);
  const smallest = Math.min(o.L, o.W, o.style === 'sleeve' ? Infinity : o.D);
  add(smallest < minPanel
    ? { id: 'panel', level: smallest < minPanel / 2 ? 'error' : 'warn', title: 'Panel size vs board', detail: `Smallest panel ${f(smallest)} mm. With ${f(t)} mm board panels under about ${f(minPanel)} mm fold badly or spring open.`, rule: 'rule of thumb' }
    : { id: 'panel', level: 'ok', title: 'Panel size vs board', detail: `Smallest panel ${f(smallest)} mm is fine for ${f(t)} mm board.`, rule: 'rule of thumb' });

  // Board family vs box size.
  const girth = o.L + o.W + o.D;
  if (!corr && family !== 'rigid' && girth > 600) add({ id: 'board', level: 'warn', title: 'Board for this size', detail: `L+W+D is ${f(girth)} mm. Carton board this large is weak; corrugated is usually used.`, rule: 'rule of thumb' });
  else if (corr && Math.min(o.L, o.W) < 6 * t) add({ id: 'board', level: 'warn', title: 'Board for this size', detail: `Flute ${f(t)} mm is thick for a ${f(Math.min(o.L, o.W))} mm panel; a finer flute or carton board folds cleaner.`, rule: 'rule of thumb' });
  else add({ id: 'board', level: 'ok', title: 'Board for this size', detail: 'Board type suits the box size.', rule: 'rule of thumb' });

  const Lp = o.L + t, Wp = o.W + t, Dp = o.D + 2 * t;
  if (o.style === 'rte' || o.style === 'ste') {
    const td = Math.max(8, o.tuck);
    // The tuck slides down inside the front (or back) panel: it must fit within the panel depth.
    if (td >= Dp - 2) add({ id: 'tuck', level: 'error', title: 'Tuck flap closes', detail: `Tuck ${f(td)} mm is as deep as the box (${f(Dp)} mm). It cannot slide in.`, fix: { tuck: Math.max(10, Math.round(Dp * 0.3)) }, rule: 'geometry' });
    else if (td > Dp * 0.5) add({ id: 'tuck', level: 'warn', title: 'Tuck flap closes', detail: `Tuck ${f(td)} mm is over half the depth; it will be hard to insert and may hit the product.`, fix: { tuck: Math.max(10, Math.round(Dp * 0.3)) }, rule: 'rule of thumb' });
    else if (td < 12) add({ id: 'tuck', level: 'warn', title: 'Tuck flap holds', detail: `Tuck ${f(td)} mm is short; under about 12 mm the lid pops open (little friction).`, fix: { tuck: Math.min(Math.round(Dp * 0.4), 15) }, rule: 'rule of thumb' });
    else add({ id: 'tuck', level: 'ok', title: 'Tuck flap closes', detail: `Tuck ${f(td)} mm fits the ${f(Dp)} mm panel and holds by friction.`, rule: 'geometry' });
    // Tuck flap must reach across the closure; the closure panel is the box width.
    if (td > Wp * 1.5 && Wp < 25) add({ id: 'tuckw', level: 'warn', title: 'Tuck vs box width', detail: `Narrow box (${f(Wp)} mm): a ${f(td)} mm tuck is long for the opening.`, rule: 'rule of thumb' });
    // Dust flaps: two flaps meet under the lid across the length.
    const want = Wp * 0.85, max = Lp / 2 - 1;
    add(want > max
      ? { id: 'dust', level: 'warn', title: 'Dust flaps', detail: `The box is wider than half its length, so dust flaps are shortened to ${f(max)} mm to stop them overlapping (wanted ${f(want)} mm). Closure still works.`, rule: 'geometry' }
      : { id: 'dust', level: 'ok', title: 'Dust flaps', detail: `Dust flaps ${f(want)} mm clear each other (${f(Lp - 2 * want)} mm gap).`, rule: 'geometry' });
  }
  if (o.style === 'seal') {
    const major = Math.max(10, Wp - 2), minor = Math.max(8, Wp * 0.45);
    add(2 * minor > Lp
      ? { id: 'dust', level: 'error', title: 'Dust flaps', detail: `Dust flaps (${f(minor)} mm each) overlap across the ${f(Lp)} mm length.`, rule: 'geometry' }
      : { id: 'dust', level: 'ok', title: 'Dust flaps', detail: `Dust flaps ${f(minor)} mm clear each other.`, rule: 'geometry' });
    add({ id: 'major', level: 'ok', title: 'Major flaps overlap', detail: `Major flaps overlap ${f(2 * major - Wp)} mm for gluing.`, rule: 'geometry' });
  }
  if (o.style === 'tray' || o.style === 'traylid') {
    // Corner flaps (depth − 1) from both long walls are glued onto each end wall of width W.
    const W = o.W + 2 * t, cf = Math.max(4, o.D - 1);
    add(2 * cf > W
      ? { id: 'corner', level: 'error', title: 'Corner flaps fit the end wall', detail: `Two corner flaps of ${f(cf)} mm overlap on the ${f(W)} mm end wall. Lower the depth to under ${f(W / 2 + 1)} mm or widen the tray.`, fix: { D: Math.floor(W / 2) }, rule: 'geometry' }
      : { id: 'corner', level: 'ok', title: 'Corner flaps fit the end wall', detail: `Corner flaps ${f(cf)} mm sit side by side on the ${f(W)} mm end wall.`, rule: 'geometry' });
    if (o.style === 'traylid') {
      const lD = Math.max(10, Math.min(o.lidDepth, o.D));
      const lW = o.W + 4 * t + 1, lcf = Math.max(4, lD - 1);
      if (2 * lcf > lW) add({ id: 'lid', level: 'error', title: 'Lid corner flaps', detail: `Lid corner flaps (${f(lcf)} mm) overlap on the ${f(lW)} mm lid end wall.`, fix: { lidDepth: Math.floor(lW / 2) }, rule: 'geometry' });
      else add({ id: 'lid', level: o.lidDepth > o.D ? 'warn' : 'ok', title: 'Lid fits over tray', detail: o.lidDepth > o.D ? `Lid depth is capped at the tray depth (${f(o.D)} mm).` : `Lid ${f(lD)} mm deep with 1 mm play over the tray.`, rule: 'geometry' });
    }
  }
  if (o.style === 'rsc' || o.style === 'hsc') {
    add(o.L < o.W
      ? { id: 'lw', level: 'warn', title: 'Length and width', detail: 'FEFCO sizes are given length ≥ width. Swap them so the flaps on the long panels meet.', fix: { L: o.W, W: o.L }, rule: 'rule of thumb' }
      : { id: 'lw', level: 'ok', title: 'Flaps meet', detail: `Outer flaps ${f((o.W + 2 * t) / 2 + t)} mm meet in the middle.`, rule: 'geometry' });
  }

  // Glue flap: needs enough width for the glue line, and must fit on the panel it is glued to.
  if (o.style !== 'tray' && o.style !== 'traylid') {
    const g = (o.style === 'rsc' || o.style === 'hsc') ? Math.max(o.glue, 25) : o.glue;
    const minG = corr ? 25 : 10, target = (o.style === 'rsc' || o.style === 'hsc') ? o.W + 2 * t : Lp; // slotted: joint glued to the last side panel
    if (g >= target) add({ id: 'glue', level: 'error', title: 'Glue flap', detail: `Glue flap ${f(g)} mm is wider than the panel it is glued to (${f(target)} mm).`, fix: { glue: Math.round(target * 0.3) }, rule: 'geometry' });
    else if (g < minG) add({ id: 'glue', level: 'warn', title: 'Glue flap', detail: `Glue flap ${f(g)} mm is narrow; at least ${minG} mm is usual for ${corr ? 'corrugated' : 'carton'}.`, fix: { glue: minG + (corr ? 5 : 4) }, rule: 'rule of thumb' });
    else add({ id: 'glue', level: 'ok', title: 'Glue flap', detail: `Glue flap ${f(g)} mm.`, rule: 'rule of thumb' });
  }

  const level = worst(cs);
  return { level, checks: cs, closes: !cs.some((c) => c.level === 'error') };
}
