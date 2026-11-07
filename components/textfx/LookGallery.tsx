'use client';

// Gallery of the professional text looks with real previews (drawn by the
// same engine that draws the text), used by the editor and Photo Studio.

import { useEffect, useRef } from 'react';
import { PREMIUM_LOOKS, PremiumLook, drawLookPreview } from '@/lib/textfx/premium';

function Preview({ look, color }: { look: PremiumLook; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => drawLookPreview(c, look, color, '800 34px Montserrat, Poppins, system-ui, sans-serif');
    draw();
    (document as any).fonts?.ready?.then(draw);
  }, [look, color]);
  return <canvas ref={ref} width={160} height={84} className="w-full h-auto rounded-lg" aria-hidden />;
}

export function LookGallery({ value, color, onPick }: { value: string; color: string; onPick: (look: PremiumLook, defaultColor: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {PREMIUM_LOOKS.map((l) => {
        const on = value === l.id;
        return (
          <button key={l.id} type="button" onClick={() => onPick(l.id, l.defaultColor)} aria-pressed={on} title={l.label}
            className={`rounded-xl border p-1 flex flex-col items-stretch gap-0.5 transition-colors ${on ? 'border-[#3B82C4] ring-1 ring-[#3B82C4]' : 'border-mt-border hover:bg-mt-surface2'}`}>
            <span className={`block rounded-lg overflow-hidden ${l.dark ? 'bg-[#111322]' : 'bg-[#F4F5F8]'}`}><Preview look={l.id} color={on && l.usesColor ? color : l.defaultColor} /></span>
            <span className="text-[10.5px] text-mt-muted text-center leading-tight py-0.5">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
