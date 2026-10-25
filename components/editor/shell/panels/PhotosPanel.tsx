'use client';

// Photos already used in Magical Touch templates, ready to reuse: search by
// subject (taken from the templates that use each photo), click to add to
// the page — or to fill the selected empty photo frame.

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PanelSection, SearchField } from '../ui';

export interface LibraryPhoto { file: string; src: string; thumb: string; w: number; h: number; uses: number; tags: string[]; templates: { name: string; slug: string }[] }

let cache: Promise<LibraryPhoto[]> | null = null;
export function loadPhotoLibrary(): Promise<LibraryPhoto[]> {
  if (!cache) {
    cache = fetch('/templates/photos/index.json')
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d) => (d.photos || []) as LibraryPhoto[])
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}

export function filterPhotos(all: LibraryPhoto[], q: string) {
  const n = q.trim().toLowerCase();
  if (!n) return [...all].sort((a, b) => b.uses - a.uses);
  return all.filter((p) => `${p.tags.join(' ')} ${p.templates.map((t) => t.name).join(' ')} ${p.file}`.toLowerCase().includes(n));
}

export function PhotosPanel({ onPick }: { onPick: (src: string) => void }) {
  const [all, setAll] = useState<LibraryPhoto[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { loadPhotoLibrary().then(setAll); }, []);
  const list = useMemo(() => filterPhotos(all || [], q), [all, q]);
  const quick = ['birthday', 'food', 'christmas', 'wedding', 'business', 'travel', 'fitness', 'real', 'kids', 'fashion'];
  return (
    <div className="flex flex-col gap-3">
      <SearchField value={q} onChange={setQ} placeholder="Search photos — food, wedding, office…" />
      <div className="flex flex-wrap gap-1.5">
        {quick.map((w) => (
          <button key={w} type="button" onClick={() => setQ(q === w ? '' : w)} className={`h-7 px-2.5 rounded-full border text-[12px] ${q === w ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{w === 'real' ? 'real estate' : w}</button>
        ))}
      </div>
      <PanelSection title={all ? `Photos from our templates (${list.length})` : 'Photos from our templates'}>
        {!all ? (
          <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-mt-faint" /></div>
        ) : list.length === 0 ? (
          <p className="text-[13px] text-mt-muted py-4">No photos match “{q}”.</p>
        ) : (
          <div className="columns-2 gap-2 [column-fill:_balance]">
            {list.map((p) => (
              <button
                key={p.file}
                type="button"
                onClick={() => onPick(p.src)}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/uri-list', new URL(p.src, window.location.origin).toString()); e.dataTransfer.setData('text/plain', new URL(p.src, window.location.origin).toString()); }}
                title={`${p.tags.slice(0, 4).join(', ')}${p.uses ? ` · used in ${p.uses} template${p.uses > 1 ? 's' : ''}` : ''}`}
                className="mb-2 block w-full rounded-xl overflow-hidden border border-mt-border hover:ring-2 hover:ring-[#3B82C4] break-inside-avoid"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt={p.tags.slice(0, 3).join(', ') || 'Photo'} loading="lazy" className="w-full h-auto block" style={{ aspectRatio: `${p.w} / ${p.h}` }} />
              </button>
            ))}
          </div>
        )}
      </PanelSection>
      <p className="text-[11px] text-mt-faint leading-snug">Free to use in your designs. Click to add, or select an empty photo frame first to fill it.</p>
    </div>
  );
}
