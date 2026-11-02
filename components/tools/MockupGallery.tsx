'use client';

// /mockups — every mockup shows the visitor's own design or logo. Pictures
// are made right here in the browser (nothing is uploaded). Open one large,
// download it, or pick several and download them as a ZIP or one
// presentation PDF.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, Download, FileDown, ImagePlus, Loader2, Square, X } from 'lucide-react';
import { PRO_SCENES, PRO_GROUPS, ProScene, renderPro, Art } from '@/lib/mockupsPro';
import { makeZip } from '@/lib/zipStore';

const SAMPLE = '/templates/collection/mtd-promo-instagram-launch-post-preview-b2.jpg';
type Mode = 'design' | 'logo';

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('This file could not be opened as a picture.')); i.src = src; });

/** A logo becomes a clean square design: the logo centred on a colour. */
function logoArt(logo: HTMLImageElement, bg: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 1500;
  const x = c.getContext('2d')!;
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  const k = Math.min((c.width * 0.62) / logo.width, (c.height * 0.4) / logo.height);
  x.drawImage(logo, (c.width - logo.width * k) / 2, (c.height - logo.height * k) / 2, logo.width * k, logo.height * k);
  return c;
}
const dataUrlBytes = async (u: string) => new Uint8Array(await (await fetch(u)).arrayBuffer());

export function MockupGallery() {
  const [mode, setMode] = useState<Mode>('design');
  const [src, setSrc] = useState<string>(SAMPLE);
  const [own, setOwn] = useState(false);
  const [logoBg, setLogoBg] = useState('#FFFFFF');
  const [art, setArt] = useState<Art | null>(null);
  const [group, setGroup] = useState<string>('All');
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<{ scene: ProScene; url: string | null } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const gen = useRef(0);

  // Build the art whenever the picture, mode or logo colour changes.
  useEffect(() => {
    let live = true;
    loadImg(src).then((img) => { if (live) setArt(mode === 'logo' ? logoArt(img, logoBg) : img); }).catch((e) => setError(e.message));
    return () => { live = false; };
  }, [src, mode, logoBg]);

  // Draw every thumbnail, one after another, whenever the art changes.
  useEffect(() => {
    if (!art) return;
    const my = ++gen.current;
    setThumbs({});
    (async () => {
      for (const s of PRO_SCENES) {
        if (gen.current !== my) return;
        try {
          const c = await renderPro(s, art, 520);
          if (gen.current !== my) return;
          const url = c.toDataURL('image/jpeg', 0.82);
          setThumbs((t) => ({ ...t, [s.id]: url }));
        } catch { /* a photo that failed to load — skip */ }
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
  }, [art]);

  const list = useMemo(() => PRO_SCENES.filter((s) => group === 'All' || s.group === group), [group]);
  const counts = useMemo(() => Object.fromEntries(PRO_GROUPS.map((g) => [g, PRO_SCENES.filter((s) => s.group === g).length])), []);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) return setError('Please choose a picture (PNG, JPG, WEBP or SVG).');
    setError(null);
    setSrc(URL.createObjectURL(f));
    setOwn(true);
  };
  const big = useCallback(async (s: ProScene) => (art ? renderPro(s, art, 1600) : null), [art]);
  const openOne = async (s: ProScene) => {
    setOpen({ scene: s, url: null });
    const c = await big(s);
    if (c) setOpen({ scene: s, url: c.toDataURL('image/jpeg', 0.92) });
  };
  const save = (url: string, name: string) => { const a = document.createElement('a'); a.href = url; a.download = name; a.click(); };
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const chosen = () => PRO_SCENES.filter((s) => picked.has(s.id));

  const zip = async () => {
    setBusy('Preparing your ZIP…');
    try {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const s of chosen()) { const c = await big(s); if (c) files.push({ name: `mockup-${s.id}.jpg`, data: await dataUrlBytes(c.toDataURL('image/jpeg', 0.92)) }); }
      const url = URL.createObjectURL(makeZip(files)); save(url, 'mockups.zip'); setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally { setBusy(null); }
  };
  const pdf = async () => {
    setBusy('Making your presentation…');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1600, 900], hotfixes: ['px_scaling'] });
      const sel = chosen();
      // cover
      doc.setFillColor(9, 9, 11); doc.rect(0, 0, 1600, 900, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(64); doc.text('Mockups', 120, 380);
      doc.setFontSize(28); doc.setTextColor(200, 200, 210); doc.text(`${sel.length} presentation${sel.length > 1 ? 's' : ''} of your design`, 120, 450);
      if (art) { const c = document.createElement('canvas'); const k = Math.min(520 / art.width, 620 / art.height); c.width = art.width * k; c.height = art.height * k; c.getContext('2d')!.drawImage(art, 0, 0, c.width, c.height); doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 1480 - c.width, 450 - c.height / 2, c.width, c.height); }
      doc.setFontSize(18); doc.setTextColor(150, 150, 160); doc.text('Made with magicaltouchdesign.com', 120, 820);
      for (const s of sel) {
        const c = await big(s); if (!c) continue;
        doc.addPage([1600, 900], 'landscape');
        doc.setFillColor(245, 244, 241); doc.rect(0, 0, 1600, 900, 'F');
        const k = Math.min(1440 / c.width, 760 / c.height), w = c.width * k, h = c.height * k;
        doc.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', (1600 - w) / 2, 40 + (760 - h) / 2, w, h);
        doc.setFontSize(20); doc.setTextColor(60, 60, 66); doc.text(s.name, 80, 860);
      }
      doc.save('mockup-presentation.pdf');
    } finally { setBusy(null); }
  };

  const ready = Object.keys(thumbs).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl border border-mt-border bg-mt-surface p-4 sm:p-5 flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Your design" className="h-20 w-20 rounded-xl object-contain bg-mt-surface2 border border-mt-border" />
        <div className="flex-1 min-w-[220px]">
          <p className="text-[15px] font-semibold">{own ? 'Your picture is in every mockup' : 'Add your design or logo'}</p>
          <p className="text-[13px] text-mt-muted">It stays on your device — nothing is uploaded.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
            {([['design', 'Full design'], ['logo', 'Logo only']] as const).map(([id, l]) => (
              <button key={id} onClick={() => setMode(id)} className={`h-8 px-3 rounded-full border ${mode === id ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted'}`}>{l}</button>
            ))}
            {mode === 'logo' && <label className="inline-flex items-center gap-1.5 text-mt-muted">Background <input type="color" value={logoBg} onChange={(e) => setLogoBg(e.target.value)} className="h-8 w-10 rounded border border-mt-border" /></label>}
          </div>
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <button onClick={() => input.current?.click()} className="h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2"><ImagePlus size={17} /> {own ? 'Change picture' : 'Upload design or logo'}</button>
      </div>
      {error && <p className="text-[13px] text-rose-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {['All', ...PRO_GROUPS].map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={`h-9 px-3.5 rounded-full text-[13px] border ${group === g ? 'bg-mt-ink text-mt-bg border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink'}`}>{g} <span className="opacity-60">{g === 'All' ? PRO_SCENES.length : counts[g]}</span></button>
        ))}
        <span className="ml-auto text-[12.5px] text-mt-faint">{ready < PRO_SCENES.length ? <span className="inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Making mockups {ready}/{PRO_SCENES.length}</span> : `${PRO_SCENES.length} mockups ready`}</span>
      </div>

      {picked.size > 0 && (
        <div className="sticky top-16 z-20 rounded-2xl border border-mt-border bg-mt-surface/95 backdrop-blur p-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold flex-1">{picked.size} selected</span>
          <button onClick={zip} disabled={!!busy} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"><Download size={14} /> Download ZIP</button>
          <button onClick={pdf} disabled={!!busy} className="h-9 px-4 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"><FileDown size={14} /> Presentation PDF</button>
          <button onClick={() => setPicked(new Set())} className="h-9 px-3 rounded-full text-[13px] text-mt-muted">Clear</button>
          {busy && <span className="w-full text-[12.5px] text-mt-muted inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> {busy}</span>}
        </div>
      )}

      <ul className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {list.map((s) => {
          const on = picked.has(s.id);
          return (
            <li key={s.id} className={`group relative rounded-2xl overflow-hidden border ${on ? 'border-mt-ink ring-2 ring-mt-ink' : 'border-mt-border'} bg-mt-surface2`}>
              <button onClick={() => openOne(s)} className="block w-full" style={{ aspectRatio: String(s.aspect) }} aria-label={`Open ${s.name}`}>
                {thumbs[s.id] ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={thumbs[s.id]} alt={`${s.name} mockup`} className="w-full h-full object-cover" /> : <span className="w-full h-full grid place-items-center"><Loader2 size={18} className="animate-spin text-mt-faint" /></span>}
              </button>
              <button onClick={() => toggle(s.id)} className="absolute top-2 left-2 h-8 w-8 rounded-lg bg-white/90 text-mt-ink grid place-items-center shadow" aria-label={on ? 'Unselect' : 'Select'}>{on ? <CheckSquare size={16} /> : <Square size={16} />}</button>
              <p className="px-2.5 py-2 text-[12.5px] text-mt-muted truncate bg-mt-surface">{s.name}</p>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="fixed inset-0 z-[120] bg-black/70 grid place-items-center p-3" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-5xl rounded-3xl bg-mt-surface border border-mt-border p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="flex-1 text-[15px] font-semibold truncate">{open.scene.name}</p>
              {open.url && <button onClick={() => save(open.url!, `mockup-${open.scene.id}.jpg`)} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5"><Download size={14} /> Download</button>}
              <button onClick={() => setOpen(null)} className="h-9 w-9 rounded-full grid place-items-center hover:bg-mt-surface2" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-mt-surface2 grid place-items-center" style={{ aspectRatio: String(open.scene.aspect) }}>
              {open.url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={open.url} alt={`${open.scene.name} mockup`} className="w-full h-full object-contain" /> : <Loader2 size={24} className="animate-spin text-mt-faint" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
