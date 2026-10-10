'use client';

import { useRef, useState } from 'react';
import { Plus, X, Wand2, ImagePlus, Type, Loader2, Check } from 'lucide-react';
import { BrandKit, BRAND_PALETTES, DEFAULT_BRAND_APPLY } from '@/lib/editor/brandKit';
import { GOOGLE_FONT_NAMES } from '@/lib/editor/googleFonts';
import { ColorPicker } from '../ColorPicker';
import { PanelSection, Popover } from '../ui';

function Switch({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-1.5 ${disabled ? 'opacity-45' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-mt-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mt-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${on ? 'bg-mt-primary' : 'bg-mt-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  );
}

export function BrandPanel({
  kit,
  onChange,
  saving,
  onApply,
  onAddLogo,
  onAddInfo,
  onUploadLogo,
  documentColors,
  logoOnPage,
  onToggleLogo,
  onApplyPalette,
}: {
  kit: BrandKit;
  onChange: (k: BrandKit) => void;
  saving: 'idle' | 'saving' | 'saved' | 'error';
  onApply: () => void;
  onAddLogo: () => void;
  onAddInfo: () => void;
  onUploadLogo: (file: File) => void;
  documentColors: string[];
  logoOnPage: boolean;
  onToggleLogo: (on: boolean) => void;
  onApplyPalette: (colors: string[]) => void;
}) {
  const apply = kit.apply || DEFAULT_BRAND_APPLY;
  const setApply = (patch: Partial<typeof apply>) => onChange({ ...kit, apply: { ...apply, ...patch } });
  const logoRef = useRef<HTMLInputElement>(null);
  const [draftColor, setDraftColor] = useState('#8CCBFF');
  const field = (key: keyof BrandKit['info'], label: string, type = 'text') => (
    <label className="block">
      <span className="block text-[11px] text-mt-muted mb-0.5">{label}</span>
      <input
        type={type}
        defaultValue={kit.info[key] || ''}
        onBlur={(e) => e.target.value !== (kit.info[key] || '') && onChange({ ...kit, info: { ...kit.info, [key]: e.target.value } })}
        className="w-full h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-sm text-mt-ink"
      />
    </label>
  );
  const fontSelect = (which: 'heading' | 'body', label: string) => (
    <label className="block">
      <span className="block text-[11px] text-mt-muted mb-0.5">{label}</span>
      <select
        value={kit.fonts[which] || ''}
        onChange={(e) => onChange({ ...kit, fonts: { ...kit.fonts, [which]: e.target.value || undefined } })}
        className="w-full h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-sm text-mt-ink"
        style={{ fontFamily: kit.fonts[which] ? `"${kit.fonts[which]}"` : undefined }}
      >
        <option value="">Choose a font…</option>
        {GOOGLE_FONT_NAMES.map((f) => (
          <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>
            {f}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="rounded-2xl p-4 mb-5 mt-spectrum-border">
        <p className="text-sm font-semibold text-mt-ink">Your brand, only when you want it</p>
        <p className="text-xs text-mt-muted mt-1">Templates always open in their own design. Choose what your brand changes, then apply it to this page.</p>
        <div className="mt-3 divide-y divide-mt-border">
          <Switch label="Brand colours" hint="Matched by role: accents, text and backgrounds" on={apply.colors} onChange={(v) => setApply({ colors: v })} disabled={!kit.colors.length} />
          <Switch label="Brand fonts" hint="Off keeps the template’s own fonts" on={apply.fonts} onChange={(v) => setApply({ fonts: v })} disabled={!kit.fonts.heading && !kit.fonts.body} />
          <Switch label="Logo on this page" hint={kit.logoUrl ? 'Places your logo, or removes it' : 'Upload a logo below first'} on={logoOnPage} onChange={onToggleLogo} disabled={!kit.logoUrl} />
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={!(apply.colors && kit.colors.length) && !(apply.fonts && (kit.fonts.heading || kit.fonts.body))}
          className="mt-3 w-full h-10 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Wand2 size={16} /> Apply to this page
        </button>
        <p className="text-[11px] text-mt-faint mt-2 text-right" aria-live="polite">
          {saving === 'saving' ? (
            <span className="inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Saving…</span>
          ) : saving === 'saved' ? (
            <span className="inline-flex items-center gap-1"><Check size={11} /> Saved to your account</span>
          ) : saving === 'error' ? (
            'Saved on this device only'
          ) : null}
        </p>
      </div>

      <PanelSection title="Brand colours">
        <div className="flex flex-wrap gap-2">
          {kit.colors.map((c, i) => (
            <span key={c + i} className="relative group">
              <span className="block w-10 h-10 rounded-xl ring-1 ring-black/10" style={{ background: c }} title={c} />
              <button
                type="button"
                aria-label={`Remove ${c}`}
                onClick={() => onChange({ ...kit, colors: kit.colors.filter((_, j) => j !== i) })}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-mt-surface border border-mt-border text-mt-muted opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <Popover
            width={300}
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} aria-label="Add a brand colour" className="w-10 h-10 rounded-xl border-2 border-dashed border-mt-border text-mt-muted hover:text-mt-ink flex items-center justify-center">
                <Plus size={16} />
              </button>
            )}
          >
            {(close) => (
              <div>
                <ColorPicker value={draftColor} alpha={false} documentColors={documentColors} onChange={(v) => typeof v === 'string' && setDraftColor(v)} />
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...kit, colors: [...kit.colors, draftColor] });
                    close();
                  }}
                  className="mt-3 w-full h-9 rounded-lg bg-mt-primary text-mt-onprimary text-sm font-semibold"
                >
                  Add colour
                </button>
              </div>
            )}
          </Popover>
        </div>
        {documentColors.length > 0 && kit.colors.length === 0 && (
          <button type="button" onClick={() => onChange({ ...kit, colors: documentColors.slice(0, 5) })} className="mt-2 text-xs text-mt-accent hover:underline">
            Use the colours from this design
          </button>
        )}
      </PanelSection>

      <PanelSection title="Colour palettes">
        <p className="text-[11px] text-mt-muted mb-2">Tap a palette to try it on this page. Use “Save” to make it your brand colours.</p>
        <div className="grid grid-cols-2 gap-2">
          {BRAND_PALETTES.map((p) => (
            <div key={p.name} className="rounded-xl ring-1 ring-mt-border overflow-hidden bg-mt-surface">
              <button type="button" onClick={() => onApplyPalette(p.colors)} title={`Try ${p.name} on this page`} className="w-full flex h-8">
                {p.colors.map((c) => (
                  <span key={c} className="flex-1" style={{ background: c }} />
                ))}
              </button>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[11px] text-mt-ink">{p.name}</span>
                <button type="button" onClick={() => onChange({ ...kit, colors: p.colors })} className="text-[11px] text-mt-accent hover:underline">
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Brand fonts">
        <p className="text-[11px] text-mt-muted mb-2">Optional. Fonts change only when “Brand fonts” is switched on.</p>
        <div className="flex flex-col gap-2">
          {fontSelect('heading', 'Headings')}
          {fontSelect('body', 'Body text')}
        </div>
      </PanelSection>

      <PanelSection title="Logo">
        {kit.logoUrl ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={kit.logoUrl} alt="Your logo" className="w-20 h-20 object-contain rounded-xl ring-1 ring-mt-border bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:12px_12px]" />
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={onAddLogo} className="h-9 px-3 rounded-lg bg-mt-primary text-mt-onprimary text-xs font-semibold">Add a copy</button>
              <button type="button" onClick={() => logoRef.current?.click()} className="h-8 px-3 rounded-lg border border-mt-border text-xs text-mt-ink">Change logo</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => logoRef.current?.click()} className="w-full h-20 rounded-xl border-2 border-dashed border-mt-border text-sm text-mt-muted hover:text-mt-ink inline-flex items-center justify-center gap-2">
            <ImagePlus size={18} /> Upload your logo
          </button>
        )}
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onUploadLogo(f);
          }}
        />
      </PanelSection>

      <PanelSection
        title="Business details"
        action={
          <button type="button" onClick={onAddInfo} className="inline-flex items-center gap-1 text-xs text-mt-accent hover:underline">
            <Type size={12} /> Add to page
          </button>
        }
      >
        <div className="flex flex-col gap-2">
          {field('business', 'Business name')}
          {field('tagline', 'Tagline')}
          {field('phone', 'Phone', 'tel')}
          {field('email', 'Email', 'email')}
          {field('website', 'Website', 'url')}
          {field('address', 'Address')}
        </div>
      </PanelSection>
    </div>
  );
}
