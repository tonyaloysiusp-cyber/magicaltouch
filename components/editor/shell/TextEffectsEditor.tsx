'use client';

// Text effects (v2, Nov 2026). A gallery of looks plus the layers each look
// is made of — fill (solid or gradient), outline, shadow (soft, hard or
// glow), highlight and curve/wave — all live, editable text. Everything is a
// native text property, so the look is the same on screen and in PNG, JPG,
// PDF and SVG downloads.

import type React from 'react';
import { TextFx, FxShadow, TEXT_LOOKS, lookFx, isLegacyFx, DEFAULT_TEXT_FX } from '@/lib/editor/textEffects';
import { DEFAULT_SWATCHES } from './ColorPicker';
import { Slider, cx } from './ui';

function lookStyle(id: string): React.CSSProperties {
  const L = TEXT_LOOKS.find((l) => l.id === id);
  const fx = L?.fx || {};
  const st: any = { fontFamily: 'Montserrat, system-ui', fontWeight: 900, fontSize: 22, color: L?.dark ? '#FFFFFF' : '#09090B', lineHeight: 1 };
  if (fx.gradient) { st.backgroundImage = `linear-gradient(${(fx.gradient.angle ?? 0) + 90}deg, ${fx.gradient.colors.join(', ')})`; st.WebkitBackgroundClip = 'text'; st.backgroundClip = 'text'; st.color = 'transparent'; }
  if (fx.hollow) st.color = 'transparent';
  if (fx.outline) { st.WebkitTextStroke = `${fx.hollow ? 1 : Math.max(1, fx.outline.width / 25)}px ${fx.outline.color}`; st.paintOrder = 'stroke fill'; }
  if (fx.shadow) {
    const s = fx.shadow, a = (s.angle * Math.PI) / 180, d = s.kind === 'glow' ? 0 : (s.distance / 100) * 5;
    const col = hexA(s.color, s.opacity / 100);
    st.textShadow = s.kind === 'glow' ? `0 0 ${4 + s.blur / 12}px ${col}, 0 0 ${8 + s.blur / 8}px ${col}` : `${(Math.cos(a) * d).toFixed(1)}px ${(Math.sin(a) * d).toFixed(1)}px ${s.kind === 'hard' ? 0 : s.blur / 12}px ${col}`;
    if (fx.gradient) st.filter = `drop-shadow(${s.kind === 'glow' ? '0 0' : `${(Math.cos(a) * d).toFixed(1)}px ${(Math.sin(a) * d).toFixed(1)}px`} ${s.kind === 'hard' ? 0 : s.blur / 12}px ${col})`;
  }
  if (fx.highlight) st.background = fx.highlight.color;
  return st;
}
const hexA = (hex: string, a: number) => {
  const h = (hex || '#000').replace('#', '').padEnd(6, '0');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
};

function Swatches({ value, onPick, label }: { value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {DEFAULT_SWATCHES.slice(0, 12).map((c) => (
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

const Head = ({ title, on, onToggle }: { title: string; on?: boolean; onToggle?: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <p className="text-[13px] font-semibold text-mt-ink">{title}</p>
    {onToggle && <Toggle label={title} on={!!on} onChange={onToggle} />}
  </div>
);

export function TextEffectsEditor({ value, onChange }: { value: TextFx; onChange: (fx: TextFx, commit: boolean) => void }) {
  const legacy = isLegacyFx(value);
  // Every change below is a v2 effect; an old effect is replaced by it.
  const base: TextFx = legacy ? { ...DEFAULT_TEXT_FX, curve: value.curve, wave: value.wave, v: 2 } : { ...value, v: 2, effect: 'none' };
  const set = (patch: Partial<TextFx>, commit = true) => onChange({ ...base, look: 'custom', ...patch }, commit);
  const sh = base.shadow || null;
  const setSh = (p: Partial<FxShadow>, commit = true) => set({ shadow: { ...(sh || { kind: 'soft', color: '#000000', opacity: 45, distance: 30, angle: 45, blur: 40 }), ...p } }, commit);
  const g = base.gradient || null;
  const outline = base.outline || null;
  const active = legacy ? '' : base.look || (base.gradient || base.shadow || base.outline || base.highlight || base.hollow ? 'custom' : 'none');

  return (
    <div className="flex flex-col gap-4">
      {legacy && (
        <p className="rounded-xl bg-mt-surface2 px-3 py-2 text-[12px] text-mt-muted">This text uses an older effect. Pick a look below to replace it, or <button type="button" className="text-mt-accent underline" onClick={() => onChange({ ...DEFAULT_TEXT_FX, curve: value.curve, wave: value.wave }, true)}>remove it</button>.</p>
      )}
      <section>
        <p className="text-[13px] font-semibold text-mt-ink mb-2">Looks <span className="font-normal text-mt-faint">· text stays editable</span></p>
        <div className="grid grid-cols-4 gap-1.5">
          {TEXT_LOOKS.map((l) => (
            <button key={l.id} type="button" onClick={() => onChange(lookFx(l.id, value), true)} aria-pressed={active === l.id} title={l.label}
              className={cx('rounded-xl border flex flex-col items-center justify-center gap-1 py-2 min-h-[58px]', active === l.id ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2', l.dark && 'bg-[#11131f]')}>
              <span style={lookStyle(l.id)} className="px-0.5">Ag</span>
              <span className={cx('text-[10px] leading-none', l.dark ? 'text-white/80' : 'text-mt-muted')}>{l.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-mt-border pt-3">
        <Head title="Gradient fill" on={!!g} onToggle={(on) => set({ gradient: on ? { colors: ['#F2708F', '#35C2F1'], angle: 0 } : null, hollow: false })} />
        {g && (
          <div className="mt-2 flex flex-col gap-2.5">
            <div className="h-6 rounded-lg ring-1 ring-black/10" style={{ background: `linear-gradient(90deg, ${g.colors.join(', ')})` }} />
            <div className="flex items-center gap-1.5 flex-wrap">
              {g.colors.map((c, i) => (
                <label key={i} className="relative w-7 h-7 rounded-lg ring-1 ring-black/10 cursor-pointer overflow-hidden" style={{ background: c }} title={`Colour ${i + 1}`}>
                  <input type="color" value={c} aria-label={`Gradient colour ${i + 1}`} onChange={(e) => set({ gradient: { ...g, colors: g.colors.map((x, k) => (k === i ? e.target.value.toUpperCase() : x)) } }, false)} onBlur={() => set({ gradient: g })} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              ))}
              {g.colors.length < 5 && <button type="button" onClick={() => set({ gradient: { ...g, colors: [...g.colors, g.colors[g.colors.length - 1]] } })} className="h-7 px-2 rounded-lg border border-mt-border text-[12px]">+ colour</button>}
              {g.colors.length > 2 && <button type="button" onClick={() => set({ gradient: { ...g, colors: g.colors.slice(0, -1) } })} className="h-7 px-2 rounded-lg border border-mt-border text-[12px]">− colour</button>}
            </div>
            <Slider label="Direction" value={g.angle} min={0} max={360} onChange={(v) => set({ gradient: { ...g, angle: v } }, false)} onCommit={(v) => set({ gradient: { ...g, angle: v } })} />
          </div>
        )}
      </section>

      <section className="border-t border-mt-border pt-3">
        <Head title="Outline" on={!!outline} onToggle={(on) => set({ outline: on ? { color: '#09090B', width: 35 } : null, hollow: on ? base.hollow : false })} />
        {outline && (
          <div className="mt-2 flex flex-col gap-2.5">
            <Slider label="Thickness" value={outline.width} min={1} max={100} onChange={(v) => set({ outline: { ...outline, width: v } }, false)} onCommit={(v) => set({ outline: { ...outline, width: v } })} />
            <Swatches label="Outline colour" value={outline.color} onPick={(c) => set({ outline: { ...outline, color: c } })} />
            <label className="flex items-center justify-between text-[12.5px] text-mt-ink"><span>Hollow letters (outline only)</span><Toggle label="Hollow" on={!!base.hollow} onChange={(v) => set({ hollow: v, gradient: v ? null : base.gradient })} /></label>
          </div>
        )}
      </section>

      <section className="border-t border-mt-border pt-3">
        <Head title="Shadow & glow" on={!!sh} onToggle={(on) => (on ? setSh({}) : set({ shadow: null }))} />
        {sh && (
          <div className="mt-2 flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-mt-surface2 p-0.5">
              {(['soft', 'hard', 'glow'] as const).map((k) => (
                <button key={k} type="button" aria-pressed={sh.kind === k} onClick={() => setSh({ kind: k, blur: k === 'hard' ? 0 : sh.blur || 40, distance: k === 'glow' ? 0 : sh.distance || 30 })} className={cx('h-7 rounded-md text-[12px] font-semibold capitalize', sh.kind === k ? 'bg-mt-surface text-mt-ink shadow-sm' : 'text-mt-muted')}>{k}</button>
              ))}
            </div>
            <Swatches label="Shadow colour" value={sh.color} onPick={(c) => setSh({ color: c })} />
            <Slider label="Opacity" value={sh.opacity} min={0} max={100} onChange={(v) => setSh({ opacity: v }, false)} onCommit={(v) => setSh({ opacity: v })} />
            {sh.kind !== 'glow' && <Slider label="Distance" value={sh.distance} min={0} max={100} onChange={(v) => setSh({ distance: v }, false)} onCommit={(v) => setSh({ distance: v })} />}
            {sh.kind !== 'glow' && <Slider label="Direction" value={sh.angle} min={0} max={360} onChange={(v) => setSh({ angle: v }, false)} onCommit={(v) => setSh({ angle: v })} />}
            {sh.kind !== 'hard' && <Slider label={sh.kind === 'glow' ? 'Glow size' : 'Blur'} value={sh.blur} min={0} max={100} onChange={(v) => setSh({ blur: v }, false)} onCommit={(v) => setSh({ blur: v })} />}
          </div>
        )}
      </section>

      <section className="border-t border-mt-border pt-3">
        <Head title="Highlight" on={!!base.highlight} onToggle={(on) => set({ highlight: on ? { color: '#FFE45C' } : null })} />
        {base.highlight && <div className="mt-2"><Swatches label="Highlight colour" value={base.highlight.color} onPick={(c) => set({ highlight: { color: c } })} /></div>}
      </section>

      <section className="border-t border-mt-border pt-3">
        <p className="text-[13px] font-semibold text-mt-ink mb-2">Shape</p>
        <div className="flex flex-col gap-2.5">
          <Slider label="Curve" value={value.curve} min={-100} max={100} onChange={(v) => onChange({ ...base, look: base.look, curve: v, wave: 0 }, false)} onCommit={(v) => onChange({ ...base, look: base.look, curve: v, wave: 0 }, true)} />
          <Slider label="Wave" value={value.wave} min={0} max={100} onChange={(v) => onChange({ ...base, look: base.look, wave: v, curve: 0 }, false)} onCommit={(v) => onChange({ ...base, look: base.look, wave: v, curve: 0 }, true)} />
          {(value.curve !== 0 || value.wave !== 0) && (
            <button type="button" onClick={() => onChange({ ...base, look: base.look, curve: 0, wave: 0 }, true)} className="self-start text-xs text-mt-accent hover:underline">Straighten text</button>
          )}
        </div>
      </section>
    </div>
  );
}
