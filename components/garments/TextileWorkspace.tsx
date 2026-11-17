'use client';

// Textile Design Studio — the one textile workspace. Team kits and everyday
// garments (round / V-neck jerseys, polos, T-shirts with names, numbers,
// sizes and rosters) and made-to-measure garments, fabric and embroidery
// (kurta / kameez, chudidar, dupatta / stole, fabric panels) share one vector
// engine (the print studio), one project file format (.mtd), one print
// pipeline and one embroidery workspace. Simple mode shows the essentials;
// Professional mode shows every production control. Switching mode never
// changes the artwork. Workspace settings are separate from projects:
// resetting them never deletes a design.

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { GarmentDesigner } from './GarmentDesigner';
import { TextileStudio } from './TextileStudio';
import type { GarmentType } from '@/lib/textile/draft';
import { peekToolHandoffKind } from '@/lib/mtd/toolProject';

type Family = 'team' | 'made';
type TeamPick = 'jersey' | 'jersey-v' | 'polo' | 'tshirt';
type Product = { id: TeamPick | GarmentType; label: string; hint: string; family: Family };

const PRODUCTS: Product[] = [
  { id: 'jersey', label: 'Jersey · round neck', hint: 'Football, cricket, basketball', family: 'team' },
  { id: 'jersey-v', label: 'Jersey · V-neck', hint: 'Names, numbers, rosters', family: 'team' },
  { id: 'polo', label: 'Polo', hint: 'Polo T-shirt: collar and placket', family: 'team' },
  { id: 'tshirt', label: 'T-shirt', hint: 'Round or V-neck', family: 'team' },
  { id: 'kurta', label: 'Kurta / kameez', hint: 'From your measurements', family: 'made' },
  { id: 'chudidar', label: 'Chudidar', hint: 'From your measurements', family: 'made' },
  { id: 'tee', label: 'T-shirt / polo · to measure', hint: 'Your measurements or size chart', family: 'made' },
  { id: 'dupatta', label: 'Dupatta / stole', hint: 'Any width, length and border', family: 'made' },
  { id: 'fabric', label: 'Fabric panel', hint: 'Running fabric, borders, custom products', family: 'made' },
];

export interface WorkspaceSettings { mode: 'simple' | 'pro'; product: Product['id']; units: 'mm' | 'cm' | 'in' }
export const DEFAULT_WORKSPACE: WorkspaceSettings = { mode: 'pro', product: 'jersey', units: 'cm' };
const KEY = 'mt:textile-workspace';

export function loadWorkspace(): WorkspaceSettings {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return { ...DEFAULT_WORKSPACE, ...v }; } catch { /* ignore */ }
  return DEFAULT_WORKSPACE;
}

export function TextileWorkspace({ initial }: { initial?: Product['id'] }) {
  const [ws, setWs] = useState<WorkspaceSettings>({ ...DEFAULT_WORKSPACE, ...(initial ? { product: initial } : {}) });
  const [ready, setReady] = useState(false);
  const [n, setN] = useState(1);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [openReq, setOpenReq] = useState<{ file: File; n: number } | null>(null);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote((x) => (x === m ? null : x)), 4500); };

  // Settings and the product last used come from this device; ?product= and a project waiting to open win.
  useEffect(() => {
    const saved = loadWorkspace();
    let product = saved.product;
    try {
      const sp = new URLSearchParams(location.search); const q = (sp.get('product') || sp.get('garment')) as Product['id'] | null;
      if (q && PRODUCTS.some((p) => p.id === q)) product = q;
      const waiting = peekToolHandoffKind();
      if (waiting === 'textile') product = PRODUCTS.find((p) => p.id === saved.product && p.family === 'made')?.id || 'kurta';
      else if (waiting === 'jersey' || waiting === 'polo' || waiting === 'tshirt') product = waiting;
    } catch { /* ignore */ }
    if (initial) product = initial;
    setWs({ ...saved, product });
    setReady(true);
  }, [initial]);
  // The mode and product are remembered as you work (Save workspace settings also stores them on purpose).
  useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify(ws)); } catch { /* ignore */ } } }, [ws, ready]);

  const prod = PRODUCTS.find((p) => p.id === ws.product) || PRODUCTS[0];
  const choose = (id: Product['id']) => { setOpenReq(null); setWs((w) => ({ ...w, product: id })); setN((x) => x + 1); };
  const foreign = (fam: Family) => (f: File) => {
    // A project from the other half of the studio: switch to it and open it there.
    setWs((w) => ({ ...w, product: fam === 'made' ? 'kurta' : 'jersey' }));
    setOpenReq({ file: f, n: Date.now() });
  };

  const teamPick = prod.family === 'team' ? { kind: (prod.id === 'jersey-v' ? 'jersey' : prod.id) as 'jersey' | 'polo' | 'tshirt', neck: prod.id === 'jersey-v' ? 'v' as const : prod.id === 'jersey' ? 'round' as const : undefined, n } : undefined;
  const madePick = prod.family === 'made' ? { type: prod.id as GarmentType, n } : undefined;

  const resetSettings = () => {
    setWs({ ...DEFAULT_WORKSPACE, product: ws.product });
    try { localStorage.removeItem(KEY); localStorage.removeItem('mt:textile-panels'); } catch { /* ignore */ }
    setMenu(false);
    flash('Workspace settings back to the defaults. Your designs and saved projects are unchanged.');
  };

  const chip = (on: boolean) => `h-9 px-3.5 rounded-full text-[13px] font-semibold ${on ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`;

  return (
    <div className="space-y-4" aria-label="Textile Design Studio">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-mt-muted"><span className="font-semibold text-mt-ink">{prod.label}</span> · {prod.hint}</p>
        <span className="flex-1" />
        <div role="radiogroup" aria-label="Workspace mode" className="inline-flex rounded-full border border-mt-border bg-mt-surface p-1">
          <button type="button" role="radio" aria-checked={ws.mode === 'simple'} onClick={() => setWs((w) => ({ ...w, mode: 'simple' }))} className={chip(ws.mode === 'simple')} title="The essentials: templates, colours, patterns, logo, text, names and numbers, embroidery, mockup, simple export">Simple</button>
          <button type="button" role="radio" aria-checked={ws.mode === 'pro'} onClick={() => setWs((w) => ({ ...w, mode: 'pro' }))} className={chip(ws.mode === 'pro')} title="Everything: vector print studio, grading, panels, factory patterns, production sheet, costing, tech documents">Professional</button>
        </div>
        <div className="relative">
          <button type="button" aria-expanded={menu} onClick={() => setMenu((v) => !v)} className="h-10 px-3.5 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-mt-surface2"><Settings2 size={15} /> Workspace settings</button>
          {menu && (
            <div role="menu" aria-label="Workspace settings" className="absolute right-0 z-40 mt-1 w-72 rounded-2xl border border-mt-border bg-mt-surface p-2 shadow-xl">
              <label className="flex items-center justify-between gap-2 px-2 py-1.5 text-[13px]">Units
                <select value={ws.units} onChange={(e) => setWs((w) => ({ ...w, units: e.target.value as any }))} aria-label="Units" className="h-8 rounded-lg border border-mt-border bg-mt-bg px-2 text-[13px]"><option value="mm">mm</option><option value="cm">cm</option><option value="in">inches</option></select>
              </label>
              <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-2 text-left text-[13px] hover:bg-mt-surface2" onClick={() => { try { localStorage.setItem(KEY, JSON.stringify(ws)); } catch { /* ignore */ } setMenu(false); flash('Workspace settings saved on this device.'); }}>Save workspace settings</button>
              <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-2 text-left text-[13px] hover:bg-mt-surface2" onClick={resetSettings}>Restore default settings</button>
              <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-2 text-left text-[13px] hover:bg-mt-surface2" onClick={() => { try { localStorage.removeItem('mt:textile-panels'); } catch { /* ignore */ } setN((x) => x + 1); setMenu(false); flash('Panels reset.'); }}>Reset panels</button>
              <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-2 text-left text-[13px] hover:bg-mt-surface2" onClick={() => { try { localStorage.removeItem('mt:embroidery-defaults'); } catch { /* ignore */ } setMenu(false); flash('Tool settings reset (stitch defaults, text mode).'); }}>Reset tools</button>
              <button type="button" role="menuitem" className="w-full rounded-lg px-2 py-2 text-left text-[13px] hover:bg-mt-surface2" onClick={() => { setWs((w) => ({ ...w, units: DEFAULT_WORKSPACE.units })); setMenu(false); flash('Preferences reset.'); }}>Reset preferences</button>
              <p className="px-2 pt-1 text-[11px] text-mt-faint">None of these touch your artwork or saved projects. To start over, use New in the project bar below.</p>
            </div>
          )}
        </div>
      </div>

      {/* Garment library strip — like a CAD presets bar: pick what you are designing. */}
      <div role="radiogroup" aria-label="Product" className="flex gap-2 overflow-x-auto rounded-2xl border border-mt-border bg-mt-surface p-2">
        {PRODUCTS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-label={`Product: ${p.label}`} aria-checked={ws.product === p.id} onClick={() => choose(p.id)} title={p.hint}
            className={`group shrink-0 w-[118px] rounded-xl border px-2 py-2 text-center transition-colors ${ws.product === p.id ? 'border-mt-ink bg-mt-surface2' : 'border-transparent hover:border-mt-border hover:bg-mt-surface2'}`}>
            <GarmentGlyph id={p.id} on={ws.product === p.id} />
            <span className="mt-1 block text-[12px] font-semibold leading-tight">{p.label}</span>
          </button>
        ))}
      </div>

      {ready && (prod.family === 'team'
        ? <GarmentDesigner kind={teamPick!.kind} mode={ws.mode} onKind={(k, neck) => setWs((w) => { const id = k === 'jersey' ? (neck === 'v' ? 'jersey-v' : 'jersey') : k; return w.product === id ? w : { ...w, product: id }; })} pick={teamPick} onForeign={foreign('made')} openReq={openReq} />
        : <TextileStudio embedded units={ws.units} mode={ws.mode} pick={madePick} onForeign={foreign('team')} openReq={openReq} />)}

      {note && <p role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] rounded-full bg-mt-ink px-4 py-2 text-[13px] text-mt-bg shadow-lg">{note}</p>}
    </div>
  );
}

/** Small line drawing of each product for the library strip (ink, accent when selected). */
function GarmentGlyph({ id, on }: { id: string; on: boolean }) {
  const ink = 'currentColor', acc = on ? '#3B82C4' : 'currentColor';
  const shirt = (neck: 'round' | 'v' | 'polo') => (
    <>
      <path d="M14 8 L22 5 Q28 9 34 5 L42 8 L50 18 L44 23 L40 18 L40 46 L16 46 L16 18 L12 23 L6 18 Z" fill="none" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
      {neck === 'round' && <path d="M22 5 Q28 12 34 5" fill="none" stroke={acc} strokeWidth="2" />}
      {neck === 'v' && <path d="M22 5 L28 14 L34 5" fill="none" stroke={acc} strokeWidth="2" />}
      {neck === 'polo' && <><path d="M22 5 L26 11 L28 8 L30 11 L34 5" fill="none" stroke={acc} strokeWidth="2" /><path d="M28 8 V20" stroke={acc} strokeWidth="1.6" /></>}
    </>
  );
  const shapes: Record<string, any> = {
    jersey: <>{shirt('round')}<text x="28" y="35" fontSize="10" fontWeight="700" textAnchor="middle" fill={acc}>07</text></>,
    'jersey-v': <>{shirt('v')}<text x="28" y="35" fontSize="10" fontWeight="700" textAnchor="middle" fill={acc}>10</text></>,
    polo: shirt('polo'),
    tshirt: shirt('round'),
    tee: <>{shirt('round')}<path d="M18 30 H38" stroke={acc} strokeWidth="1.4" strokeDasharray="2 2" /></>,
    kurta: <><path d="M20 4 L25 3 Q28 7 31 3 L36 4 L44 14 L39 17 L37 13 L39 48 L17 48 L19 13 L17 17 L12 14 Z" fill="none" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" /><path d="M28 6 V22" stroke={acc} strokeWidth="1.8" /><path d="M19 40 H37" stroke={acc} strokeWidth="1.4" /></>,
    chudidar: <><path d="M18 4 H38 L36 48 H30 L28 18 L26 48 H20 Z" fill="none" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" /><path d="M20 38 Q23 36 26 38 M30 38 Q33 36 36 38 M20 42 Q23 40 26 42 M30 42 Q33 40 36 42" fill="none" stroke={acc} strokeWidth="1.2" /></>,
    dupatta: <><path d="M10 10 Q28 2 46 10 L42 46 Q28 40 14 46 Z" fill="none" stroke={ink} strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 40 Q28 34 42 40" fill="none" stroke={acc} strokeWidth="2" /></>,
    fabric: <><rect x="8" y="8" width="40" height="38" rx="2" fill="none" stroke={ink} strokeWidth="1.8" />{[16, 28, 40].map((x) => [18, 30].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={acc} />))}<path d="M8 40 H48" stroke={acc} strokeWidth="1.6" /></>,
  };
  return <svg viewBox="0 0 56 52" width="56" height="52" aria-hidden className={`mx-auto ${on ? 'text-mt-ink' : 'text-mt-muted group-hover:text-mt-ink'}`}>{shapes[id] || shirt('round')}</svg>;
}
