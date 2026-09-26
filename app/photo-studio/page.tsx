'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon, Upload, FileImage } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MAX_DESIGNS, getDesignCount } from '@/lib/profile';
import { DocUnit } from '@/lib/editor/types';
import { physicalUnitToPx } from '@/lib/editor/units';
import { DEFAULT_ADJUSTMENTS } from '@/lib/editor/photoFilters';
import { buildPhotoDesignJson } from '@/lib/editor/buildPhotoDesignPayload';
import { PhotoEditorWorkspace, PhotoEditorHandle, PhotoEditResult } from '@/components/photoEditor/PhotoEditorWorkspace';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

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

export default function PhotoStudioPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const photoEditorRef = useRef<PhotoEditorHandle>(null);
  const lastResultRef = useRef<PhotoEditResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stage, setStage] = useState<'open' | 'editing'>('open');

  // "Open" screen state -- a blank-canvas document's real-world size,
  // independent of the Resize dialog's own unit (that one edits an
  // already-open document; this one creates it).
  const [unit, setUnit] = useState<DocUnit>('px');
  const [widthInput, setWidthInput] = useState('1080');
  const [heightInput, setHeightInput] = useState('1080');
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login?next=/photo-studio');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const applyPreset = (p: (typeof CANVAS_PRESETS)[number]) => {
    setUnit(p.unit);
    setWidthInput(String(p.w));
    setHeightInput(String(p.h));
    setDpiInput(String(p.dpi));
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
      const w = Math.max(1, Math.round(physicalUnitToPx(parseFloat(widthInput) || 0, unit, dpi)));
      const h = Math.max(1, Math.round(physicalUnitToPx(parseFloat(heightInput) || 0, unit, dpi)));
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = captureCurrentComposite();
      if (!result) {
        alert('Nothing to export yet.');
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
      };
      if (designId) payload.id = designId;
      if (thumbnail) payload.thumbnail = thumbnail;

      let { data, error } = await supabase.from('designs').upsert(payload).select().single();
      if (error && thumbnail && /thumbnail/i.test(error.message || '') && /column|does not exist/i.test(error.message || '')) {
        const { thumbnail: _drop, ...withoutThumbnail } = payload;
        ({ data, error } = await supabase.from('designs').upsert(withoutThumbnail).select().single());
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

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-400 dark:bg-[#111015] dark:text-[#B7B2C6]">
        Loading...
      </main>
    );
  }

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="p-2 rounded-full border border-black/10 dark:border-white/15 text-gray-500 dark:text-[#B7B2C6] hover:border-black/25 dark:hover:border-white/30 transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );

  if (stage === 'open') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <main className="min-h-screen bg-gray-50 dark:bg-[#111015] transition-colors duration-300">
          <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#B7B2C6] hover:text-gray-800 dark:hover:text-white">
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <BrandLogo theme={theme} width={150} height={30} />
            </div>
          </div>

          <div className="max-w-3xl mx-auto px-6 pb-16">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#F3F1F7] mb-1">Photo Studio</h1>
            <p className="text-gray-500 dark:text-[#B7B2C6] mb-8">
              A full, standalone photo-editing workspace — layers, masks, curves, dodge/burn, clone stamp and more, working directly in real pixels and real-world print units.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <section className="border dark:border-white/10 rounded-xl p-5 bg-white dark:bg-[#1B1926]">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-[#F3F1F7] mb-3 flex items-center gap-2">
                  <Upload size={15} /> Open a photo
                </h2>
                <p className="text-xs text-gray-500 dark:text-[#B7B2C6] mb-4">
                  Upload an image to start editing it at its full native resolution.
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-brand-gradient text-white font-semibold py-2.5 rounded-full text-sm"
                >
                  Choose Photo
                </button>
              </section>

              <section className="border dark:border-white/10 rounded-xl p-5 bg-white dark:bg-[#1B1926]">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-[#F3F1F7] mb-3 flex items-center gap-2">
                  <FileImage size={15} /> Start from a blank canvas
                </h2>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CANVAS_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p)}
                      className="text-[11px] px-2.5 py-1 rounded-full border dark:border-white/15 text-gray-600 dark:text-[#B7B2C6] hover:border-gray-500 dark:hover:border-white/30"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="text-[11px] text-gray-500 dark:text-[#B7B2C6] block mb-1">Width</label>
                    <input
                      type="number"
                      min={0}
                      value={widthInput}
                      onChange={(e) => setWidthInput(e.target.value)}
                      className="w-full text-sm border dark:border-white/15 dark:bg-[#242131] dark:text-[#F3F1F7] rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 dark:text-[#B7B2C6] block mb-1">Height</label>
                    <input
                      type="number"
                      min={0}
                      value={heightInput}
                      onChange={(e) => setHeightInput(e.target.value)}
                      className="w-full text-sm border dark:border-white/15 dark:bg-[#242131] dark:text-[#F3F1F7] rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 dark:text-[#B7B2C6] block mb-1">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as DocUnit)}
                      className="w-full text-sm border dark:border-white/15 dark:bg-[#242131] dark:text-[#F3F1F7] rounded px-2 py-1.5"
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
                  <label className="text-[11px] text-gray-500 dark:text-[#B7B2C6] block mb-1">DPI</label>
                  <input
                    type="number"
                    min={1}
                    value={dpiInput}
                    onChange={(e) => setDpiInput(e.target.value)}
                    className="w-full text-sm border dark:border-white/15 dark:bg-[#242131] dark:text-[#F3F1F7] rounded px-2 py-1.5"
                  />
                </div>
                <button
                  onClick={handleCreateBlank}
                  disabled={creating}
                  className="w-full bg-gray-800 dark:bg-[#242131] text-white font-semibold py-2.5 rounded-full text-sm disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create Blank Canvas'}
                </button>
              </section>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="h-screen flex flex-col bg-gray-50 dark:bg-[#1E1E1E] transition-colors duration-150">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-[#242424] dark:border-[#3A3A3A]">
          <div className="flex items-center gap-3">
            <Link href="/" title="Go to homepage">
              <BrandLogo theme={theme} width={130} height={26} />
            </Link>
            <button
              onClick={() => setStage('open')}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#B7B2C6] hover:text-gray-800 dark:hover:text-white"
            >
              <ArrowLeft size={15} /> Dashboard
            </button>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="text-sm border rounded px-2 py-1 w-56 text-center dark:bg-[#2B2B2B] dark:border-[#3A3A3A] dark:text-gray-100"
            />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {docWidth} × {docHeight}px · {docDpi} DPI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => photoEditorRef.current?.undo()}
              disabled={!canUndo}
              className="p-1.5 border rounded text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#333333]"
              title="Undo"
            >
              ↶
            </button>
            <button
              onClick={() => photoEditorRef.current?.redo()}
              disabled={!canRedo}
              className="p-1.5 border rounded text-gray-500 hover:bg-gray-50 disabled:opacity-30 dark:border-[#3A3A3A] dark:text-gray-300 dark:hover:bg-[#333333]"
              title="Redo"
            >
              ↷
            </button>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 w-14 text-center">
              {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : ''}
            </span>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-xs px-3 py-1.5 border rounded-full dark:border-[#3A3A3A] dark:text-gray-100 disabled:opacity-50"
            >
              Export
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-full bg-brand-gradient text-white font-semibold disabled:opacity-50"
            >
              Save
            </button>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {sourceDataUrl && (
            <PhotoEditorWorkspace
              ref={photoEditorRef}
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
              applyLabel="Done"
              cancelLabel="Discard & Start Over"
            />
          )}
        </div>
      </main>
    </div>
  );
}
