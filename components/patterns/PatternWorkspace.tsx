'use client';

// Pattern Design — one tool with two creation modes:
//  • Repeat patterns (seamless grid, brick, half-drop, mirror, radial,
//    kaleidoscope… from 130+ shapes, letters or your own image)
//  • Rangoli & Mandala (centre-based radial drawing, petals, dots, rings,
//    Diwali presets)
// Both save into the same on-device "My patterns" library that the
// Textile and Wallpaper designers use.

import { useEffect, useState } from 'react';
import { Grid3x3, Flower2 } from 'lucide-react';
import { PatternStudio } from './PatternStudio';
import { MandalaMaker } from '@/components/tools/MandalaMaker';

type Mode = 'repeat' | 'rangoli';

export function PatternWorkspace({ initial = 'repeat' }: { initial?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);
  useEffect(() => { try { const m = new URLSearchParams(window.location.search).get('mode'); if (m === 'rangoli' || m === 'mandala') setMode('rangoli'); } catch { /* ignore */ } }, []);
  const pick = (m: Mode) => { setMode(m); try { const u = new URL(window.location.href); if (m === 'rangoli') u.searchParams.set('mode', 'rangoli'); else u.searchParams.delete('mode'); window.history.replaceState(null, '', u.toString()); } catch { /* ignore */ } };
  const tab = (m: Mode, label: string, Icon: typeof Grid3x3, hint: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => pick(m)} className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left ${mode === m ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted hover:text-mt-ink'}`}>
      <Icon size={18} /><span><span className="block text-[14px] font-semibold">{label}</span><span className={`block text-[11.5px] ${mode === m ? 'opacity-80' : ''}`}>{hint}</span></span>
    </button>
  );
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Pattern creation mode" className="flex w-fit flex-wrap gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">
        {tab('repeat', 'Repeat pattern', Grid3x3, 'Seamless, grid, brick, half-drop, mirror, radial, kaleidoscope')}
        {tab('rangoli', 'Rangoli & Mandala', Flower2, 'Draw from the centre — petals, dots, rings, Diwali presets')}
      </div>
      {mode === 'repeat' ? <PatternStudio /> : <MandalaMaker />}
    </div>
  );
}
