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
  if (o.style === 'rte' || o.style === 'ste' || o.style === 'snap123' || o.style === 'crash' || (o.style === 'carton' && (o.topEnd || 'tuck') === 'tuck')) {
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
  if (o.style === 'tray' || o.style === 'traylid' || o.style === 'matchbox') {
    // Corner flaps (from the long walls) fold onto each end wall of length W; they are capped at W/2 − 1.
    const W = o.W + 2 * t, want = Math.max(4, o.D - 1), cf = Math.max(4, Math.min(want, W / 2 - 1));
    add(cf < want
      ? { id: 'corner', level: cf < o.D * 0.35 ? 'warn' : 'ok', title: 'Corner flaps', detail: `Corner flaps shortened to ${f(cf)} mm so the two flaps on each ${f(W)} mm end wall do not overlap (full wall height would be ${f(want)} mm).${cf < o.D * 0.35 ? ' Short flaps give a weak corner — a wider tray or a lower wall glues better.' : ''}`, rule: 'geometry' }
      : { id: 'corner', level: 'ok', title: 'Corner flaps', detail: `Corner flaps ${f(cf)} mm sit side by side on the ${f(W)} mm end wall.`, rule: 'geometry' });
    if (o.style === 'traylid') {
      const lD = Math.max(10, Math.min(o.lidDepth, o.D));
      add({ id: 'lid', level: o.lidDepth > o.D ? 'warn' : 'ok', title: 'Lid fits over tray', detail: o.lidDepth > o.D ? `Lid depth is capped at the tray depth (${f(o.D)} mm).` : `Lid ${f(lD)} mm deep with 1 mm play over the tray.`, rule: 'geometry' });
    }
    if (o.style === 'matchbox') add({ id: 'sleeve', level: 'ok', title: 'Sleeve fit', detail: `Sleeve inside is the tray outside + 1 mm, so the drawer slides.`, rule: 'geometry' });
  }
  if (o.style === 'rsc' || o.style === 'hsc' || o.style === 'fol') {
    add(o.L < o.W
      ? { id: 'lw', level: 'warn', title: 'Length and width', detail: 'FEFCO sizes are given length ≥ width. Swap them so the flaps on the long panels meet.', fix: { L: o.W, W: o.L }, rule: 'rule of thumb' }
      : { id: 'lw', level: 'ok', title: 'Flaps meet', detail: `Outer flaps ${f((o.W + 2 * t) / 2 + t)} mm meet in the middle.`, rule: 'geometry' });
  }

  if (o.style === 'snap123' || o.style === 'crash' || o.style === 'gable' || (o.style === 'carton' && (o.bottomEnd === 'snap123' || o.bottomEnd === 'crash'))) {
    add({ id: 'bottom', level: Lp < Wp ? 'warn' : 'ok', title: o.style === 'snap123' ? '1-2-3 bottom' : 'Crash-lock bottom', detail: Lp < Wp ? 'Length is shorter than width: the bottom flaps lock across the short side. Swap length and width if the product allows.' : o.style === 'snap123' ? 'Side flaps half the width, back flap past the middle with the slit, front tongue locks through it.' : 'Bottom webs at 45° are glued at the converter so the base opens in one move. Make a sample on your board.', rule: 'geometry' });
  }
  if (o.style === 'mailer') {
    add({ id: 'mailer', level: o.D < 25 ? 'warn' : 'ok', title: 'Mailer walls', detail: o.D < 25 ? 'Under about 25 mm deep the rolled front wall and ears are fiddly to fold. Make a sample.' : 'Double front and side walls lock without glue. Corrugated board (E or B flute) is usual.', rule: 'rule of thumb' });
  }
  if (o.style === 'pillow') {
    add({ id: 'pillow', level: o.D > o.W * 0.5 ? 'warn' : 'ok', title: 'Pillow ends', detail: o.D > o.W * 0.5 ? `Thickness ${f(o.D)} mm is over half the width; the curved ends get very deep and may not close flat. Keep it under ${f(o.W * 0.5)} mm or make a sample.` : 'Curved ends close by pressing in along the curved creases. Make a sample on your board before production.', rule: 'rule of thumb' });
  }
  if ((o.glueAngle ?? 45) < 5 && !corr) add({ id: 'glueangle', level: 'warn', title: 'Glue flap ends', detail: 'Square glue flap ends can catch on the folded closures; a 7–15° bevel is usual on folder-gluers.', fix: { glueAngle: 15 } as any, rule: 'rule of thumb' });
  // Glue flap: needs enough width for the glue line, and must fit on the panel it is glued to.
  if (o.style !== 'tray' && o.style !== 'traylid' && o.style !== 'mailer') {
    const g = (o.style === 'rsc' || o.style === 'hsc' || o.style === 'fol') ? Math.max(o.glue, 25) : o.glue;
    const minG = corr ? 25 : 10, target = (o.style === 'rsc' || o.style === 'hsc' || o.style === 'fol') ? o.W + 2 * t : o.gluePos === 'back' && o.style !== 'pillow' ? o.W + t : Lp; // slotted: joint glued to the last side panel; back-panel flap glues onto a side
    if (g >= target) add({ id: 'glue', level: 'error', title: 'Glue flap', detail: `Glue flap ${f(g)} mm is wider than the panel it is glued to (${f(target)} mm).`, fix: { glue: Math.round(target * 0.3) }, rule: 'geometry' });
    else if (g < minG) add({ id: 'glue', level: 'warn', title: 'Glue flap', detail: `Glue flap ${f(g)} mm is narrow; at least ${minG} mm is usual for ${corr ? 'corrugated' : 'carton'}.`, fix: { glue: minG + (corr ? 5 : 4) }, rule: 'rule of thumb' });
    else add({ id: 'glue', level: 'ok', title: 'Glue flap', detail: `Glue flap ${f(g)} mm.`, rule: 'rule of thumb' });
  }

  const level = worst(cs);
  return { level, checks: cs, closes: !cs.some((c) => c.level === 'error') };
}
