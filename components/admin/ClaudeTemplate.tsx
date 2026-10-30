'use client';

// AI Template Studio (Admin → Templates). Two ways in, about a minute each:
//  · Recreate an image — paste, drop or upload a reference / inspiration
//    picture. We measure its colours and size, then an AI rebuilds it as an
//    editable template (close copy, or "inspired by").
//  · Describe it — a short brief (an upcoming occasion fills it in).
// Then either one click (free Gemini key set in Vercel) or any of ten free
// AI chats — Claude, ChatGPT, Gemini, Copilot… — opened with the
// instructions ready; paste the reply back. Photos come from our own
// library or, optionally, free AI-generated photos (nothing stored).
// The result is a real draft template, ready to fine-tune in the editor.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, ImagePlus, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { SPEC_FORMATS, claudePrompt, recreatePrompt, parseSpec, specToCanvasJson, withAiPhotos, LibraryPhotoLite } from '@/lib/templates/fromSpec';
import { AI_PROVIDERS, copyImage, nearestFormat, paletteOf, shrinkImage } from '@/lib/templates/aiProviders';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { createTemplate, setTemplateContent } from '@/lib/templatesData';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { apiFetch } from '@/lib/api/client';
import { createProject } from '@/lib/api/projects';

const field = 'w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm text-mt-ink';
const STYLES = ['Elegant & luxury', 'Bold & modern', 'Minimal & clean', 'Playful & colourful', 'Traditional & festive', 'Corporate & professional', 'Cute & soft', 'Retro'];
const LANGS = ['English', 'Arabic', 'Tamil', 'Malayalam', 'Hindi', 'Telugu', 'Urdu', 'French', 'Spanish'];
const QUICK = ['Eid Mubarak greeting post', 'Diwali sale for a jewellery shop', 'Restaurant weekend offer', 'We’re hiring — sales executive', 'Birthday party invitation for a 5 year old', 'Real estate just listed', 'Gym membership offer', 'Wedding save the date'];

// target 'template' (admins): saved as a draft site template.
// target 'design' (everyone, /ai-studio): saved as the person's own design.
export function ClaudeTemplate({ userId, topic = '', target = 'template', onClose, onCreated }: { userId: string; topic?: string; target?: 'template' | 'design'; onClose: () => void; onCreated: (id: string, editHref: string) => void }) {
  useEscapeKey(onClose);
  const [mode, setMode] = useState<'image' | 'brief'>(topic ? 'brief' : 'image');
  const [brief, setBrief] = useState({ topic, format: SPEC_FORMATS[0].id, style: STYLES[0], colors: '', wording: '', language: 'English' });
  const [img, setImg] = useState<{ dataUrl: string; w: number; h: number } | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [closeness, setCloseness] = useState<'close' | 'inspired'>('close');
  const [aiPhotos, setAiPhotos] = useState(false);
  const [reply, setReply] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'auto' | 'save' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<LibraryPhotoLite[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const fmt = SPEC_FORMATS.find((f) => f.id === brief.format) || SPEC_FORMATS[0];
  const set = (p: Partial<typeof brief>) => setBrief((b) => ({ ...b, ...p }));
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote((x) => (x === m ? null : x)), 5000); };

  const prompt = useMemo(() => {
    const format = { w: fmt.w, h: fmt.h, label: fmt.label.replace(/\s*\(.*\)/, '') };
    return mode === 'image'
      ? recreatePrompt({ format, palette, topic: brief.topic || undefined, wording: brief.wording, language: brief.language, closeness })
      : claudePrompt({ topic: brief.topic || 'a festive greeting', format, style: brief.style, colors: brief.colors, wording: brief.wording, language: brief.language });
  }, [mode, brief, fmt, palette, closeness]);

  useEffect(() => {
    Promise.all(['/templates/photos/pro/index.json', '/templates/photos/index.json'].map((u) => fetch(u).then((r) => r.json()).then((d) => d.photos || []).catch(() => []))).then(([a, b]) => setPhotos([...a, ...b]));
    if (target === 'template') apiFetch<{ auto: boolean }>('/api/admin/ai-template').then((r) => setAuto(!!r.auto)).catch(() => setAuto(false));
    else setAuto(false);
  }, [target]);

  // Read a reference image: shrink it, measure its colours, pick the nearest size.
  const takeImage = useCallback(async (file: File | Blob) => {
    if (!file.type.startsWith('image/')) return setErr('That isn’t an image.');
    setErr(null);
    const url = URL.createObjectURL(file);
    try {
      const s = await shrinkImage(url, 1280);
      setImg(s);
      setMode('image');
      setPalette(await paletteOf(s.dataUrl).catch(() => []));
      set({ format: nearestFormat(s.w, s.h, SPEC_FORMATS).id });
    } catch { setErr('Couldn’t read that image.'); }
    URL.revokeObjectURL(url);
  }, []);

  // Ctrl+V anywhere in the studio pastes a screenshot.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      const f = item?.getAsFile();
      if (f) { e.preventDefault(); takeImage(f); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [takeImage]);

  // Live preview whenever a reply arrives.
  useEffect(() => {
    if (!reply.trim()) { setPreview(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const spec = parseSpec(reply);
        let pages;
        try {
          pages = await renderTemplatePages(specToCanvasJson(aiPhotos ? withAiPhotos(spec) : spec, photos), 700);
        } catch (e) {
          if (!aiPhotos) throw e;
          // The free AI photo service didn't answer — show library photos instead.
          pages = await renderTemplatePages(specToCanvasJson(spec, photos), 700);
          if (live) { setAiPhotos(false); flash('Free AI photos didn’t load right now — using library photos instead.'); }
        }
        if (live) { setPreview(pages[0]?.url || null); setErr(null); }
      } catch (e: any) {
        if (live) { setPreview(null); setErr(e?.message || 'That reply couldn’t be read.'); }
      }
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [reply, photos, aiPhotos]);

  const makeNow = async () => {
    setBusy('auto'); setErr(null);
    try {
      const r = await apiFetch<{ reply: string }>('/api/admin/ai-template', { method: 'POST', body: JSON.stringify({ prompt, image: mode === 'image' ? img?.dataUrl : undefined }) });
      setReply(r.reply);
    } catch (e: any) { setErr(e?.message || 'The AI didn’t answer. Use a free chat app below.'); }
    setBusy(null);
  };

  const openChat = async (p: (typeof AI_PROVIDERS)[number]) => {
    // Open the tab first (browsers block pop-ups opened after an await).
    const w = window.open(p.url(prompt), '_blank', 'noopener');
    if (mode === 'image' && img && p.prefill) {
      const ok = await copyImage(img.dataUrl);
      flash(ok ? `${p.name} is open with the instructions. Your image is copied — press Ctrl+V (or long-press → Paste) in the chat, then send.` : `${p.name} is open. Attach your image with the 📎 button, then send.`);
    } else {
      try { await navigator.clipboard.writeText(prompt); } catch {}
      flash(`Instructions copied — paste them into ${p.name}${mode === 'image' ? ' and attach your image' : ''}, then send.`);
    }
    if (!w) flash('Your browser blocked the new tab — allow pop-ups for this site.');
  };

  const save = async () => {
    setBusy('save'); setErr(null);
    try {
      let spec = parseSpec(reply);
      if (aiPhotos) spec = withAiPhotos(spec);
      const json = specToCanvasJson(spec, photos);
      if (target === 'design') {
        const pages = await renderTemplatePages(json, 600).catch(() => []);
        const thumb = pages[0]?.url && pages[0].url.length < 400000 ? pages[0].url : null;
        const d = await createProject({ name: spec.name, width: spec.width, height: spec.height, canvas_json: json, thumbnail: thumb });
        if (!d?.id) throw new Error('Could not save your design.');
        onCreated(d.id, `/editor?designId=${d.id}&w=${spec.width}&h=${spec.height}`);
        setBusy(null);
        return;
      }
      const tags = Array.isArray(spec.tags) ? spec.tags.map((t) => String(t).toLowerCase()).slice(0, 12) : [];
      const t = await createTemplate({ name: spec.name, category: spec.category || 'Social Media', width: spec.width, height: spec.height, colors: (palette.length >= 2 ? [palette[0], palette[1]] : ['#ffffff', '#111111']) as [string, string], description: spec.description || null, tags: [...tags, mode === 'image' ? 'ai-recreated' : 'ai-made'], occasion: spec.occasion || null, searchKeywords: tags.join(', ') || null }, userId);
      if (!t?.id) throw new Error('Could not create the template.');
      const pages = await renderTemplatePages(json, 1200);
      const ok = await setTemplateContent(t.id, '1.0', json, pages[0]?.url || null);
      if (!ok) throw new Error('The template was created but its design could not be saved. Open it and try again.');
      onCreated(t.id, `/editor?w=${spec.width}&h=${spec.height}&templateId=${t.id}&editTemplate=1`);
    } catch (e: any) { setErr(e?.message || 'Could not save.'); }
    setBusy(null);
  };

  const ready = mode === 'brief' ? !!brief.topic.trim() : !!img;
  const step = (n: number, t: string) => <p className="text-[13px] font-semibold mt-1"><span className="inline-flex h-5 w-5 mr-1.5 items-center justify-center rounded-full bg-mt-primary text-mt-onprimary text-[11px]">{n}</span>{t}</p>;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="AI Template Studio" className="bg-mt-surface text-mt-ink w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-6xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) takeImage(f); }}>
        <div className="flex items-center gap-2 px-5 h-14 border-b border-mt-border shrink-0">
          <h2 className="font-semibold inline-flex items-center gap-2 flex-1"><Sparkles size={17} className="text-[#D97757]" /> AI Template Studio</h2>
          <div role="tablist" className="hidden sm:flex rounded-full border border-mt-border p-0.5 text-[12px]">
            {([['image', 'Recreate an image'], ['brief', 'Describe it']] as const).map(([id, l]) => <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`h-8 px-3 rounded-full ${mode === id ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted'}`}>{l}</button>)}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-mt-muted hover:bg-mt-surface2"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 p-5">
          <div className="flex flex-col gap-3">
            <div role="tablist" className="sm:hidden flex rounded-full border border-mt-border p-0.5 text-[12px] self-start">
              {([['image', 'Recreate an image'], ['brief', 'Describe it']] as const).map(([id, l]) => <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`h-8 px-3 rounded-full ${mode === id ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted'}`}>{l}</button>)}
            </div>

            {mode === 'image' ? (
              <>
                {step(1, 'Your reference image')}
                <button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl border-2 border-dashed border-mt-border hover:border-mt-accent p-4 flex items-center gap-4 text-left">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.dataUrl} alt="Reference" className="h-28 w-auto max-w-[45%] rounded-lg object-contain bg-mt-surface2" />
                  ) : <span className="h-20 w-20 shrink-0 rounded-xl bg-mt-surface2 inline-flex items-center justify-center"><ImagePlus size={26} className="text-mt-muted" /></span>}
                  <span className="text-[13px] text-mt-muted">{img ? <>Change image<br /><span className="text-mt-faint">{img.w} × {img.h} px → {fmt.label}</span></> : <><b className="text-mt-ink">Paste (Ctrl+V), drop or tap to upload</b><br />a screenshot, poster, Pinterest pin or any design you like.</>}</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) takeImage(f); e.target.value = ''; }} />
                {palette.length > 0 && (
                  <div className="flex items-center gap-2 text-[12px] text-mt-muted">Colours found:{palette.map((c) => <span key={c} title={c} className="h-5 w-5 rounded-full border border-mt-border" style={{ background: c }} />)}</div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[12px] text-mt-muted">How close?<select className={field} value={closeness} onChange={(e) => setCloseness(e.target.value as any)}><option value="close">Recreate the layout</option><option value="inspired">Inspired by it</option></select></label>
                  <label className="text-[12px] text-mt-muted">Size<select className={field} value={brief.format} onChange={(e) => set({ format: e.target.value })}>{SPEC_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
                  <label className="text-[12px] text-mt-muted">Topic (optional)<input className={field} value={brief.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Eid offer for a café" /></label>
                  <label className="text-[12px] text-mt-muted">Language<select className={field} value={brief.language} onChange={(e) => set({ language: e.target.value })}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select></label>
                </div>
              </>
            ) : (
              <>
                {step(1, 'Your brief')}
                <label className="text-[12px] text-mt-muted">What is it for?<input className={field} value={brief.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Diwali sale for a jewellery shop" /></label>
                <div className="flex flex-wrap gap-1.5">{QUICK.map((q) => <button key={q} onClick={() => set({ topic: q })} className="h-7 px-2.5 rounded-full border border-mt-border text-[12px] text-mt-muted hover:text-mt-ink">{q}</button>)}</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[12px] text-mt-muted">Size<select className={field} value={brief.format} onChange={(e) => set({ format: e.target.value })}>{SPEC_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
                  <label className="text-[12px] text-mt-muted">Style<select className={field} value={brief.style} onChange={(e) => set({ style: e.target.value })}>{STYLES.map((s) => <option key={s}>{s}</option>)}</select></label>
                  <label className="text-[12px] text-mt-muted">Colours (optional)<input className={field} value={brief.colors} onChange={(e) => set({ colors: e.target.value })} placeholder="deep maroon and gold" /></label>
                  <label className="text-[12px] text-mt-muted">Language<select className={field} value={brief.language} onChange={(e) => set({ language: e.target.value })}>{LANGS.map((l) => <option key={l}>{l}</option>)}</select></label>
                </div>
              </>
            )}
            <label className="text-[12px] text-mt-muted">Your wording (optional)<textarea rows={2} className={`${field} h-auto py-2`} value={brief.wording} onChange={(e) => set({ wording: e.target.value })} placeholder="Leave empty and the AI writes it" /></label>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={aiPhotos} onChange={(e) => setAiPhotos(e.target.checked)} /> Free AI photos instead of library photos <span className="text-mt-faint text-[12px]">(made on the fly, nothing stored)</span></label>

            {step(2, 'Let an AI design it')}
            {auto && (
              <button type="button" disabled={!ready || busy === 'auto'} onClick={makeNow} className="h-11 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D97757] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40">
                {busy === 'auto' ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} {busy === 'auto' ? 'Designing… (about 15 seconds)' : 'Make it now — one click (free Gemini)'}
              </button>
            )}
            <p className="text-[12px] text-mt-muted">{auto ? 'Or use' : 'Use'} any free AI chat — it opens with the instructions ready{mode === 'image' ? ' and your image copied, just paste it' : ''}:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AI_PROVIDERS.map((p) => (
                <button key={p.id} type="button" disabled={!ready} onClick={() => openChat(p)} title={p.note} className="h-10 px-3 rounded-xl border border-mt-border text-[13px] font-medium inline-flex items-center gap-2 hover:bg-mt-surface2 disabled:opacity-40">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: p.dot }} />{p.name}<ExternalLink size={12} className="ml-auto text-mt-faint" />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => navigator.clipboard?.writeText(prompt).then(() => flash('Instructions copied.'))} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5"><Copy size={13} /> Copy instructions</button>
              {mode === 'image' && img && <button type="button" onClick={() => copyImage(img.dataUrl).then((ok) => flash(ok ? 'Image copied — paste it into the chat.' : 'Couldn’t copy the image; attach it in the chat instead.'))} className="h-8 px-3 rounded-full border border-mt-border text-[12px] inline-flex items-center gap-1.5"><ImagePlus size={13} /> Copy image</button>}
              {target === 'template' && !auto && auto !== null && <span className="text-[12px] text-mt-faint self-center">Want one click? Add a free GEMINI_API_KEY in Vercel.</span>}
            </div>
            {note && <p className="rounded-xl bg-mt-accentsoft text-[#4B2FB0] px-3 py-2 text-[13px]" role="status">{note}</p>}
            {step(3, 'Paste the AI’s reply')}
            <textarea rows={6} className={`${field} h-auto py-2 font-mono text-[12px]`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste the whole reply here (the ```json … ``` part)" />
            {err && <p className="text-[13px] text-rose-600">{err}</p>}
          </div>
          <div className="flex flex-col gap-3 lg:sticky lg:top-0 self-start w-full">
            <p className="text-[13px] font-semibold">Preview</p>
            <div className="min-h-[300px] rounded-2xl bg-mt-surface2 border border-mt-border grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 items-center">
              {img && mode === 'image' && (
                <figure className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.dataUrl} alt="Your reference" className="max-h-[44vh] max-w-full mx-auto object-contain rounded" />
                  <figcaption className="mt-1 text-[11px] text-mt-faint">Reference</figcaption>
                </figure>
              )}
              <figure className={`text-center ${img && mode === 'image' ? '' : 'sm:col-span-2'}`}>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Template preview" className="max-h-[44vh] max-w-full mx-auto object-contain shadow-lg rounded" />
                ) : <p className="text-[13px] text-mt-muted px-6 py-10">The editable design appears here as soon as the AI replies.</p>}
                {preview && <figcaption className="mt-1 text-[11px] text-mt-faint">Your editable template</figcaption>}
              </figure>
            </div>
            <button type="button" disabled={!preview || !!busy} onClick={save} className="h-11 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40">
              {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {target === 'design' ? 'Open it in the editor' : 'Save as a draft template and open it'}
            </button>
            <p className="text-[12px] text-mt-muted">{target === 'design' ? 'Saved to your designs: change anything in the editor, then download.' : 'Saved as a draft: fine-tune it in the editor, then publish it from Templates.'} Not right? Ask the AI “make the headline bigger” and paste the new reply.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
