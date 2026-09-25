'use client';

import { useState } from 'react';
import {
  LayoutTemplate,
  Layers,
  Download,
  Eye,
  Lock,
  Type,
  ImageIcon,
  Circle,
  Square,
  FileImage,
  FileText,
  File,
} from 'lucide-react';
import { Reveal } from './Reveal';

type Tab = 'canvas' | 'layers' | 'templates' | 'export';

const TABS: { id: Tab; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'layers', label: 'Layers' },
  { id: 'templates', label: 'Templates' },
  { id: 'export', label: 'Export' },
];

const LAYERS = [
  { name: 'Headline text', icon: Type, hidden: false },
  { name: 'Logo mark', icon: Circle, hidden: false },
  { name: 'Background photo', icon: ImageIcon, hidden: false },
  { name: 'Gradient backdrop', icon: Square, hidden: true },
];

const TEMPLATE_TILES: [string, string][] = [
  ['#EC1E79', '#8B6FC4'],
  ['#3FA9E8', '#4FC8C0'],
  ['#F5B942', '#FF6F91'],
  ['#7ED33E', '#4FC8C0'],
  ['#6C4FD1', '#EC1E79'],
  ['#17161B', '#6C4FD1'],
];

const EXPORT_FORMATS = [
  { icon: FileImage, name: 'PNG', hint: 'Transparent, web-ready' },
  { icon: FileImage, name: 'JPG', hint: 'Smaller file, social-ready' },
  { icon: FileText, name: 'SVG', hint: 'Scalable vector' },
  { icon: File, name: 'PDF', hint: 'Print-ready, bleed included' },
];

// A tabbed, click-driven demonstration of the actual workspace — distinct
// from the static mockup in the hero — so a visitor can see canvas,
// layers, templates and export as separate, real product surfaces rather
// than one flat screenshot. Everything here is a CSS/SVG stand-in for
// the real editor UI (no live Fabric.js canvas on a marketing page), but
// the interaction itself — clicking a tab and watching the panel change
// — is real.
export function ProductWorkspace() {
  const [tab, setTab] = useState<Tab>('canvas');

  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <Reveal>
        <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase text-center">Workspace</p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight text-center">
          Everything you need to create.
        </h2>
      </Reveal>

      <Reveal delayMs={100}>
        <div className="mt-10 flex justify-center gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
                tab === t.id
                  ? 'bg-[#17161B] dark:bg-white text-white dark:text-[#17161B] border-[#17161B] dark:border-white'
                  : 'border-black/15 dark:border-white/20 text-[#4A4750] dark:text-[#B7B2C6] hover:border-black/40 dark:hover:border-white/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delayMs={160}>
        <div className="mt-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1B1926] shadow-[0_40px_80px_-40px_rgba(23,22,27,0.35)] overflow-hidden min-h-[22rem] sm:min-h-[26rem]">
          {tab === 'canvas' && (
            <div className="h-full min-h-[22rem] sm:min-h-[26rem] flex items-center justify-center bg-[#F7F5F0] dark:bg-[#111015] p-8 sm:p-12">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-xl shadow-2xl overflow-hidden bg-brand-gradient">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <span className="w-9 h-9 rounded-full bg-white/90 mb-3" />
                  <span className="text-white font-[family-name:var(--font-display)] italic text-lg leading-tight">
                    Make it magical
                  </span>
                </div>
                <div className="absolute inset-0 border-2 border-white/40 rounded-xl" />
              </div>
              <div className="hidden sm:block absolute translate-x-40 -translate-y-24 w-20 h-28 rounded-lg shadow-lg bg-gradient-to-b from-[#3FA9E8] to-[#4FC8C0] opacity-80 rotate-6" />
              <div className="hidden sm:block absolute -translate-x-44 translate-y-16 w-24 h-16 rounded-lg shadow-lg bg-white border border-black/10 -rotate-6" />
            </div>
          )}

          {tab === 'layers' && (
            <div className="h-full min-h-[22rem] sm:min-h-[26rem] flex items-center justify-center p-8 sm:p-12">
              <div className="w-full max-w-sm rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center gap-2 text-sm font-semibold text-[#17161B] dark:text-[#F3F1F7]">
                  <Layers size={15} /> Layers
                </div>
                {LAYERS.map((l, i) => (
                  <div
                    key={l.name}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${i === 0 ? 'bg-[#F7F5F0] dark:bg-white/5' : ''}`}
                  >
                    <l.icon size={15} className="text-[#4A4750] dark:text-[#B7B2C6] shrink-0" />
                    <span className="truncate text-[#17161B] dark:text-[#F3F1F7]">{l.name}</span>
                    <Eye size={13} className={`ml-auto shrink-0 ${l.hidden ? 'text-[#4A4750]/30 dark:text-white/20' : 'text-[#4A4750]/60 dark:text-white/50'}`} />
                    <Lock size={12} className="text-[#4A4750]/30 dark:text-white/20 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'templates' && (
            <div className="h-full min-h-[22rem] sm:min-h-[26rem] p-8 sm:p-12">
              <div className="grid grid-cols-3 gap-3 h-full">
                {TEMPLATE_TILES.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg flex items-end p-3"
                    style={{ background: `linear-gradient(135deg, ${c[0]}, ${c[1]})` }}
                  >
                    <LayoutTemplate size={14} className="text-white/80" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'export' && (
            <div className="h-full min-h-[22rem] sm:min-h-[26rem] flex items-center justify-center p-8 sm:p-12">
              <div className="w-full max-w-sm space-y-3">
                {EXPORT_FORMATS.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center gap-3 rounded-xl border border-black/10 dark:border-white/10 px-4 py-3"
                  >
                    <span className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center text-white shrink-0">
                      <f.icon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#17161B] dark:text-[#F3F1F7]">{f.name}</p>
                      <p className="text-xs text-[#4A4750] dark:text-[#8A8496] truncate">{f.hint}</p>
                    </div>
                    <Download size={15} className="ml-auto text-[#4A4750] dark:text-[#B7B2C6] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
