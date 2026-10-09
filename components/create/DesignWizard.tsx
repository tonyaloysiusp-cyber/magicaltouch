'use client';

// "Help me choose": three quick questions (what, where, which look) that
// end in the editor with the right size — blank or from a real template.

import { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Sparkles, Plus } from 'lucide-react';
import { GOALS, Goal, presetById, matchTemplates, sizeOf, templateImage } from '@/lib/create/catalog';
import { presetLabel, SizePreset } from '@/lib/editor/sizePresets';
import type { Template } from '@/lib/templatesData';
import { PageGlyph } from './PageGlyph';
import { GoalIcon } from './GoalIcon';

export function DesignWizard({
  templates,
  brandReady,
  onBlank,
  onTemplate,
  onClose,
}: {
  templates: Template[];
  brandReady: boolean;
  onBlank: (p: SizePreset, brand: boolean) => void;
  onTemplate: (t: Template, brand: boolean) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [preset, setPreset] = useState<SizePreset | null>(null);
  const [brand, setBrand] = useState(brandReady);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sizes = useMemo(() => (goal ? (goal.presets.map(presetById).filter(Boolean) as SizePreset[]) : []), [goal]);
  const matches = useMemo(() => {
    if (!preset) return [];
    const { width, height } = sizeOf(preset);
    return matchTemplates(templates, width, height, goal?.categories || [], 9);
  }, [preset, goal, templates]);

  const titles = ['What are you making?', 'Where will it be used?', 'Pick a starting point'];
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Design wizard" className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-mt-surface border border-mt-border shadow-2xl overflow-hidden animate-[mt-pop_160ms_ease-out]">
        <div className="relative px-5 sm:px-7 pt-5 pb-4 border-b border-mt-border">
          <div className="absolute inset-x-0 top-0 h-1 mt-spectrum" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-mt-muted">
              <Sparkles size={14} className="text-[#A69BD3]" /> Design wizard · Step {step + 1} of 3
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full inline-flex items-center justify-center text-mt-muted hover:bg-mt-surface2">
              <X size={18} />
            </button>
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-semibold text-mt-ink">{titles[step]}</h2>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-10 bg-[#3B82C4]' : 'w-5 bg-mt-border'}`} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5">
          {step === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGoal(g);
                    setPreset(presetById(g.presets[0]) || null);
                    setStep(1);
                  }}
                  className={`group text-left rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(9,9,11,0.45)] ${goal?.id === g.id ? 'mt-active-blue' : 'border-mt-border hover:border-mt-faint'}`}
                >
                  <GoalIcon id={g.id} />
                  <p className="mt-2.5 text-[14px] font-semibold text-mt-ink leading-tight">{g.label}</p>
                  <p className="mt-0.5 text-[12px] text-mt-muted">{g.hint}</p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && goal && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sizes.map((p) => {
                const { width, height } = sizeOf(p);
                const on = preset?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p)}
                    onDoubleClick={() => {
                      setPreset(p);
                      setStep(2);
                    }}
                    aria-pressed={on}
                    className={`group relative rounded-2xl border p-3 flex flex-col items-center text-center transition-colors ${on ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2'}`}
                  >
                    {on && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#3B82C4] text-white inline-flex items-center justify-center">
                        <Check size={12} />
                      </span>
                    )}
                    <span className="h-[96px] flex items-center justify-center">
                      <PageGlyph w={width} h={height} box={80} active={on} />
                    </span>
                    <span className="mt-2 text-[13px] font-semibold text-mt-ink">{p.label}</span>
                    <span className="text-[11px] text-mt-muted">{presetLabel(p)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && preset && (
            <div className="flex flex-col gap-4">
              {brandReady && (
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-mt-border px-4 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-mt-ink">Use my brand</span>
                    <span className="block text-xs text-mt-muted">Swap the template’s colours and fonts for your brand kit.</span>
                  </span>
                  <input type="checkbox" checked={brand} onChange={(e) => setBrand(e.target.checked)} className="w-5 h-5 accent-[#3B82C4]" />
                </label>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button type="button" onClick={() => onBlank(preset, brand)} className="group rounded-2xl border-2 border-dashed border-mt-border hover:border-[#3B82C4] p-3 flex flex-col items-center justify-center min-h-[200px] transition-colors">
                  <span className="w-11 h-11 rounded-full bg-mt-surface2 group-hover:bg-[#3B82C4] group-hover:text-white text-mt-muted inline-flex items-center justify-center transition-colors">
                    <Plus size={20} />
                  </span>
                  <span className="mt-2.5 text-sm font-semibold text-mt-ink">Blank {preset.label.toLowerCase()}</span>
                  <span className="text-[11px] text-mt-muted">{presetLabel(preset)}</span>
                </button>
                {matches.map((t) => (
                  <button key={t.id} type="button" onClick={() => onTemplate(t, brand)} className="group text-left rounded-2xl border border-mt-border overflow-hidden hover:shadow-[0_18px_36px_-20px_rgba(9,9,11,0.5)] transition-shadow">
                    <span className="block bg-mt-surface2" style={{ aspectRatio: `${t.width} / ${t.height}` }}>
                      {templateImage(t) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={templateImage(t)!} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      )}
                    </span>
                    <span className="block px-2.5 py-2 text-[12px] font-medium text-mt-ink truncate">{t.name}</span>
                  </button>
                ))}
              </div>
              {!matches.length && <p className="text-sm text-mt-muted">No templates in this exact size yet — start blank, or pick another size.</p>}
            </div>
          )}
        </div>

        <div className="px-5 sm:px-7 py-3.5 border-t border-mt-border flex items-center justify-between gap-3">
          <button type="button" onClick={() => (step === 0 ? onClose() : setStep(step - 1))} className="h-10 px-4 rounded-full text-sm font-medium text-mt-muted hover:text-mt-ink inline-flex items-center gap-1.5">
            {step > 0 && <ArrowLeft size={15} />}
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 && (
            <button type="button" disabled={!preset} onClick={() => setStep(2)} className="h-10 px-5 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-40">
              Next <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
