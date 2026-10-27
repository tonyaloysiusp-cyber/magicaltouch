'use client';

// Mockups: see the design in real life — framed on a wall, in a room, on a
// phone or laptop, a T-shirt, mug, tote bag, business cards, a billboard —
// and download the picture. Everything is drawn in the browser.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, X, Sparkles } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { SCENES, Scene, renderMockup, shapeOf, MockupOpts } from '@/lib/mockups';

const WALLS = ['#E9E4DC', '#F4F1EA', '#DCE3E8', '#E8DCD3', '#D7E0D3', '#2F3136', '#F2D9DF', '#FFFFFF'];
const ACCENTS = ['#2B2B2B', '#FFFFFF', '#B8925A', '#6B4F3A', '#1F3A5F', '#C2185B', '#2E7D32', '#F2C94C'];
const GROUPS: Scene['group'][] = ['Rooms', 'Print', 'Screens', 'Merch'];

export function MockupStudio({ pages, onClose }: { pages: { id: string; name: string; render: () => Promise<string> }[]; onClose: () => void }) {
  useEscapeKey(onClose);
  const [pageId, setPageId] = useState(pages[0]?.id);
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<Scene | null>(null);
  const [big, setBig] = useState<string | null>(null);
  const [opts, setOpts] = useState<MockupOpts>({ bg: WALLS[0], accent: ACCENTS[0], shadow: true });
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState<Scene['group'] | 'All'>('All');
  const gen = useRef(0);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // The chosen page as a picture.
  useEffect(() => {
    const p = pagesRef.current.find((x) => x.id === pageId);
    if (!p) return;
    let live = true;
    setArt(null);
    setThumbs({});
    p.render().then((url) => {
      const img = new Image();
      img.onload = () => live && setArt(img);
      img.src = url;
    });
    return () => { live = false; };
  }, [pageId]);

  const shape = art ? shapeOf(art.width, art.height) : 'portrait';
  const scenes = useMemo(() => {
    const list = SCENES.filter((s) => group === 'All' || s.group === group);
    // Best matches for this design's shape first.
    return [...list].sort((a, b) => Number(b.fits.includes(shape)) - Number(a.fits.includes(shape)));
  }, [group, shape]);

  // Small previews, one after another so the page stays responsive.
  useEffect(() => {
    if (!art) return;
    const my = ++gen.current;
    (async () => {
      for (const s of SCENES) {
        if (gen.current !== my) return;
        try {
          const c = await renderMockup(s, art, opts, 420);
          if (gen.current !== my) return;
          const url = c.toDataURL('image/jpeg', 0.82);
          setThumbs((t) => ({ ...t, [s.id]: url }));
        } catch {}
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
  }, [art, opts]);

  // Large preview of the chosen scene.
  useEffect(() => {
    if (!art || !sel) return;
    let live = true;
    setBig(null);
    renderMockup(sel, art, opts, 1200).then((c) => live && setBig(c.toDataURL('image/jpeg', 0.9)));
    return () => { live = false; };
  }, [art, sel, opts]);

  const download = async (fmt: 'png' | 'jpg') => {
    if (!art || !sel) return;
    setBusy(true);
    try {
      const c = await renderMockup(sel, art, opts, 2400);
      const a = document.createElement('a');
      a.href = c.toDataURL(fmt === 'png' ? 'image/png' : 'image/jpeg', 0.92);
      a.download = `mockup-${sel.id}.${fmt}`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const swatch = (list: string[], value: string, set: (v: string) => void, label: string) => (
    <div>
      <p className="text-[11px] text-mt-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {list.map((c) => (
          <button key={c} type="button" aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => set(c)} className={`w-7 h-7 rounded-full ring-1 ring-black/15 ${value === c ? 'outline outline-2 outline-offset-2 outline-[#3B82C4]' : ''}`} style={{ background: c }} />
        ))}
        <input type="color" value={value} onChange={(e) => set(e.target.value)} aria-label={`Custom ${label}`} className="w-7 h-7 rounded-full border border-mt-border" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Mockups" className="bg-mt-surface text-mt-ink w-full h-full sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 h-14 border-b border-mt-border shrink-0">
          <h2 className="font-semibold inline-flex items-center gap-2 flex-1"><Sparkles size={17} className="text-mt-accent" /> Mockups</h2>
          {pages.length > 1 && (
            <select value={pageId} onChange={(e) => setPageId(e.target.value)} aria-label="Page" className="h-9 rounded-lg border border-mt-border bg-mt-surface px-2 text-sm">
              {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"><X size={18} /></button>
        </div>
        {sel ? (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            <div className="flex-1 min-h-0 bg-mt-surface2 flex items-center justify-center p-4">
              {big ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={big} alt={`${sel.name} mockup`} data-testid="mockup-large" className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
              ) : (
                <Loader2 className="animate-spin text-mt-faint" />
              )}
            </div>
            <aside className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-mt-border p-4 flex flex-col gap-4 overflow-y-auto">
              <button type="button" onClick={() => setSel(null)} className="text-[13px] text-mt-muted hover:text-mt-ink text-left">← All mockups</button>
              <p className="font-semibold">{sel.name}</p>
              {swatch(WALLS, opts.bg, (bg) => setOpts((o) => ({ ...o, bg })), sel.photo ? 'Background (not used in photo scenes)' : 'Background')}
              {swatch(ACCENTS, opts.accent, (accent) => setOpts((o) => ({ ...o, accent })), sel.id === 'tshirt' ? 'Shirt colour' : 'Frame / accent colour')}
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={opts.shadow} onChange={(e) => setOpts((o) => ({ ...o, shadow: e.target.checked }))} /> Soft shadow</label>
              <div className="mt-auto flex flex-col gap-2">
                <button type="button" disabled={busy || !big} onClick={() => download('png')} className="h-11 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PNG
                </button>
                <button type="button" disabled={busy || !big} onClick={() => download('jpg')} className="h-10 rounded-xl border border-mt-border text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  <Download size={15} /> Download JPG
                </button>
                <p className="text-[11px] text-mt-muted">Large, high-quality picture (2400 px wide) — ready for Instagram, your website or a client presentation.</p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              {(['All', ...GROUPS] as const).map((g) => (
                <button key={g} type="button" onClick={() => setGroup(g)} aria-pressed={group === g} className={`h-8 px-3 rounded-full text-[13px] border ${group === g ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{g}</button>
              ))}
            </div>
            {!art && <p className="text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Preparing your design…</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {scenes.map((s) => (
                <button key={s.id} type="button" onClick={() => setSel(s)} data-testid={`mockup-${s.id}`} className="text-left group">
                  <div className="rounded-2xl overflow-hidden border border-mt-border bg-mt-surface2 aspect-[4/3] flex items-center justify-center group-hover:border-mt-ink/30">
                    {thumbs[s.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[s.id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Loader2 size={16} className="animate-spin text-mt-faint" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[13px] font-medium">{s.name}{s.fits.includes(shape) && <span className="ml-1.5 text-[11px] text-emerald-600">Good fit</span>}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
