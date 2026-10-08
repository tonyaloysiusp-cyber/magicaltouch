'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ARTBOARD_PRESETS, ArtboardPreset } from '@/lib/editor/artboards';
import { DocUnit } from '@/lib/editor/types';
import { formatUnit, unitToPx, useDisplayUnit } from '@/lib/editor/units';
import { EdgeValues } from '@/lib/editor/printSetup';
import { EdgeFields } from '@/components/editor/EdgeFields';
import { BackBar } from '@/components/BackBar';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

type Orientation = 'portrait' | 'landscape' | 'square';
type Background = 'transparent' | 'white' | 'custom';

const DPI_OPTIONS = [72, 96, 150, 300];
const PRESET_CATEGORIES = Array.from(new Set(ARTBOARD_PRESETS.map((p) => p.category)));
const ZERO_EDGES: EdgeValues = { top: 0, right: 0, bottom: 0, left: 0 };

function orientationOf(w: number, h: number): Orientation {
  if (w === h) return 'square';
  return w > h ? 'landscape' : 'portrait';
}

export default function CreateDesignPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Global display-unit preference, shared live with the open editor and
  // Photo Studio (lib/editor/units.ts) -- not a state local to this page.
  const [unit, setUnit] = useDisplayUnit();
  const [widthPx, setWidthPx] = useState(1080);
  const [heightPx, setHeightPx] = useState(1080);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('square');
  const [ratioLocked, setRatioLocked] = useState(false);
  const [widthError, setWidthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  const [dpi, setDpi] = useState(300);
  const [customDpi, setCustomDpi] = useState(false);
  const [background, setBackground] = useState<Background>('white');
  const [customColor, setCustomColor] = useState('#ffffff');

  const [bleed, setBleed] = useState<EdgeValues>(ZERO_EDGES);
  const [bleedLinked, setBleedLinked] = useState(true);
  const [safeArea, setSafeArea] = useState<EdgeValues>(ZERO_EDGES);
  const [safeAreaLinked, setSafeAreaLinked] = useState(true);

  const orientation = useMemo(() => orientationOf(widthPx, heightPx), [widthPx, heightPx]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login?next=/create');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const applyPreset = (preset: ArtboardPreset) => {
    setSelectedPresetId(preset.id);
    setWidthPx(preset.widthPx);
    setHeightPx(preset.heightPx);
  };

  const applyOrientation = (o: Orientation) => {
    setSelectedPresetId(null);
    if (o === 'square') {
      const s = Math.max(widthPx, heightPx);
      setWidthPx(s);
      setHeightPx(s);
    } else if (o === 'landscape' && widthPx < heightPx) {
      setWidthPx(heightPx);
      setHeightPx(widthPx);
    } else if (o === 'portrait' && heightPx < widthPx) {
      setHeightPx(widthPx);
      setWidthPx(heightPx);
    }
  };

  // Runs only on blur/Enter (see the input's onBlur below) -- never on
  // every keystroke -- so the document never resizes while the user is
  // still typing. An invalid value (empty, non-numeric, zero, negative)
  // shows an inline message and leaves widthPx/heightPx untouched.
  const handleWidthInput = (raw: string) => {
    const val = parseFloat(raw);
    if (isNaN(val) || val <= 0) {
      setWidthError('Enter a valid size greater than 0.');
      return;
    }
    setWidthError(null);
    const newWidthPx = unitToPx(val, unit);
    if (ratioLocked && widthPx > 0) setHeightPx(heightPx * (newWidthPx / widthPx));
    setWidthPx(newWidthPx);
    setSelectedPresetId(null);
  };
  const handleHeightInput = (raw: string) => {
    const val = parseFloat(raw);
    if (isNaN(val) || val <= 0) {
      setHeightError('Enter a valid size greater than 0.');
      return;
    }
    setHeightError(null);
    const newHeightPx = unitToPx(val, unit);
    if (ratioLocked && heightPx > 0) setWidthPx(widthPx * (newHeightPx / heightPx));
    setHeightPx(newHeightPx);
    setSelectedPresetId(null);
  };

  const handleCreate = () => {
    const params = new URLSearchParams();
    params.set('w', String(Math.round(widthPx)));
    params.set('h', String(Math.round(heightPx)));
    params.set('dpi', String(dpi));
    params.set('bg', background === 'custom' ? `custom:${customColor.replace('#', '')}` : background);
    params.set('bleedT', String(Math.round(bleed.top)));
    params.set('bleedR', String(Math.round(bleed.right)));
    params.set('bleedB', String(Math.round(bleed.bottom)));
    params.set('bleedL', String(Math.round(bleed.left)));
    params.set('safeT', String(Math.round(safeArea.top)));
    params.set('safeR', String(Math.round(safeArea.right)));
    params.set('safeB', String(Math.round(safeArea.bottom)));
    params.set('safeL', String(Math.round(safeArea.left)));
    // A brand-new blank design's editor URL otherwise has no unique part
    // (just w/h/dpi/...), which is indistinguishable from a plain reload
    // of an already-open blank tab — this marker tells the editor's tab
    // session restore that this specific navigation must always become a
    // NEW tab, never get matched onto whatever tab happened to be active
    // before the user came here.
    params.set('newTab', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    router.push(`/editor?${params.toString()}`);
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center text-mt-faint dark:bg-mt-bg dark:text-mt-muted">
        Loading...
      </main>
    );
  }

  const previewRatio = widthPx / heightPx;
  const previewStyle =
    previewRatio >= 1
      ? { width: '100%', aspectRatio: `${widthPx} / ${heightPx}` }
      : { height: 220, aspectRatio: `${widthPx} / ${heightPx}` };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main className="min-h-screen bg-mt-bg dark:bg-mt-bg transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <BackBar href="/dashboard" label="Dashboard" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo theme={theme} width={150} height={30} />
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />
        </div>
        <h1 className="text-3xl font-bold text-mt-ink dark:text-mt-ink mb-1">Create New Design</h1>
        <p className="text-mt-muted dark:text-mt-muted mb-8">Set up your document, then jump straight into the editor.</p>

        <div className="grid md:grid-cols-[1fr_300px] gap-8">
          <div className="flex flex-col gap-8">
            {/* Presets */}
            <section>
              <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-3">Presets</h2>
              {PRESET_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-3">
                  <p className="text-[11px] uppercase tracking-wide text-mt-faint dark:text-mt-muted mb-1.5">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {ARTBOARD_PRESETS.filter((p) => p.category === cat).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          selectedPresetId === p.id
                            ? 'bg-brand-gradient text-white border-transparent'
                            : 'border-mt-border dark:border-white/15 text-mt-muted dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Size */}
            <section className="border dark:border-white/10 rounded-xl p-4 bg-mt-surface dark:bg-mt-surface">
              <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-3">Canvas Size</h2>
              <div className="grid grid-cols-[1fr_auto_1fr_1fr] gap-2 items-end">
                <div>
                  <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">Width</label>
                  <input
                    type="text"
                    key={`w-${unit}-${widthPx}`}
                    defaultValue={formatUnit(widthPx, unit)}
                    onBlur={(e) => handleWidthInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') {
                        setWidthError(null);
                        (e.target as HTMLInputElement).value = formatUnit(widthPx, unit);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-3 py-2"
                  />
                  {widthError && <p className="text-[10px] text-red-500 mt-1">{widthError}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setRatioLocked((v) => !v)}
                  title={ratioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  aria-label={ratioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                  className={`mb-2 p-2 rounded-full border transition-colors ${
                    ratioLocked
                      ? 'bg-mt-accent text-white border-mt-accent'
                      : 'border-mt-border dark:border-white/15 text-mt-faint dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30'
                  }`}
                >
                  {ratioLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                <div>
                  <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">Height</label>
                  <input
                    type="text"
                    key={`h-${unit}-${heightPx}`}
                    defaultValue={formatUnit(heightPx, unit)}
                    onBlur={(e) => handleHeightInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') {
                        setHeightError(null);
                        (e.target as HTMLInputElement).value = formatUnit(heightPx, unit);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-3 py-2"
                  />
                  {heightError && <p className="text-[10px] text-red-500 mt-1">{heightError}</p>}
                </div>
                <div>
                  <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as DocUnit)}
                    className="w-full text-sm border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-3 py-2"
                  >
                    <option value="px">px</option>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="pt">pt</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[11px] text-mt-muted dark:text-mt-muted block mb-1.5">Orientation</label>
                <div className="flex gap-2">
                  {(['portrait', 'landscape', 'square'] as Orientation[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => applyOrientation(o)}
                      className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                        orientation === o
                          ? 'bg-mt-accent text-white border-mt-accent'
                          : 'border-mt-border dark:border-white/15 text-mt-muted dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Resolution */}
            <section className="border dark:border-white/10 rounded-xl p-4 bg-mt-surface dark:bg-mt-surface">
              <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-3">Resolution</h2>
              <div className="flex flex-wrap gap-2 items-center">
                {DPI_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDpi(d);
                      setCustomDpi(false);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      !customDpi && dpi === d
                        ? 'bg-mt-accent text-white border-mt-accent'
                        : 'border-mt-border dark:border-white/15 text-mt-muted dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30'
                    }`}
                  >
                    {d} DPI
                  </button>
                ))}
                <button
                  onClick={() => setCustomDpi(true)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    customDpi ? 'bg-mt-accent text-white border-mt-accent' : 'border-mt-border dark:border-white/15 text-mt-muted dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30'
                  }`}
                >
                  Custom
                </button>
                {customDpi && (
                  <input
                    type="number"
                    min={1}
                    value={dpi}
                    onChange={(e) => setDpi(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-xs border dark:border-white/15 dark:bg-mt-surface2 dark:text-mt-ink rounded px-2 py-1.5"
                  />
                )}
              </div>
              <p className="text-[11px] text-mt-faint dark:text-mt-muted mt-2">
                Used for the preflight image-resolution check and print export sizing. This is a real
                document setting the editor reads back, not a decorative label.
              </p>
            </section>

            {/* Background */}
            <section className="border dark:border-white/10 rounded-xl p-4 bg-mt-surface dark:bg-mt-surface">
              <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-3">Background</h2>
              <div className="flex gap-2 items-center">
                {(['transparent', 'white', 'custom'] as Background[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBackground(b)}
                    className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                      background === b
                        ? 'bg-mt-accent text-white border-mt-accent'
                        : 'border-mt-border dark:border-white/15 text-mt-muted dark:text-mt-muted hover:border-gray-500 dark:hover:border-white/30'
                    }`}
                  >
                    {b}
                  </button>
                ))}
                {background === 'custom' && (
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-10 h-8 border dark:border-white/15 rounded cursor-pointer"
                  />
                )}
              </div>
            </section>

            {/* Bleed & Safe Area */}
            <section className="border dark:border-white/10 rounded-xl p-4 bg-mt-surface dark:bg-mt-surface grid grid-cols-2 gap-4">
              <EdgeFields
                label="Bleed"
                unit={unit}
                values={bleed}
                linked={bleedLinked}
                onChange={setBleed}
                onToggleLinked={() => setBleedLinked((v) => !v)}
              />
              <EdgeFields
                label="Safe Area / Margins"
                unit={unit}
                values={safeArea}
                linked={safeAreaLinked}
                onChange={setSafeArea}
                onToggleLinked={() => setSafeAreaLinked((v) => !v)}
              />
            </section>

            <section className="border rounded-xl p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40">
              <h2 className="text-sm font-semibold text-mt-ink dark:text-mt-ink mb-1">Color Mode</h2>
              <p className="text-[11px] text-mt-muted dark:text-mt-muted leading-relaxed">
                This document is edited in RGB — there is no in-browser CMYK color pipeline, so a CMYK
                toggle here would just be a label with nothing behind it. Bleed, crop marks, and
                registration marks are still prepared correctly for print handoff; full CMYK conversion
                happens at your print vendor.
              </p>
            </section>
          </div>

          {/* Preview + create */}
          <div className="flex flex-col gap-4">
            <div className="border dark:border-white/10 rounded-xl p-4 bg-mt-surface dark:bg-mt-surface sticky top-4">
              <p className="text-[11px] uppercase tracking-wide text-mt-faint dark:text-mt-muted mb-3">Preview</p>
              <div className="flex items-center justify-center bg-mt-surface2 dark:bg-mt-surface2 rounded-lg p-4 min-h-[180px]">
                <div
                  style={{
                    ...previewStyle,
                    background:
                      background === 'transparent'
                        ? 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
                        : background === 'custom'
                        ? customColor
                        : '#ffffff',
                  }}
                  className="border border-mt-border dark:border-white/15 shadow-sm max-w-full"
                />
              </div>
              <p className="text-xs text-mt-muted dark:text-mt-muted mt-3">
                {formatUnit(widthPx, unit)} × {formatUnit(heightPx, unit)} {unit} · {dpi} DPI
              </p>
              <button
                onClick={handleCreate}
                className="mt-4 w-full bg-brand-gradient text-white font-semibold py-3 rounded-full text-sm"
              >
                Create Design
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}
