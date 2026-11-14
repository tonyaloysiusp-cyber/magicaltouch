'use client';

// Textile print studio — design directly on the flat print pieces.
//
// The print file is the design: front, back, sleeves and collar laid out
// flat at real size (size M, millimetres). The model (lib/textile/art.ts) is
// the source of truth; the fabric.js canvas is only how it is shown and
// manipulated, so what the mockup and the print files draw is exactly what
// is saved — never a screenshot.
//
// Layout: menu bar + toolbar on top, tool rail and an "Add" drawer on the
// left, the canvas, properties / layers on the right (both panels collapse,
// and become drawers on small screens), the view bar and a status bar below.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ArrowDown, ArrowUp, Circle, Copy, Eye, EyeOff, Hand, Hash, Image as ImageIcon,
  LayoutTemplate, Lock, Maximize2, MousePointer2, Palette, PanelLeft, PanelRight, PenTool, Pencil, Pipette, Redo2, Ruler, Save, Shapes, Slash, Spline, Square, Star, Trash2, Triangle, Type, Undo2, Unlock, X, ZoomIn, ZoomOut, Brush, Hexagon,
} from 'lucide-react';
import { boardLayout, layoutText, mulM, artFonts, type ArtEl, type Board, type Fill, type Mat } from '@/lib/textile/art';
import { ensureFonts, shaper } from '@/lib/textile/fonts';
import { normalize, segsToD, transformSegs, bbox as segBox, flatten, regionOf, booleanOp, polysToD, centred, nodes as pathNodes, moveNode, insertNode, deleteNode, setNodeType, penPath, polygonPath, starPath, offsetPath, type BoolOp, type Seg } from '@/lib/textile/vector';
import { kitProduct, pieceMarkup, stdLettering, panelSpec, type KitDesign, type Player, type Glyphs } from '@/lib/teamKit';
import { MOTIFS, tileSvg, layout as patLayout, type PatternSettings } from '@/lib/patterns';
import { MOTIF_CATEGORIES } from '@/lib/patternMotifs';
import { PATTERN_FONTS } from '@/lib/patternText';
import type { Asset } from '@/lib/assets/library';

const uid = () => `el_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const T = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
const I: Mat = [1, 0, 0, 1, 0, 0];
const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const isPathish = (el: ArtEl) => el.kind === 'path' || el.kind === 'text';
const r1 = (n: number) => Math.round(n * 10) / 10;
const inv = (m: Mat): Mat => { const d = m[0] * m[3] - m[1] * m[2] || 1e-12; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const ap = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const reId = (el: ArtEl): ArtEl => (el.kind === 'group' ? { ...el, id: uid(), els: el.els.map(reId) } : { ...el, id: uid() });

export type Tool = 'select' | 'node' | 'pen' | 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'pencil' | 'brush' | 'text' | 'eyedropper' | 'hand' | 'zoom' | 'measure';
const TOOLS: { id: Tool; label: string; key: string; icon: any }[] = [
  { id: 'select', label: 'Selection', key: 'V', icon: MousePointer2 },
  { id: 'node', label: 'Direct selection · edit points', key: 'A', icon: Spline },
  { id: 'pen', label: 'Pen (click = corner, drag = curve)', key: 'P', icon: PenTool },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse', key: 'L', icon: Circle },
  { id: 'polygon', label: 'Polygon', key: 'G', icon: Hexagon },
  { id: 'star', label: 'Star', key: 'S', icon: Star },
  { id: 'line', label: 'Line', key: '\\', icon: Slash },
  { id: 'pencil', label: 'Freehand', key: 'N', icon: Pencil },
  { id: 'brush', label: 'Brush', key: 'B', icon: Brush },
  { id: 'text', label: 'Text', key: 'T', icon: Type },
  { id: 'eyedropper', label: 'Eyedropper (copies fill & outline)', key: 'I', icon: Pipette },
  { id: 'measure', label: 'Measure', key: 'M', icon: Ruler },
  { id: 'hand', label: 'Hand (or hold Space)', key: 'H', icon: Hand },
  { id: 'zoom', label: 'Zoom (Alt = out)', key: 'Z', icon: ZoomIn },
];

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
  const [selIds, setSelIds] = useState<string[]>([]);
  const [tool, setToolState] = useState<Tool>('select');
  const [tab, setTab] = useState<'text' | 'shapes' | 'images' | 'patterns' | 'templates'>('text');
  const [shapeCat, setShapeCat] = useState<string>('Basic');
  const [previewIdx, setPreviewIdx] = useState(0);
  const [zoomPct, setZoomPct] = useState(100);
  const [dirty, setDirty] = useState(false);
  const [fontMsg, setFontMsg] = useState<string | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [grid, setGrid] = useState(false);
  const [snap, setSnap] = useState(true);
  const [menu, setMenu] = useState<string | null>(null);
  const [nodeSel, setNodeSel] = useState<{ seg: number; kind: 'anchor' | 'in' | 'out' } | null>(null);
  const [measure, setMeasure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [polySides, setPolySides] = useState(6);
  const [starPoints, setStarPoints] = useState(5);
  const hist = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const host = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fc = useRef<any>(null);
  const F = useRef<any>(null);
  const objs = useRef(new Map<string, { json: string; obj: any }>());
  const bgCount = useRef(0);
  const artRef = useRef(art); artRef.current = art;
  const toolRef = useRef<Tool>('select'); toolRef.current = tool;
  const selRef = useRef<string[]>([]); selRef.current = selIds;
  const clip = useRef<ArtEl[]>([]);
  const imgFile = useRef<HTMLInputElement>(null);
  const spaceDown = useRef(false);
  const draw = useRef<{ x0: number; y0: number; obj: any } | null>(null);
  const pen = useRef<{ pts: { x: number; y: number; hx?: number; hy?: number }[]; dragging: boolean; obj: any | null }>({ pts: [], dragging: false, obj: null });
  const nodeObjs = useRef<any[]>([]);
  const nodeDrag = useRef<string | null>(null);
  const eyeTargets = useRef<string[]>([]);
  const H = useRef<any>({});
  const player = players[Math.min(previewIdx, players.length - 1)] || { name: 'NAME', number: '10', size: 'M' };
  const vars = useMemo(() => ({ name: player.name || 'NAME', number: player.number || '10', size: player.size || 'M', team: kit.teamName }), [player, kit.teamName]);
  const sel = selIds.length === 1 ? selIds[0] : null;
  const selected = art.find((e) => e.id === sel) || null;
  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice((n) => (n === m ? null : n)), 6000); };

  // ---------------------------------------------------------------- history
  const setArt = useCallback((next: ArtEl[] | ((a: ArtEl[]) => ArtEl[]), record = true) => {
    setArtState((cur) => {
      const n = typeof next === 'function' ? (next as any)(cur) : next;
      if (record) { hist.current.past.push(JSON.stringify(cur)); if (hist.current.past.length > 150) hist.current.past.shift(); hist.current.future = []; }
      return n;
    });
    setDirty(true);
  }, []);
  const undo = () => { const p = hist.current.past.pop(); if (p == null) return; hist.current.future.push(JSON.stringify(artRef.current)); setArtState(JSON.parse(p)); setDirty(true); };
  const redo = () => { const f = hist.current.future.pop(); if (f == null) return; hist.current.past.push(JSON.stringify(artRef.current)); setArtState(JSON.parse(f)); setDirty(true); };
  const update = (id: string, o: Partial<ArtEl>, record = true) => setArt((a) => a.map((e) => (e.id === id ? ({ ...e, ...o } as ArtEl) : e)), record);

  // ---------------------------------------------------------------- fonts
  useEffect(() => {
    let live = true;
    ensureFonts(artFonts(art)).then((failed) => { if (!live) return; setFontMsg(failed.length ? `Could not load: ${failed.join(', ')} — shown in a fallback until it loads.` : null); setFontTick((t) => t + 1); });
    return () => { live = false; };
  }, [art]);

  // ---------------------------------------------------------------- responsive
  useEffect(() => {
    const on = () => { const w = window.innerWidth; const n = w < 1100; setNarrow(n); if (n) { setShowLeft(false); setShowRight(false); } else { setShowLeft(true); setShowRight(true); } };
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // ---------------------------------------------------------------- geometry helpers (model, board mm)
  const textGeom = useCallback((el: Extract<ArtEl, { kind: 'text' }>) => {
    const L = layoutText(el, { vars, shaper });
    const sq: Mat = [L.sx, 0, 0, 1, 0, 0];
    const d = L.parts.map((p) => segsToD(transformSegs(normalize(p.d), mulM(sq, p.m)))).join('');
    return { d, L };
  }, [vars]);
  /** The element's outline in its own local space (no fill rules): for booleans, outlines and clipping. */
  const geomD = (el: ArtEl): string => {
    if (el.kind === 'rect') return `M${-el.w / 2} ${-el.h / 2}H${el.w / 2}V${el.h / 2}H${-el.w / 2}Z`;
    if (el.kind === 'ellipse') return `M${-el.rx} 0A${el.rx} ${el.ry} 0 1 0 ${el.rx} 0A${el.rx} ${el.ry} 0 1 0 ${-el.rx} 0Z`;
    if (el.kind === 'path') return el.d;
    if (el.kind === 'text') return textGeom(el).d;
    if (el.kind === 'image') return `M${-el.w / 2} ${-el.h / 2}H${el.w / 2}V${el.h / 2}H${-el.w / 2}Z`;
    if (el.kind === 'group') return el.els.filter((c) => !c.hidden).map((c) => segsToD(transformSegs(normalize(geomD(c)), c.m))).join('');
    return '';
  };
  /** Bounding box on the board. */
  const boxOf = (el: ArtEl): { x: number; y: number; w: number; h: number } => {
    let local: { x: number; y: number; w: number; h: number };
    if (el.kind === 'rect' || el.kind === 'image') local = { x: -el.w / 2, y: -el.h / 2, w: el.w, h: el.h };
    else if (el.kind === 'ellipse') local = { x: -el.rx, y: -el.ry, w: 2 * el.rx, h: 2 * el.ry };
    else if (el.kind === 'text') { const L = layoutText(el, { vars, shaper }); local = { x: -L.w / 2, y: -L.h / 2, w: L.w, h: L.h }; }
    else local = segBox(normalize(geomD(el)));
    const pts = [[local.x, local.y], [local.x + local.w, local.y], [local.x, local.y + local.h], [local.x + local.w, local.y + local.h]].map(([x, y]) => ap(el.m, x, y));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };

  // ---------------------------------------------------------------- canvas
  const pieceClip = () => {
    const Fb = F.current;
    return new Fb.Group(board.pieces.map((bp) => new Fb.Path(bp.piece.d, { left: bp.x, top: bp.y, flipX: !!bp.piece.mirror })), { absolutePositioned: true });
  };
  const baseZoom = () => { const c = fc.current; if (!c) return 1; return Math.min((c.getWidth() - 60) / (board.w + 80), (c.getHeight() - 60) / (board.h + 80)); };
  const fit = (what: 'all' | 'front' | 'back' | 'sleeves' | 'selection') => {
    const c = fc.current; if (!c) return;
    let box = { x: -40, y: -40, w: board.w + 80, h: board.h + 80 };
    const bp = (id: string) => board.pieces.find((p) => p.piece.id === id);
    if (what === 'front' || what === 'back') { const p = bp(what); if (p) box = { x: p.x - 30, y: p.y - 30, w: p.piece.w + 60, h: p.piece.h + 60 }; }
    if (what === 'sleeves') { const ps = board.pieces.filter((p) => p.piece.id.startsWith('sleeve')); if (ps.length) { const x0 = Math.min(...ps.map((p) => p.x)), y0 = Math.min(...ps.map((p) => p.y)), x1 = Math.max(...ps.map((p) => p.x + p.piece.w)), y1 = Math.max(...ps.map((p) => p.y + p.piece.h)); box = { x: x0 - 30, y: y0 - 30, w: x1 - x0 + 60, h: y1 - y0 + 60 }; } }
    if (what === 'selection') { const els = artRef.current.filter((e) => selRef.current.includes(e.id)); if (!els.length) return; const bs = els.map(boxOf); const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h)); box = { x: x0 - 20, y: y0 - 20, w: x1 - x0 + 40, h: y1 - y0 + 40 }; }
    const z = Math.min((c.getWidth() - 40) / box.w, (c.getHeight() - 40) / box.h);
    c.setViewportTransform([z, 0, 0, z, (c.getWidth() - box.w * z) / 2 - box.x * z, (c.getHeight() - box.h * z) / 2 - box.y * z]);
    setZoomPct(Math.round((z / baseZoom()) * 100));
    refreshNodes();
  };
  const zoomAt = (k: number, pt?: { x: number; y: number }) => { const c = fc.current; if (!c) return; const z = Math.max(0.05, Math.min(40, c.getZoom() * k)); c.zoomToPoint(pt || { x: c.getWidth() / 2, y: c.getHeight() / 2 }, z); setZoomPct(Math.round((z / baseZoom()) * 100)); refreshNodes(); };

  useEffect(() => {
    let disposed = false;
    (async () => {
      const mod: any = await import('fabric');
      if (disposed) return;
      const Fb = mod.fabric;
      F.current = Fb;
      const c = new Fb.Canvas(canvasEl.current, { preserveObjectStacking: true, backgroundColor: '#E5E7EB', selection: true, stopContextMenu: true, fireRightClick: false, targetFindTolerance: 4 });
      fc.current = c;
      const resize = () => { const r = host.current!.getBoundingClientRect(); c.setWidth(Math.max(200, r.width)); c.setHeight(Math.max(200, r.height)); c.requestRenderAll(); };
      resize();
      const ro = new ResizeObserver(resize); ro.observe(host.current!);
      (c as any).__ro = ro;
      const syncSel = () => { if (syncing.current || c.getActiveObject()?.__node) return; const ids = c.getActiveObjects().map((o: any) => o.__id).filter(Boolean); setSelIds(ids); };
      c.on('selection:created', syncSel); c.on('selection:updated', syncSel); c.on('selection:cleared', () => { if (syncing.current || nodeDrag.current) return; setSelIds([]); });
      c.on('object:modified', (e: any) => { if (e.target?.__node) { H.current.nodeDragEnd(); return; } H.current.captureAll(); });
      c.on('object:moving', (e: any) => { if (e.target?.__node) { H.current.nodeDragMove(e.target); return; } H.current.snapMove(e.target); });
      c.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent;
        if (e.ctrlKey || e.metaKey) H.current.zoomAt(Math.pow(0.999, e.deltaY), { x: e.offsetX, y: e.offsetY });
        else { const vt = c.viewportTransform; vt[4] -= e.deltaX; vt[5] -= e.deltaY; c.setViewportTransform(vt); H.current.refreshNodes(); }
        e.preventDefault(); e.stopPropagation();
      });
      let panning = false, last = { x: 0, y: 0 };
      c.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent;
        if (spaceDown.current || e.button === 1 || toolRef.current === 'hand') { panning = true; c.selection = false; last = { x: e.clientX, y: e.clientY }; return; }
        H.current.toolDown(opt);
      });
      c.on('mouse:move', (opt: any) => {
        const p = c.getPointer(opt.e); setPointer({ x: p.x, y: p.y });
        if (panning) { const e = opt.e as MouseEvent; const vt = c.viewportTransform; vt[4] += e.clientX - last.x; vt[5] += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; c.setViewportTransform(vt); H.current.refreshNodes(); return; }
        H.current.toolMove(opt);
      });
      c.on('mouse:up', (opt: any) => { if (panning) { panning = false; c.selection = toolRef.current === 'select' || toolRef.current === 'node'; return; } H.current.toolUp(opt); });
      c.on('mouse:dblclick', (opt: any) => H.current.toolDbl(opt));
      c.on('path:created', (e: any) => H.current.freehandDone(e.path));
      await H.current.drawBoard();
      H.current.fit('all');
      await H.current.sync();
    })();
    return () => { disposed = true; try { (fc.current as any)?.__ro?.disconnect(); fc.current?.dispose(); } catch { /* ignore */ } fc.current = null; objs.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------- board (flat pieces, garment colours) — not selectable
  const letters = useMemo(() => { const s = stdLettering({ ...kit, art }); return `${s.name ? 1 : 0}${s.number ? 1 : 0}`; }, [kit, art]);
  const drawBoard = useCallback(async () => {
    const c = fc.current, Fb = F.current; if (!c || !Fb) return;
    c.getObjects().filter((o: any) => o.__bg).forEach((o: any) => c.remove(o));
    // The board shows the garment without the studio artwork; the standard name / number are left out when the studio has its own.
    const flags: ArtEl[] = [];
    if (letters[0] === '0') flags.push({ id: 'f1', kind: 'text', text: '{NAME}', font: 'Oswald', weight: 700, size: 1, hidden: true, m: I } as any);
    if (letters[1] === '0') flags.push({ id: 'f2', kind: 'text', text: '{NUMBER}', font: 'Oswald', weight: 700, size: 1, hidden: true, m: I } as any);
    const base = { ...kit, art: flags, studioOnly };
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
      // Safe area (Panel settings in Print files): keep important artwork inside the cyan line.
      const safe = panelSpec(kit, p, 10).safe;
      if (safe > 0) {
        const sd = offsetPath(p.d, -safe);
        const sb = segBox(normalize(sd)), ob = segBox(normalize(p.d));
        const so = new Fb.Path(sd, { left: bp.x + (p.mirror ? ob.x + ob.w - (sb.x + sb.w) : sb.x - ob.x), top: bp.y + (sb.y - ob.y), fill: '', stroke: '#06B6D4', strokeWidth: 1, strokeDashArray: [3, 3], selectable: false, evented: false, objectCaching: false, flipX: !!p.mirror });
        so.__bg = true; bgs.push(so);
      }
      const lab = new Fb.Text(`${p.label} · ${p.w} × ${p.h} mm`, { left: bp.x, top: bp.y - 26, fontSize: 18, fill: '#475569', fontFamily: 'Arial', selectable: false, evented: false });
      lab.__bg = true; bgs.push(lab);
    }
    if (grid) {
      for (let x = 0; x <= board.w; x += 10) { const l = new Fb.Line([x, -20, x, board.h + 20], { stroke: x % 50 ? 'rgba(15,23,42,0.08)' : 'rgba(15,23,42,0.18)', strokeWidth: x % 50 ? 0.4 : 0.7, selectable: false, evented: false, objectCaching: false }); l.__bg = true; bgs.push(l); }
      for (let y = 0; y <= board.h; y += 10) { const l = new Fb.Line([-20, y, board.w + 20, y], { stroke: y % 50 ? 'rgba(15,23,42,0.08)' : 'rgba(15,23,42,0.18)', strokeWidth: y % 50 ? 0.4 : 0.7, selectable: false, evented: false, objectCaching: false }); l.__bg = true; bgs.push(l); }
    }
    bgs.forEach((o, i) => { c.insertAt(o, i, false); });
    bgCount.current = bgs.length;
    c.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit, pattern, board, player, glyphs, studioOnly, grid, letters]);
  useEffect(() => { drawBoard(); }, [drawBoard]);

  // ---------------------------------------------------------------- model → fabric
  const fillFor = useCallback(async (f: Fill | null | undefined, obj: any) => {
    const Fb = F.current;
    if (!f) return '';
    if (typeof f === 'string') return f;
    if (f.type === 'linear' || f.type === 'radial') {
      const a = ((f.angle ?? 90) * Math.PI) / 180;
      const coords = f.type === 'radial' ? { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.5 } : { x1: 0.5 - Math.cos(a) / 2, y1: 0.5 - Math.sin(a) / 2, x2: 0.5 + Math.cos(a) / 2, y2: 0.5 + Math.sin(a) / 2 };
      return new Fb.Gradient({ type: f.type, gradientUnits: 'percentage', coords, colorStops: f.stops.map(([offset, color]) => ({ offset, color })) });
    }
    const pf = f as Extract<Fill, { type: 'pattern' }>;
    const tile = tileSvg({ ...pf.pattern, background: pf.bg !== undefined ? (pf.bg || 'transparent') : pf.pattern.background });
    const img: HTMLImageElement = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = svgUrl(tile); });
    const { w: tw } = patLayout(pf.pattern);
    const s = pf.tileMm / tw;
    return new Fb.Pattern({ source: img, repeat: 'repeat', patternTransform: [s, 0, 0, s, 0, 0], offsetX: obj ? -obj.width / 2 : 0, offsetY: 0 });
  }, []);

  const build = useCallback(async (el: ArtEl, top = true): Promise<any> => {
    const Fb = F.current;
    const common: any = { originX: 'center', originY: 'center', objectCaching: false, opacity: el.opacity ?? 1, visible: !el.hidden, selectable: !el.locked, evented: !el.locked, paintFirst: 'stroke', strokeUniform: false, transparentCorners: false, cornerColor: '#3B82C4', borderColor: '#3B82C4', cornerSize: 10, strokeLineJoin: 'round' };
    let o: any;
    if (el.kind === 'rect') o = new Fb.Rect({ ...common, width: el.w, height: el.h, rx: el.rx || 0, ry: el.rx || 0 });
    else if (el.kind === 'ellipse') o = new Fb.Ellipse({ ...common, rx: el.rx, ry: el.ry });
    else if (el.kind === 'path') o = new Fb.Path(el.d || 'M0 0', { ...common, fillRule: el.rule || 'nonzero' });
    else if (el.kind === 'image') { o = await new Promise((res) => Fb.Image.fromURL(el.src, (i: any) => res(i), { crossOrigin: 'anonymous' })); o.set({ ...common, width: el.w, height: el.h }); }
    else if (el.kind === 'text') {
      const { d } = textGeom(el);
      if (d) o = new Fb.Path(d, { ...common });
      else o = new Fb.Text(el.text || ' ', { ...common, fontFamily: el.font, fontWeight: el.weight, fontSize: el.size }); // until the font file arrives
    } else {
      const kids = await Promise.all(el.els.map((k) => build(k, false)));
      if (el.clip && kids.length > 1) {
        const [mask, ...rest] = kids;
        o = new Fb.Group(rest, { ...common, subTargetCheck: false });
        const gc = o.getCenterPoint();
        mask.set({ fill: '#000', stroke: null, opacity: 1, visible: true });
        Fb.util.applyTransformToObject(mask, mulM(T(-gc.x, -gc.y), mask.calcTransformMatrix() as Mat));
        o.clipPath = mask;
        o.__gc = [gc.x, gc.y];
      } else {
        o = new Fb.Group(kids, { ...common, subTargetCheck: false });
        const gc = o.getCenterPoint();
        o.__gc = [gc.x, gc.y];
      }
    }
    if ('fill' in el) o.set('fill', await fillFor((el as any).fill, o));
    if ('stroke' in el && (el as any).stroke && (el as any).strokeW) o.set({ stroke: (el as any).stroke, strokeWidth: (el as any).strokeW });
    if (el.dash && el.dash.length) o.set({ strokeDashArray: el.dash });
    // Outer outline drawn behind (path / text) — same as the print renderer.
    if (el.stroke2 && el.stroke2.width > 0 && (el.kind === 'path' || el.kind === 'text') && o._renderPathCommands) {
      const s2 = el.stroke2, own = (el as any).stroke && (el as any).strokeW ? (el as any).strokeW : 0;
      const orig = o._render.bind(o);
      o._render = (ctx: CanvasRenderingContext2D) => { ctx.save(); ctx.beginPath(); o._renderPathCommands(ctx); ctx.lineWidth = own + 2 * s2.width; ctx.strokeStyle = s2.color; ctx.lineJoin = 'round'; ctx.fillStyle = s2.color; ctx.fill(); ctx.stroke(); ctx.restore(); orig(ctx); };
    }
    if (el.shadow && (el.shadow.dx || el.shadow.dy)) o.set({ shadow: new Fb.Shadow({ color: el.shadow.color, offsetX: el.shadow.dx * (fc.current?.getZoom() || 1), offsetY: el.shadow.dy * (fc.current?.getZoom() || 1), blur: 0 }) });
    const off = el.kind === 'group' ? o.__gc : o.pathOffset && isPathish(el) ? [o.pathOffset.x, o.pathOffset.y] : [0, 0];
    Fb.util.applyTransformToObject(o, mulM(el.m, T(off[0], off[1])));
    o.__id = el.id; o.__kind = el.kind;
    if (top) o.clipPath = o.clipPath || pieceClip();
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vars, fillFor, fontTick, textGeom]);

  const syncing = useRef(false), again = useRef(false);
  const sync = useCallback(async () => {
    const c = fc.current; if (!c) return;
    if (syncing.current) { again.current = true; return; }
    syncing.current = true;
    try {
      do {
        again.current = false;
        const want = artRef.current;
        const active = c.getActiveObjects().map((o: any) => o.__id);
        const ids = new Set(want.map((e) => e.id));
        for (const [id, v] of objs.current) if (!ids.has(id)) { c.remove(v.obj); objs.current.delete(id); }
        for (const el of want) {
          const json = JSON.stringify(el) + (JSON.stringify(vars) + fontTick);
          const have = objs.current.get(el.id);
          if (have && have.json === json) continue;
          const o = await build(el);
          if (have) c.remove(have.obj);
          c.add(o);
          objs.current.set(el.id, { json, obj: o });
        }
        want.forEach((el, i) => { const v = objs.current.get(el.id); if (v) c.moveTo(v.obj, bgCount.current + i); });
        nodeObjs.current.forEach((o) => c.bringToFront(o));
        if (active.length === 1 && toolRef.current !== 'node') { const v = objs.current.get(active[0]); if (v && c.getActiveObject() !== v.obj) c.setActiveObject(v.obj); }
        c.requestRenderAll();
      } while (again.current);
    } finally { syncing.current = false; }
    refreshNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [build, vars, fontTick]);
  useEffect(() => { sync(); }, [art, sync]);

  // ---------------------------------------------------------------- fabric → model
  const captureAll = () => {
    const c = fc.current; if (!c) return;
    const changed = new Map<string, Mat>();
    for (const [id, v] of objs.current) {
      const o = v.obj;
      const m: number[] = o.group ? F.current.util.multiplyTransformMatrices(o.group.calcTransformMatrix(), o.calcTransformMatrix()) : o.calcTransformMatrix();
      const el = artRef.current.find((e) => e.id === id); if (!el) continue;
      const off = el.kind === 'group' ? (o.__gc || [0, 0]) : o.pathOffset && isPathish(el) ? [o.pathOffset.x, o.pathOffset.y] : [0, 0];
      const mm = mulM(m as Mat, T(-off[0], -off[1])).map((n) => Math.round(n * 10000) / 10000) as Mat;
      if (mm.some((n, i) => Math.abs(n - el.m[i]) > 1e-4)) changed.set(id, mm);
    }
    if (!changed.size) return;
    setArt((a) => a.map((e) => (changed.has(e.id) ? { ...e, m: changed.get(e.id)! } : e)));
    for (const [id, m] of changed) { const v = objs.current.get(id); const el = artRef.current.find((e) => e.id === id); if (v && el) v.json = JSON.stringify({ ...el, m }) + (JSON.stringify(vars) + fontTick); }
  };
  // Snapping: centre to a 5 mm grid, or to a piece's centre line.
  const snapMove = (t: any) => {
    if (!snap || !t) return;
    const c = t.getCenterPoint();
    let x = c.x, y = c.y;
    for (const bp of board.pieces) { const cx = bp.x + bp.piece.w / 2; if (Math.abs(x - cx) < 4) x = cx; }
    if (grid) { x = Math.round(x / 5) * 5; y = Math.round(y / 5) * 5; }
    if (x !== c.x || y !== c.y) t.setPositionByOrigin(new F.current.Point(x, y), 'center', 'center');
  };

  // ---------------------------------------------------------------- adding
  const centreOf = (pieceId = 'front'): [number, number] => {
    const bp = board.pieces.find((p) => p.piece.id === pieceId) || board.pieces[0];
    return [bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.42];
  };
  const selectIds = (ids: string[]) => {
    setTimeout(() => {
      const c = fc.current; if (!c) return;
      const os = ids.map((i) => objs.current.get(i)?.obj).filter(Boolean);
      c.discardActiveObject();
      if (os.length === 1) c.setActiveObject(os[0]);
      else if (os.length > 1) c.setActiveObject(new F.current.ActiveSelection(os, { canvas: c }));
      c.requestRenderAll(); setSelIds(ids);
    }, 250);
  };
  const add = (el: Omit<ArtEl, 'id'>, select = true): string => {
    const id = uid();
    setArt((a) => [...a, { ...(el as any), id }]);
    if (select) selectIds([id]);
    if (narrow) setShowLeft(false); // on small screens the drawer gets out of the way once something is added
    return id;
  };
  const defaultFill = () => kit.accent || '#C9A86A';
  const addText = (text: string, opts: Partial<Extract<ArtEl, { kind: 'text' }>> = {}, piece = 'front', at?: [number, number]) => {
    const [x, y] = at || centreOf(piece);
    add({ kind: 'text', text, font: kit.font || 'Oswald', weight: kit.fontWeight || 700, size: 60, fill: kit.nameColor || '#FFFFFF', align: 'center', upper: false, m: T(x, y), name: text, ...opts } as any);
  };
  const addShape = (d: string, label: string, at?: [number, number], k = 1.4) => {
    const [x, y] = at || centreOf();
    add({ kind: 'path', d, w: 100, h: 100, rule: 'evenodd', fill: defaultFill(), m: [k, 0, 0, k, x, y], name: label } as any);
  };
  const addImage = async (f: File) => {
    const url: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
    const img = new Image(); img.src = url; await img.decode().catch(() => {});
    const w = img.naturalWidth || 500, h = img.naturalHeight || 500;
    const k = 120 / Math.max(w, h);
    const [x, y] = centreOf();
    add({ kind: 'image', src: url, w, h, m: [k, 0, 0, k, x, y - 120], name: f.name.replace(/\.[^.]+$/, '') } as any);
    if (!/svg/i.test(f.type)) flash(`Picture placed at 120 mm. It prints at about ${Math.round((Math.max(w, h) / 120) * 25.4)} dpi at this size — 150 dpi or more is recommended for sublimation.`);
  };
  const addPatternPanel = (p: PatternSettings, name: string, assetId?: string) => {
    const bp = board.pieces.find((q) => q.piece.id === 'front')!;
    add({ kind: 'rect', w: bp.piece.w + 20, h: bp.piece.h + 20, fill: { type: 'pattern', pattern: p, tileMm: 70, assetId, name }, opacity: 1, m: T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h / 2), name: `Pattern · ${name}` } as any);
  };
  const template = (id: string) => {
    const els: Omit<ArtEl, 'id'>[] = [];
    const A = defaultFill(), B = kit.accent2 || '#FFFFFF';
    const body = board.pieces.filter((p) => p.piece.id === 'front' || p.piece.id === 'back');
    const back = board.pieces.find((p) => p.piece.id === 'back');
    const rot = (deg: number): Mat => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; };
    if (id === 'sash') for (const bp of body) els.push({ kind: 'rect', w: bp.piece.w * 1.9, h: bp.piece.w * 0.24, fill: A, m: mulM(T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.48), rot(bp.piece.id === 'back' ? 38 : -38)), name: 'Sash' } as any);
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
    if (id === 'chest-logo') { const f = board.pieces.find((p) => p.piece.id === 'front')!; els.push({ kind: 'rect', w: 85, h: 85, rx: 6, fill: null, stroke: '#3B82C4', strokeW: 1, dash: [4, 3], m: T(f.x + f.piece.w * 0.68, f.y + 165), name: 'Chest logo area (replace with your logo)' } as any); }
    if (id === 'sleeve-text') for (const bp of board.pieces.filter((p) => p.piece.id.startsWith('sleeve'))) els.push({ kind: 'text', text: '{TEAM}', upper: true, font: kit.font || 'Oswald', weight: kit.fontWeight || 700, size: 26, fill: kit.nameColor, align: 'center', m: T(bp.x + bp.piece.w / 2, bp.y + bp.piece.h * 0.55), name: 'Sleeve text' } as any);
    const ids = els.map(() => uid());
    setArt((a) => [...a, ...els.map((e, i) => ({ ...(e as any), id: ids[i] }))]);
    if (narrow) setShowLeft(false);
  };

  // ---------------------------------------------------------------- object operations
  const selectedEls = () => artRef.current.filter((e) => selRef.current.includes(e.id));
  const removeSel = () => { const ids = selRef.current; if (!ids.length) return; setArt((a) => a.filter((e) => !ids.includes(e.id))); fc.current?.discardActiveObject(); setSelIds([]); };
  const duplicate = () => { const els = selectedEls(); if (!els.length) return; const copies = els.map((e) => ({ ...reId(JSON.parse(JSON.stringify(e))), m: mulM(T(15, 15), e.m), name: `${e.name || e.kind} copy` })); setArt((a) => [...a, ...copies]); selectIds(copies.map((c) => c.id)); };
  const copySel = () => { clip.current = JSON.parse(JSON.stringify(selectedEls())); if (clip.current.length) flash(`${clip.current.length} copied`); };
  const cutSel = () => { copySel(); removeSel(); };
  const paste = () => { if (!clip.current.length) return; const copies = clip.current.map((e) => ({ ...reId(JSON.parse(JSON.stringify(e))), m: mulM(T(20, 20), e.m) })); clip.current = copies.map((c) => JSON.parse(JSON.stringify(c))); setArt((a) => [...a, ...copies]); selectIds(copies.map((c) => c.id)); };
  const selectAll = () => selectIds(artRef.current.filter((e) => !e.locked && !e.hidden).map((e) => e.id));
  const arrange = (dir: 'front' | 'forward' | 'backward' | 'back') => {
    const ids = selRef.current; if (!ids.length) return;
    setArt((a) => {
      const pick = a.filter((e) => ids.includes(e.id)), rest = a.filter((e) => !ids.includes(e.id));
      if (dir === 'front') return [...rest, ...pick];
      if (dir === 'back') return [...pick, ...rest];
      const b = [...a];
      const order = dir === 'forward' ? [...ids].reverse() : ids;
      for (const id of order) { const i = b.findIndex((e) => e.id === id); const j = dir === 'forward' ? Math.min(b.length - 1, i + 1) : Math.max(0, i - 1); const [x] = b.splice(i, 1); b.splice(j, 0, x); }
      return b;
    });
  };
  const moveBy = (ids: string[], dx: number, dy: number) => setArt((a) => a.map((e) => (ids.includes(e.id) ? { ...e, m: [e.m[0], e.m[1], e.m[2], e.m[3], e.m[4] + dx, e.m[5] + dy] as Mat } : e)));
  const align = (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    const els = selectedEls(); if (!els.length) return;
    const bs = els.map(boxOf);
    let ref = { x: Math.min(...bs.map((b) => b.x)), y: Math.min(...bs.map((b) => b.y)), x1: Math.max(...bs.map((b) => b.x + b.w)), y1: Math.max(...bs.map((b) => b.y + b.h)) };
    if (els.length === 1) {
      // One object: align to the piece it sits on.
      const c = { x: bs[0].x + bs[0].w / 2, y: bs[0].y + bs[0].h / 2 };
      const bp = board.pieces.find((p) => c.x >= p.x && c.x <= p.x + p.piece.w && c.y >= p.y && c.y <= p.y + p.piece.h) || board.pieces[0];
      ref = { x: bp.x, y: bp.y, x1: bp.x + bp.piece.w, y1: bp.y + bp.piece.h };
    }
    const moves = new Map<string, [number, number]>();
    els.forEach((e, i) => {
      const b = bs[i];
      const dx = how === 'left' ? ref.x - b.x : how === 'right' ? ref.x1 - (b.x + b.w) : how === 'hcenter' ? (ref.x + ref.x1) / 2 - (b.x + b.w / 2) : 0;
      const dy = how === 'top' ? ref.y - b.y : how === 'bottom' ? ref.y1 - (b.y + b.h) : how === 'vcenter' ? (ref.y + ref.y1) / 2 - (b.y + b.h / 2) : 0;
      moves.set(e.id, [dx, dy]);
    });
    setArt((a) => a.map((e) => { const mv = moves.get(e.id); return mv ? { ...e, m: [e.m[0], e.m[1], e.m[2], e.m[3], e.m[4] + mv[0], e.m[5] + mv[1]] as Mat } : e; }));
  };
  const distribute = (axis: 'h' | 'v') => {
    const els = selectedEls(); if (els.length < 3) { flash('Select three or more objects to distribute.'); return; }
    const items = els.map((e) => ({ e, b: boxOf(e) })).sort((p, q) => (axis === 'h' ? p.b.x - q.b.x : p.b.y - q.b.y));
    const first = items[0].b, lastB = items[items.length - 1].b;
    const span = axis === 'h' ? lastB.x + lastB.w - first.x : lastB.y + lastB.h - first.y;
    const total = items.reduce((s, it) => s + (axis === 'h' ? it.b.w : it.b.h), 0);
    const gap = (span - total) / (items.length - 1);
    let pos = axis === 'h' ? first.x : first.y;
    const moves = new Map<string, number>();
    for (const it of items) { const cur = axis === 'h' ? it.b.x : it.b.y; moves.set(it.e.id, pos - cur); pos += (axis === 'h' ? it.b.w : it.b.h) + gap; }
    setArt((a) => a.map((e) => { const d = moves.get(e.id); return d == null ? e : { ...e, m: [e.m[0], e.m[1], e.m[2], e.m[3], e.m[4] + (axis === 'h' ? d : 0), e.m[5] + (axis === 'v' ? d : 0)] as Mat }; }));
  };
  const group = (asClip = false) => {
    const els = selectedEls(); if (els.length < 2) { flash(asClip ? 'Select the mask shape (on top) and what it should clip.' : 'Select two or more objects to group.'); return; }
    const bs = els.map(boxOf);
    const cx = (Math.min(...bs.map((b) => b.x)) + Math.max(...bs.map((b) => b.x + b.w))) / 2, cy = (Math.min(...bs.map((b) => b.y)) + Math.max(...bs.map((b) => b.y + b.h))) / 2;
    const ordered = artRef.current.filter((e) => selRef.current.includes(e.id));
    // A clipping mask is the topmost selected object.
    const kids = asClip ? [ordered[ordered.length - 1], ...ordered.slice(0, -1)] : ordered;
    const g: ArtEl = { id: uid(), kind: 'group', clip: asClip, name: asClip ? 'Clipping mask' : 'Group', els: kids.map((e) => ({ ...e, m: mulM(T(-cx, -cy), e.m) })), m: T(cx, cy) } as any;
    const lastIdx = Math.max(...ordered.map((e) => artRef.current.indexOf(e)));
    setArt((a) => { const keep = a.filter((e) => !selRef.current.includes(e.id)); const idx = a.slice(0, lastIdx + 1).filter((e) => !selRef.current.includes(e.id)).length; keep.splice(idx, 0, g); return keep; });
    selectIds([g.id]);
  };
  const ungroup = () => {
    const els = selectedEls().filter((e) => e.kind === 'group'); if (!els.length) return;
    const out: string[] = [];
    setArt((a) => a.flatMap((e) => { if (!els.some((g) => g.id === e.id) || e.kind !== 'group') return [e]; const kids = e.els.map((k) => ({ ...k, m: mulM(e.m, k.m) })); out.push(...kids.map((k) => k.id)); return kids; }));
    selectIds(out);
  };
  const toOutlines = () => {
    const el = selected; if (!el || el.kind !== 'text') return;
    if (/\{(NAME|NUMBER|SIZE|TEAM)\}/i.test(el.text)) { flash('Names and numbers stay live so every garment gets its own — outline them at export instead (Print files → Outlines).'); return; }
    const { d } = textGeom(el);
    if (!d) { flash('The font is still loading — try again in a moment.'); return; }
    const b = segBox(normalize(d));
    update(el.id, { kind: 'path', d, w: b.w, h: b.h, rule: 'nonzero', text: undefined, name: `${el.name || el.text} (outlines)` } as any);
  };
  const boolean = async (op: BoolOp) => {
    const els = selectedEls().filter((e) => e.kind !== 'image');
    if (els.length < 2) { flash('Select two or more shapes.'); return; }
    if (els.some((e) => e.kind === 'text' && /\{(NAME|NUMBER|SIZE|TEAM)\}/i.test((e as any).text))) { flash('Names and numbers can’t be combined — they change for every garment.'); return; }
    try {
      const regions = await Promise.all(els.map((e) => regionOf(transformSegs(normalize(geomD(e)), e.m), (e as any).rule === 'evenodd' ? 'evenodd' : 'nonzero')));
      const res = await booleanOp(op, regions);
      const d0 = polysToD(res);
      if (!d0) { flash('The result is empty.'); return; }
      const c = centred(d0);
      const base = els[0];
      const el: ArtEl = { id: uid(), kind: 'path', d: c.d, w: c.w, h: c.h, rule: 'evenodd', fill: (base as any).fill ?? defaultFill(), stroke: (base as any).stroke ?? null, strokeW: (base as any).strokeW ?? 0, m: T(c.cx, c.cy), name: { union: 'Union', subtract: 'Minus front', intersect: 'Intersection', exclude: 'Exclusion' }[op] } as any;
      const idx = artRef.current.findIndex((e) => e.id === base.id);
      setArt((a) => { const keep = a.filter((e) => !els.some((s) => s.id === e.id)); keep.splice(Math.min(idx, keep.length), 0, el); return keep; });
      selectIds([el.id]);
    } catch { flash('That combination could not be made.'); }
  };
  const lockSel = (on: boolean) => { const ids = selRef.current; setArt((a) => a.map((e) => (ids.includes(e.id) ? { ...e, locked: on } : e))); if (on) { fc.current?.discardActiveObject(); setSelIds([]); } };
  const hideSel = () => { const ids = selRef.current; setArt((a) => a.map((e) => (ids.includes(e.id) ? { ...e, hidden: true } : e))); fc.current?.discardActiveObject(); setSelIds([]); };

  // ---------------------------------------------------------------- tools
  const setTool = (t: Tool) => {
    const c = fc.current, Fb = F.current;
    finishPen(false);
    clearTmp();
    setMeasure(null);
    if (c) {
      c.isDrawingMode = t === 'pencil' || t === 'brush';
      if (c.isDrawingMode && Fb) { const b = new Fb.PencilBrush(c); b.width = t === 'brush' ? 8 : 1.5; b.color = t === 'brush' ? defaultFill() : '#111827'; b.strokeLineCap = 'round'; b.strokeLineJoin = 'round'; c.freeDrawingBrush = b; }
      const pick = t === 'select' || t === 'node';
      c.selection = pick;
      for (const [, v] of objs.current) { const el = artRef.current.find((e) => e.id === v.obj.__id); v.obj.selectable = pick && !el?.locked; v.obj.evented = (pick || t === 'eyedropper') && !el?.locked; }
      c.defaultCursor = t === 'hand' ? 'grab' : t === 'zoom' ? 'zoom-in' : t === 'select' || t === 'node' ? 'default' : 'crosshair';
      c.hoverCursor = t === 'eyedropper' ? 'copy' : t === 'select' || t === 'node' ? 'move' : c.defaultCursor;
      if (t === 'eyedropper') { eyeTargets.current = selRef.current.slice(); }
      if (t !== 'select' && t !== 'node') c.discardActiveObject();
      c.requestRenderAll();
    }
    setToolState(t);
    if (t !== 'node') { setNodeSel(null); clearNodes(); }
    else refreshNodes();
  };
  const tmp = useRef<any[]>([]);
  const clearTmp = () => { const c = fc.current; tmp.current.forEach((o) => c?.remove(o)); tmp.current = []; if (pen.current.obj) { c?.remove(pen.current.obj); pen.current.obj = null; } };
  const zoomScale = () => fc.current?.getZoom() || 1;

  const toolDown = (opt: any) => {
    const c = fc.current, Fb = F.current; if (!c || !Fb) return;
    const t = toolRef.current;
    const p = c.getPointer(opt.e);
    if (t === 'zoom') { zoomAt((opt.e as MouseEvent).altKey ? 1 / 1.6 : 1.6, { x: (opt.e as MouseEvent).offsetX, y: (opt.e as MouseEvent).offsetY }); return; }
    if (t === 'text') { addText('Text', { size: 50 }, 'front', [p.x, p.y]); setTool('select'); return; }
    if (t === 'eyedropper') {
      const src = artRef.current.find((e) => e.id === opt.target?.__id);
      if (!src) return;
      const targets = eyeTargets.current.filter((id) => id !== src.id);
      if (!targets.length) { flash('Select an object first, then pick a colour from another object.'); return; }
      setArt((a) => a.map((e) => (targets.includes(e.id) && e.kind !== 'image' && e.kind !== 'group' ? { ...e, fill: (src as any).fill ?? (e as any).fill, stroke: (src as any).stroke ?? null, strokeW: (src as any).strokeW ?? 0 } as ArtEl : e)));
      flash('Fill and outline copied.');
      return;
    }
    if (t === 'pen') {
      const P = pen.current;
      if (P.pts.length > 2) { const f = P.pts[0]; if (Math.hypot(p.x - f.x, p.y - f.y) < 8 / zoomScale()) { finishPen(true); return; } }
      P.pts.push({ x: p.x, y: p.y }); P.dragging = true; penPreview(p); return;
    }
    if (t === 'rect' || t === 'ellipse' || t === 'polygon' || t === 'star' || t === 'line' || t === 'measure') {
      const o = t === 'line' || t === 'measure' ? new Fb.Line([p.x, p.y, p.x, p.y], { stroke: t === 'measure' ? '#E11D48' : '#111827', strokeWidth: 1 / zoomScale() * 1.5, selectable: false, evented: false, objectCaching: false })
        : new Fb.Rect({ left: p.x, top: p.y, width: 0, height: 0, fill: 'rgba(59,130,196,0.12)', stroke: '#3B82C4', strokeWidth: 1 / zoomScale(), strokeDashArray: [4 / zoomScale(), 3 / zoomScale()], selectable: false, evented: false, objectCaching: false, rx: t === 'ellipse' ? 9999 : 0 });
      c.add(o); draw.current = { x0: p.x, y0: p.y, obj: o };
    }
  };
  const toolMove = (opt: any) => {
    const c = fc.current; if (!c) return;
    const t = toolRef.current;
    const p = c.getPointer(opt.e);
    if (t === 'pen') { const P = pen.current; if (P.dragging && P.pts.length) { const last = P.pts[P.pts.length - 1]; if (Math.hypot(p.x - last.x, p.y - last.y) > 1) { last.hx = p.x; last.hy = p.y; } } penPreview(p); return; }
    const d = draw.current; if (!d) return;
    if (t === 'line' || t === 'measure') { d.obj.set({ x2: p.x, y2: p.y }); if (t === 'measure') setMeasure(`${r1(Math.hypot(p.x - d.x0, p.y - d.y0))} mm · ${r1((Math.atan2(p.y - d.y0, p.x - d.x0) * -180) / Math.PI)}°`); }
    else { const sh = (opt.e as MouseEvent).shiftKey; let w = p.x - d.x0, h = p.y - d.y0; if (sh) { const s = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * s; h = Math.sign(h || 1) * s; } d.obj.set({ left: Math.min(d.x0, d.x0 + w), top: Math.min(d.y0, d.y0 + h), width: Math.abs(w), height: Math.abs(h) }); }
    c.requestRenderAll();
  };
  const toolUp = (opt: any) => {
    const c = fc.current; if (!c) return;
    const t = toolRef.current;
    if (t === 'pen') { pen.current.dragging = false; return; }
    if (t === 'node' && nodeDrag.current) { nodeDrag.current = null; refreshNodes(); return; }
    const d = draw.current; if (!d) return;
    draw.current = null;
    if (t === 'measure') { tmp.current.push(d.obj); return; }
    c.remove(d.obj);
    const p = c.getPointer(opt.e);
    let x0 = Math.min(d.x0, p.x), y0 = Math.min(d.y0, p.y), w = Math.abs(p.x - d.x0), h = Math.abs(p.y - d.y0);
    if ((opt.e as MouseEvent).shiftKey && t !== 'line') { const s = Math.max(w, h); w = h = s; x0 = p.x < d.x0 ? d.x0 - s : d.x0; y0 = p.y < d.y0 ? d.y0 - s : d.y0; }
    const tiny = w < 2 && h < 2;
    if (tiny) { w = h = 100; x0 = d.x0 - 50; y0 = d.y0 - 50; }
    const cx = x0 + w / 2, cy = y0 + h / 2;
    const F0 = defaultFill();
    if (t === 'rect') add({ kind: 'rect', w, h, fill: F0, m: T(cx, cy), name: 'Rectangle' } as any);
    else if (t === 'ellipse') add({ kind: 'ellipse', rx: w / 2, ry: h / 2, fill: F0, m: T(cx, cy), name: 'Ellipse' } as any);
    else if (t === 'polygon') add({ kind: 'path', d: polygonPath(polySides), w: 100, h: 100, fill: F0, m: [w / 100, 0, 0, h / 100, cx, cy], name: `Polygon (${polySides})` } as any);
    else if (t === 'star') add({ kind: 'path', d: starPath(starPoints), w: 100, h: 100, fill: F0, m: [w / 100, 0, 0, h / 100, cx, cy], name: `Star (${starPoints})` } as any);
    else if (t === 'line') {
      const len = tiny ? 100 : Math.hypot(p.x - d.x0, p.y - d.y0), ang = tiny ? 0 : Math.atan2(p.y - d.y0, p.x - d.x0);
      const mx = tiny ? d.x0 : (d.x0 + p.x) / 2, my = tiny ? d.y0 : (d.y0 + p.y) / 2;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      add({ kind: 'path', d: 'M-50 0L50 0', w: 100, h: 0, fill: null, stroke: '#111827', strokeW: 2, m: [ca * len / 100, sa * len / 100, -sa, ca, mx, my], name: 'Line' } as any);
    }
    setTool('select');
  };
  const toolDbl = (opt: any) => {
    const t = toolRef.current;
    if (t === 'pen') { pen.current.pts.pop(); finishPen(false); return; }
    if (t === 'node' && selected && selected.kind === 'path') {
      const c = fc.current; const p = c.getPointer(opt.e); const local = ap(inv(selected.m), p.x, p.y);
      const segs = normalize(selected.d);
      let best = -1, dist = Infinity;
      segs.forEach((s, i) => { if (s[0] === 'M' || s[0] === 'Z') return; const pts = flatten([['M', ...prevPoint(segs, i)] as Seg, s], 0.5)[0]?.pts || []; for (const q of pts) { const dd = Math.hypot(q[0] - local[0], q[1] - local[1]); if (dd < dist) { dist = dd; best = i; } } });
      if (best > 0) { update(selected.id, { d: segsToD(insertNode(segs, best)) } as any); flash('Point added.'); }
    }
  };
  const prevPoint = (segs: Seg[], i: number): [number, number] => { for (let k = i - 1; k >= 0; k--) { const q = segs[k]; if (q[0] === 'Z') continue; return q[0] === 'C' ? [q[5], q[6]] : [q[1], q[2]]; } return [0, 0]; };
  const penPreview = (p: { x: number; y: number }) => {
    const c = fc.current, Fb = F.current; const P = pen.current; if (!c || !Fb) return;
    if (P.obj) c.remove(P.obj);
    const pts = P.dragging ? P.pts : [...P.pts, { x: p.x, y: p.y }];
    const d = penPath(pts, false);
    if (!d) return;
    P.obj = new Fb.Path(d, { fill: '', stroke: '#3B82C4', strokeWidth: 1.5 / zoomScale(), selectable: false, evented: false, objectCaching: false });
    c.add(P.obj); c.requestRenderAll();
  };
  const finishPen = (closed: boolean) => {
    const P = pen.current; const c = fc.current;
    if (P.obj) { c?.remove(P.obj); P.obj = null; }
    const pts = P.pts; P.pts = []; P.dragging = false;
    if (pts.length < 2) return;
    const c0 = centred(penPath(pts, closed));
    add({ kind: 'path', d: c0.d, w: c0.w, h: c0.h, fill: closed ? defaultFill() : null, stroke: closed ? null : '#111827', strokeW: closed ? 0 : 2, m: T(c0.cx, c0.cy), name: closed ? 'Pen shape' : 'Pen path' } as any);
  };
  const freehandDone = (path: any) => {
    const c = fc.current; if (!c || !path) return;
    const d0 = (path.path || []).map((s: any[]) => s.join(' ')).join(' ');
    const m = mulM(path.calcTransformMatrix() as Mat, T(-path.pathOffset.x, -path.pathOffset.y));
    c.remove(path);
    const segs = transformSegs(normalize(d0), m);
    const c0 = centred(segsToD(segs));
    const brush = toolRef.current === 'brush';
    add({ kind: 'path', d: c0.d, w: c0.w, h: c0.h, fill: null, stroke: brush ? defaultFill() : '#111827', strokeW: brush ? 8 : 1.5, m: T(c0.cx, c0.cy), name: brush ? 'Brush stroke' : 'Freehand' } as any, false);
  };

  // ---------------------------------------------------------------- node editing (direct selection)
  const clearNodes = () => { if (nodeDrag.current) return; const c = fc.current; nodeObjs.current.forEach((o) => c?.remove(o)); nodeObjs.current = []; c?.requestRenderAll(); };
  const refreshNodes = () => {
    const c = fc.current, Fb = F.current; if (!c || !Fb) return;
    clearNodes();
    if (toolRef.current !== 'node' || nodeDrag.current) return;
    const el = artRef.current.find((e) => e.id === (selRef.current.length === 1 ? selRef.current[0] : null));
    if (!el || el.kind !== 'path') return;
    const v = objs.current.get(el.id);
    if (v) { v.obj.set({ hasControls: false, lockMovementX: true, lockMovementY: true }); }
    const segs = normalize(el.d);
    const z = zoomScale();
    const ns = pathNodes(segs);
    for (const n of ns) {
      const [x, y] = ap(el.m, n.x, n.y);
      if (n.kind !== 'anchor') {
        // Handle arm to its anchor.
        const s = segs[n.seg] as any;
        const anchor = n.kind === 'in' ? [s[5], s[6]] : prevPoint(segs, n.seg);
        const [ax, ay] = ap(el.m, anchor[0], anchor[1]);
        const arm = new Fb.Line([ax, ay, x, y], { stroke: '#3B82C4', strokeWidth: 1 / z, selectable: false, evented: false, objectCaching: false });
        arm.__node = 'arm'; nodeObjs.current.push(arm); c.add(arm);
      }
      const on = nodeSelRef.current && nodeSelRef.current.seg === n.seg && nodeSelRef.current.kind === n.kind;
      const h = n.kind === 'anchor'
        ? new Fb.Rect({ left: x, top: y, width: 9 / z, height: 9 / z, originX: 'center', originY: 'center', fill: on ? '#3B82C4' : '#FFFFFF', stroke: '#3B82C4', strokeWidth: 1.5 / z, hasControls: false, hasBorders: false, objectCaching: false })
        : new Fb.Circle({ left: x, top: y, radius: 4 / z, originX: 'center', originY: 'center', fill: on ? '#3B82C4' : '#FFFFFF', stroke: '#3B82C4', strokeWidth: 1.5 / z, hasControls: false, hasBorders: false, objectCaching: false });
      h.__node = JSON.stringify({ seg: n.seg, kind: n.kind });
      h.on('mousedown', () => { const r = JSON.parse(h.__node); nodeSelRef.current = r; setNodeSel(r); nodeDrag.current = JSON.stringify(artRef.current); });
      nodeObjs.current.push(h); c.add(h);
    }
    c.requestRenderAll();
  };
  const nodeSelRef = useRef<{ seg: number; kind: 'anchor' | 'in' | 'out' } | null>(null); nodeSelRef.current = nodeSel;
  const nodeDragMove = (h: any) => {
    const el = artRef.current.find((e) => e.id === selRef.current[0]); if (!el || el.kind !== 'path') return;
    const r = JSON.parse(h.__node); const cp = h.getCenterPoint(); const [lx, ly] = ap(inv(el.m), cp.x, cp.y);
    const d = segsToD(moveNode(normalize(el.d), r, lx, ly));
    setArtState((a) => a.map((e) => (e.id === el.id ? { ...e, d } as ArtEl : e)));
    setDirty(true);
  };
  const nodeDragEnd = () => {
    if (nodeDrag.current) { hist.current.past.push(nodeDrag.current); hist.current.future = []; nodeDrag.current = null; }
    // Re-centre the edited path so its box stays around it.
    const el = artRef.current.find((e) => e.id === selRef.current[0]); if (!el || el.kind !== 'path') return;
    const c0 = centred(el.d);
    setArtState((a) => a.map((e) => (e.id === el.id ? { ...e, d: c0.d, w: c0.w, h: c0.h, m: mulM(el.m, T(c0.cx, c0.cy)) } as ArtEl : e)));
  };
  const nodeOp = (op: 'delete' | 'smooth' | 'corner') => {
    const el = selected; if (!el || el.kind !== 'path' || !nodeSel || nodeSel.kind !== 'anchor') return;
    const segs = normalize(el.d);
    const d = segsToD(op === 'delete' ? deleteNode(segs, nodeSel.seg) : setNodeType(segs, nodeSel.seg, op));
    update(el.id, { d } as any); if (op === 'delete') setNodeSel(null);
  };
  useEffect(() => { if (tool === 'node') refreshNodes(); else { for (const [, v] of objs.current) v.obj.set({ hasControls: true, lockMovementX: false, lockMovementY: false }); } }, [tool, selIds, nodeSel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canvas handlers are registered once; they call the latest closures through this ref.
  H.current = { toolDown, toolMove, toolUp, toolDbl, captureAll, snapMove, nodeDragMove, nodeDragEnd, freehandDone, refreshNodes, zoomAt, drawBoard, fit, sync };

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !(e.target as HTMLElement)?.closest('input,textarea,select')) { spaceDown.current = e.type === 'keydown'; if (e.type === 'keydown') e.preventDefault(); return; }
      if (e.type !== 'keydown') return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest('input,textarea,select,[contenteditable="true"]')) return;
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); redo(); return; }
      if (mod && k === 's') { e.preventDefault(); doSave(); return; }
      if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
      if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) ungroup(); else group(); return; }
      if (mod && k === '7') { e.preventDefault(); group(true); return; }
      if (mod && k === 'c') { e.preventDefault(); copySel(); return; }
      if (mod && k === 'x') { e.preventDefault(); cutSel(); return; }
      if (mod && k === 'v') { e.preventDefault(); paste(); return; }
      if (mod && k === 'a') { e.preventDefault(); selectAll(); return; }
      if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomAt(1.25); return; }
      if (mod && k === '-') { e.preventDefault(); zoomAt(0.8); return; }
      if (mod && k === '0') { e.preventDefault(); fit('all'); return; }
      if (k === 'enter' && toolRef.current === 'pen') { e.preventDefault(); finishPen(false); return; }
      if (k === 'escape') { if (toolRef.current === 'pen') { pen.current.pts = []; clearTmp(); } setMenu(null); fc.current?.discardActiveObject(); fc.current?.requestRenderAll(); setSelIds([]); setTool('select'); return; }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); if (toolRef.current === 'node' && nodeSel) nodeOp('delete'); else removeSel(); return; }
      if (k === ']') { arrange(e.shiftKey ? 'front' : 'forward'); return; }
      if (k === '[') { arrange(e.shiftKey ? 'back' : 'backward'); return; }
      if (e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1; moveBy(selRef.current, e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0); return; }
      if (!mod && !e.altKey) { const hit = TOOLS.find((x) => x.key.toLowerCase() === k); if (hit) { setTool(hit.id); return; } if (k === '?') setShowKeys(true); }
    };
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  });

  const doSave = () => { onSave(artRef.current, studioOnly); setDirty(false); flash('Saved to the garment — the mockup now shows it.'); };
  const close = () => { if (dirty && !window.confirm('Save your print-file changes before closing?\n\nOK = save and close · Cancel = keep editing')) return; if (dirty) doSave(); onClose(); };

  // ---------------------------------------------------------------- placement (mm)
  const geo = selected ? decomposeM(selected.m) : null;
  const setGeo = (o: Partial<{ x: number; y: number; rot: number; sx: number; sy: number; skew: number }>) => {
    if (!selected || !geo) return;
    const g = { ...geo, ...o };
    update(selected.id, { m: composeM(g) });
  };
  const sizeOf = (el: ArtEl) => {
    const b = el.kind === 'rect' || el.kind === 'image' || el.kind === 'path' ? { w: el.w || 1, h: el.h || 1 } : el.kind === 'ellipse' ? { w: el.rx * 2, h: el.ry * 2 } : el.kind === 'text' ? (() => { const L = layoutText(el, { vars, shaper }); return { w: L.w, h: L.h }; })() : (() => { const b0 = segBox(normalize(geomD(el))); return { w: b0.w || 1, h: b0.h || 1 }; })();
    const g = decomposeM(el.m);
    return { w: b.w * Math.abs(g.sx), h: b.h * Math.abs(g.sy), bw: b.w, bh: b.h };
  };
  const selBox = useMemo(() => { const els = art.filter((e) => selIds.includes(e.id)); if (!els.length) return null; const bs = els.map(boxOf); const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y)), x1 = Math.max(...bs.map((b) => b.x + b.w)), y1 = Math.max(...bs.map((b) => b.y + b.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }, [art, selIds, fontTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- UI
  const field = 'mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[12.5px]';
  const lbl = 'block text-[11px] text-mt-muted';
  const iconBtn = 'h-9 w-9 inline-flex items-center justify-center rounded-lg border border-mt-border hover:bg-mt-surface2 disabled:opacity-40';
  const h4 = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-muted';
  const tabBtn = (id: typeof tab, icon: any, label: string) => <button type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setShowLeft(true); }} className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold ${tab === id && showLeft ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:bg-mt-surface2'}`}>{icon}{label}</button>;
  const fillOf = (el: ArtEl) => (el as any).fill as Fill | null | undefined;
  const num = (label: string, v: number, on: (n: number) => void, step = 1) => <label className={lbl}>{label}<input type="number" step={step} value={Math.round(v * 100) / 100} onChange={(e) => on(Number(e.target.value) || 0)} aria-label={label} className={field} /></label>;
  const multi = selIds.length > 1;
  const canBool = selectedEls().filter((e) => e.kind !== 'image').length > 1;
  const menus: { id: string; label: string; items: ({ label: string; key?: string; run: () => void; off?: boolean } | '-')[] }[] = [
    { id: 'file', label: 'File', items: [{ label: 'Save to the garment', key: 'Ctrl+S', run: doSave }, { label: 'Upload logo or picture…', run: () => imgFile.current?.click() }, '-', { label: 'Close print studio', run: close }] },
    { id: 'edit', label: 'Edit', items: [{ label: 'Undo', key: 'Ctrl+Z', run: undo, off: !hist.current.past.length }, { label: 'Redo', key: 'Ctrl+Shift+Z', run: redo, off: !hist.current.future.length }, '-', { label: 'Cut', key: 'Ctrl+X', run: cutSel, off: !selIds.length }, { label: 'Copy', key: 'Ctrl+C', run: copySel, off: !selIds.length }, { label: 'Paste', key: 'Ctrl+V', run: paste, off: !clip.current.length }, { label: 'Duplicate', key: 'Ctrl+D', run: duplicate, off: !selIds.length }, { label: 'Delete', key: 'Del', run: removeSel, off: !selIds.length }, '-', { label: 'Select all', key: 'Ctrl+A', run: selectAll }] },
    { id: 'object', label: 'Object', items: [{ label: 'Group', key: 'Ctrl+G', run: () => group(), off: !multi }, { label: 'Ungroup', key: 'Ctrl+Shift+G', run: ungroup, off: !selectedEls().some((e) => e.kind === 'group') }, { label: 'Make clipping mask (top shape clips the rest)', key: 'Ctrl+7', run: () => group(true), off: !multi }, '-', { label: 'Union', run: () => boolean('union'), off: !canBool }, { label: 'Minus front', run: () => boolean('subtract'), off: !canBool }, { label: 'Intersect', run: () => boolean('intersect'), off: !canBool }, { label: 'Exclude', run: () => boolean('exclude'), off: !canBool }, '-', { label: 'Convert text to outlines', run: toOutlines, off: selected?.kind !== 'text' }, { label: 'Lock', run: () => lockSel(true), off: !selIds.length }, { label: 'Hide', run: hideSel, off: !selIds.length }] },
    { id: 'arrange', label: 'Arrange', items: [{ label: 'Bring to front', key: 'Shift+]', run: () => arrange('front'), off: !selIds.length }, { label: 'Bring forward', key: ']', run: () => arrange('forward'), off: !selIds.length }, { label: 'Send backward', key: '[', run: () => arrange('backward'), off: !selIds.length }, { label: 'Send to back', key: 'Shift+[', run: () => arrange('back'), off: !selIds.length }, '-', { label: 'Align left', run: () => align('left'), off: !selIds.length }, { label: 'Align centre', run: () => align('hcenter'), off: !selIds.length }, { label: 'Align right', run: () => align('right'), off: !selIds.length }, { label: 'Align top', run: () => align('top'), off: !selIds.length }, { label: 'Align middle', run: () => align('vcenter'), off: !selIds.length }, { label: 'Align bottom', run: () => align('bottom'), off: !selIds.length }, '-', { label: 'Distribute horizontally', run: () => distribute('h'), off: selIds.length < 3 }, { label: 'Distribute vertically', run: () => distribute('v'), off: selIds.length < 3 }] },
    { id: 'view', label: 'View', items: [{ label: 'Fit all pieces', key: 'Ctrl+0', run: () => fit('all') }, { label: 'Zoom to selection', run: () => fit('selection'), off: !selIds.length }, { label: 'Zoom in', key: 'Ctrl++', run: () => zoomAt(1.25) }, { label: 'Zoom out', key: 'Ctrl+-', run: () => zoomAt(0.8) }, '-', { label: `${grid ? '✓ ' : ''}Grid (10 mm)`, run: () => setGrid((g) => !g) }, { label: `${snap ? '✓ ' : ''}Snap to centre lines${grid ? ' and grid' : ''}`, run: () => setSnap((s) => !s) }, '-', { label: `${showLeft ? '✓ ' : ''}Add panel`, run: () => setShowLeft((v) => !v) }, { label: `${showRight ? '✓ ' : ''}Properties & layers`, run: () => setShowRight((v) => !v) }] },
    { id: 'help', label: 'Help', items: [{ label: 'Keyboard shortcuts', key: '?', run: () => setShowKeys(true) }] },
  ];
  const activeTool = TOOLS.find((x) => x.id === tool)!;

  return (
    <div ref={shell} className="fixed inset-0 z-[80] flex flex-col bg-mt-bg" role="dialog" aria-label="Print studio" onClick={() => menu && setMenu(null)}>
      {/* Menu bar + toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-mt-border bg-mt-surface px-2 py-1.5">
        <p className="text-[13.5px] font-semibold px-1">Print studio</p>
        <nav aria-label="Menu" className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {menus.map((m) => (
            <div key={m.id} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)} onMouseEnter={() => menu && setMenu(m.id)} className={`h-8 px-2.5 rounded-md text-[12.5px] ${menu === m.id ? 'bg-mt-surface2' : 'hover:bg-mt-surface2'}`}>{m.label}</button>
              {menu === m.id && <div role="menu" className="absolute left-0 top-9 z-50 min-w-[250px] rounded-xl border border-mt-border bg-mt-surface p-1 shadow-xl">
                {m.items.map((it, i) => it === '-' ? <div key={i} className="my-1 h-px bg-mt-border" /> : <button key={i} type="button" role="menuitem" disabled={it.off} onClick={() => { setMenu(null); it.run(); }} className="flex w-full items-center justify-between gap-4 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] hover:bg-mt-surface2 disabled:opacity-40"><span>{it.label}</span>{it.key && <span className="text-[11px] text-mt-faint">{it.key}</span>}</button>)}
              </div>}
            </div>
          ))}
        </nav>
        <span className="mx-1 h-6 w-px bg-mt-border" />
        <button type="button" onClick={undo} disabled={!hist.current.past.length} aria-label="Undo" title="Undo (Ctrl+Z)" className={iconBtn}><Undo2 size={15} /></button>
        <button type="button" onClick={redo} disabled={!hist.current.future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={iconBtn}><Redo2 size={15} /></button>
        <span className="inline-flex items-center rounded-lg border border-mt-border">
          <button type="button" onClick={() => zoomAt(0.8)} aria-label="Zoom out" className="h-8 w-8 inline-flex items-center justify-center"><ZoomOut size={15} /></button>
          <button type="button" onClick={() => fit('all')} className="h-8 px-1 text-[12px] font-semibold tabular-nums" title="Fit all pieces">{zoomPct}%</button>
          <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in" className="h-8 w-8 inline-flex items-center justify-center"><ZoomIn size={15} /></button>
        </span>
        {players.length > 0 && <label className="inline-flex items-center gap-1.5 text-[12px] text-mt-muted"><span className="hidden xl:inline">Preview names as</span><select value={previewIdx} onChange={(e) => setPreviewIdx(Number(e.target.value))} aria-label="Preview player" className="h-8 max-w-[150px] rounded-lg border border-mt-border bg-mt-bg px-2 text-[12px] text-mt-ink">{players.map((p, i) => <option key={i} value={i}>{p.name || '—'} #{p.number || '—'} · {p.size}</option>)}</select></label>}
        <label className="inline-flex items-center gap-1.5 text-[12px]" title="Hide the quick graphic, logos and standard name & number of the main designer"><input type="checkbox" checked={studioOnly} onChange={(e) => { setStudioOnly(e.target.checked); setDirty(true); }} className="h-4 w-4 accent-[#3B82C4]" /> Only this artwork</label>
        <span className="ml-auto" />
        <button type="button" onClick={() => setShowLeft((v) => !v)} aria-label="Show or hide the add panel" aria-pressed={showLeft} className={iconBtn}><PanelLeft size={15} /></button>
        <button type="button" onClick={() => setShowRight((v) => !v)} aria-label="Show or hide properties" aria-pressed={showRight} className={iconBtn}><PanelRight size={15} /></button>
        <button type="button" onClick={doSave} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5"><Save size={15} /> Save{dirty ? ' *' : ''}</button>
        <button type="button" onClick={close} aria-label="Close print studio" className={iconBtn}><X size={16} /></button>
      </div>
      {(notice || fontMsg) && <p role="status" className="border-b border-mt-border bg-amber-50 px-3 py-1 text-[12px] text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{notice || fontMsg}</p>}

      <div className="relative flex min-h-0 flex-1">
        {/* Tool rail */}
        <div role="toolbar" aria-label="Tools" aria-orientation="vertical" className="flex w-[44px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-mt-border bg-mt-surface py-1.5">
          {TOOLS.map((x) => { const Ic = x.icon; return <button key={x.id} type="button" onClick={() => setTool(x.id)} aria-label={`${x.label} (${x.key})`} aria-pressed={tool === x.id} title={`${x.label} (${x.key})`} className={`h-8 w-8 inline-flex items-center justify-center rounded-md ${tool === x.id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink'}`}><Ic size={16} /></button>; })}
          <span className="my-1 h-px w-6 bg-mt-border" />
          {tabBtn('text', <Type size={15} />, 'Text')}
          {tabBtn('shapes', <Shapes size={15} />, 'Shapes')}
          {tabBtn('images', <ImageIcon size={15} />, 'Logos')}
          {tabBtn('patterns', <Palette size={15} />, 'Pattern')}
          {tabBtn('templates', <LayoutTemplate size={15} />, 'Layouts')}
        </div>

        {/* Add drawer */}
        {showLeft && <aside className={`${narrow ? 'absolute left-[44px] top-0 bottom-0 z-30 shadow-xl' : ''} w-[250px] shrink-0 overflow-y-auto border-r border-mt-border bg-mt-surface p-3 space-y-2`} aria-label="Add to the print file">
          <div className="flex items-center justify-between"><p className={h4}>{{ text: 'Text', shapes: 'Shapes', images: 'Logos & pictures', patterns: 'Patterns', templates: 'Layouts' }[tab]}</p>{narrow && <button type="button" onClick={() => setShowLeft(false)} aria-label="Close panel" className="p-1"><X size={14} /></button>}</div>
          {tab === 'text' && <>
            <p className="text-[12px] text-mt-muted">Text is drawn from the font file itself — exact letters, live or outlined in the print file.</p>
            <button type="button" onClick={() => addText('TEAM NAME', { size: 70, upper: true })} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] font-semibold hover:bg-mt-surface2">+ Add text</button>
            <button type="button" onClick={() => addText('CLUB', { size: 60, upper: true, arc: 70, name: 'Curved text' })} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Curved text</button>
            <button type="button" onClick={() => { const b = board.pieces.find((p) => p.piece.id === 'back'); addText('{NAME}', { upper: true, size: 62, fitW: b ? b.piece.w * 0.78 : undefined, name: 'Player name', fill: kit.nameColor }, 'back'); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2"><b>+ Player name</b> <span className="text-mt-muted">— filled from the list</span></button>
            <button type="button" onClick={() => { const b = board.pieces.find((p) => p.piece.id === 'back'); addText('{NUMBER}', { size: 280, fitW: b ? b.piece.w * 0.7 : undefined, name: 'Player number', fill: kit.numberColor }, 'back'); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2"><b>+ Player number</b> <span className="text-mt-muted">— filled from the list</span></button>
            <button type="button" onClick={() => addText('{TEAM}', { size: 40, upper: true, name: 'Team name' })} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Team name</button>
            <button type="button" onClick={() => addText('{SIZE}', { size: 20, name: 'Size label', fill: '#000000' })} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Size label</button>
            <p className="pt-1 text-[11.5px] text-mt-muted">Type <code>{'{NAME}'}</code>, <code>{'{NUMBER}'}</code>, <code>{'{SIZE}'}</code> or <code>{'{TEAM}'}</code> in any text. The master design stays one; every garment gets its own.</p>
          </>}
          {tab === 'shapes' && <>
            <div className="grid grid-cols-4 gap-1.5">
              <button type="button" onClick={() => { const [x, y] = centreOf(); add({ kind: 'rect', w: 200, h: 120, fill: defaultFill(), m: T(x, y), name: 'Rectangle' } as any); }} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center" aria-label="Rectangle"><Square size={20} /></button>
              <button type="button" onClick={() => { const [x, y] = centreOf(); add({ kind: 'ellipse', rx: 80, ry: 80, fill: defaultFill(), m: T(x, y), name: 'Circle' } as any); }} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center" aria-label="Circle"><Circle size={20} /></button>
              <button type="button" onClick={() => addShape(polygonPath(3), 'Triangle')} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center" aria-label="Triangle"><Triangle size={20} /></button>
              <button type="button" onClick={() => addShape('M-50 -6L50 -6L50 6L-50 6Z', 'Stripe')} className="aspect-square rounded-lg border border-mt-border hover:bg-mt-surface2 flex items-center justify-center text-[11px]" aria-label="Stripe">Stripe</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">{num('Polygon sides', polySides, (n) => setPolySides(Math.max(3, Math.min(32, Math.round(n)))))}{num('Star points', starPoints, (n) => setStarPoints(Math.max(3, Math.min(32, Math.round(n)))))}</div>
            <select value={shapeCat} onChange={(e) => setShapeCat(e.target.value)} aria-label="Shape category" className={field}>{MOTIF_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <div className="grid grid-cols-4 gap-1.5">
              {MOTIFS.filter((m: any) => m.cat === shapeCat).map((m: any) => (
                <button key={m.id} type="button" title={m.label} aria-label={`Shape ${m.label}`} onClick={() => addShape(m.d, m.label)} className="aspect-square rounded-lg border border-mt-border p-1.5 hover:bg-mt-surface2"><svg viewBox="-55 -55 110 110" className="h-full w-full"><path d={m.d} fill="currentColor" fillRule="evenodd" /></svg></button>
              ))}
            </div>
          </>}
          {tab === 'images' && <>
            <button type="button" onClick={() => imgFile.current?.click()} className="w-full h-10 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Upload logo or picture</button>
            <p className="text-[11.5px] text-mt-muted">SVG logos stay vectors in the print file. PNG / JPG print at their own resolution. Nothing is uploaded. Logo positions: Layouts → Chest logo area.</p>
            {kit.teamLogo && <button type="button" onClick={async () => { const blob = await (await fetch(kit.teamLogo!)).blob(); addImage(new File([blob], 'Team logo.png', { type: blob.type })); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Team logo (from the quick design)</button>}
            {kit.sponsorLogo && <button type="button" onClick={async () => { const blob = await (await fetch(kit.sponsorLogo!)).blob(); addImage(new File([blob], 'Sponsor.png', { type: blob.type })); }} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ Sponsor (from the quick design)</button>}
          </>}
          {tab === 'patterns' && <>
            <p className="text-[12px] text-mt-muted">Adds a pattern panel over the front — move or resize it, or select a shape and choose “Pattern” as its fill.</p>
            <button type="button" onClick={() => addPatternPanel(pattern, 'Current pattern')} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ The garment’s current pattern</button>
            {libraryPatterns.map((a) => <button key={a.id} type="button" onClick={() => addPatternPanel(a.data, a.name, a.id)} className="w-full flex items-center gap-2 rounded-lg border border-mt-border p-1.5 text-left text-[12.5px] hover:bg-mt-surface2">{a.thumb ? <img src={a.thumb} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="h-9 w-9 rounded bg-mt-surface2" />}<span className="truncate">{a.name}</span></button>)}
            {!libraryPatterns.length && <p className="text-[11.5px] text-mt-faint">Patterns you save in Pattern Design appear here.</p>}
          </>}
          {tab === 'templates' && <>
            <p className="text-[12px] text-mt-muted">Ready layouts made of editable shapes — change, move or delete any part.</p>
            {([['sash', 'Sash'], ['hoops', 'Hoops'], ['stripes', 'Stripes'], ['sides', 'Side panels'], ['chevron', 'Chevron'], ['fade', 'Gradient fade'], ['cuffs', 'Sleeve cuffs'], ['back-name', 'Name & number on the back'], ['front-number', 'Front number'], ['chest-logo', 'Chest logo area'], ['sleeve-text', 'Team name on the sleeves']] as const).map(([id, l]) => <button key={id} type="button" onClick={() => template(id)} className="w-full rounded-lg border border-mt-border p-2 text-left text-[13px] hover:bg-mt-surface2">+ {l}</button>)}
          </>}
        </aside>}
        <input ref={imgFile} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addImage(f); }} />

        {/* Canvas */}
        <div className="relative min-w-0 flex-1" ref={host}>
          <canvas ref={canvasEl} />
          {tool === 'pen' && <p className="pointer-events-none absolute left-3 top-2 rounded-md bg-mt-surface/90 px-2 py-1 text-[11.5px] text-mt-muted">Pen: click for a corner, drag for a curve. Click the first point to close, double-click or Enter to finish, Esc to cancel.</p>}
          {tool === 'node' && <p className="pointer-events-none absolute left-3 top-2 rounded-md bg-mt-surface/90 px-2 py-1 text-[11.5px] text-mt-muted">Edit points: select a shape, drag its points and handles. Double-click the outline to add a point; Delete removes the selected point.</p>}
          {measure && <p className="pointer-events-none absolute right-3 top-2 rounded-md bg-mt-ink px-2 py-1 text-[12px] font-semibold text-mt-bg tabular-nums">{measure}</p>}
        </div>

        {/* Properties + layers */}
        {showRight && <aside className={`${narrow ? 'absolute right-0 top-0 bottom-0 z-30 shadow-xl' : ''} w-[290px] shrink-0 overflow-y-auto border-l border-mt-border bg-mt-surface p-3 space-y-3`} aria-label="Properties">
          {narrow && <div className="flex justify-end"><button type="button" onClick={() => setShowRight(false)} aria-label="Close properties" className="p-1"><X size={14} /></button></div>}
          {!selIds.length && <p className="text-[12.5px] text-mt-muted">Select something on the print file to change its colours, size and placement — or pick a tool on the left.</p>}
          {multi && <section className="space-y-2" aria-label="Arrange selection">
            <p className={h4}>{selIds.length} selected</p>
            <div className="flex flex-wrap gap-1">{([['left', AlignStartVertical], ['hcenter', AlignCenterVertical], ['right', AlignEndVertical], ['top', AlignStartHorizontal], ['vcenter', AlignCenterHorizontal], ['bottom', AlignEndHorizontal]] as const).map(([k, Ic]) => <button key={k} type="button" onClick={() => align(k)} aria-label={`Align ${k}`} title={`Align ${k}`} className={iconBtn}><Ic size={15} /></button>)}</div>
            <div className="grid grid-cols-2 gap-1.5"><button type="button" onClick={() => distribute('h')} className="h-8 rounded-lg border border-mt-border text-[12px]">Distribute ↔</button><button type="button" onClick={() => distribute('v')} className="h-8 rounded-lg border border-mt-border text-[12px]">Distribute ↕</button></div>
            <div className="grid grid-cols-2 gap-1.5"><button type="button" onClick={() => group()} className="h-8 rounded-lg border border-mt-border text-[12px]">Group</button><button type="button" onClick={() => group(true)} className="h-8 rounded-lg border border-mt-border text-[12px]">Clipping mask</button></div>
            {canBool && <><p className={h4}>Combine shapes</p><div className="grid grid-cols-2 gap-1.5">{([['union', 'Union'], ['subtract', 'Minus front'], ['intersect', 'Intersect'], ['exclude', 'Exclude']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => boolean(k)} className="h-8 rounded-lg border border-mt-border text-[12px]">{l}</button>)}</div></>}
          </section>}
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
              {tool === 'node' && selected.kind === 'path' && <section className="space-y-1.5" aria-label="Points">
                <p className={h4}>Points</p>
                <div className="grid grid-cols-3 gap-1.5"><button type="button" disabled={nodeSel?.kind !== 'anchor'} onClick={() => nodeOp('smooth')} className="h-8 rounded-lg border border-mt-border text-[12px] disabled:opacity-40">Smooth</button><button type="button" disabled={nodeSel?.kind !== 'anchor'} onClick={() => nodeOp('corner')} className="h-8 rounded-lg border border-mt-border text-[12px] disabled:opacity-40">Corner</button><button type="button" disabled={nodeSel?.kind !== 'anchor'} onClick={() => nodeOp('delete')} className="h-8 rounded-lg border border-mt-border text-[12px] disabled:opacity-40">Delete</button></div>
              </section>}
              {selected.kind === 'group' && <section className="space-y-1.5"><p className="text-[12px] text-mt-muted">{selected.clip ? 'Clipping mask: the first shape clips the others.' : `Group of ${selected.els.length}.`}</p><button type="button" onClick={ungroup} className="h-8 w-full rounded-lg border border-mt-border text-[12px]">{selected.clip ? 'Release mask' : 'Ungroup'}</button></section>}
              {selected.kind === 'text' && <section className="space-y-2" aria-label="Text">
                <label className={lbl}>Text<textarea value={selected.text} onChange={(e) => update(selected.id, { text: e.target.value } as any)} rows={2} aria-label="Text content" className="mt-1 w-full rounded-lg border border-mt-border bg-mt-bg p-2 text-[13px]" /></label>
                <label className={lbl}>Font<select value={selected.font} onChange={(e) => { const def = PATTERN_FONTS.find((x) => x.family === e.target.value); const w = def && !def.weights.includes(selected.weight) ? def.weights[def.weights.length - 1] : selected.weight; update(selected.id, { font: e.target.value, weight: w } as any); }} aria-label="Font" className={field} style={{ fontFamily: selected.font }}>{PATTERN_FONTS.map((f2) => <option key={f2.family} value={f2.family}>{f2.family}</option>)}</select></label>
                <div className="grid grid-cols-3 gap-1.5">
                  <label className={lbl}>Weight<select value={selected.weight} onChange={(e) => update(selected.id, { weight: Number(e.target.value) } as any)} aria-label="Font weight" className={field}>{(PATTERN_FONTS.find((x) => x.family === selected.font)?.weights || [400, 700]).map((w) => <option key={w} value={w}>{w}</option>)}</select></label>
                  {num('Size (mm)', selected.size, (n) => update(selected.id, { size: Math.max(2, n) } as any))}
                  {num('Spacing', (selected.spacing || 0) * 100, (n) => update(selected.id, { spacing: n / 100 } as any))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">{num('Line height', (selected.lineHeight || 1.15) * 100, (n) => update(selected.id, { lineHeight: Math.max(50, n) / 100 } as any), 5)}{num('Curve (°)', selected.arc || 0, (n) => update(selected.id, { arc: Math.max(-300, Math.min(300, n)) } as any), 5)}</div>
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  {(['left', 'center', 'right'] as const).map((a) => <button key={a} type="button" aria-pressed={(selected.align || 'center') === a} onClick={() => update(selected.id, { align: a } as any)} className={`h-8 px-2.5 rounded-lg border text-[12px] capitalize ${(selected.align || 'center') === a ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{a}</button>)}
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!selected.upper} onChange={(e) => update(selected.id, { upper: e.target.checked } as any)} className="h-4 w-4 accent-[#3B82C4]" /> CAPS</label>
                  <label className="inline-flex items-center gap-1"><input type="checkbox" checked={!!selected.italic} onChange={(e) => update(selected.id, { italic: e.target.checked } as any)} className="h-4 w-4 accent-[#3B82C4]" /> Italic</label>
                </div>
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!selected.fitW} onChange={(e) => update(selected.id, { fitW: e.target.checked ? Math.round(s.bw) : undefined } as any)} className="h-4 w-4 accent-[#3B82C4]" /> Long names shrink to fit</label>
                {selected.fitW ? num('Fit width (mm)', selected.fitW, (n) => update(selected.id, { fitW: Math.max(10, n) } as any)) : null}
                <button type="button" onClick={toOutlines} className="h-8 w-full rounded-lg border border-mt-border text-[12px]">Convert to outlines (editable shape)</button>
              </section>}
              {selected.kind !== 'image' && selected.kind !== 'group' && <section className="space-y-2" aria-label="Colour">
                <p className={h4}>Fill</p>
                <div className="grid grid-cols-5 gap-1">{(['none', 'solid', 'linear', 'radial', 'pattern'] as const).map((k) => <button key={k} type="button" aria-pressed={fillKind === k} onClick={() => {
                  const base = typeof f === 'string' ? f : f && 'stops' in f ? f.stops[0][1] : defaultFill();
                  const next: Fill | null = k === 'none' ? null : k === 'solid' ? base : k === 'pattern' ? { type: 'pattern', pattern: libraryPatterns[0]?.data || pattern, tileMm: 60, assetId: libraryPatterns[0]?.id, name: libraryPatterns[0]?.name || 'Pattern' } : { type: k, stops: [[0, base], [1, kit.accent2 || '#FFFFFF']], angle: 90 };
                  update(selected.id, { fill: next } as any);
                }} className={`h-8 rounded-lg border text-[10.5px] font-semibold capitalize ${fillKind === k ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{k === 'linear' ? 'Grad.' : k === 'radial' ? 'Radial' : k}</button>)}</div>
                {fillKind === 'solid' && <label className="flex items-center gap-2 text-[12px]"><input type="color" value={(f as string).slice(0, 7)} onChange={(e) => update(selected.id, { fill: e.target.value } as any)} aria-label="Fill colour" className="h-9 w-12 rounded border border-mt-border" /><input value={f as string} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && update(selected.id, { fill: e.target.value } as any)} aria-label="Fill HEX" className="h-9 w-24 rounded-lg border border-mt-border bg-mt-bg px-2 font-mono text-[12px]" /></label>}
                {(fillKind === 'linear' || fillKind === 'radial') && f && typeof f === 'object' && 'stops' in f && <div className="space-y-1.5">
                  {f.stops.map(([o, c2], i) => <div key={i} className="flex items-center gap-1.5"><input type="color" value={c2.slice(0, 7)} onChange={(e) => update(selected.id, { fill: { ...f, stops: f.stops.map((st, j) => (j === i ? [st[0], e.target.value] : st)) } } as any)} aria-label={`Gradient colour ${i + 1}`} className="h-8 w-10 rounded border border-mt-border" /><input type="range" min={0} max={100} value={Math.round(o * 100)} onChange={(e) => update(selected.id, { fill: { ...f, stops: f.stops.map((st, j) => (j === i ? [Number(e.target.value) / 100, st[1]] : st)) } } as any)} aria-label={`Gradient stop ${i + 1} position`} className="flex-1" />{f.stops.length > 2 && <button type="button" onClick={() => update(selected.id, { fill: { ...f, stops: f.stops.filter((_, j) => j !== i) } } as any)} aria-label="Remove colour stop" className="text-[12px] px-1">×</button>}</div>)}
                  <div className="flex items-center gap-2"><button type="button" onClick={() => update(selected.id, { fill: { ...f, stops: ([...f.stops, [1, '#000000']] as [number, string][]).sort((a, b) => a[0] - b[0]) } } as any)} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">+ Colour</button>{fillKind === 'linear' && num('Angle °', f.angle ?? 90, (n) => update(selected.id, { fill: { ...f, angle: n } } as any))}</div>
                </div>}
                {fillKind === 'pattern' && f && typeof f === 'object' && f.type === 'pattern' && <div className="space-y-1.5">
                  <label className={lbl}>Pattern<select value={f.assetId || '__current'} onChange={(e) => { const a = libraryPatterns.find((x) => x.id === e.target.value); update(selected.id, { fill: { ...f, pattern: a ? a.data : pattern, assetId: a?.id || null, name: a?.name || 'Current pattern' } } as any); }} aria-label="Pattern" className={field}><option value="__current">The garment’s current pattern</option>{libraryPatterns.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
                  {num('Repeat size (mm)', f.tileMm, (n) => update(selected.id, { fill: { ...f, tileMm: Math.max(5, n) } } as any))}
                  <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={f.bg === null} onChange={(e) => update(selected.id, { fill: { ...f, bg: e.target.checked ? null : undefined } } as any)} className="h-4 w-4 accent-[#3B82C4]" /> See-through background</label>
                </div>}
                <p className={`pt-1 ${h4}`}>Outline</p>
                <div className="flex items-end gap-2"><input type="color" value={(selected as any).stroke || '#000000'} onChange={(e) => update(selected.id, { stroke: e.target.value, strokeW: (selected as any).strokeW || 2 } as any)} aria-label="Outline colour" className="h-9 w-12 rounded border border-mt-border" />{num('Width (mm)', (selected as any).strokeW || 0, (n) => update(selected.id, { strokeW: Math.max(0, n), stroke: (selected as any).stroke || '#000000' } as any), 0.5)}</div>
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!selected.dash?.length} onChange={(e) => update(selected.id, { dash: e.target.checked ? [4, 3] : null })} className="h-4 w-4 accent-[#3B82C4]" /> Dashed outline</label>
                {(selected.kind === 'path' || selected.kind === 'text') && <>
                  <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!selected.stroke2} onChange={(e) => update(selected.id, { stroke2: e.target.checked ? { color: '#000000', width: 3 } : null })} className="h-4 w-4 accent-[#3B82C4]" /> Second outline (outside)</label>
                  {selected.stroke2 && <div className="flex items-end gap-2"><input type="color" value={selected.stroke2.color} onChange={(e) => update(selected.id, { stroke2: { ...selected.stroke2!, color: e.target.value } })} aria-label="Second outline colour" className="h-9 w-12 rounded border border-mt-border" />{num('Width (mm)', selected.stroke2.width, (n) => update(selected.id, { stroke2: { ...selected.stroke2!, width: Math.max(0, n) } }), 0.5)}</div>}
                </>}
                <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={!!selected.shadow} onChange={(e) => update(selected.id, { shadow: e.target.checked ? { dx: 4, dy: 4, color: '#000000' } : null })} className="h-4 w-4 accent-[#3B82C4]" /> Drop shadow (solid)</label>
                {selected.shadow && <div className="grid grid-cols-[48px_1fr_1fr] items-end gap-2"><input type="color" value={selected.shadow.color} onChange={(e) => update(selected.id, { shadow: { ...selected.shadow!, color: e.target.value } })} aria-label="Shadow colour" className="h-9 w-12 rounded border border-mt-border" />{num('Right (mm)', selected.shadow.dx, (n) => update(selected.id, { shadow: { ...selected.shadow!, dx: n } }), 0.5)}{num('Down (mm)', selected.shadow.dy, (n) => update(selected.id, { shadow: { ...selected.shadow!, dy: n } }), 0.5)}</div>}
              </section>}
              <section className="space-y-2" aria-label="Placement">
                <p className={h4}>Transform (mm, size M)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {num('X (centre)', geo.x, (n) => setGeo({ x: n }))}
                  {num('Y (centre)', geo.y, (n) => setGeo({ y: n }))}
                  {num('Width', s.w, (n) => setGeo({ sx: Math.sign(geo.sx || 1) * Math.max(0.001, n / s.bw), ...(lockRatio.current ? { sy: Math.sign(geo.sy || 1) * Math.max(0.001, (n / s.bw) * Math.abs(geo.sy / (geo.sx || 1))) } : {}) }))}
                  {num('Height', s.h, (n) => setGeo({ sy: Math.sign(geo.sy || 1) * Math.max(0.001, n / s.bh), ...(lockRatio.current ? { sx: Math.sign(geo.sx || 1) * Math.max(0.001, (n / s.bh) * Math.abs(geo.sx / (geo.sy || 1))) } : {}) }))}
                  {num('Rotate °', geo.rot, (n) => setGeo({ rot: n }))}
                  {num('Skew °', geo.skew, (n) => setGeo({ skew: Math.max(-70, Math.min(70, n)) }))}
                </div>
                <label className={lbl}>Opacity<input type="range" min={0} max={100} value={Math.round((selected.opacity ?? 1) * 100)} onChange={(e) => update(selected.id, { opacity: Number(e.target.value) / 100 })} aria-label="Opacity" className="mt-1 w-full" /></label>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setGeo({ sx: -geo.sx })} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">Mirror ↔</button>
                  <button type="button" onClick={() => setGeo({ sy: -geo.sy })} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">Mirror ↕</button>
                  {([['hcenter', 'Centre on piece ↔'], ['vcenter', 'Centre on piece ↕']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => align(k)} className="h-8 px-2.5 rounded-lg border border-mt-border text-[12px]">{l}</button>)}
                </div>
              </section>
            </>;
          })()}
          <section aria-label="Layers" className="space-y-1">
            <div className="flex items-center justify-between"><p className={h4}>Layers ({art.length})</p>{selIds.length > 0 && <span className="inline-flex gap-1"><button type="button" onClick={() => arrange('forward')} aria-label="Bring forward" className="h-7 w-7 rounded border border-mt-border inline-flex items-center justify-center"><ArrowUp size={13} /></button><button type="button" onClick={() => arrange('backward')} aria-label="Send backward" className="h-7 w-7 rounded border border-mt-border inline-flex items-center justify-center"><ArrowDown size={13} /></button></span>}</div>
            <ul className="space-y-0.5">{[...art].reverse().map((e) => <li key={e.id} className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12.5px] ${selIds.includes(e.id) ? 'bg-mt-ink/10' : 'hover:bg-mt-surface2'}`}>
              <button type="button" onClick={(ev) => { const ids = ev.shiftKey ? Array.from(new Set([...selIds, e.id])) : [e.id]; if (!e.locked) selectIds(ids); else setSelIds(ids); }} className="min-w-0 flex-1 truncate text-left">{e.kind === 'text' ? (/\{(NAME|NUMBER)\}/i.test(e.text) ? <Hash size={12} className="inline mr-1" /> : <Type size={12} className="inline mr-1" />) : e.kind === 'image' ? <ImageIcon size={12} className="inline mr-1" /> : <Shapes size={12} className="inline mr-1" />}{e.name || (e.kind === 'text' ? e.text : e.kind)}</button>
              <button type="button" onClick={() => update(e.id, { hidden: !e.hidden })} aria-label={e.hidden ? 'Show' : 'Hide'} className="p-1">{e.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              <button type="button" onClick={() => update(e.id, { locked: !e.locked })} aria-label={e.locked ? 'Unlock' : 'Lock'} className="p-1">{e.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
            </li>)}</ul>
            {!art.length && <p className="text-[12px] text-mt-faint">No artwork yet.</p>}
          </section>
        </aside>}
      </div>

      {/* View bar + status bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-mt-border bg-mt-surface px-3 py-1">
        <div role="tablist" aria-label="View" className="flex items-center gap-0.5">
          {([['front', 'Front'], ['back', 'Back'], ['sleeves', 'Sleeves'], ['all', 'All pieces']] as const).map(([v, l]) => <button key={v} type="button" onClick={() => fit(v)} className="h-7 px-3 rounded-full text-[12px] font-semibold text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink">{l}</button>)}
          <button type="button" onClick={() => fit('all')} aria-label="Fit" className="h-7 w-7 rounded-full inline-flex items-center justify-center text-mt-muted hover:bg-mt-surface2"><Maximize2 size={13} /></button>
        </div>
        <div aria-label="Status" className="ml-auto flex flex-wrap items-center gap-x-3 text-[11.5px] text-mt-muted tabular-nums">
          <span title="Document">{narrow ? `${Math.round(board.w)} × ${Math.round(board.h)} mm · M` : `${product.label} · ${Math.round(board.w)} × ${Math.round(board.h)} mm · standard template, size M`}</span>
          <span>{selBox ? `Selection ${r1(selBox.w)} × ${r1(selBox.h)} mm @ ${r1(selBox.x)}, ${r1(selBox.y)}` : 'No selection'}</span>
          <span>{pointer ? `X ${r1(pointer.x)} · Y ${r1(pointer.y)} mm` : '—'}</span>
          <span>{zoomPct}%</span>
          <span>RGB · mm</span>
          <span>{activeTool.label.split(' (')[0]}</span>
          <span className={dirty ? 'text-amber-600' : ''}>{dirty ? 'Not saved' : 'Saved'}</span>
        </div>
      </div>

      {showKeys && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4" onClick={() => setShowKeys(false)}>
        <div role="dialog" aria-label="Keyboard shortcuts" className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-mt-surface p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Keyboard shortcuts</h2><button type="button" onClick={() => setShowKeys(false)} aria-label="Close" className="p-1"><X size={16} /></button></div>
          <table className="mt-3 w-full text-[13px]"><tbody>
            {[...TOOLS.map((x) => [x.key, x.label]), ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'], ['Ctrl+S', 'Save to the garment'], ['Ctrl+C / X / V', 'Copy / cut / paste'], ['Ctrl+D', 'Duplicate'], ['Ctrl+G / Ctrl+Shift+G', 'Group / ungroup'], ['Ctrl+7', 'Clipping mask'], ['Ctrl+A', 'Select all'], ['Delete', 'Delete selection (or point)'], ['Arrows / Shift+Arrows', 'Move 1 mm / 10 mm'], ['[ ] / Shift+[ ]', 'Backward / forward · to back / front'], ['Space + drag', 'Pan'], ['Ctrl + scroll, Ctrl + / −, Ctrl+0', 'Zoom / fit'], ['Esc', 'Cancel, back to Selection']].map(([k, l]) => <tr key={k} className="border-t border-mt-border"><td className="py-1.5 pr-4 font-mono text-[12px]">{k}</td><td className="py-1.5">{l}</td></tr>)}
          </tbody></table>
        </div>
      </div>}
    </div>
  );
}

const lockRatio = { current: true };
/** Position (centre), rotation, scale and skew of a matrix: m = T · R · K(skew) · S. */
function decomposeM(m: Mat): { x: number; y: number; rot: number; sx: number; sy: number; skew: number } {
  const [a, b, c, d] = m;
  const sx = Math.hypot(a, b) || 1e-9;
  const rot = Math.atan2(b, a);
  const det = a * d - b * c;
  const sy = det / sx;
  const shear = (a * c + b * d) / (sx * sx); // tan(skew) · sy / sx after rotation
  const skew = (Math.atan2(shear * sx, sy) * 180) / Math.PI;
  return { x: m[4], y: m[5], rot: Math.round(((rot * 180) / Math.PI) * 100) / 100, sx, sy, skew: Math.round(skew * 100) / 100 };
}
function composeM(g: { x: number; y: number; rot: number; sx: number; sy: number; skew: number }): Mat {
  const r = (g.rot * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const t = Math.tan(((g.skew || 0) * Math.PI) / 180);
  // R · [[1, t], [0, 1]] · S
  const a = cos * g.sx, b = sin * g.sx;
  const c = (cos * t - sin) * g.sy, d = (sin * t + cos) * g.sy;
  return [a, b, c, d, g.x, g.y];
}
