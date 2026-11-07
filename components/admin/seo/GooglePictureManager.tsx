'use client';

// Admin → SEO & Google → Google picture. The small picture Google shows next
// to magicaltouchdesign.com in search results (and on shared links).
// Upload or pick one, save, and change it whenever you like (weekly/monthly).

import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, ImagePlus, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EMPTY_PICTURE, GooglePicture, parseGooglePicture } from '@/lib/googlePicture';

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
const SITE = 'https://www.magicaltouchdesign.com';
const day = (s: string) => (s ? new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

async function toWebp(file: File): Promise<Blob> {
  // 1200 × 1200 max, square-friendly: Google crops the result picture to a square.
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1200 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read the picture'))), 'image/webp', 0.88));
}

export function GooglePictureManager({ flash }: { flash: (m: string) => void }) {
  const [saved, setSaved] = useState<GooglePicture>(EMPTY_PICTURE);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [designs, setDesigns] = useState<{ name: string; src: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'google_picture').maybeSingle().then(({ data }) => {
      const p = parseGooglePicture((data as any)?.value);
      setSaved(p); setUrl(p.url); setAlt(p.alt);
    });
    supabase.from('templates').select('name,preview,thumbnail').eq('status', 'published').eq('is_featured', true).order('sort_order').limit(12)
      .then(({ data }) => setDesigns(((data as any[]) || []).map((t) => ({ name: t.name, src: t.preview || t.thumbnail })).filter((t) => t.src)));
  }, []);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const blob = await toWebp(file);
      const path = `site/google/${Date.now()}.webp`;
      const { error } = await supabase.storage.from('template-media').upload(path, blob, { contentType: 'image/webp', upsert: false });
      if (error) throw error;
      setUrl(supabase.storage.from('template-media').getPublicUrl(path).data.publicUrl);
      if (!alt) setAlt('Magical Touch Design — free online design templates');
      flash('Picture uploaded. Press Save to use it.');
    } catch (e: any) {
      flash(e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const save = async (next: { url: string; alt: string }) => {
    const now = new Date().toISOString();
    const history = saved.url && saved.url !== next.url ? [{ url: saved.url, alt: saved.alt, from: saved.updated_at, to: now }, ...saved.history].slice(0, 24) : saved.history;
    const value: GooglePicture = { url: next.url, alt: next.alt.trim() || 'Magical Touch Design', updated_at: now, history };
    const { error } = await supabase.from('site_settings').upsert({ key: 'google_picture', value: JSON.stringify(value), updated_at: now });
    if (error) return flash(error.message);
    setSaved(value); setUrl(value.url); setAlt(value.alt);
    flash(next.url ? 'Saved. The site uses it within 10 minutes; Google shows it after its next visit (open Search Console → Request indexing to speed it up).' : 'Cleared — the site uses the standard share image again.');
  };

  const dirty = url !== saved.url || alt !== saved.alt;
  const ageDays = saved.updated_at ? Math.floor((Date.now() - new Date(saved.updated_at).getTime()) / 86400000) : null;

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold">Google picture</h2>
      <p className="mt-1 text-[13px] text-mt-muted max-w-3xl">The small picture Google shows next to <b>magicaltouchdesign.com</b> in search results, and on links shared in WhatsApp, Facebook or LinkedIn. Pick a design or upload your own. Change it every week or month — your choice.</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={busy} className={`${btn} bg-mt-primary text-mt-onprimary`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} Upload a picture</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }} />
            <button onClick={() => save({ url, alt })} disabled={!dirty || !url} className={`${btn} border border-mt-border`}><Check size={14} /> Save</button>
            {saved.url && <button onClick={() => save({ url: '', alt: '' })} className={`${btn} text-mt-muted`}><Trash2 size={14} /> Use the standard share image</button>}
          </div>
          <label className="mt-4 block text-[12px] text-mt-muted">Picture description (for Google and screen readers)
            <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={140} placeholder="Magical Touch Design — free poster and flyer templates" className="mt-1 w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink" />
          </label>

          {designs.length > 0 && <>
            <p className="mt-5 text-[13px] font-semibold">Or use one of your featured designs</p>
            <ul className="mt-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
              {designs.map((d) => (
                <li key={d.src}>
                  <button onClick={() => { setUrl(d.src.startsWith('http') ? d.src : `${SITE}${d.src}`); setAlt(`${d.name} — free template by Magical Touch Design`); }} className={`block w-full aspect-square rounded-xl overflow-hidden border-2 ${url.endsWith(d.src) ? 'border-mt-primary' : 'border-transparent'}`} title={d.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.src} alt={d.name} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </>}

          <div className="mt-5 rounded-2xl bg-mt-surface2 p-4 text-[12.5px] text-mt-muted leading-relaxed">
            <p className="font-semibold text-mt-ink">Good to know</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Google chooses the picture itself, but it follows this one: it is set as the page’s main picture, share picture and structured data. The home-page film is hidden from Google, so it can no longer pick a person from the film.</li>
              <li>A design or logo on a plain background works best. Square or 4:3, at least 600 px.</li>
              <li>After saving, open <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-[#3B82C4] inline-flex items-center gap-0.5">Search Console <ExternalLink size={11} /></a>, inspect <b>https://www.magicaltouchdesign.com/</b> and tap <b>Request indexing</b>. Google usually updates in a few days.</li>
            </ul>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-mt-muted uppercase tracking-wide">How it looks on Google</p>
          <div className="mt-2 rounded-2xl border border-mt-border bg-white p-4 text-[#202124]">
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[12px]">magicaltouchdesign.com</p>
                <p className="text-[11px] text-[#4d5156]">https://www.magicaltouchdesign.com</p>
                <p className="mt-1 text-[16px] leading-snug text-[#1a0dab]">Magical Touch Design: Free Online Design Tool & Templates</p>
                <p className="mt-1 text-[12px] text-[#4d5156] line-clamp-3">Design anything. Make it magical. Start from professional templates or a blank canvas…</p>
              </div>
              <div className="w-[86px] h-[86px] shrink-0 rounded-lg overflow-hidden bg-[#f1f3f4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <img src="/api/og" alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-mt-faint">{saved.url ? <>In use since {day(saved.updated_at)}{ageDays !== null && ageDays >= 30 ? ` — ${ageDays} days, time for a fresh one?` : ''}</> : 'Not set — the standard share image is used.'}</p>

          {saved.history.length > 0 && <>
            <p className="mt-4 text-[12px] font-semibold text-mt-muted uppercase tracking-wide">Earlier pictures</p>
            <ul className="mt-2 grid grid-cols-4 gap-2">
              {saved.history.slice(0, 8).map((h) => (
                <li key={h.url + h.to} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.url} alt={h.alt} className="w-full aspect-square object-cover rounded-lg" />
                  <button onClick={() => { setUrl(h.url); setAlt(h.alt); }} title={`${day(h.from)} – ${day(h.to)} · use again`} className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 group-hover:bg-black/40 text-white opacity-0 group-hover:opacity-100"><RotateCcw size={16} /></button>
                </li>
              ))}
            </ul>
          </>}
        </div>
      </div>
    </section>
  );
}
