'use client';

// Wallpaper & Wall Sticker Designer: one workspace, two modes. Patterns
// come from the shared on-device library, so a pattern made in Pattern
// Design is available in both.
import { useEffect, useState } from 'react';
import { WallDesigner } from './WallDesigner';
import { StickerDesigner } from './StickerDesigner';

export function WallWorkspace() {
  const [mode, setMode] = useState<'wallpaper' | 'sticker'>('wallpaper');
  useEffect(() => { try { if (new URLSearchParams(location.search).get('mode') === 'sticker') setMode('sticker'); } catch { /* ignore */ } }, []);
  const pick = (m: 'wallpaper' | 'sticker') => {
    setMode(m);
    try { const u = new URL(location.href); if (m === 'sticker') u.searchParams.set('mode', 'sticker'); else u.searchParams.delete('mode'); history.replaceState(null, '', u.toString()); } catch { /* ignore */ }
  };
  const tab = (m: 'wallpaper' | 'sticker', label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => pick(m)} className={`h-10 px-4 rounded-xl text-[13.5px] font-semibold ${mode === m ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{label}</button>
  );
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Wall design type" className="flex w-fit gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">
        {tab('wallpaper', 'Wallpaper')}{tab('sticker', 'Wall stickers')}
      </div>
      {/* Both stay mounted so switching never loses work. */}
      <div hidden={mode !== 'wallpaper'}><WallDesigner initial="pattern" wallpaperOnly /></div>
      <div hidden={mode !== 'sticker'}><StickerDesigner /></div>
    </div>
  );
}
