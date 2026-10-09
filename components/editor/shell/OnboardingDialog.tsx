'use client';

import { useState } from 'react';
import { X, Cake, CreditCard, Instagram, Mail, FileText, Image as ImageIcon, BookOpen, Ruler, Sparkles, ArrowLeft, Upload } from 'lucide-react';
import { ALL_PRESETS, presetLabel, SizePreset } from '@/lib/editor/sizePresets';
import { cx } from './ui';

export interface QuickStart {
  preset: SizePreset;
  category?: string;
  wizard?: { style: string; title: string; date: string; photo: File | null };
}

const CHOICES: { id: string; label: string; icon: React.ReactNode; preset: string; wizard?: boolean }[] = [
  { id: 'birthday', label: 'Birthday', icon: <Cake size={22} />, preset: 'birthday', wizard: true },
  { id: 'business-card', label: 'Business card', icon: <CreditCard size={22} />, preset: 'business-card' },
  { id: 'instagram', label: 'Instagram post', icon: <Instagram size={22} />, preset: 'ig-post' },
  { id: 'invitation', label: 'Invitation', icon: <Mail size={22} />, preset: 'wedding', wizard: true },
  { id: 'flyer', label: 'Flyer', icon: <FileText size={22} />, preset: 'flyer' },
  { id: 'poster', label: 'Poster', icon: <ImageIcon size={22} />, preset: 'poster' },
  { id: 'resume', label: 'Resume', icon: <FileText size={22} />, preset: 'resume' },
  { id: 'magazine', label: 'Magazine', icon: <BookOpen size={22} />, preset: 'magazine-cover' },
];

const STYLES = ['Modern', 'Elegant', 'Fun', 'Kids', 'Luxury'];

// "Let's create something." — a quick start for new users. Picking a type
// sets the page size and opens matching templates; Birthday and Invitation
// also offer a short wizard that fills a template in with your details.
export function OnboardingDialog({ onPick, onCustom, onClose }: { onPick: (q: QuickStart) => void; onCustom: () => void; onClose: () => void }) {
  const [wizardFor, setWizardFor] = useState<(typeof CHOICES)[number] | null>(null);
  const [style, setStyle] = useState('Modern');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const presetOf = (id: string) => ALL_PRESETS.find((p) => p.id === id)!;

  return (
    <div className="fixed inset-0 z-[115] bg-black/40 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Let's create something">
      <div className="w-full max-w-2xl bg-mt-surface text-mt-ink rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative px-6 pt-6 pb-4">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-mt-surface2">
            <X size={18} />
          </button>
          {wizardFor ? (
            <button type="button" onClick={() => setWizardFor(null)} className="inline-flex items-center gap-1 text-sm text-mt-muted hover:text-mt-ink mb-2">
              <ArrowLeft size={15} /> Back
            </button>
          ) : null}
          <h2 className="text-2xl font-semibold tracking-tight">
            {wizardFor ? `Your ${wizardFor.label.toLowerCase()}` : (
              <>
                Let’s create <span className="mt-spectrum-text">something.</span>
              </>
            )}
          </h2>
          <p className="text-sm text-mt-muted mt-1">
            {wizardFor ? 'Answer a few questions and we’ll set up a design you can change however you like.' : 'What are you making today?'}
          </p>
        </div>

        {!wizardFor ? (
          <div className="px-6 pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (c.wizard ? setWizardFor(c) : onPick({ preset: presetOf(c.preset), category: presetOf(c.preset).templateCategory }))}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-mt-border hover:border-[#8CCBFF] hover:bg-mt-accentsoft py-5 transition-colors"
                >
                  <span className="text-mt-accent group-hover:scale-110 transition-transform">{c.icon}</span>
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-[11px] text-mt-faint">{presetLabel(presetOf(c.preset))}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={onCustom} className="mt-3 w-full h-11 rounded-xl border border-mt-border text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-mt-surface2">
              <Ruler size={16} /> Custom size
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6 flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium mb-2">What style?</p>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((s) => (
                  <button key={s} type="button" onClick={() => setStyle(s)} className={cx('px-3.5 h-9 rounded-full border text-sm', style === s ? 'bg-mt-primary text-mt-onprimary border-mt-primary' : 'border-mt-border text-mt-muted')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span className="block text-sm font-medium mb-1">{wizardFor.id === 'birthday' ? 'Whose birthday? (name)' : 'Names or title'}</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={wizardFor.id === 'birthday' ? 'e.g. Mia turns 6' : 'e.g. Sophia & Liam'} className="w-full h-11 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm" />
            </label>
            <label>
              <span className="block text-sm font-medium mb-1">Date</span>
              <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. Saturday, June 14 · 3 PM" className="w-full h-11 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm" />
            </label>
            <label className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-mt-border text-sm cursor-pointer hover:bg-mt-surface2">
                <Upload size={15} /> {photo ? 'Change photo' : 'Add a photo (optional)'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </span>
              {photo && <span className="text-xs text-mt-muted truncate">{photo.name}</span>}
            </label>
            <button
              type="button"
              onClick={() => {
                const preset = presetOf(wizardFor.preset);
                onPick({ preset, category: preset.templateCategory, wizard: { style, title, date, photo } });
              }}
              className="h-12 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Create my design
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
