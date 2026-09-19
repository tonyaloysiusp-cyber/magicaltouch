'use client';

import {
  MousePointer2,
  PenTool,
  Type,
  Square,
  Circle,
  ImageIcon,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  ZoomIn,
  Eye,
  Lock,
  Paintbrush,
} from 'lucide-react';

const TOOLS = [MousePointer2, PenTool, Type, Square, Circle, ImageIcon];

const LAYERS = [
  { name: 'Headline text', icon: Type },
  { name: 'Logo mark', icon: Circle },
  { name: 'Background photo', icon: ImageIcon },
  { name: 'Gradient backdrop', icon: Square },
];

const SWATCHES = ['#EC1E79', '#8B6FC4', '#3FA9E8', '#4FC8C0', '#7ED33E', '#17161B', '#FFFFFF'];

// A CSS-only mockup of the actual Magical Touch editor — toolbar, layers,
// properties, canvas — built from the same visual language as the real
// app (artboards on a pasteboard, a layers list, alignment controls),
// not a generic empty screenshot placeholder.
export function WorkspacePreview() {
  return (
    <div className="relative">
      {/* Floating 3D brush badge — a creative-tool accent that sits outside
          the panel's corner, like a sticker on a laptop lid. It lives
          outside the panel's own overflow-hidden box so it isn't clipped.
          The layered inset shadows (light top, dark bottom) fake a glossy,
          beveled 3D form without an image asset. */}
      <div className="hidden sm:flex absolute -top-6 -right-6 z-10 w-16 h-16 rounded-2xl items-center justify-center rotate-6 hover:rotate-0 transition-transform duration-300 bg-gradient-to-br from-[#FF6F91] to-[#6C4FD1] shadow-[0_16px_28px_-8px_rgba(108,79,209,0.55),inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-6px_8px_rgba(0,0,0,0.25)]">
        <Paintbrush size={26} className="text-white drop-shadow-sm" strokeWidth={2} />
      </div>

      <div className="relative bg-white border border-black/10 shadow-[0_50px_100px_-40px_rgba(23,22,27,0.35)] rounded-xl overflow-hidden">
        {/* Glossy sheen — a soft diagonal highlight across the top of the
            panel, the classic glass/gloss treatment on an otherwise flat
            UI surface. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/50 to-transparent z-[1]" />

        {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 bg-[#FAF9F6]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
            <span className="w-2.5 h-2.5 rounded-full bg-black/10" />
          </div>
          <span className="ml-2 text-[11px] text-[#4A4750] font-medium">Summer Launch — Campaign</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-white px-3 py-1.5 rounded-full bg-brand-gradient">
          <Download size={11} /> Export
        </div>
      </div>

      <div className="flex h-[340px] sm:h-[400px]">
        {/* Left tool rail */}
        <div className="hidden sm:flex flex-col items-center gap-3 w-12 py-4 border-r border-black/10 bg-white">
          {TOOLS.map((Icon, i) => (
            <div
              key={i}
              className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                i === 0 ? 'bg-[#17161B] text-white' : 'text-[#4A4750]'
              }`}
            >
              <Icon size={15} />
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col bg-[#EDEBE5] relative">
          <div className="flex-1 flex items-center justify-center p-6 gap-4 overflow-hidden">
            {/* Business card — small, off to the side */}
            <div className="hidden md:flex flex-col items-center gap-1.5 shrink-0 opacity-70 scale-95">
              <div className="w-24 h-14 rounded-md shadow-md bg-white border border-black/10 p-2">
                <div className="w-6 h-6 rounded-full bg-[#17161B]" />
                <div className="mt-1.5 h-1 w-14 rounded-full bg-black/15" />
                <div className="mt-1 h-1 w-10 rounded-full bg-black/10" />
              </div>
              <span className="text-[9px] font-medium text-[#4A4750]">Business Card</span>
            </div>

            {/* Main active artboard — Instagram-post style */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-lg shadow-2xl overflow-hidden ring-2 ring-[#6C4FD1]">
                <div className="absolute inset-0 bg-brand-gradient opacity-90" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <span className="w-8 h-8 rounded-full bg-white/90 mb-2" />
                  <span className="text-white font-[family-name:var(--font-display)] italic text-sm sm:text-base leading-tight">
                    Make it magical
                  </span>
                  <span className="mt-1.5 text-[9px] text-white/80 tracking-wide uppercase">Summer Collection</span>
                </div>
              </div>
              <span className="text-[9px] font-semibold text-[#17161B] bg-white px-2 py-0.5 rounded-full shadow-sm">
                Instagram Post
              </span>
            </div>

            {/* Poster — tall, off to the side */}
            <div className="hidden md:flex flex-col items-center gap-1.5 shrink-0 opacity-70 scale-95">
              <div className="w-16 h-28 rounded-md shadow-md overflow-hidden">
                <div className="w-full h-full bg-gradient-to-b from-[#3FA9E8] to-[#4FC8C0] flex items-end p-1.5">
                  <div className="h-1 w-full rounded-full bg-white/70" />
                </div>
              </div>
              <span className="text-[9px] font-medium text-[#4A4750]">Poster</span>
            </div>
          </div>

          {/* Artboard filmstrip, like the real multi-artboard pasteboard */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-black/10 bg-white/70">
            <div className="w-6 h-6 rounded bg-[#6C4FD1] ring-2 ring-[#17161B] shrink-0" />
            <div className="w-6 h-6 rounded bg-[#EC1E79]/70 shrink-0" />
            <div className="w-4 h-6 rounded bg-[#3FA9E8]/70 shrink-0" />
            <div className="w-6 h-4 rounded bg-[#7ED33E]/70 shrink-0" />
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#4A4750]">
              <ZoomIn size={11} /> 100%
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="hidden lg:flex flex-col w-52 border-l border-black/10 bg-white text-[11px]">
          <div className="px-3 py-2.5 border-b border-black/10 flex items-center gap-1.5 text-[#4A4750] font-semibold">
            <Layers size={12} /> Layers
          </div>
          <div className="flex-1 overflow-hidden">
            {LAYERS.map((l, i) => (
              <div
                key={l.name}
                className={`flex items-center gap-2 px-3 py-2 ${i === 0 ? 'bg-[#F7F5F0]' : ''}`}
              >
                <l.icon size={12} className="text-[#4A4750] shrink-0" />
                <span className="truncate text-[#17161B]">{l.name}</span>
                <Eye size={11} className="ml-auto text-[#4A4750]/50 shrink-0" />
                <Lock size={10} className="text-[#4A4750]/30 shrink-0" />
              </div>
            ))}
          </div>
          <div className="border-t border-black/10 px-3 py-2.5">
            <p className="text-[#4A4750] font-semibold mb-1.5">Fill</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SWATCHES.map((c) => (
                <span key={c} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />
              ))}
            </div>
            <p className="text-[#4A4750] font-semibold mb-1.5">Align</p>
            <div className="flex gap-1.5 text-[#4A4750]">
              <AlignLeft size={13} />
              <AlignCenter size={13} />
              <AlignRight size={13} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
