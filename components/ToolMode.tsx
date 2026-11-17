'use client';

// Simple / Pro for every tool: Simple keeps the few controls most people
// need; Pro shows every production control. Switching never changes the
// work — it only shows or hides controls. Remembered per tool on this device.

import { useEffect, useState } from 'react';

export function ModeSwitch({ pro, onChange, label = 'Settings mode' }: { pro: boolean; onChange: (pro: boolean) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-full border border-mt-border bg-mt-surface2/60 p-0.5 text-[12.5px] font-semibold">
      {([[false, 'Simple'], [true, 'Pro']] as const).map(([v, l]) => (
        <button key={l} type="button" role="radio" aria-checked={pro === v} onClick={() => onChange(v)} className={`h-7 px-3 rounded-full ${pro === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{l}</button>
      ))}
    </div>
  );
}

/** Simple / Pro state of a tool, remembered on this device (Simple by default). */
export function useToolMode(key: string, fallback: 'simple' | 'pro' = 'simple'): [boolean, (v: boolean) => void] {
  const k = key.startsWith('mt:') ? key : `mt:mode:${key}`;
  const [pro, setPro] = useState(fallback === 'pro');
  useEffect(() => {
    try {
      const v = localStorage.getItem(k) || (k.startsWith('mt:mode:') ? localStorage.getItem('mt:mode:default') : null);
      if (v) setPro(v === 'pro');
    } catch { /* none */ }
  }, [k]);
  return [pro, (v: boolean) => { setPro(v); try { localStorage.setItem(k, v ? 'pro' : 'simple'); } catch { /* none */ } }];
}

/** A small header row for a tool's settings panel: title + Simple / Pro. */
export function ToolModeBar({ title = 'Settings', pro, onChange }: { title?: string; pro: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-semibold">{title}</p><ModeSwitch pro={pro} onChange={onChange} /></div>;
}
