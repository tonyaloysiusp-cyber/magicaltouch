'use client';

// Wall & vehicle graphics. Walls: any size, the current pattern plus
// optional lettering, split into numbered print strips for the roll width.
// Vehicles: generic body templates by category (clearly labelled — not
// model-specific), with colours, stripes, pattern, lettering and logo,
// laid out as left, right, front and rear views.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, Loader2, Upload, X } from 'lucide-react';
import { PatternSettings, svgDataUrl } from '@/lib/patterns';
import { DEFAULT_VEHICLE, DEFAULT_WALL, GENERIC_NOTE, VEHICLES, VehicleJob, WALL_ROLLS, WallJob, vehicleSheetSvg, wallStrips, wallSvg } from '@/lib/surfaces';
import { textOutline } from '@/lib/patternText';

function save(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design';

function useOutline(text: string, family = 'Montserrat', weight = 800) {
  const [d, setD] = useState<string | null>(null);
  useEffect(() => {
    let live = true; setD(null);
    if (!text.trim()) return;
    const t = setTimeout(() => { textOutline(text.slice(0, 12), { family, weight, italic: false }).then((x) => live && setD(x)).catch(() => {}); }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [text, family, weight]);
  return d;
}

export function SurfacesPanel({ pattern }: { pattern: PatternSettings }) {
  const [mode, setMode] = useState<'wall' | 'vehicle'>('wall');
  const [wall, setWall] = useState<WallJob>(DEFAULT_WALL);
  const [veh, setVeh] = useState<VehicleJob>(DEFAULT_VEHICLE);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const wallGlyph = useOutline(wall.text);
  const vehGlyph = useOutline(veh.text);
  const sw = (o: Partial<WallJob>) => setWall((w) => ({ ...w, ...o }));
  const sv = (o: Partial<VehicleJob>) => setVeh((v) => ({ ...v, ...o }));
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 6000); };

  const wallPreview = useMemo(() => wallSvg(wall, pattern, wallGlyph), [wall, pattern, wallGlyph]);
  const strips = useMemo(() => wallStrips(wall, pattern, wallGlyph), [wall, pattern, wallGlyph]);
  const sheet = useMemo(() => vehicleSheetSvg(veh, pattern, vehGlyph), [veh, pattern, vehGlyph]);

  const pdf = async (pages: { svg: string; widthMm: number; heightMm: number }[], name: string) => {
    setBusy(name);
    try { const { svgToPdfBlob } = await import('@/lib/svgToPdf'); save(await svgToPdfBlob('', 0, 0, pages), name); }
    catch { flash('The PDF could not be made in this browser.'); }
    setBusy(null);
  };
  const field = 'mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px]';
  const btn = 'h-9 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50';
  const num = (label: string, v: number, on: (n: number) => void, min: number, max: number) => <label className="text-[12px] text-mt-muted">{label}<input type="number" min={min} max={max} value={v} onChange={(e) => on(Math.max(min, Math.min(max, Number(e.target.value) || min)))} className={field} /></label>;
  const col = (label: string, v: string, on: (c: string) => void) => <label className="text-[12px] text-mt-muted flex items-center justify-between gap-2">{label}<input type="color" value={v} onChange={(e) => on(e.target.value)} className="h-8 w-10 rounded-md border border-mt-border bg-transparent" /></label>;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">{(['wall', 'vehicle'] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`h-9 px-4 rounded-full border text-[13px] font-semibold ${mode === m ? 'border-mt-ink bg-mt-ink text-mt-bg' : 'border-mt-border'}`}>{m === 'wall' ? 'Wall stickers & wallpaper' : 'Vehicle graphics'}</button>)}</div>

      {mode === 'wall' ? (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">{num('Wall width (mm)', wall.widthMm, (n) => sw({ widthMm: n }), 200, 20000)}{num('Wall height (mm)', wall.heightMm, (n) => sw({ heightMm: n }), 200, 6000)}</div>
            <label className="block text-[12px] text-mt-muted">Material roll<select value={wall.rollMm} onChange={(e) => sw({ rollMm: Number(e.target.value) })} className={field}>{WALL_ROLLS.map((r) => <option key={r.mm} value={r.mm}>{r.label}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2">{num('Overlap (mm)', wall.overlapMm, (n) => sw({ overlapMm: n }), 0, 50)}{num('Pattern repeat (mm)', wall.repeatMm, (n) => sw({ repeatMm: n }), 20, 2000)}</div>
            {col('Background', wall.background, (c) => sw({ background: c }))}
            <label className="block text-[12px] text-mt-muted">Lettering (optional, up to 12 letters)<input value={wall.text} maxLength={12} onChange={(e) => sw({ text: e.target.value })} className={field} placeholder="e.g. DREAM BIG" /></label>
            {wall.text && <>{col('Lettering colour', wall.textColor, (c) => sw({ textColor: c }))}{num('Letter height (mm)', wall.textMm, (n) => sw({ textMm: n }), 30, 2000)}<label className="block"><span className="flex justify-between text-[12px] text-mt-muted"><span>Lettering position</span><span>{Math.round(wall.textY * 100)}%</span></span><input type="range" min={10} max={90} value={Math.round(wall.textY * 100)} onChange={(e) => sw({ textY: Number(e.target.value) / 100 })} className="mt-1 w-full accent-[#3B82C4]" /></label></>}
            <p className="text-[11.5px] text-mt-muted">Uses the pattern from the Pattern design tab.</p>
          </aside>
          <div className="min-w-0 space-y-3">
            <div className="rounded-3xl border border-mt-border bg-mt-surface2/60 p-4">
              <div className="relative">
                <img src={svgDataUrl(wallPreview)} alt="Wall preview" className="w-full max-h-[460px] object-contain" />
                <div className="pointer-events-none absolute inset-0 flex">{strips.map((s, i) => <span key={i} className="h-full border-r border-dashed border-[#EC008C]/70" style={{ width: `${(Math.min(s.widthMm, wall.widthMm - s.x) - (i < strips.length - 1 ? wall.overlapMm : 0)) / wall.widthMm * 100}%` }} />)}</div>
              </div>
              <p className="mt-2 text-[12.5px] text-mt-muted">{strips.length} strip{strips.length === 1 ? '' : 's'} of {wall.rollMm} mm · total {((strips.length * wall.heightMm) / 1000).toFixed(2)} m of material · wall {(wall.widthMm * wall.heightMm / 1e6).toFixed(2)} m²</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => save(new Blob([wallPreview], { type: 'image/svg+xml' }), `wall-${wall.widthMm}x${wall.heightMm}.svg`)} className={btn}><Download size={14} /> Whole wall · SVG</button>
              <button type="button" disabled={!!busy} onClick={() => pdf(strips, `wall-strips-${strips.length}.pdf`)} className={btn}>{busy?.startsWith('wall-strips') ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Print strips · vector PDF</button>
              {strips.map((s, i) => <button key={i} type="button" onClick={() => save(new Blob([s.svg], { type: 'image/svg+xml' }), `wall-strip-${i + 1}-of-${strips.length}.svg`)} className="text-[12.5px] font-semibold underline underline-offset-2">Strip {i + 1} SVG</button>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-3">
            <label className="block text-[12px] text-mt-muted">Vehicle type<select value={veh.vehicle} onChange={(e) => sv({ vehicle: e.target.value })} className={field}>{VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[12px] text-mt-muted">Make<input value={veh.maker} maxLength={20} onChange={(e) => sv({ maker: e.target.value })} className={field} placeholder="Toyota" /></label>
              <label className="text-[12px] text-mt-muted">Model<input value={veh.model} maxLength={20} onChange={(e) => sv({ model: e.target.value })} className={field} placeholder="Hiace" /></label>
              <label className="text-[12px] text-mt-muted">Year<input value={veh.year} maxLength={4} inputMode="numeric" onChange={(e) => sv({ year: e.target.value.replace(/\D/g, '') })} className={field} /></label>
            </div>
            <p className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[12px] text-amber-800 dark:text-amber-300 flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> Model-specific wrap templates are not available yet. Make and model are noted on the file; the shape is a generic {VEHICLES.find((v) => v.id === veh.vehicle)?.label.replace(/ \(generic\)/, '').toLowerCase()}.</p>
            <div className="grid grid-cols-2 gap-2">{col('Body', veh.body, (c) => sv({ body: c }))}{col('Windows', veh.windowTint, (c) => sv({ windowTint: c }))}</div>
            <label className="block text-[12px] text-mt-muted">Stripes<select value={veh.stripe} onChange={(e) => sv({ stripe: e.target.value as VehicleJob['stripe'] })} className={field}><option value="none">None</option><option value="swoosh">Swoosh</option><option value="racing">Racing stripes</option><option value="side">Side band</option></select></label>
            {veh.stripe !== 'none' && col('Stripe colour', veh.stripeColor, (c) => sv({ stripeColor: c }))}
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={veh.patternLower} onChange={(e) => sv({ patternLower: e.target.checked })} className="h-4 w-4 accent-[#3B82C4]" /> Pattern on the lower panels</label>
            <label className="block text-[12px] text-mt-muted">Company name (up to 12 letters)<input value={veh.text} maxLength={12} onChange={(e) => sv({ text: e.target.value })} className={field} /></label>
            {col('Lettering colour', veh.textColor, (c) => sv({ textColor: c }))}
            <div className="flex gap-2">
              <button type="button" onClick={() => logoRef.current?.click()} className={`${btn} flex-1 justify-center`}><Upload size={14} /> {veh.logo ? 'Change logo' : 'Add logo'}</button>
              {veh.logo && <button type="button" onClick={() => sv({ logo: null })} aria-label="Remove logo" className="h-9 w-9 grid place-items-center rounded-full border border-mt-border"><X size={14} /></button>}
              <input ref={logoRef} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; const r = new FileReader(); r.onload = () => sv({ logo: String(r.result) }); r.readAsDataURL(f); }} />
            </div>
          </aside>
          <div className="min-w-0 space-y-3">
            <div className="rounded-3xl border border-mt-border bg-white p-4"><img src={svgDataUrl(sheet.svg)} alt="Vehicle layout: left, right, front and rear" className="w-full" /></div>
            <p className="text-[12px] text-mt-muted">{GENERIC_NOTE} Sizes shown are typical for the category ({sheet.template.lengthMm} × {sheet.template.heightMm} mm).</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => save(new Blob([sheet.svg], { type: 'image/svg+xml' }), `vehicle-${veh.vehicle}-${slug(veh.text)}.svg`)} className={btn}><Download size={14} /> Layout · SVG</button>
              <button type="button" disabled={!!busy} onClick={() => pdf([{ svg: sheet.svg, widthMm: sheet.widthMm, heightMm: sheet.heightMm }], `vehicle-${veh.vehicle}-${slug(veh.text)}.pdf`)} className={btn}>{busy?.startsWith('vehicle') ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Layout · vector PDF (1:1)</button>
            </div>
          </div>
        </div>
      )}
      {msg && <p role="status" className="text-[13px] font-medium">{msg}</p>}
    </div>
  );
}
