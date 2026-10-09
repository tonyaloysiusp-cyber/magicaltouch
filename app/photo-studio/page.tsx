'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useRef, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon, Upload, FileImage } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MAX_DESIGNS, getDesignCount } from '@/lib/profile';
import { DocUnit } from '@/lib/editor/types';
import { physicalUnitToPx, pxToPhysicalUnit, useDisplayUnit } from '@/lib/editor/units';
import { DEFAULT_ADJUSTMENTS } from '@/lib/editor/photoFilters';
import { buildPhotoDesignJson } from '@/lib/editor/buildPhotoDesignPayload';
import { exportRasterToPDF } from '@/lib/editor/pdfExport';
import { PhotoEditorWorkspace, PhotoEditorHandle, PhotoEditResult } from '@/components/photoEditor/PhotoEditorWorkspace';
import { BrandLogo } from '@/components/BrandLogo';
import { AppHeader } from '@/components/AppHeader';
import { PageHero } from '@/components/PageHero';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MenuBar, MenuDef } from '@/components/editor/MenuBar';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
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
  const photoEditorRef = useRef<PhotoEditorHandle>(null);
  const lastResultRef = useRef<PhotoEditResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stage, setStage] = useState<'open' | 'editing'>('open');
  // True from first render whenever the URL already names a design to
  // reopen, so the "Open" screen never flashes before it loads (see the
  // load effect below, right after the searchParams/designId, name state).
  const [loadingDesign, setLoadingDesign] = useState(() => !!searchParams.get('designId'));

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

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [designId, setDesignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'pdf'>('png');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Real, opt-in Window-menu panel visibility -- passed straight through
  // to PhotoEditorWorkspace's own showLayersPanel/showAdjustmentsPanel
  // props (both default true there too, so omitting them, as Main
  // Design's embedded usage does, changes nothing for it).
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showAdjustmentsPanel, setShowAdjustmentsPanel] = useState(true);

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
        setLoadingDesign(false);
        return;
      }
      const source = extractPhotoSource(row.canvas_json);
      if (!source) {
        console.warn('This design has no image content Photo Studio can reopen.');
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
    lastResultRef.current = null;
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

  // Pulls the current flattened composite out of the live Photo Editor
  // canvas via the same applyNow()/onApply path Main Design uses to make
  // sure Export/Save never ship a stale pre-edit image -- onApply here
  // just records the result (in a ref, so it's readable synchronously
  // right after this call) instead of closing anything, since there's no
  // separate Main Design to hand off to on this standalone page.
  const captureCurrentComposite = (): PhotoEditResult | null => {
    lastResultRef.current = null;
    const applied = photoEditorRef.current?.applyNow();
    if (!applied) return null;
    return lastResultRef.current;
  };

  // Accepts an explicit format so menu items (Export as PNG / Export as
  // PDF) don't race the async setExportFormat state update -- the
  // toolbar's own Export button still just calls handleExport() with no
  // argument, defaulting to whatever the format <select> currently shows.
  const handleExport = async (format: 'png' | 'pdf' = exportFormat) => {
    setExporting(true);
    try {
      const result = captureCurrentComposite();
      if (!result) {
        alert('Nothing to export yet.');
        return;
      }
      if (format === 'pdf') {
        // Real current pixel size, not the possibly-stale docWidth/docHeight
        // state (only updated on Save) -- same pattern handleSave already
        // uses via loadImageSize on the just-captured composite.
        const size = await loadImageSize(result.dataUrl);
        await exportRasterToPDF(result.dataUrl, size.w, size.h, docDpi, `${docName || 'Untitled Photo'}.pdf`);
        return;
      }
      const a = document.createElement('a');
      a.href = result.dataUrl;
      a.download = `${docName || 'Untitled Photo'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setExporting(false);
    }
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

  // File > New Document: real navigation back to the Open screen (same
  // place "Discard & Start Over" already goes), just gated behind a
  // confirm since it discards whatever's on the canvas now.
  const handleNewDocument = () => {
    if (typeof window !== 'undefined' && !window.confirm('Start a new document? Unsaved changes to the current one will be lost.')) return;
    setStage('open');
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
          <PageHero
            eyebrow="Photo Studio"
            title="Edit photos like a pro."
            accent="like a pro"
            subtitle="Layers, masks, curves, dodge & burn, clone stamp and background removal — working on real pixels, in real print sizes."
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
                  {['Layers', 'Masks', 'Curves & levels', 'Dodge & burn', 'Clone stamp', 'Background removal', 'Print sizes & DPI'].map((f) => (
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

  // A real File/Edit/Image/Layer/Select/Filter/View/Window/Help menu
  // bar, reusing the same MenuBar component Main Design's /editor
  // already ships (same "real action or a disabled Planned tag, never a
  // fake button" contract). Every item wraps a real function -- most via
  // the expanded PhotoEditorHandle imperative ref, the rest (New/Save/
  // Export/Close) are this page's own existing handlers.
  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New Document…', onClick: handleNewDocument },
        { label: 'Open from Device (.mtd)…', onClick: openFromComputer },
        { label: 'Save', shortcut: 'Ctrl/Cmd+S', onClick: handleSave, disabled: saving },
        { label: 'Save to Device (.mtd)…', onClick: saveToComputer, disabled: saving || stage !== 'editing' },
        { divider: true },
        { label: 'Export as PNG', onClick: () => { setExportFormat('png'); handleExport('png'); } },
        { label: 'Export as PDF', onClick: () => { setExportFormat('pdf'); handleExport('pdf'); } },
        { divider: true },
        { label: 'Close', onClick: () => router.push('/dashboard') },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl/Cmd+Z', onClick: () => photoEditorRef.current?.undo(), disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl/Cmd+Shift+Z', onClick: () => photoEditorRef.current?.redo(), disabled: !canRedo },
      ],
    },
    {
      label: 'Image',
      items: [
        { label: 'Image Size…', onClick: () => photoEditorRef.current?.openResizeDialog() },
        { label: 'Crop', shortcut: 'C', onClick: () => photoEditorRef.current?.activateCropTool() },
      ],
    },
    {
      label: 'Layer',
      items: [
        { label: 'Add Image Layer…', onClick: () => photoEditorRef.current?.addLayerFromFile() },
        { label: 'Duplicate Layer', onClick: () => photoEditorRef.current?.duplicateActiveLayer() },
        { label: 'Delete Layer', onClick: () => photoEditorRef.current?.deleteActiveLayer() },
      ],
    },
    {
      label: 'Select',
      items: [
        { label: 'All', shortcut: 'Ctrl/Cmd+A', onClick: () => photoEditorRef.current?.selectAll() },
        { label: 'Deselect', shortcut: 'Ctrl/Cmd+D', onClick: () => photoEditorRef.current?.deselect() },
        { label: 'Inverse', shortcut: 'Ctrl/Cmd+Shift+I', onClick: () => photoEditorRef.current?.invertSelection() },
      ],
    },
    {
      label: 'Filter',
      items: [
        // The SAME blurInMask/sharpenInMask math the Blur/Sharpen brush
        // tools use, run over the whole layer instead of a stroke --
        // real full-image filters, not a separate/fake implementation.
        { label: 'Blur (whole layer)', onClick: () => photoEditorRef.current?.applyFilterBlur() },
        { label: 'Sharpen (whole layer)', onClick: () => photoEditorRef.current?.applyFilterSharpen() },
        { label: 'Motion Blur (whole layer)', onClick: () => photoEditorRef.current?.applyFilterMotionBlur() },
        { label: 'Box Blur (whole layer)', onClick: () => photoEditorRef.current?.applyFilterBoxBlur() },
        { label: 'Vignette (whole layer)', onClick: () => photoEditorRef.current?.applyFilterVignette() },
        { label: 'Grain (whole layer)', onClick: () => photoEditorRef.current?.applyFilterGrain() },
        { label: 'Clarity (whole layer)', onClick: () => photoEditorRef.current?.applyFilterClarity() },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl/Cmd+"+"', onClick: () => photoEditorRef.current?.zoomIn() },
        { label: 'Zoom Out', shortcut: 'Ctrl/Cmd+"-"', onClick: () => photoEditorRef.current?.zoomOut() },
        { label: 'Fit to Screen', shortcut: 'Ctrl/Cmd+0', onClick: () => photoEditorRef.current?.fitToView() },
        { label: '100%', shortcut: 'Ctrl/Cmd+1', onClick: () => photoEditorRef.current?.zoomTo100() },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Layers', checked: showLayersPanel, onClick: () => setShowLayersPanel((v) => !v) },
        { label: 'Adjustments', checked: showAdjustmentsPanel, onClick: () => setShowAdjustmentsPanel((v) => !v) },
      ],
    },
    {
      label: 'Help',
      items: [{ label: 'Keyboard Shortcuts', shortcut: '?', onClick: () => setShortcutsOpen(true) }],
    },
  ];

  // The editing workspace follows the same site-wide day/night theme as
  // every other page (one theme everywhere).
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="h-[100dvh] flex flex-col bg-mt-studio text-mt-ink transition-colors duration-300">
        <MenuBar menus={menus} />
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} workspace="photo" />
        <div className="flex items-center justify-between px-4 py-1.5 border-b bg-mt-surface border-mt-border shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" title="Go to homepage">
              <BrandLogo theme={theme} width={110} height={22} />
            </Link>
            <button
              onClick={() => setStage('open')}
              className="flex items-center gap-1.5 text-xs text-mt-muted hover:text-mt-ink"
            >
              <ArrowLeft size={13} /> Dashboard
            </button>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="text-xs bg-mt-surface2 border border-mt-border rounded px-2 py-1 w-56 text-center text-mt-ink"
            />
            <span className="text-[10px] text-mt-muted">
              {docWidth} × {docHeight}px · {docDpi} DPI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => photoEditorRef.current?.undo()}
              disabled={!canUndo}
              className="p-1.5 border rounded text-mt-muted border-mt-border hover:bg-mt-surface2 disabled:opacity-30"
              title="Undo"
            >
              ↶
            </button>
            <button
              onClick={() => photoEditorRef.current?.redo()}
              disabled={!canRedo}
              className="p-1.5 border rounded text-mt-muted border-mt-border hover:bg-mt-surface2 disabled:opacity-30"
              title="Redo"
            >
              ↷
            </button>
            <span className="text-[11px] text-mt-muted w-14 text-center">
              {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : ''}
            </span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'png' | 'pdf')}
              title="Export format"
              className="text-xs bg-mt-surface2 border border-mt-border rounded-full px-2 py-1.5 text-mt-ink"
            >
              <option value="png">PNG</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={() => handleExport()}
              disabled={exporting}
              className="text-xs px-3 py-1.5 border border-mt-border rounded-full text-mt-ink disabled:opacity-50"
            >
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-full bg-brand-gradient text-white font-semibold disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {sourceDataUrl && (
            <PhotoEditorWorkspace
              ref={photoEditorRef}
              pro
              active
              sourceDataUrl={sourceDataUrl}
              initialAdjustments={DEFAULT_ADJUSTMENTS}
              initialCropRect={null}
              onApply={(result) => {
                lastResultRef.current = result;
              }}
              onCancel={() => setStage('open')}
              onHistoryChange={(u, r) => {
                setCanUndo(u);
                setCanRedo(r);
              }}
              onShowShortcuts={() => setShortcutsOpen(true)}
              showLayersPanel={showLayersPanel}
              showAdjustmentsPanel={showAdjustmentsPanel}
              applyLabel="Done"
              cancelLabel="Discard & Start Over"
            />
          )}
        </div>
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
