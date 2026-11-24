'use client';

// Textile panel of the design editor (garment pattern pieces on the page).
//  · Garment: type, ready size or your own measurements (cm), neck and
//    sleeve, seam allowance → pattern pieces drafted and laid out on the
//    page; artwork stays on its piece when the size changes.
//  · Fabric: marker length for a fabric width; guides shown / locked.
//  · Files: print PDF (artwork in CMYK, cut lines as a spot colour),
//    full-size pattern PDF, A4 tiled pattern PDF and DXF for cutting tables.

import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, EyeOff, Lock, RefreshCw, Shirt, Unlock } from 'lucide-react';
import { KURTA_FIELDS, CHUDIDAR_FIELDS, TEE_FIELDS, DUPATTA_FIELDS, KURTA_STYLE_DEFAULTS, CHUDIDAR_STYLE_DEFAULTS, TEE_STYLE_DEFAULTS, DUPATTA_STYLE_DEFAULTS, type Field, type NeckStyle, type SleeveStyle } from '@/lib/textile/draft';
import { BODY_FIELDS } from '@/lib/textile/blocks';
import { readySize } from '@/lib/textile/sizes';
import {
  GARMENTS, SIZES, TEX_MARGIN, TEX_PX, artToFabric, cutPath, defaultTextileSpec, fabricNeed, guidesToFabric, layoutPieces, pageSizeFor, pieceAt, pieceClip, plainArt, remapOnPiece,
  type GarmentId, type TextileLayout, type TextileSpec,
} from '@/lib/textile/editorBridge';
import type { PackagingApi } from './PackagingPanel';

export type TextileApi = PackagingApi;

const NECKS: { id: NeckStyle; name: string }[] = [{ id: 'round', name: 'Round' }, { id: 'v', name: 'V neck' }, { id: 'boat', name: 'Boat' }, { id: 'square', name: 'Square' }];
const SLEEVES: { id: SleeveStyle; name: string }[] = [{ id: 'sleeveless', name: 'Sleeveless' }, { id: 'cap', name: 'Cap' }, { id: 'short', name: 'Short' }, { id: 'elbow', name: 'Elbow' }, { id: 'three-quarter', name: '¾' }, { id: 'full', name: 'Full' }];
const FABRIC_WIDTHS = [910, 1120, 1400, 1500, 1600];

function fieldsFor(g: GarmentId): { fields: Field[]; defaults: Record<string, number> } {
  if (g === 'kurta') return { fields: KURTA_FIELDS, defaults: KURTA_STYLE_DEFAULTS };
  if (g === 'chudidar') return { fields: CHUDIDAR_FIELDS, defaults: CHUDIDAR_STYLE_DEFAULTS };
  if (g === 'dupatta') return { fields: DUPATTA_FIELDS, defaults: DUPATTA_STYLE_DEFAULTS };
  if (g === 'frock') return { fields: [...BODY_FIELDS.map((f) => ({ key: f.key as string, label: f.iso ? `${f.label} (ISO 8559 ${f.iso})` : f.label, min: f.min, max: f.max })), { key: 'skirtLength', label: 'Skirt length (waist to hem)', style: true, min: 10, max: 120 }], defaults: {} };
  return { fields: TEE_FIELDS, defaults: TEE_STYLE_DEFAULTS };
}
const hasReady = (g: GarmentId) => g === 'polo' || g === 'tshirt' || g === 'jersey' || g === 'kurta' || g === 'chudidar';
const chartFor = (g: GarmentId) => (g === 'kurta' ? 'kurta' : g === 'chudidar' ? 'chudidar' : 'tee') as 'kurta' | 'chudidar' | 'tee';

/** Number field that commits on Enter or blur. */
function Num({ label, value, onChange, unit = 'cm', hint }: { label: string; value: number | undefined; onChange: (v: number) => void; unit?: string; hint?: string }) {
  const [txt, setTxt] = useState(value == null ? '' : String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setTxt(value == null ? '' : String(value)); }, [value, editing]);
  const commit = () => { setEditing(false); const v = Number(txt.replace(',', '.')); if (txt !== '' && isFinite(v) && v >= 0) onChange(v); else setTxt(value == null ? '' : String(value)); };
  return (
    <label className="block text-[11.5px]" title={hint}>
      <span className="line-clamp-1 text-mt-muted">{label}</span>
      <span className="mt-0.5 flex h-8 items-center rounded-md border border-mt-border bg-mt-bg focus-within:border-mt-ink/50">
        <input inputMode="decimal" value={txt} aria-label={label} onFocus={() => setEditing(true)} onChange={(e) => setTxt(e.target.value)} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); } }}
          className="h-full w-full min-w-0 bg-transparent px-2 text-[12.5px] tabular-nums outline-none" />
        <span className="pr-2 text-[10.5px] text-mt-faint">{unit}</span>
      </span>
    </label>
  );
}

export function TextilePanel({ api, recordsPdf }: { api: TextileApi; recordsPdf?: (count: number, apply: (i: number) => Promise<void>) => Promise<Uint8Array> }) {
  const pageObjs = () => { const c = api.canvas(); const page = api.page(); return c ? c.getObjects().filter((o: any) => !page.id || !o.__artboardId || o.__artboardId === page.id) : []; };
  const readSpec = (): TextileSpec | null => { const cut = pageObjs().find((o: any) => o.__tex); try { return cut ? JSON.parse(cut.__tex) : null; } catch { return null; } };
  const [spec, setSpec] = useState<TextileSpec>(() => readSpec() || defaultTextileSpec('polo'));
  const [applied, setApplied] = useState<string | null>(() => { const s = readSpec(); return s ? JSON.stringify(s) : null; });
  const [tab, setTab] = useState<'garment' | 'team' | 'fabric' | 'files'>('garment');
  // Team: one shirt per player with their own name, number and size.
  const [roster, setRoster] = useState('');
  const players = useMemo(() => roster.split(/\r?\n/).map((l) => l.split(/\t|,|;/).map((x) => x.trim())).filter((r) => r[0] || r[1]).map((r) => ({ name: r[0] || '', number: r[1] || '', size: (r[2] || '').toUpperCase() })), [roster]);
  const [showAll, setShowAll] = useState(false);
  const [fabricW, setFabricW] = useState(1500);
  const [busy, setBusy] = useState<string | null>(null);
  const [, bump] = useState(0);
  // The design may still be loading when the panel opens: pick up its pattern once it arrives.
  useEffect(() => {
    if (applied) return;
    let n = 0;
    const iv = setInterval(() => { const s = readSpec(); if (s) { setSpec(s); setApplied(JSON.stringify(s)); clearInterval(iv); } else if (++n > 40) clearInterval(iv); }, 250);
    return () => clearInterval(iv);
  }, [applied]); // eslint-disable-line react-hooks/exhaustive-deps

  const lay = useMemo(() => layoutPieces(spec), [spec]);
  const need = useMemo(() => fabricNeed(spec, fabricW), [spec, fabricW]);
  const { fields, defaults } = fieldsFor(spec.garment);
  const dirty = applied !== JSON.stringify(spec);
  const set = (p: Partial<TextileSpec>) => setSpec((s) => ({ ...s, ...p }));
  const setM = (k: string, v: number) => setSpec((s) => ({ ...s, size: 'custom', measures: { ...s.measures, [k]: v } }));
  const setGarment = (g: GarmentId) => setSpec((s) => { const d = defaultTextileSpec(g, s.size === 'custom' ? 'M' : s.size); return { ...d, allowance: s.allowance }; });
  const setSize = (sz: string) => setSpec((s) => (sz === 'custom' || !hasReady(s.garment) ? { ...s, size: 'custom' } : { ...s, size: sz as any, measures: readySize(chartFor(s.garment), sz as any) }));
  const outOfRange = fields.filter((f) => { const v = spec.measures[f.key]; return v != null && (v < f.min || v > f.max); });
  const sizeName = (s: TextileSpec) => (s.size === 'custom' ? 'Custom size' : `Size ${s.size}`);

  /** Draft and lay out the pieces on this page for `spec`. Artwork keeps its place on its piece. Returns the applied spec as JSON. */
  const applySpec = (spec: TextileSpec, appliedJson: string | null, quiet = false): string | null => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F) return appliedJson;
    const lay = layoutPieces(spec), applied = appliedJson;
    const page = api.page();
    let prev: TextileSpec | null = null; try { prev = applied ? JSON.parse(applied) : null; } catch { prev = null; }
    const oldLay: TextileLayout | null = prev ? layoutPieces(prev) : null;
    const oldOrigin = { x: page.x + TEX_MARGIN * TEX_PX, y: page.y + TEX_MARGIN * TEX_PX };
    const art = (api.pageArtwork ? api.pageArtwork() : pageObjs()).filter((o: any) => !o.__dieGen && !o.__isArtboard);
    pageObjs().filter((o: any) => o.__dieGen).forEach((o: any) => c.remove(o));
    const size = pageSizeFor(lay);
    if (Math.abs(page.width - size.width) > 1 || Math.abs(page.height - size.height) > 1) (api.resizeOnly || api.resize)(size.width, size.height);
    const p2 = api.page(), origin = { x: p2.x + TEX_MARGIN * TEX_PX, y: p2.y + TEX_MARGIN * TEX_PX };
    let moved = 0, orphan = 0;
    const hasBase = new Set<string>();
    let bodyFill = '#e5e7eb';
    if (oldLay) for (const o of art) {
      const r = o.getBoundingRect(true, true);
      const rm = { x: (r.left - oldOrigin.x) / TEX_PX, y: (r.top - oldOrigin.y) / TEX_PX, w: r.width / TEX_PX, h: r.height / TEX_PX };
      const from = (o.__piece && oldLay.pieces.find((p) => p.id === o.__piece)) || pieceAt(oldLay, rm.x + rm.w / 2, rm.y + rm.h / 2);
      const to = from && lay.pieces.find((p) => p.id === from.id);
      if (!from || !to) { if (o.__piece) orphan++; continue; }
      if (o.__texBase) {
        // the fabric itself takes the new piece outline and keeps its colour
        const idx = c.getObjects().indexOf(o);
        const nb = artToFabric(F, [{ piece: to, items: [{ k: 'path', name: o.name || `${to.label} · fabric`, d: to.d, fill: typeof o.fill === 'string' ? o.fill : '#e5e7eb' }] }], origin, spec.allowance)[0];
        if (typeof o.fill === 'string' && !/collar|placket|rib|facing|casing/.test(to.id)) bodyFill = o.fill;
        if (typeof o.fill !== 'string') nb.set({ fill: o.fill });
        c.remove(o); c.insertAt(nb, Math.max(0, idx));
        hasBase.add(to.id); moved++; continue;
      }
      const plan = remapOnPiece(rm, from, to);
      o.set({ scaleX: (o.scaleX || 1) * plan.fx, scaleY: (o.scaleY || 1) * plan.fy });
      o.setPositionByOrigin(new F.Point(origin.x + plan.cx * TEX_PX, origin.y + plan.cy * TEX_PX), 'center', 'center');
      if (o.clipPath && o.clipPath.absolutePositioned) o.clipPath = pieceClip(F, to, origin, spec.allowance);
      o.__piece = to.id; o.setCoords(); moved++;
    }
    else for (const o of art) if (o.__texBase) hasBase.add(o.__piece);
    // new pieces (a sleeve added, first draft) get plain fabric under the artwork
    const missing = lay.pieces.filter((p) => !hasBase.has(p.id));
    const bases = artToFabric(F, plainArt({ ...lay, pieces: missing }, bodyFill), origin, spec.allowance);
    bases.forEach((o) => { c.insertAt(o, 0); });
    guidesToFabric(F, spec, lay, origin, sizeName(spec)).forEach((o) => { c.add(o); c.bringToFront(o); });
    c.requestRenderAll();
    if (quiet) return JSON.stringify(spec);
    api.commit();
    api.notice(prev ? `Pattern updated — ${moved} object${moved === 1 ? '' : 's'} kept on their pieces${orphan ? `, ${orphan} left where they were (their piece is gone)` : ''}.` : `${lay.pieces.length} pattern pieces laid out. Design on the pieces; cut lines and guides are locked.`);
    return JSON.stringify(spec);
  };
  const apply = () => {
    if (outOfRange.length) api.notice(`Check: ${outOfRange.map((f) => f.label).join(', ')} is outside the usual range.`);
    const j = applySpec(spec, applied);
    if (j) setApplied(j);
  };

  // ── Team ──
  const nameObjs = () => pageObjs().filter((o: any) => o.name === 'Player name');
  const numberObjs = () => pageObjs().filter((o: any) => o.name === 'Player number' || o.name === 'Back number');
  const addNameNumber = () => {
    const c = api.canvas(), F = api.fabric(); if (!c || !F || !applied) { api.notice('Lay out the pattern pieces first.'); return; }
    const p = api.page(), L = layoutPieces(usedSpec());
    const back = L.pieces.find((x) => /^back$|bodice-back/.test(x.id)) || L.pieces[0];
    const ox = p.x + (TEX_MARGIN + back.x) * TEX_PX, oy = p.y + (TEX_MARGIN + back.y) * TEX_PX, w = back.w * TEX_PX;
    if (!nameObjs().length) { const t = new F.Textbox('PLAYER', { left: ox + w * 0.1, top: oy + back.h * TEX_PX * 0.16, width: w * 0.8, fontSize: back.w * 0.09 * TEX_PX, fontFamily: 'Oswald', fontWeight: 700, textAlign: 'center', fill: '#111827', name: 'Player name' }); t.__piece = back.id; c.add(t); }
    if (!numberObjs().length) { const t = new F.Textbox('10', { left: ox + w * 0.15, top: oy + back.h * TEX_PX * 0.26, width: w * 0.7, fontSize: back.w * 0.4 * TEX_PX, fontFamily: 'Oswald', fontWeight: 700, textAlign: 'center', fill: '#111827', name: 'Player number' }); t.__piece = back.id; c.add(t); }
    c.requestRenderAll(); api.commit(); bump((x) => x + 1);
    api.notice('Name and number added to the back. Style them like any text; each player gets their own in the team PDF.');
  };
  const teamPdf = () => run(`Making ${players.length} shirts…`, async () => {
    if (!recordsPdf) throw new Error('Team export is not available here.');
    if (!players.length) throw new Error('Add the players first: one per line — name, number, size.');
    if (!nameObjs().length && !numberObjs().length) throw new Error('Add the name and number to the back first.');
    const base = usedSpec(), baseJson = applied;
    const chart = chartFor(base.garment);
    const order = players.map((pl, i) => ({ ...pl, i })).sort((a, b) => SIZES.indexOf(a.size as any) - SIZES.indexOf(b.size as any));
    const keepN: [any, string][] = nameObjs().map((o: any) => [o, o.text]), keepNo: [any, string][] = numberObjs().map((o: any) => [o, o.text]);
    let cur = baseJson;
    try {
      const bytes = await recordsPdf(order.length, async (k) => {
        const pl = order[k];
        if (hasReady(base.garment) && SIZES.includes(pl.size as any)) {
          const next: TextileSpec = { ...base, size: pl.size as any, measures: readySize(chart, pl.size as any) };
          if (JSON.stringify(next) !== cur) cur = applySpec(next, cur, true);
        }
        nameObjs().forEach((o: any) => { o.set({ text: pl.name.toUpperCase() }); o.initDimensions?.(); });
        numberObjs().forEach((o: any) => { o.set({ text: pl.number }); o.initDimensions?.(); });
      });
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })); a.download = `team_${players.length}-shirts.pdf`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally {
      if (cur !== baseJson) applySpec(base, cur, true);
      keepN.forEach(([o, t]) => { o.set({ text: t }); o.initDimensions?.(); });
      keepNo.forEach(([o, t]) => { o.set({ text: t }); o.initDimensions?.(); });
      api.canvas()?.requestRenderAll();
    }
    api.notice(`${players.length} shirts in one PDF — one page each, in the player’s size.`);
  });
  const sizeCounts = useMemo(() => { const m = new Map<string, number>(); players.forEach((p) => m.set(p.size || '—', (m.get(p.size || '—') || 0) + 1)); return [...m]; }, [players]);

  const guides = () => pageObjs().filter((o: any) => o.__pat || (o.__dieGen && o.__die));
  const toggle = (what: 'visible' | 'locked') => {
    const objs = guides(); if (!objs.length) return;
    const on = what === 'visible' ? !objs.every((o: any) => o.visible !== false) : !objs.every((o: any) => o.locked);
    for (const o of objs) {
      if (what === 'visible') o.set({ visible: on });
      else o.set({ locked: on, lockMovementX: on, lockMovementY: on, lockScalingX: on, lockScalingY: on, lockRotation: on, hasControls: !on, selectable: !on, evented: !on });
    }
    api.canvas()?.requestRenderAll(); api.commit(); bump((x) => x + 1);
  };

  const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const run = async (label: string, f: () => Promise<void>) => { setBusy(label); try { await f(); } catch (e: any) { api.notice(e?.message || 'Export failed.'); } finally { setBusy(null); } };
  const usedSpec = (): TextileSpec => { try { return applied ? JSON.parse(applied) : spec; } catch { return spec; } };

  /** Branded technical document (garment spec sheet): sizes, measurements, pieces, fabric need, roster, legend, checks, sign-off. */
  const techDoc = () => run('Building the technical document…', async () => {
    const { downloadTechDoc, previewFromDataUrl, LINE_LEGEND } = await import('@/lib/print/techDoc');
    const sp = usedSpec(), L = layoutPieces(sp), nd = fabricNeed(sp, fabricW);
    const g = GARMENTS.find((x) => x.id === sp.garment);
    const ff = fieldsFor(sp.garment).fields;
    const pvUrl = api.preview?.();
    const preview = pvUrl ? { ...(await previewFromDataUrl(pvUrl)), caption: `Pattern layout with artwork · ${Math.round(L.w)} × ${Math.round(L.h)} mm` } : null;
    const name = api.docName?.() || '';
    const sizeLabel = sp.size === 'custom' ? 'Own measurements' : `Size ${sp.size}`;
    const meas: [string, string][] = ff.filter((f) => sp.measures[f.key] != null).map((f) => [f.label, `${sp.measures[f.key]} cm`]);
    const team = players.length ? [{ type: 'table' as const, title: `Team roster · ${players.length} garments`, head: ['#', 'Name', 'Number', 'Size'], widths: [0.6, 3, 1, 1], rows: players.map((p, i) => [String(i + 1), p.name || '—', p.number || '—', p.size || sp.size]) },
      { type: 'kv' as const, title: 'Sizes to make', cols: 2 as const, rows: Object.entries(players.reduce<Record<string, number>>((a, p) => { const k = p.size || String(sp.size); a[k] = (a[k] || 0) + 1; return a; }, {})).map(([k, v]) => [k, `${v} pc${v === 1 ? '' : 's'}`] as [string, string]) }] : [];
    await downloadTechDoc({
      kind: 'Garment specification',
      title: g?.name || 'Garment',
      subtitle: name && name !== 'Untitled Design' ? name : sizeLabel,
      summary: [['Garment', g?.name || sp.garment], ['Size', sp.size === 'custom' ? 'Custom' : String(sp.size)], ['Seam allowance', `${sp.allowance} mm`], ['Fabric', `${nd.metres} m × ${fabricW / 10} cm`], ['Pieces', String(L.pieces.reduce((a, p) => a + (p.qty || 1), 0))]],
      preview,
      spec: [
        ['Garment', g?.name || sp.garment], ['Size', sizeLabel],
        ['Neck', NECKS.find((n) => n.id === sp.neck)?.name || sp.neck], ['Sleeve', SLEEVES.find((n) => n.id === sp.sleeve)?.name || sp.sleeve],
        ...(sp.garment === 'frock' && sp.skirt ? [['Skirt', String(sp.skirt)] as [string, string]] : []),
        ['Seam allowance', `${sp.allowance} mm on every seam`],
        ['Fabric width', `${fabricW / 10} cm (${Math.round(fabricW / 25.4)}″)`],
        ['Fabric length', `${nd.metres} m for one garment (upper estimate)`],
        ['Pieces cover', `${nd.efficiency}% of the fabric used`],
        ['Print', 'Sublimation / digital textile print, artwork CMYK'],
      ],
      blocks: [
        ...(meas.length ? [{ type: 'kv' as const, title: 'Measurements', rows: meas }] : []),
        { type: 'table', title: 'Pattern pieces', head: ['Piece', 'Cut', 'Width', 'Length', 'Grain'], align: ['l', 'r', 'r', 'r', 'l'], widths: [3, 0.8, 1, 1, 1.2], rows: L.pieces.map((p) => [p.label, `${p.qty || 1}${p.mirror ? ' (pair)' : ''}`, `${Math.round(p.w)} mm`, `${Math.round(p.h)} mm`, p.grain === 'bias' ? 'Bias' : 'Lengthwise']) },
        ...team,
        { type: 'legend', title: 'Pattern legend', items: [{ ...LINE_LEGEND.cut, label: 'Cut line', note: 'Outer edge, seam allowance included' }, LINE_LEGEND.stitch, LINE_LEGEND.grain, { colour: '#E30613', label: 'Notch', note: 'Match points between pieces' }] },
        ...(nd.tooWide.length ? [{ type: 'notes' as const, title: 'Warnings', items: [`Wider than the ${fabricW / 10} cm fabric: ${nd.tooWide.join(', ')}. Use a wider fabric or add a seam.`] }] : []),
        { type: 'checks', title: 'Before cutting', items: ['Print the pattern at 100% and measure the 10 cm test square.', 'Pre-wash or pre-shrink the fabric if it is cotton; sublimation needs polyester.', 'Lay every piece with its grain line along the fabric length.', 'Cut pairs mirrored; check notches line up before stitching.'] },
        { type: 'signoff', roles: ['Pattern by', 'Cutting checked', 'Approved by (client)'] },
      ],
    }, `${(name && name !== 'Untitled Design' ? name : g?.name || 'garment').replace(/[\\/:*?"<>|]+/g, '-')} - garment spec.pdf`);
  });

  /** Pattern PDF: stitch line, cut line, grain, notches and labels at full size; A4 tiles with overlap and match marks. */
  const patternPdf = (tiled: boolean) => run('Building the pattern PDF…', async () => {
    const [{ jsPDF }, { pathToPolylines }] = await Promise.all([import('jspdf'), import('@/lib/dxf')]);
    const s = usedSpec(), L = layoutPieces(s);
    const W = L.w + 2 * TEX_MARGIN, H = L.h + 2 * TEX_MARGIN;
    const drawAll = (pdf: any, ox: number, oy: number) => {
      const path = (d: string, px: number, py: number) => {
        // flatten to polylines (curves included) and draw in mm
        pathToPolylines(d).forEach((pl) => { if (pl.pts.length < 2) return; const pts = pl.pts.map(([x, y]) => [x + px - ox, y + py - oy]); pdf.lines(pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'S', pl.closed); });
      };
      return Promise.all(L.pieces.map(async (p) => {
        const px = TEX_MARGIN + p.x, py = TEX_MARGIN + p.y;
        pdf.setLineDashPattern([], 0); pdf.setDrawColor(0); pdf.setLineWidth(0.35); await path(cutPath(p, s.allowance), px, py);
        pdf.setLineDashPattern([3, 1.5], 0); pdf.setDrawColor(100); pdf.setLineWidth(0.2); await path(p.d, px, py);
        pdf.setLineDashPattern([], 0); pdf.setDrawColor(15, 118, 110);
        const gx = px + p.w / 2 - ox, g0 = py + p.h * 0.22 - oy, g1 = py + p.h * 0.62 - oy;
        if (p.grain === 'bias') { pdf.line(gx - 60, g0 + 60, gx + 60, g0 - 60); } else { pdf.line(gx, g0, gx, g1); pdf.line(gx, g0, gx - 3, g0 + 6); pdf.line(gx, g0, gx + 3, g0 + 6); pdf.line(gx, g1, gx - 3, g1 - 6); pdf.line(gx, g1, gx + 3, g1 - 6); }
        pdf.setDrawColor(220, 38, 38); (p.notches || []).forEach(([x, y]) => { pdf.line(px + x - ox - 3, py + y - oy - 3, px + x - ox + 3, py + y - oy + 3); pdf.line(px + x - ox - 3, py + y - oy + 3, px + x - ox + 3, py + y - oy - 3); });
        pdf.setTextColor(40); pdf.setFontSize(Math.max(7, Math.min(16, p.w / 14)) * 2.83);
        pdf.text([p.label, `${sizeName(s)} · ${p.grain === 'bias' ? 'bias grain' : 'straight grain'}`, `Seam allowance ${s.allowance} mm (included outside the stitch line)`], px + p.w / 2 - ox, py + p.h * 0.7 - oy, { align: 'center' });
      }));
    };
    if (!tiled) {
      const pdf = new jsPDF({ unit: 'mm', format: [W, H + 130], orientation: W > H + 130 ? 'landscape' : 'portrait' });
      await drawAll(pdf, 0, 0);
      // 10 cm test square below the pieces
      pdf.setDrawColor(0); pdf.setLineDashPattern([], 0); pdf.setLineWidth(0.3); pdf.rect(TEX_MARGIN, H + 10, 100, 100);
      pdf.setTextColor(60); pdf.setFontSize(10); pdf.text('10 cm test square — check it measures exactly 100 × 100 mm', TEX_MARGIN + 108, H + 20);
      save(pdf.output('blob'), `${GARMENTS.find((g) => g.id === s.garment)?.name || 'Garment'} pattern - full size.pdf`);
      return;
    }
    const PW = 210, PH = 297, M = 10, CW = PW - 2 * M, CH = PH - 2 * M, OV = 0; // printable cell, edges meet at the frame
    const cols = Math.ceil(W / CW), rows = Math.ceil(H / CH);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    let first = true;
    for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
      if (!first) pdf.addPage('a4'); first = false;
      const ox = col * CW - M + OV, oy = r * CH - M + OV;
      await drawAll(pdf, ox, oy);
      // white margins over anything outside the cell, then the frame and labels
      pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, PW, M, 'F'); pdf.rect(0, PH - M, PW, M, 'F'); pdf.rect(0, 0, M, PH, 'F'); pdf.rect(PW - M, 0, M, PH, 'F');
      pdf.setDrawColor(150); pdf.setLineDashPattern([1, 1], 0); pdf.setLineWidth(0.2); pdf.rect(M, M, CW, CH);
      pdf.setTextColor(90); pdf.setFontSize(8);
      pdf.text(`Page ${String.fromCharCode(65 + r)}${col + 1}  ·  row ${r + 1} of ${rows}, column ${col + 1} of ${cols}  ·  print at 100% (actual size)`, M, M - 3);
      pdf.text('Trim on the dotted frame and butt the edges together', M, PH - M + 5);
      if (r === 0 && col === 0) { pdf.setLineDashPattern([], 0); pdf.setDrawColor(0); pdf.rect(M + 5, M + 5, 50, 50); pdf.text('5 cm test square', M + 7, M + 60); }
    }
    save(pdf.output('blob'), `${GARMENTS.find((g) => g.id === s.garment)?.name || 'Garment'} pattern - A4 tiled.pdf`);
  });
  const dxf = () => run('Building DXF…', async () => {
    const { pathToPolylines, writeDxf } = await import('@/lib/dxf');
    const s = usedSpec(), L = layoutPieces(s);
    const mv = (d: string, p: { x: number; y: number }) => pathToPolylines(d).map((pl) => ({ ...pl, pts: pl.pts.map(([x, y]) => [x + TEX_MARGIN + p.x, y + TEX_MARGIN + p.y] as [number, number]) }));
    const H = L.h + 2 * TEX_MARGIN;
    const txt = writeDxf([
      { name: 'CUT', color: 6, polylines: L.pieces.flatMap((p) => mv(cutPath(p, s.allowance), p)) },
      { name: 'SEAM', color: 8, polylines: L.pieces.flatMap((p) => mv(p.d, p)) },
      { name: 'GRAIN', color: 3, polylines: L.pieces.map((p) => ({ closed: false, pts: [[TEX_MARGIN + p.x + p.w / 2, TEX_MARGIN + p.y + p.h * 0.22], [TEX_MARGIN + p.x + p.w / 2, TEX_MARGIN + p.y + p.h * 0.62]] as [number, number][] })) },
      { name: 'NOTCH', color: 1, polylines: L.pieces.flatMap((p) => (p.notches || []).map(([x, y]) => ({ closed: false, pts: [[TEX_MARGIN + p.x + x, TEX_MARGIN + p.y + y - 3], [TEX_MARGIN + p.x + x, TEX_MARGIN + p.y + y + 3]] as [number, number][] }))) },
    ], H);
    save(new Blob([txt], { type: 'application/dxf' }), 'pattern.dxf');
  });

  const g = guides(), shown = g.length > 0 && g.every((o: any) => o.visible !== false), locked = g.length > 0 && g.every((o: any) => o.locked);
  const btn = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-mt-border px-2 text-[11.5px] font-semibold hover:bg-mt-surface2 disabled:opacity-50';
  const sel = 'h-8 w-full rounded-md border border-mt-border bg-mt-bg px-2 text-[12.5px]';
  const body = fields.filter((f) => !f.style), style = fields.filter((f) => f.style);
  const showFields = showAll ? body : body.slice(0, 6);

  return (
    <div className="space-y-4 text-[12px]">
      <div role="tablist" aria-label="Textile" className="grid grid-cols-4 rounded-lg border border-mt-border p-0.5">
        {([['garment', 'Garment'], ['team', 'Team'], ['fabric', 'Fabric'], ['files', 'Files']] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-7 rounded-md text-[12px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{label}</button>
        ))}
      </div>

      {tab === 'garment' && <>
        <section className="space-y-2">
          <label className="block text-[11.5px]"><span className="text-mt-muted">Garment</span>
            <select value={spec.garment} onChange={(e) => setGarment(e.target.value as GarmentId)} className={sel} aria-label="Garment">
              {GARMENTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <p className="text-[11px] text-mt-faint">{GARMENTS.find((x) => x.id === spec.garment)?.hint}</p>
          {hasReady(spec.garment) && (
            <div>
              <p className="mb-1 text-[11.5px] text-mt-muted">Size</p>
              <div className="flex flex-wrap gap-1">
                {[...SIZES, 'custom' as const].map((sz) => (
                  <button key={sz} type="button" onClick={() => setSize(sz)} aria-pressed={spec.size === sz} className={`h-7 min-w-[34px] rounded-md border px-1.5 text-[11.5px] font-semibold ${spec.size === sz ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border hover:bg-mt-surface2'}`}>{sz === 'custom' ? 'Custom' : sz}</button>
                ))}
              </div>
            </div>
          )}
          {(spec.garment === 'kurta' || spec.garment === 'frock') && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11.5px]"><span className="text-mt-muted">Neckline</span>
                <select value={spec.neck} onChange={(e) => set({ neck: e.target.value as NeckStyle })} className={sel} aria-label="Neckline">{NECKS.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
              </label>
              <label className="block text-[11.5px]"><span className="text-mt-muted">Sleeve</span>
                <select value={spec.sleeve} onChange={(e) => set({ sleeve: e.target.value as SleeveStyle })} className={sel} aria-label="Sleeve">{SLEEVES.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
              </label>
            </div>
          )}
          {(spec.garment === 'polo' || spec.garment === 'tshirt' || spec.garment === 'jersey') && (
            <label className="block text-[11.5px]"><span className="text-mt-muted">Sleeve</span>
              <select value={spec.sleeve === 'full' ? 'full' : 'short'} onChange={(e) => set({ sleeve: e.target.value as SleeveStyle })} className={sel} aria-label="Sleeve"><option value="short">Short</option><option value="full">Long</option></select>
            </label>
          )}
          {spec.garment === 'frock' && (
            <label className="block text-[11.5px]"><span className="text-mt-muted">Skirt</span>
              <select value={spec.skirt} onChange={(e) => set({ skirt: e.target.value as any })} className={sel} aria-label="Skirt">
                <option value="gathered">Gathered</option><option value="aline">A-line</option><option value="straight">Straight</option><option value="circle">Full circle</option><option value="half-circle">Half circle</option><option value="none">Bodice only (top)</option>
              </select>
            </label>
          )}
        </section>

        <section>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Measurements (body, cm)</p>
          <div className="grid grid-cols-2 gap-2">
            {showFields.map((f) => <Num key={f.key} label={f.label} hint={`${f.label}: ${f.min}–${f.max} cm`} value={spec.measures[f.key]} onChange={(v) => setM(f.key, v)} />)}
          </div>
          {body.length > 6 && <button type="button" onClick={() => setShowAll((x) => !x)} className="mt-1.5 text-[11.5px] font-semibold text-mt-accent hover:underline">{showAll ? 'Fewer measurements' : `All ${body.length} measurements`}</button>}
          {style.length > 0 && <>
            <p className="mb-1.5 mt-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Fit and style</p>
            <div className="grid grid-cols-2 gap-2">
              {style.map((f) => <Num key={f.key} label={f.label} value={spec.measures[f.key] ?? defaults[f.key]} onChange={(v) => setM(f.key, v)} />)}
            </div>
          </>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Num label="Seam allowance (all edges)" unit="mm" value={spec.allowance} onChange={(v) => set({ allowance: Math.min(40, v) })} />
          </div>
          {outOfRange.length > 0 && <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">Outside the usual range: {outOfRange.map((f) => `${f.label} (${f.min}–${f.max})`).join(', ')}.</p>}
          <p className="mt-2 text-[11px] text-mt-faint">Measure the body over light clothing with a soft tape. Ready sizes are a starting point; make a test garment before cutting good fabric.</p>
        </section>

        <button type="button" onClick={apply} disabled={applied != null && !dirty} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-mt-ink text-[12.5px] font-semibold text-mt-bg hover:opacity-90 disabled:opacity-50">
          {applied ? <RefreshCw size={14} /> : <Shirt size={14} />}{applied ? (dirty ? 'Update pattern' : 'Pattern is up to date') : 'Lay out pattern pieces'}
        </button>

        <section>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Pieces ({lay.pieces.length})</p>
          <ul className="divide-y divide-mt-border rounded-md border border-mt-border">
            {lay.pieces.map((p) => <li key={p.id} className="flex items-center justify-between px-2 py-1.5"><span className="truncate">{p.label}</span><span className="shrink-0 tabular-nums text-mt-faint">{Math.round(p.w / 10)} × {Math.round(p.h / 10)} cm</span></li>)}
          </ul>
        </section>
      </>}

      {tab === 'team' && <section className="space-y-2.5">
        <p className="text-[11.5px] text-mt-muted">Team kits: design the shirt once, then every player gets their own name, number and size in one print PDF.</p>
        <button type="button" className={`${btn} w-full`} onClick={addNameNumber}>Add name & number to the back</button>
        <label className="block text-[11.5px]"><span className="text-mt-muted">Players — one per line: name, number, size</span>
          <textarea value={roster} onChange={(e) => setRoster(e.target.value)} rows={6} aria-label="Players" placeholder={'Arun, 7, M\nRavi, 10, L\nAisha, 23, S'} className="mt-0.5 w-full rounded-md border border-mt-border bg-mt-bg p-2 font-mono text-[11.5px]" />
        </label>
        {players.length > 0 && <div className="rounded-md border border-mt-border p-2">
          <p className="text-[11.5px] font-semibold">{players.length} player{players.length === 1 ? '' : 's'}</p>
          <p className="mt-0.5 text-[11px] text-mt-faint">Sizes: {sizeCounts.map(([k, v]) => `${k} × ${v}`).join(' · ')}</p>
          {hasReady(spec.garment) && players.some((p) => p.size && !SIZES.includes(p.size as any)) && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Sizes must be XS–XXXL; others use the current size.</p>}
          {new Set(players.map((p) => p.number).filter(Boolean)).size < players.filter((p) => p.number).length && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">Some numbers are used twice.</p>}
        </div>}
        <button type="button" className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-mt-ink text-[12.5px] font-semibold text-mt-bg hover:opacity-90 disabled:opacity-50" disabled={!!busy || !players.length || !applied} onClick={teamPdf}><Download size={14} /> Team PDF — one shirt per player</button>
        {busy && <p className="text-[11px] text-mt-muted">{busy}</p>}
        <p className="text-[11px] text-mt-faint">Each page has all the pieces in that player’s size, ready for sublimation printing. Cut lines and guides are left out.</p>
      </section>}

      {tab === 'fabric' && <>
        <section className="space-y-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Fabric needed</p>
          <label className="block text-[11.5px]"><span className="text-mt-muted">Fabric width</span>
            <select value={fabricW} onChange={(e) => setFabricW(Number(e.target.value))} className={sel} aria-label="Fabric width">{FABRIC_WIDTHS.map((w) => <option key={w} value={w}>{w / 10} cm ({Math.round(w / 25.4)}″)</option>)}</select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-mt-border p-2"><p className="text-[10.5px] text-mt-faint">Length</p><p className="text-[16px] font-semibold tabular-nums">{need.metres} m</p></div>
            <div className="rounded-md border border-mt-border p-2"><p className="text-[10.5px] text-mt-faint">Pieces cover</p><p className="text-[16px] font-semibold tabular-nums">{need.efficiency}%</p></div>
          </div>
          {need.tooWide.length > 0 && <p className="rounded-md bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-700 dark:text-rose-300">Wider than the fabric: {need.tooWide.join(', ')}.</p>}
          <p className="text-[11px] text-mt-faint">Rows laid by piece size, one garment, seam allowance included. A cutting room nests pieces tighter; treat this as an upper estimate.</p>
        </section>
        <section className="space-y-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Pattern guides</p>
          <p className="text-[11px] text-mt-faint">Magenta = cut line. Grey dashes = stitch line. Green = grain line. Red crosses = notches. Guides never print on the fabric.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btn} onClick={() => toggle('visible')} disabled={!g.length}>{shown ? <EyeOff size={13} /> : <Eye size={13} />}{shown ? 'Hide guides' : 'Show guides'}</button>
            <button type="button" className={btn} onClick={() => toggle('locked')} disabled={!g.length}>{locked ? <Unlock size={13} /> : <Lock size={13} />}{locked ? 'Unlock' : 'Lock'}</button>
          </div>
        </section>
      </>}

      {tab === 'files' && <section className="space-y-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Production files</p>
        <button type="button" className={`${btn} w-full justify-start`} disabled={!!busy || !applied} onClick={() => run('Building the print PDF…', api.pressPdf)}><Download size={13} /> Print PDF — artwork CMYK, cut line spot colour</button>
        <button type="button" className={`${btn} w-full justify-start`} disabled={!!busy || !applied} onClick={() => patternPdf(false)}><Download size={13} /> Pattern PDF — full size (plotter)</button>
        <button type="button" className={`${btn} w-full justify-start`} disabled={!!busy || !applied} onClick={() => patternPdf(true)}><Download size={13} /> Pattern PDF — A4 tiled (home printer)</button>
        <button type="button" className={`${btn} w-full justify-start`} disabled={!!busy || !applied} onClick={dxf}><Download size={13} /> DXF — cut, stitch, grain, notch layers</button>
        <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mt-faint">Documents</p>
        <button type="button" className={`${btn} w-full justify-start`} disabled={!!busy || !applied} onClick={techDoc}><Download size={13} /> Technical document — garment specification{players.length ? ' with team roster' : ''}</button>
        {!applied && <p className="text-[11px] text-mt-faint">Lay out the pattern pieces first.</p>}
        {busy && <p className="text-[11px] text-mt-muted">{busy}</p>}
        <p className="text-[11px] text-mt-faint">For sublimation or digital fabric printing, send the print PDF. Check the 10 cm / 5 cm test square after printing a pattern — it must measure exactly.</p>
      </section>}
    </div>
  );
}
