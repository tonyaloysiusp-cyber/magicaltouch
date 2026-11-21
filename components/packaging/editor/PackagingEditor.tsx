'use client';

// Packaging Editor — a full-screen editor for boxes and custom structures.
// Box tab: the product size, board and style work out the dieline (inside =
// product + fitting gap; the dieline engine adds the board at every fold).
// Drawing tools add your own cut, crease, perforation and glue lines or
// artwork. Layers, undo, snapping, MTD project files and press PDFs.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown, ArrowUp, Box, Circle, Copy, Download, Eye, EyeOff, FileDown, FolderOpen, Hand, Image as ImageIcon, Layers,
  Lock, Minus, Moon, MousePointer2, PenTool, Plus, Redo2, Save, Square, Sun, Trash2, Type, Undo2, Unlock, X, ZoomIn, ZoomOut, Maximize,
} from 'lucide-react';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BOX_STYLES, makeDieline, type BoxStyleId } from '@/lib/packaging/dieline';
import { BOARD_GRADES, creaseSetup, gradeById, gsmRange } from '@/lib/packaging/board';
import { checkStructure } from '@/lib/packaging/validate';
import {
  ART_LAYER, DIE_LAYER, DRAW_LAYER, LINE_COLOURS, LINE_NAMES, boxDieline, dieOptions, docBounds, innerSize, newDoc, newId, objBounds,
  outerSize, paintOrder, pathPoints, readDoc, regenerate, reorder, ruleTotals, unionBounds, withBoard,
  type LineType, type PkDoc, type PkObj, type Box4,
} from '@/lib/packaging/editorModel';
import { nextLayerSelection, clickMods } from '@/lib/ui/layerSelect';

type Tool = 'select' | 'hand' | 'line' | 'pen' | 'rect' | 'ellipse' | 'text';
type Unit = 'mm' | 'cm' | 'in';
const UNIT_K: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
const r2 = (v: number) => Math.round(v * 100) / 100;
const FONTS = ['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Roboto', 'Oswald', 'Lato', 'Merriweather'];
const DASH: Partial<Record<LineType, string>> = { crease: '3 1.6', perf: '1 1', glue: '2 1' };

const TOOLS: { id: Tool; label: string; key: string; icon: any }[] = [
  { id: 'select', label: 'Select and move', key: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Pan the view', key: 'H', icon: Hand },
  { id: 'line', label: 'Line', key: 'L', icon: Minus },
  { id: 'pen', label: 'Polyline (click points, double-click to finish)', key: 'P', icon: PenTool },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse / circle', key: 'E', icon: Circle },
  { id: 'text', label: 'Text', key: 'T', icon: Type },
];

function useHistory(initial: () => PkDoc) {
  const [doc, setDoc] = useState<PkDoc>(initial);
  const past = useRef<PkDoc[]>([]), future = useRef<PkDoc[]>([]);
  const [, bump] = useState(0);
  const commit = useCallback((next: PkDoc | ((d: PkDoc) => PkDoc)) => {
    setDoc((cur) => { const n = typeof next === 'function' ? (next as any)(cur) : next; if (n === cur) return cur; past.current.push(cur); if (past.current.length > 200) past.current.shift(); future.current = []; return n; });
    bump((x) => x + 1);
  }, []);
  const live = useCallback((next: (d: PkDoc) => PkDoc) => setDoc(next), []);
  const undo = useCallback(() => setDoc((cur) => { const p = past.current.pop(); if (!p) return cur; future.current.push(cur); return p; }), []);
  const redo = useCallback(() => setDoc((cur) => { const f = future.current.pop(); if (!f) return cur; past.current.push(cur); return f; }), []);
  const mark = useCallback((d: PkDoc) => { past.current.push(d); future.current = []; bump((x) => x + 1); }, []);
  return { doc, commit, live, undo, redo, mark, canUndo: past.current.length > 0, canRedo: future.current.length > 0, reset: (d: PkDoc) => { past.current = []; future.current = []; setDoc(d); } };
}

function Menu({ label, items }: { label: string; items: ({ label: string; key?: string; on: () => void; disabled?: boolean } | null)[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; window.addEventListener('mousedown', f); return () => window.removeEventListener('mousedown', f); }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={`h-8 rounded-md px-2.5 text-[12.5px] font-medium ${open ? 'bg-mt-surface2 text-mt-ink' : 'text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink'}`}>{label}</button>
      {open && (
        <div role="menu" className="absolute left-0 top-9 z-[90] min-w-[230px] rounded-lg border border-mt-border bg-mt-surface py-1 shadow-xl">
          {items.map((it, i) => it ? (
            <button key={i} type="button" role="menuitem" disabled={it.disabled} onClick={() => { setOpen(false); it.on(); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12.5px] hover:bg-mt-surface2 disabled:opacity-40">
              <span>{it.label}</span>{it.key && <span className="text-[11px] text-mt-faint">{it.key}</span>}
            </button>
          ) : <div key={i} className="my-1 border-t border-mt-border" />)}
        </div>
      )}
    </div>
  );
}

function Num({ label, value, onChange, unit = 'mm', step = 0.1, min, title }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number; min?: number; title?: string }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="block text-[11.5px]" title={title}>
      <span className="text-mt-muted">{label}</span>
      <span className="mt-0.5 flex h-8 items-center rounded-md border border-mt-border bg-mt-bg focus-within:border-mt-ink/50">
        <input value={txt} inputMode="decimal" aria-label={label} onChange={(e) => { setTxt(e.target.value); const v = Number(e.target.value); if (e.target.value !== '' && isFinite(v) && (min == null || v >= min)) onChange(v); }}
          onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const v = r2((Number(txt) || 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)); if (min == null || v >= min) { setTxt(String(v)); onChange(v); } } }}
          className="h-full w-full min-w-0 bg-transparent px-2 text-[12.5px] tabular-nums outline-none" />
        <span className="pr-2 text-[10.5px] text-mt-faint">{unit}</span>
      </span>
    </label>
  );
}

/** Small dieline drawing for the style picker. */
function StyleThumb({ id }: { id: BoxStyleId }) {
  const svg = useMemo(() => {
    const corr = BOX_STYLES.find((s) => s.id === id)?.group === 'Corrugated';
    const d = makeDieline({ style: id, L: 60, W: 40, D: 50, t: corr ? 3 : 0.5, glue: corr ? 30 : 14, tuck: 15, lidDepth: 20 });
    const pad = 4;
    return { vb: `${-pad} ${-pad} ${d.w + 2 * pad} ${d.h + 2 * pad}`, lines: d.lines, sw: Math.max(d.w, d.h) / 90 };
  }, [id]);
  return (
    <svg viewBox={svg.vb} className="h-14 w-full" aria-hidden>
      {svg.lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke={l.kind === 'cut' ? 'currentColor' : LINE_COLOURS.crease} strokeWidth={svg.sw} strokeDasharray={l.kind === 'cut' ? undefined : `${svg.sw * 3} ${svg.sw * 2}`} />)}
    </svg>
  );
}

export function PackagingEditor() {
  const { theme, toggleTheme } = useAppTheme();
  const H = useHistory(() => newDoc());
  const { doc, commit, live } = H;
  const [sel, setSel] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [drawLine, setDrawLine] = useState<LineType>('cut');
  const [activeLayer, setActiveLayer] = useState(DRAW_LAYER);
  const [leftTab, setLeftTab] = useState<'box' | 'layers'>('box');
  const [unit, setUnit] = useState<Unit>('mm');
  const [view, setView] = useState({ x: -20, y: -20, k: 3 }); // k = px per mm
  const [grid, setGrid] = useState(true), [snap, setSnap] = useState(true), [showBleed, setShowBleed] = useState(true), [labels, setLabels] = useState(true);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [draft, setDraft] = useState<PkObj | null>(null);
  const [penPts, setPenPts] = useState<[number, number][]>([]);
  const [marquee, setMarquee] = useState<Box4 | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [textPaths, setTextPaths] = useState<Record<string, { key: string; d: string }>>({});
  const svgRef = useRef<SVGSVGElement>(null), wrapRef = useRef<HTMLDivElement>(null), imgInput = useRef<HTMLInputElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<any>(null);
  const spaceDown = useRef(false);

  const flash = (m: string) => { setMsg(m); window.setTimeout(() => setMsg((x) => (x === m ? null : x)), 4000); };
  const box = doc.box, grade = gradeById(box.grade), range = gsmRange(grade);
  const die = useMemo(() => boxDieline(box), [box]);
  const inner = innerSize(box), outer = outerSize(box);
  const report = useMemo(() => checkStructure(dieOptions(box), grade.family), [box, grade.family]);
  const crease = useMemo(() => creaseSetup(grade.family, box.t), [grade.family, box.t]);
  const totals = useMemo(() => ruleTotals(doc), [doc]);
  const layerOf = (o: PkObj) => doc.layers.find((l) => l.id === o.layer);
  const isLocked = (o: PkObj) => !!(o.locked || layerOf(o)?.locked);
  const isHidden = (o: PkObj) => !!(o.hidden || layerOf(o)?.hidden);
  const selected = doc.objects.filter((o) => sel.includes(o.id));

  // ── box changes regenerate the dieline (your own lines stay) ──
  const setBox = (patch: Partial<typeof box> | ((b: typeof box) => typeof box)) => commit((d) => regenerate({ ...d, box: typeof patch === 'function' ? patch(d.box) : { ...d.box, ...patch } }));

  // ── view helpers ──
  const fit = useCallback(() => {
    const el = wrapRef.current; if (!el) return;
    const b = docBounds(doc), pad = 30;
    const k = Math.min((el.clientWidth - 2 * pad) / Math.max(1, b.w), (el.clientHeight - 2 * pad) / Math.max(1, b.h));
    setView({ k, x: b.x - (el.clientWidth / k - b.w) / 2, y: b.y - (el.clientHeight / k - b.h) / 2 });
  }, [doc]);
  const fitted = useRef(false);
  useEffect(() => { if (!fitted.current && wrapRef.current) { fitted.current = true; fit(); } }, [fit]);
  const toMm = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [view.x + (e.clientX - r.left) / view.k, view.y + (e.clientY - r.top) / view.k];
  };
  const zoomAt = (f: number, cx?: number, cy?: number) => setView((v) => {
    const el = wrapRef.current; const px = cx ?? (el ? el.clientWidth / 2 : 0), py = cy ?? (el ? el.clientHeight / 2 : 0);
    const k = Math.min(80, Math.max(0.2, v.k * f));
    const mx = v.x + px / v.k, my = v.y + py / v.k;
    return { k, x: mx - px / k, y: my - py / k };
  });

  // ── snapping: grid (1 mm, or 0.5 mm when zoomed in) and line end points ──
  const snapPts = useMemo(() => {
    const pts: [number, number][] = [];
    for (const o of doc.objects) { if (isHidden(o)) continue; if (o.kind === 'path' && o.d) pts.push(...pathPoints(o.d, o.x, o.y)); else if (o.kind === 'rect') pts.push([o.x, o.y], [o.x + o.w, o.y], [o.x, o.y + o.h], [o.x + o.w, o.y + o.h]); }
    return pts;
  }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps
  const snapTo = (p: [number, number], skip?: boolean): [number, number] => {
    if (!snap || skip) return p;
    const tol = 7 / view.k;
    let best: [number, number] | null = null, bd = tol;
    for (const q of snapPts) { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bd) { bd = dd; best = q; } }
    if (best) return best;
    const g = view.k > 12 ? 0.5 : 1;
    return [Math.round(p[0] / g) * g, Math.round(p[1] / g) * g];
  };
  const constrain = (a: [number, number], b: [number, number]): [number, number] => {
    const dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy);
    return [r2(a[0] + Math.cos(ang) * len), r2(a[1] + Math.sin(ang) * len)];
  };

  // ── text outlines (preview = print: both use the real font outline) ──
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { loadFont, textShape } = await import('@/lib/fontOutline');
      const next: Record<string, { key: string; d: string }> = {};
      for (const o of doc.objects) {
        if (o.kind !== 'text') continue;
        const key = `${o.text}|${o.font}|${o.weight}|${o.size}|${o.x}|${o.y}|${o.w}|${o.align}`;
        if (textPaths[o.id]?.key === key) { next[o.id] = textPaths[o.id]; continue; }
        try {
          const f = await loadFont(o.font || 'Inter', o.weight || 400);
          const sizeMm = (o.size || 24) * 25.4 / 72, lines = (o.text || '').split('\n');
          let d = '';
          lines.forEach((ln, i) => {
            const s = textShape(f, ln, sizeMm);
            const dx = o.align === 'center' ? (o.w - s.width) / 2 : o.align === 'right' ? o.w - s.width : 0;
            const by = o.y + s.ascender + i * sizeMm * 1.2;
            d += s.d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g, (_m, a, b) => `${r2(Number(a) + o.x + dx)} ${r2(Number(b) + by)}`);
          });
          next[o.id] = { key, d };
        } catch { /* font failed: preview falls back to live text */ }
      }
      if (!cancel) setTextPaths(next);
    })();
    return () => { cancel = true; };
  }, [doc.objects]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── object edits ──
  const patchObjs = (ids: string[], f: (o: PkObj) => Partial<PkObj>, record = true) => {
    const fn = (d: PkDoc) => ({ ...d, objects: d.objects.map((o) => (ids.includes(o.id) ? { ...o, ...f(o), gen: false } : o)) });
    record ? commit(fn) : live(fn);
  };
  const addObj = (o: Omit<PkObj, 'id' | 'layer'> & { layer?: string }) => {
    const layer = o.layer || (o.line === 'art' ? (activeLayer === DIE_LAYER ? ART_LAYER : activeLayer) : (activeLayer === DIE_LAYER ? DRAW_LAYER : activeLayer));
    const obj: PkObj = { ...o, id: newId(), layer } as PkObj;
    commit((d) => ({ ...d, objects: [...d.objects, obj] }));
    setSel([obj.id]); setAnchor(obj.id);
    return obj;
  };
  const del = (ids = sel) => { const ok = ids.filter((id) => { const o = doc.objects.find((x) => x.id === id); return o && !isLocked(o); }); if (!ok.length) { if (ids.length) flash('Locked — unlock it (or its layer) to delete.'); return; } commit((d) => ({ ...d, objects: d.objects.filter((o) => !ok.includes(o.id)) })); setSel([]); };
  const dup = () => { if (!selected.length) return; const copies = selected.map((o) => ({ ...o, id: newId(), name: `${o.name} copy`, x: o.x + 5, y: o.y + 5, gen: false, locked: false, layer: o.layer === DIE_LAYER ? DRAW_LAYER : o.layer })); commit((d) => ({ ...d, objects: [...d.objects, ...copies] })); setSel(copies.map((c) => c.id)); };
  const nudge = (dx: number, dy: number) => { const ids = selected.filter((o) => !isLocked(o)).map((o) => o.id); if (ids.length) patchObjs(ids, (o) => ({ x: r2(o.x + dx), y: r2(o.y + dy) })); };
  const order = (dir: 'up' | 'down' | 'top' | 'bottom') => commit((d) => ({ ...d, objects: reorder(d.objects, sel, dir) }));

  // ── pointer handling on the canvas ──
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = toMm(e);
    if (e.button === 1 || tool === 'hand' || spaceDown.current) { drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, v: view }; return; }
    const hitId = (e.target as Element).closest('[data-id]')?.getAttribute('data-id') || null;
    if (tool === 'select') {
      const hit = hitId ? doc.objects.find((o) => o.id === hitId) : null;
      const handle = (e.target as Element).getAttribute('data-handle');
      if (handle && selected.length === 1) { drag.current = { kind: 'resize', id: selected[0].id, h: handle, start: p, orig: { ...selected[0] }, base: doc }; return; }
      if (hit && !isLocked(hit)) {
        let next = sel;
        if (e.shiftKey || e.ctrlKey || e.metaKey) next = sel.includes(hit.id) ? sel.filter((x) => x !== hit.id) : [...sel, hit.id];
        else if (!sel.includes(hit.id)) next = [hit.id];
        setSel(next); setAnchor(hit.id);
        drag.current = { kind: 'move', start: p, ids: next.filter((id) => { const o = doc.objects.find((x) => x.id === id); return o && !isLocked(o); }), orig: new Map(doc.objects.map((o) => [o.id, { x: o.x, y: o.y }])), base: doc, moved: false };
        return;
      }
      if (hit && isLocked(hit)) flash(hit.layer === DIE_LAYER ? 'The box dieline is locked. Change it in the Box tab, or unlock the layer in Layers to edit lines by hand.' : 'Locked — unlock it in Layers.');
      if (!e.shiftKey) setSel([]);
      drag.current = { kind: 'marquee', start: p };
      setMarquee({ x: p[0], y: p[1], w: 0, h: 0 });
      return;
    }
    const sp = snapTo(p, e.altKey);
    if (tool === 'pen') { setPenPts((pts) => [...pts, pts.length && e.shiftKey ? constrain(pts[pts.length - 1], sp) : sp]); return; }
    if (tool === 'text') {
      addObj({ name: 'Text', kind: 'text', x: sp[0], y: sp[1], w: 60, h: 10, line: 'art', fill: '#111827', text: 'Your text', font: 'Inter', size: 18, weight: 600, align: 'left' });
      setTool('select'); return;
    }
    drag.current = { kind: 'draw', start: sp };
    const base = { name: '', x: 0, y: 0, w: 0, h: 0, line: drawLine, layer: '', id: 'draft', stroke: drawLine === 'art' ? '#111827' : undefined, strokeW: drawLine === 'art' ? 0.5 : undefined } as PkObj;
    if (tool === 'line') setDraft({ ...base, kind: 'path', d: `M${sp[0]} ${sp[1]} L${sp[0]} ${sp[1]}` });
    else setDraft({ ...base, kind: tool === 'rect' ? 'rect' : 'ellipse', x: sp[0], y: sp[1], fill: drawLine === 'art' ? '#E5E7EB' : undefined });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = toMm(e);
    setCursor([r2(p[0]), r2(p[1])]);
    const g = drag.current; if (!g) return;
    if (g.kind === 'pan') { setView({ ...g.v, x: g.v.x - (e.clientX - g.sx) / g.v.k, y: g.v.y - (e.clientY - g.sy) / g.v.k }); return; }
    if (g.kind === 'marquee') { setMarquee({ x: Math.min(g.start[0], p[0]), y: Math.min(g.start[1], p[1]), w: Math.abs(p[0] - g.start[0]), h: Math.abs(p[1] - g.start[1]) }); return; }
    if (g.kind === 'move') {
      let dx = p[0] - g.start[0], dy = p[1] - g.start[1];
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      if (snap && !e.altKey) { const s = view.k > 12 ? 0.5 : 1; dx = Math.round(dx / s) * s; dy = Math.round(dy / s) * s; }
      g.moved = g.moved || Math.abs(dx) + Math.abs(dy) > 0;
      live((d) => ({ ...d, objects: d.objects.map((o) => (g.ids.includes(o.id) ? { ...o, x: r2(g.orig.get(o.id).x + dx), y: r2(g.orig.get(o.id).y + dy), gen: false } : o)) }));
      return;
    }
    if (g.kind === 'resize') {
      const o = g.orig as PkObj; let { x, y, w, h } = o; const dx = p[0] - g.start[0], dy = p[1] - g.start[1];
      if (g.h.includes('e')) w = Math.max(1, o.w + dx); if (g.h.includes('s')) h = Math.max(1, o.h + dy);
      if (g.h.includes('w')) { x = Math.min(o.x + o.w - 1, o.x + dx); w = o.w - (x - o.x); }
      if (g.h.includes('n')) { y = Math.min(o.y + o.h - 1, o.y + dy); h = o.h - (y - o.y); }
      if (e.shiftKey && o.w && o.h) { const ar = o.w / o.h; if (w / h > ar) w = h * ar; else h = w / ar; }
      live((d) => ({ ...d, objects: d.objects.map((q) => (q.id === g.id ? { ...q, x: r2(x), y: r2(y), w: r2(w), h: r2(h) } : q)) }));
      return;
    }
    if (g.kind === 'draw' && draft) {
      let sp = snapTo(p, e.altKey);
      if (draft.kind === 'path') { if (e.shiftKey) sp = constrain(g.start, sp); setDraft({ ...draft, d: `M${g.start[0]} ${g.start[1]} L${sp[0]} ${sp[1]}` }); }
      else { let w = sp[0] - g.start[0], h = sp[1] - g.start[1]; if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; } setDraft({ ...draft, x: Math.min(g.start[0], g.start[0] + w), y: Math.min(g.start[1], g.start[1] + h), w: Math.abs(w), h: Math.abs(h) }); }
    }
  };
  const onPointerUp = () => {
    const g = drag.current; drag.current = null;
    if (!g) return;
    if (g.kind === 'move' && g.moved) H.mark(g.base);
    if (g.kind === 'resize') H.mark(g.base);
    if (g.kind === 'marquee' && marquee) {
      const m = marquee;
      if (m.w > 0.5 || m.h > 0.5) {
        const ids = doc.objects.filter((o) => !isHidden(o) && !isLocked(o)).filter((o) => { const b = objBounds(o); return b.x >= m.x && b.y >= m.y && b.x + b.w <= m.x + m.w && b.y + b.h <= m.y + m.h; }).map((o) => o.id);
        setSel((s) => Array.from(new Set([...s, ...ids])));
      }
      setMarquee(null);
    }
    if (g.kind === 'draw' && draft) {
      const tooSmall = draft.kind === 'path' ? (draft.d || '').split(/[ML ]/).filter(Boolean).length < 4 || /M(\S+) (\S+) L\1 \2$/.test(draft.d || '') : draft.w < 0.5 || draft.h < 0.5;
      if (!tooSmall) addObj({ ...draft, name: `${LINE_NAMES[draft.line]} ${draft.kind === 'path' ? 'line' : draft.kind}` });
      setDraft(null);
    }
  };
  const finishPen = (close = false) => {
    if (penPts.length >= 2) {
      const d = penPts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ') + (close ? ' Z' : '');
      addObj({ name: `${LINE_NAMES[drawLine]} shape`, kind: 'path', d, x: 0, y: 0, w: 0, h: 0, line: drawLine, stroke: drawLine === 'art' ? '#111827' : undefined, strokeW: drawLine === 'art' ? 0.5 : undefined, fill: drawLine === 'art' && close ? '#E5E7EB' : undefined });
    }
    setPenPts([]);
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    else setView((v) => ({ ...v, x: v.x + (e.shiftKey ? e.deltaY : e.deltaX) / v.k, y: v.y + (e.shiftKey ? 0 : e.deltaY) / v.k }));
  };
  useEffect(() => { const el = wrapRef.current; if (!el) return; const f = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }; el.addEventListener('wheel', f, { passive: false }); return () => el.removeEventListener('wheel', f); }, []);

  // ── files ──
  const projectName = () => (doc.name || 'box').replace(/[^\w\- ]+/g, '').trim() || 'box';
  const save = async (asNew = false) => {
    setBusy('Saving…');
    try {
      const { saveToolProject } = await import('@/lib/mtd/toolProject');
      const ref = await saveToolProject({ kind: 'packaging', name: doc.name, data: doc, previewSvg: previewSvg(), handle: asNew ? null : fileHandle });
      if (ref) { setFileHandle((ref as any).handle ?? null); flash(`Saved ${(ref as any).fileName || `${projectName()}.mtd`} on this device.`); }
    } catch (e: any) { flash(e?.message || 'Could not save.'); } finally { setBusy(null); }
  };
  const openFile = async (f: File) => {
    try {
      const { openToolFile } = await import('@/lib/mtd/toolProject');
      const p = await openToolFile(f);
      if (p.kind !== 'packaging') throw new Error('This project belongs to another tool — open it from the Dashboard.');
      H.reset(readDoc(p.data)); setSel([]); fitted.current = false; flash(`Opened ${f.name}.`);
    } catch (e: any) { flash(e?.message || 'Could not open this file.'); }
  };
  useEffect(() => {
    (async () => {
      const { takeToolHandoff } = await import('@/lib/mtd/toolProject');
      const q = new URLSearchParams(window.location.search);
      if (q.get('L') && q.get('style')) {
        // From the Dieline Studio: its sizes are inside sizes, so the gap is zero.
        const num = (k: string, d: number) => { const v = Number(q.get(k)); return isFinite(v) && v > 0 ? v : d; };
        const base = newDoc();
        const st = (BOX_STYLES.find((s) => s.id === q.get('style'))?.id || 'rte') as BoxStyleId;
        const g = gradeById(q.get('grade') || base.box.grade);
        H.reset(regenerate({ ...base, box: { ...base.box, style: st, grade: g.id, gsm: num('gsm', base.box.gsm), t: num('t', base.box.t), product: { L: num('L', 50), W: num('W', 50), H: num('D', 50) }, clearance: { L: 0, W: 0, H: 0 }, glue: num('glue', g.glue), tuck: num('tuck', 15), lidDepth: num('lid', 30) } }));
        fitted.current = false;
        window.history.replaceState(null, '', window.location.pathname);
      }
      const h = takeToolHandoff('packaging');
      if (h) { try { H.reset(readDoc(h.data)); setFileHandle(h.handle || null); fitted.current = false; } catch (e: any) { flash(e?.message); } }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dl = async (blob: Blob, name: string) => { const { downloadBlob } = await import('@/lib/photo/exportPhoto'); downloadBlob(blob, name); };
  const exportPdf = async (mode: 'print' | 'template') => {
    setBusy(mode === 'print' ? 'Building the print PDF…' : 'Building the dieline template…');
    try {
      const { editorPdf } = await import('@/lib/packaging/editorPdf');
      const images: Record<string, { bytes: Uint8Array; png: boolean }> = {};
      for (const o of doc.objects) if (o.kind === 'image' && o.href) { const b = new Uint8Array(await (await fetch(o.href)).arrayBuffer()); images[o.id] = { bytes: b, png: /^data:image\/png/.test(o.href) }; }
      const missingText = doc.objects.filter((o) => o.kind === 'text' && !isHidden(o) && !textPaths[o.id]);
      if (missingText.length) throw new Error('A font is still loading — try again in a moment so all text can be outlined.');
      let cmyk: ((hex: string) => [number, number, number, number]) | undefined;
      try {
        const { loadCmykTable, makeCmykMapper } = await import('@/lib/color/cmyk');
        const m = makeCmykMapper(await loadCmykTable());
        cmyk = (hex: string) => { const h = hex.replace('#', ''), v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0'); return m(parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)); };
      } catch { /* plain conversion */ }
      let logoPng: Uint8Array | null = null;
      if (mode === 'template') { try { logoPng = new Uint8Array(await (await fetch('/logo.png')).arrayBuffer()); } catch { /* optional */ } }
      const bytes = await editorPdf({ doc, mode, cmyk, images, logoPng, textPaths: Object.fromEntries(Object.entries(textPaths).map(([k, v]) => [k, v.d])), board: `${grade.name}${range ? ` ${box.gsm} g/m²` : ''} · ${box.t} mm` });
      await dl(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${projectName()}-${mode === 'print' ? 'print' : 'dieline-template'}.pdf`);
      flash(mode === 'print' ? 'Print PDF saved: artwork in CMYK, text outlined, images embedded, die lines as overprinting spot colours.' : 'Dieline template saved.');
    } catch (e: any) { flash(e?.message || 'Export failed.'); } finally { setBusy(null); }
  };
  const exportDxf = async () => {
    const { pathToPolylines, writeDxf } = await import('@/lib/dxf');
    const { shapePath } = await import('@/lib/packaging/editorPdf');
    const vis = doc.objects.filter((o) => !isHidden(o) && o.line !== 'art');
    const layer = (k: LineType, name: string, color: number) => ({ name, color, polylines: vis.filter((o) => o.line === k).flatMap((o) => { const d = shapePath(o); return d ? pathToPolylines(d) : []; }) });
    const b = docBounds(doc);
    const txt = writeDxf([layer('cut', 'CUT', 6), layer('crease', 'CREASE', 5), layer('perf', 'PERF', 30), layer('glue', 'GLUE', 3)].filter((l) => l.polylines.length), b.y + b.h);
    await dl(new Blob([txt], { type: 'application/dxf' }), `${projectName()}.dxf`);
  };
  const previewSvg = () => {
    const b = docBounds(doc);
    const body = paintOrder(doc).filter((o) => !isHidden(o)).map((o) => objSvg(o, 0.4, textPaths[o.id]?.d)).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x - 5} ${b.y - 5} ${b.w + 10} ${b.h + 10}" width="${Math.round(b.w + 10)}mm" height="${Math.round(b.h + 10)}mm">${body}</svg>`;
  };
  const exportSvg = async () => dl(new Blob([previewSvg()], { type: 'image/svg+xml' }), `${projectName()}.svg`);
  const addImage = (f: File) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => { const c = unionBounds(doc.objects.filter((o) => o.line === 'cut').map(objBounds)) || { x: 0, y: 0, w: 100, h: 100 }; const w = Math.min(60, c.w / 2), h = w * (img.height / img.width); addObj({ name: f.name.replace(/\.\w+$/, ''), kind: 'image', x: r2(c.x + c.w / 2 - w / 2), y: r2(c.y + c.h / 2 - h / 2), w: r2(w), h: r2(h), line: 'art', href: rd.result as string }); };
      img.src = rd.result as string;
    };
    rd.readAsDataURL(f);
  };

  // ── keyboard ──
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === 'Space') { spaceDown.current = true; return; }
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? H.redo() : H.undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); H.redo(); return; }
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(e.shiftKey); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); setSel(doc.objects.filter((o) => !isHidden(o) && !isLocked(o)).map((o) => o.id)); return; }
      if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomAt(1.25); return; }
      if (mod && e.key === '-') { e.preventDefault(); zoomAt(0.8); return; }
      if (mod && e.key === '0') { e.preventDefault(); fit(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(); return; }
      if (e.key === 'Escape') { if (penPts.length) setPenPts([]); else setSel([]); setDraft(null); return; }
      if (e.key === 'Enter' && penPts.length) { finishPen(e.shiftKey); return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); const s = e.shiftKey ? 10 : 1; nudge(e.key === 'ArrowLeft' ? -s : e.key === 'ArrowRight' ? s : 0, e.key === 'ArrowUp' ? -s : e.key === 'ArrowDown' ? s : 0); return; }
      if (!mod) { const t = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase()); if (t) { setTool(t.id); setPenPts([]); } }
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') spaceDown.current = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  });

  // ── layers panel order: layers top first; objects top first inside each layer ──
  const panelOrder = useMemo(() => doc.layers.flatMap((l) => doc.objects.filter((o) => o.layer === l.id).slice().reverse().map((o) => o.id)), [doc]);
  const clickRow = (e: React.MouseEvent, id: string) => { const r = nextLayerSelection(panelOrder, sel, anchor, id, clickMods(e)); setSel(r.selection); setAnchor(r.anchor); };
  const layerPatch = (id: string, p: Partial<PkDoc['layers'][number]>) => commit((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  const moveLayer = (id: string, dir: -1 | 1) => commit((d) => { const a = [...d.layers], i = a.findIndex((l) => l.id === id), j = i + dir; if (j < 0 || j >= a.length) return d; [a[i], a[j]] = [a[j], a[i]]; return { ...d, layers: a }; });
  const [confirmLayer, setConfirmLayer] = useState<string | null>(null);

  const strokeFor = (o: PkObj) => (o.line === 'art' ? o.stroke : LINE_COLOURS[o.line]);
  const W = view.k; // px per mm
  const sel1 = selected.length === 1 ? selected[0] : null;
  const selB = unionBounds(selected.filter((o) => !isHidden(o)).map(objBounds));
  const cutB = unionBounds(doc.objects.filter((o) => o.line === 'cut' && !isHidden(o)).map(objBounds));
  const dieW = die.w, dieH = die.h;

  const field = 'h-8 w-full rounded-md border border-mt-border bg-mt-bg px-2 text-[12.5px]';
  const iconBtn = 'grid h-7 w-7 place-items-center rounded-md text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink disabled:opacity-35';

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-mt-bg text-mt-ink">
        {/* ── menu bar ── */}
        <header className="flex h-11 shrink-0 items-center gap-1 border-b border-mt-border bg-mt-surface px-2" aria-label="Menu bar">
          <Link href="/" aria-label="Magical Touch Design home" className="flex h-8 items-center rounded-md px-1.5 hover:bg-mt-surface2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme === 'dark' ? '/logo-white.png' : '/logo.png'} alt="" className="h-5 w-auto" />
          </Link>
          <span className="mx-1 h-5 w-px bg-mt-border" aria-hidden />
          <span className="hidden items-center gap-1.5 pr-1 text-[12.5px] font-semibold sm:flex"><Box size={15} /> Packaging Editor</span>
          <Menu label="File" items={[
            { label: 'New box', on: () => { if (doc.objects.some((o) => !o.gen)) { if (!window.confirm('Start a new box? Unsaved changes are lost.')) return; } H.reset(newDoc()); setSel([]); fitted.current = false; } },
            { label: 'Open project (.mtd)…', key: 'Ctrl O', on: () => fileInput.current?.click() },
            null,
            { label: 'Save', key: 'Ctrl S', on: () => save(false) },
            { label: 'Save as…', key: 'Ctrl ⇧ S', on: () => save(true) },
            null,
            { label: 'Download print PDF (outlined, embedded)', on: () => exportPdf('print') },
            { label: 'Download dieline template PDF (branded)', on: () => exportPdf('template') },
            { label: 'Download DXF for the die maker', on: exportDxf },
            { label: 'Download SVG', on: exportSvg },
          ]} />
          <Menu label="Edit" items={[
            { label: 'Undo', key: 'Ctrl Z', on: H.undo, disabled: !H.canUndo },
            { label: 'Redo', key: 'Ctrl Y', on: H.redo, disabled: !H.canRedo },
            null,
            { label: 'Duplicate', key: 'Ctrl D', on: dup, disabled: !sel.length },
            { label: 'Delete', key: 'Del', on: () => del(), disabled: !sel.length },
            { label: 'Select all', key: 'Ctrl A', on: () => setSel(doc.objects.filter((o) => !isHidden(o) && !isLocked(o)).map((o) => o.id)) },
            null,
            { label: 'Bring to front', on: () => order('top'), disabled: !sel.length },
            { label: 'Bring forward', on: () => order('up'), disabled: !sel.length },
            { label: 'Send backward', on: () => order('down'), disabled: !sel.length },
            { label: 'Send to back', on: () => order('bottom'), disabled: !sel.length },
          ]} />
          <Menu label="View" items={[
            { label: 'Zoom in', key: 'Ctrl +', on: () => zoomAt(1.25) },
            { label: 'Zoom out', key: 'Ctrl −', on: () => zoomAt(0.8) },
            { label: 'Fit to screen', key: 'Ctrl 0', on: fit },
            null,
            { label: `${grid ? '✓ ' : ''}Grid`, on: () => setGrid((g) => !g) },
            { label: `${snap ? '✓ ' : ''}Snap to grid and line ends`, on: () => setSnap((s) => !s) },
            { label: `${showBleed ? '✓ ' : ''}Bleed band`, on: () => setShowBleed((s) => !s) },
            { label: `${labels ? '✓ ' : ''}Panel names`, on: () => setLabels((s) => !s) },
          ]} />
          <input value={doc.name} onChange={(e) => live((d) => ({ ...d, name: e.target.value }))} aria-label="Project name" className="ml-2 h-8 w-40 min-w-0 rounded-md border border-transparent bg-transparent px-2 text-[12.5px] font-medium hover:border-mt-border focus:border-mt-ink/40 focus:outline-none sm:w-56" />
          <span className="flex-1" />
          <button type="button" onClick={H.undo} disabled={!H.canUndo} aria-label="Undo" className={iconBtn}><Undo2 size={15} /></button>
          <button type="button" onClick={H.redo} disabled={!H.canRedo} aria-label="Redo" className={iconBtn}><Redo2 size={15} /></button>
          <span className="mx-1 h-5 w-px bg-mt-border" aria-hidden />
          <button type="button" onClick={() => save(false)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-mt-border px-2.5 text-[12.5px] font-semibold hover:bg-mt-surface2"><Save size={14} /> <span className="hidden md:inline">Save .mtd</span></button>
          <Menu label="Export ▾" items={[
            { label: 'Print PDF — text outlined, images embedded', on: () => exportPdf('print') },
            { label: 'Dieline template PDF — branded sheet', on: () => exportPdf('template') },
            { label: 'DXF (CUT / CREASE / PERF / GLUE layers)', on: exportDxf },
            { label: 'SVG', on: exportSvg },
          ]} />
          <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'} className={iconBtn}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          <input ref={fileInput} type="file" accept=".mtd,application/octet-stream,application/gzip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
          <input ref={imgInput} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ''; }} />
        </header>

        <div className="flex min-h-0 flex-1">
          {/* ── tool strip ── */}
          <nav aria-label="Tools" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-mt-border bg-mt-surface py-2">
            {TOOLS.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTool(t.id); setPenPts([]); }} aria-label={`${t.label} (${t.key})`} title={`${t.label} (${t.key})`} aria-pressed={tool === t.id}
                className={`grid h-8 w-8 place-items-center rounded-md ${tool === t.id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink'}`}><t.icon size={16} /></button>
            ))}
            <button type="button" onClick={() => imgInput.current?.click()} aria-label="Place image" title="Place image (PNG or JPEG)" className="grid h-8 w-8 place-items-center rounded-md text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink"><ImageIcon size={16} /></button>
            <span className="my-1 h-px w-6 bg-mt-border" />
            <span className="text-[9px] font-semibold uppercase tracking-wide text-mt-faint">Line</span>
            {(['cut', 'crease', 'perf', 'glue', 'art'] as LineType[]).map((k) => (
              <button key={k} type="button" onClick={() => setDrawLine(k)} aria-pressed={drawLine === k} aria-label={`Draw as ${LINE_NAMES[k]}`} title={`New lines are: ${LINE_NAMES[k]}`}
                className={`grid h-7 w-8 place-items-center rounded-md ${drawLine === k ? 'bg-mt-surface2 ring-1 ring-mt-ink/40' : 'hover:bg-mt-surface2'}`}>
                <svg width="20" height="6" aria-hidden><line x1="1" y1="3" x2="19" y2="3" stroke={LINE_COLOURS[k]} strokeWidth="2" strokeDasharray={k === 'crease' ? '4 2' : k === 'perf' ? '1.5 1.5' : k === 'glue' ? '3 2' : undefined} /></svg>
              </button>
            ))}
          </nav>

          {/* ── left panel: Box / Layers ── */}
          <aside aria-label="Box and layers" className="flex w-[290px] shrink-0 flex-col border-r border-mt-border bg-mt-surface">
            <div className="flex shrink-0 border-b border-mt-border text-[12.5px] font-semibold" role="tablist">
              {(['box', 'layers'] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={leftTab === t} onClick={() => setLeftTab(t)} className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 ${leftTab === t ? 'border-b-2 border-mt-ink text-mt-ink' : 'text-mt-muted hover:text-mt-ink'}`}>
                  {t === 'box' ? <><Box size={14} /> Box</> : <><Layers size={14} /> Layers</>}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {leftTab === 'box' ? (
                <div className="space-y-4">
                  <section>
                    <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Style</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {BOX_STYLES.map((s) => (
                        <button key={s.id} type="button" onClick={() => setBox((b) => { const corr = s.group === 'Corrugated', was = gradeById(b.grade).family === 'corrugated'; const nb = { ...b, style: s.id }; return corr !== was ? withBoard(nb, corr ? 'bflute' : 'sbs', corr ? 0 : 350) : nb; })}
                          aria-pressed={box.style === s.id} title={s.hint}
                          className={`rounded-lg border p-1.5 text-left ${box.style === s.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border hover:border-mt-ink/40'}`}>
                          <span className="block text-mt-ink/80"><StyleThumb id={s.id} /></span>
                          <span className="block truncate text-[11px] font-semibold">{s.name}</span>
                          <span className="block truncate text-[10px] text-mt-faint">{s.code}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Product size (what goes inside)</p>
                      <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} aria-label="Units" className="h-6 rounded border border-mt-border bg-mt-bg px-1 text-[11px]"><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option></select>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['L', 'W', 'H'] as const).map((k) => <Num key={k} label={k === 'L' ? 'Length' : k === 'W' ? 'Width' : 'Height'} unit={unit} value={r2(box.product[k] / UNIT_K[unit])} min={0.1} onChange={(v) => setBox((b) => ({ ...b, product: { ...b.product, [k]: r2(v * UNIT_K[unit]) } }))} />)}
                    </div>
                    <p className="mt-2 text-[11px] text-mt-muted">Fitting gap added to each size (total)</p>
                    <div className="mt-1 grid grid-cols-3 gap-1.5">
                      {(['L', 'W', 'H'] as const).map((k) => <Num key={k} label={`+ ${k}`} value={box.clearance[k]} min={0} step={0.5} onChange={(v) => setBox((b) => ({ ...b, clearance: { ...b.clearance, [k]: v } }))} title="Packaging makers advise 2–3 mm over the product for folding boxes" />)}
                    </div>
                  </section>
                  <section className="space-y-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Board</p>
                    <select value={box.grade} onChange={(e) => { const g = gradeById(e.target.value), rg = gsmRange(g); setBox((b) => withBoard(b, g.id, rg ? Math.min(rg[1], Math.max(rg[0], b.gsm)) : b.gsm)); }} aria-label="Board" className={field}>{BOARD_GRADES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                    {range && (
                      <label className="block text-[11.5px]"><span className="text-mt-muted">Weight · {box.gsm} g/m²</span>
                        <input type="range" min={range[0]} max={range[1]} step={5} value={box.gsm} onChange={(e) => setBox((b) => withBoard(b, b.grade, Number(e.target.value)))} aria-label="Board weight" className="w-full" />
                      </label>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                      <Num label="Thickness" value={box.t} step={0.01} min={0.1} onChange={(v) => setBox({ t: v })} title={`From the ${grade.source}; type your own if you measured it`} />
                      <Num label="Glue flap" value={box.glue} min={0} onChange={(v) => setBox({ glue: v })} />
                      {(box.style === 'rte' || box.style === 'ste') && <Num label="Tuck depth" value={box.tuck} min={0} onChange={(v) => setBox({ tuck: v })} />}
                      {box.style === 'traylid' && <Num label="Lid depth" value={box.lidDepth} min={0} onChange={(v) => setBox({ lidDepth: v })} />}
                    </div>
                  </section>
                  <section className="rounded-lg border border-mt-border p-2.5 text-[12px]">
                    <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Worked out</p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 tabular-nums">
                      <dt className="text-mt-muted">Inside</dt><dd className="text-right font-semibold">{r2(inner.L)} × {r2(inner.W)} × {r2(inner.D)} mm</dd>
                      <dt className="text-mt-muted">Outside</dt><dd className="text-right">{r2(outer.L)} × {r2(outer.W)} × {r2(outer.D)} mm</dd>
                      <dt className="text-mt-muted">Flat blank</dt><dd className="text-right">{r2(dieW)} × {r2(dieH)} mm</dd>
                      <dt className="text-mt-muted">Knife / crease</dt><dd className="text-right">{r2(totals.cut / 1000)} m / {r2(totals.crease / 1000)} m</dd>
                      <dt className="text-mt-muted">Crease rule</dt><dd className="text-right">{crease.rulePt} pt · channel {crease.channelWidth} × {crease.channelDepth}</dd>
                    </dl>
                  </section>
                  <section>
                    <p className="mb-1.5 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Will it close?
                      <span className={`rounded-full px-2 py-0.5 text-[10px] normal-case tracking-normal ${report.level === 'ok' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : report.level === 'warn' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'}`}>{report.level === 'error' ? 'No' : report.level === 'warn' ? 'Yes, with notes' : 'Yes'}</span>
                    </p>
                    <ul className="space-y-1.5">
                      {report.checks.filter((c) => c.level !== 'ok').map((c) => (
                        <li key={c.id} className="text-[11.5px] leading-snug"><b className={c.level === 'error' ? 'text-rose-600' : 'text-amber-600'}>{c.title}.</b> <span className="text-mt-muted">{c.detail}</span>
                          {c.fix && <button type="button" onClick={() => setBox(c.fix as any)} className="ml-1 font-semibold underline-offset-2 hover:underline">Fix</button>}</li>
                      ))}
                      {report.checks.every((c) => c.level === 'ok') && <li className="text-[11.5px] text-mt-muted">All {report.checks.length} checks pass.</li>}
                    </ul>
                  </section>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { const id = newId('L'); commit((d) => ({ ...d, layers: [{ id, name: `Layer ${d.layers.length + 1}` }, ...d.layers] })); setActiveLayer(id); }} className="inline-flex h-7 items-center gap-1 rounded-md border border-mt-border px-2 text-[11.5px] font-semibold hover:bg-mt-surface2"><Plus size={13} /> Layer</button>
                    <span className="flex-1" />
                    <button type="button" onClick={() => order('up')} disabled={!sel.length} aria-label="Move selected up" title="Move up" className={iconBtn}><ArrowUp size={14} /></button>
                    <button type="button" onClick={() => order('down')} disabled={!sel.length} aria-label="Move selected down" title="Move down" className={iconBtn}><ArrowDown size={14} /></button>
                    <button type="button" onClick={dup} disabled={!sel.length} aria-label="Duplicate selected" title="Duplicate" className={iconBtn}><Copy size={14} /></button>
                    <button type="button" onClick={() => del()} disabled={!sel.length} aria-label="Delete selected" title="Delete" className={iconBtn}><Trash2 size={14} /></button>
                  </div>
                  {doc.layers.map((l, li) => {
                    const objs = doc.objects.filter((o) => o.layer === l.id).slice().reverse();
                    return (
                      <div key={l.id} className={`rounded-lg border ${activeLayer === l.id ? 'border-mt-ink/50' : 'border-mt-border'}`}>
                        <div className="flex items-center gap-0.5 bg-mt-surface2/60 px-1.5 py-1">
                          <button type="button" onClick={() => setActiveLayer(l.id)} className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold" title="New objects go on this layer">
                            <input value={l.name} onChange={(e) => layerPatch(l.id, { name: e.target.value })} aria-label="Layer name" className="w-full bg-transparent outline-none" onFocus={() => setActiveLayer(l.id)} />
                          </button>
                          <button type="button" onClick={() => moveLayer(l.id, -1)} disabled={li === 0} aria-label={`Move layer ${l.name} up`} className={iconBtn}><ArrowUp size={13} /></button>
                          <button type="button" onClick={() => moveLayer(l.id, 1)} disabled={li === doc.layers.length - 1} aria-label={`Move layer ${l.name} down`} className={iconBtn}><ArrowDown size={13} /></button>
                          <button type="button" onClick={() => layerPatch(l.id, { hidden: !l.hidden })} aria-label={l.hidden ? `Show layer ${l.name}` : `Hide layer ${l.name}`} className={iconBtn}>{l.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                          <button type="button" onClick={() => layerPatch(l.id, { locked: !l.locked })} aria-label={l.locked ? `Unlock layer ${l.name}` : `Lock layer ${l.name}`} className={iconBtn}>{l.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
                          {l.id !== DIE_LAYER && (confirmLayer === l.id
                            ? <button type="button" onClick={() => { commit((d) => ({ ...d, layers: d.layers.filter((x) => x.id !== l.id), objects: d.objects.filter((o) => o.layer !== l.id) })); setConfirmLayer(null); if (activeLayer === l.id) setActiveLayer(DRAW_LAYER); }} className="h-6 rounded bg-rose-600 px-1.5 text-[10.5px] font-semibold text-white">Delete {objs.length}?</button>
                            : <button type="button" onClick={() => (objs.length ? setConfirmLayer(l.id) : commit((d) => ({ ...d, layers: d.layers.filter((x) => x.id !== l.id) })))} aria-label={`Delete layer ${l.name}`} className={iconBtn}><Trash2 size={13} /></button>)}
                        </div>
                        <ul className="max-h-[260px] overflow-y-auto py-0.5">
                          {objs.map((o) => (
                            <li key={o.id} onClick={(e) => clickRow(e, o.id)} className={`group flex cursor-default items-center gap-1.5 px-2 py-0.5 text-[11.5px] ${sel.includes(o.id) ? 'bg-sky-100 dark:bg-sky-900/30' : 'hover:bg-mt-surface2'} ${o.hidden ? 'opacity-50' : ''}`}>
                              <svg width="14" height="8" aria-hidden className="shrink-0"><line x1="1" y1="4" x2="13" y2="4" stroke={o.line === 'art' ? (o.fill && o.fill !== 'none' ? o.fill : o.stroke || '#111') : LINE_COLOURS[o.line]} strokeWidth="2.5" strokeDasharray={DASH[o.line] ? '3 1.5' : undefined} /></svg>
                              <span className="min-w-0 flex-1 truncate">{o.name || o.kind}</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); patchObjs([o.id], () => ({ hidden: !o.hidden })); }} aria-label={o.hidden ? `Show ${o.name}` : `Hide ${o.name}`} className="grid h-5 w-5 place-items-center rounded text-mt-faint hover:text-mt-ink">{o.hidden ? <EyeOff size={11} /> : <Eye size={11} />}</button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); patchObjs([o.id], () => ({ locked: !o.locked })); }} aria-label={o.locked ? `Unlock ${o.name}` : `Lock ${o.name}`} className="grid h-5 w-5 place-items-center rounded text-mt-faint hover:text-mt-ink">{o.locked ? <Lock size={11} /> : <Unlock size={11} />}</button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); if (isLocked(o)) { flash('Unlock it (or its layer) to delete.'); return; } commit((d) => ({ ...d, objects: d.objects.filter((x) => x.id !== o.id) })); setSel((s) => s.filter((x) => x !== o.id)); }} aria-label={`Remove ${o.name}`} className="grid h-5 w-5 place-items-center rounded text-mt-faint hover:text-rose-600"><X size={11} /></button>
                            </li>
                          ))}
                          {!objs.length && <li className="px-2 py-1 text-[11px] text-mt-faint">Empty</li>}
                        </ul>
                      </div>
                    );
                  })}
                  <p className="text-[10.5px] leading-relaxed text-mt-faint">Click to select · Shift-click a range · Ctrl/⌘-click to add or remove. The box dieline is locked; unlock its layer to edit lines by hand (edited lines stay when the box is recalculated).</p>
                </div>
              )}
            </div>
          </aside>

          {/* ── canvas ── */}
          <main ref={wrapRef} className="relative min-w-0 flex-1 overflow-hidden bg-[#e9eaee] dark:bg-[#17181c]" aria-label="Canvas">
            <svg ref={svgRef} role="img" aria-label="Dieline canvas" className={`h-full w-full touch-none select-none ${tool === 'hand' || drag.current?.kind === 'pan' ? 'cursor-grab' : tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
              viewBox={`${view.x} ${view.y} ${(wrapRef.current?.clientWidth || 800) / W} ${(wrapRef.current?.clientHeight || 600) / W}`}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => setCursor(null)} onWheel={onWheel}
              onDoubleClick={() => { if (tool === 'pen') finishPen(false); }}>
              <defs>
                <pattern id="pk-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0 L0 0 0 10" fill="none" stroke={theme === 'dark' ? '#2a2c33' : '#d5d7de'} strokeWidth={1 / W} /></pattern>
              </defs>
              {grid && <rect x={view.x} y={view.y} width={(wrapRef.current?.clientWidth || 800) / W} height={(wrapRef.current?.clientHeight || 600) / W} fill="url(#pk-grid)" />}
              {cutB && <rect x={cutB.x - doc.bleed - 8} y={cutB.y - doc.bleed - 8} width={cutB.w + 2 * doc.bleed + 16} height={cutB.h + 2 * doc.bleed + 16} fill={theme === 'dark' ? '#202227' : '#ffffff'} stroke={theme === 'dark' ? '#33363e' : '#c9ccd4'} strokeWidth={1 / W} />}
              {showBleed && doc.objects.filter((o) => o.line === 'cut' && !isHidden(o)).map((o) => <path key={`b${o.id}`} d={pathFor(o)} fill="none" stroke="#9AD0F5" strokeOpacity={0.55} strokeWidth={doc.bleed * 2} strokeLinejoin="round" pointerEvents="none" />)}
              {paintOrder(doc).filter((o) => !isHidden(o)).map((o) => {
                const stroke = strokeFor(o), sw = o.line === 'art' ? (o.strokeW ?? 0) : 1.3 / W;
                const dash = DASH[o.line] ? DASH[o.line]!.split(' ').map((v) => Number(v) * (o.line === 'art' ? 1 : 1)).join(' ') : undefined;
                const common = { 'data-id': o.id, opacity: o.opacity ?? 1 } as any;
                const hit = <path d={pathFor(o, textPaths[o.id]?.d)} fill={o.kind === 'path' && o.line !== 'art' ? 'none' : 'transparent'} stroke="transparent" strokeWidth={10 / W} data-id={o.id} />;
                if (o.kind === 'image') return <g key={o.id} {...common}><image href={o.href} x={o.x} y={o.y} width={o.w} height={o.h} preserveAspectRatio="none" />{hit}</g>;
                if (o.kind === 'text') {
                  const tp = textPaths[o.id]?.d;
                  return <g key={o.id} {...common}>{tp ? <path d={tp} fill={o.fill || '#111'} fillRule="evenodd" /> : <text x={o.x} y={o.y + (o.size || 24) * 0.3528} fontSize={(o.size || 24) * 0.3528} fontFamily={o.font} fontWeight={o.weight} fill={o.fill}>{o.text}</text>}<rect x={o.x} y={o.y} width={o.w} height={Math.max(o.h, (o.size || 24) * 0.3528 * 1.2 * ((o.text || '').split('\n').length))} fill="transparent" data-id={o.id} /></g>;
                }
                const fill = o.line === 'art' ? (o.fill && o.fill !== 'none' ? o.fill : 'none') : 'none';
                return <g key={o.id} {...common}><path d={pathFor(o)} fill={fill} stroke={stroke || 'none'} strokeWidth={sw} strokeDasharray={o.line !== 'art' ? dash : undefined} strokeLinecap="round" strokeLinejoin="round" vectorEffect={o.line === 'art' ? undefined : 'non-scaling-stroke'} />{hit}</g>;
              })}
              {labels && !doc.layers.find((l) => l.id === DIE_LAYER)?.hidden && die.panels.filter((p) => p.w > 12 && p.h > 7).map((p, i) => <text key={i} x={p.x + 1.5} y={p.y + 4} fontSize={Math.min(4, p.h / 4)} fill={theme === 'dark' ? '#7c8090' : '#9aa0ad'} pointerEvents="none">{p.name}</text>)}
              {draft && <path d={pathFor(draft)} fill={draft.line === 'art' && draft.kind !== 'path' ? '#E5E7EB' : 'none'} stroke={draft.line === 'art' ? '#111827' : LINE_COLOURS[draft.line]} strokeWidth={1.5 / W} strokeDasharray={DASH[draft.line]} pointerEvents="none" />}
              {penPts.length > 0 && <polyline points={[...penPts, ...(cursor ? [snapTo(cursor)] : [])].map((p) => p.join(',')).join(' ')} fill="none" stroke={drawLine === 'art' ? '#111827' : LINE_COLOURS[drawLine]} strokeWidth={1.5 / W} strokeDasharray={DASH[drawLine]} pointerEvents="none" />}
              {penPts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3 / W} fill="#2563eb" pointerEvents="none" />)}
              {selB && (
                <g pointerEvents="none">
                  <rect x={selB.x} y={selB.y} width={Math.max(selB.w, 0.01)} height={Math.max(selB.h, 0.01)} fill="none" stroke="#2563eb" strokeWidth={1 / W} strokeDasharray={`${4 / W} ${3 / W}`} />
                </g>
              )}
              {sel1 && sel1.kind !== 'path' && !isLocked(sel1) && ['nw', 'ne', 'sw', 'se'].map((h) => (
                <rect key={h} data-handle={h} x={(h.includes('w') ? sel1.x : sel1.x + sel1.w) - 4 / W} y={(h.includes('n') ? sel1.y : sel1.y + sel1.h) - 4 / W} width={8 / W} height={8 / W} fill="#fff" stroke="#2563eb" strokeWidth={1.2 / W} className={h === 'nw' || h === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize'} />
              ))}
              {marquee && <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="rgba(37,99,235,0.08)" stroke="#2563eb" strokeWidth={1 / W} pointerEvents="none" />}
            </svg>
            <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border border-mt-border bg-mt-surface p-0.5 shadow-sm">
              <button type="button" onClick={() => zoomAt(0.8)} aria-label="Zoom out" className={iconBtn}><ZoomOut size={14} /></button>
              <span className="w-12 text-center text-[11.5px] tabular-nums">{Math.round((W / (96 / 25.4)) * 100)}%</span>
              <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in" className={iconBtn}><ZoomIn size={14} /></button>
              <button type="button" onClick={fit} aria-label="Fit to screen" className={iconBtn}><Maximize size={14} /></button>
            </div>
            {(msg || busy) && <div role="status" className="absolute left-1/2 top-3 max-w-[90%] -translate-x-1/2 rounded-lg bg-mt-ink px-3 py-1.5 text-[12px] text-mt-bg shadow-lg">{busy || msg}</div>}
            {tool === 'pen' && <div className="absolute left-3 top-3 rounded-md bg-mt-surface/95 px-2 py-1 text-[11px] text-mt-muted shadow-sm">Click to add points · Shift = 45° · double-click or Enter to finish · Shift+Enter closes · Esc cancels</div>}
          </main>

          {/* ── inspector ── */}
          <aside aria-label="Properties" className="w-[260px] shrink-0 overflow-y-auto border-l border-mt-border bg-mt-surface p-3 text-[12px]">
            {selected.length ? (
              <div className="space-y-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">{selected.length === 1 ? 'Selected' : `${selected.length} selected`}</p>
                {sel1 && <label className="block text-[11.5px]"><span className="text-mt-muted">Name</span><input value={sel1.name} onChange={(e) => patchObjs([sel1.id], () => ({ name: e.target.value }), false)} aria-label="Object name" className={field} /></label>}
                <label className="block text-[11.5px]"><span className="text-mt-muted">Line type</span>
                  <select value={sel1 ? sel1.line : ''} onChange={(e) => patchObjs(sel, (o) => ({ line: e.target.value as LineType, layer: e.target.value === 'art' && o.layer === DIE_LAYER ? ART_LAYER : o.layer, ...(e.target.value === 'art' && !o.stroke && !o.fill ? { stroke: '#111827', strokeW: 0.5 } : {}) }))} aria-label="Line type" className={field}>
                    {!sel1 && <option value="">Mixed</option>}
                    {(['cut', 'crease', 'perf', 'glue', 'art'] as LineType[]).map((k) => <option key={k} value={k}>{LINE_NAMES[k]}</option>)}
                  </select>
                </label>
                <label className="block text-[11.5px]"><span className="text-mt-muted">Layer</span>
                  <select value={sel1 ? sel1.layer : ''} onChange={(e) => patchObjs(sel, () => ({ layer: e.target.value }))} aria-label="Layer" className={field}>{!sel1 && <option value="">Mixed</option>}{doc.layers.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                </label>
                {selected.every((o) => o.line === 'art') && (
                  <div className="space-y-2 rounded-lg border border-mt-border p-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Colour</p>
                    {selected.some((o) => o.kind !== 'image') && <>
                      <div className="flex items-center gap-2"><span className="w-12 text-mt-muted">Fill</span><input type="color" value={sel1?.fill && sel1.fill !== 'none' ? sel1.fill : '#ffffff'} onChange={(e) => patchObjs(sel, () => ({ fill: e.target.value }))} aria-label="Fill colour" className="h-7 w-10 rounded border border-mt-border" /><input value={sel1?.fill || 'none'} onChange={(e) => patchObjs(sel, () => ({ fill: e.target.value }), false)} aria-label="Fill hex" className="h-7 min-w-0 flex-1 rounded border border-mt-border bg-mt-bg px-1.5 font-mono text-[11px]" /><button type="button" onClick={() => patchObjs(sel, () => ({ fill: 'none' }))} className="text-[11px] text-mt-muted hover:text-mt-ink">None</button></div>
                      <div className="flex items-center gap-2"><span className="w-12 text-mt-muted">Stroke</span><input type="color" value={sel1?.stroke && sel1.stroke !== 'none' ? sel1.stroke : '#000000'} onChange={(e) => patchObjs(sel, (o) => ({ stroke: e.target.value, strokeW: o.strokeW || 0.5 }))} aria-label="Stroke colour" className="h-7 w-10 rounded border border-mt-border" /><Num label="Width" value={sel1?.strokeW ?? 0} step={0.1} min={0} onChange={(v) => patchObjs(sel, () => ({ strokeW: v }))} /></div>
                    </>}
                    <label className="block text-[11.5px]"><span className="text-mt-muted">Opacity · {Math.round((sel1?.opacity ?? 1) * 100)}%</span><input type="range" min={0} max={1} step={0.05} value={sel1?.opacity ?? 1} onChange={(e) => patchObjs(sel, () => ({ opacity: Number(e.target.value) }), false)} aria-label="Opacity" className="w-full" /></label>
                  </div>
                )}
                {sel1 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <Num label="X" value={r2(objBounds(sel1).x)} onChange={(v) => patchObjs([sel1.id], (o) => ({ x: r2(o.x + v - objBounds(o).x) }))} />
                    <Num label="Y" value={r2(objBounds(sel1).y)} onChange={(v) => patchObjs([sel1.id], (o) => ({ y: r2(o.y + v - objBounds(o).y) }))} />
                    {sel1.kind !== 'path' && <><Num label="Width" value={sel1.w} min={0.5} onChange={(v) => patchObjs([sel1.id], () => ({ w: v }))} /><Num label="Height" value={sel1.h} min={0.5} onChange={(v) => patchObjs([sel1.id], () => ({ h: v }))} /></>}
                    {sel1.kind === 'path' && <p className="col-span-2 text-[11px] text-mt-muted">Size {r2(objBounds(sel1).w)} × {r2(objBounds(sel1).h)} mm</p>}
                  </div>
                )}
                {sel1?.kind === 'text' && (
                  <div className="space-y-2 rounded-lg border border-mt-border p-2">
                    <textarea value={sel1.text} onChange={(e) => patchObjs([sel1.id], () => ({ text: e.target.value }), false)} rows={2} aria-label="Text" className="w-full rounded-md border border-mt-border bg-mt-bg p-1.5 text-[12.5px]" />
                    <select value={sel1.font} onChange={(e) => patchObjs([sel1.id], () => ({ font: e.target.value }))} aria-label="Font" className={field}>{FONTS.map((f) => <option key={f}>{f}</option>)}</select>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Num label="Size" unit="pt" value={sel1.size || 18} min={1} step={1} onChange={(v) => patchObjs([sel1.id], () => ({ size: v }))} />
                      <label className="block text-[11.5px]"><span className="text-mt-muted">Weight</span><select value={sel1.weight || 400} onChange={(e) => patchObjs([sel1.id], () => ({ weight: Number(e.target.value) }))} aria-label="Weight" className={field}>{[300, 400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}</select></label>
                    </div>
                    <div className="flex gap-1">{(['left', 'center', 'right'] as const).map((a) => <button key={a} type="button" onClick={() => patchObjs([sel1.id], () => ({ align: a }))} aria-pressed={sel1.align === a} className={`h-7 flex-1 rounded-md border text-[11px] capitalize ${sel1.align === a ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border'}`}>{a}</button>)}</div>
                    <p className="text-[10.5px] text-mt-faint">Shown and printed as the real font outline.</p>
                  </div>
                )}
                {cutB && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => { const b = selB!; patchObjs(sel.filter((id) => !isLocked(doc.objects.find((o) => o.id === id)!)), (o) => ({ x: r2(o.x + (cutB.x + cutB.w / 2) - (b.x + b.w / 2)) })); }} className="h-7 flex-1 rounded-md border border-mt-border text-[11px] hover:bg-mt-surface2">Centre across</button>
                    <button type="button" onClick={() => { const b = selB!; patchObjs(sel.filter((id) => !isLocked(doc.objects.find((o) => o.id === id)!)), (o) => ({ y: r2(o.y + (cutB.y + cutB.h / 2) - (b.y + b.h / 2)) })); }} className="h-7 flex-1 rounded-md border border-mt-border text-[11px] hover:bg-mt-surface2">Centre down</button>
                  </div>
                )}
                <div className="flex gap-1">
                  <button type="button" onClick={dup} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-mt-border text-[11.5px] font-semibold hover:bg-mt-surface2"><Copy size={13} /> Duplicate</button>
                  <button type="button" onClick={() => del()} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-rose-300 text-[11.5px] font-semibold text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Document</p>
                <Num label="Bleed" value={doc.bleed} min={0} step={0.5} onChange={(v) => commit((d) => ({ ...d, bleed: v }))} />
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11.5px] tabular-nums">
                  {(['cut', 'crease', 'perf', 'glue'] as LineType[]).map((k) => <Fragment key={k}><dt className="flex items-center gap-1.5 text-mt-muted"><span className="inline-block h-0.5 w-3" style={{ background: LINE_COLOURS[k] }} />{LINE_NAMES[k]}</dt><dd className="text-right">{r2(totals[k] / 1000)} m</dd></Fragment>)}
                </dl>
                <div className="space-y-1.5 rounded-lg border border-mt-border p-2 text-[11.5px] text-mt-muted">
                  <p className="font-semibold text-mt-ink">Downloads</p>
                  <button type="button" onClick={() => save(false)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-mt-surface2"><Save size={13} /> Project file (.mtd) — opens again here</button>
                  <button type="button" onClick={() => exportPdf('print')} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-mt-surface2"><FileDown size={13} /> Print PDF — outlined text, embedded images</button>
                  <button type="button" onClick={() => exportPdf('template')} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-mt-surface2"><Download size={13} /> Dieline template — branded sheet</button>
                  <button type="button" onClick={exportDxf} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-mt-surface2"><Download size={13} /> DXF for the die maker</button>
                  <button type="button" onClick={() => fileInput.current?.click()} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-mt-surface2"><FolderOpen size={13} /> Open a project…</button>
                </div>
                <div className="space-y-1 text-[11px] leading-relaxed text-mt-faint">
                  <p><b className="text-mt-muted">Shortcuts</b> · V select · H pan (or hold Space) · L line · P polyline · R rectangle · E ellipse · T text · arrows nudge 1 mm (Shift 10) · Ctrl+wheel zoom · Alt while drawing = no snap.</p>
                  <p>Installed as an app from Chrome or Edge, double-clicking a .mtd file opens it here in the browser.</p>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── status bar ── */}
        <footer aria-label="Status bar" className="flex h-7 shrink-0 items-center gap-4 border-t border-mt-border bg-mt-surface px-3 text-[11px] text-mt-muted tabular-nums">
          <span>{TOOLS.find((t) => t.id === tool)?.label}{tool !== 'select' && tool !== 'hand' ? ` · ${LINE_NAMES[drawLine]}` : ''}</span>
          <span>{cursor ? `X ${cursor[0]}  Y ${cursor[1]} mm` : '—'}</span>
          <span>{sel.length ? `${sel.length} selected` : `${doc.objects.length} objects`}</span>
          <span className="hidden md:inline">Inside {r2(inner.L)} × {r2(inner.W)} × {r2(inner.D)} mm · blank {r2(dieW)} × {r2(dieH)} mm</span>
          <span className="flex-1" />
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Runs on this device · files are not uploaded</span>
        </footer>
      </div>
    </div>
  );
}

/** Path data for any object in absolute mm (text uses its outline when ready). */
function pathFor(o: PkObj, textD?: string): string {
  if (o.kind === 'rect' || o.kind === 'image' || (o.kind === 'text' && !textD)) return `M${o.x} ${o.y} H${o.x + o.w} V${o.y + o.h} H${o.x} Z`;
  if (o.kind === 'text') return textD!;
  if (o.kind === 'ellipse') { const rx = o.w / 2, ry = o.h / 2; return `M${o.x} ${o.y + ry} A${rx} ${ry} 0 1 0 ${o.x + o.w} ${o.y + ry} A${rx} ${ry} 0 1 0 ${o.x} ${o.y + ry} Z`; }
  if (!o.d) return '';
  return o.x || o.y ? `${o.d}`.replace(/([MLCQ])([^MLCQZHVA]*)/g, (_m, c: string, a: string) => c + (a.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map((q, i) => Number(q) + (i % 2 ? o.y : o.x)).join(' ') + ' ') : o.d;
}

/** One object as SVG markup (for the saved preview and the SVG download). */
function objSvg(o: PkObj, lw: number, textD?: string): string {
  const col = o.line === 'art' ? (o.stroke || 'none') : LINE_COLOURS[o.line];
  if (o.kind === 'image') return `<image href="${o.href}" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/>`;
  const d = pathFor(o, textD);
  const fill = o.line === 'art' ? (o.kind === 'text' ? o.fill || '#111' : o.fill || 'none') : 'none';
  const dash = DASH[o.line] ? ` stroke-dasharray="${DASH[o.line]}"` : '';
  const sw = o.line === 'art' ? (o.strokeW ?? 0) : lw;
  return `<path d="${d}" fill="${fill}"${o.kind === 'text' ? ' fill-rule="evenodd"' : ''} stroke="${col}" stroke-width="${sw}"${dash}${o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : ''}/>`;
}
