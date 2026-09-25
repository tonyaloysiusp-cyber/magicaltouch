'use client';

// A curated set of two-stop gradient combinations, so picking a gradient
// is "click the one that looks right" rather than only ever hand-picking
// two arbitrary colors. Each preset is just a (color1, color2) pair — the
// existing linear/radial toggle and angle control still apply on top of
// whichever preset (or manual pair) is active.
export interface GradientPreset {
  name: string;
  c1: string;
  c2: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { name: 'Brand Pink→Purple', c1: '#EC1E79', c2: '#8B6FC4' },
  { name: 'Ocean', c1: '#3FA9E8', c2: '#4FC8C0' },
  { name: 'Meadow', c1: '#7ED33E', c2: '#C4DA3B' },
  { name: 'Sunset', c1: '#F59E0B', c2: '#EF4444' },
  { name: 'Berry', c1: '#8B6FC4', c2: '#EC1E79' },
  { name: 'Sky', c1: '#93C5FD', c2: '#3FA9E8' },
  { name: 'Peach', c1: '#FDE047', c2: '#FB923C' },
  { name: 'Rose Gold', c1: '#FDE047', c2: '#F472B6' },
  { name: 'Deep Sea', c1: '#1E293B', c2: '#3FA9E8' },
  { name: 'Mint', c1: '#5EEAD4', c2: '#7ED33E' },
  { name: 'Fire', c1: '#EF4444', c2: '#F59E0B' },
  { name: 'Grape', c1: '#8B6FC4', c2: '#C4B5FD' },
  { name: 'Charcoal', c1: '#000000', c2: '#404040' },
  { name: 'Silver', c1: '#A6A6A6', c2: '#FFFFFF' },
  { name: 'Coral', c1: '#EC1E79', c2: '#FB923C' },
  { name: 'Forest', c1: '#1E293B', c2: '#7ED33E' },
];

interface Props {
  activePreset?: GradientPreset;
  onPick: (preset: GradientPreset) => void;
  disabled?: boolean;
}

export function GradientPresetPicker({ onPick, disabled }: Props) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">Presets</label>
      <div className="grid grid-cols-4 gap-1.5">
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            title={p.name}
            disabled={disabled}
            onClick={() => onPick(p)}
            className="h-7 rounded border border-gray-200 dark:border-[#3A3A3A] disabled:opacity-40 hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }}
          />
        ))}
      </div>
    </div>
  );
}
