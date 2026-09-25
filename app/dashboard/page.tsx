'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, Pencil, Copy, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ProfileMenu } from '@/components/ProfileMenu';
import { DesignLimitDialog } from '@/components/DesignLimitDialog';
import { MAX_DESIGNS, getOrCreateProfile } from '@/lib/profile';
import { allFontFacesCSS, ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';

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
    <main className="min-h-screen p-6">
      {/* Same same-origin font-face proxy the editor declares -- the
          off-screen thumbnail backfill above needs these @font-face rules
          present somewhere in the document for document.fonts.load() to
          find anything to load. */}
      <style>{allFontFacesCSS()}</style>
      <div className="flex items-center justify-between mb-10">
        <Link href="/" title="Go to homepage">
          <Image src="/logo.png" alt="Magical Touch" width={180} height={36} />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">
            Home
          </Link>
          <Link href="/templates" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">
            Templates
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2">
            Pricing
          </Link>
          <Link
            href="/studio"
            title="A new editor engine being built from scratch — only pan/zoom/layers/undo work so far, saved locally in this browser only"
            className="text-sm font-medium text-gray-400 hover:text-gray-700 px-4 py-2"
          >
            Studio (Preview)
          </Link>
          <button
            onClick={goToNewPhotoProject}
            className="ml-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-50"
          >
            + New Photo Project
          </button>
          <Link
            href="/create"
            onClick={handleNewDesignClick}
            className="bg-brand-gradient text-white px-5 py-2 rounded-full text-sm font-semibold"
          >
            + New Design
          </Link>
          <ProfileMenu />
        </div>
      </div>

      {showLimitWarning && <DesignLimitDialog onCancel={() => setShowLimitWarning(false)} />}

      <h1 className="text-3xl font-bold text-gray-800">{displayName ? `Welcome back, ${displayName}!` : 'Welcome!'}</h1>
      <p className="mt-2 text-gray-500 mb-8">Create something new, or jump back into a recent design.</p>

      {loading && <p className="text-gray-400">Loading your designs...</p>}

      {!loading && designs.length === 0 && (
        <div className="border border-dashed rounded-xl p-10 text-center text-gray-400">
          <p>You haven't created any designs yet.</p>
          <Link href="/create" className="text-blue-500 underline mt-2 inline-block">
            Start your first design
          </Link>
        </div>
      )}

      {!loading && designs.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Files</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
            {designs.slice(0, RECENT_COUNT).map((design) => renderDesignCard(design))}
          </div>
        </>
      )}

      {!loading && designs.length > RECENT_COUNT && (
        <>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">All Designs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {designs.slice(RECENT_COUNT).map((design) => renderDesignCard(design))}
          </div>
        </>
      )}
    </main>
  );

  function renderDesignCard(design: Design) {
    return (
      <div
              key={design.id}
              className="relative border rounded-xl p-4 hover:shadow-md transition bg-white"
            >
              <Link href={`/editor?designId=${design.id}&w=${design.width}&h=${design.height}`}>
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center text-gray-300 text-xs">
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
                  className="text-sm font-medium text-gray-800 border rounded px-1.5 py-0.5 w-full"
                />
              ) : (
                <p className="text-sm font-medium text-gray-800 truncate">{design.name}</p>
              )}
              <p className="text-xs text-gray-400">
                {design.width} × {design.height} · {new Date(design.updated_at).toLocaleDateString()}
              </p>

              <button
                onClick={() => setMenuOpenId((v) => (v === design.id ? null : design.id))}
                className="absolute top-3 right-3 p-1 rounded-full bg-white/90 border text-gray-500 hover:text-gray-800"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>

              {menuOpenId === design.id && (
                <div
                  ref={menuRef}
                  className="absolute top-10 right-3 z-10 bg-white border rounded-lg shadow-lg py-1 w-40 text-sm"
                >
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      setRenamingId(design.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    onClick={() => duplicateDesign(design)}
                    disabled={busyId === design.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                  >
                    <Copy size={13} /> {busyId === design.id ? 'Duplicating...' : 'Duplicate'}
                  </button>
                  <Link
                    href={`/editor?designId=${design.id}&w=${design.width}&h=${design.height}&autoExport=png`}
                    onClick={() => setMenuOpenId(null)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700"
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
