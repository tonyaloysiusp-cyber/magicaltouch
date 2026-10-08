'use client';

import { useEffect, useRef, useState } from 'react';
import { UploadCloud, ImagePlus, Loader2 } from 'lucide-react';
import { listUserAssets } from '@/lib/storage/assets';
import { PanelSection } from '../ui';

export interface SessionUpload {
  id: string;
  url: string; // data: or https:
}

export function UploadsPanel({
  sessionUploads,
  onFiles,
  onUse,
}: {
  sessionUploads: SessionUpload[];
  onFiles: (files: File[]) => void;
  onUse: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<{ id: string; url: string }[] | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    let alive = true;
    listUserAssets()
      .then((list) => alive && setSaved(list))
      .catch(() => alive && setSaved([]));
    return () => {
      alive = false;
    };
  }, []);

  const drag = (url: string) => (e: React.DragEvent) => e.dataTransfer.setData('application/x-mt-asset', `image:${url}`);
  const grid = (items: { id: string; url: string }[]) => (
    <div className="columns-2 gap-2 [&>*]:mb-2">
      {items.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onUse(u.url)}
          draggable
          onDragStart={drag(u.url)}
          title="Add to page (or drag onto a frame)"
          className="block w-full rounded-xl overflow-hidden ring-1 ring-mt-border hover:ring-2 hover:ring-[#8CCBFF] bg-mt-surface2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u.url} alt="" loading="lazy" className="w-full h-auto block" />
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const files = (Array.from(e.dataTransfer.files || []) as File[]).filter((f) => f.type.startsWith('image/'));
          if (files.length) onFiles(files);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${over ? 'border-[#8CCBFF] bg-mt-accentsoft' : 'border-mt-border'}`}
      >
        <UploadCloud className="mx-auto text-mt-accent" size={28} />
        <p className="mt-2 text-sm font-medium text-mt-ink">Drop photos here</p>
        <p className="text-xs text-mt-muted">JPG, PNG, WebP or GIF from your computer, iPad or phone</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold"
        >
          <ImagePlus size={16} /> Upload photos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []) as File[];
            e.target.value = '';
            if (files.length) onFiles(files);
          }}
        />
      </div>
      <p className="text-[11px] text-mt-faint mt-2">Tip: paste a screenshot with Ctrl/Cmd+V, or drag a photo straight onto a frame to fill it.</p>
      {sessionUploads.length > 0 && (
        <div className="mt-5">
          <PanelSection title="Just added">{grid(sessionUploads)}</PanelSection>
        </div>
      )}
      <div className="mt-5">
        <PanelSection title="Your uploads">
          {saved === null ? (
            <p className="text-xs text-mt-muted inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading your photos…
            </p>
          ) : saved.length ? (
            grid(saved)
          ) : (
            <p className="text-xs text-mt-muted">Photos you upload appear here so you can use them in any design.</p>
          )}
        </PanelSection>
      </div>
    </div>
  );
}
