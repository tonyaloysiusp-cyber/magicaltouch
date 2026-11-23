'use client';

// Workspace type of the design editor: Design, Packaging or Textile.
// Switching opens that workspace's panel, moves its tools to the top of
// the rail and sets millimetres for production work. Nothing is hidden —
// every tool stays in the rail in every workspace.

import { LayoutTemplate, Package, Shirt } from 'lucide-react';

export type EditorStudio = 'design' | 'packaging' | 'textile';

export const STUDIOS: { id: EditorStudio; label: string; hint: string }[] = [
  { id: 'design', label: 'Design', hint: 'Graphic design: templates, text, elements, photos' },
  { id: 'packaging', label: 'Packaging', hint: 'Box structure, dieline, glue flap, production files' },
  { id: 'textile', label: 'Textile', hint: 'Garment pattern pieces, sizes, fabric, pattern files' },
];

/** Rail order for each workspace: its own tools first, then everything else in the usual order. */
const FIRST: Record<EditorStudio, string[]> = {
  design: [],
  packaging: ['packaging', 'elements', 'text', 'upload', 'qr', 'colours', 'patterns'],
  textile: ['textile', 'patterns', 'colours', 'elements', 'text', 'upload', 'trace'],
};
export function orderForStudio<T extends { id: string }>(items: T[], studio: EditorStudio): T[] {
  const first = FIRST[studio];
  if (!first.length) return items;
  return [...first.map((id) => items.find((i) => i.id === id)).filter(Boolean) as T[], ...items.filter((i) => !first.includes(i.id))];
}

/** Which workspace a design belongs to, from its objects (dieline → packaging, pattern pieces → textile). */
export function detectStudio(objects: any[]): EditorStudio | null {
  if (objects.some((o) => o.__tex || o.__pat || o.__texBase)) return 'textile';
  if (objects.some((o) => o.__pack || (o.__dieGen && o.__die))) return 'packaging';
  return null;
}

const ICON: Record<EditorStudio, any> = { design: LayoutTemplate, packaging: Package, textile: Shirt };

export function StudioSwitcher({ studio, onSwitch, compact = false }: { studio: EditorStudio; onSwitch: (s: EditorStudio) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Workspace type" className="flex items-center rounded-full bg-mt-surface2 p-0.5 text-xs font-medium dark:bg-mt-bg">
      {STUDIOS.map((s) => {
        const Icon = ICON[s.id], on = studio === s.id;
        return (
          <button key={s.id} type="button" role="radio" aria-checked={on} title={s.hint} onClick={() => onSwitch(s.id)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${on ? 'bg-mt-surface text-mt-ink shadow dark:bg-mt-surface2' : 'text-mt-muted hover:text-mt-ink'}`}>
            <Icon size={13} aria-hidden />{compact ? <span className="sr-only">{s.label}</span> : s.label}
          </button>
        );
      })}
    </div>
  );
}
