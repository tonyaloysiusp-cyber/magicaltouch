'use client';

// Wall designer — two separate jobs:
//  • Wall poster: pick a standard print size (A3–A0, 50×70, 70×100,
//    18×24″, 24×36″) or your own, see it to scale on a wall, and open a blank
//    poster at that exact size (with bleed) in the design editor.
//  • Wall pattern: wallpaper or a wall sticker of any size filled with a
//    pattern and optional lettering, split into numbered print strips.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, Loader2, RectangleVertical, RectangleHorizontal } from 'lucide-react';
import { DEFAULT_PATTERN, PALETTES, PatternSettings, svgDataUrl } from '@/lib/patterns';
import { DEFAULT_WALL, POSTER_SIZES, WALL_ROLLS, WallJob, posterEditorUrl, wallStrips, wallSvg, rollEstimate, type RoomWall, type RollSpec } from '@/lib/wall';
import { textOutline } from '@/lib/patternText';

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };

const PRESETS: { name: string; p: Partial<PatternSettings> }[] = [
  { name: 'Ogee', p: { motif: 'ogee', repeat: 'grid', scale: 0.95, colors: ['#C9A86A'], background: '#1E3A5F' } },
  { name: 'Botanical', p: { motif: 'monstera', repeat: 'half-drop', scale: 0.85, rotation: 20, colors: PALETTES[1].colors, background: PALETTES[1].background } },
  { name: 'Stars', p: { motif: 'star5', repeat: 'half-drop', scale: 0.4, colors: PALETTES[4].colors, background: PALETTES[4].background } },
  { name: 'Moroccan', p: { motif: 'moroccan', repeat: 'grid', scale: 0.9, colors: PALETTES[0].colors, background: PALETTES[0].background } },
  { name: 'Blossom', p: { motif: 'cherry-blossom', repeat: 'random', density: 10, scale: 0.4, colors: PALETTES[3].colors, background: PALETTES[3].background } },
  { name: 'Geometric', p: { motif: 'hexagon-ring', repeat: 'brick', scale: 0.7, colors: PALETTES[6].colors, background: PALETTES[6].background } },
  { name: 'Clouds', p: { motif: 'cloud', repeat: 'half-drop', scale: 0.5, colors: ['#BFDBFE', '#93C5FD', '#FFFFFF'], background: '#EFF6FF' } },
  { name: 'Leaves', p: { motif: 'leaf', repeat: 'half-drop', scale: 0.5, rotation: 30, colors: PALETTES[2].colors, background: PALETTES[2].background } },
];

/** A wall to scale (3 m × 2.4 m) with a sofa and the poster at eye level. */
function wallMockup(wMm: number, hMm: number): string {
  const W = 3600, H = 2600, floor = 2350;
  const px = W / 2 - wMm / 2, py = Math.max(150, 1500 - hMm / 2 - 150);
  const sofa = `<g fill="#9AA5B1"><rect x="1050" y="${floor - 560}" width="1500" height="420" rx="70"/><rect x="980" y="${floor - 420}" width="1640" height="300" rx="60" fill="#8A95A1"/><rect x="1060" y="${floor - 120}" width="40" height="120" fill="#6B7280"/><rect x="2500" y="${floor - 120}" width="40" height="120" fill="#6B7280"/></g>`;
  const plant = `<g><rect x="2860" y="${floor - 330}" width="200" height="330" rx="20" fill="#C9A86A"/><path d="M2960 ${floor - 330}C2860 ${floor - 700} 2760 ${floor - 760} 2700 ${floor - 820}C2860 ${floor - 760} 2930 ${floor - 640} 2960 ${floor - 330}ZM2960 ${floor - 330}C3060 ${floor - 760} 3160 ${floor - 820} 3230 ${floor - 880}C3080 ${floor - 760} 3000 ${floor - 640} 2960 ${floor - 330}ZM2960 ${floor - 330}C2950 ${floor - 760} 2980 ${floor - 900} 2990 ${floor - 980}C3010 ${floor - 880} 2990 ${floor - 640} 2960 ${floor - 330}Z" fill="#4D7C62"/></g>`;
  const person = `<g fill="#CBD2D9"><circle cx="420" cy="${floor - 1590}" r="105"/><rect x="330" y="${floor - 1470}" width="180" height="760" rx="80"/><rect x="335" y="${floor - 760}" width="75" height="760" rx="35"/><rect x="430" y="${floor - 760}" width="75" height="760" rx="35"/></g><text x="420" y="${floor + 150}" text-anchor="middle" font-size="80" fill="#8A8F98" font-family="Arial">1.7 m</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${floor}" fill="#EEE8DE"/><rect y="${floor}" width="${W}" height="${H - floor}" fill="#C8B8A2"/>${person}${sofa}${plant}<rect x="${px + 14}" y="${py + 18}" width="${wMm}" height="${hMm}" fill="#000" opacity="0.12"/><rect x="${px}" y="${py}" width="${wMm}" height="${hMm}" fill="#fff" stroke="#1F2937" stroke-width="16"/><rect x="${px + 40}" y="${py + 40}" width="${wMm - 80}" height="${hMm - 80}" fill="#3B82C4" opacity="0.10"/><text x="${W / 2}" y="${py + hMm / 2}" text-anchor="middle" dominant-baseline="central" font-size="${Math.max(40, Math.min(110, wMm / 7))}" fill="#3B82C4" font-family="Arial" font-weight="700">${Math.round(wMm)} × ${Math.round(hMm)} mm</text></svg>`;
}

export function WallDesigner({ initial = 'poster' }: { initial?: 'poster' | 'pattern' }) {
  const [mode, setMode] = useState<'poster' | 'pattern'>(initial);
  useEffect(() => { try { const t = new URLSearchParams(window.location.search).get('type'); if (t === 'pattern' || t === 'poster') setMode(t); } catch { /* ignore */ } }, []);
  const pick = (m: 'poster' | 'pattern') => { setMode(m); try { const u = new URL(window.location.href); u.searchParams.set('type', m); window.history.replaceState(null, '', u.toString()); } catch { /* ignore */ } };

  // Poster
  const [size, setSize] = useState('a2');
  const [custom, setCustom] = useState({ w: 600, h: 900 });
  const [landscape, setLandscape] = useState(false);
  const [bleedMm, setBleedMm] = useState(3);
  const base = size === 'custom' ? { wMm: custom.w, hMm: custom.h } : POSTER_SIZES.find((s) => s.id === size)!;
  const [pw, ph] = landscape ? [base.hMm, base.wMm] : [base.wMm, base.hMm];
  const mock = useMemo(() => wallMockup(pw, ph), [pw, ph]);

  // Pattern
  const [wall, setWall] = useState<WallJob>(DEFAULT_WALL);
  const [pat, setPat] = useState<PatternSettings>({ ...DEFAULT_PATTERN, ...PRESETS[0].p });
  const [patName, setPatName] = useState(PRESETS[0].name);
  const [mine, setMine] = useState<{ name: string; p: PatternSettings }[]>([]);
  const [glyph, setGlyph] = useState<string | null>(null);
  // Room & rolls calculator (millimetres inside; shown in the chosen unit).
  const UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 } as const;
  const [unit, setUnit] = useState<keyof typeof UNITS>('cm');
  const [room, setRoom] = useState<RoomWall[]>([{ name: 'Wall 1', widthMm: 3000, heightMm: 2400, openings: [] }]);
  const [roll, setRoll] = useState<RollSpec>({ rollWidthMm: 530, rollLengthMm: 10050, repeatMm: 0, match: 'straight', trimMm: 100, extraPct: 10 });
  const est = useMemo(() => rollEstimate(room, roll), [room, roll]);
  const toU = (mm: number) => Math.round((mm / UNITS[unit]) * 100) / 100;
  const fromU = (v: number) => Math.max(0, v * UNITS[unit]);
  const editWall = (i: number, o: Partial<RoomWall>) => setRoom((r) => r.map((w, k) => (k === i ? { ...w, ...o } : w)));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const sw = (o: Partial<WallJob>) => setWall((w) => ({ ...w, ...o }));
  useEffect(() => {
    const list: { name: string; p: PatternSettings }[] = [];
    const d = load<any>('mt:pattern-draft', null);
    if (d?.motif && d.motif !== 'image') list.push({ name: 'Latest from Pattern Studio', p: { ...DEFAULT_PATTERN, ...d } });
    for (const s of load<any[]>('mt:patterns', [])) if (s?.p?.motif && s.p.motif !== 'image') list.push({ name: s.name || 'My pattern', p: { ...DEFAULT_PATTERN, ...s.p } });
    setMine(list.slice(0, 8));
  }, []);
  useEffect(() => { sw({ background: pat.background }); }, [pat.background]);
  useEffect(() => {
    let live = true; setGlyph(null);
    if (!wall.text.trim()) return;
    const t = setTimeout(() => { textOutline(wall.text.slice(0, 16), { family: 'Montserrat', weight: 800, italic: false }).then((x) => live && setGlyph(x)).catch(() => {}); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [wall.text]);
  const preview = useMemo(() => (mode === 'pattern' ? wallSvg(wall, pat, glyph) : ''), [mode, wall, pat, glyph]);
  const strips = useMemo(() => (mode === 'pattern' ? wallStrips(wall, pat, glyph) : []), [mode, wall, pat, glyph]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 6000); };
  const pdf = async () => {
    setBusy('pdf');
    try { const { svgToPdfBlob } = await import('@/lib/svgToPdf'); save(await svgToPdfBlob('', 0, 0, strips.map((s) => ({ svg: s.svg, widthMm: s.widthMm, heightMm: s.heightMm }))), `wall-pattern-${wall.widthMm}x${wall.heightMm}-${strips.length}-strips.pdf`); }
    catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };

  const field = 'mt-1 h-10 w-full rounded-xl border border-mt-border bg-mt-bg px-3 text-[13.5px]';
  const btn = 'h-10 px-4 rounded-full border border-mt-border text-[13.5px] font-semibold inline-flex items-center justify-center gap-1.5 hover:border-mt-ink/40 disabled:opacity-50';
  const primary = 'h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50';
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-mt-muted">{children}</h3>;
  const num = (label: string, v: number, on: (n: number) => void, min: number, max: number) => <label className="block text-[12px] text-mt-muted">{label}<input type="number" min={min} max={max} value={v} onChange={(e) => on(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className={field} /></label>;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Wall design type" className="flex w-fit gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">
        {(['poster', 'pattern'] as const).map((m) => <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => pick(m)} className={`h-10 px-5 rounded-xl text-[14px] font-semibold ${mode === m ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted hover:text-mt-ink'}`}>{m === 'poster' ? 'Wall poster' : 'Wall pattern & wallpaper'}</button>)}
      </div>

      {mode === 'poster' ? (
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5">
            <section className="space-y-2">
              <H>Poster size</H>
              <div className="grid grid-cols-2 gap-2">
                {[...POSTER_SIZES, { id: 'custom', label: 'Custom size', wMm: custom.w, hMm: custom.h }].map((s) => (
                  <button key={s.id} type="button" aria-pressed={size === s.id} onClick={() => setSize(s.id)} className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left ${size === s.id ? 'border-mt-ink bg-mt-surface2' : 'border-mt-border hover:border-mt-ink/40'}`}>
                    <span className="grid h-10 w-8 shrink-0 place-items-center"><span className="block border-2 border-current rounded-[2px] text-[#3B82C4]" style={{ width: `${(s.wMm / Math.max(s.wMm, s.hMm)) * 26}px`, height: `${(s.hMm / Math.max(s.wMm, s.hMm)) * 34}px` }} /></span>
                    <span className="text-[12.5px] font-semibold leading-tight">{s.label.split(' · ')[0]}<span className="block text-[11px] font-normal text-mt-muted">{s.label.split(' · ')[1] || (s.id === 'custom' ? 'Any size in mm' : '')}</span></span>
                  </button>
                ))}
              </div>
              {size === 'custom' && <div className="grid grid-cols-2 gap-2">{num('Width (mm)', custom.w, (n) => setCustom((c) => ({ ...c, w: n })), 50, 5000)}{num('Height (mm)', custom.h, (n) => setCustom((c) => ({ ...c, h: n })), 50, 5000)}</div>}
            </section>
            <section className="space-y-2">
              <H>Orientation</H>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={!landscape} onClick={() => setLandscape(false)} className={`${btn} ${!landscape ? 'border-mt-ink bg-mt-ink text-mt-bg' : ''}`}><RectangleVertical size={15} /> Portrait</button>
                <button type="button" aria-pressed={landscape} onClick={() => setLandscape(true)} className={`${btn} ${landscape ? 'border-mt-ink bg-mt-ink text-mt-bg' : ''}`}><RectangleHorizontal size={15} /> Landscape</button>
              </div>
            </section>
            <section className="space-y-2">
              <H>Print settings</H>
              {num('Bleed on each side (mm)', bleedMm, setBleedMm, 0, 20)}
              <p className="text-[11.5px] text-mt-muted">Opens at 150 DPI — sharp for posters viewed from a metre or more — with a 10 mm safe area for text.</p>
            </section>
            <a href={posterEditorUrl(base.wMm, base.hMm, { landscape, bleedMm })} className={`${primary} w-full`}>Design this poster <ExternalLink size={15} /></a>
            <Link href="/templates?q=poster" className={`${btn} w-full`}>Start from a poster template</Link>
          </aside>
          <div className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
            <img src={svgDataUrl(mock)} alt={`${Math.round(pw)} × ${Math.round(ph)} mm poster to scale on a wall`} className="w-full rounded-2xl" />
            <p className="mt-2 text-[12.5px] text-mt-muted">Shown to scale on a 3.6 m wall next to a 1.7 m person. Print size {Math.round(pw)} × {Math.round(ph)} mm{bleedMm ? ` + ${bleedMm} mm bleed` : ''}.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-5">
            <section className="space-y-2">
              <H>Pattern</H>
              <div className="grid grid-cols-4 gap-2">
                {[...PRESETS.map((x) => ({ name: x.name, p: { ...DEFAULT_PATTERN, ...x.p } as PatternSettings })), ...mine].map((x) => (
                  <button key={x.name} type="button" title={x.name} aria-label={`Pattern: ${x.name}`} aria-pressed={patName === x.name} onClick={() => { setPat(x.p); setPatName(x.name); }} className={`rounded-xl border p-1 ${patName === x.name ? 'border-mt-ink ring-2 ring-mt-ink/15' : 'border-mt-border hover:border-mt-ink/40'}`}>
                    <img alt="" className="w-full aspect-square rounded-lg" src={svgDataUrl(wallSvg({ ...wall, widthMm: 400, heightMm: 400, repeatMm: 140, text: '', background: x.p.background }, x.p))} />
                  </button>
                ))}
              </div>
              <Link href="/patterns" className="text-[12.5px] font-semibold underline underline-offset-2">Design your own pattern →</Link>
            </section>
            <section className="space-y-2">
              <H>Wall</H>
              <div className="grid grid-cols-2 gap-2">{num('Width (mm)', wall.widthMm, (n) => sw({ widthMm: n }), 200, 20000)}{num('Height (mm)', wall.heightMm, (n) => sw({ heightMm: n }), 200, 6000)}</div>
              <label className="block text-[12px] text-mt-muted">Material roll<select value={wall.rollMm} onChange={(e) => sw({ rollMm: Number(e.target.value) })} className={field}>{WALL_ROLLS.map((r) => <option key={r.mm} value={r.mm}>{r.label}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-2">{num('Overlap (mm)', wall.overlapMm, (n) => sw({ overlapMm: n }), 0, 50)}{num('Repeat (mm)', wall.repeatMm, (n) => sw({ repeatMm: n }), 20, 2000)}</div>
              <label className="flex items-center justify-between text-[12px] text-mt-muted">Background<input type="color" value={wall.background} onChange={(e) => sw({ background: e.target.value })} className="h-9 w-12 rounded-md border border-mt-border bg-transparent" /></label>
            </section>
            <section className="space-y-2">
              <H>Lettering (optional)</H>
              <input value={wall.text} maxLength={16} onChange={(e) => sw({ text: e.target.value })} className={field} placeholder="e.g. DREAM BIG" aria-label="Wall lettering" />
              {wall.text && <>
                <label className="flex items-center justify-between text-[12px] text-mt-muted">Colour<input type="color" value={wall.textColor} onChange={(e) => sw({ textColor: e.target.value })} className="h-9 w-12 rounded-md border border-mt-border bg-transparent" /></label>
                {num('Letter height (mm)', wall.textMm, (n) => sw({ textMm: n }), 30, 2000)}
                <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Height on the wall</span><span>{Math.round(wall.textY * 100)}%</span></span><input type="range" min={10} max={90} value={Math.round(wall.textY * 100)} onChange={(e) => sw({ textY: Number(e.target.value) / 100 })} className="mt-1 w-full accent-[#3B82C4]" /></label>
              </>}
            </section>
          </aside>
          <div className="min-w-0 space-y-3">
            <div className="rounded-3xl border border-mt-border bg-mt-surface2/50 p-4">
              <div className="relative mx-auto w-fit max-w-full">
                <img src={svgDataUrl(preview)} alt="Wall preview" className="block max-w-full max-h-[520px] w-auto h-auto" />
                <div className="pointer-events-none absolute inset-0 flex">{strips.map((s, i) => <span key={i} className="h-full border-r border-dashed border-[#EC008C]/70" style={{ width: `${(Math.min(s.widthMm, wall.widthMm - s.x) - (i < strips.length - 1 ? wall.overlapMm : 0)) / wall.widthMm * 100}%` }} />)}</div>
              </div>
              <p className="mt-2 text-[12.5px] text-mt-muted">{strips.length} strip{strips.length === 1 ? '' : 's'} of {wall.rollMm} mm · {((strips.length * wall.heightMm) / 1000).toFixed(2)} m of material · wall {(wall.widthMm * wall.heightMm / 1e6).toFixed(2)} m²</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!!busy} onClick={pdf} className={primary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Print strips · vector PDF</button>
              <button type="button" onClick={() => save(new Blob([preview], { type: 'image/svg+xml' }), `wall-${wall.widthMm}x${wall.heightMm}.svg`)} className={btn}><Download size={14} /> Whole wall · SVG</button>
            </div>
            {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}

            {/* Room & rolls calculator */}
            <section aria-labelledby="rolls-title" className="rounded-3xl border border-mt-border bg-mt-surface p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="rolls-title" className="text-lg font-semibold mr-auto">Room & rolls calculator</h3>
                <label className="text-[12.5px] text-mt-muted inline-flex items-center gap-1.5">Units<select value={unit} onChange={(e) => setUnit(e.target.value as keyof typeof UNITS)} className="h-9 rounded-full border border-mt-border bg-mt-bg px-2 text-[13px]">{Object.keys(UNITS).map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
                <button type="button" onClick={() => setRoom((r) => [...r, { name: `Wall ${r.length + 1}`, widthMm: 3000, heightMm: r[0]?.heightMm || 2400, openings: [] }])} className={btn}>+ Add wall</button>
                <button type="button" onClick={() => setRoom([{ name: 'Pattern wall', widthMm: wall.widthMm, heightMm: wall.heightMm, openings: [] }])} className={btn}>Use the wall above</button>
              </div>
              <div className="space-y-3">
                {room.map((w, i) => (
                  <div key={i} className="rounded-2xl border border-mt-border p-3 space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-[1fr_120px_120px_auto] gap-2 items-end">
                      <label className="block text-[12px] text-mt-muted col-span-2 sm:col-span-1">Name<input value={w.name} onChange={(e) => editWall(i, { name: e.target.value })} className={field} /></label>
                      <label className="block text-[12px] text-mt-muted">Width ({unit})<input type="number" min={0} step="any" value={toU(w.widthMm)} onChange={(e) => editWall(i, { widthMm: fromU(Number(e.target.value) || 0) })} className={field} aria-label={`Wall ${i + 1} width`} /></label>
                      <label className="block text-[12px] text-mt-muted">Height ({unit})<input type="number" min={0} step="any" value={toU(w.heightMm)} onChange={(e) => editWall(i, { heightMm: fromU(Number(e.target.value) || 0) })} className={field} aria-label={`Wall ${i + 1} height`} /></label>
                      <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                        <button type="button" onClick={() => editWall(i, { openings: [...w.openings, { kind: 'door', widthMm: 900, heightMm: 2100 }] })} className={btn}>+ Door</button>
                        <button type="button" onClick={() => editWall(i, { openings: [...w.openings, { kind: 'window', widthMm: 1200, heightMm: 1200 }] })} className={btn}>+ Window</button>
                        {room.length > 1 && <button type="button" onClick={() => setRoom((r) => r.filter((_, k) => k !== i))} aria-label={`Remove ${w.name}`} className="h-10 w-10 grid place-items-center rounded-full border border-mt-border">×</button>}
                      </div>
                    </div>
                    {w.openings.map((o, j) => (
                      <div key={j} className="ml-3 grid grid-cols-[90px_1fr_1fr_auto] gap-2 items-end">
                        <span className="pb-2.5 text-[12.5px] font-semibold capitalize">{o.kind}</span>
                        <label className="block text-[12px] text-mt-muted">Width ({unit})<input type="number" min={0} step="any" value={toU(o.widthMm)} onChange={(e) => editWall(i, { openings: w.openings.map((x, k) => (k === j ? { ...x, widthMm: fromU(Number(e.target.value) || 0) } : x)) })} className={field} /></label>
                        <label className="block text-[12px] text-mt-muted">Height ({unit})<input type="number" min={0} step="any" value={toU(o.heightMm)} onChange={(e) => editWall(i, { openings: w.openings.map((x, k) => (k === j ? { ...x, heightMm: fromU(Number(e.target.value) || 0) } : x)) })} className={field} /></label>
                        <button type="button" onClick={() => editWall(i, { openings: w.openings.filter((_, k) => k !== j) })} aria-label={`Remove ${o.kind}`} className="h-10 w-10 grid place-items-center rounded-full border border-mt-border">×</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <label className="block text-[12px] text-mt-muted">Roll width ({unit})<input type="number" min={1} step="any" value={toU(roll.rollWidthMm)} onChange={(e) => setRoll({ ...roll, rollWidthMm: Math.max(1, fromU(Number(e.target.value) || 0)) })} className={field} aria-label="Roll width" /></label>
                <label className="block text-[12px] text-mt-muted">Roll length ({unit})<input type="number" min={1} step="any" value={toU(roll.rollLengthMm)} onChange={(e) => setRoll({ ...roll, rollLengthMm: Math.max(1, fromU(Number(e.target.value) || 0)) })} className={field} aria-label="Roll length" /></label>
                <label className="block text-[12px] text-mt-muted">Pattern repeat ({unit})<input type="number" min={0} step="any" value={toU(roll.repeatMm)} onChange={(e) => setRoll({ ...roll, repeatMm: fromU(Number(e.target.value) || 0) })} className={field} aria-label="Pattern repeat" /></label>
                <label className="block text-[12px] text-mt-muted">Match<select value={roll.match} onChange={(e) => setRoll({ ...roll, match: e.target.value as RollSpec['match'] })} className={field}><option value="straight">Straight</option><option value="half-drop">Half-drop</option><option value="free">Free match</option></select></label>
                <label className="block text-[12px] text-mt-muted">Trim per drop ({unit})<input type="number" min={0} step="any" value={toU(roll.trimMm)} onChange={(e) => setRoll({ ...roll, trimMm: fromU(Number(e.target.value) || 0) })} className={field} /></label>
                <label className="block text-[12px] text-mt-muted">Extra (%)<input type="number" min={0} max={50} value={roll.extraPct} onChange={(e) => setRoll({ ...roll, extraPct: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })} className={field} /></label>
              </div>
              <div className="rounded-2xl bg-mt-bg p-4" aria-live="polite" aria-label="Roll estimate">
                <p className="text-[15px]"><b className="text-2xl">{est.rollsWithExtra}</b> rolls <span className="text-mt-muted text-[13px]">({est.rolls} + {roll.extraPct}% extra) · {est.drops} drops · {est.dropsPerRoll} drops per roll · {est.netAreaM2.toFixed(2)} m² to cover ({est.areaM2.toFixed(2)} m² of wall)</span></p>
                {est.note && <p className="mt-1 text-[13px] text-rose-600">{est.note}</p>}
                <ul className="mt-2 grid gap-1 text-[12.5px] text-mt-muted sm:grid-cols-2">{est.walls.map((w, i) => <li key={i}>{w.name}: {w.drops} drops of {toU(w.dropMm)} {unit}</li>)}</ul>
                <p className="mt-2 text-[11.5px] text-mt-faint">Estimate for standard hanging: full-height drops per wall; a door or window saves only the drops it fully covers. Check the roll label (width, length, repeat and match) and order from one batch.</p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
