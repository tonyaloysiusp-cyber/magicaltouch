'use client';

// Colour & gradient picker: hue/brightness square, HEX/RGB/HSL/CMYK entry,
// eyedropper, recent / document / brand colours, and a full gradient editor
// (linear or radial, any number of colour stops, angle, stop opacity).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pipette, Trash2, Ban } from 'lucide-react';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToCmyk,
  cmykToRgb,
  readRecentColors,
  rememberColor,
  parseColorAlpha,
  withAlpha,
} from '@/lib/editor/color';
import { BRAND_GRADIENTS, GradientSpec, gradientCss } from '@/lib/editor/gradients';
import { cx, Segmented } from './ui';

export const DEFAULT_SWATCHES = [
  '#09090B', '#52525B', '#A1A1AA', '#E5E7EB', '#FFFFFF',
  '#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B',
  '#DDE23B', '#F7B267', '#EF4444', '#3B82C4', '#8CCBFF',
  '#F3A6B8', '#7C3AED', '#0EA5E9', '#16A34A', '#B8862B',
];

type Value = string | GradientSpec | null;

interface Props {
  value: Value;
  onChange: (v: Value, commit: boolean) => void;
  allowGradient?: boolean;
  allowNone?: boolean;
  brandColors?: string[];
  documentColors?: string[];
  onPickFromCanvas?: (cb: (hex: string) => void) => void;
  // Show an opacity slider for solid colours (on by default).
  alpha?: boolean;
}

const isGradient = (v: Value): v is GradientSpec => !!v && typeof v === 'object';

function SolidEditor({ hex, onChange, onCommit, onPickFromCanvas }: { hex: string; onChange: (h: string) => void; onCommit: (h: string) => void; onPickFromCanvas?: Props['onPickFromCanvas'] }) {
  const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
  const [hsv, setHsv] = useState(() => rgbToHsv(rgb));
  const [mode, setMode] = useState<'hex' | 'rgb' | 'hsl' | 'cmyk'>('hex');
  const squareRef = useRef<HTMLDivElement>(null);
  const lastHex = useRef(hex);

  // Follow outside changes (another swatch picked, eyedropper…).
  useEffect(() => {
    if (hex.toUpperCase() !== lastHex.current.toUpperCase()) {
      setHsv(rgbToHsv(hexToRgb(hex) || rgb));
      lastHex.current = hex;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const emit = (h: number, s: number, v: number, commit = false) => {
    setHsv({ h, s, v });
    const next = rgbToHex(hsvToRgb(h, s, v));
    lastHex.current = next;
    commit ? onCommit(next) : onChange(next);
  };

  const dragSquare = (e: React.PointerEvent) => {
    const el = squareRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent | React.PointerEvent, commit = false) => {
      const r = el.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      const v = Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height));
      emit(hsv.h, s, v, commit);
    };
    move(e);
    const onMove = (ev: PointerEvent) => move(ev);
    const onUp = (ev: PointerEvent) => {
      move(ev, true);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
  };

  const eyedrop = async () => {
    const ED = (window as any).EyeDropper;
    if (ED) {
      try {
        const res = await new ED().open();
        const h = res.sRGBHex.toUpperCase();
        setHsv(rgbToHsv(hexToRgb(h)!));
        lastHex.current = h;
        onCommit(h);
        return;
      } catch {
        return; // cancelled
      }
    }
    onPickFromCanvas?.((h) => {
      setHsv(rgbToHsv(hexToRgb(h)!));
      lastHex.current = h;
      onCommit(h);
    });
  };

  const hsl = rgbToHsl(rgb);
  const cmyk = rgbToCmyk(rgb);
  const num = (label: string, v: number, max: number, set: (n: number) => void) => (
    <label className="flex-1 min-w-0">
      <span className="block text-[10px] text-mt-faint text-center mb-0.5">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        key={`${label}-${v}`}
        defaultValue={Math.round(v)}
        onBlur={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) set(Math.max(0, Math.min(max, n)));
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full h-8 rounded-lg border border-mt-input-border bg-mt-surface text-center text-xs text-mt-ink"
      />
    </label>
  );
  const commitRgb = (r: number, g: number, b: number) => {
    const h = rgbToHex({ r, g, b });
    setHsv(rgbToHsv({ r, g, b }));
    lastHex.current = h;
    onCommit(h);
  };

  return (
    <div>
      <div
        ref={squareRef}
        onPointerDown={dragSquare}
        className="relative h-36 rounded-xl cursor-crosshair touch-none select-none"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))` }}
        aria-label="Saturation and brightness"
      >
        <span
          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)] pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }}
        />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          type="range"
          min={0}
          max={359}
          value={Math.round(hsv.h)}
          aria-label="Hue"
          onChange={(e) => emit(Number(e.target.value), hsv.s, hsv.v)}
          onPointerUp={() => onCommit(lastHex.current)}
          onKeyUp={() => onCommit(lastHex.current)}
          onTouchEnd={() => onCommit(lastHex.current)}
          className="mt-hue-slider flex-1"
        />
        <button
          type="button"
          onClick={eyedrop}
          title="Pick a colour from the screen"
          aria-label="Eyedropper"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-mt-border text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"
        >
          <Pipette size={15} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="h-8 rounded-lg border border-mt-input-border bg-mt-surface text-xs px-1.5 text-mt-ink" aria-label="Colour format">
          <option value="hex">HEX</option>
          <option value="rgb">RGB</option>
          <option value="hsl">HSL</option>
          <option value="cmyk">CMYK</option>
        </select>
        {mode === 'hex' && (
          <input
            type="text"
            key={hex}
            defaultValue={hex}
            aria-label="Hex colour"
            onBlur={(e) => {
              const v = e.target.value.trim();
              const p = hexToRgb(v.startsWith('#') ? v : `#${v}`);
              if (p) commitRgb(p.r, p.g, p.b);
              else e.target.value = hex;
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="flex-1 h-8 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-xs font-mono uppercase text-mt-ink"
          />
        )}
        {mode === 'rgb' && (
          <div className="flex-1 flex gap-1">
            {num('R', rgb.r, 255, (n) => commitRgb(n, rgb.g, rgb.b))}
            {num('G', rgb.g, 255, (n) => commitRgb(rgb.r, n, rgb.b))}
            {num('B', rgb.b, 255, (n) => commitRgb(rgb.r, rgb.g, n))}
          </div>
        )}
        {mode === 'hsl' && (
          <div className="flex-1 flex gap-1">
            {num('H', hsl.h, 359, (n) => { const c = hslToRgb(n, hsl.s, hsl.l); commitRgb(c.r, c.g, c.b); })}
            {num('S', hsl.s, 100, (n) => { const c = hslToRgb(hsl.h, n, hsl.l); commitRgb(c.r, c.g, c.b); })}
            {num('L', hsl.l, 100, (n) => { const c = hslToRgb(hsl.h, hsl.s, n); commitRgb(c.r, c.g, c.b); })}
          </div>
        )}
        {mode === 'cmyk' && (
          <div className="flex-1 flex gap-1">
            {num('C', cmyk.c, 100, (n) => { const c = cmykToRgb(n, cmyk.m, cmyk.y, cmyk.k); commitRgb(c.r, c.g, c.b); })}
            {num('M', cmyk.m, 100, (n) => { const c = cmykToRgb(cmyk.c, n, cmyk.y, cmyk.k); commitRgb(c.r, c.g, c.b); })}
            {num('Y', cmyk.y, 100, (n) => { const c = cmykToRgb(cmyk.c, cmyk.m, n, cmyk.k); commitRgb(c.r, c.g, c.b); })}
            {num('K', cmyk.k, 100, (n) => { const c = cmykToRgb(cmyk.c, cmyk.m, cmyk.y, n); commitRgb(c.r, c.g, c.b); })}
          </div>
        )}
      </div>
    </div>
  );
}

function Swatches({ title, colors, onPick, current }: { title: string; colors: string[]; onPick: (c: string) => void; current?: string | null }) {
  if (!colors.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-mt-faint mb-1.5">{title}</p>
      <div className="grid grid-cols-10 gap-1.5">
        {colors.map((c) => (
          <button
            key={title + c}
            type="button"
            title={c}
            aria-label={`Colour ${c}`}
            onClick={() => onPick(c)}
            className={cx(
              'aspect-square rounded-full ring-1 ring-black/10 dark:ring-white/15 transition-transform hover:scale-110',
              current && current.toUpperCase() === c.toUpperCase() && 'ring-2 ring-[#3B82C4] ring-offset-1 ring-offset-mt-surface'
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function GradientEditor({ spec, onChange, onPickFromCanvas }: { spec: GradientSpec; onChange: (g: GradientSpec, commit: boolean) => void; onPickFromCanvas?: Props['onPickFromCanvas'] }) {
  const [sel, setSel] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const stops = spec.stops;
  const current = stops[Math.min(sel, stops.length - 1)];

  const update = (patch: Partial<GradientSpec>, commit: boolean) => onChange({ ...spec, ...patch }, commit);
  const setStop = (i: number, patch: Partial<GradientSpec['stops'][number]>, commit: boolean) => {
    const next = stops.map((s, j) => (j === i ? { ...s, ...patch } : s));
    update({ stops: next }, commit);
  };

  const addStopAt = (clientX: number) => {
    const r = barRef.current!.getBoundingClientRect();
    const offset = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const next = [...stops, { offset, color: current?.color || '#FFFFFF', opacity: 1 }].sort((a, b) => a.offset - b.offset);
    setSel(next.findIndex((s) => s.offset === offset));
    update({ stops: next }, true);
  };

  const dragStop = (i: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setSel(i);
    const bar = barRef.current!;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent, commit: boolean) => {
      const r = bar.getBoundingClientRect();
      const offset = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      setStop(i, { offset }, commit);
    };
    const onMove = (ev: PointerEvent) => move(ev, false);
    const onUp = (ev: PointerEvent) => {
      move(ev, true);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Segmented
          size="sm"
          value={spec.type}
          onChange={(t) => update({ type: t }, true)}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
          ]}
        />
        {spec.type === 'linear' && (
          <label className="flex items-center gap-2 text-xs text-mt-muted">
            Angle
            <input
              type="number"
              min={0}
              max={359}
              value={Math.round(spec.angle)}
              onChange={(e) => update({ angle: ((Number(e.target.value) % 360) + 360) % 360 }, true)}
              className="w-14 h-8 rounded-lg border border-mt-input-border bg-mt-surface px-1.5 text-xs text-mt-ink"
            />
          </label>
        )}
      </div>
      {spec.type === 'linear' && (
        <input
          type="range"
          min={0}
          max={359}
          value={Math.round(spec.angle)}
          aria-label="Gradient angle"
          onChange={(e) => update({ angle: Number(e.target.value) }, false)}
          onPointerUp={(e) => update({ angle: Number((e.target as HTMLInputElement).value) }, true)}
          onKeyUp={(e) => update({ angle: Number((e.target as HTMLInputElement).value) }, true)}
          className="w-full mt-2 accent-[#3B82C4]"
        />
      )}
      <div className="mt-4 mb-6 relative">
        <div
          ref={barRef}
          onPointerDown={(e) => addStopAt(e.clientX)}
          className="h-7 rounded-lg ring-1 ring-black/10 cursor-copy"
          style={{ background: gradientCss(spec, true) }}
          title="Click to add a colour stop"
        />
        {stops.map((s, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={(e) => dragStop(i, e)}
            aria-label={`Colour stop ${i + 1}`}
            className={cx('absolute top-6 w-5 h-5 -ml-2.5 rounded-full border-2 shadow touch-none', i === sel ? 'border-[#3B82C4] scale-110' : 'border-white')}
            style={{ left: `${s.offset * 100}%`, background: s.color }}
          />
        ))}
      </div>
      {current && (
        <div className="border-t border-mt-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-mt-muted">Stop {sel + 1} · {Math.round(current.offset * 100)}%</span>
            <button
              type="button"
              disabled={stops.length <= 2}
              onClick={() => {
                const next = stops.filter((_, j) => j !== sel);
                setSel(0);
                update({ stops: next }, true);
              }}
              className="inline-flex items-center gap-1 text-xs text-mt-muted hover:text-red-600 disabled:opacity-30"
            >
              <Trash2 size={13} /> Remove stop
            </button>
          </div>
          <SolidEditor
            hex={current.color}
            onChange={(h) => setStop(sel, { color: h }, false)}
            onCommit={(h) => setStop(sel, { color: h }, true)}
            onPickFromCanvas={onPickFromCanvas}
          />
          <label className="block mt-3 text-xs text-mt-muted">
            Stop opacity {Math.round((current.opacity ?? 1) * 100)}%
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((current.opacity ?? 1) * 100)}
              onChange={(e) => setStop(sel, { opacity: Number(e.target.value) / 100 }, false)}
              onPointerUp={(e) => setStop(sel, { opacity: Number((e.target as HTMLInputElement).value) / 100 }, true)}
              onKeyUp={(e) => setStop(sel, { opacity: Number((e.target as HTMLInputElement).value) / 100 }, true)}
              className="w-full accent-[#3B82C4]"
            />
          </label>
        </div>
      )}
      <p className="text-[11px] font-medium text-mt-faint mt-4 mb-1.5">Presets</p>
      <div className="grid grid-cols-5 gap-1.5">
        {BRAND_GRADIENTS.map((g) => (
          <button
            key={g.id}
            type="button"
            title={g.label}
            aria-label={g.label}
            onClick={() => {
              setSel(0);
              onChange(g.spec, true);
            }}
            className="aspect-square rounded-lg ring-1 ring-black/10 hover:scale-105 transition-transform"
            style={{ background: gradientCss(g.spec) }}
          />
        ))}
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange, allowGradient, allowNone, brandColors = [], documentColors = [], onPickFromCanvas, alpha = true }: Props) {
  const [tab, setTab] = useState<'solid' | 'gradient'>(isGradient(value) ? 'gradient' : 'solid');
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(readRecentColors()), []);
  // Solid colours can carry their own opacity (rgba); the editor works
  // on the #RRGGBB part and the opacity separately.
  const solid = typeof value === 'string' && value ? parseColorAlpha(value) : null;
  const hex = solid ? solid.hex : isGradient(value) ? value.stops[0]?.color || '#000000' : '#FFFFFF';
  const opacity = solid ? solid.alpha : 1;
  const gradient = useMemo<GradientSpec>(
    () =>
      isGradient(value)
        ? value
        : {
            type: 'linear',
            angle: 90,
            stops: [
              { offset: 0, color: hex, opacity: 1 },
              { offset: 1, color: '#F3A6B8', opacity: 1 },
            ],
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  const pickSolid = (c: string, commit = true, a = opacity) => {
    if (commit) {
      rememberColor(c);
      setRecent(readRecentColors());
    }
    onChange(alpha ? withAlpha(c, a) : c, commit);
  };

  return (
    <div className="text-mt-ink">
      {allowGradient && (
        <div className="flex items-center justify-between mb-3">
          <Segmented
            size="sm"
            value={tab}
            onChange={(t) => {
              setTab(t);
              if (t === 'gradient' && !isGradient(value)) onChange(gradient, true);
              if (t === 'solid' && isGradient(value)) onChange(value.stops[0]?.color || '#000000', true);
            }}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'gradient', label: 'Gradient' },
            ]}
          />
          {allowNone && (
            <button type="button" onClick={() => onChange(null, true)} className="inline-flex items-center gap-1 text-xs text-mt-muted hover:text-mt-ink">
              <Ban size={13} /> None
            </button>
          )}
        </div>
      )}
      {!allowGradient && allowNone && (
        <div className="flex justify-end mb-2">
          <button type="button" onClick={() => onChange(null, true)} className="inline-flex items-center gap-1 text-xs text-mt-muted hover:text-mt-ink">
            <Ban size={13} /> None
          </button>
        </div>
      )}
      {tab === 'gradient' && allowGradient ? (
        <GradientEditor spec={gradient} onChange={(g, commit) => onChange(g, commit)} onPickFromCanvas={onPickFromCanvas} />
      ) : (
        <>
          <SolidEditor hex={hex} onChange={(h) => pickSolid(h, false)} onCommit={(h) => pickSolid(h, true)} onPickFromCanvas={onPickFromCanvas} />
          {alpha && (
            <label className="block mt-3 text-xs text-mt-muted">
              <span className="flex justify-between">
                <span>Opacity</span>
                <span className="tabular-nums text-mt-ink">{Math.round(opacity * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(opacity * 100)}
                aria-label="Colour opacity"
                onChange={(e) => pickSolid(hex, false, Number(e.target.value) / 100)}
                onPointerUp={(e) => pickSolid(hex, true, Number((e.target as HTMLInputElement).value) / 100)}
                onKeyUp={(e) => pickSolid(hex, true, Number((e.target as HTMLInputElement).value) / 100)}
                className="w-full mt-1"
                style={{ accentColor: hex }}
              />
            </label>
          )}
          <Swatches title="Recent" colors={recent} onPick={(c) => pickSolid(c, true, 1)} current={hex} />
          <Swatches title="In this design" colors={documentColors} onPick={(c) => pickSolid(c, true, 1)} current={hex} />
          <Swatches title="Brand" colors={brandColors} onPick={(c) => pickSolid(c, true, 1)} current={hex} />
          <Swatches title="Colours" colors={DEFAULT_SWATCHES} onPick={(c) => pickSolid(c, true, 1)} current={hex} />
        </>
      )}
    </div>
  );
}

// Round swatch button showing the current fill (solid, gradient or none).
export function ColorChip({ value, label, size = 26 }: { value: any; label: string; size?: number }) {
  const bg =
    value && typeof value === 'object' && value.stops
      ? gradientCss(value)
      : typeof value === 'string' && value
      ? value
      : 'repeating-linear-gradient(45deg, #fff 0 4px, #e5e7eb 4px 8px)';
  return (
    <span
      aria-label={label}
      className="inline-block rounded-full ring-1 ring-black/15 dark:ring-white/20"
      style={{ width: size, height: size, background: bg }}
    />
  );
}

