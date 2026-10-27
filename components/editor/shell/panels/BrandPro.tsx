'use client';

// Pro brand tools inside the Brand panel: several brands, colours taken
// from the logo, named colours with shades, brand text styles ("Add
// heading" in the brand's own look), extra logos, a brand check of the
// page with one-tap fix, and brand kit files to share.

import { useRef, useState } from 'react';
import { Check, ChevronDown, Download, Pipette, Plus, ShieldCheck, Trash2, Upload, Wand2, X } from 'lucide-react';
import { BrandKit, BrandTextRole, BrandTextStyle, DEFAULT_TEXT_STYLES } from '@/lib/editor/brandKit';
import { BrandCheck, exportBrandFile, newBrand, paletteFromImage, readBrandFile, shades, shrinkLogo, switchBrand } from '@/lib/editor/brandPro';
import { GOOGLE_FONT_NAMES } from '@/lib/editor/googleFonts';
import { PanelSection } from '../ui';

const ROLES: { id: BrandTextRole; label: string }[] = [
  { id: 'heading', label: 'Heading' },
  { id: 'subheading', label: 'Subheading' },
  { id: 'body', label: 'Body' },
  { id: 'quote', label: 'Quote' },
];
const COLOR_NAMES = ['Primary', 'Secondary', 'Accent', 'Background', 'Text', 'Highlight'];
const small = 'h-8 px-2.5 rounded-lg border border-mt-border text-[12px] text-mt-ink hover:bg-mt-surface2 inline-flex items-center gap-1.5 disabled:opacity-40';

const readFile = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });

export function BrandPro({
  kit,
  onChange,
  onAddStyledText,
  onFillSelection,
  onCheck,
  onFix,
  onPlaceImage,
}: {
  kit: BrandKit;
  onChange: (k: BrandKit) => void;
  onAddStyledText: (role: BrandTextRole, style: BrandTextStyle) => void;
  onFillSelection: (hex: string) => void;
  onCheck: () => BrandCheck;
  onFix: () => void;
  onPlaceImage: (url: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [openRole, setOpenRole] = useState<BrandTextRole | null>(null);
  const [check, setCheck] = useState<BrandCheck | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const styles = { ...DEFAULT_TEXT_STYLES, ...(kit.styles || {}) };
  const others = kit.others || [];

  const fromLogo = async () => {
    if (!kit.logoUrl) return setNote('Upload your logo in the Logo section first.');
    setBusy(true);
    try {
      const colors = await paletteFromImage(kit.logoUrl, 5);
      if (!colors.length) throw new Error();
      onChange({ ...kit, colors, colorNames: COLOR_NAMES.slice(0, colors.length) });
      setNote(`Took ${colors.length} colours from your logo.`);
    } catch {
      setNote('Couldn’t read the colours of this logo.');
    }
    setBusy(false);
  };

  const setStyle = (role: BrandTextRole, patch: Partial<BrandTextStyle>) => onChange({ ...kit, styles: { ...(kit.styles || {}), [role]: { ...styles[role], ...patch } } });

  return (
    <>
      <PanelSection title="Brand">
        <div className="relative">
          <button type="button" onClick={() => setMenu((v) => !v)} className="w-full h-10 rounded-xl border border-mt-border px-3 flex items-center justify-between text-sm font-semibold text-mt-ink">
            <span className="flex items-center gap-2 min-w-0">
              <span className="flex -space-x-1">{kit.colors.slice(0, 4).map((c) => <span key={c} className="w-4 h-4 rounded-full ring-2 ring-mt-surface" style={{ background: c }} />)}</span>
              <span className="truncate">{kit.name || 'My brand'}</span>
            </span>
            <ChevronDown size={15} />
          </button>
          {menu && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-mt-border bg-mt-surface shadow-xl p-1">
              <p className="px-2 pt-1 pb-1 text-[11px] text-mt-muted">Switch brand</p>
              {others.map((o, i) => (
                <div key={i} className="flex items-center">
                  <button type="button" onClick={() => { onChange(switchBrand(kit, i)); setMenu(false); }} className="flex-1 text-left px-2 py-1.5 rounded-lg hover:bg-mt-surface2 text-[13px] flex items-center gap-2">
                    <span className="flex -space-x-1">{o.colors.slice(0, 3).map((c) => <span key={c} className="w-3 h-3 rounded-full ring-1 ring-mt-surface" style={{ background: c }} />)}</span>
                    {o.name}
                  </button>
                  <button type="button" aria-label={`Delete ${o.name}`} onClick={() => window.confirm(`Delete the brand “${o.name}”?`) && onChange({ ...kit, others: others.filter((_, j) => j !== i) })} className="p-1.5 text-mt-faint hover:text-rose-600"><Trash2 size={13} /></button>
                </div>
              ))}
              {!others.length && <p className="px-2 py-1 text-[12px] text-mt-faint">No other brands yet.</p>}
              <div className="border-t border-mt-border mt-1 pt-1 flex flex-col">
                <button type="button" onClick={() => { const n = window.prompt('Name of the new brand', 'New brand'); if (n?.trim()) onChange(newBrand(kit, n.trim())); setMenu(false); }} className="text-left px-2 py-1.5 rounded-lg hover:bg-mt-surface2 text-[13px] inline-flex items-center gap-2"><Plus size={13} /> New brand</button>
                <button type="button" onClick={() => { const n = window.prompt('Rename this brand', kit.name); if (n?.trim()) onChange({ ...kit, name: n.trim() }); setMenu(false); }} className="text-left px-2 py-1.5 rounded-lg hover:bg-mt-surface2 text-[13px]">Rename</button>
                <button type="button" onClick={() => { exportBrandFile(kit); setMenu(false); }} className="text-left px-2 py-1.5 rounded-lg hover:bg-mt-surface2 text-[13px] inline-flex items-center gap-2"><Download size={13} /> Download brand kit file</button>
                <button type="button" onClick={() => { fileRef.current?.click(); setMenu(false); }} className="text-left px-2 py-1.5 rounded-lg hover:bg-mt-surface2 text-[13px] inline-flex items-center gap-2"><Upload size={13} /> Open a brand kit file</button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const k = await readBrandFile(f);
              const { others: o, ...current } = kit;
              onChange({ ...k, others: [...(o || []), current as BrandKit] });
              setNote(`Opened “${k.name}”. Your previous brand is in the brand list.`);
            } catch (err: any) {
              setNote(err?.message || 'That file couldn’t be opened.');
            }
          }} />
        </div>
      </PanelSection>

      <PanelSection title="Brand check">
        <button type="button" onClick={() => setCheck(onCheck())} className={`${small} w-full justify-center h-9`}><ShieldCheck size={14} /> Check this page against my brand</button>
        {check && (
          <div className="mt-2 rounded-xl border border-mt-border p-3 text-[12px]">
            {!check.offColors.length && !check.offFonts.length ? (
              <p className="text-emerald-600 inline-flex items-center gap-1.5"><Check size={14} /> Everything on this page follows your brand.</p>
            ) : (
              <>
                {check.offColors.length > 0 && (
                  <div>
                    <p className="text-mt-ink font-medium">{check.offColors.length} colour{check.offColors.length > 1 ? 's' : ''} not in your brand</p>
                    <div className="mt-1 flex flex-wrap gap-1">{check.offColors.slice(0, 12).map((c) => <span key={c} title={c} className="w-5 h-5 rounded ring-1 ring-black/10" style={{ background: c }} />)}</div>
                  </div>
                )}
                {check.offFonts.length > 0 && <p className="mt-2 text-mt-ink"><span className="font-medium">Other fonts:</span> {check.offFonts.join(', ')}</p>}
                <button type="button" onClick={() => { onFix(); setTimeout(() => setCheck(onCheck()), 400); }} className="mt-2 w-full h-9 rounded-lg bg-mt-primary text-mt-onprimary text-[12px] font-semibold inline-flex items-center justify-center gap-1.5"><Wand2 size={14} /> Fix — apply my brand</button>
              </>
            )}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Colours with names & shades">
        <button type="button" onClick={fromLogo} disabled={busy} className={`${small} mb-2`}><Pipette size={13} /> Take colours from my logo</button>
        {kit.colors.length === 0 && <p className="text-[12px] text-mt-muted">Add brand colours below, or take them from your logo.</p>}
        <div className="flex flex-col gap-2">
          {kit.colors.map((c, i) => (
            <div key={c + i}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onFillSelection(c)} title="Use on the selected item" className="w-7 h-7 rounded-lg ring-1 ring-black/10 shrink-0" style={{ background: c }} />
                <input
                  aria-label={`Name of ${c}`}
                  defaultValue={kit.colorNames?.[i] || COLOR_NAMES[i] || `Colour ${i + 1}`}
                  onBlur={(e) => { const names = [...(kit.colorNames || kit.colors.map((_, j) => COLOR_NAMES[j] || `Colour ${j + 1}`))]; names[i] = e.target.value; onChange({ ...kit, colorNames: names }); }}
                  className="flex-1 min-w-0 h-7 rounded-md border border-transparent hover:border-mt-border bg-transparent px-1.5 text-[12px] text-mt-ink"
                />
                <span className="text-[11px] text-mt-faint font-mono">{c.toUpperCase()}</span>
              </div>
              <div className="mt-1 ml-9 flex gap-1">
                {shades(c).map((s) => <button key={s} type="button" title={`${s} — use on the selected item`} onClick={() => onFillSelection(s)} className="flex-1 h-4 rounded" style={{ background: s }} />)}
              </div>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Brand text styles">
        <div className="flex flex-col gap-1.5">
          {ROLES.map((r) => {
            const st = styles[r.id];
            return (
              <div key={r.id} className="rounded-xl border border-mt-border">
                <div className="flex items-center gap-2 p-2">
                  <button type="button" onClick={() => onAddStyledText(r.id, st)} title={`Add a ${r.label.toLowerCase()} in your brand style`} className="flex-1 min-w-0 text-left truncate" style={{ fontFamily: `"${st.font}"`, fontWeight: st.weight, color: st.color, fontStyle: st.italic ? 'italic' : undefined, textTransform: st.upper ? 'uppercase' : undefined, fontSize: Math.max(12, Math.min(22, st.size / 4)) }}>
                    {r.label}
                  </button>
                  <button type="button" onClick={() => onAddStyledText(r.id, st)} className="h-7 px-2 rounded-lg bg-mt-primary text-mt-onprimary text-[11px] font-semibold">Add</button>
                  <button type="button" onClick={() => setOpenRole(openRole === r.id ? null : r.id)} aria-label={`Edit ${r.label} style`} className="h-7 px-2 rounded-lg border border-mt-border text-[11px]">Edit</button>
                </div>
                {openRole === r.id && (
                  <div className="border-t border-mt-border p-2 grid grid-cols-2 gap-1.5 text-[11px] text-mt-muted">
                    <label className="col-span-2">Font
                      <select value={st.font} onChange={(e) => setStyle(r.id, { font: e.target.value })} className="w-full h-8 rounded-md border border-mt-input-border bg-mt-surface px-1.5 text-[12px] text-mt-ink">
                        {GOOGLE_FONT_NAMES.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                    <label>Weight
                      <select value={st.weight} onChange={(e) => setStyle(r.id, { weight: +e.target.value })} className="w-full h-8 rounded-md border border-mt-input-border bg-mt-surface px-1.5 text-[12px] text-mt-ink">
                        {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </label>
                    <label>Size
                      <input type="number" min={8} max={400} value={st.size} onChange={(e) => setStyle(r.id, { size: Math.max(8, +e.target.value || 8) })} className="w-full h-8 rounded-md border border-mt-input-border bg-mt-surface px-1.5 text-[12px] text-mt-ink" />
                    </label>
                    <label className="flex items-center gap-1.5">Colour
                      <input type="color" value={st.color} onChange={(e) => setStyle(r.id, { color: e.target.value })} className="w-7 h-7 rounded border border-mt-border" />
                    </label>
                    <div className="flex flex-wrap gap-1">{kit.colors.slice(0, 5).map((c) => <button key={c} type="button" onClick={() => setStyle(r.id, { color: c })} className="w-5 h-5 rounded ring-1 ring-black/10" style={{ background: c }} />)}</div>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!st.upper} onChange={(e) => setStyle(r.id, { upper: e.target.checked })} /> CAPITALS</label>
                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!st.italic} onChange={(e) => setStyle(r.id, { italic: e.target.checked })} /> Italic</label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="More logos">
        <p className="text-[11px] text-mt-muted mb-2">Keep a light version, an icon or a stamp next to your main logo.</p>
        <div className="grid grid-cols-3 gap-2">
          {(kit.logos || []).map((l, i) => (
            <div key={i} className="relative group">
              <button type="button" onClick={() => onPlaceImage(l.url)} title={`Add “${l.name}” to the page`} className="w-full aspect-square rounded-xl ring-1 ring-mt-border bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:10px_10px] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.url} alt={l.name} className="w-full h-full object-contain" />
              </button>
              <span className="block text-[10px] text-mt-muted truncate text-center">{l.name}</span>
              <button type="button" aria-label={`Remove ${l.name}`} onClick={() => onChange({ ...kit, logos: (kit.logos || []).filter((_, j) => j !== i) })} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-mt-surface border border-mt-border text-mt-muted opacity-0 group-hover:opacity-100 flex items-center justify-center"><X size={11} /></button>
            </div>
          ))}
          <button type="button" onClick={() => logoRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-mt-border text-mt-muted hover:text-mt-ink flex flex-col items-center justify-center text-[11px] gap-1"><Plus size={16} /> Add</button>
        </div>
        <input ref={logoRef} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const url = await shrinkLogo(await readFile(f));
          const name = window.prompt('Name for this logo (e.g. White logo, Icon)', f.name.replace(/\.[^.]+$/, '')) || 'Logo';
          onChange({ ...kit, logos: [...(kit.logos || []), { name, url }] });
        }} />
      </PanelSection>
      {note && <p className="-mt-2 mb-4 text-[12px] text-mt-muted" role="status">{note}</p>}
    </>
  );
}
