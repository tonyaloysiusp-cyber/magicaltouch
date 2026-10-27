'use client';

// "Create with Claude": write a short brief (an upcoming occasion fills it
// in), open Claude in a new tab with the full instructions ready — works
// with a free Claude account; attach a screenshot there for inspiration —
// then paste Claude's reply here. It becomes a real, editable draft
// template, with photos picked from our own photo library.

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, Sparkles, X } from 'lucide-react';
import { SPEC_FORMATS, claudePrompt, parseSpec, specToCanvasJson, LibraryPhotoLite } from '@/lib/templates/fromSpec';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { createTemplate, setTemplateContent } from '@/lib/templatesData';
import { useEscapeKey } from '@/hooks/useEscapeKey';

const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const STYLES = ['Elegant & luxury', 'Bold & modern', 'Minimal & clean', 'Playful & colourful', 'Traditional & festive', 'Corporate & professional', 'Cute & soft', 'Retro'];

export function ClaudeTemplate({ userId, topic = '', onClose, onCreated }: { userId: string; topic?: string; onClose: () => void; onCreated: (id: string, editHref: string) => void }) {
  useEscapeKey(onClose);
  const [brief, setBrief] = useState({ topic, format: SPEC_FORMATS[0].id, style: STYLES[0], colors: '', wording: '', language: 'English' });
  const [reply, setReply] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photos, setPhotos] = useState<LibraryPhotoLite[]>([]);
  const fmt = SPEC_FORMATS.find((f) => f.id === brief.format) || SPEC_FORMATS[0];
  const prompt = useMemo(() => claudePrompt({ topic: brief.topic || 'a festive greeting', format: { w: fmt.w, h: fmt.h, label: fmt.label.replace(/\s*\(.*\)/, '') }, style: brief.style, colors: brief.colors, wording: brief.wording, language: brief.language }), [brief, fmt]);
  const set = (p: Partial<typeof brief>) => setBrief((b) => ({ ...b, ...p }));

  useEffect(() => {
    // Our own free photo library: template photos plus the CC0 "pro" set.
    Promise.all(['/templates/photos/pro/index.json', '/templates/photos/index.json'].map((u) => fetch(u).then((r) => r.json()).then((d) => d.photos || []).catch(() => [])))
      .then(([a, b]) => setPhotos([...a, ...b]));
  }, []);

  // Live preview as soon as a reply is pasted.
  useEffect(() => {
    if (!reply.trim()) { setPreview(null); setErr(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const spec = parseSpec(reply);
        const json = specToCanvasJson(spec, photos);
        const pages = await renderTemplatePages(json, 700);
        if (live) { setPreview(pages[0]?.url || null); setErr(null); }
      } catch (e: any) {
        if (live) { setPreview(null); setErr(e?.message || 'That reply couldn’t be read.'); }
      }
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [reply, photos]);

  const openClaude = () => {
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const spec = parseSpec(reply);
      const json = specToCanvasJson(spec, photos);
      const tags = Array.isArray(spec.tags) ? spec.tags.map((t) => String(t).toLowerCase()).slice(0, 12) : [];
      const t = await createTemplate({ name: spec.name, category: spec.category || 'Social Media', width: spec.width, height: spec.height, colors: ['#ffffff', '#111111'], description: spec.description || null, tags: [...tags, 'made-with-claude'], occasion: spec.occasion || null, searchKeywords: tags.join(', ') || null }, userId);
      if (!t?.id) throw new Error('Could not create the template.');
      const pages = await renderTemplatePages(json, 1200);
      const ok = await setTemplateContent(t.id, '1.0', json, pages[0]?.url || null);
      if (!ok) throw new Error('The template was created but its design could not be saved. Open it and try again.');
      onCreated(t.id, `/editor?w=${spec.width}&h=${spec.height}&templateId=${t.id}&editTemplate=1`);
    } catch (e: any) {
      setErr(e?.message || 'Could not save.');
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Create a template with Claude" className="bg-mt-surface text-mt-ink w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 h-14 border-b border-mt-border shrink-0">
          <h2 className="font-semibold inline-flex items-center gap-2 flex-1"><Sparkles size={17} className="text-[#D97757]" /> Create a template with Claude</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:bg-mt-surface2"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto grid lg:grid-cols-2 gap-6 p-5">
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-semibold">1 · Your brief</p>
            <label className="text-[12px] text-mt-muted">What is it for?<input className={field} value={brief.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Diwali sale for a jewellery shop" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px] text-mt-muted">Size<select className={field} value={brief.format} onChange={(e) => set({ format: e.target.value })}>{SPEC_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
              <label className="text-[12px] text-mt-muted">Style<select className={field} value={brief.style} onChange={(e) => set({ style: e.target.value })}>{STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="text-[12px] text-mt-muted">Colours (optional)<input className={field} value={brief.colors} onChange={(e) => set({ colors: e.target.value })} placeholder="deep maroon and gold" /></label>
              <label className="text-[12px] text-mt-muted">Language<select className={field} value={brief.language} onChange={(e) => set({ language: e.target.value })}>{['English', 'Arabic', 'Tamil', 'Malayalam', 'Hindi', 'Telugu', 'Urdu', 'French', 'Spanish'].map((l) => <option key={l}>{l}</option>)}</select></label>
            </div>
            <label className="text-[12px] text-mt-muted">Wording (optional)<textarea rows={2} className={`${field} h-auto py-2`} value={brief.wording} onChange={(e) => set({ wording: e.target.value })} placeholder="Leave empty and Claude writes it" /></label>
            <p className="text-[13px] font-semibold mt-2">2 · Ask Claude</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openClaude} className="h-10 px-4 rounded-xl bg-[#D97757] text-white text-sm font-semibold inline-flex items-center gap-2"><ExternalLink size={15} /> Open Claude with this brief</button>
              <button type="button" onClick={copy} className="h-10 px-4 rounded-xl border border-mt-border text-sm inline-flex items-center gap-2">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy instructions'}</button>
            </div>
            <p className="text-[12px] text-mt-muted">Works with a free Claude account. In Claude, you can attach a screenshot of a design you like — it’s used only as inspiration. If the message box is empty there, paste the copied instructions.</p>
            <p className="text-[13px] font-semibold mt-2">3 · Paste Claude’s reply</p>
            <textarea rows={8} className={`${field} h-auto py-2 font-mono text-[12px]`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the whole reply here (the ```json … ``` part)" />
            {err && <p className="text-[13px] text-rose-600">{err}</p>}
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-[13px] font-semibold">Preview</p>
            <div className="flex-1 min-h-[260px] rounded-2xl bg-mt-surface2 border border-mt-border flex items-center justify-center p-4">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Template preview" className="max-h-[52vh] max-w-full object-contain shadow-lg rounded" />
              ) : (
                <p className="text-[13px] text-mt-muted text-center px-6">The design appears here as soon as you paste Claude’s reply.</p>
              )}
            </div>
            <button type="button" disabled={!preview || busy} onClick={save} className="h-11 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save as a draft template and open it
            </button>
            <p className="text-[12px] text-mt-muted">It is saved as a draft: fine-tune it in the editor, then publish it from Templates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
