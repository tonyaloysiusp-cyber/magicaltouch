// Text frames and threaded stories (magazine-style text).
//
// A text frame is a Textbox with a fixed height (`__frameH`). Frames that
// share a `__storyId` form one story: the text runs through them in
// `__storyIndex` order, and whatever doesn't fit in one frame continues in
// the next (columns are simply frames side by side). Text that doesn't fit
// in the last frame is kept (`__storyOverflow`) and shown with a red "+"
// on screen, so nothing is ever lost.
//
// Every frame keeps the whole story text (`__storyText`), so deleting a
// frame never deletes words. One story has one text style (font, size,
// colour, spacing…); changing it on any frame changes it on all of them.

export const STORY_STYLE_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fill',
  'textAlign',
  'lineHeight',
  'charSpacing',
  'paragraphSpacing',
  'underline',
  'linethrough',
  'textBackgroundColor',
] as const;

const isTextbox = (o: any) => o && o.type === 'textbox';
export const isFrame = (o: any) => isTextbox(o) && !!o.__storyId && o.__frameH > 0;

export function newStoryId() {
  return `story_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Frames keep their height whatever the text does.
export function installTextFrames(F: any) {
  const P = F?.Textbox?.prototype;
  if (!P || P.__mtTextFrames) return;
  P.__mtTextFrames = true;
  const baseInit = P.initDimensions;
  P.initDimensions = function (this: any) {
    baseInit.call(this);
    if (this.__frameH > 0) this.height = this.__frameH;
  };
}

export function storyFrames(canvas: any, storyId: string): any[] {
  return canvas
    .getObjects()
    .filter((o: any) => isFrame(o) && o.__storyId === storyId)
    .sort((a: any, b: any) => (a.__storyIndex || 0) - (b.__storyIndex || 0));
}

const styleSig = (o: any) => JSON.stringify(STORY_STYLE_PROPS.map((k) => o[k] ?? null));

// The whole story as the frames show it now, plus what didn't fit.
export function currentStoryText(frames: any[]): string {
  if (!frames.length) return '';
  const body = frames.map((f, i) => (f.text || '') + (i < frames.length - 1 ? f.__flowSep || '' : '')).join('');
  return body + (frames[frames.length - 1].__storyOverflow || '');
}

// How many graphemes of the frame's current text fit inside its height.
function fitCount(f: any, graphemes: string[]): number {
  const H = f.__frameH || 0;
  const lines = f._textLines?.length || 0;
  const lh = f.lineHeight || 1.16;
  let acc = 0;
  let fit = 0;
  for (let i = 0; i < lines; i++) {
    const h = f.getHeightOfLine(i);
    if (acc + h / lh > H + 0.5) break;
    acc += h;
    fit = i + 1;
  }
  if (fit >= lines) return graphemes.length;
  // Start of wrapped line `fit` in the original text.
  const map = f._styleMap?.[fit];
  const unwrapped: any[][] = f._unwrappedTextLines || f._textLines;
  if (!map) return graphemes.length;
  let idx = 0;
  for (let j = 0; j < map.line; j++) idx += (unwrapped[j]?.length || 0) + 1;
  return Math.min(graphemes.length, idx + map.offset);
}

const split = (F: any, s: string): string[] => (F?.util?.string?.graphemeSplit ? F.util.string.graphemeSplit(s) : Array.from(s));

// Pours the story through its frames. `source` is the frame the person
// just changed: its style is copied to the others first.
export function flowStory(F: any, canvas: any, storyId: string, opts: { source?: any; text?: string } = {}) {
  const frames = storyFrames(canvas, storyId);
  if (!frames.length) return { overflow: false, frames };
  const src = opts.source && frames.includes(opts.source) ? opts.source : null;
  if (src) {
    const sig = styleSig(src);
    frames.forEach((f) => {
      if (f === src || styleSig(f) === sig) return;
      const patch: any = {};
      STORY_STYLE_PROPS.forEach((k) => (patch[k] = src[k]));
      f.set(patch);
    });
  }
  const full = opts.text ?? currentStoryText(frames);
  let rest = split(F, full);
  frames.forEach((f, i) => {
    const last = i === frames.length - 1;
    f.styles = {};
    f.text = rest.join('');
    f.initDimensions();
    const n = fitCount(f, rest);
    let shown = rest.slice(0, n);
    let sep = '';
    if (n < rest.length) {
      if (shown[shown.length - 1] === '\n') {
        shown = shown.slice(0, -1);
        sep = '\n';
      }
      rest = rest.slice(n);
    } else rest = [];
    f.text = shown.join('');
    f.__flowSep = last ? '' : sep;
    f.initDimensions();
    f.setCoords();
    f.dirty = true;
    if (last) f.__storyOverflow = (sep && rest.length ? '\n' : '') + rest.join('');
    else f.__storyOverflow = '';
  });
  const overflow = !!frames[frames.length - 1].__storyOverflow;
  frames.forEach((f, i) => {
    f.__storyIndex = i;
    f.__storyText = full;
    f.__styleSig = styleSig(f);
  });
  return { overflow, frames };
}

// Keeps every story consistent after edits made through the normal tools:
// a style changed on one frame goes to all of them, removed frames give
// their text back, and copies of a frame become stories of their own.
export function syncStories(F: any, canvas: any) {
  const all = canvas.getObjects().filter(isFrame);
  const ids = new Set<string>(all.map((f: any) => f.__storyId));
  const copies: any[] = [];
  ids.forEach((id) => {
    const frames = storyFrames(canvas, id);
    // A pasted/duplicated frame shares an index with the original.
    const seen = new Set<number>();
    frames.forEach((f) => {
      const k = f.__storyIndex || 0;
      if (seen.has(k)) {
        f.__storyId = newStoryId();
        f.__storyIndex = 0;
        f.__storyOverflow = '';
        f.__flowSep = '';
        f.__storyText = f.text;
        copies.push(f);
      } else seen.add(k);
    });
    const live = storyFrames(canvas, id);
    if (!live.length) return;
    const changed = live.find((f) => f.__styleSig && f.__styleSig !== styleSig(f));
    const lost = live.some((f, i) => (f.__storyIndex || 0) !== i);
    if (changed || lost) flowStory(F, canvas, id, { source: changed, text: lost ? live[0].__storyText ?? currentStoryText(live) : undefined });
  });
  copies.forEach((f) => flowStory(F, canvas, f.__storyId, { text: f.text || '' }));
}

// After a frame was removed: the remaining frames take its text.
export function healStory(F: any, canvas: any, storyId: string) {
  const live = storyFrames(canvas, storyId);
  if (!live.length) return;
  const full = live[0].__storyText;
  flowStory(F, canvas, storyId, { text: full ?? currentStoryText(live) });
}

export interface FrameBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function makeFrame(F: any, box: FrameBox, style: any, storyId: string, index: number) {
  const t = new F.Textbox('', {
    left: box.left,
    top: box.top,
    width: Math.max(20, box.width),
    fontFamily: style.fontFamily || 'Inter',
    fontSize: style.fontSize || 28,
    lineHeight: style.lineHeight || 1.4,
    fill: style.fill || '#18181B',
    textAlign: style.textAlign || 'left',
    splitByGrapheme: false,
  });
  STORY_STYLE_PROPS.forEach((k) => style[k] !== undefined && (t[k] = style[k]));
  t.__frameH = Math.max(20, box.height);
  t.__storyId = storyId;
  t.__storyIndex = index;
  t.name = index === 0 ? 'Text frame' : `Text frame ${index + 1}`;
  t.initDimensions();
  return t;
}

// A new story laid out as `columns` frames side by side inside `box`.
export function createStory(F: any, canvas: any, box: FrameBox, text: string, style: any = {}, columns = 1, gutter = 24) {
  const id = newStoryId();
  const n = Math.max(1, Math.min(6, Math.round(columns)));
  const w = (box.width - gutter * (n - 1)) / n;
  const frames = Array.from({ length: n }, (_, i) => makeFrame(F, { left: box.left + i * (w + gutter), top: box.top, width: w, height: box.height }, style, id, i));
  frames.forEach((f) => canvas.add(f));
  flowStory(F, canvas, id, { text });
  return frames;
}

// Turns a normal text box into a frame (its height stays as it is now).
export function makeTextFrame(F: any, canvas: any, t: any) {
  if (!isTextbox(t) || isFrame(t)) return t;
  const h = Math.max(t.height || 40, (t.fontSize || 20) * (t.lineHeight || 1.16) * 1.2) * Math.abs(t.scaleY || 1);
  const sx = Math.abs(t.scaleX || 1);
  const sy = Math.abs(t.scaleY || 1);
  // Bake any scaling into real sizes so frame maths stays simple.
  t.set({ width: (t.width || 100) * sx, fontSize: (t.fontSize || 20) * sy, scaleX: 1, scaleY: 1 });
  t.__frameH = h;
  t.__storyId = newStoryId();
  t.__storyIndex = 0;
  flowStory(F, canvas, t.__storyId, { text: t.text || '' });
  return t;
}

// Splits one frame into `n` columns in the same space (the story keeps flowing).
export function splitIntoColumns(F: any, canvas: any, frame: any, n: number, gutter = 24) {
  if (!isFrame(frame) || n < 2) return [frame];
  const frames = storyFrames(canvas, frame.__storyId);
  const at = frames.indexOf(frame);
  const full = currentStoryText(frames);
  const box = { left: frame.left, top: frame.top, width: frame.width * Math.abs(frame.scaleX || 1), height: frame.__frameH };
  const w = (box.width - gutter * (n - 1)) / n;
  frame.set({ width: w, scaleX: 1, scaleY: 1 });
  const style: any = {};
  STORY_STYLE_PROPS.forEach((k) => (style[k] = frame[k]));
  const added: any[] = [];
  for (let i = 1; i < n; i++) {
    const f = makeFrame(F, { left: box.left + i * (w + gutter), top: box.top, width: w, height: box.height }, style, frame.__storyId, at + i - 0.5);
    f.angle = frame.angle || 0;
    added.push(f);
    canvas.add(f);
  }
  // Re-number: the new columns come right after the split frame.
  const order = [...frames.slice(0, at + 1), ...added, ...frames.slice(at + 1)];
  order.forEach((f, i) => (f.__storyIndex = i));
  flowStory(F, canvas, frame.__storyId, { text: full });
  return [frame, ...added];
}

// Adds one more frame at the end of the story, at `box`.
export function addLinkedFrame(F: any, canvas: any, anyFrame: any, box: FrameBox) {
  const frames = storyFrames(canvas, anyFrame.__storyId);
  const last = frames[frames.length - 1];
  const full = currentStoryText(frames);
  const style: any = {};
  STORY_STYLE_PROPS.forEach((k) => (style[k] = last[k]));
  const f = makeFrame(F, box, style, last.__storyId, frames.length);
  canvas.add(f);
  flowStory(F, canvas, last.__storyId, { text: full });
  return f;
}

// Takes a frame out of its story: it keeps the words it shows now and
// becomes a normal text box; the rest of the story closes the gap.
export function unlinkFrame(F: any, canvas: any, frame: any) {
  if (!isFrame(frame)) return;
  const id = frame.__storyId;
  const frames = storyFrames(canvas, id);
  if (frames.length === 1) {
    // A single frame: becomes an ordinary auto-height text box with all its text.
    const full = currentStoryText(frames);
    clearFrameProps(frame);
    frame.set({ text: full });
    frame.initDimensions();
    frame.setCoords();
    return;
  }
  const keep = frame.text || '';
  const rest = frames.filter((f) => f !== frame);
  const full = currentStoryText(frames);
  const at = frames.indexOf(frame);
  // Remove this frame's words from the story text.
  const prefix = frames.slice(0, at).map((f) => (f.text || '') + (f.__flowSep || '')).join('');
  const remaining = prefix + full.slice(prefix.length + keep.length + (frame.__flowSep || '').length);
  clearFrameProps(frame);
  frame.set({ text: keep });
  frame.initDimensions();
  frame.setCoords();
  rest.forEach((f, i) => (f.__storyIndex = i));
  flowStory(F, canvas, id, { text: remaining });
}

function clearFrameProps(f: any) {
  delete f.__frameH;
  delete f.__storyId;
  delete f.__storyIndex;
  delete f.__storyText;
  delete f.__storyOverflow;
  delete f.__flowSep;
  delete f.__styleSig;
  f.name = undefined;
}

// Where the next frame should go: to the right of the last one if the page
// has room, otherwise below it, otherwise null (caller adds a page).
export function nextFrameBox(last: any, page: { x: number; y: number; width: number; height: number }, gutter = 24): FrameBox | null {
  const w = last.width * Math.abs(last.scaleX || 1);
  const h = last.__frameH;
  const right = { left: last.left + w + gutter, top: last.top, width: w, height: h };
  if (right.left + w <= page.x + page.width + 0.5) return right;
  const below = { left: last.left, top: last.top + h + gutter, width: w, height: h };
  if (below.top + h <= page.y + page.height + 0.5) return below;
  return null;
}

// Screen-only drawing: the red "+" on stories with text left over, and the
// threads between frames of the selected story.
export function drawFrameOverlays(canvas: any, ctx: CanvasRenderingContext2D) {
  const vt = canvas.viewportTransform;
  if (!vt) return;
  const frames = canvas.getObjects().filter((o: any) => isFrame(o) && o.visible !== false);
  if (!frames.length) return;
  const active = canvas.getActiveObject();
  const activeIds = new Set<string>();
  if (active) (active.type === 'activeSelection' ? active.getObjects() : [active]).forEach((o: any) => isFrame(o) && activeIds.add(o.__storyId));
  const toScreen = (x: number, y: number) => ({ x: x * vt[0] + vt[4], y: y * vt[3] + vt[5] });
  const corner = (f: any, which: 'tl' | 'br') => {
    const c = f.calcTransformMatrix ? f.oCoords || f.aCoords : null;
    const a = f.aCoords || c;
    if (!a) return null;
    return which === 'tl' ? a.tl : a.br;
  };
  ctx.save();
  // Threads for the selected story.
  activeIds.forEach((id) => {
    const list = storyFrames(canvas, id);
    for (let i = 0; i < list.length - 1; i++) {
      const a = corner(list[i], 'br');
      const b = corner(list[i + 1], 'tl');
      if (!a || !b) continue;
      const p = toScreen(a.x, a.y);
      const q = toScreen(b.x, b.y);
      ctx.strokeStyle = '#3B82C4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.bezierCurveTo(p.x + 40, p.y, q.x - 40, q.y, q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#3B82C4';
      [p, q].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
  // Overflow markers.
  const byStory = new Map<string, any>();
  frames.forEach((f: any) => {
    const cur = byStory.get(f.__storyId);
    if (!cur || (f.__storyIndex || 0) > (cur.__storyIndex || 0)) byStory.set(f.__storyId, f);
  });
  byStory.forEach((last) => {
    if (!last.__storyOverflow) return;
    const a = corner(last, 'br');
    if (!a) return;
    const p = toScreen(a.x, a.y);
    const s = 16;
    ctx.fillStyle = '#E11D48';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(p.x - s / 2, p.y - s / 2, s, s, 3) : ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - 4, p.y);
    ctx.lineTo(p.x + 4, p.y);
    ctx.moveTo(p.x, p.y - 4);
    ctx.lineTo(p.x, p.y + 4);
    ctx.stroke();
  });
  ctx.restore();
}

export const SAMPLE_ARTICLE = [
  'Every great page starts with a single idea. Write your headline, then let the story unfold here — this text flows from one column to the next on its own, so you can focus on the words.',
  'Click inside any column and start typing. Add a paragraph and everything after it moves along; delete one and the text pulls back. Nothing is ever lost: if the story is longer than its frames, a red plus appears so you can add another frame or page.',
  'Change the font, size or colour in one column and the whole story follows. Drag the frames to resize them and the text re-flows instantly. When you are ready, export a print-quality PDF with bleed and crop marks.',
  'Good layouts breathe. Leave generous margins, keep line lengths comfortable, and let images carry part of the story. A strong pull quote or a well-chosen photo can do as much as a paragraph.',
].join('\n');

// Live flow while typing in a frame. The caret stays with the letter it
// was next to, even when that letter moves on into the next frame.
export function flowWhileEditing(F: any, canvas: any, frame: any) {
  if (!isFrame(frame)) return;
  const frames = storyFrames(canvas, frame.__storyId);
  const k = frames.indexOf(frame);
  if (k < 0) return;
  const before = frames
    .slice(0, k)
    .map((f) => (f.text || '') + (f.__flowSep || ''))
    .join('');
  const caret = split(F, before).length + (frame.selectionStart || 0);
  flowStory(F, canvas, frame.__storyId, { text: currentStoryText(frames) });
  // Which frame now holds the caret?
  let acc = 0;
  let target = frames[frames.length - 1];
  let local = 0;
  for (const f of frames) {
    const len = split(F, f.text || '').length;
    if (caret <= acc + len) {
      target = f;
      local = caret - acc;
      break;
    }
    acc += len + (f.__flowSep ? 1 : 0);
    local = Math.min(caret - acc, len);
  }
  const place = (t: any, at: number) => {
    const len = split(F, t.text || '').length;
    t.selectionStart = t.selectionEnd = Math.max(0, Math.min(len, at));
    if (t.hiddenTextarea) t.hiddenTextarea.value = t.text || '';
    t._updateTextarea?.();
  };
  if (target === frame) {
    place(frame, local);
  } else {
    place(frame, split(F, frame.text || '').length);
    setTimeout(() => {
      frame.exitEditing?.();
      canvas.setActiveObject(target);
      target.enterEditing?.();
      place(target, local);
      canvas.requestRenderAll();
    }, 0);
  }
  canvas.requestRenderAll();
}

// Resizing a frame changes its box, never the size of the letters.
export function resizeFrameFromScale(F: any, canvas: any, frame: any) {
  if (!isFrame(frame)) return;
  const sx = Math.abs(frame.scaleX || 1);
  const sy = Math.abs(frame.scaleY || 1);
  if (sx === 1 && sy === 1) {
    flowStory(F, canvas, frame.__storyId);
    return;
  }
  frame.set({ width: Math.max(20, frame.width * sx), scaleX: 1, scaleY: 1 });
  frame.__frameH = Math.max(20, frame.__frameH * sy);
  flowStory(F, canvas, frame.__storyId);
}

export function reflowAllStories(F: any, canvas: any) {
  const ids = new Set<string>(canvas.getObjects().filter(isFrame).map((f: any) => f.__storyId));
  ids.forEach((id) => flowStory(F, canvas, id));
}
