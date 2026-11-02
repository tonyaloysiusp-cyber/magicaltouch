'use client';

// Free background remover (/remove-background): drop one photo or many,
// every background is removed right here in the browser (the photos are
// never uploaded), then save them one by one, all in a ZIP, or straight
// into a folder on your device.

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FolderDown, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { detectSubject, refinedMaskCanvas, composeCutout, DEFAULT_REFINE, SubjectMask } from '@/lib/editor/bgRemove';
import { makeZip } from '@/lib/zipStore';

type Bg = 'none' | 'white' | 'color';
interface Item { id: string; file: File; name: string; src: string; img?: HTMLImageElement; mask?: SubjectMask; out?: string; status: 'waiting' | 'working' | 'done' | 'error'; error?: string }
const MAX = 60;
const CHECKER = 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 18px 18px';

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('This file could not be opened as a picture.')); i.src = src; });
const baseName = (n: string) => n.replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim() || 'photo';

export function BulkRemover() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [soft, setSoft] = useState(DEFAULT_REFINE.softness);
  const [bg, setBg] = useState<Bg>('none');
  const [color, setColor] = useState('#FFFFFF');
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);
  const running = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const render = useCallback((it: Item): string | undefined => {
    if (!it.img || !it.mask) return undefined;
    const m = refinedMaskCanvas(it.mask, { ...DEFAULT_REFINE, softness: soft });
    const cut = composeCutout(it.img, m, undefined, 4096);
    if (bg === 'none') return cut.toDataURL('image/png');
    const c = document.createElement('canvas');
    c.width = cut.width; c.height = cut.height;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = bg === 'white' ? '#FFFFFF' : color;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(cut, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  }, [soft, bg, color]);

  // Re-draw finished pictures when the edge or background changes.
  useEffect(() => {
    setItems((list) => list.map((it) => (it.status === 'done' ? { ...it, out: render(it) } : it)));
  }, [render]);

  const work = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (;;) {
        const next = itemsRef.current.find((i) => i.status === 'waiting');
        if (!next) break;
        itemsRef.current = itemsRef.current.map((i) => (i.id === next.id ? { ...i, status: 'working' } : i));
        setItems((l) => l.map((i) => (i.id === next.id ? { ...i, status: 'working' } : i)));
        try {
          const img = await loadImg(next.src);
          const mask = await detectSubject(img, (s) => setStatus(s));
          const done: Item = { ...next, img, mask, status: 'done' };
          done.out = render(done);
          setItems((l) => l.map((i) => (i.id === next.id ? done : i)));
        } catch (e: any) {
          const msg = /ort-|fetch|network/i.test(String(e?.message)) ? 'The remover could not load — check your internet connection and try again.' : String(e?.message || e);
          setItems((l) => l.map((i) => (i.id === next.id ? { ...i, status: 'error', error: msg } : i)));
        }
      }
    } finally {
      running.current = false;
      setStatus(null);
    }
  }, [render]);

  const add = (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => /^image\/(png|jpe?g|webp|bmp|gif)$/i.test(f.type));
    const room = MAX - itemsRef.current.length;
    const fresh: Item[] = list.slice(0, Math.max(0, room)).map((f) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file: f, name: baseName(f.name), src: URL.createObjectURL(f), status: 'waiting' }));
    if (!fresh.length) return;
    itemsRef.current = [...itemsRef.current, ...fresh];
    setItems(itemsRef.current);
    setTimeout(work, 0);
  };
  const remove = (id: string) => setItems((l) => { const it = l.find((i) => i.id === id); if (it) URL.revokeObjectURL(it.src); return l.filter((i) => i.id !== id); });
  const clear = () => { items.forEach((i) => URL.revokeObjectURL(i.src)); setItems([]); };

  const ext = bg === 'none' ? 'png' : 'jpg';
  const fileOf = (it: Item) => `${it.name}-no-bg.${ext}`;
  const bytes = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer());
  const done = items.filter((i) => i.status === 'done' && i.out);

  const saveOne = (it: Item) => { if (!it.out) return; const a = document.createElement('a'); a.href = it.out; a.download = fileOf(it); a.click(); };
  const saveZip = async () => {
    setSaving(true);
    try {
      const used = new Set<string>();
      const files = await Promise.all(done.map(async (it) => {
        let n = fileOf(it); let k = 2;
        while (used.has(n)) n = `${it.name}-no-bg-${k++}.${ext}`;
        used.add(n);
        return { name: n, data: await bytes(it.out!) };
      }));
      const url = URL.createObjectURL(makeZip(files));
      const a = document.createElement('a'); a.href = url; a.download = 'backgrounds-removed.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally { setSaving(false); }
  };
  const canFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  const saveFolder = async () => {
    try {
      const dir = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setSaving(true);
      for (const it of done) {
        const fh = await dir.getFileHandle(fileOf(it), { create: true });
        const w = await fh.createWritable(); await w.write(await bytes(it.out!)); await w.close();
      }
      setStatus(`Saved ${done.length} picture${done.length > 1 ? 's' : ''} to your folder.`);
      setTimeout(() => setStatus(null), 4000);
    } catch { /* cancelled */ } finally { setSaving(false); }
  };

  const busy = items.some((i) => i.status === 'working' || i.status === 'waiting');

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-colors ${drag ? 'border-[#35C2F1] bg-[#35C2F1]/5' : 'border-mt-border bg-mt-surface'}`}
      >
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        <button onClick={() => input.current?.click()} className="h-12 px-6 rounded-full bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center gap-2"><ImagePlus size={18} /> Choose photos</button>
        <p className="mt-3 text-[14px] text-mt-muted">or drop them here — up to {MAX} at once. JPG, PNG or WEBP.</p>
        <p className="mt-1 text-[12.5px] text-mt-faint">Your photos stay on your device. Nothing is uploaded or stored by us.</p>
      </div>

      {items.length > 0 && (
        <div className="rounded-3xl border border-mt-border bg-mt-surface p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-mt-muted">Background</span>
              {([['none', 'Transparent'], ['white', 'White'], ['color', 'Colour']] as const).map(([id, l]) => (
                <button key={id} onClick={() => setBg(id)} className={`h-8 px-3 rounded-full border ${bg === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>
              ))}
              {bg === 'color' && <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 rounded border border-mt-border" aria-label="Background colour" />}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-mt-muted">Edge
              <input type="range" min={0.05} max={0.8} step={0.05} value={soft} onChange={(e) => setSoft(Number(e.target.value))} className="w-28" />
              <span className="text-mt-faint">{soft < 0.25 ? 'sharp' : soft < 0.5 ? 'natural' : 'soft'}</span>
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={saveZip} disabled={!done.length || saving} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40">{saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download all ({done.length})</button>
              {canFolder && <button onClick={saveFolder} disabled={!done.length || saving} className="h-9 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"><FolderDown size={14} /> Save to a folder</button>}
              <button onClick={clear} className="h-9 px-3 rounded-full border border-mt-border text-[13px] text-mt-muted inline-flex items-center gap-1.5"><Trash2 size={14} /> Clear</button>
            </div>
          </div>
          {(status || busy) && <p className="text-[13px] text-mt-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {status || 'Working…'} ({done.length}/{items.length})</p>}
          <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it) => (
              <li key={it.id} className="rounded-2xl border border-mt-border overflow-hidden flex flex-col">
                <div className="relative aspect-square grid place-items-center" style={{ background: it.status === 'done' && bg === 'none' ? CHECKER : 'var(--mt-surface2, #f4f4f5)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.out || it.src} alt={it.name} className={`max-h-full max-w-full object-contain ${it.status === 'done' ? '' : 'opacity-50'}`} />
                  {it.status === 'working' && <span className="absolute inset-0 grid place-items-center"><Loader2 size={26} className="animate-spin text-mt-ink" /></span>}
                  {it.status === 'waiting' && <span className="absolute bottom-2 left-2 text-[11px] px-2 py-0.5 rounded-full bg-black/60 text-white">Waiting</span>}
                  <button onClick={() => remove(it.id)} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/55 text-white grid place-items-center" aria-label={`Remove ${it.name}`}><X size={14} /></button>
                </div>
                <div className="p-2.5 flex items-center gap-2">
                  <span className="flex-1 min-w-0 text-[12.5px] truncate" title={it.name}>{it.status === 'error' ? <span className="text-rose-600">{it.error}</span> : it.name}</span>
                  {it.status === 'done' && <><CheckCircle2 size={15} className="text-emerald-600 shrink-0" /><button onClick={() => saveOne(it)} className="h-8 px-3 rounded-full border border-mt-border text-[12px] font-semibold inline-flex items-center gap-1"><Download size={12} /> {ext.toUpperCase()}</button></>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
