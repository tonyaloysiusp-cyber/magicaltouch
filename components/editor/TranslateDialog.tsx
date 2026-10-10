'use client';

// Translate a design: pick a language, and every piece of text (in the
// selection, this page, or the whole design) is rewritten in it. Fonts
// that don't have the language's letters are swapped for one that does,
// and right-to-left languages are right-aligned. One undo puts it back.

import { useMemo, useState } from 'react';
import { Languages, Loader2, Search, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/i18n/languages';

export type TranslateScope = 'selection' | 'page' | 'all';

const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export function TranslateDialog({
  onClose,
  onTranslate,
  hasSelection,
  hasPages,
}: {
  onClose: () => void;
  onTranslate: (code: string, scope: TranslateScope, switchFonts: boolean) => Promise<number>;
  hasSelection: boolean;
  hasPages: boolean;
}) {
  const [q, setQ] = useState('');
  const [code, setCode] = useState('ar');
  const [scope, setScope] = useState<TranslateScope>(hasSelection ? 'selection' : hasPages ? 'page' : 'all');
  const [switchFonts, setSwitchFonts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? LANGUAGES.filter((l) => l.name.toLowerCase().includes(t) || l.native.toLowerCase().includes(t) || l.code.toLowerCase().startsWith(t)) : LANGUAGES;
  }, [q]);
  const lang = LANGUAGES.find((l) => l.code === code);

  const go = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const n = await onTranslate(code, scope, switchFonts);
      setMsg({ ok: true, text: `Translated ${n} text${n === 1 ? '' : 's'} into ${lang?.name}. Press Undo to go back.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Translation didn’t work. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const scopes: { id: TranslateScope; label: string; show: boolean }[] = [
    { id: 'selection', label: 'Selected', show: hasSelection },
    { id: 'page', label: 'This page', show: hasPages },
    { id: 'all', label: hasPages ? 'All pages' : 'Whole design', show: true },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Translate design"
        className="bg-mt-surface text-mt-ink w-full sm:max-w-[520px] max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-mt-border shrink-0">
          <h2 className="font-semibold inline-flex items-center gap-2">
            <Languages size={17} className="text-mt-accent" /> Translate
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex flex-col gap-5">
          <section>
            <p className="text-[13px] font-semibold mb-2">Language</p>
            <label className="relative block mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search languages" aria-label="Search languages" className="h-10 w-full rounded-xl border border-mt-input-border bg-mt-surface pl-9 pr-3 text-[14px] focus:outline-none focus:border-[#3B82C4]" />
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto pr-1" role="listbox" aria-label="Languages">
              {list.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  role="option"
                  aria-selected={code === l.code}
                  onClick={() => setCode(l.code)}
                  className={cx('text-left rounded-xl border px-3 py-2 transition-colors', code === l.code ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2')}
                >
                  <span className="block text-[13px] font-medium truncate">{l.name}</span>
                  <span className="block text-[12px] text-mt-muted truncate" dir={l.rtl ? 'rtl' : undefined}>{l.native}</span>
                </button>
              ))}
              {!list.length && <p className="col-span-full text-[13px] text-mt-muted py-4 text-center">No language matches “{q}”.</p>}
            </div>
          </section>
          <section>
            <p className="text-[13px] font-semibold mb-2">Translate</p>
            <div className="flex gap-2">
              {scopes.filter((s) => s.show).map((s) => (
                <button key={s.id} type="button" onClick={() => setScope(s.id)} aria-pressed={scope === s.id} className={cx('flex-1 h-10 rounded-xl border text-[13px] font-medium', scope === s.id ? 'mt-active-blue' : 'border-mt-border hover:bg-mt-surface2')}>
                  {s.label}
                </button>
              ))}
            </div>
          </section>
          {lang?.font && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={switchFonts} onChange={(e) => setSwitchFonts(e.target.checked)} className="mt-1 accent-[#3B82C4]" />
              <span className="text-[13px] leading-snug">
                Use a font made for {lang.name} <span className="text-mt-muted">({lang.font}), so every letter shows and prints correctly.</span>
              </span>
            </label>
          )}
          {msg && <p className={cx('text-[13px] rounded-xl px-3 py-2', msg.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300')}>{msg.text}</p>}
        </div>
        <div className="px-5 py-4 border-t border-mt-border flex gap-2 justify-end shrink-0">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-mt-border text-[13px] font-medium hover:bg-mt-surface2">Close</button>
          <button type="button" onClick={go} disabled={busy || !lang} className="h-10 px-5 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Languages size={15} />} {busy ? 'Translating…' : `Translate to ${lang?.name || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
