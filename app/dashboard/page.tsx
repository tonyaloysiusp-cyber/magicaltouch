'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { MoreVertical, Pencil, Copy, Download, Trash2, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';
import { DesignLimitDialog } from '@/components/DesignLimitDialog';
import { MAX_DESIGNS, getOrCreateProfile } from '@/lib/profile';
import { allFontFacesCSS, ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const RECENT_COUNT = 6;

interface Design {
  id: string;
  name: string;
  width: number;
  height: number;
  updated_at: string;
  thumbnail: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNewDesignClick = (e: React.MouseEvent) => {
    if (designs.length >= MAX_DESIGNS) {
      e.preventDefault();
      setShowLimitWarning(true);
    }
  };

  // Lets the Photo Editor be used on its own, independent of manually
  // building a Main Design document first — this drops straight into
  // /editor with ?newPhoto=1, which prompts an image upload immediately
  // and opens the Photo Editor on it as soon as that lands (see
  // app/editor/page.tsx's startInPhotoEditor handling). Same design-count
  // limit as "+ New Design" since it becomes a real saved design too.
  const goToNewPhotoProject = () => {
    if (designs.length >= MAX_DESIGNS) {
      setShowLimitWarning(true);
      return;
    }
    router.push(`/editor?w=1200&h=1200&newTab=${Date.now()}&newPhoto=1`);
  };

  const fetchDesigns = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?next=/dashboard');
      return;
    }

    getOrCreateProfile(user.id, user.email?.split('@')[0]).then((p) => {
      if (p?.name) setDisplayName(p.name);
    });

    const { data, error } = await supabase
      .from('designs')
      .select('id, name, width, height, updated_at, thumbnail')
      .order('updated_at', { ascending: false });

    if (error) {
      // The thumbnail column may not exist yet on a database that predates
      // this feature — fall back to the columns that definitely do, rather
      // than showing the whole dashboard as broken.
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('designs')
        .select('id, name, width, height, updated_at')
        .order('updated_at', { ascending: false });
      if (fallbackError) {
        console.error('Failed to fetch designs:', fallbackError);
      } else {
        setDesigns((fallbackData || []).map((d) => ({ ...d, thumbnail: null })));
      }
    } else {
      setDesigns(data || []);
      backfillMissingThumbnails(data || []);
    }
    setLoading(false);
  };

  // The `thumbnail` column (and the code that populates it on save) only
  // exist as of a later round than most already-saved designs, so plenty
  // of real rows have canvas_json but no thumbnail and never will unless
  // someone opens and re-saves them by hand. Rather than requiring that,
  // silently render one for each such design the first time any dashboard
  // load turns them up — an off-screen Fabric canvas, not a screenshot of
  // anything on screen, using the exact same artboard-cropping logic the
  // editor's own save flow uses for a freshly-made thumbnail.
  const backfillMissingThumbnails = async (list: Design[]) => {
    const missing = list.filter((d) => !d.thumbnail);
    if (!missing.length) return;
    const F = (await import('fabric')).fabric;
    for (const design of missing) {
      try {
        const { data: full, error } = await supabase
          .from('designs')
          .select('canvas_json, width, height')
          .eq('id', design.id)
          .single();
        if (error || !full?.canvas_json) continue;

        const thumbnail = await new Promise<string | null>((resolve) => {
          const canvas = new F.StaticCanvas(null, { width: full.width, height: full.height });
          canvas.loadFromJSON(full.canvas_json, async () => {
            try {
              await ensureFontsLoadedForCanvasJSON(full.canvas_json);
              const ab = canvas.getObjects().find((o: any) => o.__isArtboard) as any;
              const rect = ab
                ? { left: ab.left, top: ab.top, width: (ab.width || 0) * (ab.scaleX || 1), height: (ab.height || 0) * (ab.scaleY || 1) }
                : { left: 0, top: 0, width: full.width, height: full.height };
              canvas.renderAll();
              const THUMB_WIDTH = 400;
              const multiplier = THUMB_WIDTH / Math.max(rect.width, 1);
              resolve(canvas.toDataURL({ format: 'jpeg', quality: 0.7, ...rect, multiplier }));
            } catch (err) {
              console.error('Thumbnail backfill render failed:', err);
              resolve(null);
            } finally {
              canvas.dispose();
            }
          });
        });
        if (!thumbnail) continue;

        const { error: updateError } = await supabase.from('designs').update({ thumbnail }).eq('id', design.id);
        if (updateError) {
          // Column genuinely missing (migration not applied yet) or some
          // other write failure -- either way, stop trying the rest of
          // this batch rather than repeating the same failure per design.
          console.error('Thumbnail backfill save failed:', updateError.message);
          break;
        }
        setDesigns((prev) => prev.map((d) => (d.id === design.id ? { ...d, thumbnail } : d)));
      } catch (err) {
        console.error('Thumbnail backfill failed for', design.id, err);
      }
    }
  };

  useEffect(() => {
    fetchDesigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const deleteDesign = async (id: string) => {
    const confirmed = window.confirm('Delete this design? This cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase.from('designs').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete design:', error);
      alert('Failed to delete design.');
      return;
    }

    setDesigns((prev) => prev.filter((d) => d.id !== id));
  };

  const renameDesign = async (id: string, name: string) => {
    const trimmed = name.trim();
    setRenamingId(null);
    if (!trimmed) return;
    const prev = designs;
    setDesigns((ds) => ds.map((d) => (d.id === id ? { ...d, name: trimmed } : d)));
    const { error } = await supabase.from('designs').update({ name: trimmed }).eq('id', id);
    if (error) {
      console.error('Failed to rename design:', error);
      alert('Failed to rename design.');
      setDesigns(prev);
    }
  };

  const duplicateDesign = async (design: Design) => {
    setMenuOpenId(null);
    setBusyId(design.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusyId(null);
      return;
    }
    const { data: full, error: fetchError } = await supabase
      .from('designs')
      .select('canvas_json, width, height')
      .eq('id', design.id)
      .single();
    if (fetchError || !full) {
      console.error('Failed to load design to duplicate:', fetchError);
      alert('Failed to duplicate design.');
      setBusyId(null);
      return;
    }
    const { data: created, error: insertError } = await supabase
      .from('designs')
      .insert({
        user_id: user.id,
        name: `${design.name} copy`,
        canvas_json: full.canvas_json,
        width: full.width,
        height: full.height,
        thumbnail: design.thumbnail,
        updated_at: new Date().toISOString(),
      })
      .select('id, name, width, height, updated_at, thumbnail')
      .single();
    setBusyId(null);
    if (insertError || !created) {
      console.error('Failed to duplicate design:', insertError);
      alert('Failed to duplicate design.');
      return;
    }
    setDesigns((prev) => [created, ...prev]);
  };

  return (
    <main className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] min-h-screen bg-[#F7F5F0]`}>
      {/* Same same-origin font-face proxy the editor declares -- the
          off-screen thumbnail backfill above needs these @font-face rules
          present somewhere in the document for document.fonts.load() to
          find anything to load. dangerouslySetInnerHTML (not a JSX text
          child) because this string is large enough that React's
          streaming SSR can flush it in multiple chunks, which then fails
          hydration's server/client text comparison on a plain child. */}
      <style dangerouslySetInnerHTML={{ __html: allFontFacesCSS() }} />

      <header className="sticky top-0 z-40 bg-[#F7F5F0]/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" title="Go to homepage" className="shrink-0">
            <Image src="/logo.png" alt="Magical Touch" width={150} height={30} />
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="text-sm font-medium text-[#4A4750] hover:text-[#17161B] px-3 py-2">
              Home
            </Link>
            <Link href="/templates" className="text-sm font-medium text-[#4A4750] hover:text-[#17161B] px-3 py-2">
              Templates
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-[#4A4750] hover:text-[#17161B] px-3 py-2">
              Pricing
            </Link>
            <Link
              href="/studio"
              title="A new editor engine being built from scratch — only pan/zoom/layers/undo work so far, saved locally in this browser only"
              className="text-sm font-medium text-[#4A4750]/50 hover:text-[#4A4750] px-3 py-2"
            >
              Studio (Preview)
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={goToNewPhotoProject}
              className="hidden sm:inline-flex items-center gap-1.5 border border-black/15 text-[#17161B] px-4 py-2.5 rounded-full text-sm font-semibold hover:border-black/30 transition-colors"
            >
              + Photo Project
            </button>
            <Link
              href="/create"
              onClick={handleNewDesignClick}
              className="relative overflow-hidden inline-flex items-center gap-1.5 text-white px-4 py-2.5 rounded-full text-sm font-semibold bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(108,79,209,0.5)] hover:shadow-[0_10px_20px_-6px_rgba(108,79,209,0.6)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
            >
              <Plus size={15} /> New Design
            </Link>
            <ProfileMenu />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {showLimitWarning && <DesignLimitDialog onCancel={() => setShowLimitWarning(false)} />}

        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-semibold text-[#6C4FD1] tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles size={12} /> Your creative space
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight text-[#17161B]">
              {displayName ? `Welcome back, ${displayName}.` : 'Welcome back.'}
            </h1>
            <p className="mt-3 text-[#4A4750]">Ready to make something magical?</p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full border border-black/15 hover:border-black/30 transition-colors shrink-0"
          >
            Explore Templates <ArrowRight size={14} />
          </Link>
        </div>

        {loading && <p className="text-[#4A4750]/60">Loading your designs...</p>}

        {!loading && designs.length === 0 && (
          <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white p-12 sm:p-16 text-center">
            <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-gradient opacity-10" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-brand-gradient opacity-10" />
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-[0_16px_28px_-8px_rgba(108,79,209,0.45)]">
                <Sparkles size={26} className="text-white" />
              </div>
              <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl sm:text-4xl tracking-tight text-[#17161B]">
                Your canvas is waiting.
              </h2>
              <p className="mt-3 text-[#4A4750] max-w-sm mx-auto leading-relaxed">
                Start with an idea and give it your magical touch.
              </p>
              <Link
                href="/create"
                onClick={handleNewDesignClick}
                className="relative overflow-hidden mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white px-6 py-3.5 rounded-full bg-brand-gradient shadow-[0_10px_24px_-8px_rgba(108,79,209,0.55)] hover:shadow-[0_14px_30px_-8px_rgba(108,79,209,0.65)] hover:-translate-y-0.5 transition-all before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-white/25 before:rounded-t-full"
              >
                Create Your First Design <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        {!loading && designs.length > 0 && (
          <>
            <h2 className="text-xs font-semibold text-[#4A4750] tracking-wide uppercase mb-4">Recent Designs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mb-12">
              {designs.slice(0, RECENT_COUNT).map((design) => renderDesignCard(design))}
            </div>
          </>
        )}

        {!loading && designs.length > RECENT_COUNT && (
          <>
            <h2 className="text-xs font-semibold text-[#4A4750] tracking-wide uppercase mb-4">All Designs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {designs.slice(RECENT_COUNT).map((design) => renderDesignCard(design))}
            </div>
          </>
        )}
      </div>
    </main>
  );

  function renderDesignCard(design: Design) {
    return (
      <div
              key={design.id}
              className="group relative rounded-2xl border border-black/10 bg-white p-3 hover:shadow-[0_20px_40px_-20px_rgba(23,22,27,0.25)] hover:-translate-y-1 transition-all duration-300"
            >
              <Link href={`/editor?designId=${design.id}&w=${design.width}&h=${design.height}`}>
                <div className="aspect-square bg-[#F7F5F0] rounded-xl mb-3 overflow-hidden flex items-center justify-center text-[#4A4750]/40 text-xs">
                  {design.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={design.thumbnail} alt={design.name} className="w-full h-full object-contain" />
                  ) : (
                    <span>{design.width} × {design.height}</span>
                  )}
                </div>
              </Link>

              {renamingId === design.id ? (
                <input
                  autoFocus
                  defaultValue={design.name}
                  onBlur={(e) => renameDesign(design.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="text-sm font-medium text-[#17161B] border border-black/15 rounded px-1.5 py-0.5 w-full"
                />
              ) : (
                <p className="text-sm font-medium text-[#17161B] truncate px-0.5">{design.name}</p>
              )}
              <p className="text-xs text-[#4A4750]/70 px-0.5">
                {design.width} × {design.height} · {new Date(design.updated_at).toLocaleDateString()}
              </p>

              <button
                onClick={() => setMenuOpenId((v) => (v === design.id ? null : design.id))}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/95 border border-black/10 text-[#4A4750] opacity-70 group-hover:opacity-100 transition-opacity hover:text-[#17161B]"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>

              {menuOpenId === design.id && (
                <div
                  ref={menuRef}
                  className="absolute top-12 right-5 z-10 bg-white border border-black/10 rounded-xl shadow-lg py-1 w-40 text-sm"
                >
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      setRenamingId(design.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F7F5F0] text-[#4A4750]"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    onClick={() => duplicateDesign(design)}
                    disabled={busyId === design.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F7F5F0] text-[#4A4750] disabled:opacity-50"
                  >
                    <Copy size={13} /> {busyId === design.id ? 'Duplicating...' : 'Duplicate'}
                  </button>
                  <Link
                    href={`/editor?designId=${design.id}&w=${design.width}&h=${design.height}&autoExport=png`}
                    onClick={() => setMenuOpenId(null)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F7F5F0] text-[#4A4750]"
                  >
                    <Download size={13} /> Download (PNG)
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      deleteDesign(design.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
    );
  }
}
