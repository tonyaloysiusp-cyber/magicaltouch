'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter } from 'next/font/google';
import { MoreVertical, Pencil, Copy, Download, Trash2, Plus, Sparkles, ArrowRight, Sun, Moon, FolderOpen, HardDrive, X } from 'lucide-react';
import { readMtd, MtdError } from '@/lib/mtd/format';
import { pickMtdFile, reopenFromHandle, LocalFileRef } from '@/lib/mtd/fileAccess';
import { listRecent, rememberRecent, forgetRecent, RecentLocalFile } from '@/lib/mtd/recent';
import { putHandoff, newLocalKey, editorUrlForLocal } from '@/lib/mtd/handoff';
import { supabase } from '@/lib/supabase';
import { listProjects, getProject, updateProject, deleteProject, duplicateProject } from '@/lib/api/projects';
import { apiFetch } from '@/lib/api/client';
import { ProfileMenu } from '@/components/ProfileMenu';
import { DesignLimitDialog } from '@/components/DesignLimitDialog';
import { MAX_DESIGNS, getOrCreateProfile } from '@/lib/profile';
import { allFontFacesCSS, ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

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
  // Which editor produced this design (see
  // supabase/migrations/0007_designs_editor_type.sql) -- 'design' routes
  // to /editor, 'photo-studio' routes back to /photo-studio. Defaults to
  // 'design' for any row read before that migration is applied, which is
  // also the correct value for every pre-existing row (see the migration's
  // own comment on why that's not just a placeholder).
  editor_type?: string;
}

function editHref(design: Design): string {
  return design.editor_type === 'photo-studio'
    ? `/photo-studio?designId=${design.id}`
    : `/editor?designId=${design.id}&w=${design.width}&h=${design.height}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
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

  const fetchDesigns = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?next=/dashboard');
      return;
    }

    getOrCreateProfile(user.id, user.email?.split('@')[0]).then((p) => {
      if (p?.name) setDisplayName(p.name);
      // The welcome email is sent server-side, once per user (the route
      // guards duplicates). Runs after the profile row exists, and only
      // asks once per browser session so normal dashboard visits are free.
      const welcomeKey = `mtd-welcome-checked:${user.id}`;
      let alreadyChecked = false;
      try { alreadyChecked = sessionStorage.getItem(welcomeKey) === '1'; } catch {}
      if (p && user.email_confirmed_at && !alreadyChecked) {
        apiFetch('/api/email/welcome', { method: 'POST' })
          .then(() => { try { sessionStorage.setItem(welcomeKey, '1'); } catch {} })
          .catch(() => {});
      }
    });

    // Column-fallback resilience (thumbnail/editor_type may not exist
    // yet on a DB that predates those migrations) now lives server-side
    // in GET /api/projects, so the client just asks for the list.
    try {
      const data = await listProjects();
      setDesigns(data);
      backfillMissingThumbnails(data);
    } catch (err) {
      console.error('Failed to fetch designs:', err);
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
        const full = await getProject(design.id).catch(() => null);
        if (!full?.canvas_json) continue;

        const thumbnail = await new Promise<string | null>((resolve) => {
          const canvas = new F.StaticCanvas(null, { width: full.width, height: full.height });
          canvas.loadFromJSON(full.canvas_json, async () => {
            try {
              await ensureFontsLoadedForCanvasJSON(full.canvas_json);
              // Ruler guides are real (saved) Fabric objects -- this
              // throwaway canvas exists only to render a thumbnail, so
              // just drop them outright rather than toggling visibility.
              canvas.getObjects().filter((o: any) => o.__isGuide).forEach((o: any) => canvas.remove(o));
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

        try {
          await updateProject(design.id, { thumbnail });
        } catch (updateError) {
          // Column genuinely missing (migration not applied yet) or some
          // other write failure -- either way, stop trying the rest of
          // this batch rather than repeating the same failure per design.
          console.error('Thumbnail backfill save failed:', updateError);
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

  // ---------- Projects stored on this computer (.mtd) ----------
  // The list below lives only in this browser; the files themselves stay
  // wherever the customer saved them (see lib/mtd/).
  const [localFiles, setLocalFiles] = useState<RecentLocalFile[]>([]);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    listRecent().then(setLocalFiles);
  }, []);

  const openLocalFile = async (file: File, handle: any | null) => {
    setOpening(true);
    try {
      const opened = await readMtd(file);
      if (opened.document.editor === 'photo-studio') {
        alert('Photo Studio projects can be opened from inside Photo Studio.');
        return;
      }
      const key = newLocalKey();
      const ref: LocalFileRef = { handle, fileName: file.name };
      putHandoff(key, { opened, file: ref });
      await rememberRecent({
        name: opened.document.name,
        fileName: file.name,
        width: opened.document.width,
        height: opened.document.height,
        thumbnail: opened.thumbnail,
        handle,
      });
      router.push(editorUrlForLocal(key, opened.document.width, opened.document.height));
    } catch (err) {
      alert(err instanceof MtdError ? err.message : 'This file could not be opened.');
    } finally {
      setOpening(false);
    }
  };

  const chooseLocalFile = async () => {
    const picked = await pickMtdFile();
    if (picked) await openLocalFile(picked.file, picked.handle);
  };

  const reopenRecent = async (item: RecentLocalFile) => {
    if (item.handle) {
      const file = await reopenFromHandle(item.handle);
      if (file) return openLocalFile(file, item.handle);
    }
    // No remembered access (Safari/iPad, or the file moved): ask for it.
    alert(`Please choose "${item.fileName}" from where you saved it.`);
    await chooseLocalFile();
  };

  const forgetLocal = async (item: RecentLocalFile) => {
    await forgetRecent(item.id);
    setLocalFiles((list) => list.filter((f) => f.id !== item.id));
  };

  const deleteDesign = async (id: string) => {
    const confirmed = window.confirm('Delete this design? This cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteProject(id);
    } catch (err) {
      console.error('Failed to delete design:', err);
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
    try {
      await updateProject(id, { name: trimmed });
    } catch (err) {
      console.error('Failed to rename design:', err);
      alert('Failed to rename design.');
      setDesigns(prev);
    }
  };

  const duplicateDesign = async (design: Design) => {
    setMenuOpenId(null);
    setBusyId(design.id);
    try {
      const created = await duplicateProject(design.id);
      setDesigns((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to duplicate design:', err);
      alert('Failed to duplicate design.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main className={`${display.variable} ${body.variable} font-[family-name:var(--font-body)] min-h-screen bg-[#F7F5F0] dark:bg-[#111015] text-[#17161B] dark:text-[#F3F1F7] transition-colors duration-300`}>
      {/* Same same-origin font-face proxy the editor declares -- the
          off-screen thumbnail backfill above needs these @font-face rules
          present somewhere in the document for document.fonts.load() to
          find anything to load. dangerouslySetInnerHTML (not a JSX text
          child) because this string is large enough that React's
          streaming SSR can flush it in multiple chunks, which then fails
          hydration's server/client text comparison on a plain child. */}
      <style dangerouslySetInnerHTML={{ __html: allFontFacesCSS() }} />

      <header className="sticky top-0 z-40 bg-[#F7F5F0]/90 dark:bg-[#151320]/90 backdrop-blur border-b border-black/5 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" title="Go to homepage" className="shrink-0">
            <BrandLogo theme={theme} width={150} height={30} />
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="text-sm font-medium text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white px-3 py-2">
              Home
            </Link>
            <Link href="/templates" className="text-sm font-medium text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white px-3 py-2">
              Templates
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-[#4A4750] dark:text-[#B7B2C6] hover:text-[#17161B] dark:hover:text-white px-3 py-2">
              Pricing
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-full border border-black/15 dark:border-white/15 text-[#4A4750] dark:text-[#B7B2C6] hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link
              href="/photo-studio"
              title="Photo Studio — professional photo editing and advanced image work: layers, masks, curves, dodge/burn, clone stamp and real-world print units"
              className="hidden md:inline-flex items-center gap-1.5 border border-black/15 dark:border-white/15 text-[#17161B] dark:text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              Photo Studio
            </Link>
            <Link
              href="/create"
              onClick={handleNewDesignClick}
              title="New Design — quick design and everyday creative projects"
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
            <p className="text-xs font-semibold text-[#6C4FD1] dark:text-[#B9A6F2] tracking-wide uppercase flex items-center gap-1.5">
              <Sparkles size={12} /> Your creative space
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl sm:text-5xl leading-[1.05] tracking-tight text-[#17161B] dark:text-[#F3F1F7]">
              {displayName ? `Welcome back, ${displayName}.` : 'Welcome back.'}
            </h1>
            <p className="mt-3 text-[#4A4750] dark:text-[#B7B2C6]">Ready to make something magical?</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={chooseLocalFile}
              disabled={opening}
              title="Open a Magical Touch Design project (.mtd) from your computer"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 transition-colors disabled:opacity-50"
            >
              <FolderOpen size={15} /> {opening ? 'Opening…' : 'Open .mtd file'}
            </button>
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              Explore Templates <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {localFiles.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs font-semibold text-[#4A4750] dark:text-[#B7B2C6] tracking-wide uppercase mb-1 flex items-center gap-1.5">
              <HardDrive size={13} /> On this computer
            </h2>
            <p className="text-xs text-[#4A4750]/70 dark:text-[#B7B2C6]/70 mb-4">
              Your own .mtd project files. They are stored on your computer, not on our servers.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {localFiles.map((f) => (
                <div key={f.id} className="group relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-[#1B1926]">
                  <button onClick={() => reopenRecent(f)} disabled={opening} className="block w-full text-left">
                    <div className="aspect-[4/3] bg-[#EEEAF6] dark:bg-[#14121F] flex items-center justify-center overflow-hidden">
                      {f.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.thumbnail} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <HardDrive size={28} className="text-[#6C4FD1]/40" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold truncate">{f.name}</p>
                      <p className="text-[11px] text-[#4A4750] dark:text-[#B7B2C6] mt-0.5">
                        Stored on your computer · {new Date(f.savedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => forgetLocal(f)}
                    title="Remove from this list (the file itself is not deleted)"
                    aria-label={`Remove ${f.name} from this list`}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white/90 dark:bg-black/60 text-[#4A4750] dark:text-[#B7B2C6] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && <p className="text-[#4A4750]/60 dark:text-[#B7B2C6]/60">Loading your designs...</p>}

        {!loading && designs.length === 0 && (
          <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1B1926] p-12 sm:p-16 text-center">
            <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand-gradient opacity-10" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-brand-gradient opacity-10" />
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-[0_16px_28px_-8px_rgba(108,79,209,0.45)]">
                <Sparkles size={26} className="text-white" />
              </div>
              <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl sm:text-4xl tracking-tight text-[#17161B] dark:text-[#F3F1F7]">
                Your canvas is waiting.
              </h2>
              <p className="mt-3 text-[#4A4750] dark:text-[#B7B2C6] max-w-sm mx-auto leading-relaxed">
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
            <h2 className="text-xs font-semibold text-[#4A4750] dark:text-[#B7B2C6] tracking-wide uppercase mb-4">
              Recent Designs <span className="normal-case font-normal tracking-normal opacity-70">· saved in your account</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mb-12">
              {designs.slice(0, RECENT_COUNT).map((design) => renderDesignCard(design))}
            </div>
          </>
        )}

        {!loading && designs.length > RECENT_COUNT && (
          <>
            <h2 className="text-xs font-semibold text-[#4A4750] dark:text-[#B7B2C6] tracking-wide uppercase mb-4">All Designs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {designs.slice(RECENT_COUNT).map((design) => renderDesignCard(design))}
            </div>
          </>
        )}
      </div>
    </main>
    </div>
  );

  function renderDesignCard(design: Design) {
    return (
      <div
              key={design.id}
              className="group relative rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1B1926] p-3 hover:shadow-[0_20px_40px_-20px_rgba(23,22,27,0.25)] hover:-translate-y-1 transition-all duration-300"
            >
              <Link href={editHref(design)}>
                <div className="aspect-square bg-[#F7F5F0] dark:bg-[#111015] rounded-xl mb-3 overflow-hidden flex items-center justify-center text-[#4A4750]/40 dark:text-[#B7B2C6]/40 text-xs">
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
                  className="text-sm font-medium text-[#17161B] dark:text-[#F3F1F7] bg-transparent border border-black/15 dark:border-white/15 rounded px-1.5 py-0.5 w-full"
                />
              ) : (
                <p className="text-sm font-medium text-[#17161B] dark:text-[#F3F1F7] truncate px-0.5">{design.name}</p>
              )}
              <p className="text-xs text-[#4A4750]/70 dark:text-[#B7B2C6]/70 px-0.5">
                {design.width} × {design.height} · {new Date(design.updated_at).toLocaleDateString()}
              </p>

              <button
                onClick={() => setMenuOpenId((v) => (v === design.id ? null : design.id))}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-white/95 dark:bg-[#242131]/95 border border-black/10 dark:border-white/10 text-[#4A4750] dark:text-[#B7B2C6] opacity-70 group-hover:opacity-100 transition-opacity hover:text-[#17161B] dark:hover:text-white"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>

              {menuOpenId === design.id && (
                <div
                  ref={menuRef}
                  className="absolute top-12 right-5 z-10 bg-white dark:bg-[#242131] border border-black/10 dark:border-white/10 rounded-xl shadow-lg py-1 w-40 text-sm"
                >
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      setRenamingId(design.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F7F5F0] dark:hover:bg-white/5 text-[#4A4750] dark:text-[#B7B2C6]"
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    onClick={() => duplicateDesign(design)}
                    disabled={busyId === design.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F7F5F0] dark:hover:bg-white/5 text-[#4A4750] dark:text-[#B7B2C6] disabled:opacity-50"
                  >
                    <Copy size={13} /> {busyId === design.id ? 'Duplicating...' : 'Duplicate'}
                  </button>
                  <Link
                    href={`/editor?designId=${design.id}&w=${design.width}&h=${design.height}&autoExport=png`}
                    onClick={() => setMenuOpenId(null)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#F7F5F0] dark:hover:bg-white/5 text-[#4A4750] dark:text-[#B7B2C6]"
                  >
                    <Download size={13} /> Download (PNG)
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      deleteDesign(design.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
    );
  }
}
