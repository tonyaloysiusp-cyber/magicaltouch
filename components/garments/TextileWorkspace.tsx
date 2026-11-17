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
import { Settings2, Shirt } from 'lucide-react';
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
        <p className="text-[15px] font-semibold flex items-center gap-2"><Shirt size={18} className="text-mt-accent" /> Textile Design Studio</p>
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

      <div role="radiogroup" aria-label="Product" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PRODUCTS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-label={`Product: ${p.label}`} aria-checked={ws.product === p.id} onClick={() => choose(p.id)}
            className={`rounded-2xl border p-3 text-left ${ws.product === p.id ? 'border-mt-ink ring-2 ring-mt-accent/30 bg-mt-accentsoft' : 'border-mt-border hover:bg-mt-surface2'}`}>
            <p className="text-[13.5px] font-semibold">{p.label}</p>
            <p className="text-[11.5px] text-mt-muted">{p.hint}</p>
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
