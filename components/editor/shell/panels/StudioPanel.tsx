'use client';

// Admin-only "Studio" panel in the editor: the template-making tools in
// one place, kept simple.
//   1. Precision   rulers, grid and snapping on in one tap
//   2. All sizes   copies the page into the sizes you tick (new pages)
//   3. Colours     copies the page in professional colour palettes
//   4. Library     save any element once, drop it into any design
//   5. Publish     name, category, tags → live in the gallery
// Everything is checked again by the database (admins only).

import { useEffect, useState } from 'react';
import { Sparkles, Check, Crosshair, Layers, Loader2, Palette, Plus, Send, Trash2, BookmarkPlus, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchCategories, TemplateCategory } from '@/lib/templatesData';
import { cx } from '../ui';

export const STUDIO_SIZES = [
  { id: 'post', label: 'Square post', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait post', w: 1080, h: 1350 },
  { id: 'story', label: 'Story / Reel', w: 1080, h: 1920 },
  { id: 'a4', label: 'A4 print', w: 794, h: 1123 },
  { id: 'land', label: 'Landscape', w: 1920, h: 1080 },
  { id: 'yt', label: 'YouTube thumbnail', w: 1280, h: 720 },
  { id: 'fbcover', label: 'Facebook cover', w: 1640, h: 624 },
  { id: 'banner', label: 'Web banner', w: 1584, h: 396 },
];

export const STUDIO_PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Midnight & gold', colors: ['#14213D', '#FCA311', '#F3EDE2', '#FFFFFF'] },
  { name: 'Terracotta', colors: ['#9C4A2E', '#E9C46A', '#F4EDE4', '#2B2118'] },
  { name: 'Sage', colors: ['#5B7553', '#C9D6C0', '#F5F3EE', '#1F2A1F'] },
  { name: 'Ocean', colors: ['#0B3C5D', '#328CC1', '#D9E8F5', '#1D2731'] },
  { name: 'Blush', colors: ['#C97C85', '#F2D0D3', '#FFF7F5', '#3E2C2E'] },
  { name: 'Citrus pop', colors: ['#FF6B35', '#FFD166', '#FFF8E7', '#1E1B3A'] },
  { name: 'Black & white', colors: ['#111111', '#777777', '#EDEDED', '#FFFFFF'] },
  { name: 'Royal', colors: ['#3A0CA3', '#F72585', '#F1E9FF', '#10002B'] },
];

export interface StudioPublish {
  name: string;
  categoryId: string | null;
  categoryName: string;
  tags: string[];
  keywords: string;
  occasion: string;
  featured: boolean;
  publish: boolean;
  each: boolean;
}

interface LibItem { id: string; name: string; thumb: string | null; objects: any; created_at: string }

const head = 'text-[13px] font-semibold text-mt-ink flex items-center gap-1.5';
const hint = 'text-[12px] text-mt-muted leading-relaxed';
const field = 'w-full h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';
const btn = 'h-9 px-3 rounded-full text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-40';

export function StudioPanel({
  designName,
  pageCount,
  hasSelection,
  precisionOn,
  onPrecision,
  onMakeSizes,
  onColourVersions,
  onSaveToLibrary,
  onInsertFromLibrary,
  onPublish,
}: {
  designName: string;
  pageCount: number;
  hasSelection: boolean;
  precisionOn: boolean;
  onPrecision: (on: boolean) => void;
  onMakeSizes: (sizes: { label: string; w: number; h: number }[]) => Promise<void>;
  onColourVersions: (palettes: { name: string; colors: string[] }[]) => Promise<void>;
  onSaveToLibrary: (name: string) => Promise<string | null>;
  onInsertFromLibrary: (objects: any) => Promise<void>;
  onPublish: (o: StudioPublish) => Promise<{ ok: boolean; msg: string; links?: { name: string; slug?: string; id: string }[] }>;
}) {
  const [sizes, setSizes] = useState<Set<string>>(new Set(['post', 'story', 'a4']));
  const [pals, setPals] = useState<Set<string>>(new Set(['Midnight & gold', 'Sage', 'Blush']));
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cats, setCats] = useState<TemplateCategory[]>([]);
  const [lib, setLib] = useState<LibItem[] | null>(null);
  const [libName, setLibName] = useState('');
  const [pub, setPub] = useState<StudioPublish>({ name: designName, categoryId: null, categoryName: '', tags: [], keywords: '', occasion: '', featured: false, publish: true, each: false });
  const [tagText, setTagText] = useState('');
  const [result, setResult] = useState<{ ok: boolean; msg: string; links?: { name: string; slug?: string; id: string }[] } | null>(null);

  useEffect(() => {
    fetchCategories().then(setCats).catch(() => setCats([]));
    loadLib();
  }, []);
  useEffect(() => setPub((p) => ({ ...p, name: p.name || designName })), [designName]);

  const loadLib = async () => {
    const { data } = await supabase.from('admin_library').select('id, name, thumb, objects, created_at').order('created_at', { ascending: false }).limit(60);
    setLib((data as any) || []);
  };
  const toggle = (set: Set<string>, v: string, put: (s: Set<string>) => void) => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    put(n);
  };
  const run = async (key: string, fn: () => Promise<void>, done: string) => {
    setBusy(key);
    setNote(null);
    try {
      await fn();
      setNote(done);
    } catch (e: any) {
      setNote(e?.message || 'That did not work. Please try again.');
    }
    setBusy(null);
  };

  const parents = cats.filter((c) => !c.parentId);
  const childrenOf = (id: string) => cats.filter((c) => c.parentId === id);

  return (
    <div className="flex flex-col gap-5 pb-4">
      <p className={hint}>Admin tools for making templates. Customers never see this panel.</p>
      <a href="/admin/templates?claude=" target="_blank" rel="noreferrer" className={cx(btn, 'bg-gradient-to-r from-[#D97757] to-[#8B5CF6] text-white')}>
        <Sparkles size={14} /> Create a design with AI
      </a>
      {note && <p className="text-[12.5px] rounded-lg bg-mt-surface2 px-3 py-2 text-mt-ink" aria-live="polite">{note}</p>}

      {/* 1. precision */}
      <section className="flex flex-col gap-2">
        <h3 className={head}><Crosshair size={15} /> Precision mode</h3>
        <p className={hint}>Rulers, layout grid and snapping to objects and guides — for pixel-perfect alignment.</p>
        <button type="button" onClick={() => onPrecision(!precisionOn)} className={cx(btn, precisionOn ? 'bg-emerald-600 text-white' : 'border border-mt-border text-mt-ink')}>
          {precisionOn ? <><Check size={14} /> Precision on</> : 'Turn on precision'}
        </button>
      </section>

      {/* 2. sizes */}
      <section className="flex flex-col gap-2">
        <h3 className={head}><Layers size={15} /> One design → all sizes</h3>
        <p className={hint}>Copies this page into each size you tick, as new pages. Text and photos are re-arranged to fit; check each page, then publish.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STUDIO_SIZES.map((s) => (
            <label key={s.id} className={cx('flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[12px] cursor-pointer', sizes.has(s.id) ? 'border-[#3B82C4] bg-[#3B82C4]/5' : 'border-mt-border')}>
              <input type="checkbox" className="accent-[#3B82C4]" checked={sizes.has(s.id)} onChange={() => toggle(sizes, s.id, setSizes)} />
              <span><span className="block font-semibold text-mt-ink">{s.label}</span><span className="text-mt-faint">{s.w}×{s.h}</span></span>
            </label>
          ))}
        </div>
        <button type="button" disabled={!sizes.size || !!busy} onClick={() => run('sizes', () => onMakeSizes(STUDIO_SIZES.filter((s) => sizes.has(s.id))), `Made ${sizes.size} new size${sizes.size === 1 ? '' : 's'} — see the new pages.`)} className={cx(btn, 'bg-mt-primary text-mt-onprimary')}>
          {busy === 'sizes' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Make {sizes.size} size{sizes.size === 1 ? '' : 's'}
        </button>
      </section>

      {/* 3. colours */}
      <section className="flex flex-col gap-2">
        <h3 className={head}><Palette size={15} /> Colour versions</h3>
        <p className={hint}>Copies this page in each palette you tick. The design keeps its light and dark balance.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STUDIO_PALETTES.map((p) => (
            <button key={p.name} type="button" onClick={() => toggle(pals, p.name, setPals)} className={cx('rounded-lg border p-1.5 text-left', pals.has(p.name) ? 'border-[#3B82C4] bg-[#3B82C4]/5' : 'border-mt-border')} aria-pressed={pals.has(p.name)}>
              <span className="flex h-5 rounded overflow-hidden">{p.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
              <span className="mt-1 block text-[11.5px] font-medium text-mt-ink">{p.name}</span>
            </button>
          ))}
        </div>
        <button type="button" disabled={!pals.size || !!busy} onClick={() => run('pals', () => onColourVersions(STUDIO_PALETTES.filter((p) => pals.has(p.name))), `Made ${pals.size} colour version${pals.size === 1 ? '' : 's'} — see the new pages.`)} className={cx(btn, 'bg-mt-primary text-mt-onprimary')}>
          {busy === 'pals' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Make {pals.size} version{pals.size === 1 ? '' : 's'}
        </button>
      </section>

      {/* 4. library */}
      <section className="flex flex-col gap-2">
        <h3 className={head}><BookmarkPlus size={15} /> My library</h3>
        <p className={hint}>Save a selected element (logo lock-up, title style, frame layout…) and drop it into any design later.</p>
        <div className="flex gap-1.5">
          <input value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="Name, e.g. Gold title" className={field} />
          <button type="button" disabled={!hasSelection || !!busy} title={hasSelection ? 'Save the selection' : 'Select something on the page first'} onClick={() => run('lib', async () => {
            const err = await onSaveToLibrary(libName.trim() || 'Saved element');
            if (err) throw new Error(err);
            setLibName('');
            await loadLib();
          }, 'Saved to your library.')} className={cx(btn, 'bg-mt-primary text-mt-onprimary shrink-0')}>
            {busy === 'lib' ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
        </div>
        {!hasSelection && <p className="text-[11.5px] text-mt-faint">Select something on the page to save it.</p>}
        {lib === null ? (
          <p className={hint}><Loader2 size={13} className="inline animate-spin" /> Loading…</p>
        ) : lib.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {lib.map((it) => (
              <div key={it.id} className="group relative">
                <button type="button" onClick={() => run('ins', () => onInsertFromLibrary(it.objects), `Added “${it.name}”.`)} className="w-full aspect-square rounded-lg border border-mt-border bg-[repeating-conic-gradient(#f2f2f2_0_25%,#fff_0_50%)] bg-[length:14px_14px] overflow-hidden flex items-center justify-center" title={`Add “${it.name}”`}>
                  {it.thumb ? <img src={it.thumb} alt="" className="max-w-full max-h-full object-contain" /> : <span className="text-[11px] text-mt-muted px-1">{it.name}</span>}
                </button>
                <p className="mt-0.5 text-[10.5px] text-mt-muted truncate">{it.name}</p>
                <button type="button" aria-label={`Remove ${it.name}`} onClick={async () => { await supabase.from('admin_library').delete().eq('id', it.id); loadLib(); }} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/90 text-mt-muted hover:text-red-600 hidden group-hover:inline-flex items-center justify-center shadow">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11.5px] text-mt-faint">Nothing saved yet.</p>
        )}
      </section>

      {/* 5. publish */}
      <section className="flex flex-col gap-2 rounded-2xl border border-mt-border p-3">
        <h3 className={head}><Send size={15} /> Publish to the gallery</h3>
        <label className="text-[12px] text-mt-muted flex flex-col gap-1">Name<input className={field} value={pub.name} onChange={(e) => setPub({ ...pub, name: e.target.value })} /></label>
        <label className="text-[12px] text-mt-muted flex flex-col gap-1">Category
          <select className={field} value={pub.categoryId || ''} onChange={(e) => { const c = cats.find((x) => x.id === e.target.value); setPub({ ...pub, categoryId: c?.id || null, categoryName: c ? (c.parentId ? cats.find((p) => p.id === c.parentId)?.name || c.name : c.name) : '' }); }}>
            <option value="">Choose…</option>
            {parents.map((p) => (
              <optgroup key={p.id} label={p.name}>
                <option value={p.id}>{p.name}</option>
                {childrenOf(p.id).map((c) => <option key={c.id} value={c.id}>{p.name} › {c.name}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="text-[12px] text-mt-muted flex flex-col gap-1">Tags (comma separated)<input className={field} value={tagText} onChange={(e) => { setTagText(e.target.value); setPub({ ...pub, tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) }); }} placeholder="birthday, gold, elegant" /></label>
        <label className="text-[12px] text-mt-muted flex flex-col gap-1">Search words<input className={field} value={pub.keywords} onChange={(e) => setPub({ ...pub, keywords: e.target.value })} placeholder="what people type to find it" /></label>
        <label className="text-[12px] text-mt-muted flex flex-col gap-1">Occasion (optional)<input className={field} value={pub.occasion} onChange={(e) => setPub({ ...pub, occasion: e.target.value })} placeholder="e.g. Diwali, Wedding" /></label>
        <label className="flex items-center gap-2 text-[12.5px] text-mt-ink"><input type="checkbox" className="accent-[#3B82C4]" checked={pub.featured} onChange={(e) => setPub({ ...pub, featured: e.target.checked })} /> Feature it on the home page</label>
        {pageCount > 1 && (
          <div className="flex flex-col gap-1 text-[12.5px] text-mt-ink">
            <label className="flex items-center gap-2"><input type="radio" name="each" checked={!pub.each} onChange={() => setPub({ ...pub, each: false })} /> One template with all {pageCount} pages</label>
            <label className="flex items-center gap-2"><input type="radio" name="each" checked={pub.each} onChange={() => setPub({ ...pub, each: true })} /> Each page as its own template</label>
          </div>
        )}
        <div className="flex gap-1.5 mt-1">
          <button type="button" disabled={!pub.name.trim() || !pub.categoryId || !!busy} onClick={async () => { setBusy('pub'); setResult(await onPublish({ ...pub, publish: true })); setBusy(null); }} className={cx(btn, 'flex-1 bg-emerald-600 text-white')}>
            {busy === 'pub' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish
          </button>
          <button type="button" disabled={!pub.name.trim() || !pub.categoryId || !!busy} onClick={async () => { setBusy('pub'); setResult(await onPublish({ ...pub, publish: false })); setBusy(null); }} className={cx(btn, 'border border-mt-border text-mt-ink')}>
            Save draft
          </button>
        </div>
        {!pub.categoryId && <p className="text-[11.5px] text-mt-faint">Choose a category to publish.</p>}
        {result && (
          <div className={cx('rounded-lg px-3 py-2 text-[12.5px]', result.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300')}>
            <p>{result.msg}</p>
            {result.links?.map((l) => (
              <a key={l.id} href={l.slug ? `/templates/${l.slug}` : '/admin/templates'} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 font-semibold underline"><ExternalLink size={12} /> {l.name}</a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
