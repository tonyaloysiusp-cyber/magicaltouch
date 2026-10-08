'use client';

import { TEXT_EFFECTS, TextFx } from '@/lib/editor/textEffects';
import { DEFAULT_SWATCHES } from './ColorPicker';
import { Slider, cx } from './ui';

function EffectSample({ id }: { id: string }) {
  const base: React.CSSProperties = { fontFamily: 'Montserrat, system-ui', fontWeight: 800, fontSize: 22, color: '#09090B' };
  const map: Record<string, React.CSSProperties> = {
    none: base,
    shadow: { ...base, textShadow: '2px 2px 3px rgba(9,9,11,0.45)' },
    lift: { ...base, textShadow: '0 6px 8px rgba(0,0,0,0.3)' },
    glow: { ...base, color: '#fff', textShadow: '0 0 6px #A69BD3, 0 0 12px #A69BD3' },
    neon: { ...base, color: '#F2708F', textShadow: '0 0 6px #F2708F, 0 0 14px #F2708F', WebkitTextStroke: '0.6px #fff' } as any,
    outline: { ...base, color: '#8CCBFF', WebkitTextStroke: '1.5px #09090B', paintOrder: 'stroke fill' } as any,
    hollow: { ...base, color: 'transparent', WebkitTextStroke: '1.2px #09090B' } as any,
    highlight: { ...base, background: 'rgba(221,226,59,0.75)', padding: '0 3px' },
    echo: { ...base, textShadow: '3px 3px 0 #8CCBFF' },
  };
  return <span style={map[id] || base}>Ag</span>;
}

export function TextEffectsEditor({ value, onChange }: { value: TextFx; onChange: (fx: TextFx, commit: boolean) => void }) {
  const set = (patch: Partial<TextFx>, commit = true) => onChange({ ...value, ...patch }, commit);
  const usesColor = value.effect !== 'none' && value.effect !== 'lift';
  return (
    <div>
      <p className="text-[13px] font-semibold text-mt-ink mb-2">Style</p>
      <div className="grid grid-cols-3 gap-2">
        {TEXT_EFFECTS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              // A sensible colour for each look the first time it's picked.
              const defaults: Record<string, string> = { glow: '#8CCBFF', neon: '#F2708F', highlight: '#DDE23B', echo: '#8CCBFF', outline: '#09090B', hollow: '#09090B', shadow: '#09090B' };
              const keep = value.effect !== 'none' && value.color !== '#09090B';
              set({ effect: e.id, color: keep ? value.color : defaults[e.id] || value.color });
            }}
            aria-pressed={value.effect === e.id}
            className={cx(
              'rounded-xl border flex flex-col items-center justify-center gap-0.5 py-2',
              value.effect === e.id ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2',
              (e.id === 'glow' || e.id === 'neon') && 'bg-[#11131f]'
            )}
          >
            <EffectSample id={e.id} />
            <span className={cx('text-[11px]', e.id === 'glow' || e.id === 'neon' ? 'text-white/80' : 'text-mt-muted')}>{e.label}</span>
          </button>
        ))}
      </div>
      {value.effect !== 'none' && (
        <div className="mt-3 flex flex-col gap-3">
          <Slider label={value.effect === 'outline' || value.effect === 'hollow' ? 'Thickness' : 'Strength'} value={value.amount} min={0} max={100} onChange={(v) => set({ amount: v }, false)} onCommit={(v) => set({ amount: v })} />
          {usesColor && (
            <div>
              <p className="text-xs text-mt-muted mb-1">Effect colour</p>
              <div className="grid grid-cols-10 gap-1.5">
                {DEFAULT_SWATCHES.map((c) => (
                  <button key={c} type="button" aria-label={`Effect colour ${c}`} onClick={() => set({ color: c })} className={cx('aspect-square rounded-full ring-1 ring-black/10', value.color.toUpperCase() === c && 'ring-2 ring-[#3B82C4]')} style={{ background: c }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="text-[13px] font-semibold text-mt-ink mt-4 mb-2">Shape</p>
      <div className="flex flex-col gap-3">
        <Slider label="Curve" value={value.curve} min={-100} max={100} onChange={(v) => set({ curve: v, wave: 0 }, false)} onCommit={(v) => set({ curve: v, wave: 0 })} />
        <Slider label="Wave" value={value.wave} min={0} max={100} onChange={(v) => set({ wave: v, curve: 0 }, false)} onCommit={(v) => set({ wave: v, curve: 0 })} />
        {(value.curve !== 0 || value.wave !== 0) && (
          <button type="button" onClick={() => set({ curve: 0, wave: 0 })} className="self-start text-xs text-mt-accent hover:underline">
            Straighten text
          </button>
        )}
      </div>
    </div>
  );
}
