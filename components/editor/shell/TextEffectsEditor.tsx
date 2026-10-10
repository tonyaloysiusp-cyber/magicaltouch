'use client';

// Text effects: one "look" (shadow, glow, neon…), plus an outline and a
// highlight that combine with any look, plus curve or wave. Everything
// stays live, editable text.

import { TextFx } from '@/lib/editor/textEffects';
import { DEFAULT_SWATCHES } from './ColorPicker';
import { Slider, cx } from './ui';

const LOOKS: { id: TextFx['effect']; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'lift', label: 'Lift' },
  { id: 'glow', label: 'Glow' },
  { id: 'neon', label: 'Neon' },
  { id: 'echo', label: 'Echo' },
  { id: 'hollow', label: 'Hollow' },
  { id: 'retro', label: 'Retro' },
  { id: 'pop', label: 'Pop' },
  { id: 'dreamy', label: 'Dreamy' },
];

function EffectSample({ id }: { id: string }) {
  const base: React.CSSProperties = { fontFamily: 'Montserrat, system-ui', fontWeight: 800, fontSize: 22, color: '#09090B' };
  const map: Record<string, React.CSSProperties> = {
    none: base,
    shadow: { ...base, textShadow: '2px 2px 3px rgba(9,9,11,0.45)' },
    lift: { ...base, textShadow: '0 6px 8px rgba(0,0,0,0.3)' },
    glow: { ...base, color: '#fff', textShadow: '0 0 6px #A69BD3, 0 0 12px #A69BD3' },
    neon: { ...base, color: '#F2708F', textShadow: '0 0 6px #F2708F, 0 0 14px #F2708F', WebkitTextStroke: '0.6px #fff' } as any,
    hollow: { ...base, color: 'transparent', WebkitTextStroke: '1.2px #09090B' } as any,
    echo: { ...base, textShadow: '3px 3px 0 #8CCBFF' },
    retro: { ...base, color: '#F2708F', WebkitTextStroke: '1px #FFF4E0', textShadow: '3px 3px 0 #1A1A1A' } as any,
    pop: { ...base, color: '#FFFFFF', textShadow: '4px 4px 0 #F2708F', WebkitTextStroke: '0.6px #09090B' } as any,
    dreamy: { ...base, color: '#A69BD3', textShadow: '0 1px 10px rgba(166,155,211,0.9)' },
  };
  return <span style={map[id] || base}>Ag</span>;
}

function Swatches({ value, onPick, label }: { value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {DEFAULT_SWATCHES.slice(0, 14).map((c) => (
        <button key={c} type="button" aria-label={`${label} ${c}`} onClick={() => onPick(c)} className={cx('w-5 h-5 rounded-full ring-1 ring-black/10 dark:ring-white/20', value.toUpperCase() === c && 'ring-2 ring-[#3B82C4] ring-offset-1 ring-offset-mt-surface')} style={{ background: c }} />
      ))}
      <label className="relative w-5 h-5 rounded-full overflow-hidden ring-1 ring-black/10 cursor-pointer" title="Any colour" style={{ background: 'conic-gradient(#F2708F, #F7C948, #8CC84B, #35C2F1, #A69BD3, #F2708F)' }}>
        <input type="color" aria-label={`${label}: any colour`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#09090B'} onChange={(e) => onPick(e.target.value.toUpperCase())} className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx('relative w-9 h-5 rounded-full transition-colors shrink-0', on ? 'bg-[#3B82C4]' : 'bg-mt-border')}>
      <span className={cx('absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function TextEffectsEditor({ value, onChange }: { value: TextFx; onChange: (fx: TextFx, commit: boolean) => void }) {
  const set = (patch: Partial<TextFx>, commit = true) => onChange({ ...value, ...patch }, commit);
  const usesColor = value.effect !== 'none' && value.effect !== 'lift' && value.effect !== 'dreamy';
  const outline = value.outline || null;
  const highlight = value.highlight || null;
  return (
    <div className="flex flex-col gap-4">
      <section>
        <p className="text-[13px] font-semibold text-mt-ink mb-2">Look</p>
        <div className="grid grid-cols-4 gap-1.5">
          {LOOKS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                // A sensible colour for each look the first time it's picked.
                const defaults: Record<string, string> = { glow: '#8CCBFF', neon: '#F2708F', echo: '#8CCBFF', hollow: '#09090B', shadow: '#09090B' };
                const keep = value.effect !== 'none' && value.color !== '#09090B';
                set({ effect: e.id, color: keep ? value.color : defaults[e.id] || value.color });
              }}
              aria-pressed={value.effect === e.id}
              className={cx(
                'rounded-xl border flex flex-col items-center justify-center gap-0.5 py-1.5',
                value.effect === e.id ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2',
                (e.id === 'glow' || e.id === 'neon') && 'bg-[#11131f]'
              )}
            >
              <EffectSample id={e.id} />
              <span className={cx('text-[10px]', e.id === 'glow' || e.id === 'neon' ? 'text-white/80' : 'text-mt-muted')}>{e.label}</span>
            </button>
          ))}
        </div>
        {value.effect !== 'none' && (
          <div className="mt-3 flex flex-col gap-2.5">
            <Slider label={value.effect === 'hollow' ? 'Thickness' : 'Strength'} value={value.amount} min={0} max={100} onChange={(v) => set({ amount: v }, false)} onCommit={(v) => set({ amount: v })} />
            {usesColor && <Swatches label="Effect colour" value={value.color} onPick={(c) => set({ color: c })} />}
          </div>
        )}
      </section>

      <section className="border-t border-mt-border pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-mt-ink">Outline</p>
          <Toggle label="Outline" on={!!outline} onChange={(on) => set({ outline: on ? { color: '#09090B', width: 35 } : null })} />
        </div>
        {outline && (
          <div className="mt-2 flex flex-col gap-2.5">
            <Slider label="Thickness" value={outline.width} min={0} max={100} onChange={(v) => set({ outline: { ...outline, width: v } }, false)} onCommit={(v) => set({ outline: { ...outline, width: v } })} />
            <Swatches label="Outline colour" value={outline.color} onPick={(c) => set({ outline: { ...outline, color: c } })} />
            {(value.effect === 'neon' || value.effect === 'hollow') && <p className="text-[11px] text-mt-faint">{value.effect === 'neon' ? 'Neon' : 'Hollow'} uses its own outline.</p>}
          </div>
        )}
      </section>

      <section className="border-t border-mt-border pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-mt-ink">Highlight</p>
          <Toggle label="Highlight" on={!!highlight} onChange={(on) => set({ highlight: on ? { color: '#F8E16C' } : null })} />
        </div>
        {highlight && (
          <div className="mt-2">
            <Swatches label="Highlight colour" value={highlight.color} onPick={(c) => set({ highlight: { color: c } })} />
          </div>
        )}
      </section>

      <section className="border-t border-mt-border pt-3">
        <p className="text-[13px] font-semibold text-mt-ink mb-2">Shape</p>
        <div className="flex flex-col gap-2.5">
          <Slider label="Curve" value={value.curve} min={-100} max={100} onChange={(v) => set({ curve: v, wave: 0 }, false)} onCommit={(v) => set({ curve: v, wave: 0 })} />
          <Slider label="Wave" value={value.wave} min={0} max={100} onChange={(v) => set({ wave: v, curve: 0 }, false)} onCommit={(v) => set({ wave: v, curve: 0 })} />
          {(value.curve !== 0 || value.wave !== 0) && (
            <button type="button" onClick={() => set({ curve: 0, wave: 0 })} className="self-start text-xs text-mt-accent hover:underline">
              Straighten text
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
