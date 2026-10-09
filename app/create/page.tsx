'use client';

// New Design: pick what you're making (by size, by goal, by search or with
// the wizard), see real templates in that exact shape, and open the editor
// blank or from a template. Custom sizes and print settings live in one
// place below the sizes.

import { AppHeader } from '@/components/AppHeader';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock, Search, Wand2, ArrowRightLeft, ChevronDown, Check, Ruler, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DocUnit } from '@/lib/editor/types';
import { formatUnit, unitToPx, useDisplayUnit } from '@/lib/editor/units';
import { EdgeValues } from '@/lib/editor/printSetup';
import { EdgeFields } from '@/components/editor/EdgeFields';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SIZE_GROUPS, ALL_PRESETS, SizePreset, presetLabel, presetToPx } from '@/lib/editor/sizePresets';
import { fetchPublicTemplates, Template } from '@/lib/templatesData';
import { loadBrandKit } from '@/lib/editor/brandKit';
import { GOALS, GoalId, matchTemplates, presetById, templateImage } from '@/lib/create/catalog';
import { PageGlyph } from '@/components/create/PageGlyph';
import { GoalIcon } from '@/components/create/GoalIcon';
import { DesignWizard } from '@/components/create/DesignWizard';

type Background = 'transparent' | 'white' | 'custom';
type Tab = 'popular' | string; // 'popular' or a SIZE_GROUPS id

const DPI_OPTIONS = [72, 96, 150, 300];
const ZERO_EDGES: EdgeValues = { top: 0, right: 0, bottom: 0, left: 0 };
const POPULAR = ['ig-post', 'ig-story', 'flyer', 'poster', 'business-card', 'presentation', 'birthday', 'resume', 'certificate', 'menu', 'yt-thumb', 'a4'];

const pill = (on: boolean) =>
  `h-9 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors ${on ? 'bg-mt-primary text-mt-onprimary border-transparent' : 'border-mt-border text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'}`;
const chip = (on: boolean) =>
  `h-8 px-3 rounded-full text-xs font-medium border transition-colors ${on ? 'mt-active-blue text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink hover:bg-mt-surface2'}`;
const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink focus:outline-none focus:border-[#3B82C4] focus:ring-2 focus:ring-[#8CCBFF]/40';

export default function CreateDesignPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [unit, setUnit] = useDisplayUnit();
  const [widthPx, setWidthPx] = useState(1080);
  const [heightPx, setHeightPx] = useState(1350);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>('ig-post');
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

  const [tab, setTab] = useState<Tab>('popular');
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [query, setQuery] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [brandReady, setBrandReady] = useState(false);
  const [useBrand, setUseBrand] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login?next=/create');
      else setCheckingAuth(false);
    });
  }, [router]);

  useEffect(() => {
    fetchPublicTemplates().then(setTemplates).catch(() => setTemplates([]));
    loadBrandKit().then((k) => {
      const ok = k.colors.filter(Boolean).length > 0 || !!k.fonts.heading || !!k.fonts.body;
      setBrandReady(ok);
      setUseBrand(ok);
    });
    // Links can pre-pick a size (?size=ig-story) or open the wizard (?wizard=1).
    const q = new URLSearchParams(window.location.search);
    const p = q.get('size') ? presetById(q.get('size')!) : undefined;
    if (p) pick(p);
    if (q.get('wizard') === '1') setWizard(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = selectedPresetId ? presetById(selectedPresetId) : undefined;

  const pick = (p: SizePreset) => {
    const { width, height } = presetToPx(p);
    setSelectedPresetId(p.id);
    setWidthPx(width);
    setHeightPx(height);
    setWidthError(null);
    setHeightError(null);
  };

  const swapOrientation = () => {
    setSelectedPresetId(null);
    setWidthPx(heightPx);
    setHeightPx(widthPx);
  };

  const handleWidthInput = (raw: string) => {
    const val = parseFloat(raw.replace(',', '.'));
    if (isNaN(val) || val <= 0) return setWidthError('Enter a size greater than 0.');
    setWidthError(null);
    const next = unitToPx(val, unit);
    if (Math.abs(next - widthPx) < 1e-6) return;
    if (ratioLocked && widthPx > 0) setHeightPx(heightPx * (next / widthPx));
    setWidthPx(next);
    setSelectedPresetId(null);
  };
  const handleHeightInput = (raw: string) => {
    const val = parseFloat(raw.replace(',', '.'));
    if (isNaN(val) || val <= 0) return setHeightError('Enter a size greater than 0.');
    setHeightError(null);
    const next = unitToPx(val, unit);
    if (Math.abs(next - heightPx) < 1e-6) return;
    if (ratioLocked && heightPx > 0) setWidthPx(widthPx * (next / heightPx));
    setHeightPx(next);
    setSelectedPresetId(null);
  };

  const openBlank = (size?: { w: number; h: number }) => {
    // Exact sizes (to 1/1000 px) so mm/in documents and 3 mm bleeds come
    // through without rounding.
    const exact = (n: number) => String(Math.round(n * 1000) / 1000);
    const params = new URLSearchParams();
    params.set('w', exact(size?.w ?? widthPx));
    params.set('h', exact(size?.h ?? heightPx));
    params.set('dpi', String(dpi));
    params.set('bg', background === 'custom' ? `custom:${customColor.replace('#', '')}` : background);
    params.set('bleedT', exact(bleed.top));
    params.set('bleedR', exact(bleed.right));
    params.set('bleedB', exact(bleed.bottom));
    params.set('bleedL', exact(bleed.left));
    params.set('safeT', exact(safeArea.top));
    params.set('safeR', exact(safeArea.right));
    params.set('safeB', exact(safeArea.bottom));
    params.set('safeL', exact(safeArea.left));
    // A blank design's URL has no unique part, so this marker makes the
    // editor open it as a new tab instead of matching an existing one.
    params.set('newTab', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    router.push(`/editor?${params.toString()}`);
  };

  const openTemplate = (t: Template, brand = useBrand && brandReady) => {
    router.push(`/editor?w=${t.width}&h=${t.height}&templateId=${t.id}${brand ? '&brand=1' : ''}`);
  };

  // ---- what the size grid shows
  const goalDef = goal ? GOALS.find((g) => g.id === goal) : undefined;
  const q = query.trim().toLowerCase();
  const shownPresets: SizePreset[] = useMemo(() => {
    if (q) return ALL_PRESETS.filter((p) => `${p.label} ${p.templateCategory || ''} ${presetLabel(p)}`.toLowerCase().includes(q));
    if (goalDef) return goalDef.presets.map(presetById).filter(Boolean) as SizePreset[];
    if (tab === 'popular') return POPULAR.map(presetById).filter(Boolean) as SizePreset[];
    return SIZE_GROUPS.find((g) => g.id === tab)?.items || [];
  }, [q, goalDef, tab]);
  const nameMatches = useMemo(
    () => (q.length >= 2 ? templates.filter((t) => t.id && `${t.name} ${t.category} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q)).slice(0, 8) : []),
    [q, templates]
  );
  const prefer = [selected?.templateCategory, ...(goalDef?.categories || [])].filter(Boolean) as string[];
  const sizeMatches = useMemo(() => matchTemplates(templates, widthPx, heightPx, prefer, 6), [templates, widthPx, heightPx, prefer.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const allSizeMatches = useMemo(() => matchTemplates(templates, widthPx, heightPx, [], 999).length, [templates, widthPx, heightPx]);

  if (checkingAuth) {
    return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  }

  const bgCss = background === 'transparent' ? 'transparent' : background === 'custom' ? customColor : '#ffffff';
  const sizeText = `${formatUnit(widthPx, unit)} × ${formatUnit(heightPx, unit)} ${unit}`;
  const title = selected ? selected.label : 'Custom size';

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} active="create" />

        {/* Hero */}
        <section className="relative overflow-hidden border-b border-mt-border">
          <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full opacity-[0.16] dark:opacity-[0.22] blur-3xl mt-spectrum" />
          <div className="relative mt-container pt-10 sm:pt-14 pb-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-mt-muted">New design</p>
            <h1 className="mt-2 text-[34px] sm:text-5xl font-semibold tracking-tight leading-[1.05]">
              What will you <span className="mt-spectrum-text">create</span> today?
            </h1>
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 max-w-3xl">
              <label className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mt-faint" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setGoal(null);
                  }}
                  placeholder="Search sizes and templates — “story”, “A4”, “wedding”…"
                  aria-label="Search sizes and templates"
                  className="w-full h-12 rounded-2xl border border-mt-input-border bg-mt-surface pl-11 pr-4 text-[15px] shadow-[0_10px_30px_-18px_rgba(9,9,11,0.35)] focus:outline-none focus:border-[#3B82C4] focus:ring-4 focus:ring-[#8CCBFF]/30"
                />
              </label>
              <button type="button" onClick={() => setWizard(true)} className="h-12 px-5 rounded-2xl mt-spectrum-border bg-mt-surface text-[15px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-mt-surface2">
                <Wand2 size={17} className="text-[#7565C2]" /> Help me choose
              </button>
            </div>

            {/* Goals */}
            <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto mt-scroll pb-1" role="group" aria-label="What are you making?">
              {GOALS.map((g) => {
                const on = goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setQuery('');
                      setGoal(on ? null : g.id);
                      if (!on) {
                        const first = presetById(g.presets[0]);
                        if (first) pick(first);
                      }
                    }}
                    className={`shrink-0 flex items-center gap-2.5 h-14 pl-2 pr-4 rounded-2xl border transition-all ${on ? 'mt-active-blue' : 'border-mt-border bg-mt-surface hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-18px_rgba(9,9,11,0.5)]'}`}
                  >
                    <GoalIcon id={g.id} />
                    <span className="text-[13px] font-semibold whitespace-nowrap">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-container py-8 grid lg:grid-cols-[1fr_340px] 2xl:grid-cols-[1fr_400px] gap-8 2xl:gap-10 items-start">
          <div className="min-w-0 flex flex-col gap-6">
            {/* Size tabs */}
            {!q && !goalDef && (
              <div className="flex gap-2 overflow-x-auto mt-scroll -mx-4 px-4 sm:mx-0 sm:px-0 pb-1" role="tablist" aria-label="Sizes">
                <button role="tab" aria-selected={tab === 'popular'} className={pill(tab === 'popular')} onClick={() => setTab('popular')}>
                  Popular
                </button>
                {SIZE_GROUPS.map((g) => (
                  <button key={g.id} role="tab" aria-selected={tab === g.id} className={pill(tab === g.id)} onClick={() => setTab(g.id)}>
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {(q || goalDef) && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-mt-muted">
                  {q ? (
                    <>
                      Sizes for “<span className="text-mt-ink font-medium">{query.trim()}</span>”
                    </>
                  ) : (
                    <>
                      Sizes for <span className="text-mt-ink font-medium">{goalDef!.label.toLowerCase()}</span>
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setGoal(null);
                  }}
                  className="text-xs font-medium text-mt-muted hover:text-mt-ink inline-flex items-center gap-1"
                >
                  <X size={13} /> Show all sizes
                </button>
              </div>
            )}

            {/* Size cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-3">
              {shownPresets.map((p) => {
                const { width, height } = presetToPx(p);
                const on = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p)}
                    onDoubleClick={() => openBlank({ w: width, h: height })}
                    aria-pressed={on}
                    title="Click to choose · double-click to start"
                    className={`group relative rounded-2xl border bg-mt-surface p-3 pt-4 flex flex-col items-center text-center transition-all ${on ? 'mt-active-blue' : 'border-mt-border hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-22px_rgba(9,9,11,0.55)]'}`}
                  >
                    {on && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#3B82C4] text-white inline-flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                    <span className="h-[92px] flex items-center justify-center">
                      <PageGlyph w={width} h={height} box={78} active={on} />
                    </span>
                    <span className="mt-3 text-[13px] font-semibold text-mt-ink leading-tight">{p.label}</span>
                    <span className="mt-0.5 text-[11px] text-mt-muted tabular-nums">{presetLabel(p)}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setShowCustom(true);
                  setTimeout(() => document.getElementById('custom-size')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                className="group rounded-2xl border-2 border-dashed border-mt-border hover:border-[#3B82C4] p-3 flex flex-col items-center justify-center text-center min-h-[164px] transition-colors"
              >
                <span className="w-11 h-11 rounded-full bg-mt-surface2 group-hover:bg-[#3B82C4] group-hover:text-white text-mt-muted inline-flex items-center justify-center transition-colors">
                  <Ruler size={18} />
                </span>
                <span className="mt-2.5 text-[13px] font-semibold text-mt-ink">Custom size</span>
                <span className="text-[11px] text-mt-muted">Any width and height</span>
              </button>
            </div>
            {q && !shownPresets.length && <p className="text-sm text-mt-muted">No sizes called that — try another word, or set a custom size.</p>}

            {/* Templates found by name */}
            {nameMatches.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold mb-3">Templates for “{query.trim()}”</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {nameMatches.map((t) => (
                    <TemplateTile key={t.id} t={t} onOpen={() => openTemplate(t)} />
                  ))}
                </div>
              </section>
            )}

            {/* Custom size & print settings */}
            <section id="custom-size" className="rounded-3xl border border-mt-border bg-mt-surface scroll-mt-24">
              <button type="button" onClick={() => setShowCustom(!showCustom)} aria-expanded={showCustom} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                <span>
                  <span className="block text-[15px] font-semibold">Custom size &amp; print settings</span>
                  <span className="block text-xs text-mt-muted">Exact size, units, resolution, background, bleed and margins</span>
                </span>
                <ChevronDown size={18} className={`text-mt-faint transition-transform ${showCustom ? 'rotate-180' : ''}`} />
              </button>
              {showCustom && (
                <div className="px-5 pb-5 flex flex-col gap-5 border-t border-mt-border pt-5">
                  <div className="grid grid-cols-[1fr_auto_1fr] sm:grid-cols-[1fr_auto_1fr_120px] gap-2 items-start">
                    <label className="block">
                      <span className="text-xs text-mt-muted block mb-1">Width</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        key={`w-${unit}-${widthPx}`}
                        defaultValue={formatUnit(widthPx, unit)}
                        onBlur={(e) => handleWidthInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        className={field}
                      />
                      {widthError && <span className="text-[11px] text-red-500 mt-1 block">{widthError}</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => setRatioLocked((v) => !v)}
                      aria-label={ratioLocked ? 'Unlock proportions' : 'Keep proportions'}
                      title={ratioLocked ? 'Width and height change together' : 'Keep proportions'}
                      className={`mt-6 h-10 w-10 rounded-xl inline-flex items-center justify-center border ${ratioLocked ? 'border-[#3B82C4] text-[#3B82C4] bg-[#3B82C4]/10' : 'border-mt-border text-mt-faint hover:text-mt-ink'}`}
                    >
                      {ratioLocked ? <Lock size={15} /> : <Unlock size={15} />}
                    </button>
                    <label className="block">
                      <span className="text-xs text-mt-muted block mb-1">Height</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        key={`h-${unit}-${heightPx}`}
                        defaultValue={formatUnit(heightPx, unit)}
                        onBlur={(e) => handleHeightInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        className={field}
                      />
                      {heightError && <span className="text-[11px] text-red-500 mt-1 block">{heightError}</span>}
                    </label>
                    <label className="block col-span-3 sm:col-span-1">
                      <span className="text-xs text-mt-muted block mb-1">Unit</span>
                      <select value={unit} onChange={(e) => setUnit(e.target.value as DocUnit)} className={field}>
                        <option value="px">Pixels (px)</option>
                        <option value="mm">Millimetres (mm)</option>
                        <option value="cm">Centimetres (cm)</option>
                        <option value="in">Inches (in)</option>
                        <option value="pt">Points (pt)</option>
                      </select>
                    </label>
                  </div>

                  <div>
                    <p className="text-xs text-mt-muted mb-2">Resolution (for print checks and print-size exports)</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {DPI_OPTIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDpi(d);
                            setCustomDpi(false);
                          }}
                          className={chip(!customDpi && dpi === d)}
                        >
                          {d} DPI
                        </button>
                      ))}
                      <button type="button" onClick={() => setCustomDpi(true)} className={chip(customDpi)}>
                        Other
                      </button>
                      {customDpi && (
                        <input type="number" min={1} value={dpi} aria-label="DPI" onChange={(e) => setDpi(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 h-8 rounded-full border border-mt-input-border bg-mt-surface px-3 text-xs" />
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <EdgeFields label="Bleed" unit={unit} values={bleed} linked={bleedLinked} onChange={setBleed} onToggleLinked={() => setBleedLinked((v) => !v)} />
                    <EdgeFields label="Safe area / margins" unit={unit} values={safeArea} linked={safeAreaLinked} onChange={setSafeArea} onToggleLinked={() => setSafeAreaLinked((v) => !v)} />
                  </div>
                  <p className="text-[11px] text-mt-faint leading-relaxed">
                    Designs are edited in RGB. Bleed, crop marks and margins are prepared for print; your printer converts colours to CMYK.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Your design */}
          <aside className="lg:sticky lg:top-24 rounded-3xl border border-mt-border bg-mt-surface overflow-hidden shadow-[0_24px_60px_-36px_rgba(9,9,11,0.45)]">
            <div className="relative h-[230px] flex items-center justify-center bg-mt-surface2/70">
              <div aria-hidden className="absolute inset-0 opacity-[0.10] mt-spectrum" />
              <PageGlyph w={widthPx} h={heightPx} box={170} background={bgCss} accent={false} />
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold truncate">{title}</p>
                  <p className="text-xs text-mt-muted tabular-nums">
                    {selected ? presetLabel(selected) : sizeText}
                    {selected && selected.unit !== unit && unit !== 'px' ? ` · ${sizeText}` : ''}
                  </p>
                </div>
                <button type="button" onClick={swapOrientation} disabled={Math.abs(widthPx - heightPx) < 0.5} title="Swap width and height" aria-label="Swap width and height" className="shrink-0 h-9 w-9 rounded-xl border border-mt-border inline-flex items-center justify-center text-mt-muted hover:text-mt-ink disabled:opacity-30">
                  <ArrowRightLeft size={15} />
                </button>
              </div>

              <div>
                <p className="text-xs text-mt-muted mb-2">Background</p>
                <div className="flex items-center gap-2">
                  {(['white', 'transparent', 'custom'] as Background[]).map((b) => (
                    <button key={b} type="button" onClick={() => setBackground(b)} className={chip(background === b)}>
                      {b === 'white' ? 'White' : b === 'transparent' ? 'See-through' : 'Colour'}
                    </button>
                  ))}
                  {background === 'custom' && (
                    <input type="color" value={customColor} aria-label="Background colour" onChange={(e) => setCustomColor(e.target.value)} className="w-8 h-8 rounded-full border border-mt-border cursor-pointer" />
                  )}
                </div>
              </div>

              <button type="button" onClick={() => openBlank()} className="h-12 rounded-2xl bg-mt-primary text-mt-onprimary text-[15px] font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90">
                Create blank design <ArrowRight size={16} />
              </button>

              {sizeMatches.length > 0 && (
                <div className="border-t border-mt-border pt-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[13px] font-semibold">Or start from a template</p>
                    <span className="text-[11px] text-mt-faint">{allSizeMatches} in this shape</span>
                  </div>
                  {brandReady && (
                    <label className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-mt-surface2 px-3 py-2 text-xs">
                      <span>
                        <span className="font-semibold text-mt-ink">Use my brand</span>
                        <span className="text-mt-muted"> — your colours &amp; fonts</span>
                      </span>
                      <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} className="w-4 h-4 accent-[#3B82C4]" />
                    </label>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {sizeMatches.map((t) => (
                      <TemplateTile key={t.id} t={t} small onOpen={() => openTemplate(t)} />
                    ))}
                  </div>
                  <a href="/templates" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#3B82C4] hover:underline">
                    Browse all templates <ArrowRight size={12} />
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Phones and tablets: the chosen size and Create stay in reach. */}
        <div className="lg:hidden h-20" aria-hidden />
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 mt-glass border-t border-mt-border px-4 py-3 flex items-center gap-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <PageGlyph w={widthPx} h={heightPx} box={36} background={bgCss} accent={false} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{title}</p>
            <p className="text-[11px] text-mt-muted truncate tabular-nums">{selected ? presetLabel(selected) : sizeText}</p>
          </div>
          <button type="button" onClick={() => openBlank()} className="h-11 px-5 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold shrink-0">
            Create
          </button>
        </div>

        {wizard && (
          <DesignWizard
            templates={templates}
            brandReady={brandReady}
            onClose={() => setWizard(false)}
            onBlank={(p) => {
              const { width, height } = presetToPx(p);
              setWizard(false);
              openBlank({ w: width, h: height });
            }}
            onTemplate={(t, brand) => {
              setWizard(false);
              openTemplate(t, brand);
            }}
          />
        )}
      </main>
    </div>
  );
}

function TemplateTile({ t, onOpen, small }: { t: Template; onOpen: () => void; small?: boolean }) {
  const img = templateImage(t);
  return (
    <button type="button" onClick={onOpen} title={`Use “${t.name}”`} className="group text-left rounded-xl border border-mt-border overflow-hidden bg-mt-surface hover:shadow-[0_16px_32px_-20px_rgba(9,9,11,0.55)] transition-shadow">
      <span className="block bg-mt-surface2 overflow-hidden" style={{ aspectRatio: `${t.width} / ${t.height}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img && <img src={img} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />}
      </span>
      {!small && <span className="block px-2.5 py-2 text-[12px] font-medium text-mt-ink truncate">{t.name}</span>}
    </button>
  );
}
