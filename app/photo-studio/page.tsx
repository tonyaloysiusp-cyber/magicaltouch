'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useRef, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileImage, Save, ChevronDown, HardDrive, Cloud, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MAX_DESIGNS, getDesignCount } from '@/lib/profile';
import { DocUnit } from '@/lib/editor/types';
import { physicalUnitToPx, pxToPhysicalUnit, useDisplayUnit } from '@/lib/editor/units';
import { buildPhotoDesignJson } from '@/lib/editor/buildPhotoDesignPayload';
import { PhotoStudio, PhotoStudioHandle } from '@/components/photoStudio/PhotoStudio';
import { BrandLogo } from '@/components/BrandLogo';
import { AppHeader } from '@/components/AppHeader';
import { PageHero } from '@/components/PageHero';
import { useAppTheme } from '@/hooks/useAppTheme';
import { createDefaultPrintSettings } from '@/lib/editor/printSetup';
import { buildMtd, readMtd, MtdError, fileNameFor, nameFromFileName } from '@/lib/mtd/format';
import { saveMtdFile, pickMtdFile } from '@/lib/mtd/fileAccess';
import { rememberRecent } from '@/lib/mtd/recent';
import { takeHandoff } from '@/lib/mtd/handoff';
import { encodeImage } from '@/lib/templates/media';

const CANVAS_PRESETS: { label: string; w: number; h: number; unit: DocUnit; dpi: number }[] = [
  { label: 'Square (1080 × 1080px)', w: 1080, h: 1080, unit: 'px', dpi: 72 },
  { label: 'A4 (210 × 297mm)', w: 210, h: 297, unit: 'mm', dpi: 300 },
  { label: 'US Letter (8.5 × 11in)', w: 8.5, h: 11, unit: 'in', dpi: 300 },
  { label: '4 × 6in Photo Print', w: 4, h: 6, unit: 'in', dpi: 300 },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function blankCanvasDataUrl(w: number, h: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

// Reopening a saved design here means pulling the flattened composite back
// out of Main-Design-compatible canvas_json (see buildPhotoDesignPayload.ts)
// -- its single image object's src, plus the artboard's own DPI setting,
// which isn't stored as a top-level column anywhere. Reopening always
// starts a fresh, flattened editing session on that composite; the
// original layers/masks/adjustments that produced it were never kept
// (buildPhotoDesignJson flattens on every save), so this is exactly as
// non-destructive as the save that created it -- not a new limitation.
function extractPhotoSource(canvasJson: any): { src: string; dpi: number } | null {
  const objects: any[] = canvasJson?.objects || [];
  const imageObj = objects.find((o) => o?.type === 'image' && typeof o.src === 'string');
  if (!imageObj) return null;
  const artboardObj = objects.find((o) => o?.__isArtboard);
  const dpi = artboardObj?.__print?.dpi || 300;
  return { src: imageObj.src, dpi };
}

function PhotoStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useAppTheme();
  const photoEditorRef = useRef<PhotoStudioHandle>(null);
  const [saveMenu, setSaveMenu] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stage, setStage] = useState<'open' | 'editing'>('open');
  // True from first render whenever the URL already names a design to
  // reopen, so the "Open" screen never flashes before it loads (see the
  // load effect below, right after the searchParams/designId, name state).
  const [loadingDesign, setLoadingDesign] = useState(() => !!searchParams.get('designId'));
  const [loadError, setLoadError] = useState<string | null>(null);

  // "Open" screen state -- a blank-canvas document's real-world size.
  // Global display-unit preference, shared live with Main Design's
  // editor and /create (lib/editor/units.ts), not a state local to this
  // page -- so choosing "mm" here is still "mm" in the Resize dialog and
  // in Main Design.
  const [unit, setUnit] = useDisplayUnit();
  // Real pixel dimensions are the stable source of truth here (same
  // principle as /create's widthPx/heightPx) -- the Width/Height inputs
  // below only ever DISPLAY these converted through the current unit/DPI;
  // typing a value converts it back into pixels immediately. Without
  // this, arriving on this page with the global unit already set to
  // something other than px (e.g. "in") would reinterpret this stale
  // "1080" default as 1080 of that unit instead of 1080px, since the
  // unit and DPI can now change out from under this page independent of
  // any click here.
  const [widthPx, setWidthPx] = useState(1080);
  const [heightPx, setHeightPx] = useState(1080);
  const [dpiInput, setDpiInput] = useState('300');
  const [creating, setCreating] = useState(false);

  const [docName, setDocName] = useState('Untitled Photo');
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [docWidth, setDocWidth] = useState(0);
  const [docHeight, setDocHeight] = useState(0);
  const [docDpi, setDocDpi] = useState(300);

  const [designId, setDesignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login?next=/photo-studio');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  // Reopening a design saved from Photo Studio (routed here as
  // /photo-studio?designId=... by the dashboard once editor_type says
  // this row belongs to Photo Studio, not Main Design) -- see
  // extractPhotoSource's own comment for what "reopen" means here.
  useEffect(() => {
    if (checkingAuth) return;
    const localKey = searchParams.get('localDoc');
    if (localKey) {
      const handoff = takeHandoff(localKey);
      const source = handoff ? extractPhotoSource(handoff.opened.canvas) : null;
      if (handoff && source) startWithSource(source.src, handoff.opened.document.width, handoff.opened.document.height, source.dpi, handoff.opened.document.name);
      else setLoadError('That file could not be opened here. Please open it again from your dashboard.');
      setLoadingDesign(false);
      return;
    }
    const designIdParam = searchParams.get('designId');
    if (!designIdParam) return;
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from('designs')
        .select('id, name, width, height, canvas_json')
        .eq('id', designIdParam)
        .single();
      if (cancelled) return;
      if (error || !row) {
        console.error('Failed to load design for Photo Studio:', error);
        setLoadError('That photo design could not be opened. Check your internet connection and try again, or open a new photo below.');
        setLoadingDesign(false);
        return;
      }
      const source = extractPhotoSource(row.canvas_json);
      if (!source) {
        console.warn('This design has no image content Photo Studio can reopen.');
        setLoadError('This design has no photo for Photo Studio to open. Open it in the design editor instead, or pick a photo below.');
        setLoadingDesign(false);
        return;
      }
      startWithSource(source.src, row.width, row.height, source.dpi, row.name);
      setDesignId(row.id);
      setLoadingDesign(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  const dpiNum = Math.max(1, parseInt(dpiInput) || 300);

  const applyPreset = (p: (typeof CANVAS_PRESETS)[number]) => {
    setUnit(p.unit);
    setDpiInput(String(p.dpi));
    setWidthPx(Math.round(physicalUnitToPx(p.w, p.unit, p.dpi)));
    setHeightPx(Math.round(physicalUnitToPx(p.h, p.unit, p.dpi)));
  };

  const startWithSource = (dataUrl: string, w: number, h: number, dpi: number, name: string) => {
    setSourceDataUrl(dataUrl);
    setDocWidth(w);
    setDocHeight(h);
    setDocDpi(dpi);
    setDocName(name);
    setDesignId(null);
    setSaveStatus('idle');
    setStage('editing');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const size = await loadImageSize(dataUrl);
    startWithSource(dataUrl, size.w, size.h, 300, file.name.replace(/\.[^.]+$/, '') || 'Untitled Photo');
  };

  const handleCreateBlank = () => {
    setCreating(true);
    try {
      const dpi = Math.max(1, parseInt(dpiInput) || 300);
      const w = Math.max(1, Math.round(widthPx));
      const h = Math.max(1, Math.round(heightPx));
      const dataUrl = blankCanvasDataUrl(w, h);
      startWithSource(dataUrl, w, h, dpi, 'Untitled Photo');
    } finally {
      setCreating(false);
    }
  };

  // The finished picture (adjustments included), at full size.
  const captureCurrentComposite = (): { dataUrl: string } | null => {
    const c = photoEditorRef.current?.renderResult();
    if (!c) return null;
    return { dataUrl: c.toDataURL('image/png') };
  };

  // ---------- .mtd project files on the customer's computer ----------
  // A Photo Studio .mtd holds the flattened photo plus its page size and
  // DPI, in the same Main-Design-compatible layout used for account saves,
  // so it also opens in the Design editor.
  const saveToComputer = async () => {
    const result = captureCurrentComposite();
    if (!result) {
      alert('Nothing to save yet.');
      return;
    }
    setSaving(true);
    try {
      const size = await loadImageSize(result.dataUrl);
      const canvas = {
        version: '5.3.0',
        objects: [
          {
            type: 'rect', left: 0, top: 0, width: size.w, height: size.h, fill: '#ffffff',
            selectable: false, evented: false, hasControls: false, lockRotation: true, objectCaching: false,
            name: 'Artboard 1', __isArtboard: true, __artboardId: `ab_${Date.now()}`,
            __print: { ...createDefaultPrintSettings(), dpi: docDpi },
          },
          { type: 'image', left: 0, top: 0, width: size.w, height: size.h, scaleX: 1, scaleY: 1, src: result.dataUrl, name: docName || 'Photo', __uid: `obj_${Date.now()}` },
        ],
      };
      const thumbBlob = await encodeImage(result.dataUrl, 400).catch(() => null);
      const thumbnail = thumbBlob
        ? await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.readAsDataURL(thumbBlob);
          })
        : null;
      const { blob } = await buildMtd({
        canvas,
        document: { name: docName || 'Untitled Photo', width: size.w, height: size.h, editor: 'photo-studio' },
        thumbnail,
      });
      const target = await saveMtdFile(blob, fileNameFor(docName || 'Untitled Photo'));
      if (target) {
        setDocName(nameFromFileName(target.fileName));
        rememberRecent({ name: nameFromFileName(target.fileName), fileName: target.fileName, width: size.w, height: size.h, thumbnail, handle: target.handle });
        alert(target.handle ? `Saved to your computer as "${target.fileName}".` : `"${target.fileName}" was downloaded. Keep it somewhere safe.`);
      }
    } catch (err) {
      console.error('Photo Studio .mtd save failed:', err);
      alert('Could not save the project file. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openFromComputer = async () => {
    const picked = await pickMtdFile();
    if (!picked) return;
    try {
      const opened = await readMtd(picked.file);
      const source = extractPhotoSource(opened.canvas);
      if (!source) {
        alert('This project has no photo Photo Studio can open. Open it in the Design editor instead.');
        return;
      }
      startWithSource(source.src, opened.document.width, opened.document.height, source.dpi, opened.document.name);
    } catch (err) {
      alert(err instanceof MtdError ? err.message : 'This file could not be opened.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const result = captureCurrentComposite();
      if (!result) {
        alert('Nothing to save yet.');
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to save.');
        return;
      }
      if (!designId) {
        const count = await getDesignCount(user.id);
        if (count >= MAX_DESIGNS) {
          alert(`You've reached the ${MAX_DESIGNS}-design limit. Delete an existing design to save a new one.`);
          return;
        }
      }
      const size = await loadImageSize(result.dataUrl);
      const { canvasJson, thumbnail } = await buildPhotoDesignJson(result.dataUrl, size.w, size.h, docDpi, user.id);
      const payload: any = {
        user_id: user.id,
        name: docName || 'Untitled Photo',
        canvas_json: canvasJson,
        width: size.w,
        height: size.h,
        updated_at: new Date().toISOString(),
        // Lets the dashboard route "Edit" back to Photo Studio instead of
        // the generic /editor (see supabase/migrations/0007_designs_editor_type.sql).
        editor_type: 'photo-studio',
      };
      if (designId) payload.id = designId;
      if (thumbnail) payload.thumbnail = thumbnail;

      let { data, error } = await supabase.from('designs').upsert(payload).select().single();
      if (error && thumbnail && /thumbnail/i.test(error.message || '') && /column|does not exist/i.test(error.message || '')) {
        const { thumbnail: _drop, ...withoutThumbnail } = payload;
        ({ data, error } = await supabase.from('designs').upsert(withoutThumbnail).select().single());
      }
      if (error && /editor_type/i.test(error.message || '') && /column|does not exist/i.test(error.message || '')) {
        const { editor_type: _dropType, ...withoutEditorType } = payload;
        ({ data, error } = await supabase.from('designs').upsert(withoutEditorType).select().single());
      }
      if (error) {
        console.error('Photo Studio save failed:', error);
        setSaveStatus('error');
        alert('Failed to save. Please try again.');
        return;
      }
      if (data) {
        setDesignId(data.id);
        setDocWidth(size.w);
        setDocHeight(size.h);
      }
      setSaveStatus('saved');
    } finally {
      setSaving(false);
    }
  };

  if (checkingAuth || loadingDesign) {
    return (
      <main className="min-h-screen flex items-center justify-center text-mt-faint dark:bg-mt-bg dark:text-mt-muted">
        Loading...
      </main>
    );
  }

  const ThemeToggle = () => (
    <ThemeSwitch theme={theme} onToggle={toggleTheme} size="sm" />
  );

  if (stage === 'open') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
          <AppHeader theme={theme} onToggleTheme={toggleTheme} active="photo" />
          {loadError && (
            <div role="alert" className="max-w-3xl mx-auto mt-4 px-4">
              <p className="rounded-2xl border border-rose-300/60 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 px-4 py-3 text-[14px]">{loadError}</p>
            </div>
          )}
          <PageHero
            eyebrow="Photo Studio"
            title="Edit photos like a pro."
            accent="like a pro"
            subtitle="Light and colour, one-tap looks, exact-size cropping, AI background removal, spot healing and true CMYK print files — all on your device."
          />
          <div className="mt-container py-8 sm:py-10">
            <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 2xl:gap-8 items-start">
              <section
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) handleUpload({ target: { files: [file], value: '' } } as any);
                }}
                className="relative rounded-3xl mt-spectrum-border bg-mt-surface p-6 sm:p-10 flex flex-col items-center text-center overflow-hidden"
              >
                <div aria-hidden className="absolute inset-0 opacity-[0.07] mt-spectrum" />
                <span className="relative w-16 h-16 rounded-2xl bg-mt-primary text-mt-onprimary inline-flex items-center justify-center shadow-[0_18px_40px_-18px_rgba(9,9,11,0.6)]">
                  <Upload size={26} />
                </span>
                <h2 className="relative mt-5 text-2xl font-semibold">Open a photo</h2>
                <p className="relative mt-2 text-sm text-mt-muted max-w-md">Drop an image here or choose one from your device. It opens at its full resolution — nothing is shrunk.</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="relative mt-6 h-12 px-8 rounded-full bg-mt-primary text-mt-onprimary font-semibold text-[15px] hover:opacity-90">
                  Choose a photo
                </button>
                <div className="relative mt-8 flex flex-wrap justify-center gap-2">
                  {['Adjust & looks', 'Exact-size crop', 'Remove background', 'Spot heal', 'Resize & DPI', 'CMYK & RGB export'].map((f) => (
                    <span key={f} className="text-xs px-3 py-1.5 rounded-full border border-mt-border bg-mt-surface text-mt-muted">
                      {f}
                    </span>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-mt-border p-6 bg-mt-surface">
                <h2 className="text-[15px] font-semibold text-mt-ink mb-3 flex items-center gap-2">
                  <FileImage size={16} /> Start from a blank canvas
                </h2>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CANVAS_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p)}
                      className="text-[11px] px-2.5 py-1 rounded-full border dark:border-white/15 text-mt-muted dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">Width</label>
                    <input
                      key={`w-${unit}-${dpiInput}-${widthPx}`}
                      type="number"
                      min={0}
                      defaultValue={unit === 'px' ? String(Math.round(widthPx)) : pxToPhysicalUnit(widthPx, unit, dpiNum).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (Number.isFinite(val) && val > 0) setWidthPx(physicalUnitToPx(val, unit, dpiNum));
                      }}
                      className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">Height</label>
                    <input
                      key={`h-${unit}-${dpiInput}-${heightPx}`}
                      type="number"
                      min={0}
                      defaultValue={unit === 'px' ? String(Math.round(heightPx)) : pxToPhysicalUnit(heightPx, unit, dpiNum).toFixed(2)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (Number.isFinite(val) && val > 0) setHeightPx(physicalUnitToPx(val, unit, dpiNum));
                      }}
                      className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as DocUnit)}
                      className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-2 py-1.5"
                    >
                      <option value="px">px</option>
                      <option value="in">in</option>
                      <option value="cm">cm</option>
                      <option value="mm">mm</option>
                      <option value="pt">pt</option>
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">DPI</label>
                  <input
                    type="number"
                    min={1}
                    value={dpiInput}
                    onChange={(e) => setDpiInput(e.target.value)}
                    className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-2 py-1.5"
                  />
                </div>
                <button
                  onClick={handleCreateBlank}
                  disabled={creating}
                  className="w-full h-11 rounded-full border border-mt-border bg-mt-surface2 text-mt-ink font-semibold text-sm hover:bg-mt-border/50 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create blank canvas'}
                </button>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const leave = () => {
    if (dirty && typeof window !== 'undefined' && !window.confirm('Leave this photo? Changes you haven’t saved will be lost.')) return;
    setStage('open');
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="h-[100dvh] flex flex-col bg-mt-bg text-mt-ink">
        {sourceDataUrl && (
          <PhotoStudio
            ref={photoEditorRef}
            source={sourceDataUrl}
            dpi={docDpi}
            name={docName}
            onDpiChange={setDocDpi}
            onDirtyChange={setDirty}
            headerLeft={
              <>
                <button onClick={leave} className="h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-mt-surface2" aria-label="Back" title="Back">
                  <ArrowLeft size={17} />
                </button>
                <Link href="/" title="Go to homepage" className="hidden md:block">
                  <BrandLogo theme={theme} width={104} height={21} />
                </Link>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  aria-label="Photo name"
                  className="hidden sm:block h-9 w-40 xl:w-56 rounded-lg bg-mt-surface2 border border-transparent focus:border-mt-border px-2.5 text-[13px] text-mt-ink"
                />
              </>
            }
            headerRight={
              <>
                <span className="hidden xl:inline text-[11px] text-mt-muted">{saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Not saved' : ''}</span>
                <span className="hidden lg:inline-flex"><ThemeToggle /></span>
                <div className="relative">
                  <button
                    onClick={() => setSaveMenu((v) => !v)}
                    disabled={saving}
                    className="h-10 px-4 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save <ChevronDown size={14} />
                  </button>
                  {saveMenu && (
                    <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-mt-border bg-mt-surface shadow-xl p-1.5" onMouseLeave={() => setSaveMenu(false)}>
                      <button onClick={() => { setSaveMenu(false); saveToComputer(); }} className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-mt-surface2 flex gap-3">
                        <HardDrive size={17} className="mt-0.5 shrink-0" />
                        <span><span className="block text-[13px] font-semibold">This device</span><span className="block text-[11px] text-mt-muted">A .mtd project file you keep. Nothing is uploaded.</span></span>
                      </button>
                      <button onClick={() => { setSaveMenu(false); handleSave(); }} className="w-full text-left rounded-xl px-3 py-2.5 hover:bg-mt-surface2 flex gap-3">
                        <Cloud size={17} className="mt-0.5 shrink-0" />
                        <span><span className="block text-[13px] font-semibold">My Magical Touch account</span><span className="block text-[11px] text-mt-muted">Open it from any device. The photo lives only inside this design file.</span></span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            }
          />
        )}
      </main>
    </div>
  );
}

export default function PhotoStudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PhotoStudioContent />
    </Suspense>
  );
}
