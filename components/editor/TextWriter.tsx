'use client';

// Text writer: type, paste or translate one text in any language and put it
// on the design — replacing the selected text or as a new text. Tamil can be
// typed in Tanglish (vanakkam → வணக்கம்) with an accept / keep choice per
// word; translation never locks the text: the original stays one click away
// and the result is ordinary editable text.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Copy, Eraser, Languages, Loader2, RotateCcw, Replace, Plus, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { LANGUAGES, translateTexts } from '@/lib/i18n/languages';
import { tanglishToTamil, tanglishSuggest, tanglishAlternatives } from '@/lib/i18n/tanglish';

export interface TextWriterResult { text: string; lang: string | null; direction: 'ltr' | 'rtl' }

const RTL = new Set(['ar', 'fa', 'ur', 'he', 'ps', 'sd', 'yi']);
const detectDir = (s: string): 'ltr' | 'rtl' => (/[֐-ࣿיִ-ﻼ]/.test(s.replace(/[^\p{L}]/gu, '').slice(0, 40)) ? 'rtl' : 'ltr');

export function TextWriter({ initial, hasText, onReplace, onInsert, onClose }: {
  initial: string;
  hasText: boolean;
  onReplace: (r: TextWriterResult) => void;
  onInsert: (r: TextWriterResult) => void;
  onClose: () => void;
}) {
  useEscapeKey(() => onClose());
  const [text, setText] = useState(initial);
  const original = useRef(initial);
  const [translated, setTranslated] = useState<string | null>(null);
  const [lang, setLang] = useState<string>('ta');
  const [tanglish, setTanglish] = useState(false);
  const [dir, setDir] = useState<'auto' | 'ltr' | 'rtl'>('auto');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<number, string>>({}); // chosen spelling per word start
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { area.current?.focus(); }, []);

  const words = useMemo(() => (tanglish ? tanglishSuggest(text) : []), [tanglish, text]);
  const converted = useMemo(() => {
    if (!tanglish) return '';
    let out = '', at = 0;
    for (const w of words) { out += text.slice(at, w.start) + (pick[w.start] ?? w.tamil); at = w.start + w.latin.length; }
    return out + text.slice(at);
  }, [tanglish, words, text, pick]);
  const direction = dir === 'auto' ? detectDir(text) : dir;
  const result = (t = text): TextWriterResult => ({ text: t, lang: translated != null && text === translated ? lang : /[஀-௿]/.test(t) ? 'ta' : null, direction: dir === 'auto' ? detectDir(t) : dir });

  const translate = async () => {
    if (!text.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await translateTexts([text], lang);
      if (r.failed.length) setMsg('Could not translate right now — your text is unchanged.');
      else { setTranslated(r.texts[0]); setText(r.texts[0]); if (RTL.has(lang)) setDir('rtl'); }
    } catch { setMsg('Could not translate right now — your text is unchanged.'); }
    setBusy(false);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setMsg('Copied.'); } catch { area.current?.select(); document.execCommand('copy'); setMsg('Copied.'); } };
  const paste = async () => {
    try { const t = await navigator.clipboard.readText(); const el = area.current; if (!el) { setText((v) => v + t); return; } const s = el.selectionStart, e = el.selectionEnd; setText((v) => v.slice(0, s) + t + v.slice(e)); setMsg('Pasted.'); }
    catch { setMsg('Your browser blocked reading the clipboard — press Ctrl+V (⌘V) in the box instead.'); area.current?.focus(); }
  };
  const btn = 'h-9 px-3 rounded-xl border border-mt-border text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-mt-surface2 disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Text writer" className="bg-mt-surface text-mt-ink w-full sm:max-w-[640px] max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-mt-border shrink-0">
          <h2 className="font-semibold inline-flex items-center gap-2"><Languages size={17} className="text-mt-accent" /> Text writer</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={tanglish} onChange={(e) => { setTanglish(e.target.checked); setPick({}); }} className="h-4 w-4 accent-[#3B82C4]" /> Type Tamil in English letters (Tanglish)</label>
            <span className="ml-auto inline-flex items-center gap-1.5">Direction<select value={dir} onChange={(e) => setDir(e.target.value as any)} aria-label="Text direction" className="h-8 rounded-lg border border-mt-border bg-mt-bg px-2"><option value="auto">Auto ({detectDir(text) === 'rtl' ? 'right to left' : 'left to right'})</option><option value="ltr">Left to right</option><option value="rtl">Right to left</option></select></span>
          </div>
          <textarea ref={area} value={text} onChange={(e) => { setText(e.target.value); setPick({}); }} dir={direction} rows={5} lang={tanglish ? 'en' : undefined} spellCheck={!tanglish}
            placeholder={tanglish ? 'Vanakkam, eppadi irukkinga?' : 'Type, paste or translate any language — தமிழ், العربية, हिन्दी, 中文…'}
            aria-label="Text" className="w-full rounded-2xl border border-mt-input-border bg-mt-bg p-3 text-[17px] leading-relaxed focus:outline-none focus:border-[#3B82C4]" style={{ fontFamily: '"Noto Sans Tamil", "Noto Sans", "Noto Naskh Arabic", "Noto Sans Devanagari", "Noto Sans SC", system-ui, sans-serif' }} />
          {tanglish && text.trim() && <section aria-label="Tamil suggestion" className="rounded-2xl border border-mt-border p-3 space-y-2">
            <p className="text-[18px] leading-relaxed" lang="ta" style={{ fontFamily: '"Noto Sans Tamil", system-ui' }}>{converted}</p>
            <p className="text-[11.5px] text-mt-muted">Wrong spelling? Tap a word to try another (ண / ந / ன, ல / ள / ழ, ர / ற, long vowels). English words: tap until it shows the English again.</p>
            <div className="flex flex-wrap gap-1.5">{words.map((w) => {
              const cur = pick[w.start] ?? w.tamil;
              const opts = [w.tamil, ...tanglishAlternatives(w.latin, 6), w.latin];
              return <button key={w.start} type="button" onClick={() => setPick((p) => ({ ...p, [w.start]: opts[(opts.indexOf(cur) + 1) % opts.length] }))} title={`${w.latin}: tap for another spelling`} className={`h-8 px-2.5 rounded-lg border text-[14px] ${cur === w.latin ? 'border-amber-400' : w.known ? 'border-emerald-500' : 'border-mt-border'}`} lang="ta">{cur}</button>;
            })}</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setText(converted); setTanglish(false); setPick({}); setMsg('Converted to Tamil — keep typing or edit it.'); }} className="h-9 px-4 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold">Use the Tamil</button>
              <button type="button" onClick={() => setTanglish(false)} className={btn}>Keep as I typed</button>
            </div>
          </section>}
          <div className="flex flex-wrap items-center gap-2">
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Translate to" className="h-9 rounded-xl border border-mt-border bg-mt-bg px-2 text-[13px]">{LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name} — {l.native}</option>)}</select>
            <button type="button" onClick={translate} disabled={busy || !text.trim()} className={btn}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />} Translate text</button>
            {translated != null && <>
              <button type="button" onClick={() => setText(original.current)} aria-pressed={text === original.current} className={btn}>Original</button>
              <button type="button" onClick={() => setText(translated)} aria-pressed={text === translated} className={btn}>Translated</button>
            </>}
          </div>
          <p className="text-[11.5px] text-mt-faint">Translation sends this text to Google Translate. Tanglish conversion stays on this device.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} disabled={!text} className={btn}><Copy size={14} /> Copy text</button>
            <button type="button" onClick={paste} className={btn}><ClipboardPaste size={14} /> Paste text</button>
            <button type="button" onClick={() => { setText(''); area.current?.focus(); }} disabled={!text} className={btn}><Eraser size={14} /> Clear</button>
            <button type="button" onClick={() => { setText(original.current); setTranslated(null); }} disabled={text === original.current} className={btn}><RotateCcw size={14} /> Back to the original</button>
          </div>
          {msg && <p role="status" className="text-[12.5px] text-mt-muted">{msg}</p>}
        </div>
        <div className="px-5 py-4 border-t border-mt-border flex flex-wrap gap-2 justify-end shrink-0">
          <button type="button" onClick={() => { const t = tanglish ? converted : text; if (t.trim()) { onInsert(result(t)); onClose(); } }} disabled={!text.trim()} className={btn}><Plus size={14} /> Insert as new text</button>
          <button type="button" onClick={() => { const t = tanglish ? converted : text; onReplace(result(t)); onClose(); }} disabled={!hasText} title={hasText ? '' : 'Select a text on the design first'} className="h-9 px-4 rounded-xl bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"><Replace size={14} /> Replace selected text</button>
        </div>
      </div>
    </div>
  );
}

/** The language whose script a text is written in (for picking a font that has its letters). */
export function scriptLang(s: string): string | null {
  const t = s.replace(/[^\p{L}]/gu, '');
  const tests: [RegExp, string][] = [[/[஀-௿]/, 'ta'], [/[ഀ-ൿ]/, 'ml'], [/[ఀ-౿]/, 'te'], [/[ಀ-೿]/, 'kn'], [/[඀-෿]/, 'si'], [/[ঀ-৿]/, 'bn'], [/[઀-૿]/, 'gu'], [/[਀-੿]/, 'pa'], [/[ऀ-ॿ]/, 'hi'], [/[؀-ۿ]/, 'ar'], [/[֐-׿]/, 'he'], [/[぀-ヿ]/, 'ja'], [/[가-힯]/, 'ko'], [/[一-鿿]/, 'zh'], [/[฀-๿]/, 'th'], [/[Ѐ-ӿ]/, 'ru']];
  for (const [re, code] of tests) if (re.test(t)) return code;
  return null;
}
