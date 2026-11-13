'use client';

// Garment designer — one guided flow for jerseys, polo T-shirts and custom
// T-shirts: 1 Design (style, colours, graphics, pattern) → 2 Logos & text →
// 3 Names & numbers (or sizes only) → 4 Players / quantities → 5 Print files.
// The preview shows the finished garment front and back (or the flat print
// pieces). Downloads are real vectors: one print-ready PDF with every
// selected garment nested on the roll, plus SVG and per-player files.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Download, FileArchive, FileUp, FolderOpen, Layers, Loader2, MousePointerClick, Plus, Printer, RotateCcw, Save, Shirt, Trash2, Upload, X } from 'lucide-react';
import { DEFAULT_PATTERN, PatternSettings, svgDataUrl, sheetPlacements, motifPath, layout } from '@/lib/patterns';
import { SIZES, ROLLS } from '@/lib/garments';
import {
  GARMENT_STYLES, GarmentKind, Glyphs, KIT_GRAPHICS, KIT_STYLES, KitDesign, KitGraphic, Player, checkRoster, glyphTexts, kitFor,
  kitMockupSvg, kitPreviewSvg, parseRoster, playerPrintSvg, printList, rosterSheets, safeFile, sizeId, frontLayout, kitProduct,
} from '@/lib/teamKit';
import { decodeMtdt, encodeMtdt, mtdtFileName, MTDT_EXT } from '@/lib/mtdt';
import { LeaveGuard } from './LeaveGuard';
import { PATTERN_FONTS, textOutline } from '@/lib/patternText';
import { supabase } from '@/lib/supabase';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';

type Step = 'design' | 'logos' | 'letters' | 'players' | 'print';
type El = 'body' | 'sleeve' | 'collar' | 'name' | 'number' | 'teamLogo' | 'sponsor' | 'frontText' | 'frontNum';
const DRAG: El[] = ['name', 'number', 'teamLogo', 'sponsor', 'frontText', 'frontNum'];
const PROJECTS = 'mt:textile-projects';
interface SavedProject { id: string; kind: GarmentKind; name: string; updated: string; data: any }

const COPY: Record<GarmentKind, { noun: string; players: string; sample: Player[] }> = {
  jersey: { noun: 'jersey', players: 'Players', sample: [{ name: 'Arun', number: '07', size: 'S' }, { name: 'Kumar', number: '10', size: 'M' }, { name: 'David', number: '11', size: 'L' }, { name: 'John', number: '23', size: 'XL' }] },
  polo: { noun: 'polo T-shirt', players: 'Staff', sample: [{ name: '', number: '', size: 'S', qty: 4 }, { name: '', number: '', size: 'M', qty: 8 }, { name: '', number: '', size: 'L', qty: 6 }, { name: '', number: '', size: 'XL', qty: 2 }] },
  tshirt: { noun: 'T-shirt', players: 'People', sample: [{ name: '', number: '', size: 'S', qty: 5 }, { name: '', number: '', size: 'M', qty: 10 }, { name: '', number: '', size: 'L', qty: 10 }, { name: '', number: '', size: 'XL', qty: 5 }] },
};

// Ready-made designs to start from (colours + graphic).
const STARTERS: { name: string; o: Partial<KitDesign> }[] = [
  { name: 'Navy sash', o: { body: '#1E3A5F', sleeve: '#1E3A5F', collar: '#C9A86A', accent: '#C9A86A', accent2: '#FFFFFF', graphic: 'sash', nameColor: '#FFFFFF', numberColor: '#FFFFFF', outlineColor: '#C9A86A' } },
  { name: 'Red hoops', o: { body: '#FFFFFF', sleeve: '#B91C1C', collar: '#B91C1C', accent: '#B91C1C', accent2: '#FFFFFF', graphic: 'hoops', nameColor: '#111111', numberColor: '#111111', outlineColor: '#FFFFFF' } },
  { name: 'Green chevron', o: { body: '#0F766E', sleeve: '#0F766E', collar: '#FACC15', accent: '#FACC15', accent2: '#FFFFFF', graphic: 'chevron', nameColor: '#FFFFFF', numberColor: '#FACC15', outlineColor: '#0B3B36' } },
  { name: 'Black side panels', o: { body: '#111827', sleeve: '#111827', collar: '#F97316', accent: '#F97316', accent2: '#FFFFFF', graphic: 'side-panels', nameColor: '#FFFFFF', numberColor: '#F97316', outlineColor: '#111827' } },
  { name: 'Sky stripes', o: { body: '#E0F2FE', sleeve: '#0284C7', collar: '#0C4A6E', accent: '#0284C7', accent2: '#FFFFFF', graphic: 'stripes', nameColor: '#0C4A6E', numberColor: '#0C4A6E', outlineColor: '#FFFFFF' } },
  { name: 'Purple yoke', o: { body: '#4C1D95', sleeve: '#4C1D95', collar: '#FDE68A', accent: '#FDE68A', accent2: '#A78BFA', graphic: 'yoke', nameColor: '#FDE68A', numberColor: '#FFFFFF', outlineColor: '#4C1D95' } },
  { name: 'Half & half', o: { body: '#DC2626', sleeve: '#DC2626', collar: '#111111', accent: '#111111', accent2: '#FFFFFF', graphic: 'split', nameColor: '#FFFFFF', numberColor: '#FFFFFF', outlineColor: '#111111' } },
  { name: 'Gold halftone', o: { body: '#111827', sleeve: '#111827', collar: '#D4A017', accent: '#D4A017', accent2: '#FFFFFF', graphic: 'halftone', nameColor: '#FFFFFF', numberColor: '#D4A017', outlineColor: '#111827' } },
  { name: 'Maroon double sash', o: { body: '#7F1D1D', sleeve: '#7F1D1D', collar: '#FBBF24', accent: '#FBBF24', accent2: '#FFFFFF', graphic: 'double-sash', nameColor: '#FFFFFF', numberColor: '#FFFFFF', outlineColor: '#FBBF24' } },
  { name: 'Blue diagonal', o: { body: '#1D4ED8', sleeve: '#1E3A8A', collar: '#FFFFFF', accent: '#3B82F6', accent2: '#FFFFFF', graphic: 'diagonal', nameColor: '#FFFFFF', numberColor: '#FFFFFF', outlineColor: '#1E3A8A' } },
  { name: 'Centre stripe', o: { body: '#FFFFFF', sleeve: '#16A34A', collar: '#16A34A', accent: '#16A34A', accent2: '#111827', graphic: 'centre-stripe', nameColor: '#111827', numberColor: '#16A34A', outlineColor: '#FFFFFF' } },
  { name: 'Classic white', o: { body: '#FFFFFF', sleeve: '#FFFFFF', collar: '#1E3A5F', accent: '#1E3A5F', accent2: '#C9A86A', graphic: 'band', nameColor: '#1E3A5F', numberColor: '#1E3A5F', outlineColor: '#FFFFFF' } },
];

// Sports patterns (the motif colour is set separately).
const PATTERNS: { name: string; p: Partial<PatternSettings> }[] = [
  { name: 'Diamonds', p: { motif: 'diamond', repeat: 'brick', scale: 0.35 } },
  { name: 'Hexagons', p: { motif: 'hexagon-ring', repeat: 'brick', scale: 0.6 } },
  { name: 'Stars', p: { motif: 'star5', repeat: 'half-drop', scale: 0.4 } },
  { name: 'Dots', p: { motif: 'dot', repeat: 'half-drop', scale: 0.25 } },
  { name: 'Chevrons', p: { motif: 'chevron', repeat: 'grid', scale: 0.55 } },
  { name: 'Triangles', p: { motif: 'triangle', repeat: 'brick', scale: 0.4 } },
  { name: 'Waves', p: { motif: 'wave', repeat: 'grid', scale: 0.8 } },
  { name: 'Checks', p: { motif: 'checker', repeat: 'grid', scale: 0.9 } },
  { name: 'Bursts', p: { motif: 'sunburst', repeat: 'half-drop', scale: 0.5 } },
  { name: 'Crosses', p: { motif: 'x-mark', repeat: 'half-drop', scale: 0.3 } },
  { name: 'Pinwheels', p: { motif: 'pinwheel', repeat: 'grid', scale: 0.55 } },
  { name: 'Leaves', p: { motif: 'leaf', repeat: 'half-drop', scale: 0.45, rotation: 30 } },
];

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function readLogo(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
const DEFAULT_KIT_POS = { nameTopMm: 95, numberTopMm: 175 };
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const sizeLabel = (s: string) => (SIZES.find((x) => x.id === sizeId(s))?.label || s).replace(/ .*/, '');

export function GarmentDesigner({ kind }: { kind: GarmentKind }) {
  const copy = COPY[kind];
  const KEY = `mt:garment:${kind}`;
  const router = useRouter();
  const [step, setStep] = useState<Step>('design');
  const [kit, setKit] = useState<KitDesign>(() => kitFor(kind));
  const [players, setPlayers] = useState<Player[]>(copy.sample);
  const [pat, setPat] = useState<PatternSettings>({ ...DEFAULT_PATTERN, ...PATTERNS[0].p });
  const [patColor, setPatColor] = useState('#FFFFFF');
  const [patName, setPatName] = useState(PATTERNS[0].name);
  const [mine, setMine] = useState<{ name: string; p: PatternSettings }[]>([]);
  const [sel, setSel] = useState(0);
  const [view, setView] = useState<'garment' | 'flat'>('garment');
  const [side, setSide] = useState<'both' | 'front' | 'back'>('both');
  const [glyphs, setGlyphs] = useState<Glyphs>({});
  const [making, setMaking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const [rollW, setRollW] = useState(1600);
  const [bleed, setBleed] = useState(10);
  const [pageMm, setPageMm] = useState(5000);
  const [group, setGroup] = useState<'player' | 'fabric'>('player');
  const [mirror, setMirror] = useState(false);
  const [selEl, setSelEl] = useState<El | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<SavedProject[] | null>(null);
  const [delAsk, setDelAsk] = useState<string | null>(null);
  const live = useRef(false);
  const [dirty, setDirty] = useState(false);
  const settle = () => { live.current = false; setDirty(false); setTimeout(() => { live.current = true; }, 400); };
  const drag = useRef<{ el: El; x: number; y: number; scale: number; k: KitDesign } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<boolean[]>([]);
  const csvRef = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, string | null>());
  const set = (o: Partial<KitDesign>) => setKit((k) => ({ ...k, ...o }));
  const personal = kit.personalise !== false;

  // Restore this designer's last work, and the patterns saved in Pattern Studio.
  useEffect(() => {
    const v = load<any>(KEY, null);
    if (v?.kit) { setKit({ ...kitFor(kind), ...v.kit, style: GARMENT_STYLES[kind].includes(v.kit.style) ? v.kit.style : kitFor(kind).style }); if (Array.isArray(v.players) && v.players.length) setPlayers(v.players); }
    if (v?.pat) { setPat({ ...DEFAULT_PATTERN, ...v.pat }); setPatColor(v.patColor || '#FFFFFF'); setPatName(v.patName || 'Pattern'); }
    if (v?.projectId) setProjectId(v.projectId);
    const list: { name: string; p: PatternSettings }[] = [];
    const draft = load<any>('mt:pattern-draft', null);
    if (draft?.motif && draft.motif !== 'image') list.push({ name: 'Latest from Pattern Studio', p: { ...DEFAULT_PATTERN, ...draft } });
    for (const s of load<any[]>('mt:patterns', [])) if (s?.p?.motif && s.p.motif !== 'image') list.push({ name: s.name || 'My pattern', p: { ...DEFAULT_PATTERN, ...s.p } });
    setMine(list.slice(0, 12));
    // Colours sent from the Colour Explorer (?colors=hex,hex,…).
    try {
      const q = new URLSearchParams(window.location.search).get('colors');
      const c = (q || '').split(',').map((x) => '#' + x.replace(/[^0-9a-f]/gi, '').slice(0, 6)).filter((x) => x.length === 7);
      if (c.length >= 3) {
        const byL = [...c].sort((a, b) => lum(a) - lum(b));
        setKit((k) => ({ ...k, body: c[2] || byL[1], sleeve: byL[0], collar: c[3] || byL[byL.length - 2], accent: c[3] || c[1], accent2: byL[byL.length - 1] }));
      }
    } catch { /* ignore */ }
    settle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Work in progress is kept automatically (with logos when there is room).
  const snapshot = () => ({ kit, players, pat: { ...pat, image: undefined }, patColor, patName, projectId });
  useEffect(() => {
    const snap = snapshot();
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch {
      try { localStorage.setItem(KEY, JSON.stringify({ ...snap, kit: { ...kit, teamLogo: null, sponsorLogo: null } })); } catch { /* full or private */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEY, kit, players, pat, patColor, patName, projectId]);
  useEffect(() => { if (live.current) setDirty(true); }, [kit, players, pat, patColor, patName]);

  // ---------- projects (saved in this browser, or as a .mtdt file) ----------
  const readProjects = (): SavedProject[] => { try { return (JSON.parse(localStorage.getItem(PROJECTS) || '[]') as SavedProject[]).filter((x) => x && x.data); } catch { return []; } };
  const apply = (d: any, id: string | null) => {
    setKit({ ...kitFor(kind), ...d.kit, style: GARMENT_STYLES[kind].includes(d.kit?.style) ? d.kit.style : kitFor(kind).style });
    if (Array.isArray(d.players)) setPlayers(d.players);
    if (d.pat) setPat({ ...DEFAULT_PATTERN, ...d.pat });
    if (d.patColor) setPatColor(d.patColor);
    if (d.patName) setPatName(d.patName);
    setProjectId(id); setSel(0); setSelEl(null);
    settle();
  };
  const saveProject = (): boolean => {
    const id = projectId || `p${Date.now().toString(36)}`;
    const data = { kit, players, pat: { ...pat, image: undefined }, patColor, patName };
    const list = readProjects().filter((x) => x.id !== id);
    list.unshift({ id, kind, name: kit.teamName || copy.noun, updated: new Date().toISOString(), data });
    try { localStorage.setItem(PROJECTS, JSON.stringify(list.slice(0, 40))); }
    catch {
      try { list[0] = { ...list[0], data: { ...data, kit: { ...kit, teamLogo: null, sponsorLogo: null } } }; localStorage.setItem(PROJECTS, JSON.stringify(list.slice(0, 40))); flash('Saved without logos (browser storage is full) — use “Save file” to keep logos.'); }
      catch { flash('Could not save in this browser. Use “Save file” instead.'); return false; }
    }
    setProjectId(id);
    setDirty(false);
    flash(`Saved “${kit.teamName}”. Open it any time from Projects.`);
    return true;
  };
  const saveFile = async () => {
    const bytes = await encodeMtdt({ kind, name: kit.teamName, savedAt: new Date().toISOString(), app: 'magicaltouchdesign.com', data: { kit, players, pat: { ...pat, image: undefined }, patColor, patName } });
    save(new Blob([bytes as BlobPart], { type: 'application/octet-stream' }), mtdtFileName(kit.teamName));
    setDirty(false);
  };
  const openFile = async (f: File) => {
    try {
      const p = await decodeMtdt<any>(new Uint8Array(await f.arrayBuffer()));
      if (p.kind === 'pattern') { flash('That is a pattern file — open it in Pattern Design.'); return; }
      if (p.kind !== kind) { flash(`That file is a ${p.kind === 'tshirt' ? 'T-shirt' : p.kind} design — open it in that designer.`); return; }
      apply(p.data, null); flash(`Opened “${p.name}”.`);
    } catch (e: any) { flash(e?.message || 'Could not open that file.'); }
  };
  const newDesign = () => { apply({ kit: kitFor(kind), players: copy.sample, pat: { ...DEFAULT_PATTERN, ...PATTERNS[0].p }, patColor: '#FFFFFF', patName: PATTERNS[0].name }, null); setStep('design'); };


  const pattern = useMemo<PatternSettings>(() => ({ ...pat, colors: [patColor] }), [pat, patColor]);

  // Letter outlines for names, numbers and the front text, in the chosen font.
  const texts = useMemo(() => glyphTexts(players, kit), [players, kit]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setMaking(true);
      const out: Glyphs = {};
      for (const s of texts) {
        const key = `${kit.font}|${kit.fontWeight}|${s}`;
        if (!cache.current.has(key)) {
          try { cache.current.set(key, await textOutline(s, { family: kit.font, weight: kit.fontWeight, italic: false })); } catch { cache.current.set(key, null); }
        }
        out[s] = cache.current.get(key);
        if (!live) return;
      }
      if (live) { setGlyphs(out); setMaking(false); }
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [texts, kit.font, kit.fontWeight]);

  const issues = useMemo(() => checkRoster(players, personal), [players, personal]);
  const errors = issues.filter((i) => i.level === 'error');
  const player = personal ? players[Math.min(sel, players.length - 1)] || null : { name: '', number: '', size: players[0]?.size || 'M' };
  const preview = useMemo(() => (view === 'garment' ? kitMockupSvg(kit, pattern, player, glyphs, side, { selected: selEl }) : kitPreviewSvg(kit, pattern, player, glyphs)), [view, side, kit, pattern, player, glyphs, selEl]);

  // Picker thumbnails only change with the style / colours they show.
  const starterThumbs = useMemo(() => Object.fromEntries(STARTERS.map((st) => [st.name, svgDataUrl(kitMockupSvg({ ...kitFor(kind), style: kit.style, ...st.o, personalise: false, frontText: '', teamLogo: null, sponsorLogo: null, patternOn: 'none' }, DEFAULT_PATTERN, null, {}, 'front'))])), [kind, kit.style]);
  const swatchCache = useRef(new Map<string, string>());
  const swatchThumb = (name: string, p: PatternSettings) => {
    const key = `${name}|${kit.body}|${patColor}|${p.motif}|${p.seed}`;
    let v = swatchCache.current.get(key);
    if (!v) { v = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${kit.body}"/>${patternSwatch({ ...p, colors: [patColor] })}</svg>`); swatchCache.current.set(key, v); }
    return v;
  };

  // ---------- click and drag on the shirt ----------
  const frontW = kitProduct(kit).pieces.find((x) => x.id === 'front')?.w || 560;
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = (e.target as Element).closest('[data-el]');
    const el = (t?.getAttribute('data-el') || null) as El | null;
    if (!el) { setSelEl(null); return; }
    setSelEl(el);
    if (!DRAG.includes(el)) return;
    const svg = e.currentTarget.querySelector('svg');
    const m = svg?.getScreenCTM();
    if (!m) return;
    drag.current = { el, x: e.clientX, y: e.clientY, scale: m.a, k: kit };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d) return;
    const dx = (e.clientX - d.x) / d.scale, dy = (e.clientY - d.y) / d.scale;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    const L = frontLayout(d.k, frontW), c = (v: number, a: number, b: number) => Math.round(Math.max(a, Math.min(b, v)));
    const k0 = d.k;
    switch (d.el) {
      case 'name': set({ nameTopMm: c(k0.nameTopMm + dy, 20, 320) }); break;
      case 'number': set({ numberTopMm: c(k0.numberTopMm + dy, 60, 480) }); break;
      case 'teamLogo': set({ teamLogoX: c(L.teamLogo.x + L.teamLogo.w / 2 + dx, 0, frontW), teamLogoY: c(L.teamLogo.y + dy, 20, 650) }); break;
      case 'sponsor': set({ sponsorX: c(L.sponsor.x + L.sponsor.w / 2 + dx, 0, frontW), sponsorY: c(L.sponsor.y + dy, 20, 650) }); break;
      case 'frontText': set({ frontTextX: c(L.frontText.x + L.frontText.w / 2 + dx, 0, frontW), frontTextTopMm: c(L.frontText.y + dy, 20, 680) }); break;
      case 'frontNum': set({ frontNumX: c(L.frontNum.x + L.frontNum.w / 2 + dx, 0, frontW), frontNumY: c(L.frontNum.y + L.frontNum.h / 2 + dy, 40, 650) }); break;
    }
  };
  const onUp = () => { drag.current = null; };
  useEffect(() => { if (selEl && window.innerWidth < 1024) setTimeout(() => document.getElementById('garment-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }, [selEl]);
  useEffect(() => {
    if (!selEl) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelEl(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [selEl]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 7000); };
  const ready = !making && texts.every((s) => glyphs[s]);

  // Which rows go into the print file (all by default).
  useEffect(() => { setChosen((c) => players.map((_, i) => c[i] ?? true)); }, [players]);
  const picked = useMemo(() => players.filter((_, i) => chosen[i] !== false), [players, chosen]);
  const list = useMemo(() => printList(picked, kit), [picked, kit]);
  const sheetOpts = { rollW, bleed, cutLines: true, pageMm, group, mirror };
  const plan = useMemo(() => {
    if (step !== 'print' || !list.length) return null;
    const r = rosterSheets(kit, pattern, list, {}, sheetOpts);
    return { pages: r.pages.length, metres: r.totalMm / 1000, pieces: r.pages.reduce((a, p) => a + p.pieces, 0), tooWide: r.tooWide };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, list, kit, pattern, rollW, bleed, pageMm, group, mirror]);

  const fileBase = `${safeFile(kit.teamName)}-${copy.noun.replace(/\s+/g, '-')}`;
  const dlSheetPdf = async () => {
    if (errors.length) { setStep('players'); flash('Fix the rows marked in red first.'); return; }
    if (!list.length) { flash('Choose at least one row to print.'); return; }
    setBusy('sheet');
    try {
      const { svgToPdfBlob } = await import('@/lib/svgToPdf');
      const r = rosterSheets(kit, pattern, list, glyphs, sheetOpts);
      save(await svgToPdfBlob('', 0, 0, r.pages.map((p) => ({ svg: p.svg, widthMm: p.width, heightMm: p.height }))), `${fileBase}-print-${list.length}.pdf`);
      flash(`Print PDF ready: ${list.length} garments on ${r.pages.length} page${r.pages.length > 1 ? 's' : ''}, ${(r.totalMm / 1000).toFixed(2)} m of ${rollW} mm roll.`);
    } catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };
  const dlSheetSvg = async () => {
    if (errors.length) { setStep('players'); flash('Fix the rows marked in red first.'); return; }
    setBusy('sheet-svg');
    try {
      const r = rosterSheets(kit, pattern, list, glyphs, sheetOpts);
      if (r.pages.length === 1) save(new Blob([r.pages[0].svg], { type: 'image/svg+xml' }), `${fileBase}-print-${list.length}.svg`);
      else {
        const { buildZip } = await import('@/lib/editor/zip');
        const enc = new TextEncoder();
        save(buildZip(r.pages.map((p, i) => ({ name: `${fileBase}-print-page-${i + 1}.svg`, data: enc.encode(p.svg) }))), `${fileBase}-print-svg.zip`);
      }
    } catch { flash('The SVG could not be made.'); }
    setBusy(null);
  };
  const base = (p: Player, i: number) => personal ? `${String(i + 1).padStart(2, '0')}-${safeFile(p.name)}-${p.number}-${sizeLabel(p.size)}` : `${sizeLabel(p.size)}-x${p.qty || 1}`;
  const dlEach = async () => {
    if (errors.length) { setStep('players'); flash('Fix the rows marked in red first.'); return; }
    setBusy('zip');
    try {
      const [{ svgToPdfBlob }, { buildZip }] = await Promise.all([import('@/lib/svgToPdf'), import('@/lib/editor/zip')]);
      const parts: { name: string; data: Uint8Array }[] = [];
      const enc = new TextEncoder();
      for (let i = 0; i < picked.length; i++) {
        const p = personal ? picked[i] : { ...picked[i], name: '', number: '' };
        const f = playerPrintSvg(kit, pattern, p, glyphs, { rollW, bleed, cutLines: true });
        parts.push({ name: `SVG/${base(picked[i], i)}.svg`, data: enc.encode(f.svg) });
        parts.push({ name: `PDF/${base(picked[i], i)}.pdf`, data: new Uint8Array(await (await svgToPdfBlob(f.svg, f.width, f.height)).arrayBuffer()) });
      }
      const csv = personal ? 'Row,Name,Number,Size\n' + picked.map((p, i) => `${i + 1},"${p.name.replace(/"/g, '""')}",${p.number},${sizeLabel(p.size)}`).join('\n') : 'Size,Quantity\n' + picked.map((p) => `${sizeLabel(p.size)},${p.qty || 0}`).join('\n');
      parts.push({ name: personal ? 'roster.csv' : 'sizes.csv', data: enc.encode(csv) });
      parts.push({ name: 'preview.svg', data: enc.encode(kitMockupSvg(kit, pattern, player, glyphs)) });
      save(buildZip(parts), `${fileBase}-files.zip`);
      flash(`ZIP ready: ${picked.length} file sets (SVG and vector PDF).`);
    } catch { flash('The ZIP could not be made in this browser.'); }
    setBusy(null);
  };
  const dlPreview = () => save(new Blob([kitMockupSvg(kit, pattern, player, glyphs)], { type: 'image/svg+xml' }), `${fileBase}-preview.svg`);

  // Artwork changes in the main editor (names and numbers stay here).
  const editInEditor = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent(window.location.pathname)); return; }
    setBusy('editor');
    try {
      const svg = kitMockupSvg(kit, pattern, player, glyphs);
      const F: any = (await import('fabric')).fabric;
      const objs: any[] = await new Promise((res) => F.loadSVGFromString(svg, (o: any[]) => res(o || [])));
      const W = 1600, H = 1000;
      const g = new F.Group(objs, { name: `${kit.teamName} ${copy.noun}` });
      const k = Math.min((W - 80) / g.width, (H - 80) / g.height);
      g.set({ originX: 'center', originY: 'center', left: W / 2, top: H / 2, scaleX: k, scaleY: k });
      const canvas = { version: '5.1.0', background: '#ffffff', objects: [g.toObject(['name'])] };
      const key = newLocalKey();
      putHandoff(key, { opened: { document: { name: `${kit.teamName} ${copy.noun}`, width: W, height: H, editor: 'design' }, canvas, fonts: [], thumbnail: svgDataUrl(svg), template: null, missingAssets: [] } as any, file: { handle: null, fileName: `${safeFile(kit.teamName)}.mtd.svg` } });
      router.push(editorUrlForLocal(key, W, H));
    } catch { flash('Could not open the editor. Please try again.'); setBusy(null); }
  };

  const importText = (t: string) => {
    if (!personal) {
      const rows = t.replace(/\r/g, '').split('\n').map((l) => l.split(/[,;\t]/).map((c) => c.trim())).filter((r) => r[0] && sizeId(r[0]) !== null).map((r) => ({ name: '', number: '', size: r[0], qty: Math.max(1, Number(r[1]) || 1) }));
      if (!rows.length) { flash('No rows found. Use one size per line: size, quantity.'); return; }
      setPlayers(rows); setPaste(null); flash(`${rows.length} sizes imported.`); return;
    }
    const rows = parseRoster(t).filter((r) => r.name || r.number);
    if (!rows.length) { flash('No rows found. Use one player per line: name, number, size.'); return; }
    setPlayers(rows); setSel(0); setPaste(null);
    flash(`${rows.length} players imported.`);
  };
  const editRow = (i: number, o: Partial<Player>) => setPlayers((ps) => ps.map((p, k) => (k === i ? { ...p, ...o } : p)));
  const togglePersonal = (on: boolean) => {
    set({ personalise: on, frontNumber: on ? kit.frontNumber : false });
    if (on && !players.some((p) => p.name)) setPlayers(COPY.jersey.sample);
    if (!on && players.some((p) => p.name)) {
      const counts = new Map<string, number>();
      for (const p of players) { const s = sizeLabel(p.size) || 'M'; counts.set(s, (counts.get(s) || 0) + 1); }
      setPlayers([...counts].map(([size, qty]) => ({ name: '', number: '', size, qty })));
    }
  };

  // ---------- UI pieces ----------
  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px] focus:outline-none focus:border-[#3B82C4]';
  const btn = 'h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:border-mt-ink/40 disabled:opacity-50';
  const primary = 'h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50';
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">{children}</h3>;
  const colour = (label: string, k: keyof KitDesign) => (
    <label className="flex flex-col items-center gap-1 text-[11.5px] text-mt-muted">
      <span className="relative h-10 w-full rounded-xl border border-mt-border overflow-hidden" style={{ background: String(kit[k] || '#ffffff') }}>
        <input type="color" value={String(kit[k] || '#ffffff')} onChange={(e) => set({ [k]: e.target.value } as any)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`${label} colour`} />
      </span>{label}
    </label>
  );
  const slider = (label: string, v: number, min: number, max: number, step: number, k: keyof KitDesign, unit = 'mm') => (
    <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>{label}</span><span className="text-mt-ink tabular-nums">{v}{unit}</span></span><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set({ [k]: Number(e.target.value) } as any)} className="mt-1 w-full accent-[#3B82C4]" /></label>
  );
  const chip = (on: boolean) => `h-9 px-3 rounded-full border text-[13px] font-medium ${on ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:border-mt-ink/40'}`;

  const steps: { id: Step; label: string }[] = [
    { id: 'design', label: 'Design' }, { id: 'logos', label: 'Logos & text' },
    { id: 'letters', label: personal ? 'Names & numbers' : 'Lettering' },
    { id: 'players', label: personal ? `${copy.players} & sizes` : 'Sizes & quantities' }, { id: 'print', label: 'Print files' },
  ];
  const styles = GARMENT_STYLES[kind];
  const totalQty = personal ? players.length : players.reduce((a, p) => a + (Number(p.qty) || 0), 0);

  return (
    <div className="space-y-5">
      <LeaveGuard dirty={dirty} onSave={saveProject} what={copy.noun} />
      {/* Project bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-mt-border bg-mt-surface p-2">
        <Shirt size={18} className="ml-2 text-mt-muted" aria-hidden />
        <input value={kit.teamName} maxLength={40} onChange={(e) => set({ teamName: e.target.value })} aria-label="Project name" className="h-10 min-w-0 flex-1 basis-40 rounded-xl bg-transparent px-2 text-[15px] font-semibold focus:outline-none focus:bg-mt-bg" />
        <span className={`text-[12px] ${dirty ? 'text-amber-600 dark:text-amber-400' : 'text-mt-faint'}`}>{dirty ? 'Unsaved changes' : projectId ? 'Saved' : ''}</span>
        <button type="button" onClick={newDesign} className={btn}><Plus size={14} /> New</button>
        <button type="button" onClick={() => setProjects(readProjects().filter((x) => x.kind === kind))} className={btn}><FolderOpen size={14} /> Projects</button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}><FileUp size={14} /> Open file</button>
        <button type="button" onClick={saveFile} className={btn} title={`Download a ${MTDT_EXT} project file`}><Download size={14} /> Save file</button>
        <button type="button" onClick={saveProject} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13.5px] font-semibold inline-flex items-center gap-1.5"><Save size={14} /> Save</button>
        <input ref={fileRef} type="file" accept={`${MTDT_EXT},application/octet-stream`} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) openFile(f); }} />
      </div>

      {projects && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="proj-title" onClick={(e) => { if (e.target === e.currentTarget) setProjects(null); }}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-mt-border bg-mt-surface p-5 shadow-2xl">
            <div className="flex items-center gap-2"><h2 id="proj-title" className="text-lg font-semibold mr-auto">Your {copy.noun} projects</h2><button type="button" onClick={() => setProjects(null)} aria-label="Close" className="h-9 w-9 grid place-items-center rounded-full hover:bg-mt-bg"><X size={16} /></button></div>
            {projects.length === 0 ? <p className="mt-4 text-[14px] text-mt-muted">Nothing saved yet. Press <b>Save</b> to keep this design — then open it here to change names, sizes or the artwork.</p> : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {projects.map((pr) => (
                  <li key={pr.id} className="flex gap-3 rounded-2xl border border-mt-border p-2.5">
                    <img alt="" className="h-20 w-24 shrink-0 rounded-xl bg-mt-bg object-contain" src={svgDataUrl(kitMockupSvg({ ...kitFor(kind), ...pr.data.kit }, { ...DEFAULT_PATTERN, ...pr.data.pat, colors: [pr.data.patColor || '#FFFFFF'] }, null, {}, 'front'))} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{pr.name}</p>
                      <p className="text-[12px] text-mt-muted">{new Date(pr.updated).toLocaleString()} · {(pr.data.players || []).length} rows</p>
                      <div className="mt-2 flex gap-1.5">
                        <button type="button" onClick={() => { apply(pr.data, pr.id); setProjects(null); flash(`Opened “${pr.name}”.`); }} className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12.5px] font-semibold">Open</button>
                        {delAsk === pr.id
                          ? <button type="button" onClick={() => { const l = readProjects().filter((x) => x.id !== pr.id); try { localStorage.setItem(PROJECTS, JSON.stringify(l)); } catch { /* ignore */ } setProjects(l.filter((x) => x.kind === kind)); setDelAsk(null); if (projectId === pr.id) setProjectId(null); }} className="h-8 px-3 rounded-full bg-rose-600 text-white text-[12.5px] font-semibold">Delete for good</button>
                          : <button type="button" onClick={() => setDelAsk(pr.id)} className="h-8 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold">Delete</button>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      <nav aria-label="Sections" className="overflow-x-auto">
        <div role="tablist" className="flex min-w-max gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">
          {steps.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={step === x.id} onClick={() => { setStep(x.id); setSelEl(null); }}
              className={`h-10 px-4 rounded-xl text-[13.5px] font-semibold ${step === x.id ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted hover:text-mt-ink'}`}>{x.label}</button>
          ))}
        </div>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        {/* Controls for the current step */}
        <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {selEl && (() => {
            const T: Record<El, string> = { body: 'Body', sleeve: 'Sleeves', collar: 'Collar & trim', name: 'Player name', number: 'Back number', teamLogo: 'Chest logo', sponsor: 'Sponsor / front print', frontText: 'Front text', frontNum: 'Front number' };
            const pl = personal ? players[Math.min(sel, players.length - 1)] : null;
            const upload = (k: 'teamLogo' | 'sponsorLogo') => <label className={`${btn} cursor-pointer w-full`}><Upload size={14} /> {kit[k] ? 'Replace image' : 'Add image'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) set({ [k]: await readLogo(f) } as any); }} /></label>;
            return (
              <section id="garment-inspector" className="-m-1 scroll-mt-20 rounded-2xl border-2 border-[#3B82C4] bg-[#3B82C4]/[0.04] p-4 space-y-3" aria-label={`Edit ${T[selEl]}`}>
                <div className="flex items-center gap-2"><h3 className="text-[15px] font-semibold mr-auto">{T[selEl]}</h3><button type="button" onClick={() => setSelEl(null)} className="h-8 px-3 rounded-full bg-mt-primary text-mt-onprimary text-[12.5px] font-semibold">Done</button></div>
                {selEl === 'body' && <>
                  <div className="grid grid-cols-5 gap-2">{colour('Body', 'body')}{colour('Accent', 'accent')}{colour('Trim', 'accent2')}</div>
                  <div className="flex flex-wrap gap-1.5">{KIT_GRAPHICS.map((g) => <button key={g.id} type="button" onClick={() => set({ graphic: g.id as KitGraphic })} className={chip((kit.graphic || 'plain') === g.id)}>{g.label}</button>)}</div>
                  <button type="button" onClick={() => { setStep('design'); setSelEl(null); }} className="text-[12.5px] font-semibold underline underline-offset-2">Pattern and more design options →</button>
                </>}
                {selEl === 'sleeve' && <>
                  <div className="grid grid-cols-5 gap-2">{colour('Sleeves', 'sleeve')}{colour('Cuffs', 'accent')}{colour('Trim', 'accent2')}</div>
                  <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!kit.cuffs} onChange={(e) => set({ cuffs: e.target.checked, graphic: e.target.checked && (kit.graphic || 'plain') === 'plain' ? 'band' : kit.graphic })} className="h-4 w-4 accent-[#3B82C4]" /> Accent cuffs</label>
                  <select value={kit.patternOn} onChange={(e) => set({ patternOn: e.target.value as KitDesign['patternOn'] })} className={field} aria-label="Pattern"><option value="none">No pattern</option><option value="body">Pattern on the body only</option><option value="sleeves">Pattern on the sleeves only</option><option value="all">Pattern everywhere</option></select>
                </>}
                {selEl === 'collar' && <div className="grid grid-cols-5 gap-2">{colour('Collar', 'collar')}{colour('Trim', 'accent2')}</div>}
                {(selEl === 'name' || selEl === 'number' || selEl === 'frontNum') && <>
                  {pl && <div className="grid grid-cols-[1fr_90px] gap-2">
                    <label className="text-[12px] text-mt-muted">Name (row {sel + 1})<input value={pl.name} maxLength={20} onChange={(e) => editRow(sel, { name: e.target.value })} className={field} /></label>
                    <label className="text-[12px] text-mt-muted">Number<input value={pl.number} inputMode="numeric" maxLength={3} onChange={(e) => editRow(sel, { number: e.target.value.replace(/\D/g, '') })} className={field} /></label>
                  </div>}
                  <select value={kit.font} onChange={(e) => { const f = PATTERN_FONTS.find((x) => x.family === e.target.value); set({ font: e.target.value, fontWeight: f && !f.weights.includes(kit.fontWeight) ? f.weights[f.weights.length - 1] : kit.fontWeight }); }} className={field} aria-label="Font">
                    {[...new Set(PATTERN_FONTS.map((f) => f.category))].map((c) => <optgroup key={c} label={c}>{PATTERN_FONTS.filter((f) => f.category === c).map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}</optgroup>)}
                  </select>
                  <div className="grid grid-cols-5 gap-2">{selEl === 'name' ? colour('Colour', 'nameColor') : colour('Colour', 'numberColor')}{colour('Outline', 'outlineColor')}</div>
                  {slider('Outline', kit.outlineMm, 0, 6, 0.5, 'outlineMm')}
                  {selEl === 'name' && slider('Height', kit.nameMm, 25, 90, 1, 'nameMm')}
                  {selEl === 'number' && slider('Height', kit.numberMm, 120, 320, 5, 'numberMm')}
                  {selEl === 'frontNum' && <>{slider('Height', kit.frontNumMm ?? 80, 40, 160, 1, 'frontNumMm')}<button type="button" onClick={() => { set({ frontNumber: false }); setSelEl(null); }} className={`${btn} w-full`}><Trash2 size={14} /> Remove front number</button></>}
                  {personal && <p className="text-[11.5px] text-mt-muted">Change everyone’s names in <button type="button" className="underline" onClick={() => { setStep('players'); setSelEl(null); }}>{copy.players} & sizes</button>.</p>}
                </>}
                {selEl === 'frontText' && <>
                  <input value={kit.frontText || ''} maxLength={24} placeholder="Type front text" onChange={(e) => set({ frontText: e.target.value })} className={field} aria-label="Front text" autoFocus />
                  <div className="grid grid-cols-5 gap-2">{colour('Colour', 'frontTextColor')}</div>
                  {slider('Height', kit.frontTextMm || 60, 20, 160, 1, 'frontTextMm')}
                  {!!kit.frontText && <button type="button" onClick={() => set({ frontText: '' })} className={`${btn} w-full`}><Trash2 size={14} /> Remove text</button>}
                </>}
                {selEl === 'teamLogo' && <>{upload('teamLogo')}{slider('Size', kit.teamLogoMm ?? 85, 40, 200, 1, 'teamLogoMm')}{kit.teamLogo && <button type="button" onClick={() => set({ teamLogo: null })} className={`${btn} w-full`}><Trash2 size={14} /> Remove logo</button>}</>}
                {selEl === 'sponsor' && <>{upload('sponsorLogo')}{slider('Width', Math.round(kit.sponsorMm ?? frontW * 0.6), 100, Math.round(frontW * 0.95), 1, 'sponsorMm')}{kit.sponsorLogo && <button type="button" onClick={() => set({ sponsorLogo: null })} className={`${btn} w-full`}><Trash2 size={14} /> Remove image</button>}</>}
                {DRAG.includes(selEl) && <button type="button" onClick={() => {
                  const reset: Record<string, Partial<KitDesign>> = { name: { nameTopMm: DEFAULT_KIT_POS.nameTopMm }, number: { numberTopMm: DEFAULT_KIT_POS.numberTopMm }, teamLogo: { teamLogoX: undefined, teamLogoY: undefined, teamLogoMm: undefined }, sponsor: { sponsorX: undefined, sponsorY: undefined, sponsorMm: undefined }, frontText: { frontTextX: undefined, frontTextTopMm: kitFor(kind).frontTextTopMm }, frontNum: { frontNumX: undefined, frontNumY: undefined, frontNumMm: undefined } };
                  set(reset[selEl] || {});
                }} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-mt-muted hover:text-mt-ink"><RotateCcw size={13} /> Reset position and size</button>}
              </section>
            );
          })()}
          {step === 'design' && <>
            {styles.length > 1 && <section className="space-y-2"><H>Style</H><div className="flex flex-wrap gap-1.5">{styles.map((id) => <button key={id} type="button" aria-pressed={kit.style === id} onClick={() => set({ style: id })} className={chip(kit.style === id)}>{KIT_STYLES.find((s) => s.id === id)?.label}</button>)}</div></section>}
            <section className="space-y-2">
              <H>Start from a design</H>
              <div className="grid grid-cols-4 gap-2">
                {STARTERS.map((s) => (
                  <button key={s.name} type="button" title={s.name} aria-label={`Design: ${s.name}`} onClick={() => set(s.o)} className="group rounded-xl border border-mt-border p-1 hover:border-mt-ink/40">
                    <img alt="" className="w-full aspect-square object-contain" src={starterThumbs[s.name]} />
                  </button>
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <H>Colours</H>
              <div className="grid grid-cols-5 gap-2">{colour('Body', 'body')}{colour('Sleeves', 'sleeve')}{colour('Collar', 'collar')}{colour('Accent', 'accent')}{colour('Trim', 'accent2')}</div>
            </section>
            <section className="space-y-2">
              <H>Body graphic</H>
              <div className="flex flex-wrap gap-1.5">{KIT_GRAPHICS.map((g) => <button key={g.id} type="button" aria-pressed={(kit.graphic || 'plain') === g.id} onClick={() => set({ graphic: g.id as KitGraphic })} className={chip((kit.graphic || 'plain') === g.id)}>{g.label}</button>)}</div>
              {kit.graphic && kit.graphic !== 'plain' && kit.style !== 'basketball' && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!kit.cuffs} onChange={(e) => set({ cuffs: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Accent sleeve cuffs</label>}
            </section>
            <section className="space-y-2">
              <H>Pattern</H>
              <select value={kit.patternOn} onChange={(e) => set({ patternOn: e.target.value as KitDesign['patternOn'] })} className={field} aria-label="Where the pattern goes"><option value="none">No pattern</option><option value="body">On the body</option><option value="sleeves">On the sleeves</option><option value="all">Everywhere</option></select>
              {kit.patternOn !== 'none' && <>
                <div className="grid grid-cols-4 gap-2">
                  {[...PATTERNS.map((x) => ({ name: x.name, p: { ...DEFAULT_PATTERN, ...x.p } })), ...mine].map((x) => (
                    <button key={x.name} type="button" title={x.name} aria-label={`Pattern: ${x.name}`} aria-pressed={patName === x.name} onClick={() => { setPat(x.p); setPatName(x.name); }}
                      className={`rounded-xl border p-1 ${patName === x.name ? 'border-mt-ink ring-2 ring-mt-ink/15' : 'border-mt-border hover:border-mt-ink/40'}`}>
                      <img alt="" className="w-full aspect-square rounded-lg" style={{ background: kit.body }} src={swatchThumb(x.name, x.p)} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[12px] text-mt-muted flex items-center gap-2">Colour<input type="color" value={patColor} onChange={(e) => setPatColor(e.target.value)} className="h-8 w-10 rounded-md border border-mt-border bg-transparent" /></label>
                  <Link href="/patterns" className="ml-auto text-[12.5px] font-semibold underline underline-offset-2">Design your own pattern →</Link>
                </div>
                <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Strength</span><span className="text-mt-ink tabular-nums">{Math.round(kit.patternOpacity * 100)}%</span></span><input type="range" min={5} max={100} step={5} value={Math.round(kit.patternOpacity * 100)} onChange={(e) => set({ patternOpacity: Number(e.target.value) / 100 })} className="mt-1 w-full accent-[#3B82C4]" /></label>
                {slider('Repeat size', kit.repeatMm, 20, 300, 5, 'repeatMm')}
              </>}
            </section>
          </>}

          {step === 'logos' && <>
            <section className="space-y-2">
              <H>Name on the order</H>
              <input value={kit.teamName} maxLength={40} onChange={(e) => set({ teamName: e.target.value })} className={field} aria-label="Team or order name" />
              <p className="text-[11.5px] text-mt-muted">Used for file names and the print sheet footer.</p>
            </section>
            <section className="space-y-2">
              <H>Logos</H>
              {(['teamLogo', 'sponsorLogo'] as const).map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <label className={`${btn} cursor-pointer flex-1`}><Upload size={14} /> {kit[k] ? 'Change' : 'Add'} {k === 'teamLogo' ? 'chest logo' : 'sponsor / front print'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) set({ [k]: await readLogo(f) } as any); }} /></label>
                  {kit[k] && <button type="button" onClick={() => set({ [k]: null } as any)} aria-label="Remove logo" className="h-10 w-10 grid place-items-center rounded-full border border-mt-border"><X size={14} /></button>}
                </div>
              ))}
              <p className="text-[11.5px] text-mt-muted">PNG with a transparent background works best. Logos stay pictures in the print file.</p>
            </section>
            <section className="space-y-2">
              <H>Front text</H>
              <input value={kit.frontText || ''} maxLength={24} placeholder="e.g. TEAM NAME or slogan" onChange={(e) => set({ frontText: e.target.value })} className={field} aria-label="Front text" />
              {!!kit.frontText?.trim() && <>
                <div className="grid grid-cols-5 gap-2">{colour('Colour', 'frontTextColor')}</div>
                {slider('Height', kit.frontTextMm || 60, 20, 160, 1, 'frontTextMm')}
                {slider('From the top', kit.frontTextTopMm || 300, 80, 600, 1, 'frontTextTopMm')}
              </>}
            </section>
          </>}

          {step === 'letters' && <>
            <section className="space-y-2">
              <H>Personalise</H>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" aria-pressed={personal} onClick={() => togglePersonal(true)} className={chip(personal)}>Names & numbers</button>
                <button type="button" aria-pressed={!personal} onClick={() => togglePersonal(false)} className={chip(!personal)}>Same for everyone</button>
              </div>
            </section>
            <section className="space-y-2">
              <H>Font</H>
              <select value={kit.font} onChange={(e) => { const f = PATTERN_FONTS.find((x) => x.family === e.target.value); set({ font: e.target.value, fontWeight: f && !f.weights.includes(kit.fontWeight) ? f.weights[f.weights.length - 1] : kit.fontWeight }); }} className={field} aria-label="Font">
                {[...new Set(PATTERN_FONTS.map((f) => f.category))].map((c) => <optgroup key={c} label={c}>{PATTERN_FONTS.filter((f) => f.category === c).map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}</optgroup>)}
              </select>
            </section>
            {personal && <>
              <section className="space-y-2">
                <H>Colours</H>
                <div className="grid grid-cols-5 gap-2">{colour('Name', 'nameColor')}{colour('Number', 'numberColor')}{colour('Outline', 'outlineColor')}</div>
                {slider('Outline', kit.outlineMm, 0, 6, 0.5, 'outlineMm')}
              </section>
              <section className="space-y-2">
                <H>Position (size M)</H>
                {slider('Name height', kit.nameMm, 25, 90, 1, 'nameMm')}
                {slider('Name from top', kit.nameTopMm, 40, 200, 1, 'nameTopMm')}
                {slider('Number height', kit.numberMm, 120, 320, 5, 'numberMm')}
                {slider('Number from top', kit.numberTopMm, 120, 360, 1, 'numberTopMm')}
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={kit.frontNumber} onChange={(e) => set({ frontNumber: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Small number on the front</label>
                <p className="text-[11.5px] text-mt-muted">Every size scales with the garment, so letters keep their place.</p>
              </section>
            </>}
            <p className="text-[11.5px] text-mt-muted">{making ? 'Making letter outlines…' : ready ? 'All lettering is vector outlines — no fonts needed to print.' : 'Outlines pending.'}</p>
          </>}

          {step === 'players' && <>
            <section className="space-y-2">
              <H>{personal ? 'Add players' : 'Sizes'}</H>
              <p className="text-[13px] text-mt-muted">{personal ? 'Type each row, paste a list, or import a CSV with name, number and size.' : 'Enter how many of each size you need, or paste “size, quantity” lines.'}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaste(personal ? players.map((p) => `${p.name}, ${p.number}, ${p.size}`).join('\n') : players.map((p) => `${sizeLabel(p.size)}, ${p.qty || 1}`).join('\n'))} className={btn}>Paste list</button>
                <button type="button" onClick={() => csvRef.current?.click()} className={btn}><FileUp size={14} /> Import CSV</button>
              </div>
              <input ref={csvRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importText(await f.text()); }} />
            </section>
            <section className="rounded-2xl bg-mt-bg p-3 text-[13px]">
              <b>{totalQty}</b> {personal ? 'players' : 'garments'} · {[...new Set(players.map((p) => sizeLabel(p.size)))].filter(Boolean).join(', ') || '—'}
            </section>
            {issues.length ? (
              <ul className="rounded-2xl bg-mt-bg p-3 space-y-1 text-[12.5px]" aria-label="Problems in the list">
                {issues.slice(0, 10).map((x, k) => <li key={k} className={`flex items-start gap-1.5 ${x.level === 'error' ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'}`}><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Row {x.row}: {x.message}</li>)}
                {issues.length > 10 && <li className="text-mt-muted">…and {issues.length - 10} more</li>}
              </ul>
            ) : <p className="text-[12.5px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Every row is complete.</p>}
          </>}

          {step === 'print' && <>
            <section className="space-y-2">
              <H>Print layout</H>
              <label className="block text-[12px] text-mt-muted">Roll / media width<select value={rollW} onChange={(e) => setRollW(Number(e.target.value))} className={field}>{ROLLS.map((r) => <option key={r} value={r}>{r} mm ({Math.round(r / 25.4)}″)</option>)}</select></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[12px] text-mt-muted">Bleed (mm)<input type="number" min={0} max={30} value={bleed} onChange={(e) => setBleed(Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className={field} /></label>
                <label className="block text-[12px] text-mt-muted">Page length<select value={pageMm} onChange={(e) => setPageMm(Number(e.target.value))} className={field}><option value={1500}>1.5 m</option><option value={3000}>3 m</option><option value={5000}>5 m (max)</option></select></label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" aria-pressed={group === 'player'} onClick={() => setGroup('player')} className={chip(group === 'player')}>{personal ? 'Keep each player together' : 'Keep each garment together'}</button>
                <button type="button" aria-pressed={group === 'fabric'} onClick={() => setGroup('fabric')} className={chip(group === 'fabric')}>Save fabric</button>
              </div>
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="h-4 w-4 accent-[#3B82C4]" /> Mirror for transfer paper</label>
            </section>
            {plan && (
              <section className="rounded-2xl bg-mt-bg p-3 text-[13px] space-y-0.5" aria-label="Print summary">
                <p><b>{list.length}</b> garments · <b>{plan.pieces}</b> pieces</p>
                <p><b>{plan.metres.toFixed(2)} m</b> of {rollW} mm roll · {plan.pages} PDF page{plan.pages > 1 ? 's' : ''}</p>
                {plan.tooWide > 0 && <p className="text-rose-600">{plan.tooWide} piece(s) are wider than this roll — choose a wider roll.</p>}
              </section>
            )}
            <button type="button" onClick={dlSheetPdf} disabled={!!busy || !ready || !list.length} className={`${primary} w-full`}>{busy === 'sheet' ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Download print PDF (one file)</button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={dlSheetSvg} disabled={!!busy || !ready || !list.length} className={btn}>{busy === 'sheet-svg' ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />} Print SVG</button>
              <button type="button" onClick={dlEach} disabled={!!busy || !ready || !picked.length} className={btn}>{busy === 'zip' ? <Loader2 size={14} className="animate-spin" /> : <FileArchive size={14} />} Each separately</button>
            </div>
            <p className="text-[11.5px] text-mt-faint">Real-size vector pieces with {bleed} mm bleed, magenta cut lines and a label on every piece. Piece shapes are standard blocks — check them against your own patterns before a full run.</p>
          </>}

          {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}

        </aside>

        {/* Preview and the list (preview first on phones) */}
        <div className="min-w-0 space-y-5 order-first lg:order-none">
          <div className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div role="tablist" aria-label="Preview" className="inline-flex rounded-full border border-mt-border bg-mt-surface p-0.5">
                {(['garment', 'flat'] as const).map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold ${view === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v === 'garment' ? 'Garment' : 'Print pieces'}</button>)}
              </div>
              {view === 'garment' && <div className="inline-flex rounded-full border border-mt-border bg-mt-surface p-0.5">
                {(['both', 'front', 'back'] as const).map((v) => <button key={v} type="button" aria-pressed={side === v} onClick={() => setSide(v)} className={`h-8 px-3 rounded-full text-[12.5px] font-semibold capitalize ${side === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v === 'both' ? 'Front & back' : v}</button>)}
              </div>}
              {personal && players.length > 0 && <select value={Math.min(sel, players.length - 1)} onChange={(e) => setSel(Number(e.target.value))} aria-label="Preview player" className="h-9 rounded-full border border-mt-border bg-mt-surface px-3 text-[12.5px] font-semibold">{players.map((p, i) => <option key={i} value={i}>{p.name || `Row ${i + 1}`} · #{p.number || '—'} · {sizeLabel(p.size)}</option>)}</select>}
              <span className="ml-auto" />
              <button type="button" onClick={dlPreview} className="h-9 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5"><Download size={13} /> Preview</button>
              <button type="button" onClick={editInEditor} disabled={!!busy} className="h-9 px-3 rounded-full border border-mt-border text-[12.5px] font-semibold inline-flex items-center gap-1.5" title="Open the artwork in the design editor">{busy === 'editor' ? <Loader2 size={13} className="animate-spin" /> : <Shirt size={13} />} Edit in editor</button>
            </div>
            <div className="rounded-2xl bg-gradient-to-b from-white to-[#EEF1F5] dark:from-[#1b1f27] dark:to-[#12151b] p-3 sm:p-6">
              {view === 'garment' ? (
                <div role="application" aria-label={`${copy.noun} — click a part to edit it, drag names, numbers, logos and text to move them`}
                  className="garment-edit mx-auto w-full select-none [&_svg]:mx-auto [&_svg]:block [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[600px] [&_.mt-hit]:cursor-move [&_.mt-part]:cursor-pointer [&_.mt-part:hover]:stroke-[#3B82C4]/60 [&_.mt-hit:hover]:stroke-[#3B82C4]"
                  style={{ touchAction: selEl && DRAG.includes(selEl) ? 'none' : 'pan-y' }}
                  onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                  dangerouslySetInnerHTML={{ __html: preview }} />
              ) : <img src={svgDataUrl(preview)} alt={`${copy.noun} print pieces`} className="mx-auto w-full max-h-[600px] object-contain" />}
              {view === 'garment' && !selEl && <p className="mt-2 text-center text-[12px] text-mt-muted inline-flex w-full items-center justify-center gap-1.5"><MousePointerClick size={13} /> Click any part of the shirt to edit it · drag names, numbers, logos and text to move them</p>}
            </div>
          </div>

          {(step === 'players' || step === 'print') && (
            <section className="rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-3" aria-label={personal ? 'Player list' : 'Sizes and quantities'}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-semibold mr-auto">{personal ? `${copy.players} (${players.length})` : `Sizes (${totalQty} garments)`}</h3>
                {step === 'print' && <button type="button" onClick={() => setChosen(players.map(() => !chosen.every(Boolean)))} className={btn}>{chosen.every(Boolean) ? 'Clear selection' : 'Select all'}</button>}
                {step === 'players' && <button type="button" onClick={() => { setPlayers((p) => [...p, personal ? { name: '', number: '', size: 'M' } : { name: '', number: '', size: 'M', qty: 1 }]); setSel(players.length); }} className={btn}><Plus size={14} /> Add {personal ? 'player' : 'size'}</button>}
              </div>
              {paste !== null && (
                <div className="rounded-2xl bg-mt-bg p-3 space-y-2">
                  <p className="text-[12px] text-mt-muted">{personal ? <>One player per line: <b>name, number, size</b> (a header row is fine).</> : <>One size per line: <b>size, quantity</b>.</>}</p>
                  <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="w-full rounded-lg border border-mt-border bg-mt-surface p-2 text-[13px] font-mono" aria-label="List" />
                  <div className="flex gap-2"><button type="button" onClick={() => importText(paste)} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Use this list</button><button type="button" onClick={() => setPaste(null)} className={btn}>Cancel</button></div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-mt-muted">{step === 'print' && <th className="p-1.5 w-8"><span className="sr-only">Print</span></th>}<th className="p-1.5 w-8">#</th>{personal && <><th className="p-1.5">Name</th><th className="p-1.5 w-24">Number</th></>}<th className="p-1.5 w-32">Size</th>{!personal && <th className="p-1.5 w-28">Quantity</th>}<th className="p-1.5 w-12"></th></tr></thead>
                  <tbody>
                    {players.map((p, i) => {
                      const bad = issues.filter((x) => x.row === i + 1);
                      const ro = step === 'print';
                      return (
                        <tr key={i} onClick={() => setSel(i)} className={`border-t border-mt-border ${sel === i && personal ? 'bg-mt-surface2' : ''}`}>
                          {ro && <td className="p-1.5"><input type="checkbox" checked={chosen[i] !== false} onChange={(e) => setChosen((c) => players.map((_, k) => (k === i ? e.target.checked : c[k] !== false)))} aria-label={`Print row ${i + 1}`} className="h-4 w-4 accent-[#3B82C4]" /></td>}
                          <td className="p-1.5 tabular-nums text-mt-muted">{i + 1}</td>
                          {personal && <>
                            <td className="p-1.5">{ro ? p.name : <input value={p.name} maxLength={20} onChange={(e) => editRow(i, { name: e.target.value })} className={`${field} mt-0 h-9 ${bad.some((b) => /Name/.test(b.message)) ? 'border-rose-500' : ''}`} aria-label={`Name row ${i + 1}`} />}</td>
                            <td className="p-1.5">{ro ? p.number : <input value={p.number} inputMode="numeric" maxLength={3} onChange={(e) => editRow(i, { number: e.target.value.replace(/\D/g, '') })} className={`${field} mt-0 h-9 ${bad.some((b) => /Number/.test(b.message) && b.level === 'error') ? 'border-rose-500' : ''}`} aria-label={`Number row ${i + 1}`} />}</td>
                          </>}
                          <td className="p-1.5">{ro ? sizeLabel(p.size) : <select value={sizeId(p.size) ? sizeLabel(p.size) : p.size} onChange={(e) => editRow(i, { size: e.target.value })} className={`${field} mt-0 h-9 ${bad.some((b) => /Size/.test(b.message)) ? 'border-rose-500' : ''}`} aria-label={`Size row ${i + 1}`}>{!sizeId(p.size) && <option value={p.size}>{p.size || 'Choose'}</option>}{SIZES.map((s) => <option key={s.id} value={s.label.replace(/ .*/, '')}>{s.label}</option>)}</select>}</td>
                          {!personal && <td className="p-1.5">{ro ? p.qty : <input type="number" min={1} max={500} value={p.qty ?? 1} onChange={(e) => editRow(i, { qty: Math.max(0, Math.min(500, Number(e.target.value) || 0)) })} className={`${field} mt-0 h-9 ${bad.some((b) => /Quantity/.test(b.message)) ? 'border-rose-500' : ''}`} aria-label={`Quantity row ${i + 1}`} />}</td>}
                          <td className="p-1.5 text-right">{!ro && <button type="button" onClick={(e) => { e.stopPropagation(); setPlayers((ps) => ps.filter((_, k) => k !== i)); setSel(0); }} aria-label={`Remove row ${i + 1}`} className="inline-grid h-8 w-8 place-items-center rounded-full hover:bg-mt-bg"><Trash2 size={14} /></button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Small pattern swatch (motifs only, 120 × 120) for the picker.
function patternSwatch(p: PatternSettings): string {
  const d = motifPath(p);
  if (!d) return '';
  const { w } = layout(p);
  const s = 60 / w;
  return `<g transform="scale(${s})">${sheetPlacements(p, 120 / s, 120 / s).map((q) => `<path d="${d}" fill="${q.color}" fill-rule="evenodd" transform="translate(${q.x} ${q.y}) rotate(${q.angle}) scale(${q.sx} ${q.sy})"/>`).join('')}</g>`;
}
