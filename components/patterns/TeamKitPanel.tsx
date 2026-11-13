'use client';

// Team kits — design one jersey (colours, pattern, logos, font, where the
// name and number go), add the players (type them or import a CSV), check
// the list, preview any player front and back, and download a print-ready
// vector file per player (SVG or vector PDF) or everyone at once (ZIP).
// The master design never changes; names and numbers come from the rows.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileArchive, FileUp, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { PatternSettings } from '@/lib/patterns';
import { SIZES, ROLLS } from '@/lib/garments';
import { DEFAULT_KIT, Glyphs, KIT_STYLES, KitDesign, Player, checkRoster, glyphTexts, kitPreviewSvg, parseRoster, playerPrintSvg, safeFile, sizeId } from '@/lib/teamKit';
import { PATTERN_FONTS, textOutline } from '@/lib/patternText';
import { svgDataUrl } from '@/lib/patterns';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';

const KEY = 'mt:team-kit';
const SAMPLE: Player[] = [{ name: 'Arun', number: '07', size: 'S' }, { name: 'Kumar', number: '10', size: 'M' }, { name: 'David', number: '11', size: 'L' }, { name: 'John', number: '23', size: 'XL' }];

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

export function TeamKitPanel({ pattern }: { pattern: PatternSettings }) {
  const [kit, setKit] = useState<KitDesign>(DEFAULT_KIT);
  const [players, setPlayers] = useState<Player[]>(SAMPLE);
  const [sel, setSel] = useState(0);
  const [glyphs, setGlyphs] = useState<Glyphs>({});
  const [making, setMaking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const [rollW, setRollW] = useState(1600);
  const [bleed, setBleed] = useState(10);
  const csvRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const cache = useRef(new Map<string, string | null>());
  const set = (o: Partial<KitDesign>) => setKit((k) => ({ ...k, ...o }));

  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v?.kit) { setKit({ ...DEFAULT_KIT, ...v.kit }); if (Array.isArray(v.players)) setPlayers(v.players); } } catch { /* ignore */ } }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ kit: { ...kit, teamLogo: null, sponsorLogo: null }, players })); } catch { /* ignore */ } }, [kit, players]);

  // Letter outlines for every name and number, in the chosen font.
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

  const issues = useMemo(() => checkRoster(players), [players]);
  const errors = issues.filter((i) => i.level === 'error');
  const player = players[Math.min(sel, players.length - 1)] || null;
  const preview = useMemo(() => kitPreviewSvg(kit, pattern, player, glyphs), [kit, pattern, player, glyphs]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 6000); };
  const ready = !making && texts.every((s) => glyphs[s]);

  const fileFor = (p: Player) => playerPrintSvg(kit, pattern, p, glyphs, { rollW, bleed, cutLines: true });
  const base = (p: Player, i: number) => `${String(i + 1).padStart(2, '0')}-${safeFile(p.name)}-${p.number}-${(SIZES.find((s) => s.id === sizeId(p.size))?.label || p.size).replace(/ .*/, '')}`;
  const okPlayer = (i: number) => !errors.some((e) => e.row === i + 1);

  const dlSvg = (i: number) => { const f = fileFor(players[i]); save(new Blob([f.svg], { type: 'image/svg+xml' }), `${base(players[i], i)}.svg`); };
  const dlPdf = async (i: number) => {
    setBusy(`pdf-${i}`);
    try {
      const { svgToPdfBlob } = await import('@/lib/svgToPdf');
      const f = fileFor(players[i]);
      save(await svgToPdfBlob(f.svg, f.width, f.height), `${base(players[i], i)}.pdf`);
    } catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };
  const dlZip = async () => {
    if (errors.length) { flash('Fix the rows marked in red first.'); return; }
    setBusy('zip');
    try {
      const [{ svgToPdfBlob }, { buildZip }] = await Promise.all([import('@/lib/svgToPdf'), import('@/lib/editor/zip')]);
      const parts: { name: string; data: Uint8Array }[] = [];
      const enc = new TextEncoder();
      for (let i = 0; i < players.length; i++) {
        const f = fileFor(players[i]);
        parts.push({ name: `SVG/${base(players[i], i)}.svg`, data: enc.encode(f.svg) });
        parts.push({ name: `PDF/${base(players[i], i)}.pdf`, data: new Uint8Array(await (await svgToPdfBlob(f.svg, f.width, f.height)).arrayBuffer()) });
      }
      const csv = 'Row,Name,Number,Size\n' + players.map((p, i) => `${i + 1},"${p.name.replace(/"/g, '""')}",${p.number},${p.size}`).join('\n');
      parts.push({ name: 'roster.csv', data: enc.encode(csv) });
      parts.push({ name: 'preview-master.svg', data: enc.encode(kitPreviewSvg(kit, pattern, null, glyphs)) });
      save(buildZip(parts), `${safeFile(kit.teamName)}-kits-${players.length}.zip`);
      flash(`ZIP ready: ${players.length} players, SVG and vector PDF each.`);
    } catch { flash('The ZIP could not be made in this browser.'); }
    setBusy(null);
  };

  // The master (no player) opens in the main editor as vector shapes for
  // artwork changes; names and numbers keep coming from the player list here.
  const editMaster = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { router.push('/login?next=' + encodeURIComponent('/patterns?tab=kits')); return; }
    setBusy('editor');
    try {
      const svg = kitPreviewSvg(kit, pattern, player, glyphs);
      const F: any = (await import('fabric')).fabric;
      const objs: any[] = await new Promise((res) => F.loadSVGFromString(svg, (o: any[]) => res(o || [])));
      const W = 1300, H = 1100;
      const group = new F.Group(objs, { name: `${kit.teamName} kit` });
      const k = Math.min((W - 80) / group.width, (H - 80) / group.height);
      group.set({ originX: 'center', originY: 'center', left: W / 2, top: H / 2, scaleX: k, scaleY: k });
      const canvas = { version: '5.1.0', background: '#ffffff', objects: [group.toObject(['name'])] };
      const key = newLocalKey();
      putHandoff(key, { opened: { document: { name: `${kit.teamName} kit`, width: W, height: H, editor: 'design' }, canvas, fonts: [], thumbnail: svgDataUrl(svg), template: null, missingAssets: [] } as any, file: { handle: null, fileName: `${safeFile(kit.teamName)} kit.mtd.svg` } });
      router.push(editorUrlForLocal(key, W, H));
    } catch { flash('Could not open the editor. Please try again.'); setBusy(null); }
  };

  const importText = (t: string) => {
    const rows = parseRoster(t).filter((r) => r.name || r.number);
    if (!rows.length) { flash('No rows found. Use one player per line: name, number, size.'); return; }
    setPlayers(rows); setSel(0); setPaste(null);
    flash(`${rows.length} players imported.`);
  };
  const editRow = (i: number, o: Partial<Player>) => setPlayers((ps) => ps.map((p, k) => (k === i ? { ...p, ...o } : p)));

  const field = 'mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px]';
  const btn = 'h-9 px-3 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50';
  const colour = (label: string, v: string, k: keyof KitDesign) => (
    <label className="text-[12px] text-mt-muted flex items-center justify-between gap-2">{label}<input type="color" value={v} onChange={(e) => set({ [k]: e.target.value } as any)} className="h-8 w-10 rounded-md border border-mt-border bg-transparent" /></label>
  );
  const slider = (label: string, v: number, min: number, max: number, step: number, k: keyof KitDesign, unit = 'mm') => (
    <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>{label}</span><span className="text-mt-ink tabular-nums">{v}{unit}</span></span><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set({ [k]: Number(e.target.value) } as any)} className="mt-1 w-full accent-[#3B82C4]" /></label>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">1 · Kit</h3>
          <div className="flex flex-wrap gap-1.5">{KIT_STYLES.map((s) => <button key={s.id} type="button" aria-pressed={kit.style === s.id} onClick={() => set({ style: s.id })} className={`h-8 px-2.5 rounded-full border text-[12.5px] font-medium ${kit.style === s.id ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{s.label}</button>)}</div>
          <label className="block text-[12px] text-mt-muted">Team name<input value={kit.teamName} maxLength={40} onChange={(e) => set({ teamName: e.target.value })} className={field} /></label>
          <div className="grid grid-cols-3 gap-2">{colour('Body', kit.body, 'body')}{colour('Sleeves', kit.sleeve, 'sleeve')}{colour('Collar', kit.collar, 'collar')}</div>
        </section>
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">2 · Pattern</h3>
          <select value={kit.patternOn} onChange={(e) => set({ patternOn: e.target.value as KitDesign['patternOn'] })} className={field} aria-label="Where the pattern goes"><option value="none">No pattern</option><option value="body">Pattern on the body</option><option value="sleeves">Pattern on the sleeves</option><option value="all">Pattern everywhere</option></select>
          {kit.patternOn !== 'none' && <>
            <label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Pattern strength</span><span className="text-mt-ink tabular-nums">{Math.round(kit.patternOpacity * 100)}%</span></span><input type="range" min={5} max={100} step={5} value={Math.round(kit.patternOpacity * 100)} onChange={(e) => set({ patternOpacity: Number(e.target.value) / 100 })} className="mt-1 w-full accent-[#3B82C4]" /></label>
            {slider('Pattern repeat', kit.repeatMm, 20, 300, 5, 'repeatMm')}</>}
          <p className="text-[11.5px] text-mt-muted">Uses the pattern from the Patterns tab — change motif and colours there.</p>
        </section>
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">3 · Logos</h3>
          {(['teamLogo', 'sponsorLogo'] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <label className={`${btn} cursor-pointer flex-1 justify-center`}><Upload size={14} /> {kit[k] ? 'Change' : 'Add'} {k === 'teamLogo' ? 'team logo' : 'sponsor logo'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) set({ [k]: await readLogo(f) } as any); }} /></label>
              {kit[k] && <button type="button" onClick={() => set({ [k]: null } as any)} aria-label="Remove logo" className="h-9 w-9 grid place-items-center rounded-full border border-mt-border"><X size={14} /></button>}
            </div>
          ))}
        </section>
        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">4 · Names & numbers</h3>
          <label className="block text-[12px] text-mt-muted">Font
            <select value={kit.font} onChange={(e) => { const f = PATTERN_FONTS.find((x) => x.family === e.target.value); set({ font: e.target.value, fontWeight: f && !f.weights.includes(kit.fontWeight) ? f.weights[f.weights.length - 1] : kit.fontWeight }); }} className={field}>
              {[...new Set(PATTERN_FONTS.map((f) => f.category))].map((c) => <optgroup key={c} label={c}>{PATTERN_FONTS.filter((f) => f.category === c).map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}</optgroup>)}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">{colour('Name', kit.nameColor, 'nameColor')}{colour('Number', kit.numberColor, 'numberColor')}{colour('Outline', kit.outlineColor, 'outlineColor')}</div>
          {slider('Outline', kit.outlineMm, 0, 6, 0.5, 'outlineMm')}
          {slider('Name height', kit.nameMm, 25, 90, 1, 'nameMm')}
          {slider('Name from top', kit.nameTopMm, 40, 200, 1, 'nameTopMm')}
          {slider('Number height', kit.numberMm, 120, 320, 5, 'numberMm')}
          {slider('Number from top', kit.numberTopMm, 120, 360, 1, 'numberTopMm')}
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={kit.frontNumber} onChange={(e) => set({ frontNumber: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Small number on the front</label>
          <p className="text-[11.5px] text-mt-muted">{making ? 'Making letter outlines…' : ready ? 'Names and numbers are vector outlines.' : 'Outlines pending.'}</p>
        </section>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="rounded-3xl border border-mt-border bg-mt-surface2/60 p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[13px] font-semibold mr-auto">{player ? `${player.name || '—'} · #${player.number || '—'} · ${player.size || '—'}` : 'Master design'}</span>
            <button type="button" onClick={editMaster} disabled={!!busy} className={btn} title="Open this design in the main editor for artwork changes">{busy === 'editor' ? <Loader2 size={14} className="animate-spin" /> : null} Open in editor</button>
            {player && <><button type="button" onClick={() => dlSvg(sel)} disabled={!okPlayer(sel)} className={btn}><Download size={14} /> SVG</button><button type="button" onClick={() => dlPdf(sel)} disabled={!okPlayer(sel) || !!busy} className={btn}>{busy === `pdf-${sel}` ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Vector PDF</button></>}
          </div>
          <img src={svgDataUrl(preview)} alt="Front and back preview" className="w-full max-h-[560px] object-contain" />
        </div>

        <section className="rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold mr-auto">Players ({players.length})</h3>
            <button type="button" onClick={() => setPaste(players.map((p) => `${p.name}, ${p.number}, ${p.size}`).join('\n'))} className={btn}>Paste list</button>
            <button type="button" onClick={() => csvRef.current?.click()} className={btn}><FileUp size={14} /> Import CSV</button>
            <input ref={csvRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importText(await f.text()); }} />
            <button type="button" onClick={() => { setPlayers((p) => [...p, { name: '', number: '', size: 'M' }]); setSel(players.length); }} className={btn}><Plus size={14} /> Add player</button>
          </div>
          {paste !== null && (
            <div className="rounded-2xl bg-mt-bg p-3 space-y-2">
              <p className="text-[12px] text-mt-muted">One player per line: <b>name, number, size</b> (a header row like “Player name, Back number, Size” is fine).</p>
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="w-full rounded-lg border border-mt-border bg-mt-surface p-2 text-[13px] font-mono" aria-label="Player list" />
              <div className="flex gap-2"><button type="button" onClick={() => importText(paste)} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Use this list</button><button type="button" onClick={() => setPaste(null)} className={btn}>Cancel</button></div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-mt-muted"><th className="p-1.5 w-10">#</th><th className="p-1.5">Player name</th><th className="p-1.5 w-24">Number</th><th className="p-1.5 w-32">Size</th><th className="p-1.5 w-40"></th></tr></thead>
              <tbody>
                {players.map((p, i) => {
                  const bad = issues.filter((x) => x.row === i + 1);
                  return (
                    <tr key={i} onClick={() => setSel(i)} className={`border-t border-mt-border cursor-pointer ${sel === i ? 'bg-mt-surface2' : ''}`}>
                      <td className="p-1.5 tabular-nums text-mt-muted">{i + 1}</td>
                      <td className="p-1.5"><input value={p.name} maxLength={20} onChange={(e) => editRow(i, { name: e.target.value })} className={`${field} mt-0 ${bad.some((b) => /Name/.test(b.message)) ? 'border-rose-500' : ''}`} aria-label={`Name row ${i + 1}`} /></td>
                      <td className="p-1.5"><input value={p.number} inputMode="numeric" maxLength={3} onChange={(e) => editRow(i, { number: e.target.value.replace(/\D/g, '') })} className={`${field} mt-0 ${bad.some((b) => /Number/.test(b.message) && b.level === 'error') ? 'border-rose-500' : ''}`} aria-label={`Number row ${i + 1}`} /></td>
                      <td className="p-1.5"><select value={sizeId(p.size) ? SIZES.find((s) => s.id === sizeId(p.size))!.label.replace(/ .*/, '') : p.size} onChange={(e) => editRow(i, { size: e.target.value })} className={`${field} mt-0 ${bad.some((b) => /Size/.test(b.message)) ? 'border-rose-500' : ''}`} aria-label={`Size row ${i + 1}`}>{!sizeId(p.size) && <option value={p.size}>{p.size || 'Choose'}</option>}{SIZES.map((s) => <option key={s.id} value={s.label.replace(/ .*/, '')}>{s.label}</option>)}</select></td>
                      <td className="p-1.5 whitespace-nowrap text-right">
                        <button type="button" onClick={(e) => { e.stopPropagation(); dlSvg(i); }} disabled={!okPlayer(i)} className="text-[12px] font-semibold underline underline-offset-2 disabled:opacity-40 mr-2">SVG</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); dlPdf(i); }} disabled={!okPlayer(i) || !!busy} className="text-[12px] font-semibold underline underline-offset-2 disabled:opacity-40 mr-2">PDF</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setPlayers((ps) => ps.filter((_, k) => k !== i)); setSel(0); }} aria-label={`Remove row ${i + 1}`} className="inline-grid h-7 w-7 place-items-center rounded-full hover:bg-mt-bg align-middle"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {issues.length ? (
            <ul className="rounded-2xl bg-mt-bg p-3 space-y-1 text-[12.5px]" aria-label="Problems in the list">
              {issues.slice(0, 12).map((x, k) => <li key={k} className={`flex items-start gap-1.5 ${x.level === 'error' ? 'text-rose-600' : 'text-amber-700 dark:text-amber-400'}`}><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Row {x.row}: {x.message}</li>)}
              {issues.length > 12 && <li className="text-mt-muted">…and {issues.length - 12} more</li>}
            </ul>
          ) : <p className="text-[12.5px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Every row has a name, number and size.</p>}
          <div className="flex flex-wrap items-end gap-3 border-t border-mt-border pt-3">
            <label className="text-[12px] text-mt-muted">Roll width<select value={rollW} onChange={(e) => setRollW(Number(e.target.value))} className={`${field} w-40`}>{ROLLS.map((r) => <option key={r} value={r}>{r} mm</option>)}</select></label>
            <label className="text-[12px] text-mt-muted">Bleed (mm)<input type="number" min={0} max={30} value={bleed} onChange={(e) => setBleed(Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className={`${field} w-24`} /></label>
            <button type="button" onClick={dlZip} disabled={!!busy || !players.length || !ready} className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">{busy === 'zip' ? <Loader2 size={15} className="animate-spin" /> : <FileArchive size={15} />} Download all ({players.length}) as ZIP</button>
          </div>
          <p className="text-[11.5px] text-mt-faint">Each file has every piece of that player’s size at real size with bleed and magenta cut lines. Piece shapes are standard blocks — check against your own patterns before a full run.</p>
          {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}
        </section>
      </div>
    </div>
  );
}
