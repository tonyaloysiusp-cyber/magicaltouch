'use client';

// Textile print studio — design directly on the flat print pieces.
//
// The print file is the design: front, back, sleeves and collar laid out
// flat at real size (size M, millimetres). Shapes, vector motifs, text in
// the editor's fonts (shown and printed from the font's own curves), names
// and numbers from the roster ({NAME}, {NUMBER}), pictures and logos,
// gradient and pattern fills. One element can run across pieces. Save
// sends the artwork to the garment, and the mockup (preview only) updates.
//
// Layout: top toolbar (save, undo, redo, zoom, preview player), left panel
// (add: text, names & numbers, shapes, logos, patterns, templates), centre
// canvas, right panel (properties, colours, size, placement, layers),
// bottom view bar (front, back, sleeves, all pieces).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Image as ImageIcon, Lock, Maximize2, Redo2, Save, Shapes, Square, Trash2, Type, Undo2, Unlock, X, ZoomIn, ZoomOut, Hash, Palette, LayoutTemplate } from 'lucide-react';
import { boardLayout, layoutText, mulM, artFonts, type ArtEl, type Board, type Fill, type Mat } from '@/lib/textile/art';
import { ensureFonts, shiftPath, shaper } from '@/lib/textile/fonts';
import { kitProduct, pieceMarkup, type KitDesign, type Player, type Glyphs } from '@/lib/teamKit';
import { MOTIFS, tileSvg, layout as patLayout, type PatternSettings } from '@/lib/patterns';
import { MOTIF_CATEGORIES } from '@/lib/patternMotifs';
import { PATTERN_FONTS } from '@/lib/patternText';
import type { Asset } from '@/lib/assets/library';

const uid = () => `el_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const T = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const isPathish = (el: ArtEl) => el.kind === 'path' || el.kind === 'text';

export interface PrintStudioProps {
  kit: KitDesign;
  pattern: PatternSettings;
  glyphs: Glyphs;
  players: Player[];
  libraryPatterns: Asset[];
  onSave: (art: ArtEl[], studioOnly: boolean) => void;
  onClose: () => void;
}

export function PrintStudio({ kit, pattern, glyphs, players, libraryPatterns, onSave, onClose }: PrintStudioProps) {
  const product = useMemo(() => kitProduct(kit), [kit]);
  const board: Board = useMemo(() => boardLayout(product), [product]);
  const [art, setArtState] = useState<ArtEl[]>(() => JSON.parse(JSON.stringify(kit.art || [])));
  const [studioOnly, setStudioOnly] = useState<boolean>(!!kit.studioOnly);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<'text' | 'shapes' | 'images' | 'patterns' | 'templates'>('text');
  const [shapeCat, setShapeCat] = useState<string>('Basic');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [zoomPct, setZoomPct] = useState(100);
  const [dirty, setDirty] = useState(false);
  const [fontMsg, setFontMsg] = useState<string | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const hist = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const host = useRef<HTMLDivElement>(null);
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fc = useRef<any>(null);
  const F = useRef<any>(null);
  const objs = useRef(new Map<string, { json: string; obj: any }>());
  const bgCount = useRef(0);
  const artRef = useRef(art); artRef.current = art;
  const imgFile = useRef<HTMLInputElement>(null);
  const player = players[Math.min(previewIdx, players.length - 1)] || { name: 'NAME', number: '10', size: 'M' };
  const vars = useMemo(() => ({ name: player.name || 'NAME', number: player.number || '10', size: player.size || 'M', team: kit.teamName }), [player, kit.teamName]);

  // ---- history
  const setArt = useCallback((next: ArtEl[] | ((a: ArtEl[]) => ArtEl[]), record = true) => {
    setArtState((cur) => {
      const n = typeof next === 'function' ? (next as any)(cur) : next;
      if (record) { hist.current.past.push(JSON.stringify(cur)); if (hist.current.past.length > 100) hist.current.past.shift(); hist.current.future = []; }
      return n;
    });
    setDirty(true);
  }, []);
  const undo = () => { const p = hist.current.past.pop(); if (p == null) return; hist.current.future.push(JSON.stringify(artRef.current)); setArtState(JSON.parse(p)); setDirty(true); };
  const redo = () => { const f = hist.current.future.pop(); if (f == null) return; hist.current.past.push(JSON.stringify(artRef.current)); setArtState(JSON.parse(f)); setDirty(true); };
  const update = (id: string, o: Partial<ArtEl>) => setArt((a) => a.map((e) => (e.id === id ? ({ ...e, ...o } as ArtEl) : e)));

  // ---- fonts used by the artwork (exact outlines need the font files)
  useEffect(() => {
    let live = true;
    ensureFonts(artFonts(art)).then((failed) => { if (!live) return; setFontMsg(failed.length ? `Could not load: ${failed.join(', ')} — shown in a fallback until it loads.` : null); setFontTick((t) => t + 1); });
    return () => { live = false; };
  }, [art]);

  // ---- canvas set-up
  useEffect(() => {
    let disposed = false;
    (async () => {
      const mod: any = await import('fabric');
      if (disposed) return;
      F.current = mod.fabric;
      const c = new mod.fabric.Canvas(canvasEl.current, { preserveObjectStacking: true, backgroundColor: '#E5E7EB', selection: true, stopContextMenu: true, fireRightClick: false });
      fc.current = c;
      const resize = () => { const r = host.current!.getBoundingClientRect(); c.setWidth(Math.max(200, r.width)); c.setHeight(Math.max(200, r.height)); c.requestRenderAll(); };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(host.current!);
      (c as any).__ro = ro;
      c.on('selection:created', (e: any) => setSel(e.selected?.length === 1 ? e.selected[0].__id || null : null));
      c.on('selection:updated', (e: any) => setSel(c.getActiveObjects().length === 1 ? c.getActiveObject()?.__id || null : null));
      c.on('selection:cleared', () => setSel(null));
      c.on('object:modified', () => captureAll());
      // Zoom with Ctrl/⌘ + wheel or pinch; scroll to pan.
      c.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent;
        if (e.ctrlKey || e.metaKey) {
          let z = c.getZoom() * Math.pow(0.999, e.deltaY);
          z = Math.max(0.05, Math.min(20, z));
          c.zoomToPoint({ x: e.offsetX, y: e.offsetY }, z);
          setZoomPct(Math.round(z * 100 / baseZoom()));
        } else {
          const vt = c.viewportTransform; vt[4] -= e.deltaX; vt[5] -= e.deltaY; c.setViewportTransform(vt);
        }
        e.preventDefault(); e.stopPropagation();
      });
      // Drag empty space with Space held (or middle button) to pan.
      let panning = false, last = { x: 0, y: 0 };
      c.on('mouse:down', (opt: any) => { const e = opt.e as MouseEvent; if (spaceDown.current || e.button === 1) { panning = true; c.selection = false; last = { x: e.clientX, y: e.clientY }; } });
      c.on('mouse:move', (opt: any) => { if (!panning) return; const e = opt.e as MouseEvent; const vt = c.viewportTransform; vt[4] += e.clientX - last.x; vt[5] += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; c.setViewportTransform(vt); });
      c.on('mouse:up', () => { panning = false; c.selection = true; });
      await drawBoard();
      fit('all');
      await sync();
    })();
    return () => { disposed = true; try { (fc.current as any)?.__ro?.disconnect(); fc.current?.dispose(); } catch { /* ignore */ } fc.current = null; objs.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spaceDown = useRef(false);
  const baseZoom = () => { const c = fc.current; if (!c) return 1; return Math.min((c.getWidth() - 60) / (board.w + 80), (c.getHeight() - 60) / (board.h + 80)); };
  const fit = (what: 'all' | 'front' | 'back' | 'sleeves') => {
    const c = fc.current; if (!c) return;
    let box = { x: -40, y: -40, w: board.w + 80, h: board.h + 80 };
    const bp = (id: string) => board.pieces.find((p) => p.piece.id === id);
    if (what === 'front' || what === 'back') { const p = bp(what); if (p) box = { x: p.x - 30, y: p.y - 30, w: p.piece.w + 60, h: p.piece.h + 60 }; }
    if (what === 'sleeves') { const ps = board.pieces.filter((p) => p.piece.id.startsWith('sleeve')); if (ps.length) { const x0 = Math.min(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y)), x1 = Math.max(...ps.map((p) => p.x + p.piece.w)), y1 = Math.max(...ps.map((p) => p.y + p.piece.h)); box = { x: x0 - 30, y: y0 - 30, w: x1 - x0 + 60, h: y1 - y0 + 60 }; } }
    const z = Math.min((c.getWidth() - 40) / box.w, (c.getHeight() - 40) / box.h);
    c.setViewportTransform([z, 0, 0, z, (c.getWidth() - box.w * z) / 2 - box.x * z, (c.getHeight() - box.h * z) / 2 - box.y * z]);
    setZoomPct(Math.round((z / baseZoom()) * 100));
  };
  const zoomBy = (k: number) => { const c = fc.current; if (!c) return; const z = Math.max(0.05, Math.min(20, c.getZoom() * k)); c.zoomToPoint({ x: c.getWidth() / 2, y: c.getHeight() / 2 }, z); setZoomPct(Math.round((z / baseZoom()) * 100)); };

  // ---- board (the flat pieces with the garment's base colours) — not selectable
  const drawBoard = useCallback(async () => {
    const c = fc.current, Fb = F.current; if (!c || !Fb) return;
    c.getObjects().filter((o: any) => o.__bg).forEach((o: any) => c.remove(o));
    const base = { ...kit, art: [] as ArtEl[], studioOnly };
    const bgs: any[] = [];
    for (const bp of board.pieces) {
      const p = bp.piece;
      const inner = pieceMarkup(p, base, pattern, player, glyphs, 1, 0, 'live');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${p.w * 2}" height="${p.h * 2}" viewBox="0 0 ${p.w} ${p.h}">${p.mirror ? `<g transform="translate(${p.w} 0) scale(-1 1)">${inner}</g>` : inner}</svg>`;
      const img: any = await new Promise((res) => Fb.Image.fromURL(svgUrl(svg), (o: any) => res(o)));
      if (!img) continue;
      img.set({ left: bp.x, top: bp.y, scaleX: p.w / img.width, scaleY: p.h / img.height, selectable: false, evented: false, objectCaching: false });
      img.__bg = true; bgs.push(img);
      const outline = new Fb.Path(p.d, { left: bp.x, top: bp.y, fill: '', stroke: '#64748B', strokeWidth: 1.2, strokeDashArray: [6, 4], selectable: false, evented: false, objectCaching: false, flipX: !!p.mirror });
      outline.__bg = true; bgs.push(outline);
      const lab = new Fb.Text(`${p.label} · ${p.w} × ${p.h} mm`, { left: bp.x, top: bp.y - 26, fontSize: 18, fill: '#475569', fontFamily: 'Arial', selectable: false, evented: false });
      lab.__bg = true; bgs.push(lab);
    }
    bgs.forEach((o, i) => { c.insertAt(o, i, false); });
    bgCount.current = bgs.length;
    c.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit, pattern, board, player, glyphs, studioOnly]);
  useEffect(() => { drawBoard(); }, [drawBoard]);

  // ---- model → fabric
  const fillFor = useCallback(async (f: Fill | null | undefined, obj: any) => {
    const Fb = F.current;
    if (!f) return '';
    if (typeof f === 'string') return f;
    if (f.type === 'linear' || f.type === 'radial') {
      const a = ((f.angle ?? 90) * Math.PI) / 180;
      const coords = f.type === 'radial' ? { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 } : { x1: 0.5 - Math.cos(a) / 2, y1: 0.5 - Math.sin(a) / 2, x2: 0.5 + Math.cos(a) / 2, y2: 0.5 + Math.sin(a) / 2 };
      return new Fb.Gradient({ type: f.type, gradientUnits: 'percentage', coords, colorStops: f.stops.map(([offset, color]) => ({ offset, color })) });
    }
    // Pattern fill: one seamless tile as a repeating picture on screen (the print file draws the vector motifs).
    const pf = f as Extract<Fill, { type: 'pattern' }>;
    const tile = tileSvg({ ...pf.pattern, background: pf.bg !== undefined ? (pf.bg || 'transparent') : pf.pattern.background });
    const img: HTMLImageElement = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = svgUrl(tile); });
    const { w: tw } = patLayout(pf.pattern);
    const s = pf.tileMm / tw;
    return new Fb.Pattern({ source: img, repeat: 'repeat', patternTransform: [s, 0, 0, s, 0, 0], offsetX: obj ? -obj.width / 2 : 0, offsetY: 0 });
  }, []);

  const textD = (el: Extract<ArtEl, { kind: 'text' }>) => {
    const L = layoutText(el, { vars, shaper });
    // layoutText draws each line with translate(); bake the moves (and the squeeze) into one path for the canvas.
    const parts = [...L.d.matchAll(/<path d="([^"]*)" transform="translate\(([-\d.]+) ([-\d.]+)\)"\/>/g)].map((m) => shiftPath(m[1], Number(m[2]) * L.sx, Number(m[3]), L.sx));
    return { d: parts.join(''), L };
  };

  const build = useCallback(async (el: ArtEl): Promise<any> => {
    const Fb = F.current;
    const common = { originX: 'center', originY: 'center', objectCaching: false, opacity: el.opacity ?? 1, visible: !el.hidden, selectable: !el.locked, evented: !el.locked, paintFirst: 'stroke', strokeUniform: false, transparentCorners: false, cornerColor: '#3B82C4', borderColor: '#3B82C4', cornerSize: 10 };
    let o: any;
    if (el.kind === 'rect') o = new Fb.Rect({ ...common, width: el.w, height: el.h, rx: el.rx || 0, ry: el.rx || 0 });
    else if (el.kind === 'ellipse') o = new Fb.Ellipse({ ...common, rx: el.rx, ry: el.ry });
    else if (el.kind === 'path') o = new Fb.Path(el.d, { ...common, fillRule: el.rule || 'nonzero' });
    else if (el.kind === 'image') { o = await new Promise((res) => Fb.Image.fromURL(el.src, (i: any) => res(i), { crossOrigin: 'anonymous' })); o.set({ ...common, width: el.w, height: el.h }); }
    else {
      const { d } = textD(el);
      if (d) o = new Fb.Path(d, { ...common });
      else o = new Fb.Text(el.text || ' ', { ...common, fontFamily: el.font, fontWeight: el.weight, fontSize: el.size }); // until the font file arrives
    }
    if ('fill' in el) o.set('fill', await fillFor((el as any).fill, o));
    if ('stroke' in el && (el as any).stroke && (el as any).strokeW) o.set({ stroke: (el as any).stroke, strokeWidth: (el as any).strokeW, strokeLineJoin: 'round' });
    const pathOff = o.pathOffset && isPathish(el) ? [o.pathOffset.x, o.pathOffset.y] : [0, 0];
    Fb.util.applyTransformToObject(o, mulM(el.m, T(pathOff[0], pathOff[1])));
    o.__id = el.id; o.__kind = el.kind;
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vars, fillFor, fontTick]);

  const syncing = useRef(false);
  const sync = useCallback(async () => {
    const c = fc.current; if (!c || syncing.current) return;
    syncing.current = true;
    try {
      const want = artRef.current;
      const active = c.getActiveObjects().map((o: any) => o.__id);
      const ids = new Set(want.map((e) => e.id));
      for (const [id, v] of objs.current) if (!ids.has(id)) { c.remove(v.obj); objs.current.delete(id); }
      for (const el of want) {
        const json = JSON.stringify(el) + (el.kind === 'text' ? `|${JSON.stringify(vars)}|${fontTick}` : '');
        const have = objs.current.get(el.id);
        if (have && have.json === json) continue;
        const o = await build(el);
        if (have) c.remove(have.obj);
        c.add(o);
        objs.current.set(el.id, { json, obj: o });
      }
      want.forEach((el, i) => { const v = objs.current.get(el.id); if (v) c.moveTo(v.obj, bgCount.current + i); });
      if (active.length === 1) { const v = objs.current.get(active[0]); if (v && c.getActiveObject() !== v.obj) c.setActiveObject(v.obj); }
      c.requestRenderAll();
    } finally { syncing.current = false; }
  }, [build, vars, fontTick]);
  useEffect(() => { sync(); }, [art, sync]);

  // ---- fabric → model (after a move / resize / rotate)
  const captureAll = () => {
    const c = fc.current; if (!c) return;
    const changed = new Map<string, Mat>();
    for (const [id, v] of objs.current) {
      const o = v.obj;
      // Objects inside an active selection report their matrix relative to the group.
      const m: number[] = o.group ? F.current.util.multiplyTransformMatrices(o.group.calcTransformMatrix(), o.calcTransformMatrix()) : o.calcTransformMatrix();
      const el = artRef.current.find((e) => e.id === id); if (!el) continue;
      const pathOff = o.pathOffset && isPathish(el) ? [o.pathOffset.x, o.pathOffset.y] : [0, 0];
      const mm = mulM(m as Mat, T(-pathOff[0], -pathOff[1])).map((n) => Math.round(n * 10000) / 10000) as Mat;
      if (mm.some((n, i) => Math.abs(n - el.m[i]) > 1e-4)) changed.set(id, mm);
    }
    if (!changed.size) return;
    setArt((a) => a.map((e) => (changed.has(e.id) ? { ...e, m: changed.get(e.id)! } : e)));
    // Keep the cached json in step so the moved object is not rebuilt.
    for (const [id, m] of changed) { const v = objs.current.get(id); const el = artRef.current.find((e) => e.id === id); if (v && el) v.json = JSON.stringify({ ...el, m }) + (el.kind === 'text' ? `|${JSON.stringify(vars)}|${fontTick}` : ''); }
  };

  // ---- adding elements
  const centreOf = (pieceId = 'front'): [number, number] => {
    const bp = board.pieces.find((p) => p.piece.id === pieceId) || board.pieces[0];
    return [bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.42];
  };
  const add = (el: Omit<ArtEl, 'id'>, select = true) => {
    const id = uid();
    setArt((a) => [...a, { ...(el as any), id }]);
    if (select) setTimeout(() => { const v = objs.current.get(id); if (v && fc.current) { fc.current.setActiveObject(v.obj); fc.current.requestRenderAll(); setSel(id); } }, 250);
  };
  const addText = (text: string, opts: Partial<Extract<ArtEl, { kind: 'text' }>> = {}, piece = 'front') => {
    const [x, y] = centreOf(piece);
    add({ kind: 'text', text, font: kit.font || 'Oswald', weight: kit.fontWeight || 700, size: 60, fill: kit.nameColor || '#FFFFFF', align: 'center', upper: false, m: T(x, y), name: text, ...opts } as any);
  };
  const addShape = (d: string, label: string) => {
    const [x, y] = centreOf();
    add({ kind: 'path', d, w: 100, h: 100, rule: 'evenodd', fill: kit.accent || '#C9A86A', m: [1.4, 0, 0, 1.4, x, y], name: label } as any);
  };
  const addImage = async (f: File) => {
    const url: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
    const img = new Image(); img.src = url; await img.decode().catch(() => {});
    const w = img.naturalWidth || 500, h = img.naturalHeight || 500;
    const k = 120 / Math.max(w, h); // 120 mm on the longest side to start
    const [x, y] = centreOf();
    add({ kind: 'image', src: url, w, h, m: [k, 0, 0, k, x, y - 120], name: f.name.replace(/\.[^.]+$/, '') } as any);
  };
  const addPatternPanel = (p: PatternSettings, name: string, assetId?: string) => {
    const bp = board.pieces.find((q) => q.piece.id === 'front')!;
    add({ kind: 'rect', w: bp.piece.w + 20, h: bp.piece.h + 20, fill: { type: 'pattern', pattern: p, tileMm: 70, assetId, name }, opacity: 1, m: T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h / 2), name: `Pattern · ${name}` } as any);
  };
  const template = (id: string) => {
    const els: Omit<ArtEl, 'id'>[] = [];
    const A = kit.accent || '#C9A86A', B = kit.accent2 || '#FFFFFF';
    const body = board.pieces.filter((p) => p.piece.id === 'front' || p.piece.id === 'back');
    const back = board.pieces.find((p) => p.piece.id === 'back');
    if (id === 'sash') for (const bp of body) els.push({ kind: 'rect', w: bp.piece.w * 1.9, h: bp.piece.w * 0.24, fill: A, m: mulM(T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.48), rotM(bp.piece.id === 'back' ? 38 : -38)), name: 'Sash' } as any);
    if (id === 'hoops') for (const bp of body) for (let y = bp.piece.h * 0.16; y < bp.piece.h; y += bp.piece.h / 5) els.push({ kind: 'rect', w: bp.piece.w + 40, h: bp.piece.h / 10, fill: A, m: T(bp.x + bp.piece.w / 2, bp.y + y + bp.piece.h / 20), name: 'Hoop' } as any);
    if (id === 'stripes') for (const bp of body) for (let x = bp.piece.w / 18; x < bp.piece.w; x += bp.piece.w / 4.5) els.push({ kind: 'rect', w: bp.piece.w / 9, h: bp.piece.h + 40, fill: A, m: T(bp.x + x + bp.piece.w / 18, bp.y + bp.piece.h / 2), name: 'Stripe' } as any);
    if (id === 'sides') for (const bp of body) for (const sx of [0.065, 0.935]) els.push({ kind: 'rect', w: bp.piece.w * 0.13 + 20, h: bp.piece.h + 40, fill: A, m: T(bp.x + bp.piece.w * sx, bp.y + bp.piece.h / 2), name: 'Side panel' } as any);
    if (id === 'fade') for (const bp of body) els.push({ kind: 'rect', w: bp.piece.w + 40, h: bp.piece.h * 0.55, fill: { type: 'linear', stops: [[0, A + '00'], [1, A]], angle: 90 }, m: T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.75), name: 'Gradient fade' } as any);
    if (id === 'chevron') for (const bp of body) els.push({ kind: 'path', d: 'M-50 -12L0 12L50 -12L50 4L0 28L-50 4Z', w: 100, h: 40, fill: A, m: mulM(T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.3), [bp.piece.w / 90, 0, 0, bp.piece.w / 90, 0, 0]), name: 'Chevron' } as any);
    if (id === 'back-name' && back) {
      els.push({ kind: 'text', text: '{NAME}', upper: true, font: kit.font || 'Oswald', weight: kit.fontWeight || 700, size: 62, fill: kit.nameColor, stroke: kit.outlineMm ? kit.outlineColor : null, strokeW: kit.outlineMm ? kit.outlineMm * 2 : 0, align: 'center', fitW: back.piece.w * 0.78, m: T(back.x + back.piece.w / 2, back.y + 125), name: 'Player name' } as any);
      els.push({ kind: 'text', text: '{NUMBER}', font: kit.font || 'Oswald', weight: kit.fontWeight || 700, size: 300, fill: kit.numberColor, stroke: kit.outlineMm ? kit.outlineColor : null, strokeW: kit.outlineMm ? kit.outlineMm * 2 : 0, align: 'center', fitW: back.piece.w * 0.7, m: T(back.x + back.piece.w / 2, back.y + 300), name: 'Player number' } as any);
    }
    if (id === 'front-number') { const [x] = centreOf('front'); const f = board.pieces.find((p) => p.piece.id === 'front')!; els.push({ kind: 'text', text: '{NUMBER}', font: kit.font || 'Oswald', weight: kit.fontWeight || 700, size: 100, fill: kit.numberColor, align: 'center', m: T(x - f.piece.w * 0.2, f.y + 170), name: 'Front number' } as any); }
    if (id === 'cuffs') for (const bp of board.pieces.filter((p) => p.piece.id.startsWith('sleeve'))) { els.push({ kind: 'rect', w: bp.piece.w + 40, h: 34, fill: A, m: T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h - 17), name: 'Cuff' } as any); els.push({ kind: 'rect', w: bp.piece.w + 40, h: 7, fill: B, m: T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h - 42), name: 'Cuff line' } as any); }
    const ids = els.map(() => uid());
    setArt((a) => [...a, ...els.map((e, i) => ({ ...(e as any), id: ids[i] }))]);
  };

  // ---- selection actions
  const selected = art.find((e) => e.id === sel) || null;
  const removeSel = () => { const ids = fc.current?.getActiveObjects().map((o: any) => o.__id).filter(Boolean) || (sel ? [sel] : []); if (!ids.length) return; setArt((a) => a.filter((e) => !ids.includes(e.id))); fc.current?.discardActiveObject(); setSel(null); };
  const duplicate = () => { if (!selected) return; const id = uid(); setArt((a) => [...a, { ...JSON.parse(JSON.stringify(selected)), id, m: mulM(T(15, 15), selected.m), name: `${selected.name || selected.kind} copy` }]); setTimeout(() => { const v = objs.current.get(id); if (v) { fc.current.setActiveObject(v.obj); setSel(id); fc.current.requestRenderAll(); } }, 250); };
  const move = (dir: 1 | -1 | 'top' | 'bottom') => { if (!selected) return; setArt((a) => { const i = a.findIndex((e) => e.id === selected.id); const b = [...a]; const [x] = b.splice(i, 1); const j = dir === 'top' ? b.length : dir === 'bottom' ? 0 : Math.max(0, Math.min(b.length, i + dir)); b.splice(j, 0, x); return b; }); };
  const nudge = (dx: number, dy: number) => { const ids = fc.current?.getActiveObjects().map((o: any) => o.__id) || []; if (!ids.length) return; setArt((a) => a.map((e) => (ids.includes(e.id) ? { ...e, m: [e.m[0], e.m[1], e.m[2], e.m[3], e.m[4] + dx, e.m[5] + dy] as Mat } : e))); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !(e.target as HTMLElement)?.closest('input,textarea,select')) { spaceDown.current = e.type === 'keydown'; if (e.type === 'keydown') e.preventDefault(); return; }
      if (e.type !== 'keydown') return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest('input,textarea,select,[contenteditable="true"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSel(); }
      else if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; nudge(e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0); }
      else if (e.key === 'Escape') { fc.current?.discardActiveObject(); fc.current?.requestRenderAll(); setSel(null); }
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  });

  const doSave = () => { onSave(artRef.current, studioOnly); setDirty(false); };
  const close = () => { if (dirty && !window.confirm('Save your print-file changes before closing?\n\nOK = save and close · Cancel = keep editing')) return; if (dirty) doSave(); onClose(); };

  // ---- placement readout (mm) of the selection
  const geo = selected ? decomposeM(selected.m) : null;
  const setGeo = (o: { x?: number; y?: number; rot?: number; scale?: number; sx?: number; sy?: number }) => {
    if (!selected || !geo) return;
    const g = { ...geo, ...o };
    const m = mulM(T(g.x, g.y), mulM(rotM(g.rot), [g.sx, 0, 0, g.sy, 0, 0]));
    update(selected.id, { m });
  };
  const sizeOf = (el: ArtEl) => {
    const b = el.kind === 'rect' || el.kind === 'image' || el.kind === 'path' ? { w: el.w, h: el.h } : el.kind === 'ellipse' ? { w: el.rx * 2, h: el.ry * 2 } : (() => { const L = layoutText(el, { vars, shaper }); return { w: L.w, h: L.h }; })();
    const g = decomposeM(el.m);
    return { w: b.w * g.sx, h: b.h * g.sy, bw: b.w, bh: b.h };
  };

  // ---- UI
  const field = 'mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px]';
  const lbl = 'block text-[11px] text-mt-muted';
  const iconBtn = 'h-9 w-9 inline-flex items-center justify-center rounded-lg border border-mt-border hover:bg-mt-surface2 disabled:opacity-40';
  const tabBtn = (id: typeof tab, icon: any, label: string) => <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10.5px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:bg-mt-surface2'}`}>{icon}{label}</button>;
  const fillOf = (el: ArtEl) => (el as any).fill as Fill | null | undefined;
  const num = (label: string, v: number, on: (n: number) => void, step = 1) => <label className={lbl}>{label}<input type="number" step={step} value={Math.round(v * 100) / 100} onChange={(e) => on(Number(e.target.value) || 0)} aria-label={label} className={field} /></label>;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-mt-bg" role="dialog" aria-label="Print studio">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-mt-border bg-mt-surface px-3 py-2">
        <p className="text-[14px] font-semibold mr-2">Print studio <span className="text-mt-muted font-normal">· {product.label} · flat print file, size M</span></p>
        <button type="button" onClick={undo} disabled={!hist.current.past.length} aria-label="Undo" title="Undo (Ctrl+Z)" className={iconBtn}><Undo2 size={16} /></button>
        <button type="button" onClick={redo} disabled={!hist.current.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={iconBtn}><Redo2 size={16} /></button>
        <span className="inline-flex items-center gap-1 rounded-lg border border-mt-border px-1">
          <button type="button" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out" className="h-8 w-8 inline-flex items-center justify-center"><ZoomOut size={15} /></button>
          <button type="button" onClick={() => fit('all')} className="h-8 px-1 text-[12px] font-semibold tabular-nums" title="Fit all pieces">{zoomPct}%</button>
          <button type="button" onClick={() => zoomBy(1.25)} aria-label="Zoom in" className="h-8 w-8 inline-flex items-center justify-center"><ZoomIn size={15} /></button>
        </span>
        {players.length > 0 && <label className="inline-flex items-center gap-1.5 text-[12px] text-mt-muted">Preview names as<select value={previewIdx} onChange={(e) => setPreviewIdx(Number(e.target.value))} aria-label="Preview player" className="h-9 rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px] text-mt-ink">{players.map((p, i) => <option key={i} value={i}>{p.name || '—'} #{p.number || '—'} · {p.size}</option>)}</select></label>}
        <label className="inline-flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={studioOnly} onChange={(e) => { setStudioOnly(e.target.checked); setDirty(true); }} className="h-4 w-4 accent-[#3B82C4]" /> Use only this artwork (hide quick graphic, logos, standard name & number)</label>
        <span className="ml-auto" />
        {fontMsg && <span role="status" className="text-[11.5px] text-amber-700">{fontMsg}</span>}
        <button type="button" onClick={doSave} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5"><Save size={15} /> Save{dirty ? ' *' : ''}</button>
        <button type="button" onClick={close} aria-label="Close print studio" className={iconBtn}><X size={16} /></button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left panel: add */}
        <aside className="flex w-[300px] shrink-0 border-r border-mt-border bg-mt-surface" aria-label="Add to the print file">
          <div role="tablist" aria-label="Add" className="flex w-[64px] flex-col gap-1 border-r border-mt-border p-1.5">
            {tabBtn('text', <Type size={17} />, 'Text')}
            {tabBtn('shapes', <Shapes size={17} />, 'Shapes')}
            {tabBtn('images', <ImageIcon size={17} />, 'Logos')}
            {tabBtn('patterns', <Palette size={17} />, 'Patterns')}
            {tabBtn('templates', <LayoutTemplate size={17} />, 'Layouts')}
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto p-3 space-y-2">
            {tab === 'text' && <>
              <p className="text-[12px] text-mt-muted">Text is drawn from the font file itself — exact letters, retypeable in the print file.</p>
              <button type="button" onClick={() => addText('TEAM NAME', { size: 70, upper: true })} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] font-semibold hover:bg-mt-surface2">+ Add text</button>
              <button type="button" onClick={() => { const b = board.pieces.find((p) => p.piece.id === 'back'); addText('{NAME}', { upper: true, size: 62, fitW: b ? b.piece.w * 0.78 : undefined, name: 'Player name', fill: kit.nameColor }, 'back'); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2"><b>+ Player name</b> <span className="text-mt-muted">— filled from the list</span></button>
              <button type="button" onClick={() => { const b = board.pieces.find((p) => p.piece.id === 'back'); addText('{NUMBER}', { size: 280, fitW: b ? b.piece.w * 0.7 : undefined, name: 'Player number', fill: kit.numberColor }, 'back'); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2"><b>+ Player number</b> <span className="text-mt-muted">— filled from the list</span></button>
              <button type="button" onClick={() => addText('{SIZE}', { size: 20, name: 'Size label', fill: '#000000' })} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Size label</button>
              <p className="pt-1 text-[11.5px] text-mt-muted">Type <code>{'{NAME}'}</code>, <code>{'{NUMBER}'}</code>, <code>{'{SIZE}'}</code> or <code>{'{TEAM}'}</code> in any text. The master design stays one; every garment in the list gets its own name, number and size.</p>
            </>}
            {tab === 'shapes' && <>
              <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => { const [x, y] = centreOf(); add({ kind: 'rect', w: 200, h: 120, fill: kit.accent || '#C9A86A', m: T(x, y), name: 'Rectangle' } as any); }} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center" aria-label="Rectangle"><Square size={22} /></button>
                <button type="button" onClick={() => { const [x, y] = centreOf(); add({ kind: 'ellipse', rx: 80, ry: 80, fill: kit.accent || '#C9A86A', m: T(x, y), name: 'Circle' } as any); }} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center" aria-label="Circle"><span className="h-6 w-6 rounded-full border-2 border-current" /></button>
                <button type="button" onClick={() => addShape('M-50 -6L50 -6L50 6L-50 6Z', 'Stripe')} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center text-[11px]" aria-label="Stripe">Stripe</button>
              </div>
              <select value={shapeCat} onChange={(e) => setShapeCat(e.target.value)} aria-label="Shape category" className={field}>{MOTIF_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              <div className="grid grid-cols-4 gap-1.5">
                {MOTIFS.filter((m: any) => m.cat === shapeCat).map((m: any) => (
                  <button key={m.id} type="button" title={m.label} aria-label={`Shape ${m.label}`} onClick={() => addShape(m.d, m.label)} className="aspect-square rounded-lg border border-mt-border p-1.5 hover:bg-mt-surface2">
                    <svg viewBox="-55 -55 110 110" className="h-full w-full"><path d={m.d} fill="currentColor" fillRule="evenodd" /></svg>
                  </button>
                ))}
              </div>
            </>}
            {tab === 'images' && <>
              <button type="button" onClick={() => imgFile.current?.click()} className="w-full h-10 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Upload logo or picture</button>
              <input ref={imgFile} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addImage(f); }} />
              <p className="text-[11.5px] text-mt-muted">SVG logos stay vectors in the print file. PNG / JPG print at their own resolution — use at least 300 dpi at the printed size. Nothing is uploaded.</p>
              {kit.teamLogo && <button type="button" onClick={async () => { const blob = await (await fetch(kit.teamLogo!)).blob(); addImage(new File([blob], 'Team logo.png', { type: blob.type })); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Team logo (from the quick design)</button>}
              {kit.sponsorLogo && <button type="button" onClick={async () => { const blob = await (await fetch(kit.sponsorLogo!)).blob(); addImage(new File([blob], 'Sponsor.png', { type: blob.type })); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Sponsor (from the quick design)</button>}
            </>}
            {tab === 'patterns' && <>
              <p className="text-[12px] text-mt-muted">Adds a pattern panel over the front — move it, resize it, or select any shape and choose “Pattern” as its fill.</p>
              <button type="button" onClick={() => addPatternPanel(pattern, 'Current pattern')} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ The garment’s current pattern</button>
              {libraryPatterns.map((a) => <button key={a.id} type="button" onClick={() => addPatternPanel(a.data, a.name, a.id)} className="w-full flex items-center gap-2 rounded-lg border border-mt-border p-1.5 text-left text-[12.5px] hover:bg-mt-surface2">{a.thumb ? <img src={a.thumb} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="h-9 w-9 rounded bg-mt-surface2" />}<span className="truncate">{a.name}</span></button>)}
              {!libraryPatterns.length && <p className="text-[11.5px] text-mt-faint">Patterns you save in Pattern Design appear here.</p>}
            </>}
            {tab === 'templates' && <>
              <p className="text-[12px] text-mt-muted">Ready layouts made of editable shapes — change, move or delete any part.</p>
              {([['sash', 'Sash'], ['hoops', 'Hoops'], ['stripes', 'Stripes'], ['sides', 'Side panels'], ['chevron', 'Chevron'], ['fade', 'Gradient fade'], ['cuffs', 'Sleeve cuffs'], ['back-name', 'Name & number on the back'], ['front-number', 'Front number']] as const).map(([id, l]) => <button key={id} type="button" onClick={() => template(id)} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ {l}</button>)}
            </>}
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1" ref={host}>
          <canvas ref={canvasEl} />
          <p className="pointer-events-none absolute left-3 top-2 text-[11px] text-mt-muted">Dashed line = cut line. Artwork outside a piece is not printed. Ctrl + scroll to zoom, scroll or Space + drag to move.</p>
        </div>

        {/* Right panel: properties + layers */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-mt-border bg-mt-surface p-3 space-y-3" aria-label="Properties">
          {!selected && <p className="text-[12.5px] text-mt-muted">Select something on the print file to change its colours, size and placement — or add something from the left.</p>}
          {selected && geo && (() => {
            const s = sizeOf(selected);
            const f = fillOf(selected);
            const fillKind = !f ? 'none' : typeof f === 'string' ? 'solid' : f.type;
            return <>
              <div className="flex items-center gap-1.5">
                <input value={selected.name || ''} onChange={(e) => update(selected.id, { name: e.target.value })} aria-label="Layer name" className="h-8 min-w-0 flex-1 rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px] font-semibold" />
                <button type="button" onClick={duplicate} aria-label="Duplicate" title="Duplicate (Ctrl+D)" className={iconBtn}><Copy size={14} /></button>
                <button type="button" onClick={removeSel} aria-label="Delete" title="Delete" className={iconBtn}><Trash2 size={14} /></button>
              </div>
              {selected.kind === 'text' && <section className="space-y-2" aria-label="Text">
                <label className={lbl}>Text<textarea value={selected.text} onChange={(e) => update(selected.id, { text: e.target.value } as any)} rows={2} aria-label="Text content" className="mt-1 w-full rounded-lg border border-mt-border bg-mt-bg p-2 text-[13px]" /></label>
                <label className={lbl}>Font<select value={selected.font} onChange={(e) => { const def = PATTERN_FONTS.find((x) => x.family === e.target.value); const w = def && !def.weights.includes(selected.weight) ? def.weights[def.weights.length - 1] : selected.weight; update(selected.id, { font: e.target.value, weight: w } as any); }} aria-label="Font" className={field}>{PATTERN_FONTS.map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}</select></label>
                <div className="grid grid-cols-3 gap-1.5">
                  <label className={lbl}>Weight<select value={selected.weight} onChange={(e) => update(selected.id, { weight: Number(e.target.value) } as any)} aria-label="Font weight" className={field}>{(PATTERN_FONTS.find((x) => x.family === selected.font)?.weights || [400, 700]).map((w) => <option key={w} value={w}>{w}</option>)}</select></label>
                  {num('Size (mm)', selected.size, (n) => update(selected.id, { size: Math.max(2, n) } as any))}
                  {num('Spacing', (selected.spacing || 0) * 100, (n) => update(selected.id, { spacing: n / 100 } as any))}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  {(['left', 'center', 'right'] as const).map((a) => <button key={a} type="button" aria-pressed={(selected.align || 'center') === a} onClick={() => update(selected.id, { align: a } as any)} className={`h-8 px-2.5 rounded-lg border text-[12px] capitalize ${(selected.align || 'center') === a ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{a}</button>)}
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!selected.upper} onChange={(e) => update(selected.id, { upper: e.target.checked } as any)} className="h-4 w-4 accent-[#3B82C4]" /> CAPITALS</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!selected.italic} onChange={(e) => update(selected.id, { italic: e.target.checked } as any)} className="h-4 w-4 accent-[#3B82C4]" /> Italic</label>
                </div>
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!selected.fitW} onChange={(e) => update(selected.id, { fitW: e.target.checked ? Math.round(s.bw) : undefined } as any)} className="h-4 w-4 accent-[#3B82C4]" /> Long names shrink to fit</label>
                {selected.fitW ? num('Fit width (mm)', selected.fitW, (n) => update(selected.id, { fitW: Math.max(10, n) } as any)) : null}
              </section>}
              {selected.kind !== 'image' && <section className="space-y-2" aria-label="Colour">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Fill</p>
                <div className="grid grid-cols-5 gap-1">{(['none', 'solid', 'linear', 'radial', 'pattern'] as const).map((k) => <button key={k} type="button" aria-pressed={fillKind === k} onClick={() => {
                  const base = typeof f === 'string' ? f : f && 'stops' in f ? f.stops[0][1] : kit.accent || '#C9A86A';
                  const next: Fill | null = k === 'none' ? null : k === 'solid' ? base : k === 'pattern' ? { type: 'pattern', pattern: libraryPatterns[0]?.data || pattern, tileMm: 60, assetId: libraryPatterns[0]?.id, name: libraryPatterns[0]?.name || 'Pattern' } : { type: k, stops: [[0, base], [1, kit.accent2 || '#FFFFFF']], angle: 90 };
                  update(selected.id, { fill: next } as any);
                }} className={`h-8 rounded-lg border text-[10.5px] font-semibold capitalize ${fillKind === k ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{k === 'linear' ? 'Grad.' : k === 'radial' ? 'Radial' : k}</button>)}</div>
                {fillKind === 'solid' && <label className="flex items-center gap-2 text-[12px]"><input type="color" value={f as string} onChange={(e) => update(selected.id, { fill: e.target.value } as any)} aria-label="Fill colour" className="h-9 w-12 rounded border border-mt-border" /><input value={f as string} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && update(selected.id, { fill: e.target.value } as any)} aria-label="Fill HEX" className="h-9 w-24 rounded-lg border border-mt-border bg-mt-bg px-2 font-mono text-[12px]" /></label>}
                {(fillKind === 'linear' || fillKind === 'radial') && f && typeof f === 'object' && 'stops' in f && <div className="space-y-1.5">
                  {f.stops.map(([o, c], i) => <div key={i} className="flex items-center gap-1.5"><input type="color" value={c.slice(0, 7)} onChange={(e) => update(selected.id, { fill: { ...f, stops: f.stops.map((st, j) => (j === i ? [st[0], e.target.value] : st)) } } as any)} aria-label={`Gradient colour ${i + 1}`} className="h-8 w-10 rounded border border-mt-border" /><input type="range" min={0} max={100} value={Math.round(o * 100)} onChange={(e) => update(selected.id, { fill: { ...f, stops: f.stops.map((st, j) => (j === i ? [Number(e.target.value) / 100, st[1]] : st)) } } as any)} aria-label={`Gradient stop ${i + 1} position`} className="flex-1" />{f.stops.length > 2 && <button type="button" onClick={() => update(selected.id, { fill: { ...f, stops: f.stops.filter((_, j) => j !== i) } } as any)} aria-label="Remove colour stop" className="text-[12px] px-1">×</button>}</div>)}
                  <div className="flex items-center gap-2"><button type="button" onClick={() => update(selected.id, { fill: { ...f, stops: ([...f.stops, [1, '#000000']] as [number, string][]).sort((a, b) => a[0] - b[0]) } } as any)} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">+ Colour</button>{fillKind === 'linear' && num('Angle °', f.angle ?? 90, (n) => update(selected.id, { fill: { ...f, angle: n } } as any))}</div>
                </div>}
                {fillKind === 'pattern' && f && typeof f === 'object' && f.type === 'pattern' && <div className="space-y-1.5">
                  <label className={lbl}>Pattern<select value={f.assetId || '__current'} onChange={(e) => { const a = libraryPatterns.find((x) => x.id === e.target.value); update(selected.id, { fill: { ...f, pattern: a ? a.data : pattern, assetId: a?.id || null, name: a?.name || 'Current pattern' } } as any); }} aria-label="Pattern" className={field}><option value="__current">The garment’s current pattern</option>{libraryPatterns.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  {num('Repeat size (mm)', f.tileMm, (n) => update(selected.id, { fill: { ...f, tileMm: Math.max(5, n) } } as any))}
                  <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={f.bg === null} onChange={(e) => update(selected.id, { fill: { ...f, bg: e.target.checked ? null : undefined } } as any)} className="h-4 w-4 accent-[#3B82C4]" /> See-through background</label>
                </div>}
                <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Outline</p>
                <div className="flex items-center gap-2"><input type="color" value={(selected as any).stroke || '#000000'} onChange={(e) => update(selected.id, { stroke: e.target.value, strokeW: (selected as any).strokeW || 2 } as any)} aria-label="Outline colour" className="h-9 w-12 rounded border border-mt-border" />{num('Width (mm)', (selected as any).strokeW || 0, (n) => update(selected.id, { strokeW: Math.max(0, n), stroke: (selected as any).stroke || '#000000' } as any), 0.5)}</div>
              </section>}
              <section className="space-y-2" aria-label="Placement">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Size &amp; placement (mm, size M)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {num('X (centre)', geo.x, (n) => setGeo({ x: n }))}
                  {num('Y (centre)', geo.y, (n) => setGeo({ y: n }))}
                  {num('Width', s.w, (n) => setGeo({ sx: Math.max(0.001, n / s.bw), ...(lockRatio.current ? { sy: Math.max(0.001, (n / s.bw) * (geo.sy / geo.sx)) } : {}) }))}
                  {num('Height', s.h, (n) => setGeo({ sy: Math.max(0.001, n / s.bh), ...(lockRatio.current ? { sx: Math.max(0.001, (n / s.bh) * (geo.sx / geo.sy)) } : {}) }))}
                  {num('Rotate °', geo.rot, (n) => setGeo({ rot: n }))}
                  <label className={lbl}>Opacity<input type="range" min={0} max={100} value={Math.round((selected.opacity ?? 1) * 100)} onChange={(e) => update(selected.id, { opacity: Number(e.target.value) / 100 })} aria-label="Opacity" className="mt-3 w-full" /></label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setGeo({ sx: -geo.sx })} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">Flip ↔</button>
                  <button type="button" onClick={() => setGeo({ sy: -geo.sy })} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">Flip ↕</button>
                  {(['front', 'back'] as const).map((pid) => <button key={pid} type="button" onClick={() => { const bp = board.pieces.find((p) => p.piece.id === pid); if (bp) setGeo({ x: bp.x + bp.piece.w / 2 }); }} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">Centre on {pid}</button>)}
                </div>
              </section>
            </>;
          })()}
          <section aria-label="Layers" className="space-y-1">
            <div className="flex items-center justify-between"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-muted">Layers ({art.length})</p>{selected && <span className="inline-flex gap-1"><button type="button" onClick={() => move(1)} aria-label="Bring forward" className="h-7 w-7 rounded border border-mt-border inline-flex items-center justify-center"><ArrowUp size={13} /></button><button type="button" onClick={() => move(-1)} aria-label="Send backward" className="h-7 w-7 rounded border border-mt-border inline-flex items-center justify-center"><ArrowDown size={13} /></button></span>}</div>
            <ul className="space-y-0.5">{[...art].reverse().map((e) => <li key={e.id} className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] ${e.id === sel ? 'bg-mt-ink/10' : 'hover:bg-mt-surface2'}`}>
              <button type="button" onClick={() => { const v = objs.current.get(e.id); if (v && !e.locked) { fc.current.setActiveObject(v.obj); fc.current.requestRenderAll(); } setSel(e.id); }} className="min-w-0 flex-1 truncate text-left">{e.kind === 'text' ? (/\{(NAME|NUMBER)\}/i.test(e.text) ? <Hash size={12} className="inline mr-1" /> : <Type size={12} className="inline mr-1" />) : e.kind === 'image' ? <ImageIcon size={12} className="inline mr-1" /> : <Shapes size={12} className="inline mr-1" />}{e.name || (e.kind === 'text' ? e.text : e.kind)}</button>
              <button type="button" onClick={() => update(e.id, { hidden: !e.hidden })} aria-label={e.hidden ? 'Show' : 'Hide'} className="p-1">{e.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              <button type="button" onClick={() => update(e.id, { locked: !e.locked })} aria-label={e.locked ? 'Unlock' : 'Lock'} className="p-1">{e.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
            </li>)}</ul>
            {!art.length && <p className="text-[12px] text-mt-faint">No artwork yet.</p>}
          </section>
        </aside>
      </div>

      {/* Bottom view bar */}
      <div role="tablist" aria-label="View" className="flex items-center justify-center gap-1 border-t border-mt-border bg-mt-surface p-1.5">
        {([['front', 'Front'], ['back', 'Back'], ['sleeves', 'Sleeves'], ['all', 'All pieces']] as const).map(([v, l]) => <button key={v} type="button" onClick={() => fit(v)} className="h-8 px-3.5 rounded-full text-[12.5px] font-semibold text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink">{l}</button>)}
        <button type="button" onClick={() => fit('all')} aria-label="Fit" className="h-8 w-8 rounded-full inline-flex items-center justify-center text-mt-muted hover:bg-mt-surface2"><Maximize2 size={14} /></button>
      </div>
    </div>
  );
}

const lockRatio = { current: true };
function rotM(deg: number): Mat { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; }
/** Position (centre), rotation and scale of a matrix (no skew). */
function decomposeM(m: Mat): { x: number; y: number; rot: number; sx: number; sy: number } {
  const sx = Math.hypot(m[0], m[1]);
  const det = m[0] * m[3] - m[1] * m[2];
  const rot = (Math.atan2(m[1], m[0]) * 180) / Math.PI;
  const sy = det / (sx || 1);
  return { x: m[4], y: m[5], rot: Math.round(rot * 100) / 100, sx, sy };
}
